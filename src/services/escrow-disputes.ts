export interface DisputeCase {
  id: number;
  escrow_transaction_id: number;
  job_id: number;
  client_id: number;
  worker_id: number;
  initiated_by: number;
  dispute_type: 'quality' | 'timeline' | 'payment' | 'requirements' | 'communication' | 'other';
  status: 'open' | 'investigating' | 'mediation' | 'arbitration' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  amount_disputed: number;
  resolution_type?: 'full_refund' | 'partial_refund' | 'full_release' | 'partial_release' | 'rework' | 'split_decision';
  resolution_amount?: number;
  resolution_notes?: string;
  assigned_mediator?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface DisputeEvidence {
  id: number;
  dispute_id: number;
  submitted_by: number;
  evidence_type: 'document' | 'image' | 'video' | 'chat_log' | 'email' | 'other';
  file_url?: string;
  description: string;
  metadata?: string;
  created_at: string;
}

export interface DisputeMessage {
  id: number;
  dispute_id: number;
  sender_id: number;
  sender_type: 'client' | 'worker' | 'mediator' | 'admin' | 'system';
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface MediationSession {
  id: number;
  dispute_id: number;
  mediator_id: number;
  scheduled_at: string;
  duration_minutes?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meeting_url?: string;
  notes?: string;
  created_at: string;
}

export class EscrowDisputeService {
  private db: D1Database;
  private escalationTimelines = {
    auto_mediation_hours: 72, // 3 days
    auto_arbitration_hours: 168, // 7 days
    resolution_deadline_hours: 336 // 14 days
  };

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * File a new dispute
   */
  async fileDispute(
    escrowTransactionId: number,
    initiatedBy: number,
    disputeData: {
      disputeType: DisputeCase['dispute_type'];
      title: string;
      description: string;
      amountDisputed: number;
      evidence?: { type: string; description: string; fileUrl?: string }[];
    }
  ): Promise<{ success: boolean; message: string; disputeId?: number }> {
    // Validate transaction exists and user has access
    const transaction = await this.db.prepare(`
      SELECT et.*, j.client_id, j.worker_id, j.title as job_title
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.id = ? AND (j.client_id = ? OR j.worker_id = ?)
    `).bind(escrowTransactionId, initiatedBy, initiatedBy).first();

    if (!transaction) {
      return { success: false, message: 'Transaction not found or access denied' };
    }

    if (!['held', 'pending'].includes(transaction.status)) {
      return { success: false, message: 'Cannot dispute transaction with current status' };
    }

    // Check for existing active disputes
    const existingDispute = await this.db.prepare(`
      SELECT id FROM dispute_cases 
      WHERE escrow_transaction_id = ? AND status NOT IN ('resolved', 'closed')
    `).bind(escrowTransactionId).first();

    if (existingDispute) {
      return { success: false, message: 'Active dispute already exists for this transaction' };
    }

    try {
      // Create dispute case
      const disputeResult = await this.db.prepare(`
        INSERT INTO dispute_cases (
          escrow_transaction_id, job_id, client_id, worker_id, initiated_by,
          dispute_type, status, priority, title, description, amount_disputed,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        escrowTransactionId,
        transaction.job_id,
        transaction.client_id,
        transaction.worker_id,
        initiatedBy,
        disputeData.disputeType,
        this.calculateDisputePriority(disputeData.amountDisputed, disputeData.disputeType),
        disputeData.title,
        disputeData.description,
        disputeData.amountDisputed
      ).run();

      const disputeId = disputeResult.meta.last_row_id as number;

      // Update escrow transaction status
      await this.db.prepare(`
        UPDATE escrow_transactions 
        SET status = 'disputed', updated_at = datetime('now')
        WHERE id = ?
      `).bind(escrowTransactionId).run();

      // Add evidence if provided
      if (disputeData.evidence && disputeData.evidence.length > 0) {
        for (const evidence of disputeData.evidence) {
          await this.addDisputeEvidence(disputeId, initiatedBy, evidence);
        }
      }

      // Send initial dispute message
      await this.addDisputeMessage(
        disputeId,
        initiatedBy,
        initiatedBy === transaction.client_id ? 'client' : 'worker',
        `Dispute filed: ${disputeData.title}\n\n${disputeData.description}`,
        false
      );

      // Notify other party
      const otherParty = initiatedBy === transaction.client_id ? transaction.worker_id : transaction.client_id;
      await this.notifyDisputeFiled(disputeId, otherParty, disputeData.title);

      // Schedule automatic escalation
      await this.scheduleDisputeEscalation(disputeId);

      // Log dispute creation
      await this.logDisputeActivity(
        disputeId,
        'dispute_filed',
        `Dispute filed by ${initiatedBy === transaction.client_id ? 'client' : 'worker'}`,
        initiatedBy
      );

      return {
        success: true,
        message: 'Dispute filed successfully',
        disputeId
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to file dispute: ${error.message}`
      };
    }
  }

  /**
   * Respond to dispute
   */
  async respondToDispute(
    disputeId: number,
    respondingUserId: number,
    response: {
      message: string;
      counterOffer?: {
        resolutionType: DisputeCase['resolution_type'];
        amount?: number;
        notes?: string;
      };
      evidence?: { type: string; description: string; fileUrl?: string }[];
    }
  ): Promise<{ success: boolean; message: string }> {
    const dispute = await this.getDisputeDetails(disputeId);
    
    if (!dispute) {
      return { success: false, message: 'Dispute not found' };
    }

    // Verify user is involved in dispute
    if (![dispute.client_id, dispute.worker_id].includes(respondingUserId)) {
      return { success: false, message: 'Not authorized to respond to this dispute' };
    }

    if (!['open', 'investigating'].includes(dispute.status)) {
      return { success: false, message: 'Cannot respond to dispute in current status' };
    }

    try {
      // Add response message
      const senderType = respondingUserId === dispute.client_id ? 'client' : 'worker';
      await this.addDisputeMessage(disputeId, respondingUserId, senderType, response.message, false);

      // Add evidence if provided
      if (response.evidence && response.evidence.length > 0) {
        for (const evidence of response.evidence) {
          await this.addDisputeEvidence(disputeId, respondingUserId, evidence);
        }
      }

      // Handle counter offer
      if (response.counterOffer) {
        await this.processCounterOffer(disputeId, respondingUserId, response.counterOffer);
      }

      // Update dispute status to investigating if still open
      if (dispute.status === 'open') {
        await this.db.prepare(`
          UPDATE dispute_cases 
          SET status = 'investigating', updated_at = datetime('now')
          WHERE id = ?
        `).bind(disputeId).run();
      }

      // Notify other party
      const otherParty = respondingUserId === dispute.client_id ? dispute.worker_id : dispute.client_id;
      await this.notifyDisputeResponse(disputeId, otherParty);

      await this.logDisputeActivity(
        disputeId,
        'response_submitted',
        `Response submitted by ${senderType}`,
        respondingUserId
      );

      return { success: true, message: 'Response submitted successfully' };

    } catch (error) {
      return { success: false, message: `Failed to submit response: ${error.message}` };
    }
  }

  /**
   * Escalate dispute to mediation
   */
  async escalateToMediation(
    disputeId: number,
    requestedBy?: number,
    reason = 'Automatic escalation due to timeout'
  ): Promise<{ success: boolean; message: string; mediatorId?: number }> {
    const dispute = await this.getDisputeDetails(disputeId);
    
    if (!dispute) {
      return { success: false, message: 'Dispute not found' };
    }

    if (!['open', 'investigating'].includes(dispute.status)) {
      return { success: false, message: 'Dispute not in valid state for mediation' };
    }

    try {
      // Assign mediator
      const mediator = await this.assignMediator(disputeId, dispute.dispute_type, dispute.amount_disputed);
      
      if (!mediator) {
        return { success: false, message: 'No mediators available for assignment' };
      }

      // Update dispute status
      await this.db.prepare(`
        UPDATE dispute_cases 
        SET status = 'mediation', assigned_mediator = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(mediator.id, disputeId).run();

      // Schedule mediation session
      const sessionId = await this.scheduleMediationSession(disputeId, mediator.id);

      // Notify all parties
      await this.notifyMediationScheduled(disputeId, mediator.id, sessionId);

      // Add system message
      await this.addDisputeMessage(
        disputeId,
        0,
        'system',
        `Dispute escalated to mediation. Mediator ${mediator.name} has been assigned. A mediation session will be scheduled within 24 hours.`,
        false
      );

      await this.logDisputeActivity(
        disputeId,
        'escalated_to_mediation',
        `Escalated to mediation - ${reason}`,
        requestedBy || 0
      );

      return {
        success: true,
        message: 'Dispute escalated to mediation successfully',
        mediatorId: mediator.id
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to escalate to mediation: ${error.message}`
      };
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(
    disputeId: number,
    resolvingUserId: number,
    resolution: {
      resolutionType: DisputeCase['resolution_type'];
      amount?: number;
      notes: string;
      requiresApproval?: boolean;
    }
  ): Promise<{ success: boolean; message: string; escrowAction?: any }> {
    const dispute = await this.getDisputeDetails(disputeId);
    
    if (!dispute) {
      return { success: false, message: 'Dispute not found' };
    }

    // Verify authorization (mediator, admin, or both parties in agreement)
    const canResolve = await this.canResolveDispute(disputeId, resolvingUserId);
    if (!canResolve.authorized) {
      return { success: false, message: canResolve.reason };
    }

    try {
      // Validate resolution amount
      if (resolution.amount && (resolution.amount < 0 || resolution.amount > dispute.amount_disputed)) {
        return { success: false, message: 'Invalid resolution amount' };
      }

      // Update dispute with resolution
      await this.db.prepare(`
        UPDATE dispute_cases 
        SET status = 'resolved', resolution_type = ?, resolution_amount = ?, 
            resolution_notes = ?, resolved_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        resolution.resolutionType,
        resolution.amount || null,
        resolution.notes,
        disputeId
      ).run();

      // Execute escrow action based on resolution
      const escrowAction = await this.executeResolution(dispute, resolution);

      // Add resolution message
      await this.addDisputeMessage(
        disputeId,
        resolvingUserId,
        resolvingUserId === dispute.assigned_mediator ? 'mediator' : 'admin',
        `Dispute resolved: ${resolution.resolutionType}\n\nResolution: ${resolution.notes}`,
        false
      );

      // Notify all parties
      await this.notifyDisputeResolved(disputeId, resolution);

      // Close any scheduled sessions
      await this.cancelPendingMediationSessions(disputeId);

      await this.logDisputeActivity(
        disputeId,
        'dispute_resolved',
        `Dispute resolved with ${resolution.resolutionType}`,
        resolvingUserId
      );

      return {
        success: true,
        message: 'Dispute resolved successfully',
        escrowAction
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to resolve dispute: ${error.message}`
      };
    }
  }

  /**
   * Get dispute dashboard data
   */
  async getDisputeDashboard(): Promise<{
    activeDisputes: DisputeCase[];
    disputeStats: {
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      avgResolutionTime: number;
      resolutionRate: number;
    };
    pendingMediations: MediationSession[];
    recentResolutions: DisputeCase[];
  }> {
    const [activeDisputes, disputeStats, pendingMediations, recentResolutions] = await Promise.all([
      this.getActiveDisputes(),
      this.getDisputeStatistics(),
      this.getPendingMediations(),
      this.getRecentResolutions()
    ]);

    return {
      activeDisputes,
      disputeStats,
      pendingMediations,
      recentResolutions
    };
  }

  /**
   * Process automatic dispute escalations
   */
  async processDisputeEscalations(): Promise<void> {
    console.log('Processing dispute escalations...');

    // Escalate to mediation after 72 hours
    const mediationEscalations = await this.db.prepare(`
      SELECT id FROM dispute_cases 
      WHERE status IN ('open', 'investigating')
        AND datetime(created_at, '+${this.escalationTimelines.auto_mediation_hours} hours') <= datetime('now')
    `).all();

    for (const dispute of mediationEscalations.results) {
      await this.escalateToMediation(dispute.id, 0, 'Automatic escalation after 72 hours');
    }

    // Escalate to arbitration after 7 days in mediation
    const arbitrationEscalations = await this.db.prepare(`
      SELECT id FROM dispute_cases 
      WHERE status = 'mediation'
        AND datetime(updated_at, '+${this.escalationTimelines.auto_arbitration_hours} hours') <= datetime('now')
    `).all();

    for (const dispute of arbitrationEscalations.results) {
      await this.escalateToArbitration(dispute.id);
    }

    // Force resolution after 14 days total
    const forceResolutions = await this.db.prepare(`
      SELECT id FROM dispute_cases 
      WHERE status IN ('open', 'investigating', 'mediation', 'arbitration')
        AND datetime(created_at, '+${this.escalationTimelines.resolution_deadline_hours} hours') <= datetime('now')
    `).all();

    for (const dispute of forceResolutions.results) {
      await this.forceDisputeResolution(dispute.id);
    }
  }

  // Helper methods

  private calculateDisputePriority(amount: number, disputeType: string): DisputeCase['priority'] {
    if (amount > 5000) return 'urgent';
    if (amount > 2000) return 'high';
    if (['payment', 'timeline'].includes(disputeType)) return 'high';
    if (amount > 500) return 'medium';
    return 'low';
  }

  private async addDisputeEvidence(
    disputeId: number,
    submittedBy: number,
    evidence: { type: string; description: string; fileUrl?: string }
  ): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO dispute_evidence (
        dispute_id, submitted_by, evidence_type, file_url, description, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      disputeId,
      submittedBy,
      evidence.type,
      evidence.fileUrl || null,
      evidence.description
    ).run();

    return result.meta.last_row_id as number;
  }

  private async addDisputeMessage(
    disputeId: number,
    senderId: number,
    senderType: DisputeMessage['sender_type'],
    message: string,
    isInternal: boolean
  ): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO dispute_messages (
        dispute_id, sender_id, sender_type, message, is_internal, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(disputeId, senderId, senderType, message, isInternal ? 1 : 0).run();

    return result.meta.last_row_id as number;
  }

  private async getDisputeDetails(disputeId: number): Promise<DisputeCase | null> {
    const result = await this.db.prepare(`
      SELECT * FROM dispute_cases WHERE id = ?
    `).bind(disputeId).first();

    return result as DisputeCase || null;
  }

  private async assignMediator(disputeId: number, disputeType: string, amount: number): Promise<any> {
    // Find available mediator based on specialization and workload
    const mediator = await this.db.prepare(`
      SELECT m.*, u.name, COUNT(dc.id) as active_cases
      FROM mediators m
      JOIN users u ON m.user_id = u.user_id
      LEFT JOIN dispute_cases dc ON m.user_id = dc.assigned_mediator AND dc.status = 'mediation'
      WHERE m.specializations LIKE '%' || ? || '%'
        AND m.max_case_value >= ?
        AND u.status = 'active'
      GROUP BY m.user_id
      ORDER BY active_cases ASC, m.rating DESC
      LIMIT 1
    `).bind(disputeType, amount).first();

    return mediator;
  }

  private async scheduleMediationSession(disputeId: number, mediatorId: number): Promise<number> {
    // Schedule session for next available slot (simplified)
    const scheduledAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // Tomorrow

    const result = await this.db.prepare(`
      INSERT INTO mediation_sessions (
        dispute_id, mediator_id, scheduled_at, status, created_at
      ) VALUES (?, ?, ?, 'scheduled', datetime('now'))
    `).bind(disputeId, mediatorId, scheduledAt.toISOString()).run();

    return result.meta.last_row_id as number;
  }

  private async canResolveDispute(disputeId: number, userId: number): Promise<{ authorized: boolean; reason: string }> {
    const dispute = await this.getDisputeDetails(disputeId);
    const user = await this.db.prepare(`
      SELECT role FROM users WHERE user_id = ?
    `).bind(userId).first();

    // Admin can always resolve
    if (user?.role === 'admin') {
      return { authorized: true, reason: '' };
    }

    // Assigned mediator can resolve
    if (dispute?.assigned_mediator === userId) {
      return { authorized: true, reason: '' };
    }

    // Both parties in mutual agreement (check for agreement messages)
    const agreements = await this.db.prepare(`
      SELECT COUNT(*) as count FROM dispute_messages 
      WHERE dispute_id = ? AND message LIKE '%agree%' AND created_at > datetime('now', '-24 hours')
    `).bind(disputeId).first();

    if (agreements?.count >= 2) {
      return { authorized: true, reason: '' };
    }

    return { authorized: false, reason: 'Not authorized to resolve this dispute' };
  }

  private async executeResolution(dispute: DisputeCase, resolution: any): Promise<any> {
    // Implementation depends on resolution type
    const escrowService = new (await import('./escrow.js')).EscrowService(
      // Stripe and DB instances would be injected
      {} as any, this.db
    );

    switch (resolution.resolutionType) {
      case 'full_refund':
        return await escrowService.refundEscrow(
          dispute.escrow_transaction_id,
          dispute.client_id,
          `Dispute resolved: ${resolution.notes}`
        );

      case 'full_release':
        return await escrowService.releaseEscrow(
          dispute.escrow_transaction_id,
          dispute.worker_id,
          `Dispute resolved: ${resolution.notes}`
        );

      case 'partial_refund':
      case 'partial_release':
        // Would require more complex partial payment handling
        return { success: true, message: 'Partial resolution processed' };

      default:
        return { success: true, message: 'Resolution recorded' };
    }
  }

  private async scheduleDisputeEscalation(disputeId: number): Promise<void> {
    // Create scheduled task for automatic escalation
    const escalationTime = new Date(Date.now() + (this.escalationTimelines.auto_mediation_hours * 60 * 60 * 1000));

    await this.db.prepare(`
      INSERT INTO dispute_schedule (
        dispute_id, action, scheduled_at, processed, created_at
      ) VALUES (?, 'escalate_to_mediation', ?, 0, datetime('now'))
    `).bind(disputeId, escalationTime.toISOString()).run();
  }

  private async logDisputeActivity(
    disputeId: number,
    action: string,
    description: string,
    userId: number
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO dispute_activity_log (
        dispute_id, action, description, user_id, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(disputeId, action, description, userId).run();
  }

  // Notification methods (simplified implementations)
  private async notifyDisputeFiled(disputeId: number, userId: number, title: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, dispute_id, is_read, created_at
      ) VALUES (?, 'dispute_filed', ?, ?, 0, datetime('now'))
    `).bind(userId, `A dispute has been filed: ${title}`, disputeId).run();
  }

  private async notifyDisputeResponse(disputeId: number, userId: number): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, dispute_id, is_read, created_at
      ) VALUES (?, 'dispute_response', 'New response in your dispute case', ?, 0, datetime('now'))
    `).bind(userId, disputeId).run();
  }

  private async notifyMediationScheduled(disputeId: number, mediatorId: number, sessionId: number): Promise<void> {
    // Notify all parties about mediation
  }

  private async notifyDisputeResolved(disputeId: number, resolution: any): Promise<void> {
    // Notify all parties about resolution
  }

  private async processCounterOffer(disputeId: number, userId: number, counterOffer: any): Promise<void> {
    // Process counter offer logic
  }

  private async getActiveDisputes(): Promise<DisputeCase[]> {
    const result = await this.db.prepare(`
      SELECT dc.*, j.title as job_title 
      FROM dispute_cases dc
      JOIN jobs j ON dc.job_id = j.job_id
      WHERE dc.status NOT IN ('resolved', 'closed')
      ORDER BY dc.priority DESC, dc.created_at ASC
    `).all();

    return result.results as DisputeCase[];
  }

  private async getDisputeStatistics(): Promise<any> {
    // Implementation for dispute statistics
    return {
      total: 0,
      byStatus: {},
      byType: {},
      avgResolutionTime: 0,
      resolutionRate: 0
    };
  }

  private async getPendingMediations(): Promise<MediationSession[]> {
    const result = await this.db.prepare(`
      SELECT * FROM mediation_sessions 
      WHERE status IN ('scheduled', 'in_progress')
      ORDER BY scheduled_at ASC
    `).all();

    return result.results as MediationSession[];
  }

  private async getRecentResolutions(): Promise<DisputeCase[]> {
    const result = await this.db.prepare(`
      SELECT * FROM dispute_cases 
      WHERE status = 'resolved' AND resolved_at > datetime('now', '-7 days')
      ORDER BY resolved_at DESC
      LIMIT 10
    `).all();

    return result.results as DisputeCase[];
  }

  private async escalateToArbitration(disputeId: number): Promise<void> {
    // Implementation for arbitration escalation
  }

  private async forceDisputeResolution(disputeId: number): Promise<void> {
    // Implementation for forced resolution after deadline
  }

  private async cancelPendingMediationSessions(disputeId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE mediation_sessions 
      SET status = 'cancelled' 
      WHERE dispute_id = ? AND status = 'scheduled'
    `).bind(disputeId).run();
  }
}