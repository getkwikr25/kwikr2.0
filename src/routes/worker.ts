import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

// File upload utility function
const processFileUpload = async (file: File, maxSize: number = 5 * 1024 * 1024, allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']) => {
  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`)
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    throw new Error(`File size must be less than ${maxSizeMB}MB`)
  }
  
  // Convert file to base64 for storage
  const fileBuffer = await file.arrayBuffer()
  const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))
  const fileUrl = `data:${file.type};base64,${fileBase64}`
  
  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileUrl: fileUrl,
    fileBase64: fileBase64
  }
}

export const workerRoutes = new Hono<{ Bindings: Bindings }>()

// Middleware to verify worker authentication
const requireWorkerAuth = async (c: any, next: any) => {
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
    return c.json({ error: 'Authentication required', expired: true }, 401)
  }
  
  try {
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, u.role, u.first_name, u.last_name, u.email, u.is_verified
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1 AND u.role = 'worker'
    `).bind(sessionToken).first()
    
    if (!session) {
      return c.json({ error: 'Invalid session or not a worker' }, 401)
    }
    
    c.set('user', session)
    await next()
  } catch (error) {
    console.error('Worker auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
}

// ===== COMPLIANCE MANAGEMENT =====

// Get worker compliance information
workerRoutes.get('/compliance', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const compliance = await c.env.DB.prepare(`
      SELECT * FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()
    
    return c.json({ 
      compliance: compliance || {
        user_id: user.user_id,
        wsib_number: null,
        wsib_valid_until: null,
        insurance_provider: null,
        insurance_policy_number: null,
        insurance_valid_until: null,
        license_type: null,
        license_number: null,
        license_valid_until: null,
        compliance_status: 'pending'
      }
    })
  } catch (error) {
    console.error('Get compliance error:', error)
    return c.json({ error: 'Failed to get compliance information' }, 500)
  }
})

// Update worker compliance information
workerRoutes.put('/compliance', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      wsib_number,
      wsib_valid_until,
      insurance_provider,
      insurance_policy_number,
      insurance_valid_until,
      license_type,
      license_number,
      license_valid_until
    } = await c.req.json()

    // Check if compliance record exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()

    if (existing) {
      // Update existing record
      await c.env.DB.prepare(`
        UPDATE worker_compliance SET
          wsib_number = ?, wsib_valid_until = ?,
          insurance_provider = ?, insurance_policy_number = ?, insurance_valid_until = ?,
          license_type = ?, license_number = ?, license_valid_until = ?,
          documents_uploaded = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        wsib_number, wsib_valid_until,
        insurance_provider, insurance_policy_number, insurance_valid_until,
        license_type, license_number, license_valid_until,
        user.user_id
      ).run()
    } else {
      // Insert new record
      await c.env.DB.prepare(`
        INSERT INTO worker_compliance (
          user_id, wsib_number, wsib_valid_until,
          insurance_provider, insurance_policy_number, insurance_valid_until,
          license_type, license_number, license_valid_until,
          compliance_status, documents_uploaded
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)
      `).bind(
        user.user_id, wsib_number, wsib_valid_until,
        insurance_provider, insurance_policy_number, insurance_valid_until,
        license_type, license_number, license_valid_until
      ).run()
    }

    return c.json({ success: true, message: 'Compliance information updated successfully' })
  } catch (error) {
    console.error('Update compliance error:', error)
    return c.json({ error: 'Failed to update compliance information' }, 500)
  }
})

// ===== SERVICES MANAGEMENT =====

// Get worker services
workerRoutes.get('/services', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const services = await c.env.DB.prepare(`
      SELECT ws.*, jc.name as category_name, jc.icon_class
      FROM worker_services ws
      LEFT JOIN job_categories jc ON ws.service_category = jc.name
      WHERE ws.user_id = ?
      ORDER BY ws.created_at DESC
    `).bind(user.user_id).all()
    
    return c.json({ services: services.results || [] })
  } catch (error) {
    console.error('Get services error:', error)
    return c.json({ error: 'Failed to get services' }, 500)
  }
})

// ===== PAYMENT SETTINGS MANAGEMENT =====

// Get worker payment settings
workerRoutes.get('/payment-settings', requireWorkerAuth, async (c) => {
  return c.json({ 
    success: true, 
    message: 'Payment settings route is working!',
    paymentSettings: {}
  })
})

// Update worker payment settings
workerRoutes.post('/payment-settings/update', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const paymentData = await c.req.json()
    
    // Check if payment settings exist for this user
    const existingSettings = await c.env.DB.prepare(`
      SELECT id FROM worker_payment_settings WHERE user_id = ?
    `).bind(user.user_id).first()

    if (existingSettings) {
      // Update existing settings
      await c.env.DB.prepare(`
        UPDATE worker_payment_settings 
        SET preferred_payment_method = ?, 
            bank_name = ?, 
            bank_account_holder = ?, 
            bank_account_number = ?, 
            bank_routing_number = ?, 
            paypal_email = ?, 
            interac_email = ?, 
            etransfer_security_question = ?, 
            etransfer_security_answer = ?, 
            minimum_payout_amount = ?, 
            payout_frequency = ?, 
            auto_payout_enabled = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        paymentData.preferred_payment_method,
        paymentData.bank_name,
        paymentData.bank_account_holder,
        paymentData.bank_account_number,
        paymentData.bank_routing_number,
        paymentData.paypal_email,
        paymentData.interac_email,
        paymentData.etransfer_security_question,
        paymentData.etransfer_security_answer,
        paymentData.minimum_payout_amount,
        paymentData.payout_frequency,
        paymentData.auto_payout_enabled,
        user.user_id
      ).run()
    } else {
      // Insert new settings
      await c.env.DB.prepare(`
        INSERT INTO worker_payment_settings (
          user_id, preferred_payment_method, bank_name, bank_account_holder, 
          bank_account_number, bank_routing_number, paypal_email, interac_email, 
          etransfer_security_question, etransfer_security_answer, minimum_payout_amount, 
          payout_frequency, auto_payout_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        user.user_id,
        paymentData.preferred_payment_method,
        paymentData.bank_name,
        paymentData.bank_account_holder,
        paymentData.bank_account_number,
        paymentData.bank_routing_number,
        paymentData.paypal_email,
        paymentData.interac_email,
        paymentData.etransfer_security_question,
        paymentData.etransfer_security_answer,
        paymentData.minimum_payout_amount,
        paymentData.payout_frequency,
        paymentData.auto_payout_enabled
      ).run()
    }
    
    return c.json({ 
      success: true, 
      message: 'Payment settings updated successfully' 
    })
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to update payment settings. Please try again.' 
    }, 500)
  }
})

// Add new service
workerRoutes.post('/services', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      service_category,
      service_name,
      description,
      hourly_rate,
      service_area,
      years_experience,
      tags
    } = await c.req.json()

    const result = await c.env.DB.prepare(`
      INSERT INTO worker_services (
        user_id, service_category, service_name, description,
        hourly_rate, service_area, years_experience, is_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      user.user_id, service_category, service_name, description,
      hourly_rate, JSON.stringify(service_area || []), years_experience
    ).run()

    return c.json({ 
      success: true, 
      message: 'Service added successfully',
      service_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Add service error:', error)
    return c.json({ error: 'Failed to add service' }, 500)
  }
})

// Update service
workerRoutes.put('/services/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const serviceId = c.req.param('id')
    const {
      service_category,
      service_name,
      description,
      hourly_rate,
      service_area,
      years_experience,
      is_available
    } = await c.req.json()

    await c.env.DB.prepare(`
      UPDATE worker_services SET
        service_category = ?, service_name = ?, description = ?,
        hourly_rate = ?, service_area = ?, years_experience = ?, is_available = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      service_category, service_name, description,
      hourly_rate, JSON.stringify(service_area || []), years_experience, is_available ? 1 : 0,
      serviceId, user.user_id
    ).run()

    return c.json({ success: true, message: 'Service updated successfully' })
  } catch (error) {
    console.error('Update service error:', error)
    return c.json({ error: 'Failed to update service' }, 500)
  }
})

// Delete service
workerRoutes.delete('/services/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const serviceId = c.req.param('id')

    await c.env.DB.prepare(`
      DELETE FROM worker_services WHERE id = ? AND user_id = ?
    `).bind(serviceId, user.user_id).run()

    return c.json({ success: true, message: 'Service deleted successfully' })
  } catch (error) {
    console.error('Delete service error:', error)
    return c.json({ error: 'Failed to delete service' }, 500)
  }
})

// ===== BIDS MANAGEMENT =====

// Get worker bids history
workerRoutes.get('/bids', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const bids = await c.env.DB.prepare(`
      SELECT b.*, j.title as job_title, j.description as job_description,
             j.budget_min, j.budget_max, j.status as job_status, j.location_city, j.location_province,
             c.name as category_name, c.icon_class,
             u.first_name as client_first_name, u.last_name as client_last_name
      FROM bids b
      JOIN jobs j ON b.job_id = j.id
      JOIN job_categories c ON j.category_id = c.id
      JOIN users u ON j.client_id = u.id
      WHERE b.worker_id = ?
      ORDER BY b.submitted_at DESC
    `).bind(user.user_id).all()
    
    return c.json({ bids: bids.results || [] })
  } catch (error) {
    console.error('Get bids error:', error)
    return c.json({ error: 'Failed to get bids' }, 500)
  }
})

// Check if worker has already bid on a job
workerRoutes.get('/bids/check/:jobId', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const jobId = c.req.param('jobId')

    const existingBid = await c.env.DB.prepare(`
      SELECT b.*, 
             (SELECT COUNT(*) FROM bid_history WHERE bid_id = b.id) as modification_count
      FROM bids b
      WHERE b.job_id = ? AND b.worker_id = ? AND b.status != 'withdrawn'
    `).bind(jobId, user.user_id).first()

    return c.json({ 
      hasBid: !!existingBid, 
      bid: existingBid || null 
    })
  } catch (error) {
    console.error('Check bid error:', error)
    return c.json({ error: 'Failed to check bid status' }, 500)
  }
})

// Update/modify existing bid
workerRoutes.put('/bids/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const bidId = c.req.param('id')
    const { bid_amount, cover_message, estimated_timeline, modification_reason } = await c.req.json()

    // Get existing bid to save to history
    const existingBid = await c.env.DB.prepare(`
      SELECT * FROM bids WHERE id = ? AND worker_id = ? AND status = 'pending'
    `).bind(bidId, user.user_id).first()

    if (!existingBid) {
      return c.json({ error: 'Bid not found or cannot be modified' }, 404)
    }

    // Save current bid to history
    await c.env.DB.prepare(`
      INSERT INTO bid_history (bid_id, bid_amount, cover_message, estimated_timeline, modification_reason)
      VALUES (?, ?, ?, ?, ?)
    `).bind(bidId, existingBid.bid_amount, existingBid.cover_message, existingBid.estimated_timeline, modification_reason || 'Bid updated').run()

    // Update the bid
    await c.env.DB.prepare(`
      UPDATE bids SET 
        bid_amount = ?, 
        cover_message = ?, 
        estimated_timeline = ?,
        is_modified = 1,
        modification_count = modification_count + 1,
        last_modified_at = CURRENT_TIMESTAMP
      WHERE id = ? AND worker_id = ?
    `).bind(bid_amount, cover_message, estimated_timeline, bidId, user.user_id).run()

    return c.json({ success: true, message: 'Bid updated successfully' })
  } catch (error) {
    console.error('Update bid error:', error)
    return c.json({ error: 'Failed to update bid' }, 500)
  }
})

