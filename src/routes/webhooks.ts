import { Hono } from 'hono'
import Stripe from 'stripe'

type Bindings = {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ENVIRONMENT: string;
}

export const webhookRoutes = new Hono<{ Bindings: Bindings }>()

// Initialize Stripe
const getStripe = (secretKey: string) => {
  return new Stripe(secretKey, {
    apiVersion: '2024-11-20.acacia',
    typescript: true
  })
}

// Stripe webhook handler
webhookRoutes.post('/stripe', async (c) => {
  try {
    const body = await c.req.text()
    const signature = c.req.header('stripe-signature')

    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400)
    }

    const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
    
    let event: Stripe.Event

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        c.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return c.json({ error: 'Invalid signature' }, 400)
    }

    console.log(`Received Stripe webhook: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, c.env)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, c.env)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, c.env)
        break

      case 'charge.dispute.created':
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute, c.env)
        // Also handle as invoice dispute for new system
        await handleDisputeCreated(event.data.object, c.env)
        break

      case 'charge.dispute.updated':
        await handleDisputeUpdated(event.data.object, c.env)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, c.env)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return c.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Handle successful payment intent (escrow held successfully)
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, env: Bindings) {
  try {
    const jobId = paymentIntent.metadata.job_id

    if (!jobId) {
      console.error('No job_id in payment intent metadata')
      return
    }

    // Update job escrow status
    await env.DB.prepare(`
      UPDATE jobs 
      SET escrow_status = 'held'
      WHERE stripe_payment_intent_id = ?
    `).bind(paymentIntent.id).run()

    // Update transaction status
    await env.DB.prepare(`
      UPDATE transactions 
      SET status = 'completed', processed_at = CURRENT_TIMESTAMP
      WHERE stripe_transaction_id = ? AND transaction_type = 'escrow_hold'
    `).bind(paymentIntent.id).run()

    // Create notification for worker
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (?, 'payment', 'Escrow Payment Received', 'Client has paid for the job and funds are held in escrow.', 'job', ?)
    `).bind(paymentIntent.metadata.worker_id, jobId).run()

    // Create notification for client
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (?, 'payment', 'Payment Confirmed', 'Your payment has been processed and held in escrow until job completion.', 'job', ?)
    `).bind(paymentIntent.metadata.client_id, jobId).run()

    console.log(`Payment intent succeeded for job ${jobId}`)

  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error)
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, env: Bindings) {
  try {
    const jobId = paymentIntent.metadata.job_id

    if (!jobId) {
      console.error('No job_id in payment intent metadata')
      return
    }

    // Update job escrow status
    await env.DB.prepare(`
      UPDATE jobs 
      SET escrow_status = 'failed'
      WHERE stripe_payment_intent_id = ?
    `).bind(paymentIntent.id).run()

    // Update transaction status
    await env.DB.prepare(`
      UPDATE transactions 
      SET status = 'failed', processed_at = CURRENT_TIMESTAMP
      WHERE stripe_transaction_id = ? AND transaction_type = 'escrow_hold'
    `).bind(paymentIntent.id).run()

    // Create notification for client
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (?, 'payment_failed', 'Payment Failed', 'Your payment could not be processed. Please try again or contact support.', 'job', ?)
    `).bind(paymentIntent.metadata.client_id, jobId).run()

    console.log(`Payment intent failed for job ${jobId}`)

  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error)
  }
}

// Handle canceled payment intent (refund)
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent, env: Bindings) {
  try {
    const jobId = paymentIntent.metadata.job_id

    if (!jobId) {
      console.error('No job_id in payment intent metadata')
      return
    }

    // Update job escrow status
    await env.DB.prepare(`
      UPDATE jobs 
      SET escrow_status = 'refunded'
      WHERE stripe_payment_intent_id = ?
    `).bind(paymentIntent.id).run()

    // Update transaction status
    await env.DB.prepare(`
      UPDATE transactions 
      SET status = 'cancelled', processed_at = CURRENT_TIMESTAMP
      WHERE stripe_transaction_id = ? AND transaction_type IN ('escrow_hold', 'escrow_release')
    `).bind(paymentIntent.id).run()

    // Create notification for client
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (?, 'refund', 'Payment Refunded', 'Your payment has been refunded due to job cancellation.', 'job', ?)
    `).bind(paymentIntent.metadata.client_id, jobId).run()

    // Create notification for worker
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (?, 'job_cancelled', 'Job Payment Cancelled', 'The job payment has been refunded to the client.', 'job', ?)
    `).bind(paymentIntent.metadata.worker_id, jobId).run()

    console.log(`Payment intent canceled/refunded for job ${jobId}`)

  } catch (error) {
    console.error('Error handling payment_intent.canceled:', error)
  }
}

