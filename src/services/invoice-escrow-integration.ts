import { InvoiceService, Invoice } from './invoice.js';
import { EscrowService } from './escrow.js';
import { EscrowMilestoneService } from './escrow-milestones.js';
import Stripe from 'stripe';

export interface InvoiceEscrowLink {
  invoice_id: number;
  escrow_transaction_id: number;
  milestone_id?: number;
  link_type: 'full_payment' | 'milestone_payment' | 'advance_payment';
  amount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export class InvoiceEscrowIntegrationService {
  private db: D1Database;
  private stripe: Stripe;
  private invoiceService: InvoiceService;
  private escrowService: EscrowService;
  private milestoneService: EscrowMilestoneService;

  constructor(db: D1Database, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
    this.invoiceService = new InvoiceService(db, stripe);
    this.escrowService = new EscrowService(stripe, db);
    this.milestoneService = new EscrowMilestoneService(db, stripe);
  }

  /**
   * Create invoice from milestone and link to escrow
   */
  async createInvoiceFromMilestone(
    milestoneId: number,
    workerId: number,
    additionalData?: {
      title?: string;
      description?: string;
      notes?: string;
      due_days?: number;
    }
  ): Promise<{ success: boolean; message: string; invoice_id?: number }> {
    try {
      // Get milestone details
      const milestone = await this.db.prepare(`
        SELECT jm.*, j.client_id, j.job_id, j.title as job_title
        FROM job_milestones jm
        JOIN jobs j ON jm.job_id = j.job_id
        WHERE jm.id = ? AND j.worker_id = ?
      `).bind(milestoneId, workerId).first();

      if (!milestone) {
        return { success: false, message: 'Milestone not found or access denied' };
      }

      if (milestone.status !== 'in_progress') {
        return { success: false, message: 'Milestone must be in progress to create invoice' };
      }

      // Create invoice data
      const invoiceData = {
        job_id: milestone.job_id,
        client_id: milestone.client_id,
        worker_id: workerId,
        title: additionalData?.title || `${milestone.title} - ${milestone.job_title}`,
        description: additionalData?.description || milestone.description,
        invoice_type: 'milestone' as const,
        payment_terms: additionalData?.due_days || 30,
        notes: additionalData?.notes
      };

      // Create invoice items
      const items = [{
        item_type: 'service' as const,
        description: milestone.title,
        quantity: 1,
        unit_price: milestone.amount,
        milestone_id: milestoneId,
        is_taxable: true
      }];

      // Create invoice
      const createResult = await this.invoiceService.createInvoice(invoiceData, items);
      
      if (!createResult.success || !createResult.invoice) {
        return { success: false, message: createResult.message };
      }

      // Link invoice to milestone
      await this.db.prepare(`
        UPDATE job_milestones 
        SET invoice_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(createResult.invoice.id, milestoneId).run();

      return {
        success: true,
        message: 'Invoice created from milestone successfully',
        invoice_id: createResult.invoice.id
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create invoice from milestone: ${error.message}`
      };
    }
  }

  /**
   * Process invoice payment and create escrow transaction
   */
  async processInvoicePaymentWithEscrow(
    invoiceId: number,
    paymentMethodId: string,
    clientId: number,
    options: {
      hold_in_escrow?: boolean;
      auto_release_conditions?: string[];
      escrow_deadline_days?: number;
    } = {}
  ): Promise<{ success: boolean; message: string; escrow_transaction_id?: number; payment_intent_id?: string }> {
    try {
      const invoice = await this.invoiceService.getInvoiceById(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      if (invoice.client_id !== clientId) {
        return { success: false, message: 'Not authorized to pay this invoice' };
      }

      if (invoice.status === 'paid') {
        return { success: false, message: 'Invoice is already paid' };
      }

      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(invoice.total_amount * 100), // Convert to cents
        currency: invoice.currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: false,
        capture_method: options.hold_in_escrow ? 'manual' : 'automatic',
        metadata: {
          invoice_id: invoiceId.toString(),
          invoice_number: invoice.invoice_number,
          client_id: clientId.toString(),
          worker_id: invoice.worker_id.toString(),
          type: 'invoice_payment'
        }
      });

      let escrowTransactionId: number | undefined;

      // Create escrow transaction if requested
      if (options.hold_in_escrow) {
        const escrowResult = await this.escrowService.createEscrowTransaction(
          invoice.job_id || 0,
          clientId,
          invoice.worker_id,
          invoice.total_amount,
          paymentIntent.id
        );

        escrowTransactionId = escrowResult.id;

        // Link invoice to escrow
        await this.db.prepare(`
          INSERT INTO invoice_escrow_links (
            invoice_id, escrow_transaction_id, link_type, amount, status, created_at
          ) VALUES (?, ?, 'full_payment', ?, 'active', datetime('now'))
        `).bind(invoiceId, escrowTransactionId, invoice.total_amount).run();

        // Set escrow deadline if specified
        if (options.escrow_deadline_days) {
          const deadlineDate = new Date();
          deadlineDate.setDate(deadlineDate.getDate() + options.escrow_deadline_days);

          await this.db.prepare(`
            INSERT INTO escrow_deadlines (
              transaction_id, deadline_type, deadline_at, status, created_at
            ) VALUES (?, 'custom', ?, 'pending', datetime('now'))
          `).bind(escrowTransactionId, deadlineDate.toISOString()).run();
        }
      }

      // Update invoice with payment intent
      await this.db.prepare(`
        UPDATE invoices 
        SET payment_intent_id = ?, status = 'processing', updated_at = datetime('now')
        WHERE id = ?
      `).bind(paymentIntent.id, invoiceId).run();

      // Log invoice activity
      await this.db.prepare(`
        INSERT INTO invoice_activity_log (
          invoice_id, action, description, user_id, created_at
        ) VALUES (?, 'payment_initiated', ?, ?, datetime('now'))
      `).bind(
        invoiceId,
        options.hold_in_escrow 
          ? `Payment initiated with escrow protection (${paymentIntent.id})`
          : `Payment initiated (${paymentIntent.id})`,
        clientId
      ).run();

      return {
        success: true,
        message: options.hold_in_escrow 
          ? 'Payment initiated with escrow protection'
          : 'Payment initiated successfully',
        escrow_transaction_id: escrowTransactionId,
        payment_intent_id: paymentIntent.id
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to process invoice payment: ${error.message}`
      };
    }
  }

  /**
   * Release escrow when invoice is approved/completed
   */
  async releaseEscrowOnInvoiceCompletion(
    invoiceId: number,
    approvedBy: number,
    reason = 'Invoice work completed and approved'
  ): Promise<{ success: boolean; message: string; escrow_released?: boolean }> {
    try {
      // Get linked escrow transaction
      const escrowLink = await this.db.prepare(`
        SELECT iel.*, et.status as escrow_status
        FROM invoice_escrow_links iel
        JOIN escrow_transactions et ON iel.escrow_transaction_id = et.id
        WHERE iel.invoice_id = ? AND iel.status = 'active'
      `).bind(invoiceId).first();

      if (!escrowLink) {
        // No escrow linked, just mark invoice as paid
        await this.invoiceService.updateInvoiceStatus(invoiceId, 'paid', approvedBy, reason);
        return { success: true, message: 'Invoice completed (no escrow)', escrow_released: false };
      }

      if (escrowLink.escrow_status !== 'held') {
        return { success: false, message: 'Escrow is not in held status' };
      }

      // Release escrow
      const releaseResult = await this.escrowService.releaseEscrow(
        escrowLink.escrow_transaction_id,
        approvedBy,
        reason
      );

      if (!releaseResult.success) {
        return { success: false, message: `Failed to release escrow: ${releaseResult.message}` };
      }

      // Update invoice status
      await this.invoiceService.updateInvoiceStatus(invoiceId, 'paid', approvedBy, reason);

      // Update escrow link status
      await this.db.prepare(`
        UPDATE invoice_escrow_links 
        SET status = 'completed'
        WHERE invoice_id = ? AND escrow_transaction_id = ?
      `).bind(invoiceId, escrowLink.escrow_transaction_id).run();

      return {
        success: true,
        message: 'Invoice completed and escrow released successfully',
        escrow_released: true
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to release escrow: ${error.message}`
      };
    }
  }

