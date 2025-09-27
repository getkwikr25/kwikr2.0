import { Hono } from 'hono'
import Stripe from 'stripe'
import { InvoiceService } from '../services/invoice.js'
import { InvoicePDFService } from '../services/invoice-pdf.js'
import { InvoiceRecurringService } from '../services/invoice-recurring.js'

type Bindings = {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  ENVIRONMENT: string;
}

export const invoiceRoutes = new Hono<{ Bindings: Bindings }>()

// Initialize services
const getServices = (env: Bindings) => {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
    typescript: true
  });
  
  return {
    invoiceService: new InvoiceService(env.DB, stripe),
    pdfService: new InvoicePDFService(env.DB),
    recurringService: new InvoiceRecurringService(env.DB, stripe)
  };
};

// Middleware to verify authentication (matches main dashboard implementation)
const requireAuth = async (c: any, next: any) => {
  const path = c.req.path
  
  // Try to get session token from multiple sources:
  // 1. Cookie (for dashboard pages)
  // 2. Authorization header (for API requests)
  // 3. Query parameter (fallback)
  let sessionToken = null
  
  // Check cookie first
  const cookies = c.req.header('Cookie')
  if (cookies) {
    const match = cookies.match(/session=([^;]+)/)
    if (match) {
      sessionToken = match[1]
    }
    
    // Also check for demo_session cookie as fallback
    if (!sessionToken) {
      const demoMatch = cookies.match(/demo_session=([^;]+)/)
      if (demoMatch) {
        const demoInfo = demoMatch[1]
        const [role, timestamp] = demoInfo.split(':')
        
        // Create a compatible session token from demo_session
        const randomSalt = Math.random().toString(36).substring(2, 15)
        sessionToken = btoa(`demo-${role}:${timestamp}:${randomSalt}`)
      }
    }
  }
  
  // If no cookie, try Authorization header
  if (!sessionToken) {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.replace('Bearer ', '')
    }
  }
  
  // If still no token, try query parameter
  if (!sessionToken) {
    sessionToken = c.req.query('token')
  }
  
  if (!sessionToken) {
    return c.json({ error: 'Authentication required' }, 401)
  }
  
  try {
    const { env } = c
    const user = await env.DB.prepare(`
      SELECT u.*, 
             CASE WHEN w.user_id IS NOT NULL THEN 'worker' ELSE 'client' END as user_type
      FROM users u 
      LEFT JOIN workers w ON u.user_id = w.user_id 
      WHERE u.session_token = ? AND u.status = 'active'
    `).bind(sessionToken).first()
    
    if (!user) {
      return c.json({ error: 'Invalid session' }, 401)
    }
    
    c.set('user', user)
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

// Create Invoice
invoiceRoutes.post('/create', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const { invoice_data, items } = await c.req.json()
    const user = c.get('user')

    // Ensure user is worker (only workers can create invoices)
    if (user.user_type !== 'worker') {
      return c.json({ error: 'Only service providers can create invoices' }, 403)
    }

    invoice_data.worker_id = user.user_id

    const result = await invoiceService.createInvoice(invoice_data, items)
    return c.json(result)

  } catch (error) {
    console.error('Create invoice error:', error)
    return c.json({ error: 'Failed to create invoice' }, 500)
  }
})

// Get Invoice by ID
invoiceRoutes.get('/:invoiceId', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const user = c.get('user')

    const invoice = await invoiceService.getInvoiceById(invoiceId)
    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404)
    }

    // Check access permissions
    if (invoice.client_id !== user.user_id && invoice.worker_id !== user.user_id && user.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }

    const items = await invoiceService.getInvoiceItems(invoiceId)

    return c.json({
      success: true,
      invoice: { ...invoice, items }
    })

  } catch (error) {
    console.error('Get invoice error:', error)
    return c.json({ error: 'Failed to get invoice' }, 500)
  }
})

