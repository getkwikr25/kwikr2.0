import { Invoice, InvoiceItem, InvoiceTemplate } from './invoice.js';

export interface PDFGenerationOptions {
  template_id?: number;
  language?: string;
  include_payment_stub?: boolean;
  watermark?: string;
  custom_footer?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  phone?: string;
  email?: string;
  website?: string;
  gst_number?: string;
  logo_url?: string;
}

export class InvoicePDFService {
  private db: D1Database;
  private defaultCompanyInfo: CompanyInfo = {
    name: 'Kwikr Directory Inc.',
    address: '123 Business Street',
    city: 'Toronto',
    province: 'ON',
    postal_code: 'M5V 3A8',
    phone: '1-800-KWIKR-CA',
    email: 'billing@kwikrdirectory.ca',
    website: 'www.kwikrdirectory.ca',
    gst_number: '123456789RT0001'
  };

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Generate PDF for an invoice
   */
  async generateInvoicePDF(
    invoiceId: number,
    options: PDFGenerationOptions = {}
  ): Promise<{ success: boolean; message: string; pdf_url?: string; pdf_content?: string }> {
    try {
      // Get invoice data
      const invoice = await this.getInvoiceWithItems(invoiceId);
      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      // Get template
      const template = await this.getTemplate(options.template_id || invoice.template_id);
      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      // Get client and worker information
      const [client, worker] = await Promise.all([
        this.getUserInfo(invoice.client_id),
        this.getUserInfo(invoice.worker_id)
      ]);

      // Generate HTML content
      const htmlContent = await this.generateHTMLContent(invoice, invoice.items, template, client, worker, options);

      // For Cloudflare Workers environment, we'll return the HTML content
      // In a production environment, you would use a PDF generation service
      // like Puppeteer, PDFKit, or an external API
      const pdfContent = await this.convertHTMLToPDF(htmlContent);

      // Store PDF URL (would upload to R2 or similar in production)
      const pdfUrl = await this.storePDF(invoiceId, pdfContent);

      // Update invoice with PDF URL
      await this.db.prepare(`
        UPDATE invoices SET pdf_url = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(pdfUrl, invoiceId).run();

      return {
        success: true,
        message: 'PDF generated successfully',
        pdf_url: pdfUrl,
        pdf_content: pdfContent
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to generate PDF: ${error.message}`
      };
    }
  }

  /**
   * Generate HTML content for the invoice
   */
  private async generateHTMLContent(
    invoice: Invoice,
    items: InvoiceItem[],
    template: InvoiceTemplate,
    client: any,
    worker: any,
    options: PDFGenerationOptions
  ): Promise<string> {
    const companyInfo = this.defaultCompanyInfo;
    const language = options.language || invoice.language || 'en';
    const isEnglish = language === 'en';

    // Calculate payment terms text
    const paymentTermsText = isEnglish 
      ? `Payment due within ${invoice.payment_terms} days`
      : `Paiement dû dans les ${invoice.payment_terms} jours`;

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat(isEnglish ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: invoice.currency
      }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(isEnglish ? 'en-CA' : 'fr-CA').format(date);
    };