// Get bid history for a specific bid
workerRoutes.get('/bids/:id/history', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const bidId = c.req.param('id')

    // Verify bid belongs to worker
    const bid = await c.env.DB.prepare(`
      SELECT id FROM bids WHERE id = ? AND worker_id = ?
    `).bind(bidId, user.user_id).first()

    if (!bid) {
      return c.json({ error: 'Bid not found' }, 404)
    }

    const history = await c.env.DB.prepare(`
      SELECT * FROM bid_history WHERE bid_id = ? ORDER BY modified_at DESC
    `).bind(bidId).all()

    return c.json({ history: history.results || [] })
  } catch (error) {
    console.error('Get bid history error:', error)
    return c.json({ error: 'Failed to get bid history' }, 500)
  }
})

// Withdraw bid
workerRoutes.put('/bids/:id/withdraw', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const bidId = c.req.param('id')

    await c.env.DB.prepare(`
      UPDATE bids SET status = 'withdrawn' WHERE id = ? AND worker_id = ? AND status = 'pending'
    `).bind(bidId, user.user_id).run()

    return c.json({ success: true, message: 'Bid withdrawn successfully' })
  } catch (error) {
    console.error('Withdraw bid error:', error)
    return c.json({ error: 'Failed to withdraw bid' }, 500)
  }
})

// ===== COMPLIANCE DOCUMENTS =====

// Get compliance documents
workerRoutes.get('/compliance/documents', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    // Get compliance record
    const compliance = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()

    if (!compliance) {
      return c.json({ documents: [] })
    }

    const documents = await c.env.DB.prepare(`
      SELECT * FROM compliance_documents WHERE compliance_id = ? ORDER BY uploaded_at DESC
    `).bind(compliance.id).all()

    return c.json({ documents: documents.results || [] })
  } catch (error) {
    console.error('Get compliance documents error:', error)
    return c.json({ error: 'Failed to get compliance documents' }, 500)
  }
})

// Add compliance document (placeholder for file upload)
workerRoutes.post('/compliance/documents', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { document_type, document_name, document_url, file_size } = await c.req.json()

    // Get or create compliance record
    let compliance = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()

    if (!compliance) {
      const result = await c.env.DB.prepare(`
        INSERT INTO worker_compliance (user_id, compliance_status) VALUES (?, 'pending')
      `).bind(user.user_id).run()
      compliance = { id: result.meta.last_row_id }
    }

    // Add document record
    await c.env.DB.prepare(`
      INSERT INTO compliance_documents (compliance_id, document_type, document_name, document_url, file_size)
      VALUES (?, ?, ?, ?, ?)
    `).bind(compliance.id, document_type, document_name, document_url, file_size || 0).run()

    return c.json({ success: true, message: 'Document added successfully' })
  } catch (error) {
    console.error('Add compliance document error:', error)
    return c.json({ error: 'Failed to add compliance document' }, 500)
  }
})

// Delete compliance document
workerRoutes.delete('/compliance/documents/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const documentId = c.req.param('id')

    // Verify document belongs to user
    const document = await c.env.DB.prepare(`
      SELECT cd.id FROM compliance_documents cd
      JOIN worker_compliance wc ON cd.compliance_id = wc.id
      WHERE cd.id = ? AND wc.user_id = ?
    `).bind(documentId, user.user_id).first()

    if (!document) {
      return c.json({ error: 'Document not found' }, 404)
    }

    await c.env.DB.prepare(`
      DELETE FROM compliance_documents WHERE id = ?
    `).bind(documentId).run()

    return c.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Delete compliance document error:', error)
    return c.json({ error: 'Failed to delete compliance document' }, 500)
  }
})

// ===== PROFILE MANAGEMENT =====

