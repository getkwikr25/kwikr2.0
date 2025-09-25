import { Hono } from 'hono'
import Stripe from 'stripe'
import { EscrowService } from '../services/escrow.js'
import { EscrowTriggerService } from '../services/escrow-triggers.js'
import { EscrowTimelineService } from '../services/escrow-timeline.js'
import { EscrowMilestoneService } from '../services/escrow-milestones.js'
import { EscrowMonitoringService } from '../services/escrow-monitoring.js'
import { EscrowDisputeService } from '../services/escrow-disputes.js'

type Bindings = {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ENVIRONMENT: string;
  DEBUG_PAYMENTS: string;
  PLATFORM_FEE_PERCENTAGE: string;
  PLATFORM_FEE_MINIMUM: string;
  PLATFORM_FEE_MAXIMUM: string;
}

export const paymentRoutes = new Hono<{ Bindings: Bindings }>()

// Initialize Stripe (will be done per request to access environment variables)
const getStripe = (secretKey: string) => {
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia', // Latest API version
    typescript: true
  })
}

// Canadian Tax Calculation Utility
const calculateCanadianTax = (amount: number, province: string): { gst: number, pst: number, hst: number, total: number } => {
  const gstRate = 0.05 // 5% GST (Federal)
  let pstRate = 0
  let hstRate = 0
  
  // Provincial tax rates as of 2024
  switch (province?.toLowerCase()) {
    case 'on': // Ontario
      hstRate = 0.13 // 13% HST (replaces GST + PST)
      break
    case 'bc': // British Columbia
      pstRate = 0.07 // 7% PST
      break
    case 'sk': // Saskatchewan
      pstRate = 0.06 // 6% PST
      break
    case 'mb': // Manitoba
      pstRate = 0.07 // 7% PST
      break
    case 'qc': // Quebec
      pstRate = 0.09975 // 9.975% QST
      break
    case 'nb': // New Brunswick
      hstRate = 0.15 // 15% HST
      break
    case 'ns': // Nova Scotia
      hstRate = 0.15 // 15% HST
      break
    case 'pe': // Prince Edward Island
      hstRate = 0.15 // 15% HST
      break
    case 'nl': // Newfoundland and Labrador
      hstRate = 0.15 // 15% HST
      break
    case 'yt': // Yukon
    case 'nt': // Northwest Territories
    case 'nu': // Nunavut
      // Only GST applies in territories
      break
    case 'ab': // Alberta
      // Only GST applies in Alberta
      break
  }

  let gst = 0
  let pst = 0
  let hst = 0

  if (hstRate > 0) {
    // HST provinces (replaces both GST and PST)
    hst = Math.round(amount * hstRate * 100) / 100
  } else {
    // GST + PST provinces
    gst = Math.round(amount * gstRate * 100) / 100
    pst = Math.round(amount * pstRate * 100) / 100
  }

  const total = Math.round((amount + gst + pst + hst) * 100) / 100

  return { gst, pst, hst, total }
}

