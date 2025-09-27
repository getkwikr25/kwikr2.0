import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const complianceRoutes = new Hono<{ Bindings: Bindings }>()

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
  
  const session = await c.env.DB.prepare(`
    SELECT s.user_id, u.role, u.email, u.first_name, u.last_name, u.province
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ? AND u.is_active = 1
  `).bind(sessionToken).first()
  
  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401)
  }
  
  c.set('user', session)
  await next()
}

// Get compliance requirements for a specific province and trade
complianceRoutes.get('/requirements/:province/:trade', requireAuth, async (c) => {
  try {
    const province = c.req.param('province').toUpperCase()
    const trade = decodeURIComponent(c.req.param('trade'))
    
    const requirements = await c.env.DB.prepare(`
      SELECT 
        id, province, trade_type, requirement_category, requirement_name,
        requirement_description, is_required, issuing_authority,
        minimum_coverage_amount, coverage_currency, includes_completed_operations,
        applies_to_employees, applies_to_subcontractors, applies_to_commercial, applies_to_residential,
        contract_threshold_amount, verification_method, renewal_frequency_months
      FROM compliance_requirements
      WHERE province = ? AND trade_type = ? AND is_active = 1
      ORDER BY requirement_category, is_required DESC, requirement_name
    `).bind(province, trade).all()
    
    return c.json({
      province,
      trade_type: trade,
      requirements: requirements.results || []
    })
    
  } catch (error) {
    console.error('Error fetching compliance requirements:', error)
    return c.json({ error: 'Failed to fetch requirements' }, 500)
  }
})

// Get worker's compliance status
complianceRoutes.get('/worker/:userId/status', requireAuth, async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    const currentUser = c.get('user')
    
    // Check if user can access this worker's compliance data
    if (currentUser.role !== 'admin' && currentUser.user_id !== userId) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    // Get compliance summary
    const summary = await c.env.DB.prepare(`
      SELECT * FROM worker_compliance_summary WHERE user_id = ?
    `).bind(userId).first()
    
    // Get detailed compliance records
    const records = await c.env.DB.prepare(`
      SELECT 
        wcr.*,
        cr.requirement_name,
        cr.requirement_description,
        cr.requirement_category,
        cr.issuing_authority,
        cr.is_required
      FROM worker_compliance_records wcr
      JOIN compliance_requirements cr ON wcr.requirement_id = cr.id
      WHERE wcr.user_id = ?
      ORDER BY cr.requirement_category, cr.is_required DESC, wcr.expiry_date ASC
    `).bind(userId).all()
    
    // Get active alerts
    const alerts = await c.env.DB.prepare(`
      SELECT * FROM compliance_alerts 
      WHERE user_id = ? AND is_resolved = 0
      ORDER BY alert_priority DESC, alert_date ASC
    `).bind(userId).all()
    
    return c.json({
      summary: summary || null,
      records: records.results || [],
      alerts: alerts.results || []
    })
    
  } catch (error) {
    console.error('Error fetching compliance status:', error)
    return c.json({ error: 'Failed to fetch compliance status' }, 500)
  }
})