// Get worker profile with extended information
workerRoutes.get('/profile', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const profile = await c.env.DB.prepare(`
      SELECT u.*, p.bio, p.profile_image_url, p.address_line1, p.address_line2, p.postal_code,
             p.date_of_birth, p.emergency_contact_name, p.emergency_contact_phone
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).bind(user.user_id).first()
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    return c.json({ profile })
  } catch (error) {
    console.error('Get profile error:', error)
    return c.json({ error: 'Failed to get profile' }, 500)
  }
})

// Update worker profile
workerRoutes.put('/profile', requireWorkerAuth, async (c) => {
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
      website_url = null,
      years_in_business = null
    } = data

    // Update main user table
    await c.env.DB.prepare(`
      UPDATE users SET
        first_name = ?, last_name = ?, phone = ?, province = ?, city = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(first_name, last_name, phone, province, city, user.user_id).run()

    // Update or insert profile data
    const existingProfile = await c.env.DB.prepare(`
      SELECT id FROM user_profiles WHERE user_id = ?
    `).bind(user.user_id).first()

    if (existingProfile) {
      // Update existing profile
      await c.env.DB.prepare(`
        UPDATE user_profiles SET
          bio = ?, profile_image_url = ?, address_line1 = ?, address_line2 = ?, postal_code = ?,
          emergency_contact_name = ?, emergency_contact_phone = ?,
          company_name = ?, company_description = ?, company_logo_url = ?, website_url = ?, years_in_business = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        bio, profile_image_url, address_line1, address_line2, postal_code,
        emergency_contact_name, emergency_contact_phone,
        company_name, company_description, company_logo_url, website_url, years_in_business,
        user.user_id
      ).run()
    } else {
      // Insert new profile
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (
          user_id, bio, profile_image_url, address_line1, address_line2, postal_code,
          emergency_contact_name, emergency_contact_phone,
          company_name, company_description, company_logo_url, website_url, years_in_business
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        user.user_id, bio, profile_image_url, address_line1, address_line2, postal_code,
        emergency_contact_name, emergency_contact_phone,
        company_name, company_description, company_logo_url, website_url, years_in_business
      ).run()
    }

    return c.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Get job categories for service selection
workerRoutes.get('/categories', requireWorkerAuth, async (c) => {
  try {
    const categories = await c.env.DB.prepare(`
      SELECT * FROM job_categories WHERE is_active = 1 ORDER BY name
    `).all()
    
    return c.json({ categories: categories.results || [] })
  } catch (error) {
    console.error('Get categories error:', error)
    return c.json({ error: 'Failed to get categories' }, 500)
  }
})

// ===== SERVICE AREAS MANAGEMENT =====

// Get worker service areas
workerRoutes.get('/service-areas', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const areas = await c.env.DB.prepare(`
      SELECT * FROM worker_service_areas 
      WHERE user_id = ? AND is_active = 1 
      ORDER BY area_name
    `).bind(user.user_id).all()
    
    return c.json({ service_areas: areas.results || [] })
  } catch (error) {
    console.error('Get service areas error:', error)
    return c.json({ error: 'Failed to get service areas' }, 500)
  }
})

// Add service area
workerRoutes.post('/service-areas', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { area_name } = await c.req.json()

    if (!area_name || area_name.trim().length === 0) {
      return c.json({ error: 'Area name is required' }, 400)
    }

    // Check if area already exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM worker_service_areas 
      WHERE user_id = ? AND LOWER(area_name) = LOWER(?) AND is_active = 1
    `).bind(user.user_id, area_name.trim()).first()

    if (existing) {
      return c.json({ error: 'Service area already exists' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO worker_service_areas (user_id, area_name)
      VALUES (?, ?)
    `).bind(user.user_id, area_name.trim()).run()

    return c.json({ 
      success: true, 
      message: 'Service area added successfully',
      area_id: result.meta.last_row_id
    })
  } catch (error) {
    console.error('Add service area error:', error)
    return c.json({ error: 'Failed to add service area' }, 500)
  }
})

// Delete service area
workerRoutes.delete('/service-areas/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const areaId = c.req.param('id')

    await c.env.DB.prepare(`
      UPDATE worker_service_areas SET is_active = 0 
      WHERE id = ? AND user_id = ?
    `).bind(areaId, user.user_id).run()

    return c.json({ success: true, message: 'Service area removed successfully' })
  } catch (error) {
    console.error('Delete service area error:', error)
    return c.json({ error: 'Failed to remove service area' }, 500)
  }
})

// ===== HOURS OF OPERATION MANAGEMENT =====

// Get worker hours of operation
workerRoutes.get('/hours', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const hours = await c.env.DB.prepare(`
      SELECT * FROM worker_hours 
      WHERE user_id = ? 
      ORDER BY day_of_week
    `).bind(user.user_id).all()
    
    return c.json({ hours: hours.results || [] })
  } catch (error) {
    console.error('Get hours error:', error)
    return c.json({ error: 'Failed to get hours' }, 500)
  }
})

// Update worker hours of operation
workerRoutes.put('/hours', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { hours } = await c.req.json()

    if (!Array.isArray(hours) || hours.length !== 7) {
      return c.json({ error: 'Invalid hours data - must be array of 7 days' }, 400)
    }

    // Update each day
    for (let i = 0; i < hours.length; i++) {
      const dayData = hours[i]
      
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO worker_hours 
        (user_id, day_of_week, is_open, open_time, close_time, updated_at) 
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        user.user_id,
        i, // day_of_week (0=Sunday, 6=Saturday)
        dayData.is_open ? 1 : 0,
        dayData.is_open ? dayData.open_time : null,
        dayData.is_open ? dayData.close_time : null
      ).run()
    }

    return c.json({ success: true, message: 'Hours updated successfully' })
  } catch (error) {
    console.error('Update hours error:', error)
    return c.json({ error: 'Failed to update hours' }, 500)
  }
})

// ===== FILE UPLOAD MANAGEMENT =====

// Upload compliance document  
workerRoutes.post('/compliance/upload', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    
    const { fileName, fileSize, fileType, fileData, documentType } = body
    
    if (!fileName || !fileSize || !fileType || !fileData || !documentType) {
      return c.json({ error: 'All file information and document type are required' }, 400)
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(fileType)) {
      return c.json({ error: 'Only JPEG, PNG, and PDF files are allowed' }, 400)
    }
    
    // Check file size (5MB limit)
    if (fileSize > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 5MB' }, 400)
    }
    
    // Create data URL from base64
    const fileUrl = `data:${fileType};base64,${fileData}`
    
    // Generate unique document ID
    const documentId = Math.random().toString(36).substring(2, 15)
    
    // First, get or create compliance record for the user
    let complianceId
    const existingCompliance = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()
    
    if (existingCompliance) {
      complianceId = existingCompliance.id
    } else {
      // Create compliance record if it doesn't exist
      const complianceResult = await c.env.DB.prepare(`
        INSERT INTO worker_compliance (user_id, compliance_status) VALUES (?, 'pending')
      `).bind(user.user_id).run()
      complianceId = complianceResult.meta.last_row_id
    }
    
    // Save document record to database with correct schema
    await c.env.DB.prepare(`
      INSERT INTO compliance_documents (
        compliance_id, document_type, document_name, document_url, file_size, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(complianceId, documentType, fileName, fileUrl, fileSize).run()
    
    // Update worker compliance to mark documents as uploaded
    await c.env.DB.prepare(`
      UPDATE worker_compliance 
      SET documents_uploaded = 1, updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(user.user_id).run()
    
    return c.json({ 
      success: true, 
      document: {
        id: documentId,
        document_type: documentType,
        file_name: fileName,
        file_size: fileSize,
        uploaded_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Upload compliance document error:', error)
    return c.json({ error: 'Failed to upload document' }, 500)
  }
})

// Get compliance documents
workerRoutes.get('/compliance/documents', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const documents = await c.env.DB.prepare(`
      SELECT cd.id, cd.document_type, cd.document_name as file_name, cd.file_size, cd.uploaded_at
      FROM compliance_documents cd
      JOIN worker_compliance wc ON cd.compliance_id = wc.id
      WHERE wc.user_id = ? 
      ORDER BY cd.uploaded_at DESC
    `).bind(user.user_id).all()
    
    return c.json({ documents: documents.results || [] })
  } catch (error) {
    console.error('Get compliance documents error:', error)
    return c.json({ error: 'Failed to get documents' }, 500)
  }
})

// Delete compliance document
workerRoutes.delete('/compliance/documents/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const documentId = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM compliance_documents 
      WHERE id = ? AND compliance_id IN (
        SELECT id FROM worker_compliance WHERE user_id = ?
      )
    `).bind(documentId, user.user_id).run()
    
    return c.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Delete compliance document error:', error)
    return c.json({ error: 'Failed to delete document' }, 500)
  }
})

// Upload profile image
workerRoutes.post('/profile/upload-image', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.parseBody()
    
    const file = body.file as File
    
    if (!file) {
      return c.json({ error: 'File is required' }, 400)
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Only JPEG and PNG images are allowed' }, 400)
    }
    
    // Check file size (2MB limit for images)
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: 'Image size must be less than 2MB' }, 400)
    }
    
    // Convert image to base64 for storage
    const fileBuffer = await file.arrayBuffer()
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))
    const imageUrl = `data:${file.type};base64,${fileBase64}`
    
    // Update profile with image URL
    await c.env.DB.prepare(`
      UPDATE user_profiles SET
        profile_image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(imageUrl, user.user_id).run()
    
    return c.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Profile image uploaded successfully'
    })
  } catch (error) {
    console.error('Upload profile image error:', error)
    return c.json({ error: 'Failed to upload image' }, 500)
  }
})

// Update worker compliance information
workerRoutes.put('/compliance', async (c) => {
  // Get session token from Authorization header or cookies
  let sessionToken = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!sessionToken) {
    // Try to get from cookies
    const cookieHeader = c.req.header('Cookie')
    if (cookieHeader) {
      const cookies = cookieHeader.split(';')
      for (const cookie of cookies) {
        const trimmedCookie = cookie.trim()
        const equalIndex = trimmedCookie.indexOf('=')
        if (equalIndex !== -1) {
          const name = trimmedCookie.substring(0, equalIndex)
          const value = trimmedCookie.substring(equalIndex + 1)
          if (name === 'session') {
            sessionToken = value
            break
          }
        }
      }
    }
  }
  
  if (!sessionToken) {
    return c.json({ error: 'Authentication required', expired: true }, 401)
  }
  
  try {
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, u.role, u.first_name, u.last_name, u.email, u.is_verified
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = 1 AND u.role = 'worker'
    `).bind(sessionToken).first()
    
    if (!session) {
      return c.json({ error: 'Invalid or expired session', expired: true }, 401)
    }
    
    const data = await c.req.json()
    
    // Update or insert worker compliance information
    const complianceExists = await c.env.DB.prepare(`
      SELECT user_id FROM worker_compliance WHERE user_id = ?
    `).bind(session.user_id).first()
    
    if (complianceExists) {
      await c.env.DB.prepare(`
        UPDATE worker_compliance 
        SET wsib_number = ?, wsib_valid_until = ?, 
            insurance_provider = ?, insurance_policy_number = ?, insurance_valid_until = ?,
            license_type = ?, license_number = ?, license_valid_until = ?
        WHERE user_id = ?
      `).bind(
        data.wsibNumber || null,
        data.wsibValidUntil || null,
        data.insuranceProvider || null,
        data.insurancePolicyNumber || null,
        data.insuranceValidUntil || null,
        data.licenseType || null,
        data.licenseNumber || null,
        data.licenseValidUntil || null,
        session.user_id
      ).run()
    } else {
      await c.env.DB.prepare(`
        INSERT INTO worker_compliance (user_id, wsib_number, wsib_valid_until, 
                                     insurance_provider, insurance_policy_number, insurance_valid_until,
                                     license_type, license_number, license_valid_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        session.user_id,
        data.wsibNumber || null,
        data.wsibValidUntil || null,
        data.insuranceProvider || null,
        data.insurancePolicyNumber || null,
        data.insuranceValidUntil || null,
        data.licenseType || null,
        data.licenseNumber || null,
        data.licenseValidUntil || null
      ).run()
    }
    
    // Handle document uploads (store as base64 in database for simplicity)
    // In production, you'd want to store these in proper file storage
    if (data.licenseDocument || data.wsibDocument || data.insuranceDocument) {
      // For now, we'll just acknowledge the documents were uploaded
      // In a real system, you'd process and store these files properly
      console.log('Documents uploaded:', {
        license: !!data.licenseDocument,
        wsib: !!data.wsibDocument,
        insurance: !!data.insuranceDocument
      })
    }
    
    return c.json({ message: 'Compliance information updated successfully' })
    
  } catch (error) {
    console.error('Error updating compliance:', error)
    return c.json({ error: 'Failed to update compliance information' }, 500)
  }
})

// Get jobs assigned to current worker (for Kanban board)
workerRoutes.get('/assigned-jobs', requireWorkerAuth, async (c) => {
  try {
    const session = c.get('session')
    
    const jobs = await c.env.DB.prepare(`
      SELECT 
        j.id, j.title, j.description, j.status, j.budget_min, j.budget_max,
        j.location_city, j.location_province, j.urgency, j.created_at, j.actual_completion,
        jc.name as category_name,
        u.first_name as client_first_name, u.last_name as client_last_name,
        (u.first_name || ' ' || u.last_name) as client_name
      FROM jobs j
      LEFT JOIN job_categories jc ON j.category_id = jc.id
      LEFT JOIN users u ON j.client_id = u.id
      WHERE j.assigned_worker_id = ? 
        AND j.status IN ('assigned', 'in_progress', 'completed')
      ORDER BY 
        CASE j.status 
          WHEN 'assigned' THEN 1 
          WHEN 'in_progress' THEN 2 
          WHEN 'completed' THEN 3 
        END,
        j.created_at DESC
    `).bind(session.user_id).all()
    
    // Get milestones for each job
    const jobsWithMilestones = await Promise.all(jobs.results.map(async (job: any) => {
      const milestones = await c.env.DB.prepare(`
        SELECT id, milestone_name, milestone_description, is_completed, completed_at, display_order
        FROM job_milestones
        WHERE job_id = ?
        ORDER BY display_order ASC
      `).bind(job.id).all()
      
      return {
        ...job,
        milestones: milestones.results || []
      }
    }))
    
    return c.json({ 
      success: true, 
      jobs: jobsWithMilestones 
    })
    
  } catch (error) {
    console.error('Error fetching assigned jobs:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to fetch assigned jobs' 
    }, 500)
  }
})

// Update job status (for Kanban drag & drop)
workerRoutes.put('/jobs/:id/status', requireWorkerAuth, async (c) => {
  try {
    const jobId = parseInt(c.req.param('id'))
    const { status } = await c.req.json()
    const session = c.get('session')
    
    // Valid status transitions for workers
    const validStatuses = ['assigned', 'in_progress', 'completed']
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400)
    }
    
    // Verify the job is assigned to this worker
    const job = await c.env.DB.prepare(`
      SELECT id, status as current_status, assigned_worker_id, title
      FROM jobs 
      WHERE id = ? AND assigned_worker_id = ?
    `).bind(jobId, session.user_id).first()
    
    if (!job) {
      return c.json({ error: 'Job not found or not assigned to you' }, 404)
    }
    
    // Prevent invalid status transitions
    const currentStatus = job.current_status
    if (currentStatus === 'completed' && status !== 'completed') {
      return c.json({ error: 'Cannot change status of completed job' }, 400)
    }
    
    // Update job status
    await c.env.DB.prepare(`
      UPDATE jobs 
      SET status = ?, 
          updated_at = CURRENT_TIMESTAMP,
          actual_completion = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE actual_completion END
      WHERE id = ?
    `).bind(status, status, jobId).run()
    
    // Log status change
    await c.env.DB.prepare(`
      INSERT INTO job_status_logs (job_id, old_status, new_status, changed_by, change_reason)
      VALUES (?, ?, ?, ?, ?)
    `).bind(jobId, currentStatus, status, session.user_id, `Status updated via Kanban board`).run()
    
    // Update milestones based on new status
    if (status === 'in_progress') {
      // Mark "Work Started" milestone as completed
      await c.env.DB.prepare(`
        UPDATE job_milestones 
        SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP, completed_by = ?
        WHERE job_id = ? AND milestone_name = 'Work Started'
      `).bind(session.user_id, jobId).run()
      
      // Create "Work Started" milestone if it doesn't exist
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO job_milestones (job_id, milestone_name, milestone_description, is_completed, completed_at, completed_by, display_order)
        VALUES (?, 'Work Started', 'Worker has started working on the job', TRUE, CURRENT_TIMESTAMP, ?, 2)
      `).bind(jobId, session.user_id).run()
    } else if (status === 'completed') {
      // Mark "Work Completed" milestone as completed
      await c.env.DB.prepare(`
        UPDATE job_milestones 
        SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP, completed_by = ?
        WHERE job_id = ? AND milestone_name = 'Work Completed'
      `).bind(session.user_id, jobId).run()
      
      // Create "Work Completed" milestone if it doesn't exist
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO job_milestones (job_id, milestone_name, milestone_description, is_completed, completed_at, completed_by, display_order)
        VALUES (?, 'Work Completed', 'All work has been completed', TRUE, CURRENT_TIMESTAMP, ?, 3)
      `).bind(jobId, session.user_id).run()
    }
    
    return c.json({ 
      success: true, 
      message: `Job status updated to ${status}`,
      job_id: jobId,
      new_status: status
    })
    
  } catch (error) {
    console.error('Error updating job status:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to update job status' 
    }, 500)
  }
})

// ===== CALENDAR INTEGRATION =====

// Get worker calendar events for a date range
workerRoutes.get('/calendar/events', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { start_date, end_date } = c.req.query()
    
    if (!start_date || !end_date) {
      return c.json({ error: 'start_date and end_date parameters are required' }, 400)
    }

    // Get appointments
    const appointments = await c.env.DB.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.appointment_type,
        a.start_datetime,
        a.end_datetime,
        a.location_type,
        a.location_address,
        a.status,
        a.job_id,
        'appointment' as event_type,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        j.title as job_title
      FROM appointments a
      LEFT JOIN users u ON a.client_id = u.id
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.worker_id = ? 
        AND DATE(a.start_datetime) >= DATE(?) 
        AND DATE(a.start_datetime) <= DATE(?)
        AND a.status NOT IN ('cancelled')
      ORDER BY a.start_datetime
    `).bind(user.user_id, start_date, end_date).all()

    // Get job time blocks
    const timeBlocks = await c.env.DB.prepare(`
      SELECT 
        tb.id,
        tb.block_name as title,
        tb.description,
        tb.start_datetime,
        tb.end_datetime,
        tb.block_type,
        tb.status,
        tb.is_billable,
        tb.estimated_hours,
        tb.actual_hours,
        tb.job_id,
        'time_block' as event_type,
        j.title as job_title
      FROM job_time_blocks tb
      LEFT JOIN jobs j ON tb.job_id = j.id
      WHERE tb.worker_id = ? 
        AND DATE(tb.start_datetime) >= DATE(?) 
        AND DATE(tb.start_datetime) <= DATE(?)
        AND tb.status NOT IN ('cancelled')
      ORDER BY tb.start_datetime
    `).bind(user.user_id, start_date, end_date).all()

    // Get personal calendar events
    const personalEvents = await c.env.DB.prepare(`
      SELECT 
        id,
        title,
        description,
        event_type,
        start_datetime,
        end_datetime,
        all_day,
        color_code,
        location
      FROM calendar_events
      WHERE user_id = ? 
        AND DATE(start_datetime) >= DATE(?) 
        AND DATE(start_datetime) <= DATE(?)
      ORDER BY start_datetime
    `).bind(user.user_id, start_date, end_date).all()

    return c.json({
      success: true,
      events: {
        appointments: appointments.results || [],
        time_blocks: timeBlocks.results || [],
        personal: personalEvents.results || []
      }
    })
  } catch (error) {
    console.error('Get calendar events error:', error)
    return c.json({ error: 'Failed to get calendar events' }, 500)
  }
})

