import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

// Types for Cloudflare D1
type Bindings = {
  DB: D1Database
}

const clientRoutes = new Hono<{ Bindings: Bindings }>()

// Middleware to require client authentication
const requireClientAuth = async (c: any, next: any) => {
  // Try to get session token from multiple sources:
  // 1. Authorization header (for API requests)
  // 2. Cookie (for dashboard pages)
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

  // Verify session and get user
  const session = await c.env.DB.prepare(`
    SELECT us.*, u.id as user_id, u.email, u.role, u.first_name, u.last_name 
    FROM user_sessions us 
    JOIN users u ON us.user_id = u.id 
    WHERE us.session_token = ? AND us.expires_at > datetime('now') AND u.role = 'client'
  `).bind(sessionToken).first()

  if (!session) {
    return c.json({ error: 'Invalid session or not a client' }, 401)
  }

  c.set('user', session)
  await next()
}

// Schema for job creation/update
const jobSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  category_id: z.number().int().positive(),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  location_province: z.string().min(2).max(3),
  location_city: z.string().min(2).max(100),
  location_address: z.string().max(500).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  start_date: z.string().optional(), // ISO date string
  expected_completion: z.string().optional(), // ISO date string
})

// Get client's jobs
clientRoutes.get('/jobs', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50)
    const offset = (page - 1) * limit

    const jobs = await c.env.DB.prepare(`
      SELECT j.*, jc.name as category_name, jc.icon_class as category_icon,
             (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as bid_count,
             (SELECT COUNT(*) FROM bids WHERE job_id = j.id AND status = 'pending') as pending_bids
      FROM jobs j
      LEFT JOIN job_categories jc ON j.category_id = jc.id
      WHERE j.client_id = ?
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.user_id, limit, offset).all()

    const total = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE client_id = ?
    `).bind(user.user_id).first()

    return c.json({
      jobs: jobs.results || [],
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        pages: Math.ceil((total?.count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Get jobs error:', error)
    return c.json({ error: 'Failed to fetch jobs' }, 500)
  }
})

// Get specific job details
clientRoutes.get('/jobs/:id', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const jobId = c.req.param('id')

    const job = await c.env.DB.prepare(`
      SELECT j.*, jc.name as category_name, jc.icon_class as category_icon
      FROM jobs j
      LEFT JOIN job_categories jc ON j.category_id = jc.id
      WHERE j.id = ? AND j.client_id = ?
    `).bind(jobId, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    // Get bids for this job
    const bids = await c.env.DB.prepare(`
      SELECT b.*, u.first_name, u.last_name, u.email, up.bio,
             (SELECT AVG(rating) FROM reviews WHERE reviewee_id = b.worker_id) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE reviewee_id = b.worker_id) as review_count
      FROM bids b
      JOIN users u ON b.worker_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE b.job_id = ?
      ORDER BY b.submitted_at DESC
    `).bind(jobId).all()

    return c.json({
      job,
      bids: bids.results || []
    })
  } catch (error) {
    console.error('Get job error:', error)
    return c.json({ error: 'Failed to fetch job' }, 500)
  }
})

// Create new job
clientRoutes.post('/jobs', requireClientAuth, zValidator('json', jobSchema), async (c) => {
  try {
    const user = c.get('user')
    const jobData = c.req.valid('json')

    const result = await c.env.DB.prepare(`
      INSERT INTO jobs (
        client_id, title, description, category_id, budget_min, budget_max,
        location_province, location_city, location_address, urgency, 
        start_date, expected_completion, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
    `).bind(
      user.user_id,
      jobData.title,
      jobData.description,
      jobData.category_id,
      jobData.budget_min || null,
      jobData.budget_max || null,
      jobData.location_province,
      jobData.location_city,
      jobData.location_address || null,
      jobData.urgency,
      jobData.start_date || null,
      jobData.expected_completion || null
    ).run()

    return c.json({
      message: 'Job created successfully',
      job_id: result.meta.last_row_id
    }, 201)
  } catch (error) {
    console.error('Create job error:', error)
    return c.json({ error: 'Failed to create job' }, 500)
  }
})

