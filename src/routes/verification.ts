import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const verificationRoutes = new Hono<{ Bindings: Bindings }>()

// Send email verification
verificationRoutes.post('/send-verification', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400)
    }
    
    // Check if user exists
    const user = await c.env.DB.prepare(`
      SELECT id, email, email_verified FROM users WHERE email = ? AND is_active = 1
    `).bind(email).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    if (user.email_verified) {
      return c.json({ message: 'Email is already verified' })
    }
    
    // Generate verification token using Web Crypto API
    const tokenArray = new Uint8Array(32)
    crypto.getRandomValues(tokenArray)
    const token = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour expiration
    
    // Store verification token
    await c.env.DB.prepare(`
      INSERT INTO email_verification_tokens (user_id, token, email, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, token, email, expiresAt.toISOString()).run()
    
    // TODO: Send actual email here using your email service
    // For now, we'll return the token for testing purposes
    const verificationLink = `${c.req.header('origin') || 'http://localhost:3000'}/auth/verify-email?token=${token}`
    
    console.log('Email verification link:', verificationLink)
    
    return c.json({ 
      success: true,
      message: 'Verification email sent successfully',
      // Remove this in production - only for testing
      verification_link: verificationLink
    })
    
  } catch (error) {
    console.error('Send verification error:', error)
    return c.json({ error: 'Failed to send verification email' }, 500)
  }
})

// Verify email token
verificationRoutes.get('/verify-email', async (c) => {
  try {
    const token = c.req.query('token')
    
    if (!token) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification - Kwikr Directory</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 flex items-center justify-center min-h-screen">
          <div class="bg-white p-8 rounded-lg shadow-lg text-center">
            <div class="text-red-600 text-5xl mb-4">❌</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Invalid Verification Link</h1>
            <p class="text-gray-600 mb-4">This verification link is invalid or missing the token.</p>
            <a href="/login" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Go to Login
            </a>
          </div>
        </body>
        </html>
      `)
    }
    
    // Find and validate token
    const tokenRecord = await c.env.DB.prepare(`
      SELECT evt.*, u.email, u.email_verified 
      FROM email_verification_tokens evt
      JOIN users u ON evt.user_id = u.id
      WHERE evt.token = ? AND evt.used_at IS NULL
    `).bind(token).first()
    
    if (!tokenRecord) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification - Kwikr Directory</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 flex items-center justify-center min-h-screen">
          <div class="bg-white p-8 rounded-lg shadow-lg text-center">
            <div class="text-red-600 text-5xl mb-4">❌</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Invalid Token</h1>
            <p class="text-gray-600 mb-4">This verification token is invalid or has already been used.</p>
            <a href="/auth/resend-verification" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2">
              Resend Verification
            </a>
            <a href="/login" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              Go to Login
            </a>
          </div>
        </body>
        </html>
      `)
    }
    
    // Check if token expired
    const now = new Date()
    const expiresAt = new Date(tokenRecord.expires_at)
    if (now > expiresAt) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification - Kwikr Directory</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 flex items-center justify-center min-h-screen">
          <div class="bg-white p-8 rounded-lg shadow-lg text-center">
            <div class="text-orange-500 text-5xl mb-4">⏰</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Token Expired</h1>
            <p class="text-gray-600 mb-4">This verification token has expired. Please request a new one.</p>
            <a href="/auth/resend-verification" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2">
              Resend Verification
            </a>
            <a href="/login" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              Go to Login
            </a>
          </div>
        </body>
        </html>
      `)
    }
    
    // Mark email as verified
    await c.env.DB.prepare(`
      UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(tokenRecord.user_id).run()
    
    // Mark token as used
    await c.env.DB.prepare(`
      UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(tokenRecord.id).run()
    
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="bg-white p-8 rounded-lg shadow-lg text-center">
          <div class="text-green-600 text-5xl mb-4">✅</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
          <p class="text-gray-600 mb-4">Your email address has been successfully verified.</p>
          <a href="/login" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Continue to Login
          </a>
        </div>
      </body>
      </html>
    `)
    
  } catch (error) {
    console.error('Email verification error:', error)
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="bg-white p-8 rounded-lg shadow-lg text-center">
          <div class="text-red-600 text-5xl mb-4">❌</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
          <p class="text-gray-600 mb-4">An error occurred during email verification.</p>
          <a href="/login" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Go to Login
          </a>
        </div>
      </body>
      </html>
    `)
  }
})

// Check verification status
verificationRoutes.get('/status/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'))
    
    const user = await c.env.DB.prepare(`
      SELECT email_verified, is_verified FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    return c.json({
      email_verified: Boolean(user.email_verified),
      profile_verified: Boolean(user.is_verified)
    })
    
  } catch (error) {
    console.error('Verification status error:', error)
    return c.json({ error: 'Failed to get verification status' }, 500)
  }
})

// Business verification request
verificationRoutes.post('/request-business-verification', async (c) => {
  try {
    const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '') || 
                        c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
    
    if (!sessionToken) {
      return c.json({ error: 'Authentication required' }, 401)
    }
    
    // Get user from session
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, u.role FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND u.is_active = 1
    `).bind(sessionToken).first()
    
    if (!session || session.role !== 'worker') {
      return c.json({ error: 'Worker account required' }, 403)
    }
    
    const {
      business_license_number,
      business_registration_number,
      license_document_url,
      registration_document_url,
      insurance_document_url
    } = await c.req.json()
    
    // Get business info from user profile
    const profile = await c.env.DB.prepare(`
      SELECT bio FROM user_profiles WHERE user_id = ?
    `).bind(session.user_id).first()
    
    if (!profile?.bio) {
      return c.json({ error: 'Business information not found' }, 400)
    }
    
    let businessInfo
    try {
      businessInfo = JSON.parse(profile.bio)
    } catch {
      return c.json({ error: 'Invalid business information format' }, 400)
    }
    
    // Check if verification request already exists
    const existingRequest = await c.env.DB.prepare(`
      SELECT id, status FROM business_verification_requests 
      WHERE user_id = ? AND status = 'pending'
    `).bind(session.user_id).first()
    
    if (existingRequest) {
      return c.json({ error: 'Verification request already pending' }, 409)
    }
    
    // Create verification request
    await c.env.DB.prepare(`
      INSERT INTO business_verification_requests 
      (user_id, business_name, business_email, business_phone, 
       business_license_number, business_registration_number,
       license_document_url, registration_document_url, insurance_document_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      session.user_id,
      businessInfo.company_name || '',
      businessInfo.business_email || '',
      businessInfo.business_phone || '',
      business_license_number || null,
      business_registration_number || null,
      license_document_url || null,
      registration_document_url || null,
      insurance_document_url || null
    ).run()
    
    return c.json({
      success: true,
      message: 'Business verification request submitted successfully'
    })
    
  } catch (error) {
    console.error('Business verification request error:', error)
    return c.json({ error: 'Failed to submit verification request' }, 500)
  }
})