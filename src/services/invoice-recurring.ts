import { Invoice, InvoiceItem, InvoiceService } from './invoice.js';
import Stripe from 'stripe';

export interface RecurringInvoiceSchedule {
  id: number;
  template_invoice_id: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  interval_count: number;
  start_date: string;
  end_date?: string;
  generate_days_before: number;
  max_invoices?: number;
  next_generation_date: string;
  invoices_generated: number;
  is_active: boolean;
  last_generated_date?: string;
  last_invoice_id?: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentLinkConfig {
  invoice_id: number;
  stripe_link_id: string;
  stripe_link_url: string;
  expires_at?: string;
  allow_promotion_codes: boolean;
  custom_text?: string;
  metadata?: any;
  created_at: string;
}

export class InvoiceRecurringService {
  private db: D1Database;
  private stripe: Stripe;
  private invoiceService: InvoiceService;

  constructor(db: D1Database, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
    this.invoiceService = new InvoiceService(db, stripe);
  }

  /**
   * Create a recurring invoice schedule
   */
  async createRecurringSchedule(
    templateInvoiceId: number,
    scheduleConfig: {
      frequency: RecurringInvoiceSchedule['frequency'];
      interval_count?: number;
      start_date: string;
      end_date?: string;
      generate_days_before?: number;
      max_invoices?: number;
    }
  ): Promise<{ success: boolean; message: string; schedule_id?: number }> {
    try {
      // Verify template invoice exists
      const templateInvoice = await this.invoiceService.getInvoiceById(templateInvoiceId);
      if (!templateInvoice) {
        return { success: false, message: 'Template invoice not found' };
      }

      // Calculate next generation date
      const startDate = new Date(scheduleConfig.start_date);
      const nextGenerationDate = this.calculateNextGenerationDate(
        startDate,
        scheduleConfig.frequency,
        scheduleConfig.interval_count || 1,
        scheduleConfig.generate_days_before || 0
      );

      // Create schedule record
      const result = await this.db.prepare(`
        INSERT INTO recurring_invoice_schedules (
          template_invoice_id, frequency, interval_count, start_date, end_date,
          generate_days_before, max_invoices, next_generation_date, 
          invoices_generated, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'), datetime('now'))
      `).bind(
        templateInvoiceId,
        scheduleConfig.frequency,
        scheduleConfig.interval_count || 1,
        scheduleConfig.start_date,
        scheduleConfig.end_date || null,
        scheduleConfig.generate_days_before || 0,
        scheduleConfig.max_invoices || null,
        nextGenerationDate.toISOString()
      ).run();

      const scheduleId = result.meta.last_row_id as number;

      // Mark template invoice as recurring
      await this.db.prepare(`
        UPDATE invoices 
        SET is_recurring = 1, updated_at = datetime('now')
        WHERE id = ?
      `).bind(templateInvoiceId).run();

      return {
        success: true,
        message: 'Recurring schedule created successfully',
        schedule_id: scheduleId
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create recurring schedule: ${error.message}`
      };
    }
  }

  /**
   * Process all due recurring invoices
   */
  async processRecurringInvoices(): Promise<{
    processed: number;
    failed: number;
    details: Array<{ schedule_id: number; success: boolean; message: string; invoice_id?: number }>
  }> {
    console.log('Processing recurring invoices...');

    const results = { processed: 0, failed: 0, details: [] };

    // Get all schedules due for generation
    const dueSchedules = await this.db.prepare(`
      SELECT * FROM recurring_invoice_schedules 
      WHERE is_active = 1 
        AND next_generation_date <= datetime('now')
        AND (end_date IS NULL OR end_date >= date('now'))
        AND (max_invoices IS NULL OR invoices_generated < max_invoices)
    `).all();

    for (const schedule of dueSchedules.results as RecurringInvoiceSchedule[]) {
      try {
        const result = await this.generateRecurringInvoice(schedule);
        
        if (result.success) {
          results.processed++;
          results.details.push({
            schedule_id: schedule.id,
            success: true,
            message: result.message,
            invoice_id: result.invoice_id
          });
        } else {
          results.failed++;
          results.details.push({
            schedule_id: schedule.id,
            success: false,
            message: result.message
          });
        }

      } catch (error) {
        results.failed++;
        results.details.push({
          schedule_id: schedule.id,
          success: false,
          message: `Error processing schedule: ${error.message}`
        });
      }
    }

    console.log(`Recurring invoice processing complete: ${results.processed} processed, ${results.failed} failed`);
    return results;
  }

  /**
   * Generate a single recurring invoice
   */
  private async generateRecurringInvoice(schedule: RecurringInvoiceSchedule): Promise<{
    success: boolean;
    message: string;
    invoice_id?: number;
  }> {
    try {
      // Get template invoice with items
      const templateInvoice = await this.invoiceService.getInvoiceById(schedule.template_invoice_id);
      const templateItems = await this.invoiceService.getInvoiceItems(schedule.template_invoice_id);

      if (!templateInvoice) {
        return { success: false, message: 'Template invoice not found' };
      }

      // Calculate dates for new invoice
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + templateInvoice.payment_terms);

      // Create new invoice based on template
      const newInvoiceData = {
        job_id: templateInvoice.job_id,
        client_id: templateInvoice.client_id,
        worker_id: templateInvoice.worker_id,
        title: templateInvoice.title,
        description: this.updateRecurringDescription(templateInvoice.description, issueDate),
        invoice_type: 'recurring' as const,
        payment_terms: templateInvoice.payment_terms,
        template_id: templateInvoice.template_id,
        language: templateInvoice.language,
        notes: templateInvoice.notes
      };

      // Prepare items for new invoice
      const newItems = templateItems.map(item => ({
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        service_category: item.service_category,
        unit_of_measure: item.unit_of_measure,
        is_taxable: item.is_taxable,
        milestone_id: item.milestone_id
      }));

      // Create the invoice
      const createResult = await this.invoiceService.createInvoice(newInvoiceData, newItems);
      
      if (!createResult.success || !createResult.invoice) {
        return { success: false, message: createResult.message };
      }

      const newInvoiceId = createResult.invoice.id;

      // Update the new invoice to link it to recurring parent
      await this.db.prepare(`
        UPDATE invoices 
        SET recurring_parent_id = ?, is_recurring = 0, updated_at = datetime('now')
        WHERE id = ?
      `).bind(schedule.template_invoice_id, newInvoiceId).run();

      // Update schedule for next generation
      await this.updateScheduleForNextGeneration(schedule, newInvoiceId);

      // Auto-send if template was configured to do so
      if (templateInvoice.status === 'sent') {
        await this.invoiceService.sendInvoice(newInvoiceId, templateInvoice.worker_id, {
          schedule_reminders: true
        });
      }

      return {
        success: true,
        message: `Recurring invoice generated successfully`,
        invoice_id: newInvoiceId
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to generate recurring invoice: ${error.message}`
      };
    }
  }