// Upload compliance document
complianceRoutes.post('/worker/:userId/document', requireAuth, async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    const currentUser = c.get('user')
    
    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.user_id !== userId) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    const {
      requirement_id,
      document_type,
      document_number,
      document_file_path,
      issue_date,
      expiry_date,
      coverage_amount,
      insurer_name,
      policy_details,
      notes
    } = await c.req.json()
    
    // Validate required fields
    if (!requirement_id || !document_type) {
      return c.json({ error: 'Requirement ID and document type are required' }, 400)
    }
    
    // Check if record already exists
    const existing = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance_records 
      WHERE user_id = ? AND requirement_id = ?
    `).bind(userId, requirement_id).first()
    
    if (existing) {
      // Update existing record
      const result = await c.env.DB.prepare(`
        UPDATE worker_compliance_records 
        SET document_type = ?, document_number = ?, document_file_path = ?,
            issue_date = ?, expiry_date = ?, coverage_amount = ?, insurer_name = ?,
            policy_details = ?, notes = ?, compliance_status = 'pending',
            verification_status = 'unverified', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND requirement_id = ?
      `).bind(
        document_type, document_number, document_file_path,
        issue_date, expiry_date, coverage_amount, insurer_name,
        policy_details, notes, userId, requirement_id
      ).run()
      
      if (result.success) {
        // Log the update
        await c.env.DB.prepare(`
          INSERT INTO compliance_audit_log 
          (user_id, requirement_id, compliance_record_id, action_type, new_status, performed_by, details)
          VALUES (?, ?, ?, 'document_upload', 'pending', ?, 'Document updated')
        `).bind(userId, requirement_id, existing.id, currentUser.user_id).run()
        
        return c.json({ message: 'Document updated successfully', record_id: existing.id })
      }
    } else {
      // Create new record
      const result = await c.env.DB.prepare(`
        INSERT INTO worker_compliance_records 
        (user_id, requirement_id, document_type, document_number, document_file_path,
         issue_date, expiry_date, coverage_amount, insurer_name, policy_details, notes,
         compliance_status, verification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unverified')
      `).bind(
        userId, requirement_id, document_type, document_number, document_file_path,
        issue_date, expiry_date, coverage_amount, insurer_name, policy_details, notes
      ).run()
      
      if (result.success) {
        // Log the creation
        await c.env.DB.prepare(`
          INSERT INTO compliance_audit_log 
          (user_id, requirement_id, compliance_record_id, action_type, new_status, performed_by, details)
          VALUES (?, ?, ?, 'document_upload', 'pending', ?, 'New document uploaded')
        `).bind(userId, requirement_id, result.meta.last_row_id, currentUser.user_id).run()
        
        return c.json({ message: 'Document uploaded successfully', record_id: result.meta.last_row_id })
      }
    }
    
    return c.json({ error: 'Failed to save document' }, 500)
    
  } catch (error) {
    console.error('Error uploading compliance document:', error)
    return c.json({ error: 'Failed to upload document' }, 500)
  }
})

// Admin: Verify compliance document
complianceRoutes.post('/admin/verify/:recordId', requireAuth, async (c) => {
  try {
    const recordId = parseInt(c.req.param('recordId'))
    const currentUser = c.get('user')
    
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const { verification_status, compliance_status, notes } = await c.req.json()
    
    if (!verification_status || !compliance_status) {
      return c.json({ error: 'Verification status and compliance status are required' }, 400)
    }
    
    // Get current record for audit
    const currentRecord = await c.env.DB.prepare(`
      SELECT * FROM worker_compliance_records WHERE id = ?
    `).bind(recordId).first()
    
    if (!currentRecord) {
      return c.json({ error: 'Compliance record not found' }, 404)
    }
    
    // Update record
    const result = await c.env.DB.prepare(`
      UPDATE worker_compliance_records 
      SET verification_status = ?, compliance_status = ?, verified_by = ?, 
          verified_at = CURRENT_TIMESTAMP, notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(verification_status, compliance_status, currentUser.user_id, notes, recordId).run()
    
    if (result.success) {
      // Log the verification
      await c.env.DB.prepare(`
        INSERT INTO compliance_audit_log 
        (user_id, requirement_id, compliance_record_id, action_type, 
         old_status, new_status, performed_by, details)
        VALUES (?, ?, ?, 'verification', ?, ?, ?, ?)
      `).bind(
        currentRecord.user_id, 
        currentRecord.requirement_id,
        recordId,
        currentRecord.compliance_status,
        compliance_status,
        currentUser.user_id,
        `Verification: ${verification_status}, Status: ${compliance_status}`
      ).run()
      
      // Update worker compliance summary
      await updateWorkerComplianceSummary(c.env.DB, currentRecord.user_id)
      
      return c.json({ message: 'Compliance verification updated successfully' })
    }
    
    return c.json({ error: 'Failed to update verification' }, 500)
    
  } catch (error) {
    console.error('Error verifying compliance:', error)
    return c.json({ error: 'Failed to verify compliance' }, 500)
  }
})

