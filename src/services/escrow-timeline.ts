export interface TimelineEvent {
  id: number;
  transaction_id: number;
  event_type: 'created' | 'payment_confirmed' | 'work_submitted' | 'approved' | 'released' | 'disputed' | 'refunded' | 'expired';
  description: string;
  user_id?: number;
  metadata?: string;
  created_at: string;
}

export interface DeadlineConfig {
  approval_deadline_hours: number;
  auto_release_hours: number;
  dispute_resolution_hours: number;
  refund_deadline_hours: number;
  reminder_intervals: number[]; // Hours before deadline
}

export interface EscrowDeadline {
  id: number;
  transaction_id: number;
  deadline_type: 'approval' | 'auto_release' | 'dispute_resolution' | 'refund' | 'custom';
  deadline_at: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  reminder_sent: boolean;
  escalation_level: number;
  created_at: string;
  completed_at?: string;
}

export class EscrowTimelineService {
  private db: D1Database;
  private defaultConfig: DeadlineConfig = {
    approval_deadline_hours: 168, // 7 days
    auto_release_hours: 240, // 10 days
    dispute_resolution_hours: 720, // 30 days
    refund_deadline_hours: 72, // 3 days
    reminder_intervals: [24, 6, 1] // 24h, 6h, 1h before deadline
  };

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Initialize timeline and deadlines for new escrow transaction
   */
  async initializeEscrowTimeline(
    transactionId: number,
    jobType: string = 'standard',
    customConfig?: Partial<DeadlineConfig>
  ): Promise<void> {
    const config = { ...this.defaultConfig, ...customConfig };

    // Create initial timeline event
    await this.addTimelineEvent(
      transactionId,
      'created',
      'Escrow transaction created and funds held',
      undefined,
      { config: JSON.stringify(config) }
    );

    // Set up deadlines based on job type and configuration
    await this.createDeadlines(transactionId, config, jobType);
  }

  /**
   * Add event to escrow timeline
   */
  async addTimelineEvent(
    transactionId: number,
    eventType: TimelineEvent['event_type'],
    description: string,
    userId?: number,
    metadata?: any
  ): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO escrow_timeline (
        transaction_id, event_type, description, user_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      transactionId,
      eventType,
      description,
      userId || null,
      metadata ? JSON.stringify(metadata) : null
    ).run();

    const eventId = result.meta.last_row_id as number;

    // Update relevant deadlines based on event type
    await this.updateDeadlinesOnEvent(transactionId, eventType, new Date());

