import { EscrowService } from './escrow.js';
import Stripe from 'stripe';

export interface TriggerConfig {
  enabled: boolean;
  conditions: {
    jobStatus?: string[];
    timeElapsed?: number; // hours
    clientApproval?: boolean;
    workerSubmission?: boolean;
  };
  actions: {
    autoRelease?: boolean;
    sendReminder?: boolean;
    escalateDispute?: boolean;
    refundClient?: boolean;
  };
  notifications: {
    client?: boolean;
    worker?: boolean;
    admin?: boolean;
  };
}

export class EscrowTriggerService {
  private db: D1Database;
  private escrowService: EscrowService;
  private stripe: Stripe;

  constructor(db: D1Database, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
    this.escrowService = new EscrowService(stripe, db);
  }

  /**
   * Process job status change and trigger escrow actions
   */
  async onJobStatusChange(
    jobId: number,
    oldStatus: string,
    newStatus: string,
    triggeredBy: number
  ): Promise<void> {
    console.log(`Job ${jobId} status changed: ${oldStatus} -> ${newStatus}`);

    // Get active escrow transactions for this job
    const escrowTransactions = await this.db.prepare(`
      SELECT * FROM escrow_transactions 
      WHERE job_id = ? AND status IN ('held', 'pending')
      ORDER BY created_at DESC
    `).bind(jobId).all();

    if (!escrowTransactions.results.length) {
      console.log(`No active escrow transactions found for job ${jobId}`);
      return;
    }

    // Process each trigger scenario
    await Promise.all([
      this.handleJobCompletion(jobId, oldStatus, newStatus, triggeredBy),
      this.handleJobApproval(jobId, oldStatus, newStatus, triggeredBy),
      this.handleJobCancellation(jobId, oldStatus, newStatus, triggeredBy),
      this.handleJobDispute(jobId, oldStatus, newStatus, triggeredBy),
      this.handleWorkerSubmission(jobId, oldStatus, newStatus, triggeredBy)
    ]);
  }

  /**
   * Handle automatic escrow release when job is completed
   */
  private async handleJobCompletion(
    jobId: number,
    oldStatus: string,
    newStatus: string,
    triggeredBy: number
  ): Promise<void> {
    if (newStatus !== 'completed') return;

    const config: TriggerConfig = {
      enabled: true,
      conditions: {
        jobStatus: ['completed'],
        workerSubmission: true
      },
      actions: {
        autoRelease: false, // Require client approval
        sendReminder: true
      },
      notifications: {
        client: true,
        worker: true,
        admin: false
      }
    };

    const escrowTransactions = await this.getActiveEscrowTransactions(jobId);
    
    for (const transaction of escrowTransactions) {
      // Check if auto-release conditions are met
      const canAutoRelease = await this.checkAutoReleaseConditions(transaction.id);
      
      if (config.actions.autoRelease && canAutoRelease) {
        // Auto-release after 48-hour grace period
        await this.scheduleAutoRelease(transaction.id, 48);
      }

      if (config.actions.sendReminder) {
        await this.sendCompletionReminder(transaction, config.notifications);
      }

      // Log the trigger
      await this.logTriggerAction(
        transaction.id,
        'job_completed',
        'Job marked as completed, escrow pending client approval',
        triggeredBy
      );
    }
  }

  /**
   * Handle client approval and automatic release
   */
  private async handleJobApproval(
    jobId: number,
    oldStatus: string,
    newStatus: string,
    triggeredBy: number
  ): Promise<void> {
    if (newStatus !== 'approved') return;

    const escrowTransactions = await this.getActiveEscrowTransactions(jobId);
    
    for (const transaction of escrowTransactions) {
      // Auto-release on client approval
      const releaseResult = await this.escrowService.releaseEscrow(
        transaction.id,
        triggeredBy,
        'Job approved by client - automatic release'
      );

      if (releaseResult.success) {
        await this.sendApprovalNotifications(transaction);
        
        // Update job rating reminder
        await this.scheduleRatingReminder(jobId, transaction.client_id, transaction.worker_id);
      }

      await this.logTriggerAction(
        transaction.id,
        'job_approved',
        `Auto-release ${releaseResult.success ? 'successful' : 'failed'}: ${releaseResult.message}`,
        triggeredBy
      );
    }
  }