// Get User's Invoices
invoiceRoutes.get('/list/:userType', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const userType = c.req.param('userType') as 'client' | 'worker'
    const user = c.get('user')
    
    // Parse query parameters
    const status = c.req.query('status')
    const invoice_type = c.req.query('invoice_type')
    const from_date = c.req.query('from_date')
    const to_date = c.req.query('to_date')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const filters = {
      status,
      invoice_type,
      from_date,
      to_date,
      limit,
      offset
    }

    const result = await invoiceService.getUserInvoices(user.user_id, userType, filters)

    return c.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Get user invoices error:', error)
    return c.json({ error: 'Failed to get invoices' }, 500)
  }
})

// Send Invoice
invoiceRoutes.post('/:invoiceId/send', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const user = c.get('user')
    const options = await c.req.json()

    // Verify user owns the invoice
    const invoice = await invoiceService.getInvoiceById(invoiceId)
    if (!invoice || invoice.worker_id !== user.user_id) {
      return c.json({ error: 'Invoice not found or access denied' }, 403)
    }

    const result = await invoiceService.sendInvoice(invoiceId, user.user_id, options)
    return c.json(result)

  } catch (error) {
    console.error('Send invoice error:', error)
    return c.json({ error: 'Failed to send invoice' }, 500)
  }
})

// Update Invoice Status
invoiceRoutes.put('/:invoiceId/status', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const { status, reason } = await c.req.json()
    const user = c.get('user')

    const result = await invoiceService.updateInvoiceStatus(invoiceId, status, user.user_id, reason)
    return c.json(result)

  } catch (error) {
    console.error('Update invoice status error:', error)
    return c.json({ error: 'Failed to update invoice status' }, 500)
  }
})

// Process Invoice Payment
invoiceRoutes.post('/:invoiceId/payment', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const paymentData = await c.req.json()
    const user = c.get('user')

    const result = await invoiceService.processInvoicePayment(invoiceId, paymentData, user.user_id)
    return c.json(result)

  } catch (error) {
    console.error('Process payment error:', error)
    return c.json({ error: 'Failed to process payment' }, 500)
  }
})

// Generate PDF
invoiceRoutes.post('/:invoiceId/pdf', requireAuth, async (c) => {
  try {
    const { env } = c
    const { pdfService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const options = await c.req.json()
    const user = c.get('user')

    // Verify access
    const invoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ?
    `).bind(invoiceId).first()

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404)
    }

    if (invoice.client_id !== user.user_id && invoice.worker_id !== user.user_id && user.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }

    const result = await pdfService.generateInvoicePDF(invoiceId, options)
    return c.json(result)

  } catch (error) {
    console.error('Generate PDF error:', error)
    return c.json({ error: 'Failed to generate PDF' }, 500)
  }
})

// Get Dashboard Data
invoiceRoutes.get('/dashboard/:userType', requireAuth, async (c) => {
  try {
    const { env } = c
    const { invoiceService } = getServices(env)
    
    const userType = c.req.param('userType') as 'client' | 'worker'
    const user = c.get('user')

    const dashboard = await invoiceService.getInvoiceDashboard(user.user_id, userType)

    return c.json({
      success: true,
      dashboard
    })

  } catch (error) {
    console.error('Get invoice dashboard error:', error)
    return c.json({ error: 'Failed to get dashboard data' }, 500)
  }
})

// Recurring Invoice Routes

// Create Recurring Schedule
invoiceRoutes.post('/:invoiceId/recurring', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const scheduleConfig = await c.req.json()
    const user = c.get('user')

    // Verify user owns the invoice
    const invoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND worker_id = ?
    `).bind(invoiceId, user.user_id).first()

    if (!invoice) {
      return c.json({ error: 'Invoice not found or access denied' }, 403)
    }

    const result = await recurringService.createRecurringSchedule(invoiceId, scheduleConfig)
    return c.json(result)

  } catch (error) {
    console.error('Create recurring schedule error:', error)
    return c.json({ error: 'Failed to create recurring schedule' }, 500)
  }
})