  /**
   * Update schedule for next generation
   */
  private async updateScheduleForNextGeneration(
    schedule: RecurringInvoiceSchedule,
    newInvoiceId: number
  ): Promise<void> {
    const currentDate = new Date(schedule.next_generation_date);
    const nextGenerationDate = this.calculateNextGenerationDate(
      currentDate,
      schedule.frequency,
      schedule.interval_count,
      schedule.generate_days_before
    );

    const invoicesGenerated = schedule.invoices_generated + 1;

    // Check if schedule should be deactivated
    const shouldDeactivate = 
      (schedule.max_invoices && invoicesGenerated >= schedule.max_invoices) ||
      (schedule.end_date && nextGenerationDate > new Date(schedule.end_date));

    await this.db.prepare(`
      UPDATE recurring_invoice_schedules 
      SET next_generation_date = ?, 
          invoices_generated = ?,
          last_generated_date = datetime('now'),
          last_invoice_id = ?,
          is_active = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      nextGenerationDate.toISOString(),
      invoicesGenerated,
      newInvoiceId,
      shouldDeactivate ? 0 : 1,
      schedule.id
    ).run();
  }

  /**
   * Calculate next generation date
   */
  private calculateNextGenerationDate(
    baseDate: Date,
    frequency: string,
    intervalCount: number,
    daysBefore: number
  ): Date {
    const nextDate = new Date(baseDate);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * intervalCount));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + intervalCount);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + (3 * intervalCount));
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
        break;
    }

    // Subtract days before generation
    nextDate.setDate(nextDate.getDate() - daysBefore);

    return nextDate;
  }

  /**
   * Update description for recurring invoices
   */
  private updateRecurringDescription(originalDescription: string | null, issueDate: Date): string {
    const monthYear = issueDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'long' });
    const baseDescription = originalDescription || '';
    
    if (baseDescription.includes('{{period}}')) {
      return baseDescription.replace('{{period}}', monthYear);
    }
    
    return baseDescription ? `${baseDescription} - ${monthYear}` : `Services for ${monthYear}`;
  }

  /**
   * Create enhanced Stripe payment link with advanced features
   */
  async createAdvancedPaymentLink(
    invoiceId: number,
    options: {
      allow_promotion_codes?: boolean;
      custom_text?: string;
      expires_hours?: number;
      restrict_to_country?: string;
      collect_shipping_address?: boolean;
      collect_tax_id?: boolean;
    } = {}
  ): Promise<{ success: boolean; message: string; payment_link?: string; stripe_link_id?: string }> {
    try {
      const invoice = await this.invoiceService.getInvoiceById(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      // Create Stripe payment link with advanced options
      const expiresAt = options.expires_hours 
        ? Math.floor((Date.now() + (options.expires_hours * 60 * 60 * 1000)) / 1000)
        : undefined;

      const paymentLinkData: any = {
        line_items: [
          {
            price_data: {
              currency: invoice.currency.toLowerCase(),
              product_data: {
                name: invoice.title,
                description: invoice.description || undefined,
                metadata: {
                  invoice_id: invoiceId.toString(),
                  invoice_number: invoice.invoice_number
                }
              },
              unit_amount: Math.round(invoice.total_amount * 100),
            },
            quantity: 1,
          },
        ],
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${process.env.FRONTEND_URL || 'https://kwikrdirectory.ca'}/invoice/${invoiceId}/success`
          }
        },
        allow_promotion_codes: options.allow_promotion_codes || false,
        metadata: {
          invoice_id: invoiceId.toString(),
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id.toString(),
          worker_id: invoice.worker_id.toString(),
          created_via: 'kwikr_invoice_system'
        }
      };