// Update job
clientRoutes.put('/jobs/:id', requireClientAuth, zValidator('json', jobSchema.partial()), async (c) => {
  try {
    const user = c.get('user')
    const jobId = c.req.param('id')
    const updates = c.req.valid('json')

    // Check if job exists and belongs to client
    const job = await c.env.DB.prepare(`
      SELECT id, status FROM jobs WHERE id = ? AND client_id = ?
    `).bind(jobId, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    // Can't update jobs that are in progress or completed
    if (job.status === 'in_progress' || job.status === 'completed') {
      return c.json({ error: 'Cannot update job in current status' }, 400)
    }

    // Build dynamic update query
    const fields = []
    const values = []
    
    if (updates.title) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.description) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.category_id) {
      fields.push('category_id = ?')
      values.push(updates.category_id)
    }
    if (updates.budget_min !== undefined) {
      fields.push('budget_min = ?')
      values.push(updates.budget_min)
    }
    if (updates.budget_max !== undefined) {
      fields.push('budget_max = ?')
      values.push(updates.budget_max)
    }
    if (updates.urgency) {
      fields.push('urgency = ?')
      values.push(updates.urgency)
    }

    if (fields.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    fields.push('updated_at = datetime(\'now\')')
    values.push(jobId, user.user_id)

    await c.env.DB.prepare(`
      UPDATE jobs SET ${fields.join(', ')} 
      WHERE id = ? AND client_id = ?
    `).bind(...values).run()

    return c.json({ message: 'Job updated successfully' })
  } catch (error) {
    console.error('Update job error:', error)
    return c.json({ error: 'Failed to update job' }, 500)
  }
})

// Delete/cancel job
clientRoutes.delete('/jobs/:id', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const jobId = c.req.param('id')

    // Check if job exists and can be deleted
    const job = await c.env.DB.prepare(`
      SELECT id, status FROM jobs WHERE id = ? AND client_id = ?
    `).bind(jobId, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    // Can only delete/cancel jobs that haven't started
    if (job.status === 'in_progress' || job.status === 'completed') {
      return c.json({ error: 'Cannot delete job in current status' }, 400)
    }

    // Update status to cancelled instead of deleting
    await c.env.DB.prepare(`
      UPDATE jobs SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ? AND client_id = ?
    `).bind(jobId, user.user_id).run()

    return c.json({ message: 'Job cancelled successfully' })
  } catch (error) {
    console.error('Cancel job error:', error)
    return c.json({ error: 'Failed to cancel job' }, 500)
  }
})

// Get job categories
clientRoutes.get('/job-categories', async (c) => {
  try {
    const categories = await c.env.DB.prepare(`
      SELECT * FROM job_categories WHERE is_active = 1 ORDER BY name
    `).all()

    return c.json({
      categories: categories.results || []
    })
  } catch (error) {
    console.error('Get categories error:', error)
    return c.json({ error: 'Failed to fetch categories' }, 500)
  }
})

// Search workers
clientRoutes.get('/workers/search', async (c) => {
  try {
    const category = c.req.query('category')
    const location = c.req.query('location')
    const province = c.req.query('province')
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '12'), 50)
    const offset = (page - 1) * limit

    let whereConditions = ['u.role = ?', 'u.is_active = 1']
    let values = ['worker']

    if (province) {
      whereConditions.push('u.province = ?')
      values.push(province)
    }

    if (location) {
      whereConditions.push('u.city LIKE ?')
      values.push(`%${location}%`)
    }

    values.push(limit, offset)

    const workers = await c.env.DB.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.province, u.city,
             up.bio, up.years_in_business as experience_years, up.profile_image_url,
             (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as review_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY avg_rating DESC NULLS LAST, u.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...values).all()

    return c.json({
      workers: workers.results || [],
      pagination: {
        page,
        limit,
        total: workers.results?.length || 0,
        pages: 1
      }
    })
  } catch (error) {
    console.error('Search workers error:', error)
    return c.json({ error: 'Failed to search workers' }, 500)
  }
})

// Get worker profile
clientRoutes.get('/workers/:id', async (c) => {
  try {
    const workerId = c.req.param('id')

    const worker = await c.env.DB.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.province, u.city,
             up.bio, up.years_in_business as experience_years, up.profile_image_url,
             (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as review_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ? AND u.role = 'worker' AND u.is_active = 1
    `).bind(workerId).first()

    if (!worker) {
      return c.json({ error: 'Worker not found' }, 404)
    }

    // Get worker services
    const services = await c.env.DB.prepare(`
      SELECT ws.service_category as name, ws.hourly_rate as base_price, ws.description,
             jc.icon_class
      FROM worker_services ws
      LEFT JOIN job_categories jc ON jc.name = ws.service_category
      WHERE ws.user_id = ? AND ws.is_available = 1
    `).bind(workerId).all()

    // Get recent reviews
    const reviews = await c.env.DB.prepare(`
      SELECT r.rating, r.review_text, r.created_at,
             u.first_name as client_first_name
      FROM reviews r
      JOIN users u ON r.client_id = u.id
      WHERE r.worker_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5
    `).bind(workerId).all()

    return c.json({
      worker,
      services: services.results || [],
      reviews: reviews.results || []
    })
  } catch (error) {
    console.error('Get worker error:', error)
    return c.json({ error: 'Failed to fetch worker' }, 500)
  }
})

// ===== CLIENT PROFILE MANAGEMENT =====

// Get client profile
clientRoutes.get('/profile', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const profile = await c.env.DB.prepare(`
      SELECT u.*, p.bio, p.profile_image_url, p.address_line1, p.address_line2, p.postal_code,
             p.date_of_birth, p.emergency_contact_name, p.emergency_contact_phone,
             p.company_name, p.company_description, p.company_logo_url, p.website_url
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).bind(user.user_id).first()
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    return c.json({ profile })
  } catch (error) {
    console.error('Get client profile error:', error)
    return c.json({ error: 'Failed to get profile' }, 500)
  }
})