// Middleware to verify worker or client authentication
const requireAuth = async (c: any, next: any) => {
  let sessionToken = null
  
  // Check Authorization header first
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.replace('Bearer ', '')
  }
  
  // If no Authorization header, try cookies
  if (!sessionToken) {
    const cookies = c.req.header('Cookie')
    if (cookies) {
      const match = cookies.match(/session=([^;]+)/)
      if (match) {
        sessionToken = match[1]
      }
    }
  }
  
  if (!sessionToken) {
    return c.json({ error: 'Authentication required' }, 401)
  }
  
  try {
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, u.role, u.first_name, u.last_name, u.email, u.is_verified
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1
    `).bind(sessionToken).first()
    
    if (!session) {
      return c.json({ error: 'Invalid session' }, 401)
    }
    
    c.set('user', session)
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
}

// Helper function to calculate platform fee
const calculatePlatformFee = (amount: number, env: Bindings) => {
  const percentage = parseFloat(env.PLATFORM_FEE_PERCENTAGE || '0.05')
  const minimum = parseFloat(env.PLATFORM_FEE_MINIMUM || '2.00')
  const maximum = parseFloat(env.PLATFORM_FEE_MAXIMUM || '50.00')
  
  let fee = amount * percentage
  
  if (fee < minimum) fee = minimum
  if (fee > maximum) fee = maximum
  
  return Math.round(fee * 100) / 100 // Round to 2 decimal places
}

// ===== PAYMENT INTENT CREATION =====

// Create payment intent for job escrow
paymentRoutes.post('/create-intent', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { job_id, payment_method_id } = await c.req.json()

    if (!job_id) {
      return c.json({ error: 'job_id is required' }, 400)
    }

    // Get job details and verify client owns the job
    const job = await c.env.DB.prepare(`
      SELECT j.*, b.bid_amount, b.worker_id, b.id as bid_id, 
             c.province as client_province, w.province as worker_province
      FROM jobs j
      JOIN bids b ON j.id = b.job_id AND b.status = 'accepted'
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN users w ON b.worker_id = w.id
      WHERE j.id = ? AND j.client_id = ? AND j.status = 'assigned'
    `).bind(job_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or not accessible' }, 404)
    }

    // Check if payment intent already exists
    if (job.stripe_payment_intent_id) {
      return c.json({ 
        error: 'Payment intent already exists for this job',
        payment_intent_id: job.stripe_payment_intent_id
      }, 400)
    }

    const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
    const bidAmount = parseFloat(job.bid_amount)
    const platformFee = calculatePlatformFee(bidAmount, c.env)
    
    // Calculate Canadian taxes based on worker's province (service delivery location)
    const taxCalculation = calculateCanadianTax(bidAmount, job.worker_province)
    const totalAmount = bidAmount + platformFee + taxCalculation.gst + taxCalculation.pst + taxCalculation.hst

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'cad',
      payment_method: payment_method_id,
      confirmation_method: 'manual',
      confirm: false,
      capture_method: 'manual', // Hold funds in escrow
      metadata: {
        job_id: job_id.toString(),
        client_id: user.user_id.toString(),
        worker_id: job.worker_id.toString(),
        bid_id: job.bid_id.toString(),
        bid_amount: bidAmount.toString(),
        platform_fee: platformFee.toString(),
        client_province: job.client_province || 'ON',
        worker_province: job.worker_province || 'ON',
        tax_gst: taxCalculation.gst.toString(),
        tax_pst: taxCalculation.pst.toString(),
        tax_hst: taxCalculation.hst.toString(),
        environment: c.env.ENVIRONMENT || 'development'
      },
      description: `Kwikr Job: ${job.title} - Escrow Payment (incl. Canadian taxes)`
    })

    // Update job with payment intent ID and escrow amount
    await c.env.DB.prepare(`
      UPDATE jobs 
      SET stripe_payment_intent_id = ?, escrow_amount = ?, escrow_status = 'pending'
      WHERE id = ?
    `).bind(paymentIntent.id, totalAmount, job_id).run()

    // Log the transaction
    await c.env.DB.prepare(`
      INSERT INTO transactions (
        job_id, client_id, worker_id, transaction_type, amount, 
        stripe_transaction_id, status, description
      ) VALUES (?, ?, ?, 'escrow_hold', ?, ?, 'pending', ?)
    `).bind(
      job_id, user.user_id, job.worker_id, totalAmount,
      paymentIntent.id, `Payment intent created for job: ${job.title}`
    ).run()

    return c.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status
      },
      amounts: {
        bid_amount: bidAmount,
        platform_fee: platformFee,
        tax_breakdown: {
          gst: taxCalculation.gst,
          pst: taxCalculation.pst,
          hst: taxCalculation.hst,
          tax_total: taxCalculation.gst + taxCalculation.pst + taxCalculation.hst
        },
        total_amount: totalAmount
      },
      tax_info: {
        service_province: job.worker_province,
        client_province: job.client_province,
        tax_applicable: 'Canadian taxes applied based on service delivery location'
      }
    })

  } catch (error) {
    console.error('Create payment intent error:', error)
    return c.json({ 
      error: 'Failed to create payment intent', 
      details: error.message 
    }, 500)
  }
})

// Confirm payment intent (complete escrow hold)
paymentRoutes.post('/confirm-intent', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { payment_intent_id } = await c.req.json()

    if (!payment_intent_id) {
      return c.json({ error: 'payment_intent_id is required' }, 400)
    }

    // Get job details
    const job = await c.env.DB.prepare(`
      SELECT * FROM jobs 
      WHERE stripe_payment_intent_id = ? AND client_id = ?
    `).bind(payment_intent_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
    
    // Confirm the payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id)

    if (paymentIntent.status === 'requires_capture') {
      // Update job escrow status
      await c.env.DB.prepare(`
        UPDATE jobs 
        SET escrow_status = 'held'
        WHERE id = ?
      `).bind(job.id).run()

      // Update transaction status
      await c.env.DB.prepare(`
        UPDATE transactions 
        SET status = 'completed', processed_at = CURRENT_TIMESTAMP
        WHERE stripe_transaction_id = ?
      `).bind(payment_intent_id).run()

      return c.json({
        success: true,
        status: paymentIntent.status,
        escrow_status: 'held'
      })
    } else {
      return c.json({
        success: false,
        status: paymentIntent.status,
        error: 'Payment confirmation failed'
      }, 400)
    }

  } catch (error) {
    console.error('Confirm payment intent error:', error)
    return c.json({ 
      error: 'Failed to confirm payment', 
      details: error.message 
    }, 500)
  }
})

// ===== ESCROW MANAGEMENT =====

// Release escrow to worker (when job completed)
paymentRoutes.post('/escrow/release', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { job_id } = await c.req.json()

    if (!job_id) {
      return c.json({ error: 'job_id is required' }, 400)
    }

    // Get job details and verify access (client or admin can release)
    const job = await c.env.DB.prepare(`
      SELECT j.*, b.worker_id, b.bid_amount,
             c.province as client_province, w.province as worker_province
      FROM jobs j
      JOIN bids b ON j.id = b.job_id AND b.status = 'accepted'
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN users w ON b.worker_id = w.id
      WHERE j.id = ? AND (j.client_id = ? OR ? IN (SELECT id FROM users WHERE role = 'admin'))
      AND j.status = 'completed' AND j.escrow_status = 'held'
    `).bind(job_id, user.user_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or not eligible for release' }, 404)
    }

    const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
    
    // Capture the payment (release from escrow)
    const paymentIntent = await stripe.paymentIntents.capture(job.stripe_payment_intent_id)

    if (paymentIntent.status === 'succeeded') {
      const bidAmount = parseFloat(job.bid_amount)
      const platformFee = calculatePlatformFee(bidAmount, c.env)
      
      // Recalculate Canadian taxes for proper record keeping
      const taxCalculation = calculateCanadianTax(bidAmount, job.worker_province)

      // Update job escrow status
      await c.env.DB.prepare(`
        UPDATE jobs 
        SET escrow_status = 'released'
        WHERE id = ?
      `).bind(job_id).run()

      // Log escrow release transaction
      await c.env.DB.prepare(`
        INSERT INTO transactions (
          job_id, client_id, worker_id, transaction_type, amount, 
          stripe_transaction_id, status, description, processed_at
        ) VALUES (?, ?, ?, 'escrow_release', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
      `).bind(
        job_id, job.client_id, job.worker_id, bidAmount,
        paymentIntent.id, `Escrow released for completed job: ${job.title}`
      ).run()

      // Log platform fee transaction
      await c.env.DB.prepare(`
        INSERT INTO transactions (
          job_id, client_id, worker_id, transaction_type, amount, 
          stripe_transaction_id, status, description, processed_at
        ) VALUES (?, ?, ?, 'platform_fee', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
      `).bind(
        job_id, job.client_id, job.worker_id, platformFee,
        paymentIntent.id, `Platform fee for job: ${job.title}`
      ).run()

      // Log Canadian tax transactions for compliance
      if (taxCalculation.gst > 0) {
        await c.env.DB.prepare(`
          INSERT INTO transactions (
            job_id, client_id, worker_id, transaction_type, amount, 
            stripe_transaction_id, status, description, processed_at
          ) VALUES (?, ?, ?, 'tax_gst', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
        `).bind(
          job_id, job.client_id, job.worker_id, taxCalculation.gst,
          paymentIntent.id, `GST collected for job in ${job.worker_province}: ${job.title}`
        ).run()
      }
      
      if (taxCalculation.pst > 0) {
        await c.env.DB.prepare(`
          INSERT INTO transactions (
            job_id, client_id, worker_id, transaction_type, amount, 
            stripe_transaction_id, status, description, processed_at
          ) VALUES (?, ?, ?, 'tax_pst', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
        `).bind(
          job_id, job.client_id, job.worker_id, taxCalculation.pst,
          paymentIntent.id, `PST collected for job in ${job.worker_province}: ${job.title}`
        ).run()
      }
      
      if (taxCalculation.hst > 0) {
        await c.env.DB.prepare(`
          INSERT INTO transactions (
            job_id, client_id, worker_id, transaction_type, amount, 
            stripe_transaction_id, status, description, processed_at
          ) VALUES (?, ?, ?, 'tax_hst', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
        `).bind(
          job_id, job.client_id, job.worker_id, taxCalculation.hst,
          paymentIntent.id, `HST collected for job in ${job.worker_province}: ${job.title}`
        ).run()
      }

      // Create worker earning record
      const currentYear = new Date().getFullYear()
      await c.env.DB.prepare(`
        INSERT INTO worker_earnings (
          worker_id, job_id, bid_id, gross_amount, platform_fee, net_amount,
          payment_status, tax_year, earning_type, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, 'job_completion', CURRENT_TIMESTAMP)
      `).bind(
        job.worker_id, job_id, 
        (await c.env.DB.prepare(`SELECT id FROM bids WHERE job_id = ? AND worker_id = ?`).bind(job_id, job.worker_id).first()).id,
        bidAmount, platformFee, bidAmount - platformFee, currentYear
      ).run()

      return c.json({
        success: true,
        status: 'released',
        amounts: {
          bid_amount: bidAmount,
          platform_fee: platformFee,
          tax_breakdown: {
            gst: taxCalculation.gst,
            pst: taxCalculation.pst,
            hst: taxCalculation.hst,
            tax_total: taxCalculation.gst + taxCalculation.pst + taxCalculation.hst
          },
          worker_net: bidAmount - platformFee
        },
        tax_compliance: {
          service_province: job.worker_province,
          tax_remittance_required: 'Taxes collected will be remitted to CRA',
          worker_receives_gross: 'Worker receives full bid amount, taxes handled by platform'
        }
      })
    } else {
      return c.json({
        success: false,
        status: paymentIntent.status,
        error: 'Escrow release failed'
      }, 400)
    }

  } catch (error) {
    console.error('Escrow release error:', error)
    return c.json({ 
      error: 'Failed to release escrow', 
      details: error.message 
    }, 500)
  }
})

// Refund escrow to client (in case of dispute or cancellation)
paymentRoutes.post('/escrow/refund', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { job_id, reason } = await c.req.json()

    if (!job_id) {
      return c.json({ error: 'job_id is required' }, 400)
    }

    // Verify admin access for refunds
    const adminCheck = await c.env.DB.prepare(`
      SELECT role FROM users WHERE id = ? AND role = 'admin'
    `).bind(user.user_id).first()

    if (!adminCheck) {
      return c.json({ error: 'Admin access required for refunds' }, 403)
    }

    // Get job details
    const job = await c.env.DB.prepare(`
      SELECT * FROM jobs 
      WHERE id = ? AND escrow_status = 'held'
    `).bind(job_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or escrow not held' }, 404)
    }

    const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
    
    // Cancel the payment intent (refund)
    const paymentIntent = await stripe.paymentIntents.cancel(job.stripe_payment_intent_id)

    if (paymentIntent.status === 'canceled') {
      // Update job escrow status
      await c.env.DB.prepare(`
        UPDATE jobs 
        SET escrow_status = 'refunded'
        WHERE id = ?
      `).bind(job_id).run()

      // Log refund transaction
      await c.env.DB.prepare(`
        INSERT INTO transactions (
          job_id, client_id, worker_id, transaction_type, amount, 
          stripe_transaction_id, status, description, processed_at
        ) VALUES (?, ?, ?, 'refund', ?, ?, 'completed', ?, CURRENT_TIMESTAMP)
      `).bind(
        job_id, job.client_id, job.assigned_worker_id, job.escrow_amount,
        paymentIntent.id, `Refund processed: ${reason || 'Admin refund'}`
      ).run()

      return c.json({
        success: true,
        status: 'refunded',
        refund_amount: parseFloat(job.escrow_amount)
      })
    } else {
      return c.json({
        success: false,
        status: paymentIntent.status,
        error: 'Refund failed'
      }, 400)
    }

  } catch (error) {
    console.error('Escrow refund error:', error)
    return c.json({ 
      error: 'Failed to process refund', 
      details: error.message 
    }, 500)
  }
})

// ===== PAYMENT STATUS & HISTORY =====

// Get payment status for a job
paymentRoutes.get('/status/:jobId', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const jobId = c.req.param('jobId')

    // Get job and payment details
    const job = await c.env.DB.prepare(`
      SELECT j.*, b.bid_amount, b.worker_id
      FROM jobs j
      LEFT JOIN bids b ON j.id = b.job_id AND b.status = 'accepted'
      WHERE j.id = ? AND (j.client_id = ? OR b.worker_id = ? OR ? IN (SELECT id FROM users WHERE role = 'admin'))
    `).bind(jobId, user.user_id, user.user_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    // Get transaction history
    const transactions = await c.env.DB.prepare(`
      SELECT * FROM transactions 
      WHERE job_id = ? 
      ORDER BY created_at DESC
    `).bind(jobId).all()

    let stripeStatus = null
    if (job.stripe_payment_intent_id) {
      try {
        const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
        const paymentIntent = await stripe.paymentIntents.retrieve(job.stripe_payment_intent_id)
        stripeStatus = paymentIntent.status
      } catch (error) {
        console.error('Error retrieving Stripe payment intent:', error)
      }
    }

    return c.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        escrow_status: job.escrow_status,
        escrow_amount: job.escrow_amount,
        stripe_payment_intent_id: job.stripe_payment_intent_id,
        stripe_status: stripeStatus
      },
      transactions: transactions.results || []
    })

  } catch (error) {
    console.error('Get payment status error:', error)
    return c.json({ 
      error: 'Failed to get payment status', 
      details: error.message 
    }, 500)
  }
})

// Get platform fee settings
paymentRoutes.get('/fee-settings', requireAuth, async (c) => {
  try {
    const feeSettings = await c.env.DB.prepare(`
      SELECT * FROM platform_fee_settings 
      WHERE is_active = 1 
      ORDER BY effective_date DESC 
      LIMIT 1
    `).first()

    return c.json({
      success: true,
      fee_settings: feeSettings || {
        fee_type: 'percentage',
        fee_percentage: 0.05,
        minimum_fee: 2.00,
        maximum_fee: 50.00
      }
    })

  } catch (error) {
    console.error('Get fee settings error:', error)
    return c.json({ error: 'Failed to get fee settings' }, 500)
  }
})

// Enhanced Escrow Management Routes

// Milestone Payment Routes
paymentRoutes.post('/milestones/create', requireAuth, async (c) => {
  try {
    const { env } = c
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const milestoneService = new EscrowMilestoneService(env.DB, stripe)
    
    const { job_id, total_amount, job_category, custom_milestones } = await c.req.json()
    const user = c.get('user')

    const milestones = await milestoneService.createJobMilestones(
      job_id,
      total_amount,
      job_category || 'custom',
      custom_milestones,
      user.user_id
    )

    return c.json({
      success: true,
      milestones,
      message: `Created ${milestones.length} milestones for job`
    })

  } catch (error) {
    console.error('Create milestones error:', error)
    return c.json({ error: 'Failed to create milestones' }, 500)
  }
})

paymentRoutes.post('/milestones/:milestoneId/pay', requireAuth, async (c) => {
  try {
    const { env } = c
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const milestoneService = new EscrowMilestoneService(env.DB, stripe)
    
    const milestoneId = parseInt(c.req.param('milestoneId'))
    const { payment_method_id } = await c.req.json()
    const user = c.get('user')

    const result = await milestoneService.processMilestonePayment(
      milestoneId,
      user.user_id,
      payment_method_id
    )

    return c.json(result)

  } catch (error) {
    console.error('Milestone payment error:', error)
    return c.json({ error: 'Failed to process milestone payment' }, 500)
  }
})

paymentRoutes.post('/milestones/:milestoneId/submit', requireAuth, async (c) => {
  try {
    const { env } = c
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const milestoneService = new EscrowMilestoneService(env.DB, stripe)
    
    const milestoneId = parseInt(c.req.param('milestoneId'))
    const { submission_notes, attachments } = await c.req.json()
    const user = c.get('user')

    const result = await milestoneService.submitMilestone(
      milestoneId,
      user.user_id,
      submission_notes,
      attachments
    )

    return c.json(result)

  } catch (error) {
    console.error('Milestone submission error:', error)
    return c.json({ error: 'Failed to submit milestone' }, 500)
  }
})

paymentRoutes.post('/milestones/:milestoneId/approve', requireAuth, async (c) => {
  try {
    const { env } = c
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const milestoneService = new EscrowMilestoneService(env.DB, stripe)
    
    const milestoneId = parseInt(c.req.param('milestoneId'))
    const { approval_notes, rating } = await c.req.json()
    const user = c.get('user')

    const result = await milestoneService.approveMilestone(
      milestoneId,
      user.user_id,
      approval_notes,
      rating
    )

    return c.json(result)

  } catch (error) {
    console.error('Milestone approval error:', error)
    return c.json({ error: 'Failed to approve milestone' }, 500)
  }
})

paymentRoutes.post('/milestones/:milestoneId/request-revision', requireAuth, async (c) => {
  try {
    const { env } = c
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const milestoneService = new EscrowMilestoneService(env.DB, stripe)
    
    const milestoneId = parseInt(c.req.param('milestoneId'))
    const { revision_notes, additional_time } = await c.req.json()
    const user = c.get('user')

    const result = await milestoneService.requestMilestoneRevision(
      milestoneId,
      user.user_id,
      revision_notes,
      additional_time
    )

    return c.json(result)

  } catch (error) {
    console.error('Milestone revision error:', error)
    return c.json({ error: 'Failed to request revision' }, 500)
  }
})

paymentRoutes.get('/milestones/job/:jobId/progress', requireAuth, async (c) => {
  try {
    const { env } = c
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const milestoneService = new EscrowMilestoneService(env.DB, stripe)
    
    const jobId = parseInt(c.req.param('jobId'))

    const progress = await milestoneService.getJobMilestoneProgress(jobId)

    return c.json({
      success: true,
      progress
    })

  } catch (error) {
    console.error('Get milestone progress error:', error)
    return c.json({ error: 'Failed to get milestone progress' }, 500)
  }
})

// Timeline and Monitoring Routes
paymentRoutes.get('/escrow/:transactionId/timeline', requireAuth, async (c) => {
  try {
    const { env } = c
    const timelineService = new EscrowTimelineService(env.DB)
    
    const transactionId = parseInt(c.req.param('transactionId'))

    const timeline = await timelineService.getEscrowTimeline(transactionId)

    return c.json({
      success: true,
      timeline
    })

  } catch (error) {
    console.error('Get timeline error:', error)
    return c.json({ error: 'Failed to get timeline' }, 500)
  }
})

paymentRoutes.get('/escrow/:transactionId/status', requireAuth, async (c) => {
  try {
    const { env } = c
    const timelineService = new EscrowTimelineService(env.DB)
    
    const transactionId = parseInt(c.req.param('transactionId'))

    const status = await timelineService.getTransactionStatus(transactionId)

    return c.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('Get transaction status error:', error)
    return c.json({ error: 'Failed to get transaction status' }, 500)
  }
})

paymentRoutes.post('/escrow/:transactionId/extend-deadline', requireAuth, async (c) => {
  try {
    const { env } = c
    const timelineService = new EscrowTimelineService(env.DB)
    
    const transactionId = parseInt(c.req.param('transactionId'))
    const { deadline_type, extension_hours, reason } = await c.req.json()
    const user = c.get('user')

    const result = await timelineService.extendDeadline(
      transactionId,
      deadline_type,
      extension_hours,
      reason,
      user.user_id
    )

    return c.json(result)

  } catch (error) {
    console.error('Extend deadline error:', error)
    return c.json({ error: 'Failed to extend deadline' }, 500)
  }
})

// Dispute Management Routes
paymentRoutes.post('/escrow/:transactionId/dispute', requireAuth, async (c) => {
  try {
    const { env } = c
    const disputeService = new EscrowDisputeService(env.DB)
    
    const transactionId = parseInt(c.req.param('transactionId'))
    const disputeData = await c.req.json()
    const user = c.get('user')

    const result = await disputeService.fileDispute(
      transactionId,
      user.user_id,
      disputeData
    )

    return c.json(result)

  } catch (error) {
    console.error('File dispute error:', error)
    return c.json({ error: 'Failed to file dispute' }, 500)
  }
})

paymentRoutes.post('/disputes/:disputeId/respond', requireAuth, async (c) => {
  try {
    const { env } = c
    const disputeService = new EscrowDisputeService(env.DB)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const response = await c.req.json()
    const user = c.get('user')

    const result = await disputeService.respondToDispute(
      disputeId,
      user.user_id,
      response
    )

    return c.json(result)

  } catch (error) {
    console.error('Dispute response error:', error)
    return c.json({ error: 'Failed to respond to dispute' }, 500)
  }
})

paymentRoutes.post('/disputes/:disputeId/escalate', requireAuth, async (c) => {
  try {
    const { env } = c
    const disputeService = new EscrowDisputeService(env.DB)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const { reason } = await c.req.json()
    const user = c.get('user')

    const result = await disputeService.escalateToMediation(
      disputeId,
      user.user_id,
      reason
    )

    return c.json(result)

  } catch (error) {
    console.error('Dispute escalation error:', error)
    return c.json({ error: 'Failed to escalate dispute' }, 500)
  }
})

paymentRoutes.post('/disputes/:disputeId/resolve', requireAuth, async (c) => {
  try {
    const { env } = c
    const disputeService = new EscrowDisputeService(env.DB)
    
    const disputeId = parseInt(c.req.param('disputeId'))
    const resolution = await c.req.json()
    const user = c.get('user')

    const result = await disputeService.resolveDispute(
      disputeId,
      user.user_id,
      resolution
    )

    return c.json(result)

  } catch (error) {
    console.error('Dispute resolution error:', error)
    return c.json({ error: 'Failed to resolve dispute' }, 500)
  }
})

// Monitoring Dashboard Routes
paymentRoutes.get('/dashboard/escrow', requireAuth, async (c) => {
  try {
    const { env } = c
    const monitoringService = new EscrowMonitoringService(env.DB)
    
    const dashboard = await monitoringService.getEscrowDashboard()

    return c.json({
      success: true,
      dashboard
    })

  } catch (error) {
    console.error('Get escrow dashboard error:', error)
    return c.json({ error: 'Failed to get escrow dashboard' }, 500)
  }
})

paymentRoutes.get('/dashboard/disputes', requireAuth, async (c) => {
  try {
    const { env } = c
    const disputeService = new EscrowDisputeService(env.DB)
    
    const dashboard = await disputeService.getDisputeDashboard()

    return c.json({
      success: true,
      dashboard
    })

  } catch (error) {
    console.error('Get dispute dashboard error:', error)
    return c.json({ error: 'Failed to get dispute dashboard' }, 500)
  }
})

// Canadian Tax Reporting and Compliance Routes

// Get tax summary for a worker (for T4A reporting)
paymentRoutes.get('/tax/worker-summary/:workerId/:taxYear', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const workerId = parseInt(c.req.param('workerId'))
    const taxYear = parseInt(c.req.param('taxYear'))

    // Verify access (worker viewing own data, or admin)
    if (user.user_id !== workerId && user.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403)
    }

    // Get worker earnings and tax information for the tax year
    const earnings = await c.env.DB.prepare(`
      SELECT 
        SUM(we.gross_amount) as total_gross,
        SUM(we.platform_fee) as total_fees,
        SUM(we.net_amount) as total_net,
        COUNT(*) as total_jobs,
        u.province as worker_province,
        u.first_name, u.last_name, u.sin
      FROM worker_earnings we
      JOIN users u ON we.worker_id = u.id
      WHERE we.worker_id = ? AND we.tax_year = ?
      GROUP BY we.worker_id, u.province, u.first_name, u.last_name, u.sin
    `).bind(workerId, taxYear).first()

    // Get detailed tax breakdown
    const taxBreakdown = await c.env.DB.prepare(`
      SELECT 
        t.transaction_type,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      JOIN jobs j ON t.job_id = j.id
      WHERE t.worker_id = ? 
        AND t.transaction_type IN ('tax_gst', 'tax_pst', 'tax_hst')
        AND strftime('%Y', t.processed_at) = ?
        AND t.status = 'completed'
      GROUP BY t.transaction_type
    `).bind(workerId, taxYear.toString()).all()

    const taxSummary = {
      gst_collected: 0,
      pst_collected: 0,
      hst_collected: 0
    }

    if (taxBreakdown.results) {
      taxBreakdown.results.forEach(tax => {
        if (tax.transaction_type === 'tax_gst') taxSummary.gst_collected = parseFloat(tax.total_amount)
        if (tax.transaction_type === 'tax_pst') taxSummary.pst_collected = parseFloat(tax.total_amount)
        if (tax.transaction_type === 'tax_hst') taxSummary.hst_collected = parseFloat(tax.total_amount)
      })
    }

    return c.json({
      success: true,
      tax_year: taxYear,
      worker_info: {
        worker_id: workerId,
        name: earnings ? `${earnings.first_name} ${earnings.last_name}` : 'Unknown',
        province: earnings?.worker_province || 'Unknown',
        sin_on_file: earnings?.sin ? 'Yes' : 'No'
      },
      earnings_summary: {
        total_gross_earnings: earnings?.total_gross || 0,
        total_platform_fees: earnings?.total_fees || 0,
        total_net_earnings: earnings?.total_net || 0,
        total_jobs_completed: earnings?.total_jobs || 0
      },
      tax_summary,
      total_taxes_collected: taxSummary.gst_collected + taxSummary.pst_collected + taxSummary.hst_collected,
      compliance_notes: [
        'Worker receives gross earnings; platform handles tax collection',
        'T4A slip required if earnings exceed $500 CAD per year',
        'Taxes collected are remitted to CRA by platform',
        'Worker responsible for claiming business expenses on tax return'
      ]
    })

  } catch (error) {
    console.error('Get worker tax summary error:', error)
    return c.json({ error: 'Failed to get tax summary' }, 500)
  }
})

// Get platform tax remittance summary (Admin only)
paymentRoutes.get('/tax/platform-remittance/:taxYear/:province?', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    // Verify admin access
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const taxYear = parseInt(c.req.param('taxYear'))
    const province = c.req.param('province')

    let query = `
      SELECT 
        u.province,
        t.transaction_type,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT t.worker_id) as unique_workers,
        COUNT(DISTINCT t.job_id) as unique_jobs
      FROM transactions t
      JOIN users u ON t.worker_id = u.id
      WHERE t.transaction_type IN ('tax_gst', 'tax_pst', 'tax_hst')
        AND strftime('%Y', t.processed_at) = ?
        AND t.status = 'completed'
    `
    
    const params = [taxYear.toString()]
    
    if (province) {
      query += ` AND u.province = ?`
      params.push(province.toUpperCase())
    }
    
    query += ` GROUP BY u.province, t.transaction_type ORDER BY u.province, t.transaction_type`

    const remittanceData = await c.env.DB.prepare(query).bind(...params).all()

    // Organize data by province
    const provinceData = {}
    if (remittanceData.results) {
      remittanceData.results.forEach(item => {
        if (!provinceData[item.province]) {
          provinceData[item.province] = {
            gst: 0, pst: 0, hst: 0,
            total_transactions: 0,
            unique_workers: new Set(),
            unique_jobs: new Set()
          }
        }
        
        provinceData[item.province][item.transaction_type.replace('tax_', '')] = parseFloat(item.total_amount)
        provinceData[item.province].total_transactions += parseInt(item.transaction_count)
        provinceData[item.province].unique_workers.add(item.worker_id)
        provinceData[item.province].unique_jobs.add(item.job_id)
      })
    }

    // Convert Sets to counts
    Object.keys(provinceData).forEach(prov => {
      provinceData[prov].unique_workers = provinceData[prov].unique_workers.size
      provinceData[prov].unique_jobs = provinceData[prov].unique_jobs.size
      provinceData[prov].total_taxes = provinceData[prov].gst + provinceData[prov].pst + provinceData[prov].hst
    })

    return c.json({
      success: true,
      tax_year: taxYear,
      province_filter: province || 'All provinces',
      remittance_summary: provinceData,
      compliance_info: {
        gst_number: 'Platform GST/HST number required',
        remittance_schedule: 'Monthly/Quarterly based on revenue',
        filing_deadline: 'One month after reporting period',
        contact_cra: '1-800-959-5525'
      }
    })

  } catch (error) {
    console.error('Get platform remittance error:', error)
    return c.json({ error: 'Failed to get remittance data' }, 500)
  }
})

// Export tax data for accounting (Admin only)
paymentRoutes.get('/tax/export/:taxYear/:format', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    // Verify admin access
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const taxYear = parseInt(c.req.param('taxYear'))
    const format = c.req.param('format') // csv, json

    // Get detailed tax transaction data
    const taxData = await c.env.DB.prepare(`
      SELECT 
        t.id as transaction_id,
        t.job_id,
        j.title as job_title,
        t.client_id,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.province as client_province,
        t.worker_id,
        w.first_name as worker_first_name,
        w.last_name as worker_last_name,
        w.province as worker_province,
        t.transaction_type,
        t.amount,
        t.processed_at,
        t.description
      FROM transactions t
      JOIN jobs j ON t.job_id = j.id
      JOIN users c ON t.client_id = c.id
      JOIN users w ON t.worker_id = w.id
      WHERE t.transaction_type IN ('tax_gst', 'tax_pst', 'tax_hst', 'platform_fee')
        AND strftime('%Y', t.processed_at) = ?
        AND t.status = 'completed'
      ORDER BY t.processed_at DESC
    `).bind(taxYear.toString()).all()

    if (format === 'csv') {
      // Generate CSV format for accounting software import
      let csvContent = 'Transaction_ID,Job_ID,Job_Title,Client_Name,Client_Province,Worker_Name,Worker_Province,Transaction_Type,Amount,Date,Description\n'
      
      if (taxData.results) {
        taxData.results.forEach(row => {
          const clientName = `"${row.client_first_name} ${row.client_last_name}"`
          const workerName = `"${row.worker_first_name} ${row.worker_last_name}"`
          const jobTitle = `"${row.job_title}"`
          const description = `"${row.description}"`
          
          csvContent += `${row.transaction_id},${row.job_id},${jobTitle},${clientName},${row.client_province},${workerName},${row.worker_province},${row.transaction_type},${row.amount},${row.processed_at},${description}\n`
        })
      }

      c.header('Content-Type', 'text/csv')
      c.header('Content-Disposition', `attachment; filename="kwikr_tax_export_${taxYear}.csv"`)
      return c.body(csvContent)
    }

    return c.json({
      success: true,
      tax_year: taxYear,
      export_format: format,
      total_records: taxData.results?.length || 0,
      data: taxData.results || []
    })

  } catch (error) {
    console.error('Export tax data error:', error)
    return c.json({ error: 'Failed to export tax data' }, 500)
  }
})

// Admin Routes for Monitoring
paymentRoutes.post('/admin/monitoring/run-cycle', requireAuth, async (c) => {
  try {
    const { env } = c
    const user = c.get('user')
    
    // Verify admin access
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const monitoringService = new EscrowMonitoringService(env.DB)
    const stripe = getStripe(env.STRIPE_SECRET_KEY)
    const triggerService = new EscrowTriggerService(env.DB, stripe)
    const timelineService = new EscrowTimelineService(env.DB)
    const disputeService = new EscrowDisputeService(env.DB)

    // Run monitoring cycle
    const [monitoringResults, deadlineResults, disputeResults] = await Promise.all([
      monitoringService.runMonitoringCycle(),
      timelineService.processDeadlineReminders(),
      disputeService.processDisputeEscalations()
    ])

    return c.json({
      success: true,
      results: {
        monitoring: monitoringResults,
        deadlines_processed: 'completed',
        disputes_processed: 'completed'
      }
    })

  } catch (error) {
    console.error('Admin monitoring cycle error:', error)
    return c.json({ error: 'Failed to run monitoring cycle' }, 500)
  }
})

export default paymentRoutes