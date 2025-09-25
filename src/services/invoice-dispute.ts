import Stripe from 'stripe'

export interface InvoiceDispute {
  id: number;
  invoice_id: number;
  escrow_dispute_id?: number;
  stripe_dispute_id?: string;
  initiated_by: number;
  client_id: number;
  worker_id: number;
  dispute_type: 'payment_method' | 'service_quality' | 'billing_error' | 'fraud' | 'non_delivery' | 'duplicate_charge' | 'unauthorized' | 'other';
  dispute_category: 'chargeback' | 'refund_request' | 'billing_dispute' | 'service_dispute' | 'fraud_claim';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  reason: string;
  description?: string;
  amount_disputed: number;
  currency: string;
  status: 'open' | 'investigating' | 'awaiting_response' | 'under_review' | 'mediation' | 'arbitration' | 'resolved' | 'closed' | 'escalated';
  resolution_type?: 'full_refund' | 'partial_refund' | 'chargeback_reversal' | 'billing_correction' | 'service_credit' | 'no_action' | 'split_decision';
  resolution_amount?: number;
  resolution_notes?: string;
  assigned_to?: number;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  resolved_at?: string;
  closed_at?: string;
  metadata?: string;
  internal_notes?: string;
}

export interface DisputeEvidence {
  id: number;
  dispute_id: number;
  submitted_by: number;
  evidence_type: 'document' | 'image' | 'video' | 'invoice_copy' | 'receipt' | 'communication' | 'work_proof' | 'contract' | 'other';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  title: string;
  description?: string;
  is_verified: boolean;
  verified_by?: number;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: string;
}

export interface DisputeMessage {
  id: number;
  dispute_id: number;
  sender_id: number;
  recipient_id?: number;
  message_type: 'message' | 'system_update' | 'status_change' | 'resolution_offer' | 'evidence_submission' | 'deadline_notice';
  subject?: string;
  content: string;
  is_internal: boolean;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: string;
}

export interface CreateDisputeData {
  invoice_id: number;
  dispute_type: string;
  dispute_category: string;
  title: string;
  reason: string;
  description?: string;
  amount_disputed?: number; // Optional, will default to invoice total
  priority?: string;
  evidence?: Array<{
    type: string;
    file_url?: string;
    title: string;
    description?: string;
  }>;
}

export interface ResolutionData {
  resolution_type: string;
  resolution_amount?: number;
  resolution_notes: string;
  notify_parties?: boolean;
}

export class InvoiceDisputeService {
  constructor(private db: D1Database, private stripe: Stripe) {}