// Create new appointment
workerRoutes.post('/calendar/appointments', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      job_id,
      client_id,
      title,
      description,
      appointment_type,
      start_datetime,
      end_datetime,
      location_type,
      location_address,
      meeting_link
    } = await c.req.json()

    if (!client_id || !title || !start_datetime || !end_datetime) {
      return c.json({ error: 'client_id, title, start_datetime, and end_datetime are required' }, 400)
    }

    // Validate datetime format and that start is before end
    const startDate = new Date(start_datetime)
    const endDate = new Date(end_datetime)
    if (startDate >= endDate) {
      return c.json({ error: 'start_datetime must be before end_datetime' }, 400)
    }

    // Check for scheduling conflicts
    const conflicts = await c.env.DB.prepare(`
      SELECT id FROM appointments
      WHERE worker_id = ? 
        AND status NOT IN ('cancelled', 'completed')
        AND ((start_datetime BETWEEN ? AND ?) OR (end_datetime BETWEEN ? AND ?)
             OR (start_datetime <= ? AND end_datetime >= ?))
    `).bind(
      user.user_id,
      start_datetime, end_datetime,
      start_datetime, end_datetime,
      start_datetime, end_datetime
    ).all()

    if (conflicts.results && conflicts.results.length > 0) {
      return c.json({ error: 'Time slot conflicts with existing appointment' }, 400)
    }

    // Create appointment
    const result = await c.env.DB.prepare(`
      INSERT INTO appointments (
        job_id, worker_id, client_id, title, description, appointment_type,
        start_datetime, end_datetime, location_type, location_address, meeting_link,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job_id || null, user.user_id, client_id, title, description || null,
      appointment_type || 'meeting', start_datetime, end_datetime,
      location_type || 'client_site', location_address || null, meeting_link || null,
      user.user_id
    ).run()

    return c.json({
      success: true,
      appointment_id: result.meta.last_row_id,
      message: 'Appointment created successfully'
    })
  } catch (error) {
    console.error('Create appointment error:', error)
    return c.json({ error: 'Failed to create appointment' }, 500)
  }
})

// Update appointment
workerRoutes.put('/calendar/appointments/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const appointmentId = c.req.param('id')
    const {
      title,
      description,
      appointment_type,
      start_datetime,
      end_datetime,
      location_type,
      location_address,
      meeting_link,
      status
    } = await c.req.json()

    // Verify appointment belongs to worker
    const appointment = await c.env.DB.prepare(`
      SELECT id FROM appointments WHERE id = ? AND worker_id = ?
    `).bind(appointmentId, user.user_id).first()

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404)
    }

    // Validate datetime if provided
    if (start_datetime && end_datetime) {
      const startDate = new Date(start_datetime)
      const endDate = new Date(end_datetime)
      if (startDate >= endDate) {
        return c.json({ error: 'start_datetime must be before end_datetime' }, 400)
      }
    }

    // Update appointment
    await c.env.DB.prepare(`
      UPDATE appointments SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        appointment_type = COALESCE(?, appointment_type),
        start_datetime = COALESCE(?, start_datetime),
        end_datetime = COALESCE(?, end_datetime),
        location_type = COALESCE(?, location_type),
        location_address = COALESCE(?, location_address),
        meeting_link = COALESCE(?, meeting_link),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title, description, appointment_type, start_datetime, end_datetime,
      location_type, location_address, meeting_link, status, appointmentId
    ).run()

    return c.json({ success: true, message: 'Appointment updated successfully' })
  } catch (error) {
    console.error('Update appointment error:', error)
    return c.json({ error: 'Failed to update appointment' }, 500)
  }
})

// Delete/Cancel appointment
workerRoutes.delete('/calendar/appointments/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const appointmentId = c.req.param('id')

    // Verify appointment belongs to worker
    const appointment = await c.env.DB.prepare(`
      SELECT id FROM appointments WHERE id = ? AND worker_id = ?
    `).bind(appointmentId, user.user_id).first()

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404)
    }

    // Mark as cancelled instead of deleting
    await c.env.DB.prepare(`
      UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(appointmentId).run()

    return c.json({ success: true, message: 'Appointment cancelled successfully' })
  } catch (error) {
    console.error('Cancel appointment error:', error)
    return c.json({ error: 'Failed to cancel appointment' }, 500)
  }
})

// Create job time block
workerRoutes.post('/calendar/time-blocks', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      job_id,
      block_name,
      description,
      start_datetime,
      end_datetime,
      block_type,
      is_billable,
      estimated_hours,
      hourly_rate
    } = await c.req.json()

    if (!job_id || !block_name || !start_datetime || !end_datetime) {
      return c.json({ error: 'job_id, block_name, start_datetime, and end_datetime are required' }, 400)
    }

    // Verify job is assigned to worker
    const job = await c.env.DB.prepare(`
      SELECT id FROM jobs WHERE id = ? AND assigned_worker_id = ?
    `).bind(job_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or not assigned to you' }, 404)
    }

    // Create time block
    const result = await c.env.DB.prepare(`
      INSERT INTO job_time_blocks (
        job_id, worker_id, block_name, description, start_datetime, end_datetime,
        block_type, is_billable, estimated_hours, hourly_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job_id, user.user_id, block_name, description || null,
      start_datetime, end_datetime, block_type || 'work',
      is_billable !== false ? 1 : 0, estimated_hours || null, hourly_rate || null
    ).run()

    return c.json({
      success: true,
      time_block_id: result.meta.last_row_id,
      message: 'Time block created successfully'
    })
  } catch (error) {
    console.error('Create time block error:', error)
    return c.json({ error: 'Failed to create time block' }, 500)
  }
})

// Get worker availability
workerRoutes.get('/calendar/availability', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')

    const availability = await c.env.DB.prepare(`
      SELECT * FROM worker_availability 
      WHERE user_id = ? 
      ORDER BY day_of_week, start_time
    `).bind(user.user_id).all()

    return c.json({
      success: true,
      availability: availability.results || []
    })
  } catch (error) {
    console.error('Get availability error:', error)
    return c.json({ error: 'Failed to get availability' }, 500)
  }
})