// Update client profile
clientRoutes.put('/profile', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const data = await c.req.json()
    const {
      first_name = '',
      last_name = '',
      phone = null,
      province = null,
      city = null,
      bio = null,
      profile_image_url = null,
      address_line1 = null,
      address_line2 = null,
      postal_code = null,
      emergency_contact_name = null,
      emergency_contact_phone = null,
      company_name = null,
      company_description = null,
      company_logo_url = null,
      website_url = null
    } = data

    // Update user table
    await c.env.DB.prepare(`
      UPDATE users SET 
        first_name = ?, last_name = ?, phone = ?, province = ?, city = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(first_name, last_name, phone, province, city, user.user_id).run()

    // Update or insert profile
    const existingProfile = await c.env.DB.prepare(`
      SELECT id FROM user_profiles WHERE user_id = ?
    `).bind(user.user_id).first()

    if (existingProfile) {
      await c.env.DB.prepare(`
        UPDATE user_profiles SET
          bio = ?, profile_image_url = ?, address_line1 = ?, address_line2 = ?, postal_code = ?,
          emergency_contact_name = ?, emergency_contact_phone = ?, company_name = ?, 
          company_description = ?, company_logo_url = ?, website_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        bio, profile_image_url, address_line1, address_line2, postal_code,
        emergency_contact_name, emergency_contact_phone, company_name,
        company_description, company_logo_url, website_url, user.user_id
      ).run()
    } else {
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (
          user_id, bio, profile_image_url, address_line1, address_line2, postal_code,
          emergency_contact_name, emergency_contact_phone, company_name, 
          company_description, company_logo_url, website_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.user_id, bio, profile_image_url, address_line1, address_line2, postal_code,
        emergency_contact_name, emergency_contact_phone, company_name,
        company_description, company_logo_url, website_url
      ).run()
    }

    return c.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update client profile error:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Accept bid
clientRoutes.post('/bids/:id/accept', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const bidId = c.req.param('id')

    // Verify bid belongs to client's job
    const bid = await c.env.DB.prepare(`
      SELECT b.*, j.client_id, j.title as job_title
      FROM bids b
      JOIN jobs j ON b.job_id = j.id
      WHERE b.id = ? AND j.client_id = ? AND b.status = 'pending'
    `).bind(bidId, user.user_id).first()

    if (!bid) {
      return c.json({ error: 'Bid not found or already processed' }, 404)
    }

    // Update bid status and job assignment
    await c.env.DB.prepare(`
      UPDATE bids SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(bidId).run()

    await c.env.DB.prepare(`
      UPDATE jobs SET status = 'assigned', assigned_worker_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(bid.worker_id, bid.job_id).run()

    // Decline all other bids for this job
    await c.env.DB.prepare(`
      UPDATE bids SET status = 'declined', updated_at = CURRENT_TIMESTAMP 
      WHERE job_id = ? AND id != ? AND status = 'pending'
    `).bind(bid.job_id, bidId).run()

    return c.json({ success: true, message: 'Bid accepted successfully' })
  } catch (error) {
    console.error('Accept bid error:', error)
    return c.json({ error: 'Failed to accept bid' }, 500)
  }
})

