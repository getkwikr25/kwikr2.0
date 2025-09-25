import Stripe from 'stripe';

export interface Invoice {
  id: number;
  invoice_number: string;
  job_id?: number;
  client_id: number;
  worker_id: number;
  title: string;
  description?: string;
  invoice_type: 'standard' | 'milestone' | 'recurring' | 'estimate' | 'quote';
  status: 'draft' | 'pending' | 'sent' | 'viewed' | 'approved' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_method?: string;
  payment_terms: number;
  issue_date: string;
  due_date: string;
  sent_date?: string;
  viewed_date?: string;
  paid_date?: string;
  template_id: number;
  language: string;
  notes?: string;
  footer_text?: string;
  pdf_url?: string;
  payment_link?: string;
  payment_intent_id?: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  recurring_parent_id?: number;
  next_invoice_date?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_type: 'service' | 'product' | 'labor' | 'material' | 'expense' | 'discount' | 'tax';
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  service_category?: string;
  unit_of_measure: string;
  is_taxable: boolean;
  tax_rate: number;
  tax_amount: number;
  milestone_id?: number;
  sort_order: number;
  created_at: string;
}

export interface InvoiceTemplate {
  id: number;
  name: string;
  description?: string;
  template_type: 'standard' | 'professional' | 'modern' | 'minimal' | 'detailed';
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  layout_config: any;
  header_config?: any;
  footer_config?: any;
  language: string;
  is_active: boolean;
  is_default: boolean;
}

export interface TaxRate {
  id: number;
  province_code: string;
  province_name: string;
  gst_rate: number;
  pst_rate: number;
  hst_rate?: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
}

export interface InvoicePayment {
  id: number;
  invoice_id: number;
  payment_method: string;
  payment_amount: number;
  payment_date: string;
  payment_reference?: string;
  payment_intent_id?: string;
  charge_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  escrow_transaction_id?: number;
  notes?: string;
  processed_by?: number;
}

export class InvoiceService {
  private db: D1Database;
  private stripe: Stripe;