// Update worker availability
workerRoutes.put('/calendar/availability', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { schedule } = await c.req.json()

    if (!Array.isArray(schedule) || schedule.length !== 7) {
      return c.json({ error: 'Schedule must be an array of 7 days' }, 400)
    }

    // Clear existing availability
    await c.env.DB.prepare(`
      DELETE FROM worker_availability WHERE user_id = ?
    `).bind(user.user_id).run()

    // Insert new availability
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const daySchedule = schedule[dayOfWeek]
      
      if (daySchedule.is_available) {
        await c.env.DB.prepare(`
          INSERT INTO worker_availability 
          (user_id, day_of_week, start_time, end_time, is_available, break_start_time, break_end_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          user.user_id,
          dayOfWeek,
          daySchedule.start_time,
          daySchedule.end_time,
          1,
          daySchedule.break_start_time || null,
          daySchedule.break_end_time || null
        ).run()
      }
    }

    return c.json({ success: true, message: 'Availability updated successfully' })
  } catch (error) {
    console.error('Update availability error:', error)
    return c.json({ error: 'Failed to update availability' }, 500)
  }
})

// ===== EARNINGS CALCULATION & TRACKING =====

// Get worker earnings summary
workerRoutes.get('/earnings/summary', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { year } = c.req.query()
    const currentYear = year ? parseInt(year) : new Date().getFullYear()

    // Get total earnings for the year
    const yearlyEarnings = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        COALESCE(SUM(gross_amount), 0) as total_gross,
        COALESCE(SUM(platform_fee), 0) as total_fees,
        COALESCE(SUM(net_amount), 0) as total_net,
        COALESCE(AVG(gross_amount), 0) as avg_job_value
      FROM worker_earnings 
      WHERE worker_id = ? AND tax_year = ?
    `).bind(user.user_id, currentYear).first()

    // Get monthly breakdown
    const monthlyEarnings = await c.env.DB.prepare(`
      SELECT 
        strftime('%m', created_at) as month,
        COUNT(*) as jobs_count,
        COALESCE(SUM(gross_amount), 0) as gross_amount,
        COALESCE(SUM(net_amount), 0) as net_amount
      FROM worker_earnings 
      WHERE worker_id = ? AND tax_year = ?
      GROUP BY strftime('%m', created_at)
      ORDER BY month
    `).bind(user.user_id, currentYear).all()

    // Get pending payments
    const pendingPayments = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as pending_count,
        COALESCE(SUM(net_amount), 0) as pending_amount
      FROM worker_earnings 
      WHERE worker_id = ? AND payment_status IN ('pending', 'processing')
    `).bind(user.user_id).first()

    // Get recent earnings
    const recentEarnings = await c.env.DB.prepare(`
      SELECT 
        we.id,
        we.gross_amount,
        we.net_amount,
        we.earning_type,
        we.payment_status,
        we.hours_worked,
        we.created_at,
        j.title as job_title,
        u.first_name as client_first_name,
        u.last_name as client_last_name
      FROM worker_earnings we
      JOIN jobs j ON we.job_id = j.id
      JOIN users u ON j.client_id = u.id
      WHERE we.worker_id = ?
      ORDER BY we.created_at DESC
      LIMIT 10
    `).bind(user.user_id).all()

    return c.json({
      success: true,
      summary: {
        yearly: {
          year: currentYear,
          total_jobs: yearlyEarnings.total_jobs || 0,
          total_gross: parseFloat(yearlyEarnings.total_gross || 0),
          total_fees: parseFloat(yearlyEarnings.total_fees || 0),
          total_net: parseFloat(yearlyEarnings.total_net || 0),
          avg_job_value: parseFloat(yearlyEarnings.avg_job_value || 0)
        },
        monthly: monthlyEarnings.results || [],
        pending: {
          count: pendingPayments.pending_count || 0,
          amount: parseFloat(pendingPayments.pending_amount || 0)
        },
        recent: recentEarnings.results || []
      }
    })
  } catch (error) {
    console.error('Get earnings summary error:', error)
    return c.json({ error: 'Failed to get earnings summary' }, 500)
  }
})

// Get detailed earnings history
workerRoutes.get('/earnings/history', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { page = 1, limit = 20, status, year } = c.req.query()
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let whereClause = 'WHERE we.worker_id = ?'
    let params = [user.user_id]

    if (status && status !== 'all') {
      whereClause += ' AND we.payment_status = ?'
      params.push(status)
    }

    if (year && year !== 'all') {
      whereClause += ' AND we.tax_year = ?'
      params.push(parseInt(year))
    }

    const earnings = await c.env.DB.prepare(`
      SELECT 
        we.*,
        j.title as job_title,
        j.location_city,
        j.location_province,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        jc.name as job_category
      FROM worker_earnings we
      JOIN jobs j ON we.job_id = j.id
      JOIN users u ON j.client_id = u.id
      LEFT JOIN job_categories jc ON j.category_id = jc.id
      ${whereClause}
      ORDER BY we.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, parseInt(limit), offset).all()

    // Get total count for pagination
    const totalCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM worker_earnings we
      JOIN jobs j ON we.job_id = j.id
      ${whereClause}
    `).bind(...params).first()

    return c.json({
      success: true,
      earnings: earnings.results || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count || 0,
        pages: Math.ceil((totalCount.count || 0) / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get earnings history error:', error)
    return c.json({ error: 'Failed to get earnings history' }, 500)
  }
})

// Calculate and create earning record when job is completed
workerRoutes.post('/earnings/calculate', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { job_id, bid_id, hours_worked } = await c.req.json()

    if (!job_id || !bid_id) {
      return c.json({ error: 'job_id and bid_id are required' }, 400)
    }

    // Get job and bid details
    const job = await c.env.DB.prepare(`
      SELECT j.*, b.bid_amount
      FROM jobs j
      JOIN bids b ON j.id = b.job_id
      WHERE j.id = ? AND b.id = ? AND j.assigned_worker_id = ? AND b.worker_id = ?
    `).bind(job_id, bid_id, user.user_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job or bid not found' }, 404)
    }

    // Get platform fee settings
    const feeSettings = await c.env.DB.prepare(`
      SELECT * FROM platform_fee_settings 
      WHERE is_active = TRUE 
      ORDER BY effective_date DESC 
      LIMIT 1
    `).first()

    const grossAmount = parseFloat(job.bid_amount)
    let platformFee = 0

    if (feeSettings) {
      if (feeSettings.fee_type === 'percentage') {
        platformFee = grossAmount * parseFloat(feeSettings.fee_percentage)
        
        // Apply minimum/maximum fee limits
        if (feeSettings.minimum_fee && platformFee < parseFloat(feeSettings.minimum_fee)) {
          platformFee = parseFloat(feeSettings.minimum_fee)
        }
        if (feeSettings.maximum_fee && platformFee > parseFloat(feeSettings.maximum_fee)) {
          platformFee = parseFloat(feeSettings.maximum_fee)
        }
      } else if (feeSettings.fee_type === 'fixed') {
        platformFee = parseFloat(feeSettings.fee_fixed_amount)
      }
    }

    const netAmount = grossAmount - platformFee
    const currentYear = new Date().getFullYear()

    // Create earning record
    const result = await c.env.DB.prepare(`
      INSERT INTO worker_earnings (
        worker_id, job_id, bid_id, gross_amount, platform_fee, net_amount,
        hours_worked, tax_year, earning_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'job_completion')
    `).bind(
      user.user_id, job_id, bid_id, grossAmount, platformFee, netAmount,
      hours_worked || null, currentYear
    ).run()

    // Update job payment status
    await c.env.DB.prepare(`
      UPDATE jobs SET escrow_status = 'earning_calculated' WHERE id = ?
    `).bind(job_id).run()

    return c.json({
      success: true,
      earning_id: result.meta.last_row_id,
      calculation: {
        gross_amount: grossAmount,
        platform_fee: platformFee,
        net_amount: netAmount,
        fee_percentage: feeSettings?.fee_percentage || 0
      }
    })
  } catch (error) {
    console.error('Calculate earnings error:', error)
    return c.json({ error: 'Failed to calculate earnings' }, 500)
  }
})

// Start time tracking session
workerRoutes.post('/earnings/time-tracking/start', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { job_id, time_block_id, hourly_rate, description } = await c.req.json()

    if (!job_id) {
      return c.json({ error: 'job_id is required' }, 400)
    }

    // Verify job is assigned to worker
    const job = await c.env.DB.prepare(`
      SELECT id FROM jobs WHERE id = ? AND assigned_worker_id = ?
    `).bind(job_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or not assigned to you' }, 404)
    }

    // Check if there's already an active session
    const activeSession = await c.env.DB.prepare(`
      SELECT id FROM time_tracking_sessions 
      WHERE worker_id = ? AND job_id = ? AND status = 'active'
    `).bind(user.user_id, job_id).first()

    if (activeSession) {
      return c.json({ error: 'You already have an active time tracking session for this job' }, 400)
    }

    // Create new session
    const result = await c.env.DB.prepare(`
      INSERT INTO time_tracking_sessions (
        worker_id, job_id, time_block_id, session_start, hourly_rate, description
      ) VALUES (?, ?, ?, datetime('now'), ?, ?)
    `).bind(user.user_id, job_id, time_block_id || null, hourly_rate || null, description || null).run()

    return c.json({
      success: true,
      session_id: result.meta.last_row_id,
      message: 'Time tracking started'
    })
  } catch (error) {
    console.error('Start time tracking error:', error)
    return c.json({ error: 'Failed to start time tracking' }, 500)
  }
})

// Stop time tracking session
workerRoutes.post('/earnings/time-tracking/stop', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { session_id, break_minutes } = await c.req.json()

    if (!session_id) {
      return c.json({ error: 'session_id is required' }, 400)
    }

    // Get active session
    const session = await c.env.DB.prepare(`
      SELECT * FROM time_tracking_sessions 
      WHERE id = ? AND worker_id = ? AND status = 'active'
    `).bind(session_id, user.user_id).first()

    if (!session) {
      return c.json({ error: 'Active session not found' }, 404)
    }

    const sessionStart = new Date(session.session_start)
    const sessionEnd = new Date()
    const totalMinutes = Math.floor((sessionEnd - sessionStart) / (1000 * 60))
    const workingMinutes = totalMinutes - (break_minutes || 0)
    
    let earningsAmount = 0
    if (session.hourly_rate && workingMinutes > 0) {
      earningsAmount = (parseFloat(session.hourly_rate) * workingMinutes) / 60
    }

    // Update session
    await c.env.DB.prepare(`
      UPDATE time_tracking_sessions SET
        session_end = datetime('now'),
        duration_minutes = ?,
        break_minutes = ?,
        earnings_amount = ?,
        status = 'completed'
      WHERE id = ?
    `).bind(workingMinutes, break_minutes || 0, earningsAmount, session_id).run()

    return c.json({
      success: true,
      session: {
        duration_minutes: workingMinutes,
        break_minutes: break_minutes || 0,
        earnings_amount: earningsAmount,
        hourly_rate: session.hourly_rate
      },
      message: 'Time tracking completed'
    })
  } catch (error) {
    console.error('Stop time tracking error:', error)
    return c.json({ error: 'Failed to stop time tracking' }, 500)
  }
})

// Get active time tracking sessions
workerRoutes.get('/earnings/time-tracking/active', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')

    const activeSessions = await c.env.DB.prepare(`
      SELECT 
        ts.*,
        j.title as job_title,
        u.first_name as client_first_name,
        u.last_name as client_last_name
      FROM time_tracking_sessions ts
      JOIN jobs j ON ts.job_id = j.id
      JOIN users u ON j.client_id = u.id
      WHERE ts.worker_id = ? AND ts.status = 'active'
      ORDER BY ts.session_start DESC
    `).bind(user.user_id).all()

    return c.json({
      success: true,
      active_sessions: activeSessions.results || []
    })
  } catch (error) {
    console.error('Get active sessions error:', error)
    return c.json({ error: 'Failed to get active sessions' }, 500)
  }
})

// Add expense record
workerRoutes.post('/earnings/expenses', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      job_id,
      expense_category,
      description,
      amount,
      expense_date,
      receipt_data,
      is_business_expense,
      is_tax_deductible
    } = await c.req.json()

    if (!expense_category || !description || !amount || !expense_date) {
      return c.json({ error: 'expense_category, description, amount, and expense_date are required' }, 400)
    }

    // Handle receipt upload (base64)
    let receiptUrl = null
    if (receipt_data) {
      receiptUrl = `data:image/jpeg;base64,${receipt_data}`
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO worker_expenses (
        worker_id, job_id, expense_category, description, amount, expense_date,
        receipt_url, is_business_expense, is_tax_deductible, tax_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.user_id, job_id || null, expense_category, description, amount, expense_date,
      receiptUrl, is_business_expense !== false ? 1 : 0, is_tax_deductible !== false ? 1 : 0,
      new Date(expense_date).getFullYear()
    ).run()

    return c.json({
      success: true,
      expense_id: result.meta.last_row_id,
      message: 'Expense recorded successfully'
    })
  } catch (error) {
    console.error('Add expense error:', error)
    return c.json({ error: 'Failed to add expense' }, 500)
  }
})

// Get tax summary for year
workerRoutes.get('/earnings/tax-summary/:year', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const year = parseInt(c.req.param('year'))

    // Get or create tax summary
    let taxInfo = await c.env.DB.prepare(`
      SELECT * FROM worker_tax_info WHERE worker_id = ? AND tax_year = ?
    `).bind(user.user_id, year).first()

    if (!taxInfo) {
      // Calculate tax summary
      const earnings = await c.env.DB.prepare(`
        SELECT 
          COALESCE(SUM(gross_amount), 0) as total_gross,
          COALESCE(SUM(platform_fee), 0) as total_fees
        FROM worker_earnings 
        WHERE worker_id = ? AND tax_year = ?
      `).bind(user.user_id, year).first()

      const expenses = await c.env.DB.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses,
          COALESCE(SUM(CASE WHEN is_tax_deductible THEN amount ELSE 0 END), 0) as deductible_expenses
        FROM worker_expenses 
        WHERE worker_id = ? AND tax_year = ?
      `).bind(user.user_id, year).first()

      const totalGross = parseFloat(earnings.total_gross || 0)
      const totalFees = parseFloat(earnings.total_fees || 0)
      const totalExpenses = parseFloat(expenses.total_expenses || 0)
      const deductibleExpenses = parseFloat(expenses.deductible_expenses || 0)
      const netTaxableIncome = totalGross - totalFees - deductibleExpenses

      // Create tax info record
      await c.env.DB.prepare(`
        INSERT INTO worker_tax_info (
          worker_id, tax_year, total_gross_earnings, total_platform_fees,
          total_expenses, total_tax_deductible_expenses, net_taxable_income
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(user.user_id, year, totalGross, totalFees, totalExpenses, deductibleExpenses, netTaxableIncome).run()

      taxInfo = {
        worker_id: user.user_id,
        tax_year: year,
        total_gross_earnings: totalGross,
        total_platform_fees: totalFees,
        total_expenses: totalExpenses,
        total_tax_deductible_expenses: deductibleExpenses,
        net_taxable_income: netTaxableIncome,
        estimated_tax_owed: 0,
        tax_documents_generated: false,
        t4a_issued: false
      }
    }

    return c.json({
      success: true,
      tax_summary: taxInfo
    })
  } catch (error) {
    console.error('Get tax summary error:', error)
    return c.json({ error: 'Failed to get tax summary' }, 500)
  }
})

// ===== CLIENT COMMUNICATION SYSTEM =====

// Get message threads for worker
workerRoutes.get('/messages/threads', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { status = 'active', limit = 20, offset = 0 } = c.req.query()

    const threads = await c.env.DB.prepare(`
      SELECT 
        mt.*,
        j.title as job_title,
        j.location_city,
        j.location_province,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.profile_image_url as client_avatar,
        (SELECT content FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
        (SELECT message_type FROM messages WHERE thread_id = mt.id ORDER BY created_at DESC LIMIT 1) as last_message_type
      FROM message_threads mt
      JOIN jobs j ON mt.job_id = j.id
      JOIN users u ON mt.client_id = u.id
      WHERE mt.worker_id = ? 
        AND mt.status = ?
        AND mt.is_archived_by_worker = FALSE
      ORDER BY mt.last_message_at DESC, mt.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.user_id, status, parseInt(limit), parseInt(offset)).all()

    return c.json({
      success: true,
      threads: threads.results || []
    })
  } catch (error) {
    console.error('Get message threads error:', error)
    return c.json({ error: 'Failed to get message threads' }, 500)
  }
})

