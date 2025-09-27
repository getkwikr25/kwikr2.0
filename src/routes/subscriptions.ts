import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const subscriptionRoutes = new Hono<{ Bindings: Bindings }>()

// Middleware to verify authentication
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
    return c.json({ error: 'Authentication required', expired: true }, 401)
  }
  
  try {
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, u.role, u.first_name, u.last_name, u.email, u.is_verified
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND u.is_active = 1
    `).bind(sessionToken).first()
    
    if (!session) {
      return c.json({ error: 'Invalid or expired session', expired: true }, 401)
    }
    
    c.set('user', session)
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
}

// Middleware to verify admin access
const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }
  await next()
}

// Get all subscription plans (public endpoint)
subscriptionRoutes.get('/plans', async (c) => {
  try {
    const plans = await c.env.DB.prepare(`
      SELECT 
        sp.*,
        (SELECT COUNT(*) FROM worker_subscriptions ws WHERE ws.plan_id = sp.id AND ws.subscription_status = 'active') as active_subscribers
      FROM subscription_plans sp
      WHERE sp.is_active = 1
      ORDER BY sp.display_order, sp.monthly_price
    `).all()

    return c.json({ 
      plans: plans.results || [],
      total: plans.results?.length || 0
    })
  } catch (error) {
    console.error('Error fetching subscription plans:', error)
    return c.json({ error: 'Failed to fetch subscription plans' }, 500)
  }
})

// Get plan features for a specific plan
subscriptionRoutes.get('/plans/:planId/features', async (c) => {
  try {
    const planId = c.req.param('planId')
    
    const features = await c.env.DB.prepare(`
      SELECT spf.*, sp.plan_name
      FROM subscription_plan_features spf
      JOIN subscription_plans sp ON spf.plan_id = sp.id
      WHERE spf.plan_id = ? AND spf.is_active = 1
      ORDER BY spf.display_order
    `).bind(planId).all()

    return c.json({ 
      features: features.results || [],
      total: features.results?.length || 0
    })
  } catch (error) {
    console.error('Error fetching plan features:', error)
    return c.json({ error: 'Failed to fetch plan features' }, 500)
  }
})

// Get current user's subscription (worker only)
subscriptionRoutes.get('/current', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'worker') {
      return c.json({ error: 'Only workers can have subscriptions' }, 403)
    }

    const subscription = await c.env.DB.prepare(`
      SELECT 
        ws.*,
        sp.plan_name,
        sp.plan_slug,
        sp.description as plan_description,
        sp.monthly_price as current_plan_monthly_price,
        sp.annual_price as current_plan_annual_price
      FROM worker_subscriptions ws
      JOIN subscription_plans sp ON ws.plan_id = sp.id
      WHERE ws.user_id = ? AND ws.subscription_status IN ('active', 'cancelled')
      ORDER BY ws.created_at DESC
      LIMIT 1
    `).bind(user.user_id).first()

    if (!subscription) {
      return c.json({ error: 'No subscription found' }, 404)
    }

    // Get plan features
    const features = await c.env.DB.prepare(`
      SELECT feature_key, feature_name, feature_value, feature_type
      FROM subscription_plan_features
      WHERE plan_id = ? AND is_active = 1
      ORDER BY display_order
    `).bind(subscription.plan_id).all()

    return c.json({ 
      subscription,
      features: features.results || []
    })
  } catch (error) {
    console.error('Error fetching current subscription:', error)
    return c.json({ error: 'Failed to fetch subscription' }, 500)
  }
})

// Subscribe to a plan or change subscription
// Simple subscription endpoint for worker plan selection
subscriptionRoutes.post('/subscribe', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { plan_id, billing_cycle = 'monthly' } = await c.req.json()
    
    if (user.role !== 'worker') {
      return c.json({ error: 'Only workers can subscribe to plans' }, 403)
    }

    // Validate plan exists and is active
    const plan = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1
    `).bind(plan_id).first()

    if (!plan) {
      return c.json({ error: 'Invalid or inactive plan' }, 400)
    }

    // Check if worker already has active subscription
    const existingSubscription = await c.env.DB.prepare(`
      SELECT * FROM worker_subscriptions 
      WHERE user_id = ? AND subscription_status = 'active'
    `).bind(user.user_id).first()

    const now = new Date().toISOString()
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    if (existingSubscription) {
      // Update existing subscription
      await c.env.DB.prepare(`
        UPDATE worker_subscriptions
        SET 
          plan_id = ?,
          billing_cycle = ?,
          current_monthly_price = ?,
          current_annual_price = ?,
          current_period_start = ?,
          current_period_end = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        plan_id,
        billing_cycle,
        plan.monthly_price,
        plan.annual_price,
        now,
        nextMonth,
        now,
        existingSubscription.id
      ).run()
    } else {
      // Create new subscription
      await c.env.DB.prepare(`
        INSERT INTO worker_subscriptions (
          user_id, plan_id, subscription_status, billing_cycle,
          current_monthly_price, current_annual_price,
          subscription_start_date, current_period_start, current_period_end,
          cancel_at_period_end, grandfathered_pricing, created_at, updated_at
        ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
      `).bind(
        user.user_id, plan_id, billing_cycle, plan.monthly_price, plan.annual_price,
        now, now, nextMonth, now, now
      ).run()
    }

    // Record subscription history
    await c.env.DB.prepare(`
      INSERT INTO subscription_history (
        user_id, old_plan_id, new_plan_id, change_type,
        old_monthly_price, new_monthly_price, effective_date, created_at
      ) VALUES (?, ?, ?, 'new', 0, ?, ?, ?)
    `).bind(
      user.user_id, null, plan_id, plan.monthly_price, now, now
    ).run()

    return c.json({
      success: true,
      message: 'Subscription activated successfully',
      plan_name: plan.plan_name,
      monthly_price: plan.monthly_price
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return c.json({ error: 'Failed to activate subscription' }, 500)
  }
})

subscriptionRoutes.post('/subscribe/:planId', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const planId = parseInt(c.req.param('planId'))
    const { billing_cycle = 'monthly', payment_method = null } = await c.req.json()
    
    if (user.role !== 'worker') {
      return c.json({ error: 'Only workers can subscribe to plans' }, 403)
    }

    // Validate plan exists and is active
    const plan = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1
    `).bind(planId).first()

    if (!plan) {
      return c.json({ error: 'Invalid or inactive plan' }, 400)
    }

    // Get current subscription
    const currentSubscription = await c.env.DB.prepare(`
      SELECT * FROM worker_subscriptions 
      WHERE user_id = ? AND subscription_status IN ('active', 'cancelled')
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(user.user_id).first()

    const now = new Date().toISOString()
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    if (currentSubscription) {
      // Update existing subscription
      await c.env.DB.prepare(`
        UPDATE worker_subscriptions
        SET 
          plan_id = ?,
          subscription_status = 'active',
          billing_cycle = ?,
          current_monthly_price = ?,
          current_annual_price = ?,
          current_period_start = ?,
          current_period_end = ?,
          cancel_at_period_end = 0,
          cancelled_at = NULL,
          payment_method = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        planId,
        billing_cycle,
        plan.monthly_price,
        plan.annual_price,
        now,
        nextMonth,
        payment_method,
        now,
        currentSubscription.id
      ).run()

      // Record subscription change in history
      await c.env.DB.prepare(`
        INSERT INTO subscription_history (
          user_id, old_plan_id, new_plan_id, old_monthly_price, new_monthly_price,
          change_type, effective_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.user_id,
        currentSubscription.plan_id,
        planId,
        currentSubscription.current_monthly_price,
        plan.monthly_price,
        currentSubscription.plan_id === planId ? 'reactivated' : 
        plan.monthly_price > currentSubscription.current_monthly_price ? 'upgrade' : 'downgrade',
        now
      ).run()
    } else {
      // Create new subscription
      await c.env.DB.prepare(`
        INSERT INTO worker_subscriptions (
          user_id, plan_id, subscription_status, billing_cycle,
          current_monthly_price, current_annual_price, current_period_start,
          current_period_end, payment_method
        ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?)
      `).bind(
        user.user_id,
        planId,
        billing_cycle,
        plan.monthly_price,
        plan.annual_price,
        now,
        nextMonth,
        payment_method
      ).run()

      // Record new subscription in history
      await c.env.DB.prepare(`
        INSERT INTO subscription_history (
          user_id, new_plan_id, new_monthly_price, change_type, effective_date
        ) VALUES (?, ?, ?, 'new', ?)
      `).bind(user.user_id, planId, plan.monthly_price, now).run()
    }

    return c.json({ 
      success: true,
      message: `Successfully subscribed to ${plan.plan_name}`,
      plan_name: plan.plan_name,
      monthly_price: plan.monthly_price,
      billing_cycle
    })
  } catch (error) {
    console.error('Error processing subscription:', error)
    return c.json({ error: 'Failed to process subscription' }, 500)
  }
})

// Cancel subscription
subscriptionRoutes.post('/cancel', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { cancel_immediately = false, cancellation_reason = '' } = await c.req.json()
    
    if (user.role !== 'worker') {
      return c.json({ error: 'Only workers can cancel subscriptions' }, 403)
    }

    const subscription = await c.env.DB.prepare(`
      SELECT * FROM worker_subscriptions 
      WHERE user_id = ? AND subscription_status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(user.user_id).first()

    if (!subscription) {
      return c.json({ error: 'No active subscription found' }, 404)
    }

    const now = new Date().toISOString()

    if (cancel_immediately) {
      // Cancel immediately and downgrade to Pay-as-you-go
      await c.env.DB.prepare(`
        UPDATE worker_subscriptions
        SET 
          plan_id = 1,
          subscription_status = 'active',
          current_monthly_price = 0,
          current_annual_price = 0,
          cancelled_at = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(now, now, subscription.id).run()
    } else {
      // Cancel at period end
      await c.env.DB.prepare(`
        UPDATE worker_subscriptions
        SET 
          cancel_at_period_end = 1,
          cancelled_at = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(now, now, subscription.id).run()
    }

    // Record cancellation in history
    await c.env.DB.prepare(`
      INSERT INTO subscription_history (
        user_id, old_plan_id, new_plan_id, old_monthly_price, new_monthly_price,
        change_type, change_reason, effective_date
      ) VALUES (?, ?, ?, ?, ?, 'cancelled', ?, ?)
    `).bind(
      user.user_id,
      subscription.plan_id,
      cancel_immediately ? 1 : subscription.plan_id,
      subscription.current_monthly_price,
      cancel_immediately ? 0 : subscription.current_monthly_price,
      cancellation_reason,
      now
    ).run()

    return c.json({ 
      success: true,
      message: cancel_immediately ? 
        'Subscription cancelled immediately and downgraded to Pay-as-you-go' :
        'Subscription will be cancelled at the end of the current billing period',
      cancel_immediately
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return c.json({ error: 'Failed to cancel subscription' }, 500)
  }
})

// Get subscription usage analytics for current user
subscriptionRoutes.get('/usage', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const { months = 6 } = c.req.query()
    
    if (user.role !== 'worker') {
      return c.json({ error: 'Only workers can access usage analytics' }, 403)
    }

    const usage = await c.env.DB.prepare(`
      SELECT 
        usage_month,
        leads_generated,
        jobs_completed,
        categories_used,
        search_impressions,
        profile_views,
        messages_sent,
        booking_requests,
        revenue_generated,
        platform_fees_paid,
        sp.plan_name
      FROM subscription_usage_analytics sua
      JOIN subscription_plans sp ON sua.plan_id = sp.id
      WHERE sua.user_id = ?
      ORDER BY sua.usage_month DESC
      LIMIT ?
    `).bind(user.user_id, parseInt(months as string)).all()

    return c.json({ 
      usage: usage.results || [],
      total_months: usage.results?.length || 0
    })
  } catch (error) {
    console.error('Error fetching usage analytics:', error)
    return c.json({ error: 'Failed to fetch usage analytics' }, 500)
  }
})

// Admin: Get all subscriptions
subscriptionRoutes.get('/admin/subscriptions', requireAuth, requireAdmin, async (c) => {
  try {
    const { page = '1', limit = '20', plan_id, status, search } = c.req.query()
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string)
    
    let whereConditions = ['1 = 1']
    let params: any[] = []
    
    if (plan_id) {
      whereConditions.push('ws.plan_id = ?')
      params.push(parseInt(plan_id as string))
    }
    
    if (status) {
      whereConditions.push('ws.subscription_status = ?')
      params.push(status)
    }
    
    if (search) {
      whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    const subscriptions = await c.env.DB.prepare(`
      SELECT 
        ws.*,
        sp.plan_name,
        sp.plan_slug,
        u.first_name,
        u.last_name,
        u.email,
        u.province,
        u.city
      FROM worker_subscriptions ws
      JOIN subscription_plans sp ON ws.plan_id = sp.id
      JOIN users u ON ws.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ws.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, parseInt(limit as string), offset).all()

    // Get total count
    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM worker_subscriptions ws
      JOIN users u ON ws.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `).bind(...params).first()

    return c.json({
      subscriptions: subscriptions.results || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalResult?.total || 0,
        pages: Math.ceil((totalResult?.total || 0) / parseInt(limit as string))
      }
    })
  } catch (error) {
    console.error('Error fetching admin subscriptions:', error)
    return c.json({ error: 'Failed to fetch subscriptions' }, 500)
  }
})

