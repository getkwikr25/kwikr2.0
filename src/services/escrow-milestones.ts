import { EscrowService } from './escrow.js';
import Stripe from 'stripe';

export interface MilestoneTemplate {
  id: number;
  name: string;
  description: string;
  percentage: number;
  order: number;
  dependencies?: number[];
  estimated_hours?: number;
  category: 'project_start' | 'progress' | 'delivery' | 'completion' | 'custom';
}

export interface JobMilestone {
  id: number;
  job_id: number;
  template_id?: number;
  milestone_number: number;
  title: string;
  description: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'paid' | 'disputed';
  due_date?: string;
  dependencies?: number[];
  worker_notes?: string;
  client_notes?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MilestonePayment {
  id: number;
  milestone_id: number;
  escrow_transaction_id: number;
  payment_intent_id: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded';
  created_at: string;
}

export class EscrowMilestoneService {
  private db: D1Database;
  private escrowService: EscrowService;
  private stripe: Stripe;

  // Predefined milestone templates for common job types
  private defaultTemplates: Record<string, MilestoneTemplate[]> = {
    'web_development': [
      { id: 1, name: 'Project Setup', description: 'Initial setup and planning', percentage: 20, order: 1, category: 'project_start' },
      { id: 2, name: 'Design & Wireframes', description: 'Create designs and wireframes', percentage: 30, order: 2, dependencies: [1], category: 'progress' },
      { id: 3, name: 'Development', description: 'Core development work', percentage: 40, order: 3, dependencies: [2], category: 'progress' },
      { id: 4, name: 'Testing & Deployment', description: 'Testing and final deployment', percentage: 10, order: 4, dependencies: [3], category: 'completion' }
    ],
    'graphic_design': [
      { id: 1, name: 'Concept & Brief', description: 'Initial concepts and client brief', percentage: 25, order: 1, category: 'project_start' },
      { id: 2, name: 'Design Draft', description: 'First design draft', percentage: 50, order: 2, dependencies: [1], category: 'progress' },
      { id: 3, name: 'Revisions', description: 'Client feedback and revisions', percentage: 15, order: 3, dependencies: [2], category: 'progress' },
      { id: 4, name: 'Final Delivery', description: 'Final files and delivery', percentage: 10, order: 4, dependencies: [3], category: 'completion' }
    ],
    'content_writing': [
      { id: 1, name: 'Research & Outline', description: 'Research and content outline', percentage: 30, order: 1, category: 'project_start' },
      { id: 2, name: 'Draft Content', description: 'First draft of content', percentage: 50, order: 2, dependencies: [1], category: 'progress' },
      { id: 3, name: 'Final Content', description: 'Edited and final content', percentage: 20, order: 3, dependencies: [2], category: 'completion' }
    ],
    'custom': [] // No predefined milestones for custom jobs
  };

  constructor(db: D1Database, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
    this.escrowService = new EscrowService(stripe, db);
  }