  /**
   * Handle job cancellation and refund processing
   */
  private async handleJobCancellation(
    jobId: number,
    oldStatus: string,
    newStatus: string,
    triggeredBy: number
  ): Promise<void> {
    if (newStatus !== 'cancelled') return;

    const job = await this.db.prepare(`
      SELECT *, 
        CASE 
          WHEN status = 'posted' OR status = 'applied' THEN 'full_refund'
          WHEN status = 'accepted' OR status = 'in_progress' THEN 'conditional_refund'
          ELSE 'no_refund'
        END as refund_type
      FROM jobs WHERE job_id = ?
    `).bind(jobId).first();

    const escrowTransactions = await this.getActiveEscrowTransactions(jobId);
    
    for (const transaction of escrowTransactions) {
      let shouldRefund = false;
      let refundReason = '';

      // Determine refund eligibility based on job progress
      switch (job.refund_type) {
        case 'full_refund':
          shouldRefund = true;
          refundReason = 'Job cancelled before work started';
          break;
        
        case 'conditional_refund':
          // Check if work has been submitted
          const workSubmitted = await this.checkWorkSubmission(jobId);
          if (!workSubmitted) {
            shouldRefund = true;
            refundReason = 'Job cancelled with no work submitted';
          } else {
            refundReason = 'Job cancelled - work submitted, manual review required';
          }
          break;
        
        default:
          refundReason = 'Job cancelled - no automatic refund';
      }

      if (shouldRefund) {
        const refundResult = await this.escrowService.refundEscrow(
          transaction.id,
          triggeredBy,
          refundReason
        );

        if (refundResult.success) {
          await this.sendCancellationNotifications(transaction, refundReason);
        }

        await this.logTriggerAction(
          transaction.id,
          'job_cancelled',
          `Auto-refund ${refundResult.success ? 'processed' : 'failed'}: ${refundResult.message}`,
          triggeredBy
        );
      } else {
        // Mark for manual review
        await this.flagForManualReview(transaction.id, refundReason);
        
        await this.logTriggerAction(
          transaction.id,
          'job_cancelled',
          `Flagged for manual review: ${refundReason}`,
          triggeredBy
        );
      }
    }
  }

  /**
   * Handle dispute escalation
   */
  private async handleJobDispute(
    jobId: number,
    oldStatus: string,
    newStatus: string,
    triggeredBy: number
  ): Promise<void> {
    if (newStatus !== 'disputed') return;

    const escrowTransactions = await this.getActiveEscrowTransactions(jobId);
    
    for (const transaction of escrowTransactions) {
      // Update escrow status to disputed
      await this.db.prepare(`
        UPDATE escrow_transactions 
        SET status = 'disputed', updated_at = datetime('now')
        WHERE id = ?
      `).bind(transaction.id).run();

      // Create dispute case
      await this.createDisputeCase(transaction, triggeredBy);

      // Send notifications to all parties
      await this.sendDisputeNotifications(transaction);

      // Schedule escalation if not resolved within timeframe
      await this.scheduleDisputeEscalation(transaction.id, 72); // 72 hours

      await this.logTriggerAction(
        transaction.id,
        'dispute_created',
        'Escrow marked as disputed, case opened for review',
        triggeredBy
      );
    }
  }