// Admin: Update subscription plan pricing
subscriptionRoutes.post('/admin/plans/:planId/pricing', requireAuth, requireAdmin, async (c) => {
  try {
    const user = c.get('user')
    const planId = parseInt(c.req.param('planId'))
    const { monthly_price, annual_price, grandfather_existing = true, change_notes = '' } = await c.req.json()
    
    // Get current plan
    const currentPlan = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans WHERE id = ?
    `).bind(planId).first()

    if (!currentPlan) {
      return c.json({ error: 'Plan not found' }, 404)
    }

    const now = new Date().toISOString()

    // Record price change in history
    await c.env.DB.prepare(`
      INSERT INTO subscription_price_history (
        plan_id, old_monthly_price, new_monthly_price, old_annual_price, new_annual_price,
        change_effective_date, grandfather_existing_users, admin_user_id, change_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      planId,
      currentPlan.monthly_price,
      monthly_price,
      currentPlan.annual_price,
      annual_price,
      now,
      grandfather_existing ? 1 : 0,
      user.user_id,
      change_notes
    ).run()

    // Update plan pricing
    await c.env.DB.prepare(`
      UPDATE subscription_plans
      SET monthly_price = ?, annual_price = ?, updated_at = ?
      WHERE id = ?
    `).bind(monthly_price, annual_price || null, now, planId).run()

    // If not grandfathering, update existing subscriptions
    if (!grandfather_existing) {
      await c.env.DB.prepare(`
        UPDATE worker_subscriptions
        SET 
          current_monthly_price = ?,
          current_annual_price = ?,
          grandfathered_pricing = 0,
          updated_at = ?
        WHERE plan_id = ? AND subscription_status = 'active'
      `).bind(monthly_price, annual_price || null, now, planId).run()
    } else {
      // Mark existing subscriptions as grandfathered
      await c.env.DB.prepare(`
        UPDATE worker_subscriptions
        SET grandfathered_pricing = 1, updated_at = ?
        WHERE plan_id = ? AND subscription_status = 'active'
      `).bind(now, planId).run()
    }

    return c.json({
      success: true,
      message: `Plan pricing updated successfully. ${grandfather_existing ? 'Existing subscribers have been grandfathered.' : 'All subscribers updated to new pricing.'}`,
      old_monthly_price: currentPlan.monthly_price,
      new_monthly_price: monthly_price,
      grandfathered: grandfather_existing
    })
  } catch (error) {
    console.error('Error updating plan pricing:', error)
    return c.json({ error: 'Failed to update plan pricing' }, 500)
  }
})