    const html = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isEnglish ? 'Invoice' : 'Facture'} ${invoice.invoice_number}</title>
        <style>
          ${this.getTemplateCSS(template)}
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="invoice-header">
            <div class="company-info">
              ${companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" alt="Company Logo" class="company-logo">` : ''}
              <div class="company-details">
                <h1 class="company-name">${companyInfo.name}</h1>
                <div class="company-address">
                  ${companyInfo.address}<br>
                  ${companyInfo.city}, ${companyInfo.province} ${companyInfo.postal_code}<br>
                  ${companyInfo.phone ? `${isEnglish ? 'Phone' : 'Téléphone'}: ${companyInfo.phone}<br>` : ''}
                  ${companyInfo.email ? `${isEnglish ? 'Email' : 'Courriel'}: ${companyInfo.email}<br>` : ''}
                  ${companyInfo.website ? `${isEnglish ? 'Website' : 'Site web'}: ${companyInfo.website}<br>` : ''}
                  ${companyInfo.gst_number ? `${isEnglish ? 'GST/HST #' : 'TPS/TVH #'}: ${companyInfo.gst_number}` : ''}
                </div>
              </div>
            </div>
            
            <div class="invoice-info">
              <h2 class="invoice-title">${isEnglish ? 'INVOICE' : 'FACTURE'}</h2>
              <div class="invoice-details">
                <div class="detail-row">
                  <span class="label">${isEnglish ? 'Invoice #:' : 'Facture #:'}</span>
                  <span class="value">${invoice.invoice_number}</span>
                </div>
                <div class="detail-row">
                  <span class="label">${isEnglish ? 'Issue Date:' : 'Date d\'émission:'}</span>
                  <span class="value">${formatDate(invoice.issue_date)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">${isEnglish ? 'Due Date:' : 'Date d\'échéance:'}</span>
                  <span class="value">${formatDate(invoice.due_date)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">${isEnglish ? 'Payment Terms:' : 'Conditions de paiement:'}</span>
                  <span class="value">${paymentTermsText}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Billing Information -->
          <div class="billing-section">
            <div class="bill-to">
              <h3>${isEnglish ? 'Bill To:' : 'Facturer à:'}</h3>
              <div class="client-info">
                <strong>${client.name}</strong><br>
                ${client.email}<br>
                ${client.phone ? client.phone + '<br>' : ''}
                ${client.address ? client.address + '<br>' : ''}
                ${client.city && client.province ? `${client.city}, ${client.province}` : ''}
                ${client.postal_code ? client.postal_code : ''}
              </div>
            </div>
            
            <div class="service-provider">
              <h3>${isEnglish ? 'Service Provider:' : 'Fournisseur de services:'}</h3>
              <div class="worker-info">
                <strong>${worker.name}</strong><br>
                ${worker.email}<br>
                ${worker.phone ? worker.phone + '<br>' : ''}
                ${worker.business_name ? worker.business_name + '<br>' : ''}
                ${worker.gst_number ? `${isEnglish ? 'GST/HST #' : 'TPS/TVH #'}: ${worker.gst_number}` : ''}
              </div>
            </div>
          </div>

          <!-- Invoice Title and Description -->
          ${invoice.title || invoice.description ? `
          <div class="invoice-description">
            ${invoice.title ? `<h3 class="invoice-title-text">${invoice.title}</h3>` : ''}
            ${invoice.description ? `<p class="invoice-description-text">${invoice.description}</p>` : ''}
          </div>
          ` : ''}

          <!-- Items Table -->
          <div class="items-section">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="desc-col">${isEnglish ? 'Description' : 'Description'}</th>
                  <th class="qty-col">${isEnglish ? 'Qty' : 'Qté'}</th>
                  <th class="unit-col">${isEnglish ? 'Unit' : 'Unité'}</th>
                  <th class="rate-col">${isEnglish ? 'Rate' : 'Tarif'}</th>
                  <th class="amount-col">${isEnglish ? 'Amount' : 'Montant'}</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr class="item-row">
                    <td class="item-description">
                      ${item.description}
                      ${item.service_category ? `<br><small>(${item.service_category})</small>` : ''}
                    </td>
                    <td class="item-quantity">${item.quantity}</td>
                    <td class="item-unit">${item.unit_of_measure}</td>
                    <td class="item-rate">${formatCurrency(item.unit_price)}</td>
                    <td class="item-amount">${formatCurrency(item.line_total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-table">
              <div class="total-row subtotal-row">
                <span class="total-label">${isEnglish ? 'Subtotal:' : 'Sous-total:'}</span>
                <span class="total-value">${formatCurrency(invoice.subtotal)}</span>
              </div>
              
              ${invoice.discount_amount > 0 ? `
              <div class="total-row discount-row">
                <span class="total-label">${isEnglish ? 'Discount:' : 'Remise:'}</span>
                <span class="total-value">-${formatCurrency(invoice.discount_amount)}</span>
              </div>
              ` : ''}
              
              ${invoice.tax_amount > 0 ? `
              <div class="total-row tax-row">
                <span class="total-label">${isEnglish ? 'Tax' : 'Taxe'} (${(invoice.tax_rate * 100).toFixed(2)}%):</span>
                <span class="total-value">${formatCurrency(invoice.tax_amount)}</span>
              </div>
              ` : ''}
              
              <div class="total-row grand-total-row">
                <span class="total-label">${isEnglish ? 'Total:' : 'Total:'}</span>
                <span class="total-value">${formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          <!-- Payment Information -->
          <div class="payment-section">
            <h3>${isEnglish ? 'Payment Information' : 'Information de paiement'}</h3>
            <div class="payment-info">
              <p><strong>${isEnglish ? 'Amount Due:' : 'Montant dû:'}</strong> ${formatCurrency(invoice.total_amount)}</p>
              <p><strong>${isEnglish ? 'Due Date:' : 'Date d\'échéance:'}</strong> ${formatDate(invoice.due_date)}</p>
              ${invoice.payment_link ? `
              <p><strong>${isEnglish ? 'Pay Online:' : 'Payer en ligne:'}</strong> 
                <a href="${invoice.payment_link}" class="payment-link">${isEnglish ? 'Click here to pay' : 'Cliquez ici pour payer'}</a>
              </p>
              ` : ''}
            </div>
          </div>

          <!-- Notes Section -->
          ${invoice.notes ? `
          <div class="notes-section">
            <h3>${isEnglish ? 'Notes' : 'Notes'}</h3>
            <p class="notes-text">${invoice.notes}</p>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="invoice-footer">
            ${options.custom_footer || template.footer_config || `
            <p class="footer-text">
              ${isEnglish 
                ? 'Thank you for choosing Kwikr Directory. For questions about this invoice, please contact us.'
                : 'Merci d\'avoir choisi Kwikr Directory. Pour toute question concernant cette facture, veuillez nous contacter.'
              }
            </p>
            `}
            ${options.watermark ? `<div class="watermark">${options.watermark}</div>` : ''}
          </div>

          <!-- Payment Stub (if requested) -->
          ${options.include_payment_stub ? this.generatePaymentStub(invoice, isEnglish) : ''}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Get CSS styles for the template
   */
  private getTemplateCSS(template: InvoiceTemplate): string {
    const primaryColor = template.primary_color || '#00C881';
    const secondaryColor = template.secondary_color || '#1a1a1a';
    const fontFamily = template.font_family || 'Arial, sans-serif';

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: ${fontFamily};
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        background: white;
      }

      .invoice-container {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 40px;
        background: white;
      }

      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 20px;
      }

      .company-info {
        display: flex;
        align-items: flex-start;
        gap: 20px;
      }

      .company-logo {
        max-width: 120px;
        max-height: 80px;
        object-fit: contain;
      }

      .company-name {
        font-size: 24px;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 10px;
      }

      .company-address {
        font-size: 11px;
        line-height: 1.3;
        color: #666;
      }

      .invoice-info {
        text-align: right;
        min-width: 200px;
      }

      .invoice-title {
        font-size: 32px;
        font-weight: bold;
        color: ${secondaryColor};
        margin-bottom: 15px;
      }

      .invoice-details .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        gap: 20px;
      }

      .detail-row .label {
        font-weight: bold;
        color: #666;
      }

      .detail-row .value {
        color: #333;
      }

      .billing-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
        gap: 40px;
      }

      .bill-to, .service-provider {
        flex: 1;
      }

      .bill-to h3, .service-provider h3 {
        font-size: 14px;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 10px;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
      }

      .client-info, .worker-info {
        font-size: 11px;
        line-height: 1.4;
      }

      .invoice-description {
        margin-bottom: 25px;
        padding: 15px;
        background: #f9f9f9;
        border-left: 4px solid ${primaryColor};
      }

      .invoice-title-text {
        font-size: 16px;
        font-weight: bold;
        color: ${secondaryColor};
        margin-bottom: 8px;
      }

      .invoice-description-text {
        font-size: 12px;
        color: #666;
        line-height: 1.4;
      }

      .items-section {
        margin-bottom: 30px;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }

      .items-table thead th {
        background: ${primaryColor};
        color: white;
        padding: 12px 8px;
        text-align: left;
        font-weight: bold;
        font-size: 11px;
      }

      .items-table tbody td {
        padding: 10px 8px;
        border-bottom: 1px solid #eee;
        vertical-align: top;
      }

      .item-row:hover {
        background: #f9f9f9;
      }

      .desc-col { width: 45%; }
      .qty-col { width: 10%; text-align: center; }
      .unit-col { width: 10%; text-align: center; }
      .rate-col { width: 15%; text-align: right; }
      .amount-col { width: 20%; text-align: right; }

      .item-quantity, .item-unit, .item-rate, .item-amount {
        text-align: right;
      }

      .item-description small {
        color: #888;
        font-style: italic;
      }

      .totals-section {
        margin-bottom: 30px;
        display: flex;
        justify-content: flex-end;
      }

      .totals-table {
        min-width: 300px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }

      .subtotal-row, .discount-row, .tax-row {
        font-size: 12px;
      }

      .grand-total-row {
        background: ${primaryColor};
        color: white;
        padding: 12px 15px;
        font-weight: bold;
        font-size: 14px;
        border-bottom: none;
      }

      .total-label {
        font-weight: 500;
      }

      .total-value {
        font-weight: bold;
      }

      .payment-section {
        margin-bottom: 25px;
        padding: 20px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 5px;
      }

      .payment-section h3 {
        color: ${primaryColor};
        margin-bottom: 15px;
        font-size: 14px;
      }

      .payment-info p {
        margin-bottom: 8px;
        font-size: 12px;
      }

      .payment-link {
        color: ${primaryColor};
        text-decoration: none;
        font-weight: bold;
      }

      .payment-link:hover {
        text-decoration: underline;
      }

      .notes-section {
        margin-bottom: 30px;
        padding: 15px;
        background: #fffef7;
        border: 1px solid #f0f0f0;
      }

      .notes-section h3 {
        color: ${secondaryColor};
        margin-bottom: 10px;
        font-size: 14px;
      }

      .notes-text {
        font-size: 11px;
        line-height: 1.4;
        color: #555;
      }

      .invoice-footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        position: relative;
      }

      .footer-text {
        font-size: 10px;
        color: #888;
        line-height: 1.3;
      }

      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 48px;
        color: rgba(0, 0, 0, 0.1);
        font-weight: bold;
        z-index: -1;
      }

      /* Print styles */
      @media print {
        .invoice-container {
          padding: 20px;
        }
        
        .payment-link {
          color: #333 !important;
        }
      }

      /* Payment stub styles */
      .payment-stub {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px dashed #ccc;
      }

      .stub-header {
        text-align: center;
        font-weight: bold;
        margin-bottom: 20px;
        color: ${primaryColor};
      }

      .stub-content {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
      }
    `;
  }

  /**
   * Generate payment stub section
   */
  private generatePaymentStub(invoice: Invoice, isEnglish: boolean): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat(isEnglish ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: invoice.currency
      }).format(amount);
    };

    return `
      <div class="payment-stub">
        <div class="stub-header">
          ${isEnglish ? 'PAYMENT STUB - PLEASE DETACH AND RETURN WITH PAYMENT' : 'TALON DE PAIEMENT - VEUILLEZ DÉTACHER ET RETOURNER AVEC LE PAIEMENT'}
        </div>
        <div class="stub-content">
          <div class="stub-left">
            <strong>${isEnglish ? 'Invoice #:' : 'Facture #:'}</strong> ${invoice.invoice_number}<br>
            <strong>${isEnglish ? 'Due Date:' : 'Date d\'échéance:'}</strong> ${invoice.due_date}<br>
            <strong>${isEnglish ? 'Amount Due:' : 'Montant dû:'}</strong> ${formatCurrency(invoice.total_amount)}
          </div>
          <div class="stub-right">
            <strong>${isEnglish ? 'Remit Payment To:' : 'Envoyer le paiement à:'}</strong><br>
            ${this.defaultCompanyInfo.name}<br>
            ${this.defaultCompanyInfo.address}<br>
            ${this.defaultCompanyInfo.city}, ${this.defaultCompanyInfo.province} ${this.defaultCompanyInfo.postal_code}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Convert HTML to PDF (simplified for Cloudflare Workers)
   */
  private async convertHTMLToPDF(htmlContent: string): Promise<string> {
    // In a Cloudflare Workers environment, we would typically use:
    // 1. An external PDF generation service API
    // 2. Puppeteer-in-Docker via HTTP API
    // 3. A specialized PDF service like PDFShift, Html/CSS to PDF API, etc.
    
    // For now, return the HTML content as base64 (placeholder)
    // In production, integrate with a real PDF service
    return Buffer.from(htmlContent).toString('base64');
  }

  /**
   * Store PDF in cloud storage
   */
  private async storePDF(invoiceId: number, pdfContent: string): Promise<string> {
    // In production, this would upload to Cloudflare R2, AWS S3, etc.
    // For now, return a placeholder URL
    const filename = `invoice-${invoiceId}-${Date.now()}.pdf`;
    const url = `https://storage.kwikrdirectory.ca/invoices/${filename}`;
    
    // Store the PDF content (this would be actual file upload in production)
    // await uploadToR2(filename, pdfContent);
    
    return url;
  }

  /**
   * Get invoice with items
   */
  private async getInvoiceWithItems(invoiceId: number): Promise<(Invoice & { items: InvoiceItem[] }) | null> {
    const invoice = await this.db.prepare(`
      SELECT * FROM invoices WHERE id = ?
    `).bind(invoiceId).first() as Invoice;

    if (!invoice) return null;

    const itemsResult = await this.db.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC
    `).bind(invoiceId).all();

    return {
      ...invoice,
      items: itemsResult.results as InvoiceItem[]
    };
  }

  /**
   * Get template by ID
   */
  private async getTemplate(templateId: number): Promise<InvoiceTemplate | null> {
    const template = await this.db.prepare(`
      SELECT * FROM invoice_templates WHERE id = ? AND is_active = 1
    `).bind(templateId).first();

    return template as InvoiceTemplate || null;
  }

  /**
   * Get user information
   */
  private async getUserInfo(userId: number): Promise<any> {
    const user = await this.db.prepare(`
      SELECT u.*, up.company_name as business_name, '' as gst_number 
      FROM users u 
      LEFT JOIN user_profiles up ON u.id = up.user_id 
      WHERE u.id = ?
    `).bind(userId).first();

    return user || {};
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<InvoiceTemplate[]> {
    const result = await this.db.prepare(`
      SELECT * FROM invoice_templates 
      WHERE is_active = 1 
      ORDER BY is_default DESC, name ASC
    `).all();

    return result.results as InvoiceTemplate[];
  }

  /**
   * Create custom template
   */
  async createTemplate(
    templateData: Partial<InvoiceTemplate>
  ): Promise<{ success: boolean; message: string; template_id?: number }> {
    try {
      const result = await this.db.prepare(`
        INSERT INTO invoice_templates (
          name, description, template_type, logo_url, primary_color, 
          secondary_color, font_family, layout_config, language, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(
        templateData.name || 'Custom Template',
        templateData.description || '',
        templateData.template_type || 'standard',
        templateData.logo_url || null,
        templateData.primary_color || '#00C881',
        templateData.secondary_color || '#1a1a1a',
        templateData.font_family || 'Arial',
        JSON.stringify(templateData.layout_config || {}),
        templateData.language || 'en'
      ).run();

      return {
        success: true,
        message: 'Template created successfully',
        template_id: result.meta.last_row_id as number
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create template: ${error.message}`
      };
    }
  }
}