// Get messages for a specific thread
workerRoutes.get('/messages/threads/:threadId', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const threadId = c.req.param('threadId')
    const { limit = 50, offset = 0 } = c.req.query()

    // Verify worker has access to this thread
    const thread = await c.env.DB.prepare(`
      SELECT * FROM message_threads WHERE id = ? AND worker_id = ?
    `).bind(threadId, user.user_id).first()

    if (!thread) {
      return c.json({ error: 'Thread not found or access denied' }, 404)
    }

    // Get messages
    const messages = await c.env.DB.prepare(`
      SELECT 
        m.*,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name,
        u.profile_image_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.thread_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `).bind(threadId, parseInt(limit), parseInt(offset)).all()

    // Mark messages as read by worker
    await c.env.DB.prepare(`
      UPDATE messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE thread_id = ? AND receiver_id = ? AND is_read = FALSE
    `).bind(threadId, user.user_id).run()

    // Update unread count
    await c.env.DB.prepare(`
      UPDATE message_threads SET worker_unread_count = 0
      WHERE id = ? AND worker_id = ?
    `).bind(threadId, user.user_id).run()

    return c.json({
      success: true,
      thread: thread,
      messages: messages.results || []
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return c.json({ error: 'Failed to get messages' }, 500)
  }
})

// Send a new message
workerRoutes.post('/messages/send', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { thread_id, job_id, client_id, content, message_type, attachment_data, attachment_name } = await c.req.json()

    if (!content && !attachment_data) {
      return c.json({ error: 'Message content or attachment is required' }, 400)
    }

    let threadId = thread_id

    // If no thread exists, create one
    if (!threadId && job_id && client_id) {
      // Check if thread already exists for this job
      const existingThread = await c.env.DB.prepare(`
        SELECT id FROM message_threads WHERE job_id = ? AND worker_id = ? AND client_id = ?
      `).bind(job_id, user.user_id, client_id).first()

      if (existingThread) {
        threadId = existingThread.id
      } else {
        // Create new thread
        const result = await c.env.DB.prepare(`
          INSERT INTO message_threads (job_id, client_id, worker_id, last_message_at, last_message_by)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        `).bind(job_id, client_id, user.user_id, user.user_id).run()
        threadId = result.meta.last_row_id
      }
    }

    if (!threadId) {
      return c.json({ error: 'Thread ID is required' }, 400)
    }

    // Handle file attachment
    let attachmentUrl = null
    if (attachment_data && attachment_name) {
      attachmentUrl = `data:${message_type === 'image' ? 'image/jpeg' : 'application/octet-stream'};base64,${attachment_data}`
    }

    // Insert message
    const messageResult = await c.env.DB.prepare(`
      INSERT INTO messages (
        thread_id, sender_id, receiver_id, message_type, content,
        attachment_url, attachment_name, attachment_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      threadId, user.user_id, client_id || thread_id, message_type || 'text', content || '',
      attachmentUrl, attachment_name, message_type === 'image' ? 'image/jpeg' : null
    ).run()

    // Update thread
    await c.env.DB.prepare(`
      UPDATE message_threads SET
        last_message_at = CURRENT_TIMESTAMP,
        last_message_by = ?,
        client_unread_count = client_unread_count + 1
      WHERE id = ?
    `).bind(user.user_id, threadId).run()

    // Create notification for client
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, notification_type, title, content, related_entity_type, related_entity_id)
      VALUES (?, 'message', 'New message from worker', ?, 'message', ?)
    `).bind(client_id, content || 'Sent you a file', messageResult.meta.last_row_id).run()

    return c.json({
      success: true,
      message_id: messageResult.meta.last_row_id,
      thread_id: threadId
    })
  } catch (error) {
    console.error('Send message error:', error)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// Create job progress update
workerRoutes.post('/progress-updates', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      job_id,
      title,
      description,
      progress_percentage,
      update_type,
      photos,
      before_photos,
      after_photos,
      location_notes,
      next_steps,
      client_approval_required
    } = await c.req.json()

    if (!job_id || !title) {
      return c.json({ error: 'job_id and title are required' }, 400)
    }

    // Verify job belongs to worker
    const job = await c.env.DB.prepare(`
      SELECT j.*, u.id as client_id FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE j.id = ? AND j.assigned_worker_id = ?
    `).bind(job_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or not assigned to you' }, 404)
    }

    // Create progress update
    const result = await c.env.DB.prepare(`
      INSERT INTO job_progress_updates (
        job_id, worker_id, update_type, title, description, progress_percentage,
        photos, before_photos, after_photos, location_notes, next_steps,
        client_approval_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job_id, user.user_id, update_type || 'progress', title, description,
      progress_percentage || 0, JSON.stringify(photos || []),
      JSON.stringify(before_photos || []), JSON.stringify(after_photos || []),
      location_notes, next_steps, client_approval_required ? 1 : 0
    ).run()

    // Create notification for client
    const notificationContent = client_approval_required 
      ? `${title} - Approval required`
      : `${title} - ${progress_percentage || 0}% complete`

    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, notification_type, title, content, related_entity_type, related_entity_id)
      VALUES (?, 'job_update', 'Job Progress Update', ?, 'job', ?)
    `).bind(job.client_id, notificationContent, job_id).run()

    // Send system message to thread if one exists
    const thread = await c.env.DB.prepare(`
      SELECT id FROM message_threads WHERE job_id = ? AND worker_id = ?
    `).bind(job_id, user.user_id).first()

    if (thread) {
      await c.env.DB.prepare(`
        INSERT INTO messages (
          thread_id, sender_id, receiver_id, message_type, content, is_system_message
        ) VALUES (?, ?, ?, 'system', ?, TRUE)
      `).bind(thread.id, user.user_id, job.client_id, `📋 Progress Update: ${title}`).run()

      // Update thread timestamp
      await c.env.DB.prepare(`
        UPDATE message_threads SET
          last_message_at = CURRENT_TIMESTAMP,
          last_message_by = ?,
          client_unread_count = client_unread_count + 1
        WHERE id = ?
      `).bind(user.user_id, thread.id).run()
    }

    return c.json({
      success: true,
      update_id: result.meta.last_row_id,
      message: 'Progress update created successfully'
    })
  } catch (error) {
    console.error('Create progress update error:', error)
    return c.json({ error: 'Failed to create progress update' }, 500)
  }
})

// Get job progress updates
workerRoutes.get('/progress-updates/:jobId', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const jobId = c.req.param('jobId')

    // Verify job belongs to worker
    const job = await c.env.DB.prepare(`
      SELECT id FROM jobs WHERE id = ? AND assigned_worker_id = ?
    `).bind(jobId, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or not assigned to you' }, 404)
    }

    const updates = await c.env.DB.prepare(`
      SELECT * FROM job_progress_updates
      WHERE job_id = ?
      ORDER BY created_at DESC
    `).bind(jobId).all()

    return c.json({
      success: true,
      updates: updates.results || []
    })
  } catch (error) {
    console.error('Get progress updates error:', error)
    return c.json({ error: 'Failed to get progress updates' }, 500)
  }
})

// Share file with client
workerRoutes.post('/share-file', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      job_id,
      file_name,
      file_data,
      file_type,
      file_category,
      description,
      photo_stage,
      shared_with
    } = await c.req.json()

    if (!job_id || !file_name || !file_data) {
      return c.json({ error: 'job_id, file_name, and file_data are required' }, 400)
    }

    // Verify job access
    const job = await c.env.DB.prepare(`
      SELECT id, client_id FROM jobs WHERE id = ? AND assigned_worker_id = ?
    `).bind(job_id, user.user_id).first()

    if (!job) {
      return c.json({ error: 'Job not found or access denied' }, 404)
    }

    // Create file URL from base64
    const fileUrl = `data:${file_type || 'application/octet-stream'};base64,${file_data}`
    const fileSize = Math.ceil(file_data.length * 0.75) // Approximate size from base64

    // Insert shared file record
    const result = await c.env.DB.prepare(`
      INSERT INTO shared_files (
        job_id, shared_by, shared_with, file_name, file_url, file_size, file_type,
        file_category, description, photo_stage, is_progress_photo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job_id, user.user_id, shared_with || job.client_id, file_name, fileUrl, fileSize,
      file_type || 'application/octet-stream', file_category || 'general',
      description, photo_stage, file_category === 'progress_photo' ? 1 : 0
    ).run()

    // Create notification
    await c.env.DB.prepare(`
      INSERT INTO notifications (user_id, notification_type, title, content, related_entity_type, related_entity_id)
      VALUES (?, 'job_update', 'New file shared', ?, 'file', ?)
    `).bind(job.client_id, `${file_name} - ${description || 'File shared by worker'}`, result.meta.last_row_id).run()

    return c.json({
      success: true,
      file_id: result.meta.last_row_id,
      message: 'File shared successfully'
    })
  } catch (error) {
    console.error('Share file error:', error)
    return c.json({ error: 'Failed to share file' }, 500)
  }
})

// Get notifications
workerRoutes.get('/notifications', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { limit = 20, offset = 0, unread_only = false } = c.req.query()

    let whereClause = 'WHERE user_id = ?'
    let params = [user.user_id]

    if (unread_only === 'true') {
      whereClause += ' AND is_read = FALSE'
    }

    const notifications = await c.env.DB.prepare(`
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, parseInt(limit), parseInt(offset)).all()

    // Get unread count
    const unreadCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = FALSE
    `).bind(user.user_id).first()

    return c.json({
      success: true,
      notifications: notifications.results || [],
      unread_count: unreadCount.count || 0
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return c.json({ error: 'Failed to get notifications' }, 500)
  }
})

// Mark notifications as read
workerRoutes.put('/notifications/mark-read', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { notification_ids } = await c.req.json()

    if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific notifications as read
      const placeholders = notification_ids.map(() => '?').join(',')
      await c.env.DB.prepare(`
        UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND id IN (${placeholders})
      `).bind(user.user_id, ...notification_ids).run()
    } else {
      // Mark all notifications as read
      await c.env.DB.prepare(`
        UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(user.user_id).run()
    }

    return c.json({ success: true, message: 'Notifications marked as read' })
  } catch (error) {
    console.error('Mark notifications read error:', error)
    return c.json({ error: 'Failed to mark notifications as read' }, 500)
  }
})

// Get quick reply templates
workerRoutes.get('/quick-replies', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    
    const templates = await c.env.DB.prepare(`
      SELECT * FROM quick_reply_templates
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY usage_count DESC, template_name
    `).bind(user.user_id).all()

    // If no templates exist, create default ones
    if (!templates.results || templates.results.length === 0) {
      const defaultTemplates = [
        { name: 'Project Started', content: 'Hi! I\'ve started working on your project. I\'ll keep you updated on progress throughout the day.', category: 'progress' },
        { name: 'Need Clarification', content: 'I have a quick question about the project requirements. When would be a good time to discuss this?', category: 'general' },
        { name: 'Running Late', content: 'I\'m running about 30 minutes late due to traffic. I\'ll be there as soon as possible. Thanks for understanding!', category: 'scheduling' },
        { name: 'Project Complete', content: 'Your project has been completed! Please take a look and let me know if you have any questions or concerns.', category: 'completion' },
        { name: 'Supply Run', content: 'I need to pick up some additional supplies for your project. This may add about an hour to the timeline. Is that okay?', category: 'progress' }
      ]

      for (const template of defaultTemplates) {
        await c.env.DB.prepare(`
          INSERT INTO quick_reply_templates (user_id, template_name, template_content, category)
          VALUES (?, ?, ?, ?)
        `).bind(user.user_id, template.name, template.content, template.category).run()
      }

      // Fetch the newly created templates
      const newTemplates = await c.env.DB.prepare(`
        SELECT * FROM quick_reply_templates
        WHERE user_id = ? AND is_active = TRUE
        ORDER BY template_name
      `).bind(user.user_id).all()

      return c.json({
        success: true,
        templates: newTemplates.results || []
      })
    }

    return c.json({
      success: true,
      templates: templates.results || []
    })
  } catch (error) {
    console.error('Get quick replies error:', error)
    return c.json({ error: 'Failed to get quick reply templates' }, 500)
  }
})

// ===== SERVICE PORTFOLIO MANAGEMENT SYSTEM =====