// Admin: Get subscription analytics
subscriptionRoutes.get('/admin/analytics', requireAuth, requireAdmin, async (c) => {
  try {
    // Get subscription distribution
    const planDistribution = await c.env.DB.prepare(`
      SELECT 
        sp.plan_name,
        sp.monthly_price,
        COUNT(ws.id) as subscriber_count,
        SUM(ws.current_monthly_price) as monthly_revenue
      FROM subscription_plans sp
      LEFT JOIN worker_subscriptions ws ON sp.id = ws.plan_id AND ws.subscription_status = 'active'
      GROUP BY sp.id, sp.plan_name, sp.monthly_price
      ORDER BY sp.display_order
    `).all()

    // Get monthly trends
    const monthlyTrends = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at, 'start of month') as month,
        COUNT(*) as new_subscriptions,
        SUM(current_monthly_price) as monthly_revenue
      FROM worker_subscriptions
      WHERE created_at >= date('now', '-12 months')
      GROUP BY DATE(created_at, 'start of month')
      ORDER BY month DESC
    `).all()

    // Get churn analytics
    const churnAnalytics = await c.env.DB.prepare(`
      SELECT 
        COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN cancel_at_period_end = 1 THEN 1 END) as scheduled_cancellations,
        COUNT(CASE WHEN grandfathered_pricing = 1 THEN 1 END) as grandfathered_count
      FROM worker_subscriptions
    `).first()

    // Get revenue analytics
    const revenueAnalytics = await c.env.DB.prepare(`
      SELECT 
        SUM(current_monthly_price) as total_monthly_revenue,
        AVG(current_monthly_price) as average_monthly_price,
        COUNT(*) as total_active_subscriptions
      FROM worker_subscriptions
      WHERE subscription_status = 'active'
    `).first()

    return c.json({
      plan_distribution: planDistribution.results || [],
      monthly_trends: monthlyTrends.results || [],
      churn_analytics: churnAnalytics || {},
      revenue_analytics: revenueAnalytics || {},
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching subscription analytics:', error)
    return c.json({ error: 'Failed to fetch subscription analytics' }, 500)
  }
})