  /**
   * Create milestone structure for a job
   */
  async createJobMilestones(
    jobId: number,
    totalAmount: number,
    jobCategory: string = 'custom',
    customMilestones?: Partial<JobMilestone>[],
    clientId?: number
  ): Promise<JobMilestone[]> {
    let milestoneData: Partial<JobMilestone>[];

    if (customMilestones && customMilestones.length > 0) {
      // Use custom milestones provided by client
      milestoneData = customMilestones;
    } else if (this.defaultTemplates[jobCategory]) {
      // Use predefined template
      const templates = this.defaultTemplates[jobCategory];
      milestoneData = templates.map(template => ({
        title: template.name,
        description: template.description,
        percentage: template.percentage,
        milestone_number: template.order,
        dependencies: template.dependencies
      }));
    } else {
      // Create default 50/50 split
      milestoneData = [
        {
          title: 'Project Start',
          description: 'Initial milestone - 50% upfront payment',
          percentage: 50,
          milestone_number: 1
        },
        {
          title: 'Project Completion',
          description: 'Final milestone - remaining payment on completion',
          percentage: 50,
          milestone_number: 2,
          dependencies: [1]
        }
      ];
    }

    // Validate percentages add up to 100%
    const totalPercentage = milestoneData.reduce((sum, m) => sum + (m.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Milestone percentages must add up to 100%, current total: ${totalPercentage}%`);
    }

    const createdMilestones: JobMilestone[] = [];

    // Create milestones in database
    for (const milestone of milestoneData) {
      const milestoneAmount = Math.round((totalAmount * (milestone.percentage || 0)) / 100 * 100) / 100;
      
      const result = await this.db.prepare(`
        INSERT INTO job_milestones (
          job_id, milestone_number, title, description, amount, percentage,
          status, dependencies, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))
      `).bind(
        jobId,
        milestone.milestone_number || 1,
        milestone.title || 'Milestone',
        milestone.description || '',
        milestoneAmount,
        milestone.percentage || 0,
        milestone.dependencies ? JSON.stringify(milestone.dependencies) : null
      ).run();

      const createdMilestone = await this.db.prepare(`
        SELECT * FROM job_milestones WHERE id = ?
      `).bind(result.meta.last_row_id).first() as JobMilestone;

      createdMilestones.push(createdMilestone);
    }

    // Log milestone creation
    await this.logMilestoneActivity(
      jobId,
      'milestones_created',
      `Created ${createdMilestones.length} milestones for job`,
      clientId || 0
    );

    return createdMilestones;
  }

  /**
   * Process milestone payment
   */
  async processMilestonePayment(
    milestoneId: number,
    clientId: number,
    paymentMethodId: string
  ): Promise<{ success: boolean; message: string; paymentIntent?: any; escrowTransaction?: any }> {
    // Get milestone details
    const milestone = await this.db.prepare(`
      SELECT jm.*, j.worker_id, j.client_id, j.status as job_status
      FROM job_milestones jm
      JOIN jobs j ON jm.job_id = j.job_id
      WHERE jm.id = ? AND j.client_id = ?
    `).bind(milestoneId, clientId).first();

    if (!milestone) {
      return { success: false, message: 'Milestone not found or access denied' };
    }

    if (milestone.status !== 'pending') {
      return { success: false, message: `Milestone status must be pending, current: ${milestone.status}` };
    }

    // Check dependencies
    const dependencyCheck = await this.checkMilestoneDependencies(milestoneId);
    if (!dependencyCheck.satisfied) {
      return { 
        success: false, 
        message: `Dependencies not satisfied: ${dependencyCheck.missing.join(', ')}` 
      };
    }

    try {
      // Create payment intent for milestone
      const totalAmount = milestone.amount;
      const feeCalculation = this.escrowService.calculatePlatformFee(totalAmount);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'cad',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: false,
        capture_method: 'manual', // Hold in escrow
        metadata: {
          job_id: milestone.job_id.toString(),
          milestone_id: milestoneId.toString(),
          client_id: clientId.toString(),
          worker_id: milestone.worker_id.toString(),
          type: 'milestone_payment'
        }
      });

      // Create escrow transaction for milestone
      const escrowTransaction = await this.escrowService.createEscrowTransaction(
        milestone.job_id,
        clientId,
        milestone.worker_id,
        totalAmount,
        paymentIntent.id,
        milestoneId
      );

      // Create milestone payment record
      await this.db.prepare(`
        INSERT INTO milestone_payments (
          milestone_id, escrow_transaction_id, payment_intent_id, amount, status, created_at
        ) VALUES (?, ?, ?, ?, 'pending', datetime('now'))
      `).bind(
        milestoneId,
        escrowTransaction.id,
        paymentIntent.id,
        totalAmount
      ).run();

      // Update milestone status
      await this.db.prepare(`
        UPDATE job_milestones 
        SET status = 'in_progress', updated_at = datetime('now')
        WHERE id = ?
      `).bind(milestoneId).run();

      // Log milestone payment
      await this.logMilestoneActivity(
        milestone.job_id,
        'milestone_payment_created',
        `Payment created for milestone "${milestone.title}" - $${totalAmount}`,
        clientId
      );

      return {
        success: true,
        message: 'Milestone payment created successfully',
        paymentIntent,
        escrowTransaction
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to process milestone payment: ${error.message}`
      };
    }
  }