// Get compliance dashboard data for admin
complianceRoutes.get('/admin/dashboard', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user')
    
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    // Get compliance statistics
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT wcs.user_id) as total_workers,
        COUNT(CASE WHEN wcs.overall_compliance_status = 'compliant' THEN 1 END) as compliant_workers,
        COUNT(CASE WHEN wcs.overall_compliance_status = 'non_compliant' THEN 1 END) as non_compliant_workers,
        COUNT(CASE WHEN wcs.overall_compliance_status = 'partial' THEN 1 END) as partial_compliant_workers,
        COUNT(CASE WHEN wcs.has_critical_missing = 1 THEN 1 END) as critical_missing_workers,
        COUNT(CASE WHEN wcs.has_expiring_soon = 1 THEN 1 END) as expiring_soon_workers,
        AVG(wcs.compliance_percentage) as avg_compliance_percentage
      FROM worker_compliance_summary wcs
      JOIN users u ON wcs.user_id = u.id
      WHERE u.role = 'worker' AND u.is_active = 1
    `).first()
    
    // Get recent compliance activities
    const recentActivities = await c.env.DB.prepare(`
      SELECT 
        cal.*, u.first_name, u.last_name, u.email,
        cr.requirement_name, cr.trade_type
      FROM compliance_audit_log cal
      JOIN users u ON cal.user_id = u.id
      LEFT JOIN compliance_requirements cr ON cal.requirement_id = cr.id
      ORDER BY cal.performed_at DESC
      LIMIT 20
    `).all()
    
    // Get workers with critical compliance issues
    const criticalIssues = await c.env.DB.prepare(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.province,
        wcs.overall_compliance_status, wcs.compliance_percentage,
        wcs.has_critical_missing, wcs.next_expiry_date
      FROM worker_compliance_summary wcs
      JOIN users u ON wcs.user_id = u.id
      WHERE u.role = 'worker' AND u.is_active = 1 
        AND (wcs.has_critical_missing = 1 OR wcs.has_expiring_soon = 1)
      ORDER BY wcs.has_critical_missing DESC, wcs.next_expiry_date ASC
      LIMIT 50
    `).all()
    
    // Get compliance by province
    const provinceStats = await c.env.DB.prepare(`
      SELECT 
        wcs.province,
        COUNT(*) as total_workers,
        AVG(wcs.compliance_percentage) as avg_compliance,
        COUNT(CASE WHEN wcs.overall_compliance_status = 'compliant' THEN 1 END) as compliant_count
      FROM worker_compliance_summary wcs
      JOIN users u ON wcs.user_id = u.id
      WHERE u.role = 'worker' AND u.is_active = 1
      GROUP BY wcs.province
      ORDER BY avg_compliance DESC
    `).all()
    
    return c.json({
      statistics: stats || {},
      recent_activities: recentActivities.results || [],
      critical_issues: criticalIssues.results || [],
      province_stats: provinceStats.results || []
    })
    
  } catch (error) {
    console.error('Error fetching compliance dashboard:', error)
    return c.json({ error: 'Failed to fetch compliance dashboard' }, 500)
  }
})

// Helper function to update worker compliance summary
async function updateWorkerComplianceSummary(db: D1Database, userId: number) {
  try {
    // Get user info
    const user = await db.prepare(`
      SELECT province, primary_trade FROM users 
      LEFT JOIN user_profiles ON users.id = user_profiles.user_id
      WHERE users.id = ?
    `).bind(userId).first()
    
    if (!user) return
    
    const province = user.province || 'ON'
    const primaryTrade = user.primary_trade || 'General Services'
    
    // Get all requirements for this user's province and trade
    const requirements = await db.prepare(`
      SELECT id FROM compliance_requirements
      WHERE province = ? AND trade_type = ? AND is_active = 1
    `).bind(province, primaryTrade).all()
    
    const totalRequirements = requirements.results?.length || 0
    
    // Get compliance records for this user
    const complianceRecords = await db.prepare(`
      SELECT compliance_status, expiry_date, risk_level
      FROM worker_compliance_records wcr
      JOIN compliance_requirements cr ON wcr.requirement_id = cr.id
      WHERE wcr.user_id = ? AND cr.province = ? AND cr.trade_type = ?
    `).bind(userId, province, primaryTrade).all()
    
    const records = complianceRecords.results || []
    
    // Calculate statistics
    const compliantCount = records.filter(r => r.compliance_status === 'compliant').length
    const pendingCount = records.filter(r => r.compliance_status === 'pending').length
    const expiredCount = records.filter(r => r.compliance_status === 'expired').length
    
    const compliancePercentage = totalRequirements > 0 ? (compliantCount / totalRequirements) * 100 : 0
    
    let overallStatus = 'non_compliant'
    if (compliancePercentage >= 100) overallStatus = 'compliant'
    else if (compliancePercentage >= 50) overallStatus = 'partial'
    
    const hasCriticalMissing = records.some(r => r.risk_level === 'high' && r.compliance_status !== 'compliant')
    
    // Find next expiry date
    const validRecords = records.filter(r => r.expiry_date && r.compliance_status === 'compliant')
    const nextExpiryDate = validRecords.length > 0 ? 
      validRecords.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0].expiry_date : null
    
    // Check if any compliant items expire within 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const hasExpiringSoon = validRecords.some(r => new Date(r.expiry_date) <= thirtyDaysFromNow)
    
    // Upsert summary record
    await db.prepare(`
      INSERT OR REPLACE INTO worker_compliance_summary 
      (user_id, province, primary_trade, overall_compliance_status, compliance_percentage,
       overall_risk_level, total_requirements, compliant_requirements, pending_requirements,
       expired_requirements, last_compliance_check, next_expiry_date, has_critical_missing,
       has_expiring_soon, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      userId, province, primaryTrade, overallStatus, compliancePercentage,
      hasCriticalMissing ? 'high' : 'medium', totalRequirements, compliantCount,
      pendingCount, expiredCount, nextExpiryDate, hasCriticalMissing ? 1 : 0,
      hasExpiringSoon ? 1 : 0
    ).run()
    
  } catch (error) {
    console.error('Error updating compliance summary:', error)
  }
}
