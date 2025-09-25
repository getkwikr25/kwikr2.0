import Stripe from 'stripe';

export interface EscrowTransaction {
  id: number;
  job_id: number;
  client_id: number;
  worker_id: number;
  amount: number;
  platform_fee: number;
  worker_amount: number;
  payment_intent_id: string;
  status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed' | 'expired';
  milestone_id?: number;
  created_at: string;
  updated_at: string;
  deadline_at?: string;
  auto_release_at?: string;
  dispute_reason?: string;
  notes?: string;
}

export interface EscrowMilestone {
  id: number;
  job_id: number;
  milestone_number: number;
  description: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  due_date?: string;
  completed_at?: string;
  payment_intent_id?: string;
  created_at: string;
}

export interface EscrowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class EscrowService {
  private stripe: Stripe;
  private db: D1Database;

  constructor(stripe: Stripe, db: D1Database) {
    this.stripe = stripe;
    this.db = db;
  }

  /**
   * Enhanced validation for escrow transactions
   */
  async validateEscrowTransaction(
    jobId: number,
    clientId: number,
    workerId: number,
    amount: number,
    milestoneId?: number
  ): Promise<EscrowValidationResult> {
    const result: EscrowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      // 1. Validate job exists and status
      const job = await this.db.prepare(`
        SELECT * FROM jobs 
        WHERE job_id = ? AND client_id = ? AND worker_id = ?
      `).bind(jobId, clientId, workerId).first();

      if (!job) {
        result.errors.push('Job not found or user not authorized');
        result.valid = false;
        return result;
      }

      // 2. Check job status allows payment
      const validJobStatuses = ['accepted', 'in_progress', 'pending_completion'];
      if (!validJobStatuses.includes(job.status)) {
        result.errors.push(`Cannot process payment for job with status: ${job.status}`);
        result.valid = false;
      }

      // 3. Validate amount ranges
      if (amount < 5) {
        result.errors.push('Minimum payment amount is $5.00');
        result.valid = false;
      }

      if (amount > 50000) {
        result.errors.push('Maximum payment amount is $50,000.00');
        result.valid = false;
      }

      // 4. Check for existing escrow transactions
      const existingEscrow = await this.db.prepare(`
        SELECT COUNT(*) as count FROM escrow_transactions 
        WHERE job_id = ? AND status IN ('pending', 'held') AND milestone_id IS NULL
      `).bind(jobId).first();

      if (existingEscrow?.count > 0 && !milestoneId) {
        result.warnings.push('Job already has active escrow transaction');
      }

      // 5. Validate milestone if provided
      if (milestoneId) {
        const milestone = await this.db.prepare(`
          SELECT * FROM escrow_milestones 
          WHERE id = ? AND job_id = ?
        `).bind(milestoneId, jobId).first();

        if (!milestone) {
          result.errors.push('Milestone not found');
          result.valid = false;
        } else if (milestone.status !== 'pending') {
          result.errors.push(`Milestone status must be pending, current: ${milestone.status}`);
          result.valid = false;
        }
      }

      // 6. Validate user account status
      const [client, worker] = await Promise.all([
        this.db.prepare('SELECT status FROM users WHERE user_id = ?').bind(clientId).first(),
        this.db.prepare('SELECT status FROM users WHERE user_id = ?').bind(workerId).first()
      ]);

      if (client?.status !== 'active') {
        result.errors.push('Client account is not active');
        result.valid = false;
      }

      if (worker?.status !== 'active') {
        result.errors.push('Worker account is not active');
        result.valid = false;
      }

      // 7. Check for payment method
      const paymentMethods = await this.db.prepare(`
        SELECT COUNT(*) as count FROM user_payment_methods 
        WHERE user_id = ? AND is_default = 1 AND status = 'active'
      `).bind(clientId).first();

      if (paymentMethods?.count === 0) {
        result.warnings.push('Client has no default payment method configured');
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Calculate platform fees with enhanced rules
   */
  calculatePlatformFee(amount: number, isRecurringClient = false, workerTier = 'standard'): {
    platformFee: number;
    workerAmount: number;
    feeRate: number;
    discountApplied?: string;
  } {
    let baseRate = 0.05; // 5% default

    // Tier-based fee adjustments
    if (workerTier === 'premium') {
      baseRate = 0.04; // 4% for premium workers
    } else if (workerTier === 'elite') {
      baseRate = 0.035; // 3.5% for elite workers
    }

    // Recurring client discount
    if (isRecurringClient) {
      baseRate *= 0.9; // 10% discount on fees
    }

    let platformFee = amount * baseRate;
    
    // Apply min/max limits
    const minFee = 2.00;
    const maxFee = 50.00;
    
    if (platformFee < minFee) platformFee = minFee;
    if (platformFee > maxFee) platformFee = maxFee;

    const workerAmount = amount - platformFee;

    const result = {
      platformFee: Math.round(platformFee * 100) / 100,
      workerAmount: Math.round(workerAmount * 100) / 100,
      feeRate: baseRate
    };

    if (isRecurringClient) {
      result.discountApplied = 'Recurring client discount (10% off fees)';
    }

    return result;
  }

  /**
   * Create enhanced escrow transaction with automatic deadline
   */
  async createEscrowTransaction(
    jobId: number,
    clientId: number,
    workerId: number,
    amount: number,
    paymentIntentId: string,
    milestoneId?: number,
    customDeadline?: Date
  ): Promise<EscrowTransaction> {
    // Validate first
    const validation = await this.validateEscrowTransaction(jobId, clientId, workerId, amount, milestoneId);
    if (!validation.valid) {
      throw new Error(`Escrow validation failed: ${validation.errors.join(', ')}`);
    }

    // Calculate fees
    const isRecurringClient = await this.checkRecurringClient(clientId);
    const workerTier = await this.getWorkerTier(workerId);
    const feeCalculation = this.calculatePlatformFee(amount, isRecurringClient, workerTier);

    // Calculate deadlines
    const now = new Date();
    const deadline = customDeadline || new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days default
    const autoReleaseDate = new Date(deadline.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days after deadline

    // Insert escrow transaction
    const result = await this.db.prepare(`
      INSERT INTO escrow_transactions (
        job_id, client_id, worker_id, amount, platform_fee, worker_amount,
        payment_intent_id, status, milestone_id, deadline_at, auto_release_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'held', ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      jobId,
      clientId,
      workerId,
      amount,
      feeCalculation.platformFee,
      feeCalculation.workerAmount,
      paymentIntentId,
      milestoneId || null,
      deadline.toISOString(),
      autoReleaseDate.toISOString()
    ).run();

    // Get the created transaction
    const transaction = await this.db.prepare(`
      SELECT * FROM escrow_transactions WHERE id = ?
    `).bind(result.meta.last_row_id).first() as EscrowTransaction;

    // Log escrow creation
    await this.logEscrowActivity(
      transaction.id,
      'created',
      `Escrow created for $${amount} (fee: $${feeCalculation.platformFee})`,
      clientId
    );

    return transaction;
  }

  /**
   * Enhanced escrow release with conditions
   */
  async releaseEscrow(
    transactionId: number,
    userId: number,
    reason = 'Job completed',
    forceRelease = false
  ): Promise<{ success: boolean; message: string; chargeId?: string }> {
    const transaction = await this.db.prepare(`
      SELECT et.*, j.status as job_status, j.completion_date
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.id = ?
    `).bind(transactionId).first();

    if (!transaction) {
      return { success: false, message: 'Escrow transaction not found' };
    }

    if (transaction.status !== 'held') {
      return { success: false, message: `Cannot release escrow with status: ${transaction.status}` };
    }

    // Authorization check
    const canRelease = userId === transaction.client_id || 
                      userId === transaction.worker_id || 
                      forceRelease;

    if (!canRelease) {
      return { success: false, message: 'Not authorized to release escrow' };
    }

    // Business rule validation (unless forced)
    if (!forceRelease) {
      // Check if job is in valid completion state
      const validCompletionStatuses = ['completed', 'approved'];
      if (!validCompletionStatuses.includes(transaction.job_status)) {
        return { 
          success: false, 
          message: `Job must be completed before releasing escrow. Current status: ${transaction.job_status}` 
        };
      }

      // Check if minimum hold period has passed (24 hours)
      const createdAt = new Date(transaction.created_at);
      const minHoldPeriod = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000));
      if (new Date() < minHoldPeriod && userId === transaction.client_id) {
        return {
          success: false,
          message: 'Minimum 24-hour hold period has not passed'
        };
      }
    }

    try {
      // Capture the payment in Stripe
      const paymentIntent = await this.stripe.paymentIntents.capture(transaction.payment_intent_id);

      // Update transaction status
      await this.db.prepare(`
        UPDATE escrow_transactions 
        SET status = 'released', updated_at = datetime('now'), notes = ?
        WHERE id = ?
      `).bind(reason, transactionId).run();

      // Update job status if needed
      if (transaction.job_status !== 'completed') {
        await this.db.prepare(`
          UPDATE jobs 
          SET status = 'completed', completion_date = datetime('now')
          WHERE job_id = ?
        `).bind(transaction.job_id).run();
      }

      // Log activity
      await this.logEscrowActivity(
        transactionId,
        'released',
        `Escrow released: ${reason}`,
        userId
      );

      // Create notifications
      await this.createEscrowNotification(
        transaction.worker_id,
        'escrow_released',
        `Payment of $${transaction.worker_amount} has been released`,
        transaction.job_id
      );

      return { 
        success: true, 
        message: 'Escrow released successfully',
        chargeId: paymentIntent.latest_charge as string
      };

    } catch (error) {
      await this.logEscrowActivity(
        transactionId,
        'release_failed',
        `Release failed: ${error.message}`,
        userId
      );

      return { 
        success: false, 
        message: `Failed to release escrow: ${error.message}` 
      };
    }
  }

  /**
   * Enhanced escrow refund with validation
   */
  async refundEscrow(
    transactionId: number,
    userId: number,
    reason: string,
    partialAmount?: number
  ): Promise<{ success: boolean; message: string; refundId?: string }> {
    const transaction = await this.db.prepare(`
      SELECT et.*, j.status as job_status
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.id = ?
    `).bind(transactionId).first();

    if (!transaction) {
      return { success: false, message: 'Escrow transaction not found' };
    }

    if (!['held', 'disputed'].includes(transaction.status)) {
      return { success: false, message: `Cannot refund escrow with status: ${transaction.status}` };
    }

    // Authorization check
    const canRefund = userId === transaction.client_id || 
                     await this.isAdmin(userId);

    if (!canRefund) {
      return { success: false, message: 'Not authorized to refund escrow' };
    }

    const refundAmount = partialAmount || transaction.amount;
    
    if (partialAmount && (partialAmount > transaction.amount || partialAmount <= 0)) {
      return { success: false, message: 'Invalid partial refund amount' };
    }

    try {
      // Process refund in Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: transaction.payment_intent_id,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          escrow_transaction_id: transactionId.toString(),
          reason: reason
        }
      });

      // Update transaction status
      const newStatus = partialAmount ? 'partially_refunded' : 'refunded';
      await this.db.prepare(`
        UPDATE escrow_transactions 
        SET status = ?, updated_at = datetime('now'), notes = ?
        WHERE id = ?
      `).bind(newStatus, `Refund: ${reason}`, transactionId).run();

      // Update job status
      await this.db.prepare(`
        UPDATE jobs 
        SET status = 'cancelled', cancellation_reason = ?
        WHERE job_id = ?
      `).bind(reason, transaction.job_id).run();

      // Log activity
      await this.logEscrowActivity(
        transactionId,
        'refunded',
        `Escrow refunded $${refundAmount}: ${reason}`,
        userId
      );

      // Create notifications
      await this.createEscrowNotification(
        transaction.client_id,
        'escrow_refunded',
        `Refund of $${refundAmount} has been processed`,
        transaction.job_id
      );

      return { 
        success: true, 
        message: 'Escrow refunded successfully',
        refundId: refund.id
      };

    } catch (error) {
      await this.logEscrowActivity(
        transactionId,
        'refund_failed',
        `Refund failed: ${error.message}`,
        userId
      );

      return { 
        success: false, 
        message: `Failed to refund escrow: ${error.message}` 
      };
    }
  }

  // Helper methods
  private async checkRecurringClient(clientId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM escrow_transactions 
      WHERE client_id = ? AND status = 'released' AND created_at > datetime('now', '-90 days')
    `).bind(clientId).first();

    return (result?.count || 0) >= 3; // 3+ transactions in 90 days = recurring
  }

  private async getWorkerTier(workerId: number): Promise<string> {
    const worker = await this.db.prepare(`
      SELECT tier FROM workers WHERE user_id = ?
    `).bind(workerId).first();

    return worker?.tier || 'standard';
  }

  private async isAdmin(userId: number): Promise<boolean> {
    const user = await this.db.prepare(`
      SELECT role FROM users WHERE user_id = ?
    `).bind(userId).first();

    return user?.role === 'admin';
  }

  private async logEscrowActivity(
    transactionId: number,
    action: string,
    description: string,
    userId: number
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO escrow_activity_log (
        transaction_id, action, description, user_id, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(transactionId, action, description, userId).run();
  }

  private async createEscrowNotification(
    userId: number,
    type: string,
    message: string,
    jobId: number
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, job_id, is_read, created_at
      ) VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).bind(userId, type, message, jobId).run();
  }
}