  /**
   * Handle worker submission and approval triggers
   */
  private async handleWorkerSubmission(
    jobId: number,
    oldStatus: string,
    newStatus: string,
    triggeredBy: number
  ): Promise<void> {
    if (newStatus !== 'pending_approval') return;

    const escrowTransactions = await this.getActiveEscrowTransactions(jobId);
    
    for (const transaction of escrowTransactions) {
      // Send notification to client for review
      await this.sendSubmissionNotifications(transaction);

      // Schedule auto-approval reminder after 48 hours
      await this.scheduleApprovalReminder(transaction.id, 48);

      // Schedule auto-release after 7 days if no response
      await this.scheduleAutoApproval(transaction.id, 168); // 7 days

      await this.logTriggerAction(
        transaction.id,
        'work_submitted',
        'Work submitted, client approval required',
        triggeredBy
      );
    }
  }

  /**
   * Process time-based triggers (run periodically)
   */
  async processTimeBasedTriggers(): Promise<void> {
    console.log('Processing time-based escrow triggers...');

    await Promise.all([
      this.processAutoReleaseSchedule(),
      this.processApprovalReminders(),
      this.processDisputeEscalations(),
      this.processExpiredEscrows(),
      this.processStaleTransactions()
    ]);
  }

  /**
   * Process scheduled auto-releases
   */
  private async processAutoReleaseSchedule(): Promise<void> {
    const scheduledReleases = await this.db.prepare(`
      SELECT et.*, s.scheduled_at, s.reason
      FROM escrow_transactions et
      JOIN escrow_schedule s ON et.id = s.transaction_id
      WHERE et.status = 'held' 
        AND s.action = 'auto_release'
        AND s.scheduled_at <= datetime('now')
        AND s.processed = 0
    `).all();

    for (const release of scheduledReleases.results) {
      const result = await this.escrowService.releaseEscrow(
        release.id,
        0, // System triggered
        release.reason || 'Automatic release - timeout',
        true // Force release
      );

      // Mark as processed
      await this.db.prepare(`
        UPDATE escrow_schedule 
        SET processed = 1, processed_at = datetime('now'), result = ?
        WHERE transaction_id = ? AND action = 'auto_release'
      `).bind(JSON.stringify(result), release.id).run();

      console.log(`Auto-release processed for transaction ${release.id}: ${result.message}`);
    }
  }

  /**
   * Send approval reminders
   */
  private async processApprovalReminders(): Promise<void> {
    const pendingApprovals = await this.db.prepare(`
      SELECT et.*, j.title, u.email as client_email, u.name as client_name
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      JOIN users u ON et.client_id = u.user_id
      WHERE et.status = 'held' 
        AND j.status = 'pending_approval'
        AND datetime(j.updated_at, '+48 hours') <= datetime('now')
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.user_id = et.client_id 
            AND n.type = 'approval_reminder' 
            AND n.job_id = et.job_id
            AND n.created_at > datetime('now', '-24 hours')
        )
    `).all();

    for (const approval of pendingApprovals.results) {
      await this.db.prepare(`
        INSERT INTO notifications (
          user_id, type, message, job_id, is_read, created_at
        ) VALUES (?, 'approval_reminder', ?, ?, 0, datetime('now'))
      `).bind(
        approval.client_id,
        `Please review and approve the completed work for "${approval.title}". Payment of $${approval.amount} is held in escrow.`,
        approval.job_id
      ).run();

      console.log(`Approval reminder sent for job ${approval.job_id}`);
    }
  }