// Get worker's portfolios
workerRoutes.get('/portfolios', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const { active_only = true } = c.req.query()
    
    let whereClause = 'WHERE worker_id = ?'
    let params = [user.user_id]
    
    if (active_only === 'true') {
      whereClause += ' AND is_active = TRUE'
    }
    
    const portfolios = await c.env.DB.prepare(`
      SELECT 
        wp.*,
        (SELECT COUNT(*) FROM portfolio_images WHERE portfolio_id = wp.id) as image_count,
        (SELECT COUNT(*) FROM portfolio_testimonials WHERE portfolio_id = wp.id AND is_approved = TRUE) as testimonial_count,
        (SELECT COUNT(*) FROM portfolio_pricing WHERE portfolio_id = wp.id) as pricing_tier_count,
        (SELECT image_data FROM portfolio_images WHERE portfolio_id = wp.id AND is_primary = TRUE LIMIT 1) as primary_image
      FROM worker_portfolios wp
      ${whereClause}
      ORDER BY wp.is_featured DESC, wp.updated_at DESC
    `).bind(...params).all()

    return c.json({
      success: true,
      portfolios: portfolios.results || []
    })
  } catch (error) {
    console.error('Get portfolios error:', error)
    return c.json({ error: 'Failed to get portfolios' }, 500)
  }
})

// Get single portfolio with full details
workerRoutes.get('/portfolios/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    
    // Get portfolio basic info
    const portfolio = await c.env.DB.prepare(`
      SELECT * FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found' }, 404)
    }

    // Get portfolio images
    const images = await c.env.DB.prepare(`
      SELECT * FROM portfolio_images WHERE portfolio_id = ? ORDER BY display_order ASC, created_at ASC
    `).bind(portfolioId).all()

    // Get pricing tiers
    const pricing = await c.env.DB.prepare(`
      SELECT * FROM portfolio_pricing WHERE portfolio_id = ? ORDER BY display_order ASC, price ASC
    `).bind(portfolioId).all()

    // Get testimonials
    const testimonials = await c.env.DB.prepare(`
      SELECT * FROM portfolio_testimonials WHERE portfolio_id = ? AND is_approved = TRUE ORDER BY rating DESC, created_at DESC
    `).bind(portfolioId).all()

    // Get service areas
    const serviceAreas = await c.env.DB.prepare(`
      SELECT * FROM portfolio_service_areas WHERE portfolio_id = ?
    `).bind(portfolioId).all()

    // Get tags
    const tags = await c.env.DB.prepare(`
      SELECT * FROM portfolio_tags WHERE portfolio_id = ?
    `).bind(portfolioId).all()

    // Get showcases
    const showcases = await c.env.DB.prepare(`
      SELECT * FROM portfolio_showcases WHERE portfolio_id = ? ORDER BY display_order ASC, created_at DESC
    `).bind(portfolioId).all()

    return c.json({
      success: true,
      portfolio: {
        ...portfolio,
        images: images.results || [],
        pricing: pricing.results || [],
        testimonials: testimonials.results || [],
        service_areas: serviceAreas.results || [],
        tags: tags.results || [],
        showcases: showcases.results || []
      }
    })
  } catch (error) {
    console.error('Get portfolio details error:', error)
    return c.json({ error: 'Failed to get portfolio details' }, 500)
  }
})

// Create new portfolio
workerRoutes.post('/portfolios', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const {
      title,
      description,
      category_name,
      service_type,
      base_price,
      price_unit,
      is_featured = false
    } = await c.req.json()

    if (!title || !service_type) {
      return c.json({ error: 'Title and service type are required' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO worker_portfolios (
        worker_id, title, description, category_name, service_type,
        base_price, price_unit, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.user_id, title, description, category_name, service_type,
      base_price || 0, price_unit || 'hour', is_featured ? 1 : 0
    ).run()

    return c.json({
      success: true,
      portfolio_id: result.meta.last_row_id,
      message: 'Portfolio created successfully'
    })
  } catch (error) {
    console.error('Create portfolio error:', error)
    return c.json({ error: 'Failed to create portfolio' }, 500)
  }
})

// Update portfolio
workerRoutes.put('/portfolios/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const {
      title,
      description,
      category_name,
      service_type,
      base_price,
      price_unit,
      is_featured,
      is_active
    } = await c.req.json()

    // Verify ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    await c.env.DB.prepare(`
      UPDATE worker_portfolios SET
        title = ?, description = ?, category_name = ?, service_type = ?,
        base_price = ?, price_unit = ?, is_featured = ?, is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND worker_id = ?
    `).bind(
      title, description, category_name, service_type,
      base_price, price_unit, is_featured ? 1 : 0, is_active ? 1 : 0,
      portfolioId, user.user_id
    ).run()

    return c.json({
      success: true,
      message: 'Portfolio updated successfully'
    })
  } catch (error) {
    console.error('Update portfolio error:', error)
    return c.json({ error: 'Failed to update portfolio' }, 500)
  }
})

// Add images to portfolio
workerRoutes.post('/portfolios/:id/images', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const { images, caption } = await c.req.json()

    if (!images || !Array.isArray(images)) {
      return c.json({ error: 'Images array is required' }, 400)
    }

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    const insertedImages = []

    for (const image of images) {
      if (!image.data || !image.name || !image.type) {
        continue
      }

      // Get next display order
      const lastOrder = await c.env.DB.prepare(`
        SELECT COALESCE(MAX(display_order), 0) as max_order FROM portfolio_images WHERE portfolio_id = ?
      `).bind(portfolioId).first()

      const result = await c.env.DB.prepare(`
        INSERT INTO portfolio_images (
          portfolio_id, image_name, image_data, image_type, image_size,
          caption, display_order, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        portfolioId, image.name, image.data, image.type, image.size || 0,
        caption || null, (lastOrder.max_order || 0) + 1, insertedImages.length === 0 ? 1 : 0
      ).run()

      insertedImages.push(result.meta.last_row_id)
    }

    return c.json({
      success: true,
      image_ids: insertedImages,
      message: `${insertedImages.length} image(s) added successfully`
    })
  } catch (error) {
    console.error('Add portfolio images error:', error)
    return c.json({ error: 'Failed to add images' }, 500)
  }
})

// Delete portfolio image
workerRoutes.delete('/portfolios/:id/images/:imageId', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const imageId = c.req.param('imageId')

    // Verify portfolio ownership through image
    const image = await c.env.DB.prepare(`
      SELECT pi.*, wp.worker_id FROM portfolio_images pi
      JOIN worker_portfolios wp ON pi.portfolio_id = wp.id
      WHERE pi.id = ? AND pi.portfolio_id = ? AND wp.worker_id = ?
    `).bind(imageId, portfolioId, user.user_id).first()

    if (!image) {
      return c.json({ error: 'Image not found or access denied' }, 404)
    }

    await c.env.DB.prepare(`DELETE FROM portfolio_images WHERE id = ?`).bind(imageId).run()

    return c.json({
      success: true,
      message: 'Image deleted successfully'
    })
  } catch (error) {
    console.error('Delete portfolio image error:', error)
    return c.json({ error: 'Failed to delete image' }, 500)
  }
})

// Add pricing tier
workerRoutes.post('/portfolios/:id/pricing', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const {
      tier_name,
      tier_description,
      price,
      price_unit,
      features,
      estimated_duration,
      is_popular = false
    } = await c.req.json()

    if (!tier_name || !price || !price_unit) {
      return c.json({ error: 'Tier name, price, and price unit are required' }, 400)
    }

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    // Get next display order
    const lastOrder = await c.env.DB.prepare(`
      SELECT COALESCE(MAX(display_order), 0) as max_order FROM portfolio_pricing WHERE portfolio_id = ?
    `).bind(portfolioId).first()

    const result = await c.env.DB.prepare(`
      INSERT INTO portfolio_pricing (
        portfolio_id, tier_name, tier_description, price, price_unit,
        features, estimated_duration, is_popular, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      portfolioId, tier_name, tier_description, price, price_unit,
      JSON.stringify(features || []), estimated_duration, is_popular ? 1 : 0,
      (lastOrder.max_order || 0) + 1
    ).run()

    return c.json({
      success: true,
      pricing_id: result.meta.last_row_id,
      message: 'Pricing tier added successfully'
    })
  } catch (error) {
    console.error('Add pricing tier error:', error)
    return c.json({ error: 'Failed to add pricing tier' }, 500)
  }
})

// Update pricing tier
workerRoutes.put('/portfolios/:id/pricing/:pricingId', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const pricingId = c.req.param('pricingId')
    const {
      tier_name,
      tier_description,
      price,
      price_unit,
      features,
      estimated_duration,
      is_popular
    } = await c.req.json()

    // Verify ownership
    const pricing = await c.env.DB.prepare(`
      SELECT pp.*, wp.worker_id FROM portfolio_pricing pp
      JOIN worker_portfolios wp ON pp.portfolio_id = wp.id
      WHERE pp.id = ? AND pp.portfolio_id = ? AND wp.worker_id = ?
    `).bind(pricingId, portfolioId, user.user_id).first()

    if (!pricing) {
      return c.json({ error: 'Pricing tier not found or access denied' }, 404)
    }

    await c.env.DB.prepare(`
      UPDATE portfolio_pricing SET
        tier_name = ?, tier_description = ?, price = ?, price_unit = ?,
        features = ?, estimated_duration = ?, is_popular = ?
      WHERE id = ?
    `).bind(
      tier_name, tier_description, price, price_unit,
      JSON.stringify(features || []), estimated_duration, is_popular ? 1 : 0,
      pricingId
    ).run()

    return c.json({
      success: true,
      message: 'Pricing tier updated successfully'
    })
  } catch (error) {
    console.error('Update pricing tier error:', error)
    return c.json({ error: 'Failed to update pricing tier' }, 500)
  }
})

// Delete pricing tier
workerRoutes.delete('/portfolios/:id/pricing/:pricingId', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const pricingId = c.req.param('pricingId')

    // Verify ownership
    const pricing = await c.env.DB.prepare(`
      SELECT pp.*, wp.worker_id FROM portfolio_pricing pp
      JOIN worker_portfolios wp ON pp.portfolio_id = wp.id
      WHERE pp.id = ? AND pp.portfolio_id = ? AND wp.worker_id = ?
    `).bind(pricingId, portfolioId, user.user_id).first()

    if (!pricing) {
      return c.json({ error: 'Pricing tier not found or access denied' }, 404)
    }

    await c.env.DB.prepare(`DELETE FROM portfolio_pricing WHERE id = ?`).bind(pricingId).run()

    return c.json({
      success: true,
      message: 'Pricing tier deleted successfully'
    })
  } catch (error) {
    console.error('Delete pricing tier error:', error)
    return c.json({ error: 'Failed to delete pricing tier' }, 500)
  }
})

// Add before/after showcase
workerRoutes.post('/portfolios/:id/showcases', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const {
      title,
      description,
      before_image,
      after_image,
      project_duration,
      project_cost,
      client_testimonial,
      is_featured = false
    } = await c.req.json()

    if (!title || !before_image || !after_image) {
      return c.json({ error: 'Title, before image, and after image are required' }, 400)
    }

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    // Get next display order
    const lastOrder = await c.env.DB.prepare(`
      SELECT COALESCE(MAX(display_order), 0) as max_order FROM portfolio_showcases WHERE portfolio_id = ?
    `).bind(portfolioId).first()

    const result = await c.env.DB.prepare(`
      INSERT INTO portfolio_showcases (
        portfolio_id, title, description, before_image_data, after_image_data,
        project_duration, project_cost, client_testimonial, is_featured, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      portfolioId, title, description, before_image.data, after_image.data,
      project_duration, project_cost, client_testimonial, is_featured ? 1 : 0,
      (lastOrder.max_order || 0) + 1
    ).run()

    return c.json({
      success: true,
      showcase_id: result.meta.last_row_id,
      message: 'Showcase added successfully'
    })
  } catch (error) {
    console.error('Add showcase error:', error)
    return c.json({ error: 'Failed to add showcase' }, 500)
  }
})