  /**
   * Create a new invoice dispute
   */
  async createDispute(disputeData: CreateDisputeData, initiatedBy: number): Promise<{ success: boolean; message: string; dispute_id?: number; dispute?: InvoiceDispute }> {
    try {
      // Get invoice details
      const invoice = await this.db.prepare(`
        SELECT * FROM invoices WHERE id = ?
      `).bind(disputeData.invoice_id).first();

      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      // Check if dispute already exists for this invoice
      const existingDispute = await this.db.prepare(`
        SELECT id FROM invoice_disputes 
        WHERE invoice_id = ? AND status NOT IN ('resolved', 'closed')
      `).bind(disputeData.invoice_id).first();

      if (existingDispute) {
        return { success: false, message: 'An active dispute already exists for this invoice' };
      }

      // Determine dispute amount
      const disputeAmount = disputeData.amount_disputed || invoice.total_amount;

      // Set due date based on dispute type
      const dueDate = new Date();
      if (disputeData.dispute_type === 'payment_method') {
        dueDate.setDate(dueDate.getDate() + 7); // 7 days for payment disputes
      } else {
        dueDate.setDate(dueDate.getDate() + 3); // 3 days for other disputes
      }

      // Create the dispute
      const disputeResult = await this.db.prepare(`
        INSERT INTO invoice_disputes (
          invoice_id, initiated_by, client_id, worker_id,
          dispute_type, dispute_category, priority, title, reason, description,
          amount_disputed, currency, status, due_date,
          created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, datetime('now'), datetime('now'), ?)
      `).bind(
        disputeData.invoice_id,
        initiatedBy,
        invoice.client_id,
        invoice.worker_id,
        disputeData.dispute_type,
        disputeData.dispute_category,
        disputeData.priority || 'medium',
        disputeData.title,
        disputeData.reason,
        disputeData.description || null,
        disputeAmount,
        invoice.currency,
        dueDate.toISOString(),
        JSON.stringify({ created_by_user_type: initiatedBy === invoice.client_id ? 'client' : 'worker' })
      ).run();

      const disputeId = disputeResult.meta.last_row_id as number;

      // Add evidence if provided
      if (disputeData.evidence && disputeData.evidence.length > 0) {
        for (const evidence of disputeData.evidence) {
          await this.addEvidence(disputeId, initiatedBy, {
            evidence_type: evidence.type as any,
            file_url: evidence.file_url,
            title: evidence.title,
            description: evidence.description
          });
        }
      }

      // Update invoice status to disputed
      await this.db.prepare(`
        UPDATE invoices SET status = 'disputed', updated_at = datetime('now')
        WHERE id = ?
      `).bind(disputeData.invoice_id).run();

      // Add timeline entry
      await this.addTimelineEntry(disputeId, initiatedBy, 'created', '', 'open', `Dispute created: ${disputeData.title}`);

      // Add initial system message
      await this.addMessage(disputeId, 0, null, { // 0 = system user
        message_type: 'system_update',
        subject: 'Dispute Created',
        content: `A new dispute has been filed for invoice ${invoice.invoice_number}. Our team will review and respond within the specified timeframe.`,
        is_internal: false
      });

      // Get the created dispute
      const newDispute = await this.getDisputeById(disputeId);

      return {
        success: true,
        message: 'Dispute created successfully',
        dispute_id: disputeId,
        dispute: newDispute?.dispute
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create dispute: ${error.message}`
      };
    }
  }

  /**
   * Get dispute by ID with full details
   */
  async getDisputeById(disputeId: number): Promise<{ success: boolean; message: string; dispute?: InvoiceDispute; evidence?: DisputeEvidence[]; messages?: DisputeMessage[] }> {
    try {
      // Get main dispute
      const dispute = await this.db.prepare(`
        SELECT * FROM invoice_disputes WHERE id = ?
      `).bind(disputeId).first() as InvoiceDispute;

      if (!dispute) {
        return { success: false, message: 'Dispute not found' };
      }

      // Get evidence
      const evidenceResult = await this.db.prepare(`
        SELECT * FROM invoice_dispute_evidence 
        WHERE dispute_id = ? 
        ORDER BY created_at DESC
      `).bind(disputeId).all();

      // Get messages (non-internal only for regular users)
      const messagesResult = await this.db.prepare(`
        SELECT * FROM invoice_dispute_messages 
        WHERE dispute_id = ? AND is_internal = FALSE
        ORDER BY created_at ASC
      `).bind(disputeId).all();

      return {
        success: true,
        message: 'Dispute retrieved successfully',
        dispute,
        evidence: evidenceResult.results as DisputeEvidence[],
        messages: messagesResult.results as DisputeMessage[]
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to get dispute: ${error.message}`
      };
    }
  }

  /**
   * List disputes with filtering
   */
  async listDisputes(filters: {
    user_id?: number;
    status?: string;
    dispute_type?: string;
    priority?: string;
    assigned_to?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ success: boolean; disputes: InvoiceDispute[]; total: number }> {
    try {
      let query = `
        SELECT id.*, i.invoice_number, i.total_amount as invoice_total,
               uc.first_name as client_first_name, uc.last_name as client_last_name,
               uw.first_name as worker_first_name, uw.last_name as worker_last_name
        FROM invoice_disputes id
        JOIN invoices i ON id.invoice_id = i.id
        JOIN users uc ON id.client_id = uc.id
        JOIN users uw ON id.worker_id = uw.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filters.user_id) {
        query += ` AND (id.client_id = ? OR id.worker_id = ?)`;
        params.push(filters.user_id, filters.user_id);
      }
      
      if (filters.status) {
        query += ` AND id.status = ?`;
        params.push(filters.status);
      }
      
      if (filters.dispute_type) {
        query += ` AND id.dispute_type = ?`;
        params.push(filters.dispute_type);
      }
      
      if (filters.priority) {
        query += ` AND id.priority = ?`;
        params.push(filters.priority);
      }
      
      if (filters.assigned_to) {
        query += ` AND id.assigned_to = ?`;
        params.push(filters.assigned_to);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await this.db.prepare(countQuery).bind(...params).first();
      const total = countResult?.total || 0;

      // Add ordering and pagination
      query += ` ORDER BY id.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(filters.limit);
        
        if (filters.offset) {
          query += ` OFFSET ?`;
          params.push(filters.offset);
        }
      }

      const result = await this.db.prepare(query).bind(...params).all();

      return {
        success: true,
        disputes: result.results as InvoiceDispute[],
        total
      };

    } catch (error) {
      return {
        success: false,
        disputes: [],
        total: 0
      };
    }
  }