  /**
   * Submit milestone for approval
   */
  async submitMilestone(
    milestoneId: number,
    workerId: number,
    submissionNotes?: string,
    attachments?: string[]
  ): Promise<{ success: boolean; message: string }> {
    const milestone = await this.db.prepare(`
      SELECT jm.*, j.worker_id, j.client_id
      FROM job_milestones jm
      JOIN jobs j ON jm.job_id = j.job_id
      WHERE jm.id = ? AND j.worker_id = ?
    `).bind(milestoneId, workerId).first();

    if (!milestone) {
      return { success: false, message: 'Milestone not found or access denied' };
    }

    if (milestone.status !== 'in_progress') {
      return { success: false, message: `Milestone must be in progress to submit, current: ${milestone.status}` };
    }

    try {
      // Update milestone with submission
      await this.db.prepare(`
        UPDATE job_milestones 
        SET status = 'submitted', worker_notes = ?, submitted_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(submissionNotes || '', milestoneId).run();

      // Create submission record with attachments
      if (attachments && attachments.length > 0) {
        await this.db.prepare(`
          INSERT INTO milestone_submissions (
            milestone_id, worker_id, notes, attachments, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `).bind(
          milestoneId,
          workerId,
          submissionNotes || '',
          JSON.stringify(attachments)
        ).run();
      }

      // Send notification to client
      await this.notifyMilestoneSubmission(milestone, submissionNotes);

      // Log submission
      await this.logMilestoneActivity(
        milestone.job_id,
        'milestone_submitted',
        `Milestone "${milestone.title}" submitted for approval`,
        workerId
      );

      return { success: true, message: 'Milestone submitted successfully' };

    } catch (error) {
      return { success: false, message: `Failed to submit milestone: ${error.message}` };
    }
  }

  /**
   * Approve milestone and release payment
   */
  async approveMilestone(
    milestoneId: number,
    clientId: number,
    approvalNotes?: string,
    rating?: number
  ): Promise<{ success: boolean; message: string; releaseResult?: any }> {
    const milestone = await this.db.prepare(`
      SELECT jm.*, j.client_id, j.worker_id
      FROM job_milestones jm
      JOIN jobs j ON jm.job_id = j.job_id
      WHERE jm.id = ? AND j.client_id = ?
    `).bind(milestoneId, clientId).first();

    if (!milestone) {
      return { success: false, message: 'Milestone not found or access denied' };
    }

    if (milestone.status !== 'submitted') {
      return { success: false, message: `Milestone must be submitted to approve, current: ${milestone.status}` };
    }

    try {
      // Get associated escrow transaction
      const escrowTransaction = await this.db.prepare(`
        SELECT et.* FROM escrow_transactions et
        JOIN milestone_payments mp ON et.id = mp.escrow_transaction_id
        WHERE mp.milestone_id = ? AND et.status = 'held'
      `).bind(milestoneId).first();

      if (!escrowTransaction) {
        return { success: false, message: 'No active escrow transaction found for milestone' };
      }

      // Release escrow payment
      const releaseResult = await this.escrowService.releaseEscrow(
        escrowTransaction.id,
        clientId,
        `Milestone "${milestone.title}" approved by client`
      );

      if (!releaseResult.success) {
        return { success: false, message: `Failed to release payment: ${releaseResult.message}` };
      }

      // Update milestone status
      await this.db.prepare(`
        UPDATE job_milestones 
        SET status = 'approved', client_notes = ?, approved_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(approvalNotes || '', milestoneId).run();

      // Update milestone payment status
      await this.db.prepare(`
        UPDATE milestone_payments 
        SET status = 'released'
        WHERE milestone_id = ?
      `).bind(milestoneId).run();

      // Record rating if provided
      if (rating && rating >= 1 && rating <= 5) {
        await this.db.prepare(`
          INSERT INTO milestone_ratings (
            milestone_id, client_id, worker_id, rating, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `).bind(milestoneId, clientId, milestone.worker_id, rating).run();
      }

      // Check if all milestones are completed
      await this.checkJobCompletion(milestone.job_id);

      // Send notification to worker
      await this.notifyMilestoneApproval(milestone, approvalNotes, rating);

      // Log approval
      await this.logMilestoneActivity(
        milestone.job_id,
        'milestone_approved',
        `Milestone "${milestone.title}" approved and payment released`,
        clientId
      );

      return { 
        success: true, 
        message: 'Milestone approved and payment released successfully',
        releaseResult
      };

    } catch (error) {
      return { success: false, message: `Failed to approve milestone: ${error.message}` };
    }
  }

  /**
   * Request milestone revision
   */
  async requestMilestoneRevision(
    milestoneId: number,
    clientId: number,
    revisionNotes: string,
    additionalTime?: number
  ): Promise<{ success: boolean; message: string }> {
    const milestone = await this.db.prepare(`
      SELECT jm.*, j.client_id, j.worker_id
      FROM job_milestones jm
      JOIN jobs j ON jm.job_id = j.job_id
      WHERE jm.id = ? AND j.client_id = ?
    `).bind(milestoneId, clientId).first();

    if (!milestone) {
      return { success: false, message: 'Milestone not found or access denied' };
    }

    if (milestone.status !== 'submitted') {
      return { success: false, message: 'Can only request revision for submitted milestones' };
    }

    try {
      // Update milestone status and add revision notes
      await this.db.prepare(`
        UPDATE job_milestones 
        SET status = 'in_progress', client_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(revisionNotes, milestoneId).run();

      // Create revision request record
      await this.db.prepare(`
        INSERT INTO milestone_revisions (
          milestone_id, client_id, revision_notes, additional_time_hours, created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(milestoneId, clientId, revisionNotes, additionalTime || 0).run();

      // Extend deadline if additional time provided
      if (additionalTime && additionalTime > 0) {
        await this.extendMilestoneDeadline(milestoneId, additionalTime);
      }

      // Send notification to worker
      await this.notifyMilestoneRevision(milestone, revisionNotes, additionalTime);

      // Log revision request
      await this.logMilestoneActivity(
        milestone.job_id,
        'milestone_revision_requested',
        `Revision requested for milestone "${milestone.title}": ${revisionNotes}`,
        clientId
      );

      return { success: true, message: 'Revision request sent successfully' };

    } catch (error) {
      return { success: false, message: `Failed to request revision: ${error.message}` };
    }
  }

  /**
   * Get milestone progress for a job
   */
  async getJobMilestoneProgress(jobId: number): Promise<{
    milestones: JobMilestone[];
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    completionPercentage: number;
    nextMilestone?: JobMilestone;
    overdueCount: number;
  }> {
    const milestonesResult = await this.db.prepare(`
      SELECT jm.*, mp.status as payment_status, mp.amount as payment_amount
      FROM job_milestones jm
      LEFT JOIN milestone_payments mp ON jm.id = mp.milestone_id
      WHERE jm.job_id = ?
      ORDER BY jm.milestone_number
    `).bind(jobId).all();

    const milestones = milestonesResult.results as any[];

    const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
    const paidAmount = milestones
      .filter(m => m.status === 'approved')
      .reduce((sum, m) => sum + m.amount, 0);
    const pendingAmount = totalAmount - paidAmount;

    const completedMilestones = milestones.filter(m => m.status === 'approved').length;
    const completionPercentage = milestones.length > 0 ? 
      Math.round((completedMilestones / milestones.length) * 100) : 0;

    const nextMilestone = milestones.find(m => 
      ['pending', 'in_progress'].includes(m.status)
    );

    // Count overdue milestones
    const now = new Date();
    const overdueCount = milestones.filter(m => 
      m.due_date && new Date(m.due_date) < now && !['approved', 'paid'].includes(m.status)
    ).length;

    return {
      milestones,
      totalAmount,
      paidAmount,
      pendingAmount,
      completionPercentage,
      nextMilestone,
      overdueCount
    };
  }

  // Helper methods

  private async checkMilestoneDependencies(milestoneId: number): Promise<{
    satisfied: boolean;
    missing: string[];
  }> {
    const milestone = await this.db.prepare(`
      SELECT dependencies FROM job_milestones WHERE id = ?
    `).bind(milestoneId).first();

    if (!milestone?.dependencies) {
      return { satisfied: true, missing: [] };
    }

    const dependencyIds = JSON.parse(milestone.dependencies);
    if (!dependencyIds || dependencyIds.length === 0) {
      return { satisfied: true, missing: [] };
    }

    const uncompletedDeps = await this.db.prepare(`
      SELECT milestone_number FROM job_milestones 
      WHERE milestone_number IN (${dependencyIds.map(() => '?').join(',')})
        AND status != 'approved'
    `).bind(...dependencyIds).all();

    const missing = uncompletedDeps.results.map((dep: any) => `Milestone ${dep.milestone_number}`);

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  private async checkJobCompletion(jobId: number): Promise<void> {
    const incompleteCount = await this.db.prepare(`
      SELECT COUNT(*) as count FROM job_milestones 
      WHERE job_id = ? AND status != 'approved'
    `).bind(jobId).first();

    if (incompleteCount?.count === 0) {
      // All milestones completed, mark job as completed
      await this.db.prepare(`
        UPDATE jobs 
        SET status = 'completed', completion_date = datetime('now')
        WHERE job_id = ?
      `).bind(jobId).run();

      await this.logMilestoneActivity(
        jobId,
        'job_completed',
        'All milestones completed - job marked as finished',
        0
      );
    }
  }

  private async extendMilestoneDeadline(milestoneId: number, additionalHours: number): Promise<void> {
    await this.db.prepare(`
      UPDATE job_milestones 
      SET due_date = datetime(COALESCE(due_date, datetime('now')), '+${additionalHours} hours')
      WHERE id = ?
    `).bind(milestoneId).run();
  }

  private async logMilestoneActivity(
    jobId: number,
    action: string,
    description: string,
    userId: number
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO milestone_activity_log (
        job_id, action, description, user_id, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(jobId, action, description, userId).run();
  }

  private async notifyMilestoneSubmission(milestone: any, notes?: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, job_id, is_read, created_at
      ) VALUES (?, 'milestone_submitted', ?, ?, 0, datetime('now'))
    `).bind(
      milestone.client_id,
      `Milestone "${milestone.title}" has been submitted for your review. ${notes ? 'Notes: ' + notes : ''}`,
      milestone.job_id
    ).run();
  }

  private async notifyMilestoneApproval(milestone: any, notes?: string, rating?: number): Promise<void> {
    const message = `Your milestone "${milestone.title}" has been approved! Payment of $${milestone.amount} has been released.${rating ? ` Rating: ${rating}/5 stars.` : ''}${notes ? ` Client notes: ${notes}` : ''}`;
    
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, job_id, is_read, created_at
      ) VALUES (?, 'milestone_approved', ?, ?, 0, datetime('now'))
    `).bind(milestone.worker_id, message, milestone.job_id).run();
  }

  private async notifyMilestoneRevision(milestone: any, revisionNotes: string, additionalTime?: number): Promise<void> {
    const message = `Revision requested for milestone "${milestone.title}". ${revisionNotes}${additionalTime ? ` Additional time granted: ${additionalTime} hours.` : ''}`;
    
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, job_id, is_read, created_at
      ) VALUES (?, 'milestone_revision', ?, ?, 0, datetime('now'))
    `).bind(milestone.worker_id, message, milestone.job_id).run();
  }
}