// Handle charge disputes
async function handleChargeDisputeCreated(dispute: Stripe.Dispute, env: Bindings) {
  try {
    const charge = dispute.charge as Stripe.Charge
    const paymentIntent = charge.payment_intent as string

    // Find the job associated with this payment intent
    const job = await env.DB.prepare(`
      SELECT * FROM jobs WHERE stripe_payment_intent_id = ?
    `).bind(paymentIntent).first()

    if (!job) {
      console.error('No job found for disputed payment intent:', paymentIntent)
      return
    }

    // Create dispute record
    await env.DB.prepare(`
      INSERT INTO disputes (
        job_id, raised_by, dispute_reason, description, status
      ) VALUES (?, ?, 'payment_dispute', ?, 'investigating')
    `).bind(
      job.id,
      job.client_id,
      `Stripe dispute: ${dispute.reason}. Amount: $${dispute.amount / 100}`,
    ).run()

    // Update job status to disputed
    await env.DB.prepare(`
      UPDATE jobs SET status = 'disputed' WHERE id = ?
    `).bind(job.id).run()

    // Create notifications
    await env.DB.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
      VALUES (?, 'dispute', 'Payment Dispute Created', 'A payment dispute has been filed for this job. Admin review required.', 'job', ?)
    `).bind(job.assigned_worker_id, job.id).run()

    console.log(`Dispute created for job ${job.id}`)

  } catch (error) {
    console.error('Error handling charge.dispute.created:', error)
  }
}

// Handle invoice payment succeeded (for worker invoices)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, env: Bindings) {
  try {
    const invoiceNumber = invoice.metadata?.invoice_number

    if (!invoiceNumber) {
      console.log('No invoice_number in metadata, skipping')
      return
    }

    // Update worker invoice status
    await env.DB.prepare(`
      UPDATE worker_invoices 
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP
      WHERE invoice_number = ?
    `).bind(invoiceNumber).run()

    // Get invoice details for notifications
    const workerInvoice = await env.DB.prepare(`
      SELECT * FROM worker_invoices WHERE invoice_number = ?
    `).bind(invoiceNumber).first()

    if (workerInvoice) {
      // Create notification for worker
      await env.DB.prepare(`
        INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
        VALUES (?, 'invoice_paid', 'Invoice Paid', 'Your invoice has been paid successfully.', 'invoice', ?)
      `).bind(workerInvoice.worker_id, workerInvoice.id).run()

      // Create notification for client
      await env.DB.prepare(`
        INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
        VALUES (?, 'payment', 'Invoice Payment Processed', 'Your invoice payment has been processed successfully.', 'invoice', ?)
      `).bind(workerInvoice.client_id, workerInvoice.id).run()
    }

    console.log(`Invoice payment succeeded: ${invoiceNumber}`)

  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error)
  }
}

// Handle Stripe dispute events (chargebacks, disputes, etc.)
async function handleDisputeCreated(dispute: any, env: Bindings) {
  try {
    console.log('Processing Stripe dispute:', dispute.id)

    // Import the dispute service
    const { InvoiceDisputeService } = await import('../services/invoice-dispute.js')
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true
    })
    const disputeService = new InvoiceDisputeService(env.DB, stripe)

    // Process the Stripe dispute
    const result = await disputeService.handleStripeDispute(dispute)

    if (result.success) {
      console.log(`Successfully processed Stripe dispute: ${dispute.id} -> Invoice Dispute ID: ${result.dispute_id}`)
    } else {
      console.error(`Failed to process Stripe dispute ${dispute.id}:`, result.message)
    }

  } catch (error) {
    console.error('Error handling dispute.created:', error)
  }
}

// Handle dispute status updates
async function handleDisputeUpdated(dispute: any, env: Bindings) {
  try {
    console.log('Processing Stripe dispute update:', dispute.id, dispute.status)

    // Find the corresponding invoice dispute
    const disputeMapping = await env.DB.prepare(`
      SELECT * FROM stripe_dispute_mappings WHERE stripe_dispute_id = ?
    `).bind(dispute.id).first()

    if (disputeMapping) {
      // Update the mapping with latest Stripe data
      await env.DB.prepare(`
        UPDATE stripe_dispute_mappings 
        SET stripe_status = ?, stripe_outcome = ?, updated_at = datetime('now'), 
            stripe_metadata = ?
        WHERE stripe_dispute_id = ?
      `).bind(
        dispute.status,
        dispute.outcome || null,
        JSON.stringify(dispute),
        dispute.id
      ).run()

      // Update invoice dispute status based on Stripe status
      let newStatus = 'open'
      if (dispute.status === 'won') {
        newStatus = 'resolved'
      } else if (dispute.status === 'lost') {
        newStatus = 'closed'
      } else if (dispute.status === 'warning_needs_response') {
        newStatus = 'awaiting_response'
      }

      if (newStatus !== 'open') {
        await env.DB.prepare(`
          UPDATE invoice_disputes 
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(newStatus, disputeMapping.invoice_dispute_id).run()

        // Add timeline entry
        await env.DB.prepare(`
          INSERT INTO invoice_dispute_timeline (
            dispute_id, user_id, action_type, old_value, new_value,
            description, is_system_action, created_at
          ) VALUES (?, NULL, 'status_changed', 'investigating', ?, ?, TRUE, datetime('now'))
        `).bind(
          disputeMapping.invoice_dispute_id,
          newStatus,
          `Stripe dispute ${dispute.status}: ${dispute.outcome || 'Status updated'}`
        ).run()
      }

      console.log(`Updated dispute mapping for ${dispute.id}: ${dispute.status}`)
    }

  } catch (error) {
    console.error('Error handling dispute update:', error)
  }
}

export default webhookRoutes