    return eventId;
  }

  /**
   * Get complete timeline for escrow transaction
   */
  async getEscrowTimeline(transactionId: number): Promise<{
    timeline: TimelineEvent[];
    deadlines: EscrowDeadline[];
    currentPhase: string;
    nextDeadline?: EscrowDeadline;
    overdueTasks: EscrowDeadline[];
  }> {
    // Get timeline events
    const timelineResult = await this.db.prepare(`
      SELECT et.*, u.name as user_name
      FROM escrow_timeline et
      LEFT JOIN users u ON et.user_id = u.user_id
      WHERE et.transaction_id = ?
      ORDER BY et.created_at ASC
    `).bind(transactionId).all();

    // Get deadlines
    const deadlinesResult = await this.db.prepare(`
      SELECT * FROM escrow_deadlines 
      WHERE transaction_id = ?
      ORDER BY deadline_at ASC
    `).bind(transactionId).all();

    const timeline = timelineResult.results as TimelineEvent[];
    const deadlines = deadlinesResult.results as EscrowDeadline[];

    // Determine current phase
    const currentPhase = this.determineCurrentPhase(timeline);

    // Find next deadline
    const nextDeadline = deadlines.find(d => 
      d.status === 'pending' && new Date(d.deadline_at) > new Date()
    );

    // Find overdue tasks
    const overdueTasks = deadlines.filter(d => 
      d.status === 'pending' && new Date(d.deadline_at) <= new Date()
    );

    return {
      timeline,
      deadlines,
      currentPhase,
      nextDeadline,
      overdueTasks
    };
  }

  /**
   * Process deadline reminders and escalations
   */
  async processDeadlineReminders(): Promise<void> {
    console.log('Processing escrow deadline reminders...');

    // Get approaching deadlines that need reminders
    const approachingDeadlines = await this.db.prepare(`
      SELECT ed.*, et.client_id, et.worker_id, et.job_id, et.amount,
             j.title as job_title
      FROM escrow_deadlines ed
      JOIN escrow_transactions et ON ed.transaction_id = et.id
      JOIN jobs j ON et.job_id = j.job_id
      WHERE ed.status = 'pending'
        AND ed.reminder_sent = 0
        AND datetime(ed.deadline_at, '-1 hours') <= datetime('now')
        AND datetime(ed.deadline_at) > datetime('now')
    `).all();

    for (const deadline of approachingDeadlines.results) {
      await this.sendDeadlineReminder(deadline);
      
      // Mark reminder as sent
      await this.db.prepare(`
        UPDATE escrow_deadlines 
        SET reminder_sent = 1, escalation_level = escalation_level + 1
        WHERE id = ?
      `).bind(deadline.id).run();
    }

    // Process overdue deadlines
    await this.processOverdueDeadlines();
  }

  /**
   * Process overdue deadlines and trigger escalations
   */
  async processOverdueDeadlines(): Promise<void> {
    const overdueDeadlines = await this.db.prepare(`
      SELECT ed.*, et.client_id, et.worker_id, et.job_id, et.amount,
             j.title as job_title, j.status as job_status
      FROM escrow_deadlines ed
      JOIN escrow_transactions et ON ed.transaction_id = et.id
      JOIN jobs j ON et.job_id = j.job_id
      WHERE ed.status = 'pending'
        AND datetime(ed.deadline_at) <= datetime('now')
    `).all();

    for (const deadline of overdueDeadlines.results) {
      await this.escalateOverdueDeadline(deadline);
      
      // Mark as overdue
      await this.db.prepare(`
        UPDATE escrow_deadlines 
        SET status = 'overdue', escalation_level = escalation_level + 1
        WHERE id = ?
      `).bind(deadline.id).run();

      // Add timeline event
      await this.addTimelineEvent(
        deadline.transaction_id,
        'expired',
        `${deadline.deadline_type} deadline exceeded`,
        undefined,
        { deadline_id: deadline.id }
      );
    }
  }

  /**
   * Extend deadline for specific transaction
   */
  async extendDeadline(
    transactionId: number,
    deadlineType: EscrowDeadline['deadline_type'],
    extensionHours: number,
    reason: string,
    requestedBy: number
  ): Promise<{ success: boolean; message: string; newDeadline?: Date }> {
    // Check if extension is allowed
    const extensionCheck = await this.validateDeadlineExtension(
      transactionId, 
      deadlineType, 
      extensionHours
    );

    if (!extensionCheck.valid) {
      return { success: false, message: extensionCheck.reason };
    }

    // Update deadline
    const newDeadlineTime = new Date(Date.now() + (extensionHours * 60 * 60 * 1000));
    
    await this.db.prepare(`
      UPDATE escrow_deadlines 
      SET deadline_at = ?, escalation_level = 0, reminder_sent = 0
      WHERE transaction_id = ? AND deadline_type = ? AND status = 'pending'
    `).bind(
      newDeadlineTime.toISOString(),
      transactionId,
      deadlineType
    ).run();

    // Add timeline event
    await this.addTimelineEvent(
      transactionId,
      'created', // Using 'created' as generic event type
      `${deadlineType} deadline extended by ${extensionHours} hours: ${reason}`,
      requestedBy,
      { 
        extension_hours: extensionHours,
        new_deadline: newDeadlineTime.toISOString(),
        reason 
      }
    );

    // Send notifications
    await this.notifyDeadlineExtension(transactionId, deadlineType, newDeadlineTime, reason);

    return { 
      success: true, 
      message: `Deadline extended successfully`, 
      newDeadline: newDeadlineTime 
    };
  }

  /**
   * Get escrow transaction status with timeline insights
   */
  async getTransactionStatus(transactionId: number): Promise<{
    status: string;
    phase: string;
    timeElapsed: number; // hours
    estimatedCompletion?: Date;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    const transaction = await this.db.prepare(`
      SELECT et.*, j.status as job_status, j.estimated_duration
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.id = ?
    `).bind(transactionId).first();

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const timeline = await this.getEscrowTimeline(transactionId);
    const createdAt = new Date(transaction.created_at);
    const timeElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60); // hours

    // Calculate risk level
    const riskLevel = this.assessRiskLevel(timeline, timeElapsed, transaction);

    // Generate recommendations
    const recommendations = this.generateRecommendations(timeline, transaction, riskLevel);

    // Estimate completion time
    const estimatedCompletion = this.estimateCompletion(timeline, transaction);

    return {
      status: transaction.status,
      phase: timeline.currentPhase,
      timeElapsed: Math.round(timeElapsed * 100) / 100,
      estimatedCompletion,
      riskLevel,
      recommendations
    };
  }

  // Private helper methods

  private async createDeadlines(
    transactionId: number,
    config: DeadlineConfig,
    jobType: string
  ): Promise<void> {
    const now = new Date();

    // Adjust deadlines based on job type
    let multiplier = 1;
    if (jobType === 'complex') multiplier = 1.5;
    if (jobType === 'urgent') multiplier = 0.5;

    const deadlines = [
      {
        type: 'approval' as const,
        hours: config.approval_deadline_hours * multiplier
      },
      {
        type: 'auto_release' as const,
        hours: config.auto_release_hours * multiplier
      },
      {
        type: 'dispute_resolution' as const,
        hours: config.dispute_resolution_hours * multiplier
      }
    ];

    for (const deadline of deadlines) {
      const deadlineTime = new Date(now.getTime() + (deadline.hours * 60 * 60 * 1000));
      
      await this.db.prepare(`
        INSERT INTO escrow_deadlines (
          transaction_id, deadline_type, deadline_at, status, reminder_sent, escalation_level, created_at
        ) VALUES (?, ?, ?, 'pending', 0, 0, datetime('now'))
      `).bind(
        transactionId,
        deadline.type,
        deadlineTime.toISOString()
      ).run();
    }
  }

  private async updateDeadlinesOnEvent(
    transactionId: number,
    eventType: TimelineEvent['event_type'],
    eventTime: Date
  ): Promise<void> {
    switch (eventType) {
      case 'work_submitted':
        // Mark work submission and start approval countdown
        await this.db.prepare(`
          UPDATE escrow_deadlines 
          SET status = 'completed', completed_at = ?
          WHERE transaction_id = ? AND deadline_type = 'work_submission'
        `).bind(eventTime.toISOString(), transactionId).run();
        break;

      case 'approved':
        // Mark approval deadline as completed
        await this.db.prepare(`
          UPDATE escrow_deadlines 
          SET status = 'completed', completed_at = ?
          WHERE transaction_id = ? AND deadline_type = 'approval'
        `).bind(eventTime.toISOString(), transactionId).run();
        break;

      case 'released':
      case 'refunded':
        // Mark all deadlines as completed when transaction is finalized
        await this.db.prepare(`
          UPDATE escrow_deadlines 
          SET status = 'completed', completed_at = ?
          WHERE transaction_id = ? AND status = 'pending'
        `).bind(eventTime.toISOString(), transactionId).run();
        break;

      case 'disputed':
        // Cancel approval deadlines and start dispute resolution timeline
        await this.db.prepare(`
          UPDATE escrow_deadlines 
          SET status = 'cancelled'
          WHERE transaction_id = ? AND deadline_type IN ('approval', 'auto_release')
        `).bind(transactionId).run();
        break;
    }
  }

  private determineCurrentPhase(timeline: TimelineEvent[]): string {
    const latestEvent = timeline[timeline.length - 1];
    
    if (!latestEvent) return 'created';
    
    const phaseMap: Record<string, string> = {
      'created': 'awaiting_work',
      'payment_confirmed': 'awaiting_work',
      'work_submitted': 'awaiting_approval',
      'approved': 'payment_processing',
      'released': 'completed',
      'disputed': 'dispute_resolution',
      'refunded': 'refunded',
      'expired': 'expired'
    };

    return phaseMap[latestEvent.event_type] || 'unknown';
  }

  private async sendDeadlineReminder(deadline: any): Promise<void> {
    const message = this.getDeadlineReminderMessage(deadline);
    
    // Send to relevant parties based on deadline type
    const recipients = this.getDeadlineRecipients(deadline);
    
    for (const recipient of recipients) {
      await this.db.prepare(`
        INSERT INTO notifications (
          user_id, type, message, job_id, is_read, created_at
        ) VALUES (?, 'deadline_reminder', ?, ?, 0, datetime('now'))
      `).bind(recipient.user_id, message, deadline.job_id).run();
    }
  }

  private getDeadlineReminderMessage(deadline: any): string {
    const timeLeft = Math.round((new Date(deadline.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60));
    
    const messages: Record<string, string> = {
      'approval': `⏰ Reminder: Please review and approve the completed work for "${deadline.job_title}". ${timeLeft} hours remaining until deadline. Payment of $${deadline.amount} is secured in escrow.`,
      'auto_release': `⚠️ Auto-release approaching: Payment for "${deadline.job_title}" will be automatically released in ${timeLeft} hours unless disputed.`,
      'dispute_resolution': `🚨 Dispute resolution deadline: The dispute for "${deadline.job_title}" must be resolved within ${timeLeft} hours.`,
      'refund': `💰 Refund processing: The refund for "${deadline.job_title}" is being processed. ${timeLeft} hours remaining.`
    };

    return messages[deadline.deadline_type] || `Deadline reminder for ${deadline.deadline_type}: ${timeLeft} hours remaining`;
  }

  private getDeadlineRecipients(deadline: any): Array<{ user_id: number; role: string }> {
    const recipientMap: Record<string, Array<{ user_id: number; role: string }>> = {
      'approval': [{ user_id: deadline.client_id, role: 'client' }],
      'auto_release': [
        { user_id: deadline.client_id, role: 'client' },
        { user_id: deadline.worker_id, role: 'worker' }
      ],
      'dispute_resolution': [
        { user_id: deadline.client_id, role: 'client' },
        { user_id: deadline.worker_id, role: 'worker' }
      ],
      'refund': [{ user_id: deadline.client_id, role: 'client' }]
    };

    return recipientMap[deadline.deadline_type] || [];
  }

  private async escalateOverdueDeadline(deadline: any): Promise<void> {
    console.log(`Escalating overdue deadline: ${deadline.deadline_type} for transaction ${deadline.transaction_id}`);
    
    // Implementation depends on deadline type and escalation level
    switch (deadline.deadline_type) {
      case 'approval':
        if (deadline.escalation_level === 0) {
          // First escalation: Send urgent reminder
          await this.sendUrgentApprovalReminder(deadline);
        } else if (deadline.escalation_level >= 2) {
          // Final escalation: Auto-approve if allowed
          await this.triggerAutoApproval(deadline);
        }
        break;

      case 'auto_release':
        // Force release the escrow
        await this.triggerForceRelease(deadline);
        break;

      case 'dispute_resolution':
        // Escalate to admin review
        await this.escalateToAdmin(deadline);
        break;
    }
  }

  private async validateDeadlineExtension(
    transactionId: number,
    deadlineType: string,
    extensionHours: number
  ): Promise<{ valid: boolean; reason: string }> {
    // Check maximum extension limits
    const maxExtensions: Record<string, number> = {
      'approval': 168, // 7 days max
      'auto_release': 72, // 3 days max
      'dispute_resolution': 240 // 10 days max
    };

    if (extensionHours > (maxExtensions[deadlineType] || 24)) {
      return { 
        valid: false, 
        reason: `Maximum extension for ${deadlineType} is ${maxExtensions[deadlineType]} hours` 
      };
    }

    // Check if transaction is in valid state for extension
    const transaction = await this.db.prepare(`
      SELECT status FROM escrow_transactions WHERE id = ?
    `).bind(transactionId).first();

    if (!['held', 'pending'].includes(transaction?.status)) {
      return { 
        valid: false, 
        reason: 'Transaction status does not allow deadline extension' 
      };
    }

    return { valid: true, reason: '' };
  }

  private assessRiskLevel(timeline: any, timeElapsed: number, transaction: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Time-based risk factors
    if (timeElapsed > 240) riskScore += 2; // Over 10 days
    else if (timeElapsed > 120) riskScore += 1; // Over 5 days

    // Status-based risk factors
    if (transaction.status === 'disputed') riskScore += 3;
    if (timeline.overdueTasks.length > 0) riskScore += 2;
    if (timeline.overdueTasks.length > 2) riskScore += 2;

    // Communication risk factors
    const recentActivity = timeline.timeline.filter(
      (event: any) => (Date.now() - new Date(event.created_at).getTime()) < (48 * 60 * 60 * 1000)
    );
    if (recentActivity.length === 0) riskScore += 1;

    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  private generateRecommendations(timeline: any, transaction: any, riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high') {
      recommendations.push('🚨 High risk transaction - consider manual review');
      recommendations.push('📞 Contact both parties to resolve issues');
    }

    if (timeline.overdueTasks.length > 0) {
      recommendations.push('⏰ Address overdue deadlines immediately');
    }

    if (timeline.currentPhase === 'awaiting_approval') {
      recommendations.push('💡 Send approval reminder to client');
    }

    if (timeline.currentPhase === 'dispute_resolution') {
      recommendations.push('⚖️ Escalate dispute to mediation if unresolved');
    }

    return recommendations;
  }

  private estimateCompletion(timeline: any, transaction: any): Date | undefined {
    const phase = timeline.currentPhase;
    const now = new Date();
    
    const estimatedHours: Record<string, number> = {
      'awaiting_work': 72, // 3 days
      'awaiting_approval': 48, // 2 days
      'payment_processing': 1, // 1 hour
      'dispute_resolution': 168 // 7 days
    };

    const hours = estimatedHours[phase];
    if (!hours) return undefined;

    return new Date(now.getTime() + (hours * 60 * 60 * 1000));
  }

  private async notifyDeadlineExtension(
    transactionId: number,
    deadlineType: string,
    newDeadline: Date,
    reason: string
  ): Promise<void> {
    // Implementation for deadline extension notifications
  }

  private async sendUrgentApprovalReminder(deadline: any): Promise<void> {
    // Implementation for urgent approval reminders
  }

  private async triggerAutoApproval(deadline: any): Promise<void> {
    // Implementation for auto-approval trigger
  }

  private async triggerForceRelease(deadline: any): Promise<void> {
    // Implementation for force release
  }

  private async escalateToAdmin(deadline: any): Promise<void> {
    // Implementation for admin escalation
  }
}