// Get User's Recurring Schedules
invoiceRoutes.get('/recurring/schedules/:userType', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    
    const userType = c.req.param('userType') as 'client' | 'worker'
    const user = c.get('user')

    const schedules = await recurringService.getUserRecurringSchedules(user.user_id, userType)

    return c.json({
      success: true,
      schedules
    })

  } catch (error) {
    console.error('Get recurring schedules error:', error)
    return c.json({ error: 'Failed to get recurring schedules' }, 500)
  }
})

// Update Recurring Schedule
invoiceRoutes.put('/recurring/:scheduleId', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    
    const scheduleId = parseInt(c.req.param('scheduleId'))
    const updates = await c.req.json()

    const result = await recurringService.updateRecurringSchedule(scheduleId, updates)
    return c.json(result)

  } catch (error) {
    console.error('Update recurring schedule error:', error)
    return c.json({ error: 'Failed to update recurring schedule' }, 500)
  }
})

// Pause/Resume Recurring Schedule
invoiceRoutes.post('/recurring/:scheduleId/:action', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    
    const scheduleId = parseInt(c.req.param('scheduleId'))
    const action = c.req.param('action')

    if (!['pause', 'resume'].includes(action)) {
      return c.json({ error: 'Invalid action' }, 400)
    }

    const result = await recurringService.pauseRecurringSchedule(scheduleId, action === 'pause')
    return c.json(result)

  } catch (error) {
    console.error('Pause/resume schedule error:', error)
    return c.json({ error: 'Failed to update schedule' }, 500)
  }
})

// Get Recurring Invoice History
invoiceRoutes.get('/recurring/:scheduleId/history', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    
    const scheduleId = parseInt(c.req.param('scheduleId'))

    const history = await recurringService.getRecurringInvoiceHistory(scheduleId)

    return c.json({
      success: true,
      history
    })

  } catch (error) {
    console.error('Get recurring history error:', error)
    return c.json({ error: 'Failed to get recurring history' }, 500)
  }
})

// Payment Link Routes

// Create Advanced Payment Link
invoiceRoutes.post('/:invoiceId/payment-link', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const options = await c.req.json()
    const user = c.get('user')

    // Verify user owns the invoice
    const invoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND worker_id = ?
    `).bind(invoiceId, user.user_id).first()

    if (!invoice) {
      return c.json({ error: 'Invoice not found or access denied' }, 403)
    }

    const result = await recurringService.createAdvancedPaymentLink(invoiceId, options)
    return c.json(result)

  } catch (error) {
    console.error('Create payment link error:', error)
    return c.json({ error: 'Failed to create payment link' }, 500)
  }
})

// Template Routes

// Get Available Templates
invoiceRoutes.get('/templates/list', requireAuth, async (c) => {
  try {
    const { env } = c
    const { pdfService } = getServices(env)
    
    const templates = await pdfService.getAvailableTemplates()

    return c.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Get templates error:', error)
    return c.json({ error: 'Failed to get templates' }, 500)
  }
})

// Create Custom Template
invoiceRoutes.post('/templates/create', requireAuth, async (c) => {
  try {
    const { env } = c
    const { pdfService } = getServices(env)
    
    const templateData = await c.req.json()
    const user = c.get('user')

    // Only workers and admins can create templates
    if (user.user_type !== 'worker' && user.role !== 'admin') {
      return c.json({ error: 'Only service providers can create templates' }, 403)
    }

    const result = await pdfService.createTemplate(templateData)
    return c.json(result)

  } catch (error) {
    console.error('Create template error:', error)
    return c.json({ error: 'Failed to create template' }, 500)
  }
})

// Admin Routes

// Process Recurring Invoices (Admin)
invoiceRoutes.post('/admin/process-recurring', requireAuth, async (c) => {
  try {
    const { env } = c
    const { recurringService } = getServices(env)
    const user = c.get('user')

    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const results = await recurringService.processRecurringInvoices()

    return c.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Process recurring invoices error:', error)
    return c.json({ error: 'Failed to process recurring invoices' }, 500)
  }
})

// Invoice Analytics (Admin)
invoiceRoutes.get('/admin/analytics', requireAuth, async (c) => {
  try {
    const { env } = c
    const user = c.get('user')

    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const period = c.req.query('period') || 'monthly'
    const limit = parseInt(c.req.query('limit') || '12')

    const analytics = await env.DB.prepare(`
      SELECT * FROM invoice_analytics 
      WHERE period_type = ?
      ORDER BY report_date DESC
      LIMIT ?
    `).bind(period, limit).all()

    return c.json({
      success: true,
      analytics: analytics.results
    })

  } catch (error) {
    console.error('Get invoice analytics error:', error)
    return c.json({ error: 'Failed to get analytics' }, 500)
  }
})

// Payment Dispute Routes

// Create Invoice Dispute
invoiceRoutes.post('/:invoiceId/dispute', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const disputeData = await c.req.json()
    const user = c.get('user')

    // Verify user has access to the invoice
    const invoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND (client_id = ? OR worker_id = ?)
    `).bind(invoiceId, user.user_id, user.user_id).first()

    if (!invoice) {
      return c.json({ error: 'Invoice not found or access denied' }, 403)
    }

    const result = await disputeService.createDispute({
      invoice_id: invoiceId,
      dispute_type: disputeData.dispute_type,
      dispute_category: disputeData.dispute_category,
      title: disputeData.title,
      reason: disputeData.reason,
      description: disputeData.description,
      amount_disputed: disputeData.amount_disputed,
      priority: disputeData.priority,
      evidence: disputeData.evidence
    }, user.user_id)

    return c.json(result)

  } catch (error) {
    console.error('Create invoice dispute error:', error)
    return c.json({ error: 'Failed to create dispute' }, 500)
  }
})