  /**
   * Update dispute status
   */
  async updateDisputeStatus(
    disputeId: number, 
    newStatus: string, 
    updatedBy: number, 
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get current dispute
      const dispute = await this.db.prepare(`
        SELECT * FROM invoice_disputes WHERE id = ?
      `).bind(disputeId).first();

      if (!dispute) {
        return { success: false, message: 'Dispute not found' };
      }

      const oldStatus = dispute.status;

      // Update status
      await this.db.prepare(`
        UPDATE invoice_disputes 
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, disputeId).run();

      // Add timeline entry
      await this.addTimelineEntry(
        disputeId, 
        updatedBy, 
        'status_changed', 
        oldStatus, 
        newStatus,
        notes || `Status changed from ${oldStatus} to ${newStatus}`
      );

      // Add system message
      await this.addMessage(disputeId, 0, null, {
        message_type: 'status_change',
        subject: 'Dispute Status Updated',
        content: `Dispute status has been updated to: ${newStatus}${notes ? '\n\nNotes: ' + notes : ''}`,
        is_internal: false
      });

      // Update invoice status if dispute is resolved/closed
      if (newStatus === 'resolved' || newStatus === 'closed') {
        await this.db.prepare(`
          UPDATE invoices SET status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(newStatus === 'resolved' ? 'paid' : 'cancelled', dispute.invoice_id).run();

        // Set resolved/closed timestamp
        const timestampField = newStatus === 'resolved' ? 'resolved_at' : 'closed_at';
        await this.db.prepare(`
          UPDATE invoice_disputes 
          SET ${timestampField} = datetime('now')
          WHERE id = ?
        `).bind(disputeId).run();
      }

      return {
        success: true,
        message: `Dispute status updated to ${newStatus}`
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update status: ${error.message}`
      };
    }
  }

  /**
   * Add evidence to dispute
   */
  async addEvidence(
    disputeId: number, 
    submittedBy: number, 
    evidenceData: {
      evidence_type: string;
      file_url?: string;
      file_name?: string;
      title: string;
      description?: string;
    }
  ): Promise<{ success: boolean; message: string; evidence_id?: number }> {
    try {
      const result = await this.db.prepare(`
        INSERT INTO invoice_dispute_evidence (
          dispute_id, submitted_by, evidence_type, file_url, file_name,
          title, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        disputeId,
        submittedBy,
        evidenceData.evidence_type,
        evidenceData.file_url || null,
        evidenceData.file_name || null,
        evidenceData.title,
        evidenceData.description || null
      ).run();

      const evidenceId = result.meta.last_row_id as number;

      // Add timeline entry
      await this.addTimelineEntry(
        disputeId, 
        submittedBy, 
        'evidence_added', 
        '', 
        evidenceData.evidence_type,
        `Evidence added: ${evidenceData.title}`
      );

      return {
        success: true,
        message: 'Evidence added successfully',
        evidence_id: evidenceId
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to add evidence: ${error.message}`
      };
    }
  }

  /**
   * Add message to dispute
   */
  async addMessage(
    disputeId: number,
    senderId: number,
    recipientId: number | null,
    messageData: {
      message_type?: string;
      subject?: string;
      content: string;
      is_internal?: boolean;
    }
  ): Promise<{ success: boolean; message: string; message_id?: number }> {
    try {
      const result = await this.db.prepare(`
        INSERT INTO invoice_dispute_messages (
          dispute_id, sender_id, recipient_id, message_type, subject, content,
          is_internal, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        disputeId,
        senderId,
        recipientId,
        messageData.message_type || 'message',
        messageData.subject || null,
        messageData.content,
        messageData.is_internal || false
      ).run();

      const messageId = result.meta.last_row_id as number;

      // Add timeline entry if not internal
      if (!messageData.is_internal) {
        await this.addTimelineEntry(
          disputeId,
          senderId,
          'message_sent',
          '',
          messageData.message_type || 'message',
          `Message sent: ${messageData.subject || 'New message'}`
        );
      }

      return {
        success: true,
        message: 'Message added successfully',
        message_id: messageId
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to add message: ${error.message}`
      };
    }
  }

  /**
   * Resolve dispute with specific resolution
   */
  async resolveDispute(
    disputeId: number,
    resolutionData: ResolutionData,
    resolvedBy: number
  ): Promise<{ success: boolean; message: string; processed_refund?: boolean }> {
    try {
      // Get dispute and invoice details
      const dispute = await this.db.prepare(`
        SELECT id.*, i.payment_intent_id, i.invoice_number
        FROM invoice_disputes id
        JOIN invoices i ON id.invoice_id = i.id
        WHERE id.id = ?
      `).bind(disputeId).first();

      if (!dispute) {
        return { success: false, message: 'Dispute not found' };
      }

      let processedRefund = false;

      // Process refund if applicable
      if (resolutionData.resolution_type === 'full_refund' || resolutionData.resolution_type === 'partial_refund') {
        const refundAmount = resolutionData.resolution_type === 'full_refund' 
          ? dispute.amount_disputed 
          : (resolutionData.resolution_amount || 0);

        if (dispute.payment_intent_id && refundAmount > 0) {
          try {
            // Process Stripe refund
            const refund = await this.stripe.refunds.create({
              payment_intent: dispute.payment_intent_id,
              amount: Math.round(refundAmount * 100), // Convert to cents
              reason: 'requested_by_customer',
              metadata: {
                dispute_id: disputeId.toString(),
                invoice_number: dispute.invoice_number,
                resolution_type: resolutionData.resolution_type
              }
            });

            processedRefund = true;

            // Add refund details to resolution notes
            resolutionData.resolution_notes += `\n\nRefund processed: $${refundAmount.toFixed(2)} (Stripe Refund ID: ${refund.id})`;

          } catch (stripeError) {
            return { 
              success: false, 
              message: `Failed to process refund: ${stripeError.message}` 
            };
          }
        }
      }

      // Update dispute with resolution
      await this.db.prepare(`
        UPDATE invoice_disputes 
        SET status = 'resolved', 
            resolution_type = ?, 
            resolution_amount = ?, 
            resolution_notes = ?,
            resolved_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        resolutionData.resolution_type,
        resolutionData.resolution_amount || null,
        resolutionData.resolution_notes,
        disputeId
      ).run();

      // Update invoice status
      await this.db.prepare(`
        UPDATE invoices SET status = 'paid', updated_at = datetime('now')
        WHERE id = ?
      `).bind(dispute.invoice_id).run();

      // Add timeline entry
      await this.addTimelineEntry(
        disputeId,
        resolvedBy,
        'resolved',
        dispute.status,
        'resolved',
        `Dispute resolved: ${resolutionData.resolution_type} - ${resolutionData.resolution_notes}`
      );

      // Add resolution message
      if (resolutionData.notify_parties !== false) {
        await this.addMessage(disputeId, resolvedBy, null, {
          message_type: 'resolution_offer',
          subject: 'Dispute Resolved',
          content: `This dispute has been resolved with the following outcome:\n\nResolution: ${resolutionData.resolution_type}\n\nDetails: ${resolutionData.resolution_notes}`,
          is_internal: false
        });
      }

      return {
        success: true,
        message: 'Dispute resolved successfully',
        processed_refund: processedRefund
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to resolve dispute: ${error.message}`
      };
    }
  }

  /**
   * Handle Stripe dispute webhook
   */
  async handleStripeDispute(stripeDispute: any): Promise<{ success: boolean; message: string; dispute_id?: number }> {
    try {
      // Find the invoice by payment intent
      const invoice = await this.db.prepare(`
        SELECT * FROM invoices WHERE payment_intent_id = ?
      `).bind(stripeDispute.payment_intent).first();

      if (!invoice) {
        return { success: false, message: 'Invoice not found for Stripe dispute' };
      }

      // Check if we already have a dispute for this Stripe dispute
      const existingMapping = await this.db.prepare(`
        SELECT * FROM stripe_dispute_mappings WHERE stripe_dispute_id = ?
      `).bind(stripeDispute.id).first();

      if (existingMapping) {
        return { success: false, message: 'Stripe dispute already processed' };
      }

      // Create invoice dispute
      const disputeResult = await this.createDispute({
        invoice_id: invoice.id,
        dispute_type: 'payment_method',
        dispute_category: 'chargeback',
        title: `Payment Dispute - ${invoice.invoice_number}`,
        reason: `Stripe chargeback: ${stripeDispute.reason}`,
        description: `Automatic dispute created from Stripe chargeback. Reason: ${stripeDispute.reason}`,
        amount_disputed: stripeDispute.amount / 100, // Convert from cents
        priority: 'high'
      }, 0); // System user creates

      if (!disputeResult.success) {
        return disputeResult;
      }

      const disputeId = disputeResult.dispute_id!;

      // Create Stripe mapping
      await this.db.prepare(`
        INSERT INTO stripe_dispute_mappings (
          invoice_dispute_id, stripe_dispute_id, stripe_charge_id, 
          stripe_payment_intent_id, stripe_status, stripe_reason,
          stripe_amount, stripe_currency, evidence_due_by,
          created_at, updated_at, stripe_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
      `).bind(
        disputeId,
        stripeDispute.id,
        stripeDispute.charge,
        stripeDispute.payment_intent,
        stripeDispute.status,
        stripeDispute.reason,
        stripeDispute.amount,
        stripeDispute.currency,
        new Date(stripeDispute.evidence_details.due_by * 1000).toISOString(),
        JSON.stringify(stripeDispute)
      ).run();

      return {
        success: true,
        message: 'Stripe dispute processed successfully',
        dispute_id: disputeId
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to handle Stripe dispute: ${error.message}`
      };
    }
  }

  /**
   * Add timeline entry
   */
  private async addTimelineEntry(
    disputeId: number,
    userId: number | null,
    actionType: string,
    oldValue: string,
    newValue: string,
    description: string
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO invoice_dispute_timeline (
        dispute_id, user_id, action_type, old_value, new_value, 
        description, is_system_action, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      disputeId,
      userId || null,
      actionType,
      oldValue,
      newValue,
      description,
      userId === 0 || userId === null
    ).run();
  }

  /**
   * Get dispute analytics
   */
  async getDisputeAnalytics(filters: {
    start_date?: string;
    end_date?: string;
    dispute_type?: string;
  } = {}): Promise<{ success: boolean; analytics: any }> {
    try {
      let dateFilter = '';
      const params: any[] = [];

      if (filters.start_date) {
        dateFilter += ` AND created_at >= ?`;
        params.push(filters.start_date);
      }
      if (filters.end_date) {
        dateFilter += ` AND created_at <= ?`;
        params.push(filters.end_date);
      }
      if (filters.dispute_type) {
        dateFilter += ` AND dispute_type = ?`;
        params.push(filters.dispute_type);
      }

      // Get basic statistics
      const stats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_disputes,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_disputes,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_disputes,
          COUNT(CASE WHEN resolution_type = 'full_refund' THEN 1 END) as full_refunds,
          COUNT(CASE WHEN resolution_type = 'partial_refund' THEN 1 END) as partial_refunds,
          AVG(amount_disputed) as avg_dispute_amount,
          SUM(CASE WHEN resolution_type IN ('full_refund', 'partial_refund') THEN COALESCE(resolution_amount, amount_disputed) ELSE 0 END) as total_refunded
        FROM invoice_disputes 
        WHERE 1=1 ${dateFilter}
      `).bind(...params).first();

      // Get disputes by type
      const byType = await this.db.prepare(`
        SELECT dispute_type, COUNT(*) as count
        FROM invoice_disputes 
        WHERE 1=1 ${dateFilter}
        GROUP BY dispute_type
        ORDER BY count DESC
      `).bind(...params).all();

      // Get resolution rates by type
      const resolutionRates = await this.db.prepare(`
        SELECT 
          dispute_type,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          ROUND(COUNT(CASE WHEN status = 'resolved' THEN 1 END) * 100.0 / COUNT(*), 2) as resolution_rate
        FROM invoice_disputes 
        WHERE 1=1 ${dateFilter}
        GROUP BY dispute_type
      `).bind(...params).all();

      return {
        success: true,
        analytics: {
          statistics: stats,
          by_type: byType.results,
          resolution_rates: resolutionRates.results
        }
      };

    } catch (error) {
      return {
        success: false,
        analytics: null
      };
    }
  }
}