  /**
   * Handle invoice disputes with escrow protection
   */
  async handleInvoiceDispute(
    invoiceId: number,
    disputeData: {
      dispute_type: string;
      reason: string;
      evidence?: string[];
    },
    initiatedBy: number
  ): Promise<{ success: boolean; message: string; dispute_id?: number; escrow_disputed?: boolean }> {
    try {
      const invoice = await this.invoiceService.getInvoiceById(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      // Check if invoice has linked escrow
      const escrowLink = await this.db.prepare(`
        SELECT iel.*, et.status as escrow_status
        FROM invoice_escrow_links iel
        JOIN escrow_transactions et ON iel.escrow_transaction_id = et.id
        WHERE iel.invoice_id = ? AND iel.status = 'active'
      `).bind(invoiceId).first();

      let escrowDisputed = false;
      let disputeId: number | undefined;

      // If escrow is linked, create escrow dispute
      if (escrowLink && escrowLink.escrow_status === 'held') {
        // Import the EscrowDisputeService
        const { EscrowDisputeService } = await import('./escrow-disputes.js');
        const disputeService = new EscrowDisputeService(this.db);

        const escrowDisputeResult = await disputeService.fileDispute(
          escrowLink.escrow_transaction_id,
          initiatedBy,
          {
            disputeType: disputeData.dispute_type as any,
            title: `Invoice Dispute - ${invoice.invoice_number}`,
            description: disputeData.reason,
            amountDisputed: invoice.total_amount,
            evidence: disputeData.evidence?.map(url => ({ type: 'document', description: 'Evidence', fileUrl: url }))
          }
        );

        if (escrowDisputeResult.success) {
          disputeId = escrowDisputeResult.disputeId;
          escrowDisputed = true;
        }
      }

      // Update invoice status to disputed
      await this.invoiceService.updateInvoiceStatus(
        invoiceId, 
        'disputed', 
        initiatedBy, 
        `Dispute filed: ${disputeData.reason}`
      );

      // Create invoice-specific dispute record
      await this.db.prepare(`
        INSERT INTO invoice_disputes (
          invoice_id, escrow_dispute_id, initiated_by, dispute_type, reason, 
          evidence, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'open', datetime('now'))
      `).bind(
        invoiceId,
        disputeId || null,
        initiatedBy,
        disputeData.dispute_type,
        disputeData.reason,
        JSON.stringify(disputeData.evidence || [])
      ).run();

      return {
        success: true,
        message: escrowDisputed 
          ? 'Invoice dispute filed with escrow protection'
          : 'Invoice dispute filed',
        dispute_id: disputeId,
        escrow_disputed
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to handle invoice dispute: ${error.message}`
      };
    }
  }

  /**
   * Get invoice-escrow integration status
   */
  async getInvoiceEscrowStatus(invoiceId: number): Promise<{
    invoice: Invoice;
    escrow_linked: boolean;
    escrow_transaction?: any;
    escrow_status?: string;
    escrow_timeline?: any[];
    milestones_linked?: any[];
  }> {
    const invoice = await this.invoiceService.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Check escrow link
    const escrowLink = await this.db.prepare(`
      SELECT iel.*, et.*
      FROM invoice_escrow_links iel
      JOIN escrow_transactions et ON iel.escrow_transaction_id = et.id
      WHERE iel.invoice_id = ?
      ORDER BY iel.created_at DESC
      LIMIT 1
    `).bind(invoiceId).first();

    let escrowTimeline: any[] = [];
    if (escrowLink) {
      const timelineResult = await this.db.prepare(`
        SELECT * FROM escrow_timeline 
        WHERE transaction_id = ?
        ORDER BY created_at ASC
      `).bind(escrowLink.escrow_transaction_id).all();
      
      escrowTimeline = timelineResult.results;
    }

    // Get linked milestones
    const milestonesResult = await this.db.prepare(`
      SELECT jm.*, ii.description as invoice_item_description
      FROM job_milestones jm
      LEFT JOIN invoice_items ii ON jm.id = ii.milestone_id
      WHERE ii.invoice_id = ?
    `).bind(invoiceId).all();

    return {
      invoice,
      escrow_linked: !!escrowLink,
      escrow_transaction: escrowLink,
      escrow_status: escrowLink?.status,
      escrow_timeline: escrowTimeline,
      milestones_linked: milestonesResult.results
    };
  }

  /**
   * Synchronize invoice and escrow statuses
   */
  async synchronizeInvoiceEscrowStatuses(): Promise<{
    synchronized: number;
    errors: Array<{ invoice_id: number; error: string }>;
  }> {
    console.log('Synchronizing invoice-escrow statuses...');

    const results = { synchronized: 0, errors: [] };

    // Get all active invoice-escrow links
    const links = await this.db.prepare(`
      SELECT iel.*, i.status as invoice_status, et.status as escrow_status
      FROM invoice_escrow_links iel
      JOIN invoices i ON iel.invoice_id = i.id
      JOIN escrow_transactions et ON iel.escrow_transaction_id = et.id
      WHERE iel.status = 'active'
    `).all();

    for (const link of links.results as any[]) {
      try {
        let updateRequired = false;

        // Sync based on escrow status changes
        if (link.escrow_status === 'released' && link.invoice_status !== 'paid') {
          await this.invoiceService.updateInvoiceStatus(
            link.invoice_id,
            'paid',
            0,
            'Automatic sync: Escrow released'
          );
          updateRequired = true;
        }

        if (link.escrow_status === 'refunded' && link.invoice_status !== 'cancelled') {
          await this.invoiceService.updateInvoiceStatus(
            link.invoice_id,
            'cancelled',
            0,
            'Automatic sync: Escrow refunded'
          );
          updateRequired = true;
        }

        if (link.escrow_status === 'disputed' && link.invoice_status !== 'disputed') {
          await this.invoiceService.updateInvoiceStatus(
            link.invoice_id,
            'disputed',
            0,
            'Automatic sync: Escrow disputed'
          );
          updateRequired = true;
        }

        if (updateRequired) {
          results.synchronized++;
        }

      } catch (error) {
        results.errors.push({
          invoice_id: link.invoice_id,
          error: error.message
        });
      }
    }

    console.log(`Synchronization complete: ${results.synchronized} synchronized, ${results.errors.length} errors`);
    return results;
  }

  /**
   * Get integration analytics
   */
  async getIntegrationAnalytics(): Promise<{
    total_linked_invoices: number;
    escrow_protected_amount: number;
    successful_releases: number;
    disputed_cases: number;
    integration_rate: number;
  }> {
    const result = await this.db.prepare(`
      SELECT 
        COUNT(DISTINCT iel.invoice_id) as total_linked_invoices,
        SUM(iel.amount) as escrow_protected_amount,
        SUM(CASE WHEN et.status = 'released' THEN 1 ELSE 0 END) as successful_releases,
        SUM(CASE WHEN et.status = 'disputed' THEN 1 ELSE 0 END) as disputed_cases
      FROM invoice_escrow_links iel
      JOIN escrow_transactions et ON iel.escrow_transaction_id = et.id
      WHERE iel.created_at > datetime('now', '-90 days')
    `).first();

    const totalInvoices = await this.db.prepare(`
      SELECT COUNT(*) as total
      FROM invoices 
      WHERE created_at > datetime('now', '-90 days')
    `).first();

    const integrationRate = totalInvoices?.total > 0 
      ? (result?.total_linked_invoices || 0) / totalInvoices.total * 100 
      : 0;

    return {
      total_linked_invoices: result?.total_linked_invoices || 0,
      escrow_protected_amount: result?.escrow_protected_amount || 0,
      successful_releases: result?.successful_releases || 0,
      disputed_cases: result?.disputed_cases || 0,
      integration_rate: Math.round(integrationRate * 100) / 100
    };
  }
}