// Get portfolio testimonials
workerRoutes.get('/portfolios/:id/testimonials', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const { include_pending = false } = c.req.query()

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    let whereClause = 'WHERE portfolio_id = ? AND is_approved = TRUE'
    let params = [portfolioId]

    if (include_pending === 'true') {
      whereClause = 'WHERE portfolio_id = ?'
    }

    const testimonials = await c.env.DB.prepare(`
      SELECT * FROM portfolio_testimonials
      ${whereClause}
      ORDER BY rating DESC, created_at DESC
    `).bind(...params).all()

    return c.json({
      success: true,
      testimonials: testimonials.results || []
    })
  } catch (error) {
    console.error('Get testimonials error:', error)
    return c.json({ error: 'Failed to get testimonials' }, 500)
  }
})

// Add service areas
workerRoutes.post('/portfolios/:id/service-areas', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const { areas } = await c.req.json()

    if (!areas || !Array.isArray(areas)) {
      return c.json({ error: 'Service areas array is required' }, 400)
    }

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    // Delete existing service areas for this portfolio
    await c.env.DB.prepare(`DELETE FROM portfolio_service_areas WHERE portfolio_id = ?`).bind(portfolioId).run()

    // Add new service areas
    const addedAreas = []
    for (const area of areas) {
      if (area.area_name) {
        const result = await c.env.DB.prepare(`
          INSERT INTO portfolio_service_areas (
            portfolio_id, area_name, postal_code, city, state, travel_fee, max_distance
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          portfolioId, area.area_name, area.postal_code || null,
          area.city || null, area.state || null, area.travel_fee || 0,
          area.max_distance || null
        ).run()
        
        addedAreas.push(result.meta.last_row_id)
      }
    }

    return c.json({
      success: true,
      area_ids: addedAreas,
      message: `${addedAreas.length} service area(s) added successfully`
    })
  } catch (error) {
    console.error('Add service areas error:', error)
    return c.json({ error: 'Failed to add service areas' }, 500)
  }
})

// Update portfolio tags
workerRoutes.post('/portfolios/:id/tags', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const { tags } = await c.req.json()

    if (!tags || !Array.isArray(tags)) {
      return c.json({ error: 'Tags array is required' }, 400)
    }

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    // Delete existing tags for this portfolio
    await c.env.DB.prepare(`DELETE FROM portfolio_tags WHERE portfolio_id = ?`).bind(portfolioId).run()

    // Add new tags
    const addedTags = []
    for (const tag of tags) {
      if (tag.trim()) {
        const result = await c.env.DB.prepare(`
          INSERT INTO portfolio_tags (portfolio_id, tag_name) VALUES (?, ?)
        `).bind(portfolioId, tag.trim()).run()
        
        addedTags.push(result.meta.last_row_id)
      }
    }

    return c.json({
      success: true,
      tag_ids: addedTags,
      message: `${addedTags.length} tag(s) updated successfully`
    })
  } catch (error) {
    console.error('Update tags error:', error)
    return c.json({ error: 'Failed to update tags' }, 500)
  }
})

// Get portfolio statistics
workerRoutes.get('/portfolios/:id/stats', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')
    const { period = '30' } = c.req.query() // days

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    // Get stats for the period
    const stats = await c.env.DB.prepare(`
      SELECT 
        SUM(views) as total_views,
        SUM(inquiries) as total_inquiries,
        SUM(bookings) as total_bookings,
        SUM(revenue) as total_revenue
      FROM portfolio_stats
      WHERE portfolio_id = ? AND stat_date >= date('now', '-${period} days')
    `).bind(portfolioId).first()

    // Get daily breakdown
    const dailyStats = await c.env.DB.prepare(`
      SELECT * FROM portfolio_stats
      WHERE portfolio_id = ? AND stat_date >= date('now', '-${period} days')
      ORDER BY stat_date DESC
    `).bind(portfolioId).all()

    return c.json({
      success: true,
      stats: {
        total_views: stats.total_views || 0,
        total_inquiries: stats.total_inquiries || 0,
        total_bookings: stats.total_bookings || 0,
        total_revenue: stats.total_revenue || 0,
        daily_breakdown: dailyStats.results || []
      }
    })
  } catch (error) {
    console.error('Get portfolio stats error:', error)
    return c.json({ error: 'Failed to get portfolio statistics' }, 500)
  }
})

// Delete portfolio
workerRoutes.delete('/portfolios/:id', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const portfolioId = c.req.param('id')

    // Verify portfolio ownership
    const portfolio = await c.env.DB.prepare(`
      SELECT id FROM worker_portfolios WHERE id = ? AND worker_id = ?
    `).bind(portfolioId, user.user_id).first()

    if (!portfolio) {
      return c.json({ error: 'Portfolio not found or access denied' }, 404)
    }

    // Delete related data (cascading delete)
    await c.env.DB.prepare(`DELETE FROM portfolio_images WHERE portfolio_id = ?`).bind(portfolioId).run()
    await c.env.DB.prepare(`DELETE FROM portfolio_pricing WHERE portfolio_id = ?`).bind(portfolioId).run()
    await c.env.DB.prepare(`DELETE FROM portfolio_service_areas WHERE portfolio_id = ?`).bind(portfolioId).run()
    await c.env.DB.prepare(`DELETE FROM portfolio_tags WHERE portfolio_id = ?`).bind(portfolioId).run()
    await c.env.DB.prepare(`DELETE FROM portfolio_showcases WHERE portfolio_id = ?`).bind(portfolioId).run()
    await c.env.DB.prepare(`DELETE FROM portfolio_stats WHERE portfolio_id = ?`).bind(portfolioId).run()
    
    // Delete portfolio
    await c.env.DB.prepare(`DELETE FROM worker_portfolios WHERE id = ?`).bind(portfolioId).run()

    return c.json({
      success: true,
      message: 'Portfolio and all related data deleted successfully'
    })
  } catch (error) {
    console.error('Delete portfolio error:', error)
    return c.json({ error: 'Failed to delete portfolio' }, 500)
  }
})

// =================================================================================
// CANADIAN BUSINESS COMPLIANCE MANAGEMENT API ENDPOINTS
// =================================================================================

// Get worker compliance information
workerRoutes.get('/compliance', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')

    const compliance = await c.env.DB.prepare(`
      SELECT * FROM worker_compliance 
      WHERE user_id = ?
    `).bind(user.user_id).first()

    return c.json({
      success: true,
      compliance: compliance || null
    })
  } catch (error) {
    console.error('Get compliance error:', error)
    return c.json({ error: 'Failed to retrieve compliance information' }, 500)
  }
})

// Update worker compliance information
workerRoutes.post('/compliance/update', requireWorkerAuth, async (c) => {
  try {
    const user = c.get('user')
    const complianceData = await c.req.json()

    // Validate required fields for Canadian compliance
    const validationErrors = []
    
    // WSIB validation for Ontario workers
    if (complianceData.wsib_number && !/^\d{8}-\d$/.test(complianceData.wsib_number)) {
      validationErrors.push('WSIB number must be in format 12345678-9')
    }

    // Insurance validation
    if (complianceData.insurance_policy_number && !complianceData.insurance_provider) {
      validationErrors.push('Insurance provider is required when policy number is provided')
    }

    // License validation
    if (complianceData.license_number && !complianceData.license_type) {
      validationErrors.push('License type is required when license number is provided')
    }

    // Validate dates are in the future
    const today = new Date().toISOString().split('T')[0]
    if (complianceData.wsib_valid_until && complianceData.wsib_valid_until <= today) {
      validationErrors.push('WSIB expiration date must be in the future')
    }
    if (complianceData.insurance_valid_until && complianceData.insurance_valid_until <= today) {
      validationErrors.push('Insurance expiration date must be in the future')
    }
    if (complianceData.license_valid_until && complianceData.license_valid_until <= today) {
      validationErrors.push('License expiration date must be in the future')
    }

    if (validationErrors.length > 0) {
      return c.json({ error: validationErrors.join(', ') }, 400)
    }

    // Check if compliance record exists
    const existingCompliance = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()

    if (existingCompliance) {
      // Update existing record
      await c.env.DB.prepare(`
        UPDATE worker_compliance SET
          wsib_number = ?,
          wsib_valid_until = ?,
          insurance_provider = ?,
          insurance_policy_number = ?,
          insurance_valid_until = ?,
          license_type = ?,
          license_number = ?,
          license_valid_until = ?,
          compliance_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        complianceData.wsib_number || null,
        complianceData.wsib_valid_until || null,
        complianceData.insurance_provider || null,
        complianceData.insurance_policy_number || null,
        complianceData.insurance_valid_until || null,
        complianceData.license_type || null,
        complianceData.license_number || null,
        complianceData.license_valid_until || null,
        user.user_id
      ).run()
    } else {
      // Insert new record
      await c.env.DB.prepare(`
        INSERT INTO worker_compliance (
          user_id, wsib_number, wsib_valid_until, insurance_provider,
          insurance_policy_number, insurance_valid_until, license_type,
          license_number, license_valid_until, compliance_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        user.user_id,
        complianceData.wsib_number || null,
        complianceData.wsib_valid_until || null,
        complianceData.insurance_provider || null,
        complianceData.insurance_policy_number || null,
        complianceData.insurance_valid_until || null,
        complianceData.license_type || null,
        complianceData.license_number || null,
        complianceData.license_valid_until || null
      ).run()
    }

    return c.json({
      success: true,
      message: 'Compliance information updated successfully. It will be reviewed by our team within 24-48 hours.'
    })
  } catch (error) {
    console.error('Update compliance error:', error)
    return c.json({ error: 'Failed to update compliance information' }, 500)
  }
})

// Get compliance requirements by service type and province
workerRoutes.get('/compliance/requirements', requireWorkerAuth, async (c) => {
  try {
    const serviceType = c.req.query('service_type')
    const province = c.req.query('province')

    // Canadian compliance requirements by service type and province
    const requirements = {
      'electrical': {
        'ON': {
          license: 'ECRA/ESA License required',
          insurance: 'Minimum $2M liability insurance',
          wsib: 'WSIB coverage mandatory',
          additional: 'Must be registered with Electrical Safety Authority (ESA)'
        },
        'BC': {
          license: 'FSR (Field Safety Representative) required for electrical work',
          insurance: 'Minimum $1M liability insurance',
          wsib: 'WorkSafeBC coverage required'
        }
      },
      'plumbing': {
        'ON': {
          license: 'Ontario College of Trades certification',
          insurance: 'Minimum $2M liability insurance',
          wsib: 'WSIB coverage mandatory'
        },
        'BC': {
          license: 'Industry Training Authority (ITA) certification',
          insurance: 'Minimum $1M liability insurance',
          wsib: 'WorkSafeBC coverage required'
        }
      },
      'general': {
        'ON': {
          insurance: 'Minimum $1M liability insurance recommended',
          wsib: 'WSIB coverage required for employees'
        },
        'BC': {
          insurance: 'Minimum $1M liability insurance recommended',
          wsib: 'WorkSafeBC coverage required for employees'
        }
      }
    }

    const serviceRequirements = requirements[serviceType] || requirements['general']
    const provinceRequirements = serviceRequirements[province] || serviceRequirements['ON']

    return c.json({
      success: true,
      requirements: provinceRequirements
    })
  } catch (error) {
    console.error('Get requirements error:', error)
    return c.json({ error: 'Failed to retrieve compliance requirements' }, 500)
  }
})