// Get Invoice Disputes
invoiceRoutes.get('/:invoiceId/disputes', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const invoiceId = parseInt(c.req.param('invoiceId'))
    const user = c.get('user')

    // Verify user has access to the invoice
    const invoice = await env.DB.prepare(`
      SELECT * FROM invoices WHERE id = ? AND (client_id = ? OR worker_id = ?)
    `).bind(invoiceId, user.user_id, user.user_id).first()

    if (!invoice) {
      return c.json({ error: 'Invoice not found or access denied' }, 403)
    }

    // Get disputes for this invoice
    const disputes = await env.DB.prepare(`
      SELECT * FROM invoice_disputes WHERE invoice_id = ? ORDER BY created_at DESC
    `).bind(invoiceId).all()

    return c.json({
      success: true,
      disputes: disputes.results
    })

  } catch (error) {
    console.error('Get invoice disputes error:', error)
    return c.json({ error: 'Failed to get disputes' }, 500)
  }
})

// Get Dispute Details
invoiceRoutes.get('/disputes/:disputeId', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const user = c.get('user')

    // Verify user has access to the dispute
    const dispute = await env.DB.prepare(`
      SELECT * FROM invoice_disputes WHERE id = ? AND (client_id = ? OR worker_id = ?)
    `).bind(disputeId, user.user_id, user.user_id).first()

    if (!dispute) {
      return c.json({ error: 'Dispute not found or access denied' }, 403)
    }

    const result = await disputeService.getDisputeById(disputeId)
    return c.json(result)

  } catch (error) {
    console.error('Get dispute details error:', error)
    return c.json({ error: 'Failed to get dispute details' }, 500)
  }
})

// Update Dispute Status
invoiceRoutes.put('/disputes/:disputeId/status', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const { status, notes } = await c.req.json()
    const user = c.get('user')

    // Verify user has access to the dispute (or is admin)
    const dispute = await env.DB.prepare(`
      SELECT * FROM invoice_disputes WHERE id = ? AND (client_id = ? OR worker_id = ? OR ? = 'admin')
    `).bind(disputeId, user.user_id, user.user_id, user.role).first()

    if (!dispute) {
      return c.json({ error: 'Dispute not found or access denied' }, 403)
    }

    const result = await disputeService.updateDisputeStatus(disputeId, status, user.user_id, notes)
    return c.json(result)

  } catch (error) {
    console.error('Update dispute status error:', error)
    return c.json({ error: 'Failed to update dispute status' }, 500)
  }
})