  // Helper methods
  private async getActiveEscrowTransactions(jobId: number): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT * FROM escrow_transactions 
      WHERE job_id = ? AND status IN ('held', 'pending')
    `).bind(jobId).all();
    
    return result.results;
  }

  private async checkAutoReleaseConditions(transactionId: number): Promise<boolean> {
    const transaction = await this.db.prepare(`
      SELECT et.*, j.status, j.client_rating
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.id = ?
    `).bind(transactionId).first();

    if (!transaction) return false;

    // Conditions for auto-release:
    // 1. Job is completed or approved
    // 2. No active disputes
    // 3. Client has good standing (optional)
    return transaction.status === 'completed' || transaction.status === 'approved';
  }

  private async scheduleAutoRelease(transactionId: number, hoursDelay: number): Promise<void> {
    const scheduledAt = new Date(Date.now() + (hoursDelay * 60 * 60 * 1000));
    
    await this.db.prepare(`
      INSERT INTO escrow_schedule (
        transaction_id, action, scheduled_at, reason, processed, created_at
      ) VALUES (?, 'auto_release', ?, 'Automatic release after timeout', 0, datetime('now'))
    `).bind(transactionId, scheduledAt.toISOString()).run();
  }

  private async sendCompletionReminder(transaction: any, notifications: any): Promise<void> {
    if (notifications.client) {
      await this.db.prepare(`
        INSERT INTO notifications (
          user_id, type, message, job_id, is_read, created_at
        ) VALUES (?, 'job_completed', ?, ?, 0, datetime('now'))
      `).bind(
        transaction.client_id,
        `Job completed! Please review the work and approve payment of $${transaction.amount}.`,
        transaction.job_id
      ).run();
    }

    if (notifications.worker) {
      await this.db.prepare(`
        INSERT INTO notifications (
          user_id, type, message, job_id, is_read, created_at
        ) VALUES (?, 'awaiting_approval', ?, ?, 0, datetime('now'))
      `).bind(
        transaction.worker_id,
        `Your work has been submitted and is awaiting client approval. Payment of $${transaction.worker_amount} is secured in escrow.`,
        transaction.job_id
      ).run();
    }
  }

  private async logTriggerAction(
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

  // Additional helper methods for other operations...
  private async checkWorkSubmission(jobId: number): Promise<boolean> {
    const submission = await this.db.prepare(`
      SELECT COUNT(*) as count FROM job_submissions 
      WHERE job_id = ?
    `).bind(jobId).first();
    
    return (submission?.count || 0) > 0;
  }

  private async createDisputeCase(transaction: any, triggeredBy: number): Promise<void> {
    await this.db.prepare(`
      INSERT INTO dispute_cases (
        escrow_transaction_id, job_id, client_id, worker_id, 
        initiated_by, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'open', datetime('now'))
    `).bind(
      transaction.id,
      transaction.job_id,
      transaction.client_id,
      transaction.worker_id,
      triggeredBy
    ).run();
  }

  private async flagForManualReview(transactionId: number, reason: string): Promise<void> {
    await this.db.prepare(`
      UPDATE escrow_transactions 
      SET status = 'review_required', notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(reason, transactionId).run();
  }

  private async sendApprovalNotifications(transaction: any): Promise<void> {
    // Implementation for sending approval notifications
  }

  private async sendCancellationNotifications(transaction: any, reason: string): Promise<void> {
    // Implementation for sending cancellation notifications
  }

  private async sendDisputeNotifications(transaction: any): Promise<void> {
    // Implementation for sending dispute notifications
  }

  private async sendSubmissionNotifications(transaction: any): Promise<void> {
    // Implementation for sending submission notifications
  }

  private async scheduleRatingReminder(jobId: number, clientId: number, workerId: number): Promise<void> {
    // Implementation for scheduling rating reminders
  }

  private async scheduleApprovalReminder(transactionId: number, hoursDelay: number): Promise<void> {
    // Implementation for scheduling approval reminders
  }

  private async scheduleAutoApproval(transactionId: number, hoursDelay: number): Promise<void> {
    // Implementation for scheduling auto-approval
  }

  private async scheduleDisputeEscalation(transactionId: number, hoursDelay: number): Promise<void> {
    // Implementation for scheduling dispute escalation
  }

  private async processDisputeEscalations(): Promise<void> {
    // Implementation for processing dispute escalations
  }

  private async processExpiredEscrows(): Promise<void> {
    // Implementation for processing expired escrows
  }

  private async processStaleTransactions(): Promise<void> {
    // Implementation for processing stale transactions
  }
}