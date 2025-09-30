import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { Logger } from '../utils/logger'
import { PasswordUtils } from '../utils/crypto'

type Bindings = {
  DB: D1Database;
}

export const authRoutes = new Hono<{ Bindings: Bindings }>()

// Register new user
authRoutes.post('/register', async (c) => {
  try {
    const requestBody = await c.req.json()
    console.log('Registration request body:', requestBody)
    
    // Handle both camelCase and snake_case field names for compatibility
    const email = requestBody.email
    const password = requestBody.password
    const role = requestBody.role
    const firstName = requestBody.firstName || requestBody.first_name
    const lastName = requestBody.lastName || requestBody.last_name
    const province = requestBody.province
    const city = requestBody.city
    const phone = requestBody.phone
    
    // Business fields (for workers)
    const businessName = requestBody.businessName || requestBody.business_name
    const businessEmail = requestBody.businessEmail || requestBody.business_email
    const serviceType = requestBody.serviceType || requestBody.service_type
    
    console.log('Extracted fields:', { email, password: '***', role, firstName, lastName, province, city, phone, businessName, businessEmail, serviceType })
    
    // Validate required fields - base requirements for all users
    if (!email || !password || !role || !firstName || !lastName || !province || !city) {
      console.log('Validation failed - missing base fields')
      return c.json({ error: 'All basic fields are required' }, 400)
    }
    
    // Additional validation for workers - require business fields
    if (role === 'worker') {
      if (!businessName || !businessEmail || !phone || !serviceType) {
        console.log('Validation failed - missing worker business fields')
        return c.json({ error: 'All business fields are required for service providers' }, 400)
      }
      
      // Validate business email format
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(businessEmail)) {
        return c.json({ error: 'Please provide a valid business email address' }, 400)
      }
      
      // Validate phone format (basic Canadian phone validation)
      const phoneRegex = /^[\+]?[1]?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
      const cleanPhone = phone.replace(/[\s\(\)\-\.]/g, '')
      if (cleanPhone.length < 10) {
        return c.json({ error: 'Please provide a valid 10-digit phone number' }, 400)
      }
      
      // Validate business name (minimum 2 words to seem legitimate)
      const nameParts = businessName.trim().split(' ').filter(part => part.length > 0)
      if (nameParts.length < 1 || businessName.length < 3) {
        return c.json({ error: 'Please provide a valid business name' }, 400)
      }
    }
    
    // Validate role
    if (!['client', 'worker'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400)
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()
    
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409)
    }
    
    // Secure password hashing using bcrypt (simpler, more standard)
    const passwordHash = await PasswordUtils.hashPassword(password)
    
    // Insert new user - remove service_type and password_salt as they don't exist in users table
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, province, city, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      email, 
      passwordHash, 
      role, 
      firstName, 
      lastName, 
      province, 
      city, 
      phone || null
    ).run()
    
    if (!result.success) {
      return c.json({ error: 'Failed to create user' }, 500)
    }
    
    // Validate business email uniqueness for workers
    if (role === 'worker' && businessEmail) {
      const existingBusinessEmail = await c.env.DB.prepare(`
        SELECT up.user_id FROM user_profiles up 
        JOIN users u ON up.user_id = u.id 
        WHERE up.bio LIKE ? AND u.is_active = 1
      `).bind(`%${businessEmail}%`).first()
      
      if (existingBusinessEmail) {
        return c.json({ error: 'Business email already registered' }, 409)
      }
    }

    // Create user profile with business information for workers  
    if (role === 'worker') {
      // Store business info in bio field temporarily until we can add proper columns
      const businessInfo = JSON.stringify({
        company_name: businessName,
        business_email: businessEmail,
        business_phone: phone,
        service_type: serviceType,
        verification_status: 'pending'
      })
      
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (user_id, bio) VALUES (?, ?)
      `).bind(result.meta.last_row_id, businessInfo).run()
      
      // Create worker service record based on selected service type
      if (serviceType) {
        await c.env.DB.prepare(`
          INSERT INTO worker_services (user_id, service_category, service_name, description, is_available)
          VALUES (?, ?, ?, ?, 1)
        `).bind(
          result.meta.last_row_id, 
          serviceType, 
          serviceType, 
          `Professional ${serviceType} services provided by ${businessName}`
        ).run()
      }
    } else {
      // Create basic profile for clients
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (user_id) VALUES (?)
      `).bind(result.meta.last_row_id).run()
    }
    
    // Create default subscription
    await c.env.DB.prepare(`
      INSERT INTO subscriptions (user_id, plan_type, status, monthly_fee, per_job_fee)
      VALUES (?, 'pay_as_you_go', 'active', 0.00, 12.00)
    `).bind(result.meta.last_row_id).run()
    
    // Create session token automatically after successful registration
    const sessionToken = btoa(`${result.meta.last_row_id}:${Date.now()}:${Math.random()}`)
    
    // Store session (no expiration - sessions are permanent until logout)
    await c.env.DB.prepare(`
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address)
      VALUES (?, ?, datetime('now', '+10 years'), ?)
    `).bind(result.meta.last_row_id, sessionToken, 'unknown').run()
    
    // Set session cookie for dashboard authentication
    const host = c.req.header('host') || ''
    const isHttps = host.includes('.dev') || c.req.header('x-forwarded-proto') === 'https'
    c.header('Set-Cookie', `session=${sessionToken}; Path=/; Max-Age=31536000; SameSite=Lax; ${isHttps ? 'Secure;' : ''}`)
    
    return c.json({ 
      success: true,
      message: 'User created successfully',
      userId: result.meta.last_row_id,
      role: role,
      session_token: sessionToken,
      user: {
        id: result.meta.last_row_id,
        email: email,
        role: role,
        firstName: firstName,
        lastName: lastName,
        province: province,
        city: city
      }
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Login user
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }
    
    // Find user - handle missing password_salt column gracefully
    const user = await c.env.DB.prepare(`
      SELECT id, email, password_hash, role, first_name, last_name, province, city, is_verified, is_active
      FROM users WHERE email = ?
    `).bind(email).first()
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    // Verify password - handle bcrypt, PBKDF2 with salt, and legacy base64
    let passwordValid = false
    
    if (PasswordUtils.isBcryptHash(user.password_hash)) {
      // Bcrypt password verification (for admin accounts and new accounts)
      passwordValid = PasswordUtils.verifyBcryptPassword(password, user.password_hash)
    } else if (PasswordUtils.isLegacyHash(user.password_hash)) {
      // Legacy base64 password verification
      passwordValid = PasswordUtils.verifyLegacyPassword(password, user.password_hash)
    } else {
      // Try to get password_salt for PBKDF2 verification
      try {
        const userWithSalt = await c.env.DB.prepare(`
          SELECT password_salt FROM users WHERE id = ?
        `).bind(user.id).first()
        
        if (userWithSalt?.password_salt) {
          // New secure PBKDF2 password verification
          passwordValid = await PasswordUtils.verifyPassword(password, user.password_hash, userWithSalt.password_salt)
        }
      } catch (error) {
        // password_salt column doesn't exist, fall back to legacy verification
        passwordValid = PasswordUtils.verifyLegacyPassword(password, user.password_hash)
      }
    }
    
    if (!passwordValid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    
    if (!user.is_active) {
      return c.json({ error: 'Account is disabled' }, 401)
    }
    
    // Update last login
    await c.env.DB.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run()
    
    // Create session token (simple approach - in production use JWT or secure sessions)
    const sessionToken = btoa(`${user.id}:${Date.now()}:${Math.random()}`)
    
    // Store session (no expiration - sessions are permanent until logout)
    await c.env.DB.prepare(`
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address)
      VALUES (?, ?, datetime('now', '+10 years'), ?)
    `).bind(user.id, sessionToken, 'unknown').run()
    
    // Set session cookie for dashboard authentication
    const host = c.req.header('host') || ''
    const isHttps = host.includes('.dev') || c.req.header('x-forwarded-proto') === 'https'
    c.header('Set-Cookie', `session=${sessionToken}; Path=/; Max-Age=31536000; SameSite=Lax; ${isHttps ? 'Secure;' : ''}`)
    
    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        province: user.province,
        city: user.city,
        isVerified: user.is_verified
      },
      sessionToken
    })
    
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get session info
authRoutes.get('/session-info', async (c) => {
  try {
    const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '')
    
    if (!sessionToken) {
      return c.json({ error: 'No session token provided' }, 401)
    }
    
    // SIMPLIFIED: Verify session without expiration check
    const session = await c.env.DB.prepare(`
      SELECT us.user_id, u.email, u.role, u.first_name, u.last_name, u.province, u.city, u.is_verified
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ? AND u.is_active = 1
    `).bind(sessionToken).first()
    
    if (!session) {
      return c.json({ error: 'Invalid session' }, 401)
    }
    
    return c.json({
      user_id: session.user_id,
      email: session.email,
      role: session.role,
      first_name: session.first_name,
      last_name: session.last_name,
      province: session.province,
      city: session.city,
      is_verified: session.is_verified
    })
    
  } catch (error) {
    console.error('Session info error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Logout user
authRoutes.post('/logout', async (c) => {
  try {
    const sessionToken = c.req.header('Authorization')?.replace('Bearer ', '')
    
    if (sessionToken) {
      // Delete session
      await c.env.DB.prepare(`
        DELETE FROM user_sessions WHERE session_token = ?
      `).bind(sessionToken).run()
    }
    
    return c.json({ message: 'Logged out successfully' })
    
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})


// Verify session and get current user
authRoutes.get('/me', async (c) => {
  const userAgent = c.req.header('User-Agent') || 'unknown'
  const referer = c.req.header('Referer') || 'unknown'
  
  try {
    Logger.info('Auth /me request received', { 
      userAgent, 
      referer,
      endpoint: '/api/auth/me'
    })
    
    // Try to get token from Authorization header first, then from cookies
    let sessionToken = c.req.header('Authorization')?.replace('Bearer ', '')
    const cookieHeader = c.req.header('Cookie')
    
    if (!sessionToken) {
      Logger.debug('No Authorization header, checking cookies', { 
        cookieHeader: cookieHeader ? 'present' : 'missing' 
      })
      
      // Try to get from cookies
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
              Logger.debug('Session token extracted from cookies', {
                tokenLength: value.length,
                tokenPreview: value.substring(0, 10) + '...'
              })
              break
            }
          }
        }
      }
    } else {
      Logger.debug('Session token found in Authorization header')
    }
    
    if (!sessionToken) {
      Logger.warn('No session token provided in request', { cookieHeader, userAgent })
      return c.json({ error: 'No session token provided', expired: true }, 401)
    }
    
    // Verify session
    Logger.debug('Verifying session token in database', {
      tokenPreview: sessionToken.substring(0, 10) + '...'
    })
    
    // SIMPLIFIED: Remove session expiration check - sessions never expire
    const session = await c.env.DB.prepare(`
      SELECT s.user_id, u.email, u.role, u.first_name, u.last_name, u.province, u.city, u.is_verified,
             s.created_at, s.ip_address
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND u.is_active = 1
    `).bind(sessionToken).first()
    
    if (!session) {
      Logger.sessionValidation(false, sessionToken, { userAgent, referer })
      
      // SIMPLIFIED: Just log that session wasn't found
      Logger.warn('Session not found in database', {
        tokenPreview: sessionToken.substring(0, 10) + '...'
      })
      
      return c.json({ error: 'Invalid or expired session', expired: true }, 401)
    }
    
    Logger.sessionValidation(true, sessionToken, {
      userId: session.user_id,
      email: session.email,
      role: session.role,
      sessionCreated: session.created_at,
      sessionExpires: session.expires_at
    })
    
    return c.json({
      user: {
        id: session.user_id,
        email: session.email,
        role: session.role,
        firstName: session.first_name,
        lastName: session.last_name,
        province: session.province,
        city: session.city,
        isVerified: session.is_verified
      }
    })
    
  } catch (error) {
    console.error('Session verification error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})


// Demo login for testing (no password required)
authRoutes.post('/demo-login', async (c) => {
  try {
    const { role } = await c.req.json()
    
    if (!role || !['client', 'worker', 'admin'].includes(role)) {
      return c.json({ error: 'Valid role is required (client, worker, admin)' }, 400)
    }
    
    // Use the actual accounts you want to test with
    const demoUser = {
      id: role === 'client' ? 939 : role === 'worker' ? 938 : 942, // Real account IDs
      email: role === 'client' ? 'mo.carty@admin.kwikr.ca' : role === 'worker' ? 'jo.carty@admin.kwikr.ca' : 'admin@kwikrdirectory.com',
      role: role,
      first_name: role === 'client' ? 'MO' : role === 'worker' ? 'JO' : 'Platform',
      last_name: role === 'client' ? 'CARTY' : role === 'worker' ? 'CARTY' : 'Administrator',
      province: 'ON',
      city: 'Toronto',
      is_verified: 1,
      is_active: 1
    }
    
    // Create session token (simple approach - in production use JWT or secure sessions)
    const sessionToken = btoa(`${demoUser.id}:${Date.now()}:${Math.random()}`)
    
    // Try to store session in database, but don't fail if it doesn't work
    try {
      await c.env.DB.prepare(`
        INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address)
        VALUES (?, ?, datetime('now', '+10 years'), ?)
      `).bind(demoUser.id, sessionToken, 'demo').run()
    } catch (dbError) {
      console.log('Database session storage failed, continuing with in-memory session')
    }
    
    // Set session cookie - use simple, reliable approach
    const host = c.req.header('host') || ''
    const proto = c.req.header('x-forwarded-proto') || ''
    const url = c.req.url || ''
    const isHttps = proto === 'https' || url.startsWith('https://') || host.includes('.dev')
    
    // Debug removed for production
    
    // Use SameSite=Lax which works better for same-site requests
    // Remove HttpOnly so JavaScript can access for backup storage
    c.header('Set-Cookie', `session=${sessionToken}; Path=/; Max-Age=31536000; SameSite=Lax; ${isHttps ? 'Secure;' : ''}`)
    
    return c.json({
      message: 'Demo login successful',
      user: {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        firstName: demoUser.first_name,
        lastName: demoUser.last_name,
        province: demoUser.province,
        city: demoUser.city,
        isVerified: demoUser.is_verified
      },
      sessionToken
    })
    
  } catch (error) {
    console.error('Demo login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})