// Add Evidence to Dispute
invoiceRoutes.post('/disputes/:disputeId/evidence', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const evidenceData = await c.req.json()
    const user = c.get('user')

    // Verify user has access to the dispute
    const dispute = await env.DB.prepare(`
      SELECT * FROM invoice_disputes WHERE id = ? AND (client_id = ? OR worker_id = ?)
    `).bind(disputeId, user.user_id, user.user_id).first()

    if (!dispute) {
      return c.json({ error: 'Dispute not found or access denied' }, 403)
    }

    const result = await disputeService.addEvidence(disputeId, user.user_id, evidenceData)
    return c.json(result)

  } catch (error) {
    console.error('Add dispute evidence error:', error)
    return c.json({ error: 'Failed to add evidence' }, 500)
  }
})

// Add Message to Dispute
invoiceRoutes.post('/disputes/:disputeId/messages', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const messageData = await c.req.json()
    const user = c.get('user')

    // Verify user has access to the dispute
    const dispute = await env.DB.prepare(`
      SELECT * FROM invoice_disputes WHERE id = ? AND (client_id = ? OR worker_id = ?)
    `).bind(disputeId, user.user_id, user.user_id).first()

    if (!dispute) {
      return c.json({ error: 'Dispute not found or access denied' }, 403)
    }

    const result = await disputeService.addMessage(
      disputeId, 
      user.user_id, 
      messageData.recipient_id, 
      messageData
    )
    return c.json(result)

  } catch (error) {
    console.error('Add dispute message error:', error)
    return c.json({ error: 'Failed to add message' }, 500)
  }
})

// Resolve Dispute
invoiceRoutes.post('/disputes/:disputeId/resolve', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const resolutionData = await c.req.json()
    const user = c.get('user')

    // Only admins can resolve disputes
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required to resolve disputes' }, 403)
    }

    const result = await disputeService.resolveDispute(disputeId, resolutionData, user.user_id)
    return c.json(result)

  } catch (error) {
    console.error('Resolve dispute error:', error)
    return c.json({ error: 'Failed to resolve dispute' }, 500)
  }
})

// List User's Disputes
invoiceRoutes.get('/disputes/my/list', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const user = c.get('user')
    const status = c.req.query('status')
    const limit = parseInt(c.req.query('limit') || '20')
    const offset = parseInt(c.req.query('offset') || '0')

    const result = await disputeService.listDisputes({
      user_id: user.user_id,
      status,
      limit,
      offset
    })

    return c.json(result)

  } catch (error) {
    console.error('List user disputes error:', error)
    return c.json({ error: 'Failed to list disputes' }, 500)
  }
})

// Admin: List All Disputes
invoiceRoutes.get('/admin/disputes/list', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const user = c.get('user')

    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const filters = {
      status: c.req.query('status'),
      dispute_type: c.req.query('dispute_type'),
      priority: c.req.query('priority'),
      assigned_to: c.req.query('assigned_to') ? parseInt(c.req.query('assigned_to')) : undefined,
      limit: parseInt(c.req.query('limit') || '50'),
      offset: parseInt(c.req.query('offset') || '0')
    }

    const result = await disputeService.listDisputes(filters)
    return c.json(result)

  } catch (error) {
    console.error('Admin list disputes error:', error)
    return c.json({ error: 'Failed to list disputes' }, 500)
  }
})

// Admin: Dispute Analytics
invoiceRoutes.get('/admin/disputes/analytics', requireAuth, async (c) => {
  try {
    const { env } = c
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)
    
    const user = c.get('user')

    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const filters = {
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      dispute_type: c.req.query('dispute_type')
    }

    const result = await disputeService.getDisputeAnalytics(filters)
    return c.json(result)

  } catch (error) {
    console.error('Dispute analytics error:', error)
    return c.json({ error: 'Failed to get dispute analytics' }, 500)
  }
})

export default invoiceRoutes