  constructor(db: D1Database, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    invoiceData: {
      job_id?: number;
      client_id: number;
      worker_id: number;
      title: string;
      description?: string;
      invoice_type?: Invoice['invoice_type'];
      payment_terms?: number;
      template_id?: number;
      language?: string;
      notes?: string;
      province_code?: string;
    },
    items: Partial<InvoiceItem>[]
  ): Promise<{ success: boolean; message: string; invoice?: Invoice }> {
    try {
      // Generate unique invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate dates
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + (invoiceData.payment_terms || 30));

      // Get tax rates for province
      const taxRates = await this.getTaxRates(invoiceData.province_code || 'ON');

      // Calculate totals
      const calculations = await this.calculateInvoiceTotals(items, taxRates);

      // Create invoice record
      const invoiceResult = await this.db.prepare(`
        INSERT INTO invoices (
          invoice_number, job_id, client_id, worker_id, title, description,
          invoice_type, status, subtotal, tax_rate, tax_amount, 
          total_amount, currency, payment_terms, issue_date, due_date,
          template_id, language, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, 'CAD', ?, ?, ?, ?, ?, ?)
      `).bind(
        invoiceNumber,
        invoiceData.job_id || null,
        invoiceData.client_id,
        invoiceData.worker_id,
        invoiceData.title,
        invoiceData.description || '',
        invoiceData.invoice_type || 'standard',
        calculations.subtotal,
        calculations.totalTaxRate,
        calculations.totalTaxAmount,
        calculations.total,
        invoiceData.payment_terms || 30,
        issueDate.toISOString().split('T')[0],
        dueDate.toISOString().split('T')[0],
        invoiceData.template_id || 1,
        invoiceData.language || 'en',
        invoiceData.notes || ''
      ).run();

      const invoiceId = invoiceResult.meta.last_row_id as number;

      // Create invoice items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lineTotal = (item.quantity || 1) * (item.unit_price || 0);
        const itemTaxRate = item.is_taxable !== false ? calculations.totalTaxRate : 0;
        const itemTaxAmount = lineTotal * itemTaxRate;

        await this.db.prepare(`
          INSERT INTO invoice_items (
            invoice_id, item_type, description, quantity, unit_price, line_total,
            service_category, unit_of_measure, is_taxable, tax_rate, tax_amount,
            milestone_id, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          invoiceId,
          item.item_type || 'service',
          item.description || '',
          item.quantity || 1,
          item.unit_price || 0,
          lineTotal,
          item.service_category || '',
          item.unit_of_measure || 'hours',
          item.is_taxable !== false ? 1 : 0,
          itemTaxRate,
          itemTaxAmount,
          item.milestone_id || null,
          i
        ).run();
      }

      // Log activity
      await this.logInvoiceActivity(
        invoiceId,
        'created',
        `Invoice ${invoiceNumber} created`,
        invoiceData.worker_id
      );

      // Get the created invoice
      const invoice = await this.getInvoiceById(invoiceId);

      return {
        success: true,
        message: 'Invoice created successfully',
        invoice
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create invoice: ${error.message}`
      };
    }
  }

  /**
   * Generate a unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get the count of invoices this month
    const count = await this.db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE invoice_number LIKE ?
    `).bind(`KW-${year}${month}-%`).first();

    const sequence = String((count?.count || 0) + 1).padStart(4, '0');
    return `KW-${year}${month}-${sequence}`;
  }

  /**
   * Calculate invoice totals including taxes
   */
  private async calculateInvoiceTotals(
    items: Partial<InvoiceItem>[],
    taxRates: TaxRate
  ): Promise<{
    subtotal: number;
    totalTaxRate: number;
    totalTaxAmount: number;
    total: number;
  }> {
    let subtotal = 0;

    // Calculate subtotal
    for (const item of items) {
      if (item.is_taxable !== false) {
        subtotal += (item.quantity || 1) * (item.unit_price || 0);
      }
    }

    // Calculate tax rate (HST takes precedence over GST+PST)
    const totalTaxRate = taxRates.hst_rate || (taxRates.gst_rate + taxRates.pst_rate);
    const totalTaxAmount = subtotal * totalTaxRate;
    const total = subtotal + totalTaxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTaxRate,
      totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Get tax rates for a province
   */
  private async getTaxRates(provinceCode: string): Promise<TaxRate> {
    const taxRate = await this.db.prepare(`
      SELECT * FROM tax_rates 
      WHERE province_code = ? AND is_active = 1
      ORDER BY effective_from DESC
      LIMIT 1
    `).bind(provinceCode.toUpperCase()).first();

    if (!taxRate) {
      // Default to Ontario HST if province not found
      return {
        id: 0,
        province_code: 'ON',
        province_name: 'Ontario',
        gst_rate: 0,
        pst_rate: 0,
        hst_rate: 0.13,
        effective_from: new Date().toISOString().split('T')[0],
        is_active: true
      };
    }

    return taxRate as TaxRate;
  }

  /**
   * Send invoice to client
   */
  async sendInvoice(
    invoiceId: number,
    senderId: number,
    options: {
      email_subject?: string;
      email_message?: string;
      send_copy_to_worker?: boolean;
      schedule_reminders?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string; payment_link?: string }> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      if (!['draft', 'pending'].includes(invoice.status)) {
        return { success: false, message: 'Invoice has already been sent' };
      }

      // Create Stripe payment link
      const paymentLink = await this.createStripePaymentLink(invoice);

      // Update invoice status and add payment link
      await this.db.prepare(`
        UPDATE invoices 
        SET status = 'sent', payment_link = ?, sent_date = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(paymentLink.url, invoiceId).run();

      // Schedule automatic reminders if requested
      if (options.schedule_reminders) {
        await this.scheduleInvoiceReminders(invoiceId);
      }

      // Log activity
      await this.logInvoiceActivity(
        invoiceId,
        'sent',
        `Invoice sent to client`,
        senderId
      );

      // Send email notification (would integrate with email service)
      await this.sendInvoiceEmail(invoice, paymentLink.url, options);

      return {
        success: true,
        message: 'Invoice sent successfully',
        payment_link: paymentLink.url
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to send invoice: ${error.message}`
      };
    }
  }

  /**
   * Create Stripe payment link for invoice
   */
  private async createStripePaymentLink(invoice: Invoice): Promise<any> {
    const paymentLink = await this.stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: invoice.title,
              description: invoice.description || undefined,
            },
            unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.FRONTEND_URL || 'https://kwikrdirectory.ca'}/invoice/${invoice.id}/success`
        }
      },
      metadata: {
        invoice_id: invoice.id.toString(),
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id.toString(),
        worker_id: invoice.worker_id.toString()
      }
    });

    return paymentLink;
  }

  /**
   * Process invoice payment
   */
  async processInvoicePayment(
    invoiceId: number,
    paymentData: {
      payment_method: string;
      payment_amount: number;
      payment_reference?: string;
      payment_intent_id?: string;
      charge_id?: string;
      notes?: string;
    },
    processedBy: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      // Create payment record
      await this.db.prepare(`
        INSERT INTO invoice_payments (
          invoice_id, payment_method, payment_amount, payment_date,
          payment_reference, payment_intent_id, charge_id, status, notes, processed_by
        ) VALUES (?, ?, ?, datetime('now'), ?, ?, ?, 'completed', ?, ?)
      `).bind(
        invoiceId,
        paymentData.payment_method,
        paymentData.payment_amount,
        paymentData.payment_reference || null,
        paymentData.payment_intent_id || null,
        paymentData.charge_id || null,
        paymentData.notes || null,
        processedBy
      ).run();

      // Check if invoice is fully paid
      const totalPaid = await this.getTotalPaidAmount(invoiceId);
      const fullyPaid = totalPaid >= invoice.total_amount;

      if (fullyPaid) {
        // Update invoice status to paid
        await this.db.prepare(`
          UPDATE invoices 
          SET status = 'paid', paid_date = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).bind(invoiceId).run();

        // Cancel any pending reminders
        await this.cancelInvoiceReminders(invoiceId);

        // Log activity
        await this.logInvoiceActivity(
          invoiceId,
          'paid',
          `Invoice fully paid - $${paymentData.payment_amount}`,
          processedBy
        );

        // Send payment confirmation
        await this.sendPaymentConfirmation(invoice, paymentData.payment_amount);
      } else {
        // Log partial payment
        await this.logInvoiceActivity(
          invoiceId,
          'partial_payment',
          `Partial payment received - $${paymentData.payment_amount}`,
          processedBy
        );
      }

      return {
        success: true,
        message: fullyPaid ? 'Invoice fully paid' : 'Partial payment recorded'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to process payment: ${error.message}`
      };
    }
  }

  /**
   * Get invoice by ID with items
   */
  async getInvoiceById(invoiceId: number): Promise<Invoice | null> {
    const invoice = await this.db.prepare(`
      SELECT * FROM invoices WHERE id = ?
    `).bind(invoiceId).first();

    return invoice as Invoice || null;
  }

  /**
   * Get invoice items
   */
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    const result = await this.db.prepare(`
      SELECT * FROM invoice_items 
      WHERE invoice_id = ? 
      ORDER BY sort_order ASC
    `).bind(invoiceId).all();

    return result.results as InvoiceItem[];
  }

  /**
   * Get invoices for a user (client or worker)
   */
  async getUserInvoices(
    userId: number,
    userType: 'client' | 'worker',
    filters: {
      status?: string;
      invoice_type?: string;
      from_date?: string;
      to_date?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ invoices: Invoice[]; total: number }> {
    let whereClause = userType === 'client' ? 'client_id = ?' : 'worker_id = ?';
    const params = [userId];

    if (filters.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.invoice_type) {
      whereClause += ' AND invoice_type = ?';
      params.push(filters.invoice_type);
    }

    if (filters.from_date) {
      whereClause += ' AND issue_date >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      whereClause += ' AND issue_date <= ?';
      params.push(filters.to_date);
    }

    // Get total count
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM invoices WHERE ${whereClause}
    `).bind(...params).first();

    // Get invoices with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const invoicesResult = await this.db.prepare(`
      SELECT i.*, 
             c.name as client_name, c.email as client_email,
             w.name as worker_name, w.email as worker_email
      FROM invoices i
      JOIN users c ON i.client_id = c.user_id
      JOIN users w ON i.worker_id = w.user_id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    return {
      invoices: invoicesResult.results as Invoice[],
      total: countResult?.total || 0
    };
  }

  /**
   * Get invoice dashboard data
   */
  async getInvoiceDashboard(userId: number, userType: 'client' | 'worker'): Promise<{
    summary: {
      total_invoices: number;
      total_amount: number;
      paid_amount: number;
      overdue_amount: number;
      pending_amount: number;
    };
    recent_invoices: Invoice[];
    overdue_invoices: Invoice[];
    status_breakdown: Record<string, number>;
  }> {
    const userField = userType === 'client' ? 'client_id' : 'worker_id';

    // Get summary statistics
    const summaryResult = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
        SUM(CASE WHEN status IN ('sent', 'viewed', 'approved') THEN total_amount ELSE 0 END) as pending_amount
      FROM invoices 
      WHERE ${userField} = ?
    `).bind(userId).first();

    // Get recent invoices
    const recentResult = await this.db.prepare(`
      SELECT * FROM invoices 
      WHERE ${userField} = ?
      ORDER BY created_at DESC 
      LIMIT 10
    `).bind(userId).all();

    // Get overdue invoices
    const overdueResult = await this.db.prepare(`
      SELECT * FROM invoices 
      WHERE ${userField} = ? AND due_date < DATE('now') AND status NOT IN ('paid', 'cancelled')
      ORDER BY due_date ASC
    `).bind(userId).all();

    // Get status breakdown
    const statusResult = await this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM invoices 
      WHERE ${userField} = ?
      GROUP BY status
    `).bind(userId).all();

    const statusBreakdown: Record<string, number> = {};
    for (const row of statusResult.results) {
      statusBreakdown[row.status] = row.count;
    }

    return {
      summary: {
        total_invoices: summaryResult?.total_invoices || 0,
        total_amount: summaryResult?.total_amount || 0,
        paid_amount: summaryResult?.paid_amount || 0,
        overdue_amount: summaryResult?.overdue_amount || 0,
        pending_amount: summaryResult?.pending_amount || 0
      },
      recent_invoices: recentResult.results as Invoice[],
      overdue_invoices: overdueResult.results as Invoice[],
      status_breakdown: statusBreakdown
    };
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: number,
    newStatus: Invoice['status'],
    updatedBy: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      const oldStatus = invoice.status;

      // Update status
      await this.db.prepare(`
        UPDATE invoices 
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, invoiceId).run();

      // Log activity
      await this.logInvoiceActivity(
        invoiceId,
        'status_changed',
        `Status changed from ${oldStatus} to ${newStatus}${reason ? ': ' + reason : ''}`,
        updatedBy,
        { old_status: oldStatus, new_status: newStatus }
      );

      // Handle status-specific actions
      if (newStatus === 'cancelled') {
        await this.cancelInvoiceReminders(invoiceId);
      }

      return {
        success: true,
        message: 'Invoice status updated successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update invoice status: ${error.message}`
      };
    }
  }

  // Helper methods

  private async getTotalPaidAmount(invoiceId: number): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COALESCE(SUM(payment_amount), 0) as total
      FROM invoice_payments 
      WHERE invoice_id = ? AND status = 'completed'
    `).bind(invoiceId).first();

    return result?.total || 0;
  }

  private async logInvoiceActivity(
    invoiceId: number,
    action: string,
    description: string,
    userId: number,
    metadata?: any
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO invoice_activity_log (
        invoice_id, action, description, user_id, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      invoiceId,
      action,
      description,
      userId,
      metadata ? JSON.stringify(metadata) : null
    ).run();
  }

  private async scheduleInvoiceReminders(invoiceId: number): Promise<void> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) return;

    const dueDate = new Date(invoice.due_date);
    
    // Schedule reminder 7 days before due date
    const reminder1 = new Date(dueDate);
    reminder1.setDate(reminder1.getDate() - 7);

    // Schedule reminder 1 day before due date
    const reminder2 = new Date(dueDate);
    reminder2.setDate(reminder2.getDate() - 1);

    // Schedule overdue reminder 3 days after due date
    const reminder3 = new Date(dueDate);
    reminder3.setDate(reminder3.getDate() + 3);

    const reminders = [
      { date: reminder1, type: 'due_soon', subject: 'Invoice Due in 7 Days' },
      { date: reminder2, type: 'due_soon', subject: 'Invoice Due Tomorrow' },
      { date: reminder3, type: 'overdue', subject: 'Overdue Invoice Reminder' }
    ];

    for (const reminder of reminders) {
      if (reminder.date > new Date()) { // Only schedule future reminders
        await this.db.prepare(`
          INSERT INTO invoice_reminders (
            invoice_id, reminder_type, scheduled_date, subject, message, status
          ) VALUES (?, ?, ?, ?, ?, 'scheduled')
        `).bind(
          invoiceId,
          reminder.type,
          reminder.date.toISOString(),
          reminder.subject,
          `Your invoice ${invoice.invoice_number} is ${reminder.type === 'overdue' ? 'overdue' : 'due soon'}.`
        ).run();
      }
    }
  }

  private async cancelInvoiceReminders(invoiceId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE invoice_reminders 
      SET status = 'cancelled'
      WHERE invoice_id = ? AND status = 'scheduled'
    `).bind(invoiceId).run();
  }

  private async sendInvoiceEmail(invoice: Invoice, paymentLink: string, options: any): Promise<void> {
    // Implementation would integrate with email service (SendGrid, etc.)
    console.log(`Sending invoice ${invoice.invoice_number} to client with payment link: ${paymentLink}`);
  }

  private async sendPaymentConfirmation(invoice: Invoice, amount: number): Promise<void> {
    // Implementation would send payment confirmation email
    console.log(`Payment confirmation for invoice ${invoice.invoice_number}: $${amount}`);
  }
}