// Decline bid
clientRoutes.post('/bids/:id/decline', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const bidId = c.req.param('id')

    // Verify bid belongs to client's job
    const bid = await c.env.DB.prepare(`
      SELECT b.*, j.client_id
      FROM bids b
      JOIN jobs j ON b.job_id = j.id
      WHERE b.id = ? AND j.client_id = ? AND b.status = 'pending'
    `).bind(bidId, user.user_id).first()

    if (!bid) {
      return c.json({ error: 'Bid not found or already processed' }, 404)
    }

    // Update bid status
    await c.env.DB.prepare(`
      UPDATE bids SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(bidId).run()

    return c.json({ success: true, message: 'Bid declined' })
  } catch (error) {
    console.error('Decline bid error:', error)
    return c.json({ error: 'Failed to decline bid' }, 500)
  }
})

// Get client activity feed
clientRoutes.get('/activities', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50)
    const offset = (page - 1) * limit

    // Get recent activities - simplified query to avoid UNION issues
    const jobActivities = await c.env.DB.prepare(`
      SELECT 
        'job_posted' as activity_type,
        title as activity_title,
        'You posted a new job: ' || title as activity_description,
        created_at as activity_date,
        id as related_id,
        'job' as related_type
      FROM jobs
      WHERE client_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(user.user_id, limit).all()

    const activities = jobActivities

    return c.json({
      activities: activities.results || [],
      pagination: { page, limit, total: activities.results?.length || 0 }
    })
  } catch (error) {
    console.error('Get activities error:', error)
    return c.json({ error: 'Failed to get activities' }, 500)
  }
})

// Get company information
clientRoutes.get('/company', requireClientAuth, async (c) => {
  try {
    const user = c.get('user')

    const company = await c.env.DB.prepare(`
      SELECT company_name as name, company_description as description, 
             website_url as website, years_in_business as size,
             'Business Services' as industry
      FROM user_profiles 
      WHERE user_id = ?
    `).bind(user.user_id).first()

    if (!company || !company.name) {
      return c.json({ error: 'Company information not found' }, 404)
    }

    return c.json(company)
  } catch (error) {
    console.error('Get company error:', error)
    return c.json({ error: 'Failed to get company information' }, 500)
  }
})

// Get client jobs with progress tracking data
clientRoutes.get('/jobs-with-progress', requireClientAuth, async (c) => {
  try {
    const session = c.get('session')
    
    // Get all jobs for the client with related data
    const jobs = await c.env.DB.prepare(`
      SELECT 
        j.id, j.title, j.description, j.status, j.budget_min, j.budget_max,
        j.location_city, j.location_province, j.urgency, j.created_at, j.updated_at,
        j.assigned_worker_id, j.actual_completion,
        jc.name as category_name,
        aw.first_name as assigned_worker_first_name,
        aw.last_name as assigned_worker_last_name,
        (aw.first_name || ' ' || aw.last_name) as assigned_worker_name,
        (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as total_bids,
        (SELECT COUNT(*) FROM bids WHERE job_id = j.id AND status = 'pending') as pending_bids,
        (SELECT COUNT(*) FROM reviews WHERE job_id = j.id) as has_review
      FROM jobs j
      LEFT JOIN job_categories jc ON j.category_id = jc.id
      LEFT JOIN users aw ON j.assigned_worker_id = aw.id
      WHERE j.client_id = ?
      ORDER BY 
        CASE j.status 
          WHEN 'posted' THEN 1 
          WHEN 'assigned' THEN 2 
          WHEN 'in_progress' THEN 3 
          WHEN 'completed' THEN 4 
          WHEN 'cancelled' THEN 5 
          WHEN 'disputed' THEN 6 
        END,
        j.created_at DESC
    `).bind(session.user_id).all()
    
    // Get milestones for each job
    const jobsWithProgress = await Promise.all(jobs.results.map(async (job: any) => {
      const milestones = await c.env.DB.prepare(`
        SELECT 
          id, milestone_name, milestone_description, is_completed, 
          completed_at, completed_by, display_order
        FROM job_milestones
        WHERE job_id = ?
        ORDER BY display_order ASC
      `).bind(job.id).all()
      
      // Get status logs for additional progress tracking
      const statusLogs = await c.env.DB.prepare(`
        SELECT 
          old_status, new_status, changed_by, change_reason, created_at,
          u.first_name || ' ' || u.last_name as changed_by_name
        FROM job_status_logs jsl
        LEFT JOIN users u ON jsl.changed_by = u.id
        WHERE job_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).bind(job.id).all()
      
      return {
        ...job,
        milestones: milestones.results || [],
        status_logs: statusLogs.results || [],
        has_review: job.has_review > 0
      }
    }))
    
    return c.json({ 
      success: true, 
      jobs: jobsWithProgress 
    })
    
  } catch (error) {
    console.error('Error fetching client jobs with progress:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to fetch jobs with progress data' 
    }, 500)
  }
})

export default clientRoutes