      // Add optional features
      if (expiresAt) {
        paymentLinkData.expires_at = expiresAt;
      }

      if (options.custom_text) {
        paymentLinkData.custom_text = {
          submit: { message: options.custom_text }
        };
      }

      if (options.collect_shipping_address) {
        paymentLinkData.shipping_address_collection = {
          allowed_countries: options.restrict_to_country ? [options.restrict_to_country] : ['CA']
        };
      }

      if (options.collect_tax_id) {
        paymentLinkData.tax_id_collection = { enabled: true };
      }

      // Create the payment link
      const stripeLink = await this.stripe.paymentLinks.create(paymentLinkData);

      // Store payment link configuration
      await this.db.prepare(`
        INSERT INTO invoice_payment_links (
          invoice_id, stripe_link_id, stripe_link_url, expires_at,
          allow_promotion_codes, custom_text, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        invoiceId,
        stripeLink.id,
        stripeLink.url,
        expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
        options.allow_promotion_codes ? 1 : 0,
        options.custom_text || null,
        JSON.stringify(options)
      ).run();

      // Update invoice with payment link
      await this.db.prepare(`
        UPDATE invoices 
        SET payment_link = ?, payment_intent_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(stripeLink.url, stripeLink.id, invoiceId).run();

      return {
        success: true,
        message: 'Payment link created successfully',
        payment_link: stripeLink.url,
        stripe_link_id: stripeLink.id
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create payment link: ${error.message}`
      };
    }
  }

  /**
   * Get recurring schedule details
   */
  async getRecurringSchedule(scheduleId: number): Promise<RecurringInvoiceSchedule | null> {
    const result = await this.db.prepare(`
      SELECT * FROM recurring_invoice_schedules WHERE id = ?
    `).bind(scheduleId).first();

    return result as RecurringInvoiceSchedule || null;
  }

  /**
   * Get all recurring schedules for a user
   */
  async getUserRecurringSchedules(
    userId: number,
    userType: 'client' | 'worker'
  ): Promise<Array<RecurringInvoiceSchedule & { template_invoice: Invoice }>> {
    const userField = userType === 'client' ? 'client_id' : 'worker_id';

    const result = await this.db.prepare(`
      SELECT rs.*, i.* as template_invoice
      FROM recurring_invoice_schedules rs
      JOIN invoices i ON rs.template_invoice_id = i.id
      WHERE i.${userField} = ?
      ORDER BY rs.created_at DESC
    `).bind(userId).all();

    return result.results as Array<RecurringInvoiceSchedule & { template_invoice: Invoice }>;
  }

  /**
   * Update recurring schedule
   */
  async updateRecurringSchedule(
    scheduleId: number,
    updates: {
      frequency?: RecurringInvoiceSchedule['frequency'];
      interval_count?: number;
      end_date?: string;
      max_invoices?: number;
      is_active?: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const schedule = await this.getRecurringSchedule(scheduleId);
      if (!schedule) {
        return { success: false, message: 'Schedule not found' };
      }

      const updateFields = [];
      const updateValues = [];

      if (updates.frequency) {
        updateFields.push('frequency = ?');
        updateValues.push(updates.frequency);
      }

      if (updates.interval_count !== undefined) {
        updateFields.push('interval_count = ?');
        updateValues.push(updates.interval_count);
      }

      if (updates.end_date !== undefined) {
        updateFields.push('end_date = ?');
        updateValues.push(updates.end_date);
      }

      if (updates.max_invoices !== undefined) {
        updateFields.push('max_invoices = ?');
        updateValues.push(updates.max_invoices);
      }

      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updates.is_active ? 1 : 0);
      }

      if (updateFields.length === 0) {
        return { success: false, message: 'No updates provided' };
      }

      updateFields.push('updated_at = datetime(\'now\')');
      updateValues.push(scheduleId);

      await this.db.prepare(`
        UPDATE recurring_invoice_schedules 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `).bind(...updateValues).run();

      return { success: true, message: 'Schedule updated successfully' };

    } catch (error) {
      return { success: false, message: `Failed to update schedule: ${error.message}` };
    }
  }

  /**
   * Pause/Resume recurring schedule
   */
  async pauseRecurringSchedule(scheduleId: number, pause: boolean): Promise<{ success: boolean; message: string }> {
    return this.updateRecurringSchedule(scheduleId, { is_active: !pause });
  }

  /**
   * Get recurring invoice history
   */
  async getRecurringInvoiceHistory(scheduleId: number): Promise<Invoice[]> {
    const result = await this.db.prepare(`
      SELECT i.* FROM invoices i
      WHERE i.recurring_parent_id = (
        SELECT template_invoice_id FROM recurring_invoice_schedules WHERE id = ?
      )
      ORDER BY i.created_at DESC
    `).bind(scheduleId).all();

    return result.results as Invoice[];
  }
}