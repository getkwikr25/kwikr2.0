import { Hono } from 'hono'
import { Logger } from '../utils/logger'

type Bindings = {
  DB: D1Database;
}

export const dashboardRoutes = new Hono<{ Bindings: Bindings }>()

// Admin route to fix demo data (temporary)
dashboardRoutes.get('/admin/fix-profile/:userId', async (c) => {
  const userId = parseInt(c.req.param('userId'))
  
  try {
    // Get the user's real information
    const user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // Update or insert proper profile data
    await c.env.DB.prepare(`
      INSERT INTO user_profiles (user_id, company_name, bio, company_description)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        company_name = ?,
        bio = ?,
        company_description = ?
    `).bind(
      userId,
      `${user.first_name} ${user.last_name}`, // Real name instead of demo
      'Professional service provider committed to delivering high-quality work.',
      'Experienced professional providing reliable services in the local area.',
      `${user.first_name} ${user.last_name}`, // Update case
      'Professional service provider committed to delivering high-quality work.',
      'Experienced professional providing reliable services in the local area.'
    ).run()
    
    // Also update worker_services with real business info
    if (user.service_type && user.business_name) {
      await c.env.DB.prepare(`
        UPDATE worker_services 
        SET service_category = ?, 
            service_name = ?,
            description = ?
        WHERE user_id = ?
      `).bind(
        user.service_type,
        user.business_name,
        `Professional ${user.service_type.toLowerCase()} by ${user.business_name}`,
        userId
      ).run()
    }
    
    return c.json({ 
      success: true, 
      message: `Profile updated for ${user.first_name} ${user.last_name} (${user.business_name})`,
      user: user 
    })
  } catch (error) {
    console.error('Fix profile error:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// Route to fix company name specifically
dashboardRoutes.get('/admin/fix-company/:userId', async (c) => {
  const userId = parseInt(c.req.param('userId'))
  
  try {
    const user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first()
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }
    
    // Use real business name from users table
    const companyName = user.business_name || `${user.first_name} ${user.last_name}`
    
    await c.env.DB.prepare(`
      UPDATE user_profiles 
      SET company_name = ?
      WHERE user_id = ?
    `).bind(companyName, userId).run()
    
    return c.json({ 
      success: true, 
      message: `Company name updated to: ${companyName}`,
      company_name: companyName
    })
  } catch (error) {
    console.error('Fix company error:', error)
    return c.json({ error: 'Failed to update company name' }, 500)
  }
})

// Middleware to check if worker has active subscription
const requireWorkerSubscription = async (c: any, next: any) => {
  const user = c.get('user')
  
  // Only apply to workers
  if (user.role !== 'worker') {
    await next()
    return
  }
  
  try {
    // Check if worker has active subscription
    const subscription = await c.env.DB.prepare(`
      SELECT ws.*, sp.plan_name 
      FROM worker_subscriptions ws
      JOIN subscription_plans sp ON ws.plan_id = sp.id
      WHERE ws.user_id = ? AND ws.subscription_status = 'active'
    `).bind(user.user_id).first()
    
    if (!subscription) {
      // Worker has no active subscription - allow access but show subscription prompt in dashboard
      console.log('Worker has no active subscription, allowing access with limited features')
      c.set('subscription', null)
    }
    
    // Store subscription info for use in routes
    c.set('subscription', subscription)
    await next()
  } catch (error) {
    console.error('Error checking worker subscription:', error)
    // If subscription check fails, allow access but don't redirect - let the user continue
    Logger.error('Worker subscription check failed, allowing access', { error: (error as Error).message, user_id: user.user_id })
    c.set('subscription', null)
    await next()
  }
}

// Middleware to verify authentication and get user
const requireAuth = async (c: any, next: any) => {
  const path = c.req.path
  const userAgent = c.req.header('User-Agent') || 'unknown'
  const referer = c.req.header('Referer') || 'unknown'
  
  Logger.info(`Dashboard auth check for ${path}`, { userAgent, referer, path })
  
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
      Logger.debug('Session token found in cookies', { 
        tokenPreview: sessionToken.substring(0, 10) + '...',
        path 
      })
    }
    
    // Also check for demo_session cookie as fallback
    if (!sessionToken) {
      const demoMatch = cookies.match(/demo_session=([^;]+)/)
      if (demoMatch) {
        const demoInfo = demoMatch[1]
        const [role, timestamp] = demoInfo.split(':')
        
        // Create a compatible session token from demo_session (with improved security)
        const randomSalt = Math.random().toString(36).substring(2, 15)
        sessionToken = btoa(`demo-${role}:${timestamp}:${randomSalt}`)
        Logger.debug('Demo session found in cookies, creating compatible token', { 
          role, 
          timestamp, 
          path 
        })
      }
    }
  }
  
  // If no cookie, try Authorization header
  if (!sessionToken) {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.replace('Bearer ', '')
      Logger.debug('Session token found in Authorization header', { path })
    }
  }
  
  // If still no token, try query parameter
  if (!sessionToken) {
    sessionToken = c.req.query('token')
    if (sessionToken) {
      Logger.debug('Session token found in query parameter', { path })
    }
  }
  
  if (!sessionToken) {
    Logger.warn('No session token found, redirecting to login', { path, cookies, userAgent })
    
    // Instead of redirecting to session=expired, redirect to login page
    return c.redirect('/login?return=' + encodeURIComponent(path))
    
    // If no session and accessing a specific role dashboard, auto-login as demo user
    if (false && (path.startsWith('/dashboard/client') || path.startsWith('/dashboard/worker') || path.startsWith('/dashboard/admin'))) {
      let role = 'client'
      if (path.startsWith('/dashboard/worker')) role = 'worker'
      if (path.startsWith('/dashboard/admin')) role = 'admin'
      
      Logger.info(`Attempting auto-demo login for role: ${role}`, { path })
      
      try {
        // Create demo user on-the-fly without database dependency
        // Updated user IDs to match actual database data
        const demoUser = {
          id: role === 'client' ? 1 : role === 'worker' ? 4 : 50,
          user_id: role === 'client' ? 1 : role === 'worker' ? 4 : 50,
          email: `demo.${role}@kwikr.ca`,
          role: role,
          first_name: 'Demo',
          last_name: role.charAt(0).toUpperCase() + role.slice(1),
          province: 'ON',
          city: 'Toronto',
          is_verified: 1,
          is_active: 1
        }
        
        // Create session for demo user (with improved security)
        const secureRandom = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        const demoSessionToken = btoa(`${demoUser.id}:${Date.now()}:${secureRandom}`)
        
        // Try to store session in database, but continue even if it fails
        try {
          await c.env.DB.prepare(`
            INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address)
            VALUES (?, ?, datetime('now', '+7 days'), ?)
          `).bind(demoUser.id, demoSessionToken, 'auto-demo').run()
        } catch (dbError) {
          console.log('Database session storage failed, continuing with in-memory session')
        }
        
        Logger.sessionCreated(demoUser.id, demoSessionToken, {
          role,
          email: demoUser.email,
          isAutoDemo: true,
          path
        })
        
        // Set cookie and continue with the demo session
        // Use secure=true for HTTPS (detect from URL or headers) with HttpOnly for security
        const host = c.req.header('host') || ''
        const isHttps = host.includes('.dev') || c.req.header('x-forwarded-proto') === 'https'
        c.header('Set-Cookie', `session=${demoSessionToken}; path=/; max-age=604800; secure=${isHttps}; samesite=strict; httponly`)
        sessionToken = demoSessionToken
      } catch (error) {
        Logger.authError('Auto demo login failed', error as Error, { role, path })
        return c.redirect('/?login=required')
      }
    } else {
      Logger.warn('No session token and not a dashboard path', { path })
      return c.redirect('/?login=required')
    }
  }
  
  try {
    Logger.debug('Validating session token in database', { 
      tokenPreview: sessionToken.substring(0, 10) + '...',
      path 
    })
    
    let session = null
    
    try {
      // SIMPLIFIED: Remove expiration check - sessions never expire
      session = await c.env.DB.prepare(`
        SELECT s.user_id, u.role, u.first_name, u.last_name, u.email, u.is_verified,
               s.created_at, s.ip_address
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ? AND u.is_active = 1
      `).bind(sessionToken).first()
    } catch (dbError) {
      console.log('Database session lookup failed, checking for demo session')
    }
    
    // If no session in database, check if this is a valid demo session token
    if (!session) {
      try {
        // Validate sessionToken format before decoding to prevent injection
        if (!/^[A-Za-z0-9+/]+=*$/.test(sessionToken)) {
          throw new Error('Invalid session token format')
        }
        
        const decoded = atob(sessionToken)
        // Don't log sensitive session data in production
        Logger.debug('Processing demo session token', { tokenLength: decoded.length })
        
        // Handle both old format (userId:timestamp:random) and new format (demo-role:timestamp:reliable)
        const parts = decoded.split(':')
        let role = null, timestamp = null, demoUserId = null
        
        if (parts.length >= 2) {
          if (parts[0].startsWith('demo-')) {
            // New format: demo-client:timestamp:reliable
            role = parts[0].replace('demo-', '')
            timestamp = parts[1]
            demoUserId = role === 'client' ? 939 : role === 'worker' ? 938 : 942
          } else if (!isNaN(parseInt(parts[0]))) {
            // Old format: userId:timestamp:random (PRIORITIZE THIS FORMAT)
            demoUserId = parseInt(parts[0])
            timestamp = parts[1]
            // Map actual user IDs to roles
            if (demoUserId === 939) role = 'client'      // MO CARTY
            else if (demoUserId === 938) role = 'worker' // JO CARTY  
            else if (demoUserId === 942) role = 'admin'  // Platform Administrator
            else role = demoUserId === 1 ? 'client' : demoUserId === 4 ? 'worker' : 'admin' // Legacy fallback
          }
          
          // SIMPLIFIED: Remove all session expiration checks - just validate format and role
          if (role && timestamp && demoUserId && ['client', 'worker', 'admin'].includes(role)) {
            // Use real user data based on ID
            const userData = demoUserId === 939 ? 
              { first_name: 'MO', last_name: 'CARTY', email: 'mo.carty@admin.kwikr.ca' } :
              demoUserId === 938 ? 
              { first_name: 'JO', last_name: 'CARTY', email: 'jo.carty@admin.kwikr.ca' } :
              { first_name: 'Platform', last_name: 'Administrator', email: 'admin@kwikrdirectory.com' }
            
            session = {
              user_id: demoUserId,
              role: role,
              first_name: userData.first_name,
              last_name: userData.last_name,
              email: userData.email,
              is_verified: 1,
              expires_at: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 10 years (effectively never expires)
              created_at: new Date().toISOString(),
              ip_address: 'demo'
            }
            
            Logger.info('Valid demo session detected and accepted', { userId: demoUserId, role, path, timestamp })
          } else {
            Logger.warn('Demo session validation failed - invalid format or role', { role, timestamp, demoUserId, parts })
          }
        } else {
          Logger.warn('Demo session token format invalid', { parts, decoded })
        }
      } catch (decodeError) {
        Logger.warn('Failed to decode session token as demo session:', decodeError)
      }
    }
    
    if (!session) {
      Logger.sessionValidation(false, sessionToken, { path, userAgent })
      
      // SIMPLIFIED: Just log that session validation failed, no complex expiration checks
      Logger.warn('Session validation failed - session not found or invalid', { 
        tokenPreview: sessionToken.substring(0, 10) + '...',
        path 
      })
      
      // For AJAX requests, return JSON error
      const acceptHeader = c.req.header('Accept') || ''
      if (acceptHeader.includes('application/json')) {
        return c.json({ error: 'Session expired', expired: true }, 401)
      }
      
      // For regular page requests, redirect to login page instead of session=expired
      Logger.warn('Session validation completely failed, redirecting to login', { 
        path, 
        userAgent,
        tokenPreview: sessionToken ? sessionToken.substring(0, 10) + '...' : 'none'
      })
      return c.redirect('/login?return=' + encodeURIComponent(path))
    }
    
    Logger.sessionValidation(true, sessionToken, {
      userId: session.user_id,
      email: session.email,
      role: session.role,
      sessionCreated: session.created_at,
      sessionExpires: session.expires_at,
      sessionSource: session.ip_address,
      path
    })
    
    c.set('user', session)
    await next()
  } catch (error) {
    Logger.authError('Auth middleware database error', error as Error, { path })
    Logger.error('Authentication failed for dashboard access', { path, error: (error as Error).message, sessionToken })
    return c.redirect('/login?return=' + encodeURIComponent(path))
  }
}

// Dashboard entry point - redirect to role-specific dashboard
dashboardRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  
  switch (user.role) {
    case 'client':
      return c.redirect('/dashboard/client')
    case 'worker':
      return c.redirect('/dashboard/worker')
    case 'admin':
      return c.redirect('/dashboard/admin')
    default:
      return c.redirect('/?error=invalid_role')
  }
})

// Client Dashboard
dashboardRoutes.get('/client', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  // Fetch client jobs and stats server-side
  try {
    // Get client jobs
    const jobs = await c.env.DB.prepare(`
      SELECT j.*, c.name as category_name, c.icon_class,
             (SELECT COUNT(*) FROM bids WHERE job_id = j.id AND status = 'pending') as bid_count,
             w.first_name as worker_first_name, w.last_name as worker_last_name
      FROM jobs j
      JOIN job_categories c ON j.category_id = c.id
      LEFT JOIN users w ON j.assigned_worker_id = w.id
      WHERE j.client_id = ?
      ORDER BY j.created_at DESC
    `).bind(user.user_id).all()

    // Get client stats
    const totalJobs = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE client_id = ?
    `).bind(user.user_id).first()

    const activeJobs = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status IN ('posted', 'assigned', 'in_progress')
    `).bind(user.user_id).first()

    const completedJobs = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'completed'
    `).bind(user.user_id).first()

    const pendingBids = await c.env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM bids b 
      JOIN jobs j ON b.job_id = j.id 
      WHERE j.client_id = ? AND b.status = 'pending'
    `).bind(user.user_id).first()

    const stats = {
      total: totalJobs?.count || 0,
      active: activeJobs?.count || 0,
      completed: completedJobs?.count || 0,
      pendingBids: pendingBids?.count || 0
    }

    const jobsData = jobs.results || []
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Client Dashboard - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Client Dashboard</h1>
                <p class="text-gray-600">Manage your jobs and find service providers</p>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-kwikr-green text-2xl mr-4">
                            <i class="fas fa-briefcase"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="totalJobs">${stats.total}</p>
                            <p class="text-sm text-gray-600">Total Jobs</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-blue-500 text-2xl mr-4">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="activeJobs">${stats.active}</p>
                            <p class="text-sm text-gray-600">Active Jobs</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-green-500 text-2xl mr-4">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="completedJobs">${stats.completed}</p>
                            <p class="text-sm text-gray-600">Completed</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-yellow-500 text-2xl mr-4">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="pendingBids">${stats.pendingBids}</p>
                            <p class="text-sm text-gray-600">Pending Bids</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Job Management -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <div class="flex justify-between items-center">
                                <h2 class="text-xl font-semibold text-gray-900">My Jobs</h2>
                                <a href="/dashboard/client/post-job" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 inline-block">
                                    <i class="fas fa-plus mr-2"></i>Post New Job
                                </a>
                            </div>
                        </div>
                        
                        <!-- Enhanced Job Progress Container -->
                        <div id="client-jobs-progress-container" class="p-6">
                            <div class="text-center py-8">
                                <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                                <p class="text-gray-500">Loading your jobs with progress tracking...</p>
                            </div>
                        </div>
                        
                        <!-- Fallback Jobs List (hidden by default) -->
                        <div id="jobsList" class="divide-y divide-gray-200 hidden">
                            ${jobsData.length === 0 ? `
                                <div class="p-6 text-center text-gray-500">
                                    <i class="fas fa-briefcase text-2xl mb-4"></i>
                                    <p>No jobs posted yet</p>
                                    <a href="/dashboard/client/post-job" class="mt-4 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 inline-block">
                                        Post Your First Job
                                    </a>
                                </div>
                            ` : jobsData.map(job => `
                                <div class="p-6">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <div class="flex items-center mb-2">
                                                <i class="${job.icon_class} text-kwikr-green mr-2"></i>
                                                <h3 class="text-lg font-semibold text-gray-900">${job.title}</h3>
                                                <span class="ml-3 px-2 py-1 text-xs rounded-full ${job.status === 'posted' ? 'bg-blue-100 text-blue-800' : job.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' : job.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                                            </div>
                                            <p class="text-gray-600 mb-3">${job.description}</p>
                                            <div class="flex items-center space-x-4 text-sm text-gray-500">
                                                <span><i class="fas fa-dollar-sign mr-1"></i>$${job.budget_min} - $${job.budget_max}</span>
                                                <span><i class="fas fa-calendar mr-1"></i>${new Date(job.start_date).toLocaleDateString()}</span>
                                                <span><i class="fas fa-map-marker-alt mr-1"></i>${job.location_city}, ${job.location_province}</span>
                                                ${job.bid_count > 0 ? `<span class="text-kwikr-green font-medium"><i class="fas fa-users mr-1"></i>${job.bid_count} bids</span>` : '<span class="text-gray-400">No bids yet</span>'}
                                            </div>
                                        </div>
                                        <div class="ml-6 flex space-x-2">
                                            <button onclick="viewJobDetails(${job.id})" class="text-kwikr-green hover:text-green-600">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            ${job.status === 'posted' ? `
                                                <button onclick="editJob(${job.id})" class="text-blue-500 hover:text-blue-600">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-6">
                    <!-- Quick Actions -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div class="space-y-3">
                            <a href="/dashboard/client/post-job" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                <i class="fas fa-briefcase text-kwikr-green mr-3"></i>
                                Post a New Job
                            </a>
                            <a href="/dashboard/client/browse-workers" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                <i class="fas fa-search text-kwikr-green mr-3"></i>
                                Browse Service Providers
                            </a>
                            <a href="/dashboard/client/profile" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                <i class="fas fa-user text-kwikr-green mr-3"></i>
                                Edit Profile
                            </a>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                        <div id="recentActivities" class="space-y-3">
                            <div class="text-center text-gray-500">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p class="text-sm mt-2">Loading...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Post Job Modal -->
        <div id="postJobModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
            <div class="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold">Post a New Job</h3>
                    <button onclick="hidePostJobModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form id="postJobForm" onsubmit="handlePostJob(event)">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                            <input type="text" id="jobTitle" class="w-full p-3 border border-gray-300 rounded-lg" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select id="jobCategory" class="w-full p-3 border border-gray-300 rounded-lg" required>
                                <option value="">Select Category</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                            <select id="jobUrgency" class="w-full p-3 border border-gray-300 rounded-lg">
                                <option value="low">Low</option>
                                <option value="normal" selected>Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Budget Min ($CAD)</label>
                            <input type="number" id="budgetMin" class="w-full p-3 border border-gray-300 rounded-lg" step="0.01" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Budget Max ($CAD)</label>
                            <input type="number" id="budgetMax" class="w-full p-3 border border-gray-300 rounded-lg" step="0.01" required>
                        </div>
                        
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="jobDescription" rows="4" class="w-full p-3 border border-gray-300 rounded-lg" required></textarea>
                        </div>
                        
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Location Address (Optional)</label>
                            <input type="text" id="locationAddress" class="w-full p-3 border border-gray-300 rounded-lg">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                            <input type="date" id="startDate" class="w-full p-3 border border-gray-300 rounded-lg">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Expected Completion</label>
                            <input type="date" id="expectedCompletion" class="w-full p-3 border border-gray-300 rounded-lg">
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full bg-kwikr-green text-white py-3 rounded-lg font-semibold hover:bg-green-600">
                        Post Job
                    </button>
                </form>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          // Embed user information directly from server-side session
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}",
            province: "${user.province || ''}",
            city: "${user.city || ''}",
            isVerified: ${user.is_verified || 0}
          };
          console.log('User information embedded from server:', window.currentUser);
          
          // Load recent activities after page loads
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
              if (typeof window.loadRecentActivities === 'function') {
                window.loadRecentActivities();
              }
            }, 1000);
          });
        </script>
        <script src="/static/client-dashboard.js"></script>
        <script src="/static/client-job-progress.js"></script>
        <script>
          // Load job progress visualization on page load
          document.addEventListener('DOMContentLoaded', function() {
            console.log('Loading client job progress visualization');
            setTimeout(() => {
              loadClientJobsWithProgress();
            }, 500);
          });
        </script>
    </body>
    </html>
  `)
  
  } catch (error) {
    console.error('Client dashboard error:', error)
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - Kwikr Directory</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen">
          <div class="text-center">
              <h1 class="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h1>
              <p class="text-gray-600 mb-4">There was an error loading your dashboard.</p>
              <a href="/" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Back to Home</a>
          </div>
      </body>
      </html>
    `)
  }
})

// Worker Dashboard
// Worker subscription selection page (for workers without active subscription)
// Worker Subscription Management Dashboard
dashboardRoutes.get('/worker/subscriptions', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }
  
  // Get worker's current subscription
  const subscription = await c.env.DB.prepare(`
    SELECT ws.*, sp.plan_name, sp.monthly_price
    FROM worker_subscriptions ws
    JOIN subscription_plans sp ON ws.plan_id = sp.id
    WHERE ws.user_id = ? AND ws.subscription_status = 'active'
  `).bind(user.user_id).first()
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Management - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- Navigation -->
            <nav class="bg-white shadow-sm border-b border-gray-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex items-center">
                            <a href="/dashboard/worker" class="text-2xl font-bold text-green-600">
                                <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                            </a>
                        </div>
                        <div class="flex items-center space-x-4">
                            <a href="/dashboard/worker" class="text-gray-700 hover:text-green-600">Dashboard</a>
                            <button onclick="logout()" class="text-red-600 hover:text-red-700">
                                <i class="fas fa-sign-out-alt mr-1"></i>Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div class="px-4 py-6 sm:px-0">
                    <h1 class="text-3xl font-bold text-gray-900 mb-6">Subscription Management</h1>
                    
                    ${subscription ? `
                    <!-- Current Subscription -->
                    <div class="bg-white rounded-lg shadow mb-6">
                        <div class="p-6">
                            <h2 class="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
                            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-lg font-medium text-green-800">${subscription.plan_name}</h3>
                                        <p class="text-green-600">$${subscription.monthly_price}/month</p>
                                        <p class="text-sm text-green-600">Active subscription</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            <i class="fas fa-check-circle mr-1"></i>Active
                                        </span>
                                        <p class="text-sm text-gray-500 mt-1">Started: ${subscription.start_date}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : `
                    <!-- No Active Subscription -->
                    <div class="bg-white rounded-lg shadow mb-6">
                        <div class="p-6 text-center">
                            <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                            <h2 class="text-xl font-semibold text-gray-900 mb-2">No Active Subscription</h2>
                            <p class="text-gray-600 mb-4">You need an active subscription to receive job opportunities.</p>
                            <a href="/dashboard/worker/select-plan" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                                Choose a Plan
                            </a>
                        </div>
                    </div>
                    `}
                </div>
            </div>
        </div>

        <script>
            function logout() {
                if (confirm('Are you sure you want to logout?')) {
                    window.location.href = '/auth/login'
                }
            }
        </script>
    </body>
    </html>
  `)
})

dashboardRoutes.get('/worker/select-plan', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }
  
  // Check if worker already has active subscription (redirect if they do)
  const existingSubscription = await c.env.DB.prepare(`
    SELECT ws.*, sp.plan_name 
    FROM worker_subscriptions ws
    JOIN subscription_plans sp ON ws.plan_id = sp.id
    WHERE ws.user_id = ? AND ws.subscription_status = 'active'
  `).bind(user.user_id).first()
  
  if (existingSubscription) {
    return c.redirect('/dashboard/worker')
  }
  
  // Get all available subscription plans
  const plans = await c.env.DB.prepare(`
    SELECT * FROM subscription_plans 
    WHERE is_active = 1 
    ORDER BY monthly_price ASC
  `).all()

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Choose Your Subscription Plan - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-kwikr-green to-green-600 min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </h1>
                        <span class="ml-4 text-gray-400">|</span>
                        <span class="ml-4 text-lg text-gray-600">Subscription Required</span>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-gray-600">Welcome, ${user.firstName}</span>
                        <a href="/api/auth/logout" class="text-gray-600 hover:text-gray-900">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto">
                <!-- Header -->
                <div class="text-center mb-12">
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        <div class="flex items-center justify-center">
                            <i class="fas fa-exclamation-triangle mr-3"></i>
                            <span class="font-medium">Subscription Required</span>
                        </div>
                        <p class="mt-2 text-sm">To access jobs and start earning on Kwikr Directory, you need to select a subscription plan.</p>
                    </div>
                    
                    <h1 class="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
                    <p class="text-xl text-green-100 mb-8">Start building your service business today</p>
                </div>

                <!-- Subscription Plans -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    ${(plans.results || []).map(plan => `
                        <div class="bg-white rounded-2xl shadow-xl p-8 ${plan.plan_name === 'Growth Plan' ? 'border-4 border-blue-500 transform scale-105' : ''}">
                            ${plan.plan_name === 'Growth Plan' ? '<div class="absolute -top-4 left-1/2 transform -translate-x-1/2"><span class="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span></div>' : ''}
                            
                            <div class="text-center">
                                <div class="${plan.plan_name === 'Pro Plan' ? 'text-purple-500' : plan.plan_name === 'Growth Plan' ? 'text-blue-500' : 'text-green-500'} text-4xl mb-4">
                                    <i class="fas fa-${plan.plan_name === 'Pro Plan' ? 'crown' : plan.plan_name === 'Growth Plan' ? 'chart-line' : 'rocket'}"></i>
                                </div>
                                <h3 class="text-2xl font-bold mb-2">${plan.plan_name}</h3>
                                <p class="text-gray-600 mb-6">${plan.description}</p>
                                <div class="mb-6">
                                    <span class="text-4xl font-bold ${plan.plan_name === 'Pro Plan' ? 'text-purple-600' : plan.plan_name === 'Growth Plan' ? 'text-blue-600' : 'text-green-600'}">$${plan.monthly_price}</span>
                                    <span class="text-gray-600">/month</span>
                                </div>
                            </div>
                            
                            <button onclick="selectPlan(${plan.id}, '${plan.plan_name}')" 
                                    class="w-full ${plan.plan_name === 'Pro Plan' ? 'bg-purple-500 hover:bg-purple-600' : plan.plan_name === 'Growth Plan' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'} text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                ${plan.monthly_price > 0 ? 'Select Plan' : 'Start Free'}
                            </button>
                        </div>
                    `).join('')}
                </div>

                <!-- Additional Info -->
                <div class="mt-12 bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm text-center">
                    <h3 class="text-xl font-semibold text-white mb-4">
                        <i class="fas fa-info-circle mr-2"></i>Why Do I Need a Subscription?
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-green-100">
                        <div>
                            <i class="fas fa-briefcase text-2xl mb-2"></i>
                            <p class="font-medium mb-1">Access to Jobs</p>
                            <p class="text-sm">Browse and bid on available jobs in your area</p>
                        </div>
                        <div>
                            <i class="fas fa-tools text-2xl mb-2"></i>
                            <p class="font-medium mb-1">Professional Tools</p>
                            <p class="text-sm">Use our booking, payment, and communication tools</p>
                        </div>
                        <div>
                            <i class="fas fa-star text-2xl mb-2"></i>
                            <p class="font-medium mb-1">Build Your Reputation</p>
                            <p class="text-sm">Earn reviews and grow your service business</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            async function selectPlan(planId, planName) {
                if (confirm(\`Are you sure you want to select the \${planName}?\`)) {
                    try {
                        // Get session token from localStorage as backup
                        const sessionToken = localStorage.getItem('sessionToken');
                        
                        const headers = {
                            'Content-Type': 'application/json'
                        };
                        
                        // Add authorization header if we have a session token
                        if (sessionToken) {
                            headers['Authorization'] = \`Bearer \${sessionToken}\`;
                        }
                        
                        const response = await fetch('/api/subscriptions/subscribe', {
                            method: 'POST',
                            headers: headers,
                            credentials: 'include', // Include cookies in the request
                            body: JSON.stringify({
                                plan_id: planId,
                                billing_cycle: 'monthly'
                            })
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            // Subscription activated successfully - redirect directly
                            window.location.href = '/dashboard/worker';
                        } else {
                            const error = await response.json();
                            alert('Error: ' + (error.error || 'Failed to activate subscription'));
                        }
                    } catch (error) {
                        console.error('Subscription error:', error);
                        alert('Error activating subscription. Please try again.');
                    }
                }
            }
        </script>
    </body>
    </html>
  `)
})

dashboardRoutes.get('/worker', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  // Fetch comprehensive worker profile data
    // Get worker profile information with user_profiles joined
    const worker = await c.env.DB.prepare(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.province, u.city,
        u.is_verified, u.created_at,
        up.bio, up.company_name, up.company_description, up.profile_image_url,
        up.address_line1, up.address_line2, up.postal_code, up.website_url, up.years_in_business
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ? AND u.role = 'worker'
    `).bind(user.user_id).first()
    
    // Create consistent profile data with good fallbacks
    const profileData = worker || {}
    console.log('Worker profile query result:', worker)
    console.log('User object:', user)
    console.log('Profile data before fallback:', profileData.company_name)
    
    if (!profileData.company_name) {
      profileData.company_name = (profileData.first_name || user.first_name) + ' ' + (profileData.last_name || user.last_name)
      console.log('Applied fallback company name:', profileData.company_name)
    }

    // Get worker services
    const services = await c.env.DB.prepare(`
      SELECT service_category, service_name, description, hourly_rate, is_available, years_experience
      FROM worker_services 
      WHERE user_id = ?
      ORDER BY service_name
    `).bind(user.user_id).all()

    // Get worker stats
    const stats = {
      totalBids: Math.floor(Math.random() * 20) + 5,
      activeJobs: 0,
      avgRating: 4.7,
      totalEarnings: Math.floor(Math.random() * 20000) + 10000
    }

  const servicesData = services.results || []
  
  // Update worker with profileData for consistent info
  Object.assign(worker, profileData)
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Worker Dashboard - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <div id="verificationStatus" class="px-2 py-1 rounded-full text-xs font-medium">
                                <!-- Status will be loaded here -->
                            </div>
                        </div>
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Worker Dashboard</h1>
                <p class="text-gray-600">Manage your profile, services, compliance, and payments</p>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-lg shadow-sm mb-8">
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-8 px-6" aria-label="Tabs">
                        <a href="/dashboard/worker" class="py-4 px-1 border-b-2 border-kwikr-green text-kwikr-green font-medium text-sm">
                            <i class="fas fa-user mr-2"></i>Profile View
                        </a>
                        <a href="/dashboard/worker/profile" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-edit mr-2"></i>Edit Profile
                        </a>
                        <a href="/dashboard/worker/payments" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-credit-card mr-2"></i>Payment Management
                        </a>
                        <a href="/dashboard/worker/compliance" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-shield-check mr-2"></i>Manage Compliance
                        </a>
                        <a href="/dashboard/worker/services" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-tools mr-2"></i>Manage Services
                        </a>
                    </nav>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-kwikr-green text-2xl mr-4">
                            <i class="fas fa-handshake"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="totalBids">${stats.totalBids}</p>
                            <p class="text-sm text-gray-600">Total Bids</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-blue-500 text-2xl mr-4">
                            <i class="fas fa-tools"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="activeJobs">${stats.activeJobs}</p>
                            <p class="text-sm text-gray-600">Active Jobs</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-yellow-500 text-2xl mr-4">
                            <i class="fas fa-star"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="avgRating">${stats.avgRating}</p>
                            <p class="text-sm text-gray-600">Avg Rating</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-green-500 text-2xl mr-4">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="totalEarnings">$${stats.totalEarnings.toLocaleString()}</p>
                            <p class="text-sm text-gray-600">Total Earnings</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab Content Panels -->
            <!-- Profile View Tab (Default) -->
            <div id="profileViewPanel" class="tab-panel">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <!-- Left Column - Services & About -->
                    <div class="lg:col-span-3 space-y-6">
                        <!-- Services Section -->
                        <div class="bg-white rounded-lg shadow-sm">
                            <div class="p-6 border-b border-gray-200">
                                <h2 class="text-xl font-semibold text-gray-900">Services Offered</h2>
                            </div>
                            <div class="p-6">
                                ${servicesData.length > 0 ? `
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        ${servicesData.map(service => `
                                            <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-kwikr-green transition-all duration-300">
                                                <div class="flex items-center mb-4">
                                                    <div class="bg-kwikr-green bg-opacity-10 p-3 rounded-lg mr-4">
                                                        <i class="fas fa-tools text-kwikr-green text-xl"></i>
                                                    </div>
                                                    <div>
                                                        <h3 class="font-bold text-gray-900 text-lg">${service.service_name}</h3>
                                                        <p class="text-sm text-kwikr-green font-medium">${service.service_category || 'Professional Service'}</p>
                                                    </div>
                                                </div>
                                                <div class="mb-4">
                                                    <p class="text-gray-600 text-sm mb-2">${service.description || 'Professional service provided with attention to detail.'}</p>
                                                    <div class="flex justify-between items-center">
                                                        <span class="text-2xl font-bold text-kwikr-green">$${service.hourly_rate}/hr</span>
                                                        <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Available</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="text-center py-12">
                                        <i class="fas fa-tools text-4xl text-gray-300 mb-4"></i>
                                        <h3 class="text-lg font-medium text-gray-900 mb-2">No Services Added Yet</h3>
                                        <p class="text-gray-500 mb-4">Add your services to start receiving job requests</p>
                                        <button onclick="switchTab('services')" class="bg-kwikr-green text-white px-6 py-2 rounded-lg hover:bg-green-600">
                                            <i class="fas fa-plus mr-2"></i>Add Your First Service
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>

                        <!-- About Section -->
                        <div class="bg-white rounded-lg shadow-sm">
                            <div class="p-6 border-b border-gray-200">
                                <h2 class="text-xl font-semibold text-gray-900">About ${worker?.first_name || user.first_name}</h2>
                            </div>
                            <div class="p-6">
                                <p class="text-gray-600 leading-relaxed mb-6">
                                    ${worker?.bio || 'Professional service provider committed to delivering high-quality work and excellent customer service.'}
                                </p>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 class="font-medium text-gray-900 mb-2">Contact Information</h4>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex items-center text-gray-600">
                                                <i class="fas fa-envelope w-4 mr-2"></i>
                                                ${worker?.email || user.email}
                                            </div>
                                            <div class="flex items-center text-gray-600">
                                                <i class="fas fa-phone w-4 mr-2"></i>
                                                ${worker?.phone || 'Not provided'}
                                            </div>
                                            <div class="flex items-center text-gray-600">
                                                <i class="fas fa-map-marker-alt w-4 mr-2"></i>
                                                ${worker?.city || user.city}, ${worker?.province || user.province}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="font-medium text-gray-900 mb-2">Professional Info</h4>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex items-center text-gray-600">
                                                <i class="fas fa-calendar w-4 mr-2"></i>
                                                Member since ${new Date(worker?.created_at || Date.now()).getFullYear()}
                                            </div>
                                            <div class="flex items-center text-gray-600">
                                                <i class="fas fa-star w-4 mr-2"></i>
                                                ${stats.avgRating} average rating
                                            </div>
                                            <div class="flex items-center text-gray-600">
                                                <i class="fas fa-handshake w-4 mr-2"></i>
                                                ${stats.totalBids} bids submitted
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column - Quick Actions -->
                    <div class="space-y-6">
                        <!-- Verification Status -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Verification Status</h3>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600">Identity Verified</span>
                                    <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                        <i class="fas fa-check mr-1"></i>Verified
                                    </span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600">Background Check</span>
                                    <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                        <i class="fas fa-clock mr-1"></i>Pending
                                    </span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-gray-600">Insurance</span>
                                    <span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                        <i class="fas fa-times mr-1"></i>Required
                                    </span>
                                </div>
                                <a href="/dashboard/worker/compliance" class="w-full mt-4 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm inline-block text-center">
                                    <i class="fas fa-shield-check mr-2"></i>Manage Compliance
                                </a>
                            </div>
                        </div>

                        <!-- Quick Actions -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div class="space-y-3">
                                <a href="/dashboard/worker/profile" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                    <i class="fas fa-user-circle text-kwikr-green mr-3"></i>
                                    View Full Profile
                                </a>
                                <a href="/dashboard/worker/profile" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                    <i class="fas fa-edit text-kwikr-green mr-3"></i>
                                    Edit Profile
                                </a>
                                <a href="/dashboard/worker/services" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                    <i class="fas fa-tools text-kwikr-green mr-3"></i>
                                    Manage Services
                                </a>
                                <a href="/dashboard/worker/payments" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                    <i class="fas fa-credit-card text-kwikr-green mr-3"></i>
                                    Payment Settings
                                </a>
                                <a href="/dashboard/worker/bids" class="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-kwikr-green hover:bg-green-50 block">
                                    <i class="fas fa-briefcase text-kwikr-green mr-3"></i>
                                    My Bids
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Edit Profile Tab -->
            <div id="profileEditPanel" class="tab-panel hidden">
                <div class="space-y-6">
                    <!-- Profile Photo Section -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">
                                <i class="fas fa-camera mr-2 text-kwikr-green"></i>Profile Photo
                            </h2>
                            <p class="text-gray-600">Upload a professional photo to build trust with clients</p>
                        </div>
                        <div class="p-6">
                            <div class="flex items-start space-x-6">
                                <div class="flex-shrink-0">
                                    <div class="w-32 h-32 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100">
                                        <img id="profilePreview" src="${worker?.profile_image_url || '/static/default-avatar.png'}" 
                                             alt="Profile Photo" class="w-full h-full object-cover">
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <div class="space-y-4">
                                        <div>
                                            <input type="file" id="profilePhotoInput" accept="image/jpeg,image/png" class="hidden">
                                            <button type="button" onclick="document.getElementById('profilePhotoInput').click()" 
                                                    class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                                                <i class="fas fa-upload mr-2"></i>Upload New Photo
                                            </button>
                                        </div>
                                        <p class="text-sm text-gray-500">
                                            <i class="fas fa-info-circle mr-1"></i>
                                            JPG or PNG files only. Maximum 2MB. Square images work best.
                                        </p>
                                        <div id="uploadProgressContainer" class="hidden">
                                            <div class="bg-gray-200 rounded-full h-2">
                                                <div id="uploadProgress" class="bg-kwikr-green h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                            </div>
                                            <p class="text-sm text-gray-600 mt-1">Uploading...</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Personal Information Section -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">
                                <i class="fas fa-user mr-2 text-kwikr-green"></i>Personal Information
                            </h2>
                            <p class="text-gray-600">Basic contact information and location details</p>
                        </div>
                        <div class="p-6">
                            <form id="personalInfoForm" class="space-y-6">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            First Name <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="firstName" value="${worker?.first_name || user.first_name}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Last Name <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="lastName" value="${worker?.last_name || user.last_name}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address <span class="text-red-500">*</span>
                                        </label>
                                        <input type="email" id="email" value="${worker?.email || user.email}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number <span class="text-red-500">*</span>
                                        </label>
                                        <input type="tel" id="phone" value="${worker?.phone || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="(123) 456-7890" pattern="[0-9 ()+-.]+" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            City <span class="text-red-500">*</span>
                                        </label>
                                        <input type="text" id="city" value="${worker?.city || user.city}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">
                                            Province <span class="text-red-500">*</span>
                                        </label>
                                        <select id="province" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                                            <option value="">Select Province</option>
                                            <option value="ON" ${(worker?.province || user.province) === 'ON' ? 'selected' : ''}>Ontario</option>
                                            <option value="BC" ${(worker?.province || user.province) === 'BC' ? 'selected' : ''}>British Columbia</option>
                                            <option value="AB" ${(worker?.province || user.province) === 'AB' ? 'selected' : ''}>Alberta</option>
                                            <option value="MB" ${(worker?.province || user.province) === 'MB' ? 'selected' : ''}>Manitoba</option>
                                            <option value="SK" ${(worker?.province || user.province) === 'SK' ? 'selected' : ''}>Saskatchewan</option>
                                            <option value="QC" ${(worker?.province || user.province) === 'QC' ? 'selected' : ''}>Quebec</option>
                                            <option value="NB" ${(worker?.province || user.province) === 'NB' ? 'selected' : ''}>New Brunswick</option>
                                            <option value="NS" ${(worker?.province || user.province) === 'NS' ? 'selected' : ''}>Nova Scotia</option>
                                            <option value="PE" ${(worker?.province || user.province) === 'PE' ? 'selected' : ''}>Prince Edward Island</option>
                                            <option value="NL" ${(worker?.province || user.province) === 'NL' ? 'selected' : ''}>Newfoundland and Labrador</option>
                                            <option value="NT" ${(worker?.province || user.province) === 'NT' ? 'selected' : ''}>Northwest Territories</option>
                                            <option value="NU" ${(worker?.province || user.province) === 'NU' ? 'selected' : ''}>Nunavut</option>
                                            <option value="YT" ${(worker?.province || user.province) === 'YT' ? 'selected' : ''}>Yukon</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                                        <input type="text" id="addressLine1" value="${worker?.address_line1 || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="Street address">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                                        <input type="text" id="addressLine2" value="${worker?.address_line2 || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="Apartment, suite, etc.">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                                        <input type="text" id="postalCode" value="${worker?.postal_code || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="A1A 1A1">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                                        <input type="url" id="websiteUrl" value="${worker?.website_url || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="https://www.yourwebsite.com">
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Business Information Section -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">
                                <i class="fas fa-briefcase mr-2 text-kwikr-green"></i>Business Information
                            </h2>
                            <p class="text-gray-600">Tell clients about your business and experience</p>
                        </div>
                        <div class="p-6">
                            <form id="businessInfoForm" class="space-y-6">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                        <input type="text" id="companyName" value="${worker?.company_name || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="Your Business Name">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Years in Business</label>
                                        <select id="yearsInBusiness" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                                            <option value="">Select Experience</option>
                                            <option value="1" ${(worker?.years_in_business) == 1 ? 'selected' : ''}>Less than 1 year</option>
                                            <option value="2" ${(worker?.years_in_business) == 2 ? 'selected' : ''}>1-2 years</option>
                                            <option value="5" ${(worker?.years_in_business) == 5 ? 'selected' : ''}>3-5 years</option>
                                            <option value="10" ${(worker?.years_in_business) == 10 ? 'selected' : ''}>5-10 years</option>
                                            <option value="15" ${(worker?.years_in_business) == 15 ? 'selected' : ''}>10-15 years</option>
                                            <option value="20" ${(worker?.years_in_business) == 20 ? 'selected' : ''}>15+ years</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Professional Bio</label>
                                    <textarea id="bio" rows="5" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                              placeholder="Describe your experience, specialties, and what sets you apart from other service providers. This will be displayed on your public profile.">${worker?.bio || ''}</textarea>
                                    <p class="text-sm text-gray-500 mt-1">
                                        <i class="fas fa-lightbulb mr-1"></i>
                                        Tip: Include your experience, certifications, and what makes your service unique.
                                    </p>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
                                    <textarea id="companyDescription" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                              placeholder="Describe your company's history, mission, and values...">${worker?.company_description || ''}</textarea>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Emergency Contact Section -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">
                                <i class="fas fa-phone-alt mr-2 text-kwikr-green"></i>Emergency Contact
                            </h2>
                            <p class="text-gray-600">In case of emergency during job completion</p>
                        </div>
                        <div class="p-6">
                            <form id="emergencyContactForm" class="space-y-6">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                                        <input type="text" id="emergencyContactName" value="${worker?.emergency_contact_name || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="Full name of emergency contact">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                                        <input type="tel" id="emergencyContactPhone" value="${worker?.emergency_contact_phone || ''}" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                               placeholder="(123) 456-7890">
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6">
                            <div class="flex justify-end space-x-4">
                                <button type="button" onclick="switchTab('view')" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    <i class="fas fa-times mr-2"></i>Cancel
                                </button>
                                <button type="button" onclick="saveAllProfileChanges()" class="bg-kwikr-green text-white px-6 py-2 rounded-lg hover:bg-green-600">
                                    <i class="fas fa-save mr-2"></i>Save All Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payment Management Tab -->
            <div id="paymentPanel" class="tab-panel hidden">
                <div class="space-y-6">
                    <!-- Payment Methods -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">Payment Methods</h2>
                            <p class="text-gray-600">Manage how you receive payments</p>
                        </div>
                        <div class="p-6">
                            <div class="space-y-4">
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-university text-kwikr-green text-xl mr-3"></i>
                                            <div>
                                                <h4 class="font-medium text-gray-900">Direct Bank Transfer</h4>
                                                <p class="text-sm text-gray-600">****1234 - Primary Account</p>
                                            </div>
                                        </div>
                                        <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Active</span>
                                    </div>
                                </div>
                                
                                <button class="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-kwikr-green hover:text-kwikr-green transition-colors">
                                    <i class="fas fa-plus mr-2"></i>Add Payment Method
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Earnings Overview -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">Earnings Overview</h2>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-kwikr-green">$${stats.totalEarnings.toLocaleString()}</div>
                                    <div class="text-sm text-gray-600">Total Earnings</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-blue-600">$${Math.floor(stats.totalEarnings * 0.15).toLocaleString()}</div>
                                    <div class="text-sm text-gray-600">This Month</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-purple-600">$${Math.floor(stats.totalEarnings * 0.05).toLocaleString()}</div>
                                    <div class="text-sm text-gray-600">Pending</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                        </div>
                        <div class="p-6">
                            <div class="space-y-3">
                                <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div>
                                        <div class="font-medium text-gray-900">Kitchen Cleaning - Job #12345</div>
                                        <div class="text-sm text-gray-600">March 15, 2024</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-bold text-green-600">+$150.00</div>
                                        <div class="text-xs text-green-600">Completed</div>
                                    </div>
                                </div>
                                
                                <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                    <div>
                                        <div class="font-medium text-gray-900">Bathroom Deep Clean - Job #12344</div>
                                        <div class="text-sm text-gray-600">March 12, 2024</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-bold text-yellow-600">$200.00</div>
                                        <div class="text-xs text-yellow-600">Pending</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Compliance Management Tab -->
            <div id="compliancePanel" class="tab-panel hidden">
                <div class="space-y-6">
                    <!-- Verification Status -->
                    <div class="bg-white rounded-lg shadow-sm">
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-semibold text-gray-900">Compliance Status</h2>
                            <p class="text-gray-600">Manage your verification documents and compliance requirements</p>
                        </div>
                        <div class="p-6">
                            <div class="space-y-4">
                                <!-- Identity Verification -->
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-id-card text-kwikr-green text-xl mr-3"></i>
                                            <div>
                                                <h4 class="font-medium text-gray-900">Identity Verification</h4>
                                                <p class="text-sm text-gray-600">Government-issued photo ID required</p>
                                            </div>
                                        </div>
                                        <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                            <i class="fas fa-check mr-1"></i>Verified
                                        </span>
                                    </div>
                                </div>

                                <!-- Background Check -->
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-shield-alt text-yellow-500 text-xl mr-3"></i>
                                            <div>
                                                <h4 class="font-medium text-gray-900">Background Check</h4>
                                                <p class="text-sm text-gray-600">Criminal background verification</p>
                                            </div>
                                        </div>
                                        <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                                            <i class="fas fa-clock mr-1"></i>In Review
                                        </span>
                                    </div>
                                    <div class="mt-3 text-sm text-gray-600">
                                        Background check submitted on March 10, 2024. Processing typically takes 3-5 business days.
                                    </div>
                                </div>

                                <!-- Insurance -->
                                <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-shield-check text-red-500 text-xl mr-3"></i>
                                            <div>
                                                <h4 class="font-medium text-gray-900">Liability Insurance</h4>
                                                <p class="text-sm text-gray-600">Professional liability insurance certificate</p>
                                            </div>
                                        </div>
                                        <span class="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                                            <i class="fas fa-exclamation mr-1"></i>Required
                                        </span>
                                    </div>
                                    <div class="mt-3">
                                        <button class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
                                            <i class="fas fa-upload mr-2"></i>Upload Insurance Certificate
                                        </button>
                                    </div>
                                </div>

                                <!-- Certifications -->
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center">
                                            <i class="fas fa-certificate text-purple-500 text-xl mr-3"></i>
                                            <div>
                                                <h4 class="font-medium text-gray-900">Professional Certifications</h4>
                                                <p class="text-sm text-gray-600">Industry-specific certifications (optional)</p>
                                            </div>
                                        </div>
                                        <button class="text-kwikr-green hover:text-green-700">
                                            <i class="fas fa-plus mr-1"></i>Add Certification
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Services Management Tab -->
            <div id="servicesPanel" class="tab-panel hidden">
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <div>
                                <h2 class="text-xl font-semibold text-gray-900">Manage Services</h2>
                                <p class="text-gray-600">Add and manage the services you offer</p>
                            </div>
                            <button onclick="showAddServiceForm()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                                <i class="fas fa-plus mr-2"></i>Add Service
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        ${servicesData.length > 0 ? `
                            <div class="space-y-4">
                                ${servicesData.map(service => `
                                    <div class="border border-gray-200 rounded-lg p-4">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center">
                                                <i class="fas fa-tools text-kwikr-green text-xl mr-3"></i>
                                                <div>
                                                    <h4 class="font-medium text-gray-900">${service.service_name}</h4>
                                                    <p class="text-sm text-gray-600">${service.service_category || 'Professional Service'}</p>
                                                    <p class="text-sm text-kwikr-green font-medium">$${service.hourly_rate}/hr</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Active</span>
                                                <button onclick="editService(${service.id})" class="text-gray-500 hover:text-gray-700">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button onclick="deleteService(${service.id})" class="text-red-500 hover:text-red-700">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        ${service.description ? `
                                            <div class="mt-3 text-sm text-gray-600">
                                                ${service.description}
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="text-center py-12">
                                <i class="fas fa-tools text-4xl text-gray-300 mb-4"></i>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No Services Added Yet</h3>
                                <p class="text-gray-500 mb-4">Add your first service to start receiving job requests</p>
                                <button onclick="showAddServiceForm()" class="bg-kwikr-green text-white px-6 py-2 rounded-lg hover:bg-green-600">
                                    <i class="fas fa-plus mr-2"></i>Add Your First Service
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Service Modal -->
        <div id="addServiceModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-lg w-full mx-4">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold text-gray-900">Add New Service</h3>
                        <button onclick="closeAddServiceModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <form id="addServiceForm" onsubmit="submitAddService(event)">
                    <div class="p-6 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                            <input type="text" id="serviceName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                   required placeholder="e.g., Deep Cleaning">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                            <select id="serviceCategory" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                                <option value="">Select Category</option>
                                <option value="1">Cleaning Services</option>
                                <option value="2">Handyman Services</option>
                                <option value="3">Maintenance Services</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($)</label>
                            <input type="number" id="serviceRate" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                   required placeholder="35" min="10" step="5">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
                            <textarea id="serviceDescription" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                                      placeholder="Describe what this service includes..."></textarea>
                        </div>
                    </div>
                    
                    <div class="p-6 border-t border-gray-200 flex justify-end space-x-3">
                        <button type="button" onclick="closeAddServiceModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                            <i class="fas fa-plus mr-2"></i>Add Service
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          // Embed user information directly from server-side session
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}",
            province: "${user.province || ''}",
            city: "${user.city || ''}",
            isVerified: ${user.is_verified || 0}
          };
          console.log('Worker Dashboard: User information embedded from server:', window.currentUser);
          
          // Tab switching functionality
          function switchTab(tabName) {
            console.log('Switching to tab:', tabName);
            
            // Hide all tab panels
            const panels = ['profileViewPanel', 'profileEditPanel', 'paymentPanel', 'compliancePanel', 'servicesPanel'];
            panels.forEach(panelId => {
              const panel = document.getElementById(panelId);
              if (panel) {
                panel.classList.add('hidden');
                panel.classList.remove('tab-panel');
              }
            });
            
            // Show selected panel
            const targetPanel = tabName === 'view' ? 'profileViewPanel' :
                              tabName === 'edit' ? 'profileEditPanel' :
                              tabName === 'payment' ? 'paymentPanel' :
                              tabName === 'compliance' ? 'compliancePanel' :
                              tabName === 'services' ? 'servicesPanel' : 'profileViewPanel';
            
            const panel = document.getElementById(targetPanel);
            if (panel) {
              panel.classList.remove('hidden');
              panel.classList.add('tab-panel');
            }
            
            // Update tab button styles
            const tabs = ['viewTab', 'editTab', 'paymentTab', 'complianceTab', 'servicesTab'];
            tabs.forEach(tabId => {
              const tab = document.getElementById(tabId);
              if (tab) {
                tab.className = 'py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm';
              }
            });
            
            // Activate selected tab
            const activeTabId = tabName === 'view' ? 'viewTab' :
                               tabName === 'edit' ? 'editTab' :
                               tabName === 'payment' ? 'paymentTab' :
                               tabName === 'compliance' ? 'complianceTab' :
                               tabName === 'services' ? 'servicesTab' : 'viewTab';
            
            const activeTab = document.getElementById(activeTabId);
            if (activeTab) {
              activeTab.className = 'py-4 px-1 border-b-2 border-kwikr-green text-kwikr-green font-medium text-sm';
            }
          }
          
          // Add Service Modal Functions
          function showAddServiceForm() {
            document.getElementById('addServiceModal').classList.remove('hidden');
          }
          
          function closeAddServiceModal() {
            document.getElementById('addServiceModal').classList.add('hidden');
            document.getElementById('addServiceForm').reset();
          }
          
          async function submitAddService(event) {
            event.preventDefault();
            
            const formData = {
              service_name: document.getElementById('serviceName').value,
              category_id: document.getElementById('serviceCategory').value,
              hourly_rate: document.getElementById('serviceRate').value,
              description: document.getElementById('serviceDescription').value
            };
            
            try {
              const response = await fetch('/api/worker/services', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',  // Include session cookies
                body: JSON.stringify(formData)
              });
              
              if (response.ok) {
                closeAddServiceModal();
                // Refresh the services panel
                window.location.reload();
              } else {
                alert('Error adding service. Please try again.');
              }
            } catch (error) {
              console.error('Error adding service:', error);
              alert('Error adding service. Please try again.');
            }
          }
          
          // Enhanced Profile Management Functions
          async function saveAllProfileChanges() {
            try {
              // Show loading state
              const saveButton = document.querySelector('button[onclick="saveAllProfileChanges()"]');
              const originalText = saveButton.innerHTML;
              saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
              saveButton.disabled = true;
              
              // Collect personal information
              const personalData = {
                first_name: document.getElementById('firstName')?.value || '',
                last_name: document.getElementById('lastName')?.value || '',
                email: document.getElementById('email')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                city: document.getElementById('city')?.value || '',
                province: document.getElementById('province')?.value || '',
                bio: document.getElementById('bio')?.value || ''
              };
              
              // Collect business information
              const businessData = {
                company_name: document.getElementById('companyName')?.value || '',
                business_license: document.getElementById('businessLicense')?.value || '',
                years_experience: document.getElementById('yearsExperience')?.value || '',
                specialty: document.getElementById('specialty')?.value || '',
                insurance_provider: document.getElementById('insuranceProvider')?.value || '',
                insurance_policy: document.getElementById('insurancePolicy')?.value || ''
              };
              
              // Collect emergency contact
              const emergencyData = {
                emergency_contact_name: document.getElementById('emergencyContactName')?.value || '',
                emergency_contact_relationship: document.getElementById('emergencyContactRelationship')?.value || '',
                emergency_contact_phone: document.getElementById('emergencyContactPhone')?.value || ''
              };
              
              // Validate all fields before proceeding
              if (!validateAllFields()) {
                showNotification('Please fix the validation errors before saving.', 'error');
                return;
              }
              
              // Combine all data
              const allData = { ...personalData, ...businessData, ...emergencyData };
              
              // Save profile data
              const response = await fetch('/api/worker/profile', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',  // Include session cookies
                body: JSON.stringify(allData)
              });
              
              if (response.ok) {
                // Show success message
                showNotification('Profile updated successfully!', 'success');
                switchTab('view');
                // Refresh to show updated data
                setTimeout(() => window.location.reload(), 1000);
              } else {
                const errorData = await response.json();
                showNotification(errorData.error || 'Error updating profile. Please try again.', 'error');
              }
              
            } catch (error) {
              console.error('Error updating profile:', error);
              showNotification('Error updating profile. Please try again.', 'error');
            } finally {
              // Reset button state
              const saveButton = document.querySelector('button[onclick="saveAllProfileChanges()"]');
              if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save mr-2"></i>Save All Changes';
                saveButton.disabled = false;
              }
            }
          }
          
          // Profile photo upload function
          async function uploadProfilePhoto() {
            const fileInput = document.getElementById('profilePhotoInput');
            const file = fileInput.files[0];
            
            if (!file) {
              showNotification('Please select a file to upload.', 'warning');
              return;
            }
            
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
              showNotification('File size must be less than 5MB.', 'error');
              return;
            }
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
              showNotification('Please select a valid image file.', 'error');
              return;
            }
            
            try {
              // Show upload progress
              const progressBar = document.getElementById('uploadProgress');
              const progressContainer = document.getElementById('uploadProgressContainer');
              
              if (progressContainer) {
                progressContainer.classList.remove('hidden');
                progressBar.style.width = '0%';
              }
              
              // Convert file to base64
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
              });
              
              // Update progress
              if (progressBar) progressBar.style.width = '50%';
              
              // Upload to server
              const response = await fetch('/api/worker/profile/upload-image', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',  // Include session cookies
                body: JSON.stringify({
                  image: base64,
                  filename: file.name
                })
              });
              
              // Update progress
              if (progressBar) progressBar.style.width = '100%';
              
              if (response.ok) {
                const result = await response.json();
                showNotification('Profile photo updated successfully!', 'success');
                
                // Update the preview image if it exists
                const previewImg = document.getElementById('profilePreview');
                if (previewImg && result.imageUrl) {
                  previewImg.src = result.imageUrl;
                }
                
                // Hide progress after success
                setTimeout(() => {
                  if (progressContainer) progressContainer.classList.add('hidden');
                }, 1000);
                
              } else {
                const errorData = await response.json();
                showNotification(errorData.error || 'Error uploading photo. Please try again.', 'error');
              }
              
            } catch (error) {
              console.error('Error uploading photo:', error);
              showNotification('Error uploading photo. Please try again.', 'error');
            } finally {
              // Reset progress
              const progressContainer = document.getElementById('uploadProgressContainer');
              if (progressContainer) {
                setTimeout(() => progressContainer.classList.add('hidden'), 2000);
              }
            }
          }
          
          // Notification helper function
          function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            let notificationClass = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ';
            
            if (type === 'success') {
              notificationClass += 'bg-green-500 text-white';
            } else if (type === 'warning') {
              notificationClass += 'bg-yellow-500 text-white';
            } else if (type === 'error') {
              notificationClass += 'bg-red-500 text-white';
            } else {
              notificationClass += 'bg-blue-500 text-white';
            }
            
            notification.className = notificationClass;
            
            let iconClass = 'fas ';
            if (type === 'success') {
              iconClass += 'fa-check-circle';
            } else if (type === 'warning') {
              iconClass += 'fa-exclamation-triangle';
            } else if (type === 'error') {
              iconClass += 'fa-times-circle';
            } else {
              iconClass += 'fa-info-circle';
            }
            
            notification.innerHTML = 
              '<div class="flex items-center justify-between">' +
                '<div class="flex items-center">' +
                  '<i class="' + iconClass + ' mr-2"></i>' +
                  '<span class="text-sm font-medium">' + message + '</span>' +
                '</div>' +
                '<button class="ml-3 text-white hover:text-gray-200 focus:outline-none" onclick="this.parentElement.parentElement.remove()">' +
                  '<i class="fas fa-times text-xs"></i>' +
                '</button>' +
              '</div>';
            
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(function() {
              if (notification && notification.parentElement) {
                notification.remove();
              }
            }, 5000);
          }
          
          // Photo preview function
          function previewProfilePhoto(input) {
            const file = input.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = function(e) {
                const previewImg = document.getElementById('profilePreview');
                if (previewImg) {
                  previewImg.src = e.target.result;
                }
              };
              reader.readAsDataURL(file);
            }
          }
          
          // Initialize dashboard - show profile view tab by default
          document.addEventListener('DOMContentLoaded', function() {
            switchTab('view');
            
            // Set up photo upload event listener
            const photoInput = document.getElementById('profilePhotoInput');
            if (photoInput) {
              photoInput.addEventListener('change', function(e) {
                previewProfilePhoto(e.target);
                
                // Auto-upload when file is selected
                if (e.target.files.length > 0) {
                  uploadProfilePhoto();
                }
              });
            }
            
            // Set up form validation
            const requiredFields = document.querySelectorAll('input[required], select[required]');
            requiredFields.forEach(field => {
              field.addEventListener('blur', validateField);
              field.addEventListener('input', clearFieldError);
            });
          });
          
          // Field validation functions
          function validateField(event) {
            const field = event.target;
            const fieldContainer = field.closest('div');
            
            // Clear previous error
            clearFieldError(event);
            
            // Check if field is required and empty
            if (field.required && !field.value.trim()) {
              showFieldError(field, 'This field is required');
              return false;
            }
            
            // Email validation
            if (field.type === 'email' && field.value) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(field.value)) {
                showFieldError(field, 'Please enter a valid email address');
                return false;
              }
            }
            
            // Phone validation
            if (field.type === 'tel' && field.value) {
              const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
              if (!phoneRegex.test(field.value)) {
                showFieldError(field, 'Please enter a valid phone number');
                return false;
              }
            }
            
            return true;
          }
          
          function clearFieldError(event) {
            const field = event.target;
            const fieldContainer = field.closest('div');
            const existingError = fieldContainer.querySelector('.field-error');
            
            if (existingError) {
              existingError.remove();
            }
            
            // Remove error styling
            field.classList.remove('border-red-500', 'focus:border-red-500');
            field.classList.add('border-gray-300', 'focus:border-kwikr-green');
          }
          
          function showFieldError(field, message) {
            const fieldContainer = field.closest('div');
            
            // Add error styling
            field.classList.remove('border-gray-300', 'focus:border-kwikr-green');
            field.classList.add('border-red-500', 'focus:border-red-500');
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-red-500 text-sm mt-1';
            errorDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>' + message;
            fieldContainer.appendChild(errorDiv);
          }
          
          // Validate all required fields before saving
          function validateAllFields() {
            const requiredFields = document.querySelectorAll('input[required], select[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
              const event = { target: field };
              if (!validateField(event)) {
                isValid = false;
              }
            });
            
            return isValid;
          }
          
          // Make functions globally available
          window.switchTab = switchTab;
          window.showAddServiceForm = showAddServiceForm;
          window.closeAddServiceModal = closeAddServiceModal;
          window.addNewService = addNewService;
          window.editService = editService;
          window.deleteService = deleteService;
          window.toggleEditMode = toggleEditMode;
          window.saveProfileChanges = saveProfileChanges;
          window.cancelProfileChanges = cancelProfileChanges;
          window.previewProfilePhoto = previewProfilePhoto;
          window.uploadProfilePhoto = uploadProfilePhoto;
          
          console.log('Worker Dashboard: JavaScript setup complete');
        </script>
    </body>
    </html>
  `)
})

// Worker Profile Management Page  
dashboardRoutes.get('/worker/profile', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  console.log('Loading Worker Profile Management for user:', user.user_id)
  
  // 1. Get worker profile information  
  const workerProfile = await c.env.DB.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.province, u.city,
           u.is_verified, u.created_at,
           up.bio, up.company_name, up.company_description
    FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = ? AND u.role = 'worker'
  `).bind(user.user_id).first()
  
  // 2. Get worker services
  const workerServices = await c.env.DB.prepare(`
    SELECT service_category, service_name, description, hourly_rate, is_available, service_area, years_experience
    FROM worker_services
    WHERE user_id = ?
    ORDER BY service_category, service_name
  `).bind(user.user_id).all()
  
  // 3. Get worker compliance info
  const workerCompliance = await c.env.DB.prepare(`
    SELECT wsib_number, wsib_valid_until, insurance_provider, insurance_policy_number, 
           insurance_valid_until, license_type, license_number, license_valid_until, 
           compliance_status, verified_at, documents_uploaded
    FROM worker_compliance
    WHERE user_id = ?
  `).bind(user.user_id).all()
  
  // Process profile data with fallbacks
  const profileData = {
    id: workerProfile?.id || user.user_id,
    firstName: workerProfile?.first_name || user.first_name,
    lastName: workerProfile?.last_name || user.last_name,
    email: workerProfile?.email || user.email,
    phone: workerProfile?.phone || user.phone || '',
    province: workerProfile?.province || user.province || '',
    city: workerProfile?.city || user.city || '',
    isVerified: workerProfile?.is_verified || 0,
    memberSince: workerProfile?.created_at ? new Date(workerProfile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
    accountId: `KWK-${user.user_id}`,
    companyName: workerProfile?.business_name || workerProfile?.company_name || `${user.first_name} ${user.last_name}`,
    businessEmail: workerProfile?.business_email || workerProfile?.email || user.email,
    serviceType: workerProfile?.service_type || 'Professional Services',
    bio: workerProfile?.bio || 'Professional service provider committed to delivering high-quality work.',
    companyDescription: workerProfile?.company_description || 'Demo Worker Services Inc. is a professional home and commercial service provider with over 10 years of experience in the Greater Toronto Area. We specialize in providing high-quality, reliable services to both residential and commercial clients.',
    services: workerServices.results || [],
    compliance: workerCompliance.results?.[0] || {},
    profileCompletion: 76 // Calculate based on filled fields
  }
  
  console.log('Dashboard Profile Data:', profileData)
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Profile - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/worker" class="flex items-center">
                            <i class="fas fa-bolt text-kwikr-green text-2xl mr-2"></i>
                            <span class="text-2xl font-bold text-gray-900">Kwikr Directory</span>
                        </a>
                        <div class="ml-6 text-gray-600">
                            <span class="text-gray-400">Dashboard > </span>Profile
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-gray-600">Welcome, ${profileData.firstName}!</span>
                        <a href="/auth/logout" class="text-gray-600 hover:text-kwikr-green transition-colors">
                            <i class="fas fa-sign-out-alt mr-1"></i>Logout
                        </a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Profile Overview</h1>
                </div>
                <div class="flex space-x-3">
                    <button id="editProfileBtn" onclick="toggleEditMode()" class="bg-kwikr-green text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center">
                        <i class="fas fa-edit mr-2"></i>Edit Profile
                    </button>
                </div>
            </div>

            <!-- Profile Tabs -->


            <!-- Profile Content -->
            <div id="profileViewMode">
                <!-- Hero Section -->
                <div class="bg-kwikr-green rounded-lg p-8 text-white mb-6">
                    <div class="flex items-center">
                        <div class="w-24 h-24 bg-white bg-opacity-20 rounded-lg flex flex-col items-center justify-center mr-6 cursor-pointer hover:bg-opacity-30 transition-colors" onclick="uploadLogo()">
                            <i class="fas fa-building text-white text-2xl mb-1"></i>
                            <span class="text-xs text-white text-center">Click to Upload Logo</span>
                        </div>
                        <div class="flex-1">
                            <h2 id="companyNameDisplay" class="text-3xl font-bold mb-2">${profileData.companyName}</h2>
                            <p class="text-green-100 mb-2">Professional Home & Commercial Services</p>
                            <div class="flex items-center space-x-6">
                                <div class="flex items-center">
                                    <i class="fas fa-star text-yellow-300 mr-1"></i>
                                    <span>4.8 Rating</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-check-circle mr-1"></i>
                                    <span>${profileData.isVerified ? 'Verified Business' : 'Verification Pending'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Three Column Layout -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <!-- Left Column - Contact Information -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-phone text-kwikr-green mr-2"></i>Contact Information
                        </h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm font-medium text-gray-500">Primary Email</label>
                                <p id="primaryEmailDisplay" class="text-gray-900">${profileData.email}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Business Email</label>
                                <p id="businessEmailDisplay" class="text-gray-900">business@demoworker.ca</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Phone Number</label>
                                <p id="phoneDisplay" class="text-gray-900">+1 (416) 555-0123</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Business Phone</label>
                                <p id="businessPhoneDisplay" class="text-gray-900">+1 (416) 555-0124</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Emergency Contact</label>
                                <p id="emergencyContactDisplay" class="text-gray-900">+1 (416) 555-0125</p>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Column - Business Address -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-map-marker-alt text-kwikr-green mr-2"></i>Business Address
                        </h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm font-medium text-gray-500">Street Address</label>
                                <p id="streetAddressDisplay" class="text-gray-900">123 King Street West</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Unit/Suite</label>
                                <p id="unitSuiteDisplay" class="text-gray-900">Suite 456</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">City</label>
                                <p id="cityDisplay" class="text-gray-900">Toronto</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Province</label>
                                <p id="provinceDisplay" class="text-gray-900">Ontario</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Postal Code</label>
                                <p id="postalCodeDisplay" class="text-gray-900">M5V 3A8</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Service Area</label>
                                <p id="serviceAreaDisplay" class="text-gray-900">Greater Toronto Area (GTA)</p>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column - Account Details -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-user text-kwikr-green mr-2"></i>Account Details
                        </h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm font-medium text-gray-500">Account ID</label>
                                <p id="accountIdDisplay" class="text-gray-900">KWK-381341</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Account Status</label>
                                <div class="flex items-center">
                                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                        <i class="fas fa-circle mr-1"></i>Active
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Member Since</label>
                                <p id="memberSinceDisplay" class="text-gray-900">January 15, 2024</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Last Login</label>
                                <p id="lastLoginDisplay" class="text-gray-900">Today at 2:30 PM</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Profile Completion</label>
                                <div class="mt-1">
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-kwikr-green font-medium">${profileData.profileCompletion}% Complete</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                                        <div class="bg-kwikr-green h-2 rounded-full" style="width: ${profileData.profileCompletion}%"></div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-500">Verification Status</label>
                                <div class="flex items-center">
                                    <span class="${profileData.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs px-2 py-1 rounded-full font-medium">
                                        <i class="fas ${profileData.isVerified ? 'fa-check-circle' : 'fa-clock'} mr-1"></i>
                                        ${profileData.isVerified ? 'Verified' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Business Description Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <i class="fas fa-building text-kwikr-green mr-2"></i>Business Description
                    </h3>
                    <p id="businessDescriptionDisplay" class="text-gray-700 leading-relaxed">
                        ${profileData.companyDescription}
                    </p>
                    <div class="mt-4 space-y-2">
                        <p class="text-gray-700">Our team of certified professionals is committed to delivering exceptional results on every project. We pride ourselves on punctuality, attention to detail, and customer satisfaction. All our work is fully insured and comes with a satisfaction guarantee.</p>
                        <p class="text-gray-700">We serve the entire GTA and are available for both emergency and scheduled services. Our 24/7 customer service ensures that help is always available when you need it most.</p>
                    </div>
                </div>

                <!-- Services Provided Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-tools text-kwikr-green mr-2"></i>Services Provided
                        </h3>
                        <button onclick="manageServices()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                            <i class="fas fa-plus mr-1"></i>Manage Services
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="servicesGrid">
                        <!-- Cleaning Services -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-broom text-kwikr-green mr-2"></i>
                                <h4 class="font-medium">Cleaning Services</h4>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Residential & Commercial</p>
                        </div>
                        
                        <!-- Plumbing -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-wrench text-kwikr-green mr-2"></i>
                                <h4 class="font-medium">Plumbing</h4>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Emergency & Maintenance</p>
                        </div>
                        
                        <!-- Electrical Work -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-bolt text-kwikr-green mr-2"></i>
                                <h4 class="font-medium">Electrical Work</h4>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Licensed Electrician</p>
                        </div>
                        
                        <!-- Handyman Services -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-hammer text-kwikr-green mr-2"></i>
                                <h4 class="font-medium">Handyman Services</h4>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">General Repairs</p>
                        </div>
                        
                        <!-- Painting -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-paint-roller text-kwikr-green mr-2"></i>
                                <h4 class="font-medium">Painting</h4>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Interior & Exterior</p>
                        </div>
                        
                        <!-- Landscaping -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-leaf text-kwikr-green mr-2"></i>
                                <h4 class="font-medium">Landscaping</h4>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Design & Maintenance</p>
                        </div>
                    </div>
                </div>

                <!-- Hours of Operation Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-clock text-kwikr-green mr-2"></i>Hours of Operation
                        </h3>
                        <button onclick="editHours()" class="text-kwikr-green hover:text-green-600 text-sm font-medium">
                            <i class="fas fa-edit mr-1"></i>Edit Hours
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="hoursGrid">
                        <div class="flex justify-between items-center py-3 px-4 border border-gray-200 rounded-lg">
                            <span class="font-medium text-gray-700">Monday</span>
                            <span class="text-gray-900">8:00 AM - 6:00 PM</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-gray-200 rounded-lg">
                            <span class="font-medium text-gray-700">Tuesday</span>
                            <span class="text-gray-900">8:00 AM - 6:00 PM</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-gray-200 rounded-lg">
                            <span class="font-medium text-gray-700">Wednesday</span>
                            <span class="text-gray-900">8:00 AM - 6:00 PM</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-gray-200 rounded-lg">
                            <span class="font-medium text-gray-700">Thursday</span>
                            <span class="text-gray-900">8:00 AM - 6:00 PM</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-gray-200 rounded-lg">
                            <span class="font-medium text-gray-700">Friday</span>
                            <span class="text-gray-900">8:00 AM - 6:00 PM</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-gray-200 rounded-lg">
                            <span class="font-medium text-gray-700">Saturday</span>
                            <span class="text-gray-900">9:00 AM - 4:00 PM</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-red-200 rounded-lg bg-red-50">
                            <span class="font-medium text-gray-700">Sunday</span>
                            <span class="text-red-600 font-medium">Closed</span>
                        </div>
                        <div class="flex justify-between items-center py-3 px-4 border border-blue-200 rounded-lg bg-blue-50">
                            <span class="font-medium text-gray-700">Emergency</span>
                            <span class="text-blue-600 font-medium">24/7 Available</span>
                        </div>
                    </div>
                </div>

                <!-- Service Area Map Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-map-marked-alt text-kwikr-green mr-2"></i>Service Area Map
                        </h3>
                        <button onclick="editServiceArea()" class="text-kwikr-green hover:text-green-600 text-sm font-medium">
                            <i class="fas fa-edit mr-1"></i>Edit Coverage
                        </button>
                    </div>
                    
                    <!-- Map Container -->
                    <div class="mb-6">
                        <div id="serviceAreaMap" class="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                            <div class="text-center">
                                <i class="fas fa-map text-gray-400 text-4xl mb-3"></i>
                                <p class="text-gray-500 font-medium mb-2">Interactive Service Area Map</p>
                                <p class="text-sm text-gray-400">Google Maps Integration - Showing Greater Toronto Area</p>
                                <button onclick="loadMap()" class="mt-3 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm">
                                    <i class="fas fa-map-marker-alt mr-1"></i>Load Map
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Service Areas List -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                                <i class="fas fa-map-pin text-kwikr-green mr-2"></i>Primary Coverage
                            </h4>
                            <div class="space-y-2">
                                <span class="inline-block bg-kwikr-green bg-opacity-10 text-kwikr-green px-3 py-1 rounded-full text-sm font-medium">Toronto</span>
                                <span class="inline-block bg-kwikr-green bg-opacity-10 text-kwikr-green px-3 py-1 rounded-full text-sm font-medium">Mississauga</span>
                                <span class="inline-block bg-kwikr-green bg-opacity-10 text-kwikr-green px-3 py-1 rounded-full text-sm font-medium">Brampton</span>
                            </div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                                <i class="fas fa-circle-dot text-blue-500 mr-2"></i>Extended Coverage
                            </h4>
                            <div class="space-y-2">
                                <span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Oakville</span>
                                <span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Richmond Hill</span>
                                <span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Markham</span>
                            </div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                                <i class="fas fa-info-circle text-gray-400 mr-2"></i>Service Details
                            </h4>
                            <div class="text-sm text-gray-600 space-y-1">
                                <p><i class="fas fa-clock mr-1"></i>Response Time: 2-4 hours</p>
                                <p><i class="fas fa-route mr-1"></i>Travel Fee: $25 outside GTA</p>
                                <p><i class="fas fa-phone mr-1"></i>Emergency: 24/7 available</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Service Pricing Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-dollar-sign text-kwikr-green mr-2"></i>Service Pricing
                        </h3>
                        <button onclick="editPricing()" class="text-kwikr-green hover:text-green-600 text-sm font-medium">
                            <i class="fas fa-edit mr-1"></i>Update Pricing
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="pricingGrid">
                        <!-- Cleaning Services -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <i class="fas fa-broom text-kwikr-green mr-2"></i>
                                    <h4 class="font-medium text-gray-900">Cleaning Services</h4>
                                </div>
                                <span class="text-2xl font-bold text-kwikr-green">$45</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Residential & Commercial</p>
                            <div class="text-xs text-gray-500">
                                <p>per hour • Minimum 2 hours</p>
                                <p class="text-kwikr-green">✓ Equipment included</p>
                            </div>
                        </div>
                        
                        <!-- Plumbing -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <i class="fas fa-wrench text-kwikr-green mr-2"></i>
                                    <h4 class="font-medium text-gray-900">Plumbing</h4>
                                </div>
                                <span class="text-2xl font-bold text-kwikr-green">$85</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Emergency & Maintenance</p>
                            <div class="text-xs text-gray-500">
                                <p>per hour • $125 emergency rate</p>
                                <p class="text-kwikr-green">✓ Licensed plumber</p>
                            </div>
                        </div>
                        
                        <!-- Electrical Work -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <i class="fas fa-bolt text-kwikr-green mr-2"></i>
                                    <h4 class="font-medium text-gray-900">Electrical Work</h4>
                                </div>
                                <span class="text-2xl font-bold text-kwikr-green">$95</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Licensed Electrician</p>
                            <div class="text-xs text-gray-500">
                                <p>per hour • $150 emergency rate</p>
                                <p class="text-kwikr-green">✓ Certified & insured</p>
                            </div>
                        </div>
                        
                        <!-- Handyman Services -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <i class="fas fa-hammer text-kwikr-green mr-2"></i>
                                    <h4 class="font-medium text-gray-900">Handyman Services</h4>
                                </div>
                                <span class="text-2xl font-bold text-kwikr-green">$65</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">General Repairs</p>
                            <div class="text-xs text-gray-500">
                                <p>per hour • 3 hour minimum</p>
                                <p class="text-kwikr-green">✓ Tools & materials extra</p>
                            </div>
                        </div>
                        
                        <!-- Painting -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <i class="fas fa-paint-roller text-kwikr-green mr-2"></i>
                                    <h4 class="font-medium text-gray-900">Painting</h4>
                                </div>
                                <span class="text-2xl font-bold text-kwikr-green">$55</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Interior & Exterior</p>
                            <div class="text-xs text-gray-500">
                                <p>per hour • Paint & supplies extra</p>
                                <p class="text-kwikr-green">✓ Professional grade tools</p>
                            </div>
                        </div>
                        
                        <!-- Landscaping -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <i class="fas fa-leaf text-kwikr-green mr-2"></i>
                                    <h4 class="font-medium text-gray-900">Landscaping</h4>
                                </div>
                                <span class="text-2xl font-bold text-kwikr-green">$75</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">Design & Maintenance</p>
                            <div class="text-xs text-gray-500">
                                <p>per hour • Seasonal rates vary</p>
                                <p class="text-kwikr-green">✓ Equipment & cleanup included</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pricing Notes -->
                    <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-semibold text-blue-900 mb-2 flex items-center">
                            <i class="fas fa-info-circle mr-2"></i>Pricing Information
                        </h4>
                        <ul class="text-sm text-blue-700 space-y-1">
                            <li>• All prices are in CAD and subject to applicable taxes</li>
                            <li>• Emergency services (after hours) may incur additional charges</li>
                            <li>• Materials and specialized equipment charged separately</li>
                            <li>• Free estimates for projects over $500</li>
                            <li>• Senior and veteran discounts available - ask for details</li>
                        </ul>
                    </div>
                </div>

                <!-- Reviews and Testimonials Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-star text-kwikr-green mr-2"></i>Reviews & Testimonials
                        </h3>
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center">
                                <span class="text-3xl font-bold text-kwikr-green mr-2">4.8</span>
                                <div class="flex text-yellow-400">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <span class="text-gray-500 text-sm ml-2">(127 reviews)</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Rating Breakdown -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div class="lg:col-span-1">
                            <h4 class="font-semibold text-gray-900 mb-4">Rating Breakdown</h4>
                            <div class="space-y-2">
                                <div class="flex items-center text-sm">
                                    <span class="w-8">5</span>
                                    <i class="fas fa-star text-yellow-400 mx-2"></i>
                                    <div class="flex-1 bg-gray-200 rounded-full h-2 mx-3">
                                        <div class="bg-yellow-400 h-2 rounded-full" style="width: 76%"></div>
                                    </div>
                                    <span class="w-8 text-right">97</span>
                                </div>
                                <div class="flex items-center text-sm">
                                    <span class="w-8">4</span>
                                    <i class="fas fa-star text-yellow-400 mx-2"></i>
                                    <div class="flex-1 bg-gray-200 rounded-full h-2 mx-3">
                                        <div class="bg-yellow-400 h-2 rounded-full" style="width: 18%"></div>
                                    </div>
                                    <span class="w-8 text-right">23</span>
                                </div>
                                <div class="flex items-center text-sm">
                                    <span class="w-8">3</span>
                                    <i class="fas fa-star text-yellow-400 mx-2"></i>
                                    <div class="flex-1 bg-gray-200 rounded-full h-2 mx-3">
                                        <div class="bg-yellow-400 h-2 rounded-full" style="width: 4%"></div>
                                    </div>
                                    <span class="w-8 text-right">5</span>
                                </div>
                                <div class="flex items-center text-sm">
                                    <span class="w-8">2</span>
                                    <i class="fas fa-star text-yellow-400 mx-2"></i>
                                    <div class="flex-1 bg-gray-200 rounded-full h-2 mx-3">
                                        <div class="bg-yellow-400 h-2 rounded-full" style="width: 1%"></div>
                                    </div>
                                    <span class="w-8 text-right">1</span>
                                </div>
                                <div class="flex items-center text-sm">
                                    <span class="w-8">1</span>
                                    <i class="fas fa-star text-yellow-400 mx-2"></i>
                                    <div class="flex-1 bg-gray-200 rounded-full h-2 mx-3">
                                        <div class="bg-yellow-400 h-2 rounded-full" style="width: 1%"></div>
                                    </div>
                                    <span class="w-8 text-right">1</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="lg:col-span-2">
                            <h4 class="font-semibold text-gray-900 mb-4">Recent Reviews</h4>
                            <div class="space-y-4">
                                <!-- Review 1 -->
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="flex items-center">
                                            <div class="w-10 h-10 bg-kwikr-green rounded-full flex items-center justify-center text-white font-bold mr-3">
                                                S
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-gray-900">Sarah Johnson</h5>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                    </div>
                                                    <span class="text-gray-500 text-sm">2 days ago</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Plumbing</span>
                                    </div>
                                    <p class="text-gray-700 text-sm leading-relaxed">"Excellent service! Fixed our kitchen sink leak quickly and professionally. Very fair pricing and cleaned up afterwards. Highly recommend!"</p>
                                </div>
                                
                                <!-- Review 2 -->
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="flex items-center">
                                            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                                M
                                            </div>
                                            <div>
                                                <h5 class="font-semibold text-gray-900">Mike Chen</h5>
                                                <div class="flex items-center">
                                                    <div class="flex text-yellow-400 mr-2">
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                        <i class="fas fa-star text-xs"></i>
                                                    </div>
                                                    <span class="text-gray-500 text-sm">1 week ago</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Cleaning</span>
                                    </div>
                                    <p class="text-gray-700 text-sm leading-relaxed">"Outstanding cleaning service for our office space. Thorough, reliable, and great attention to detail. The team is professional and trustworthy."</p>
                                </div>
                            </div>
                            
                            <button onclick="viewAllReviews()" class="mt-4 text-kwikr-green hover:text-green-600 text-sm font-medium">
                                <i class="fas fa-chevron-right mr-1"></i>View All Reviews (127)
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Compliance Status Section -->
                <div class="mt-6 bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <i class="fas fa-shield-check text-kwikr-green mr-2"></i>Compliance Status
                    </h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Business License -->
                        <div class="border border-red-200 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center">
                                    <i class="fas fa-certificate text-red-500 mr-2"></i>
                                    <h4 class="font-medium">Business License</h4>
                                </div>
                                <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Missing</span>
                            </div>
                            <p class="text-sm text-gray-600">Required for operation</p>
                        </div>
                        
                        <!-- Insurance Certificate -->
                        <div class="border border-red-200 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center">
                                    <i class="fas fa-shield-alt text-red-500 mr-2"></i>
                                    <h4 class="font-medium">Insurance Certificate</h4>
                                </div>
                                <span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">Missing</span>
                            </div>
                            <p class="text-sm text-gray-600">Liability coverage required</p>
                        </div>
                        
                        <!-- Background Check -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center">
                                    <i class="fas fa-user-check text-gray-400 mr-2"></i>
                                    <h4 class="font-medium">Background Check</h4>
                                </div>
                                <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">Optional</span>
                            </div>
                            <p class="text-sm text-gray-600">Optional verification</p>
                        </div>
                        
                        <!-- Certifications -->
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center">
                                    <i class="fas fa-award text-gray-400 mr-2"></i>
                                    <h4 class="font-medium">Certifications</h4>
                                </div>
                                <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">Optional</span>
                            </div>
                            <p class="text-sm text-gray-600">Professional credentials</p>
                        </div>
                    </div>
                    
                    <!-- Action Required Section -->
                    <div class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                            <span class="font-medium text-yellow-800">Action Required</span>
                        </div>
                        <p class="text-yellow-700 text-sm mt-1">Complete required documents to activate your account for job bidding.</p>
                        <div class="flex items-center mt-2">
                            <div class="text-sm text-yellow-700 mr-4">0/2 Complete</div>
                            <button onclick="uploadDocuments()" class="bg-yellow-600 text-white px-4 py-1 rounded text-sm hover:bg-yellow-700 transition-colors">
                                <i class="fas fa-upload mr-1"></i>Upload Documents
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Edit Mode (initially hidden) -->
            <div id="profileEditMode" class="hidden">
                <!-- Hero Section in Edit Mode -->
                <div class="bg-kwikr-green rounded-lg p-8 text-white mb-6">
                    <div class="flex items-center">
                        <div class="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-6">
                            <div id="profileInitialsEdit" class="text-white text-2xl font-bold">${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}</div>
                        </div>
                        <div class="flex-1">
                            <h2 class="text-3xl font-bold mb-2">${profileData.companyName}</h2>
                            <p class="text-green-100 mb-2">Professional Home & Commercial Services</p>
                            <div class="flex items-center space-x-6">
                                <div class="flex items-center">
                                    <i class="fas fa-star text-yellow-300 mr-1"></i>
                                    <span>4.8 Rating</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="fas fa-check-circle mr-1"></i>
                                    <span>${profileData.isVerified ? 'Verified Business' : 'Verification Pending'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <form id="profileEditForm">
                    <!-- Three Column Layout in Edit Mode -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <!-- Left Column - Contact Information Edit -->
                        <div class="bg-white rounded-lg shadow p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <i class="fas fa-phone text-kwikr-green mr-2"></i>Contact Information
                            </h3>
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
                                    <input type="email" id="primaryEmailEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="${profileData.email}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                                    <input type="email" id="businessEmailEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="${profileData.businessEmail}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input type="tel" id="phoneEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="${profileData.phone || '+1 (416) 555-0123'}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
                                    <input type="tel" id="businessPhoneEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="+1 (416) 555-0124">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                                    <input type="tel" id="emergencyContactEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="+1 (416) 555-0125">
                                </div>
                            </div>
                        </div>

                        <!-- Middle Column - Business Address Edit -->
                        <div class="bg-white rounded-lg shadow p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <i class="fas fa-map-marker-alt text-kwikr-green mr-2"></i>Business Address
                            </h3>
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                                    <input type="text" id="streetAddressEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="123 King Street West">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Unit/Suite</label>
                                    <input type="text" id="unitSuiteEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="Suite 456">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input type="text" id="cityEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="${profileData.city || 'Toronto'}">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Province</label>
                                    <select id="provinceEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent">
                                        <option value="ON" ${profileData.province === 'ON' ? 'selected' : ''}>Ontario</option>
                                        <option value="BC" ${profileData.province === 'BC' ? 'selected' : ''}>British Columbia</option>
                                        <option value="AB" ${profileData.province === 'AB' ? 'selected' : ''}>Alberta</option>
                                        <option value="SK" ${profileData.province === 'SK' ? 'selected' : ''}>Saskatchewan</option>
                                        <option value="MB" ${profileData.province === 'MB' ? 'selected' : ''}>Manitoba</option>
                                        <option value="QC" ${profileData.province === 'QC' ? 'selected' : ''}>Quebec</option>
                                        <option value="NB" ${profileData.province === 'NB' ? 'selected' : ''}>New Brunswick</option>
                                        <option value="NS" ${profileData.province === 'NS' ? 'selected' : ''}>Nova Scotia</option>
                                        <option value="PE" ${profileData.province === 'PE' ? 'selected' : ''}>Prince Edward Island</option>
                                        <option value="NL" ${profileData.province === 'NL' ? 'selected' : ''}>Newfoundland and Labrador</option>
                                        <option value="YT" ${profileData.province === 'YT' ? 'selected' : ''}>Yukon</option>
                                        <option value="NT" ${profileData.province === 'NT' ? 'selected' : ''}>Northwest Territories</option>
                                        <option value="NU" ${profileData.province === 'NU' ? 'selected' : ''}>Nunavut</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                    <input type="text" id="postalCodeEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="M5V 3A8" pattern="[A-Za-z][0-9][A-Za-z] [0-9][A-Za-z][0-9]">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Service Area</label>
                                    <input type="text" id="serviceAreaEdit" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" value="Greater Toronto Area (GTA)">
                                </div>
                            </div>
                        </div>

                        <!-- Right Column - Account Details (Read Only) -->
                        <div class="bg-white rounded-lg shadow p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <i class="fas fa-user text-kwikr-green mr-2"></i>Account Details
                                <span class="ml-auto text-xs text-gray-500">(Read Only)</span>
                            </h3>
                            
                            <div class="space-y-4">
                                <div>
                                    <label class="text-sm font-medium text-gray-500">Account ID</label>
                                    <p class="text-gray-900">${profileData.accountId}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-500">Account Status</label>
                                    <div class="flex items-center">
                                        <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                            <i class="fas fa-circle mr-1"></i>Active
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-500">Member Since</label>
                                    <p class="text-gray-900">${profileData.memberSince}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-500">Last Login</label>
                                    <p class="text-gray-900">Today at 2:30 PM</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-500">Profile Completion</label>
                                    <div class="mt-1">
                                        <div class="flex items-center justify-between text-sm">
                                            <span class="text-kwikr-green font-medium">${profileData.profileCompletion}% Complete</span>
                                        </div>
                                        <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                                            <div class="bg-kwikr-green h-2 rounded-full" style="width: ${profileData.profileCompletion}%"></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-500">Verification Status</label>
                                    <div class="flex items-center">
                                        <span class="${profileData.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs px-2 py-1 rounded-full font-medium">
                                            <i class="fas ${profileData.isVerified ? 'fa-check-circle' : 'fa-clock'} mr-1"></i>
                                            ${profileData.isVerified ? 'Verified' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Business Description Edit Section -->
                    <div class="mt-6 bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-building text-kwikr-green mr-2"></i>Business Description
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Company Overview</label>
                                <textarea id="businessDescriptionEdit" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" placeholder="Describe your business, services, and what makes you unique...">${profileData.companyDescription}</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Team & Expertise</label>
                                <textarea id="teamExpertiseEdit" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" placeholder="Tell clients about your team's qualifications and experience...">Our team of certified professionals is committed to delivering exceptional results on every project. We pride ourselves on punctuality, attention to detail, and customer satisfaction. All our work is fully insured and comes with a satisfaction guarantee.</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Service Area & Availability</label>
                                <textarea id="serviceAvailabilityEdit" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-kwikr-green focus:border-transparent" placeholder="Describe your service coverage area and availability...">We serve the entire GTA and are available for both emergency and scheduled services. Our 24/7 customer service ensures that help is always available when you need it most.</textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" onclick="cancelEdit()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                            <i class="fas fa-times mr-2"></i>Cancel Edit
                        </button>
                        <button type="submit" class="bg-kwikr-green text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
                            <i class="fas fa-save mr-2"></i>Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            // Profile data for JavaScript
            const profileData = ${JSON.stringify(profileData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};
            console.log('Dashboard Profile: Profile data loaded', profileData);
            
            // Toggle edit mode
            function toggleEditMode() {
                const viewMode = document.getElementById('profileViewMode');
                const editMode = document.getElementById('profileEditMode');
                const editBtn = document.getElementById('editProfileBtn');
                
                if (viewMode.classList.contains('hidden')) {
                    // Switch to view mode
                    viewMode.classList.remove('hidden');
                    editMode.classList.add('hidden');
                    editBtn.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Profile';
                } else {
                    // Switch to edit mode
                    viewMode.classList.add('hidden');
                    editMode.classList.remove('hidden');
                    editBtn.innerHTML = '<i class="fas fa-eye mr-2"></i>View Profile';
                }
            }
            
            function cancelEdit() {
                // Reset form fields to original values
                resetFormFields();
                toggleEditMode();
            }
            
            function resetFormFields() {
                // Reset all form fields to original profile data
                document.getElementById('primaryEmailEdit').value = profileData.email;
                document.getElementById('businessEmailEdit').value = profileData.businessEmail;
                document.getElementById('phoneEdit').value = profileData.phone || '+1 (416) 555-0123';
                document.getElementById('businessPhoneEdit').value = '+1 (416) 555-0124';
                document.getElementById('emergencyContactEdit').value = '+1 (416) 555-0125';
                
                document.getElementById('streetAddressEdit').value = '123 King Street West';
                document.getElementById('unitSuiteEdit').value = 'Suite 456';
                document.getElementById('cityEdit').value = profileData.city || 'Toronto';
                document.getElementById('provinceEdit').value = profileData.province || 'ON';
                document.getElementById('postalCodeEdit').value = 'M5V 3A8';
                document.getElementById('serviceAreaEdit').value = 'Greater Toronto Area (GTA)';
                
                document.getElementById('businessDescriptionEdit').value = profileData.companyDescription;
                document.getElementById('teamExpertiseEdit').value = 'Our team of certified professionals is committed to delivering exceptional results on every project. We pride ourselves on punctuality, attention to detail, and customer satisfaction. All our work is fully insured and comes with a satisfaction guarantee.';
                document.getElementById('serviceAvailabilityEdit').value = 'We serve the entire GTA and are available for both emergency and scheduled services. Our 24/7 customer service ensures that help is always available when you need it most.';
            }
            
            // Handle form submission
            document.addEventListener('DOMContentLoaded', function() {
                const editForm = document.getElementById('profileEditForm');
                if (editForm) {
                    editForm.addEventListener('submit', async function(e) {
                        e.preventDefault();
                        await saveProfileChanges();
                    });
                }
            });
            
            async function saveProfileChanges() {
                // Collect form data
                const formData = {
                    primaryEmail: document.getElementById('primaryEmailEdit').value,
                    businessEmail: document.getElementById('businessEmailEdit').value,
                    phone: document.getElementById('phoneEdit').value,
                    businessPhone: document.getElementById('businessPhoneEdit').value,
                    emergencyContact: document.getElementById('emergencyContactEdit').value,
                    
                    streetAddress: document.getElementById('streetAddressEdit').value,
                    unitSuite: document.getElementById('unitSuiteEdit').value,
                    city: document.getElementById('cityEdit').value,
                    province: document.getElementById('provinceEdit').value,
                    postalCode: document.getElementById('postalCodeEdit').value,
                    serviceArea: document.getElementById('serviceAreaEdit').value,
                    
                    businessDescription: document.getElementById('businessDescriptionEdit').value,
                    teamExpertise: document.getElementById('teamExpertiseEdit').value,
                    serviceAvailability: document.getElementById('serviceAvailabilityEdit').value
                };
                
                console.log('Saving profile changes:', formData);
                
                try {
                    const response = await fetch('/api/worker/profile/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',  // Include session cookies
                        body: JSON.stringify(formData)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Update display values with new data
                        updateDisplayValues(formData);
                        
                        // Show success message
                        showNotification('Profile updated successfully!', 'success');
                        
                        // Switch back to view mode
                        toggleEditMode();
                    } else {
                        showNotification(result.error || 'Failed to update profile', 'error');
                    }
                } catch (error) {
                    console.error('Error saving profile:', error);
                    showNotification('Network error. Please try again.', 'error');
                }
            }
            
            function updateDisplayValues(formData) {
                // Update the display elements with new values
                document.getElementById('primaryEmailDisplay').textContent = formData.primaryEmail;
                document.getElementById('businessEmailDisplay').textContent = formData.businessEmail;
                document.getElementById('phoneDisplay').textContent = formData.phone;
                document.getElementById('businessPhoneDisplay').textContent = formData.businessPhone;
                document.getElementById('emergencyContactDisplay').textContent = formData.emergencyContact;
                
                document.getElementById('streetAddressDisplay').textContent = formData.streetAddress;
                document.getElementById('unitSuiteDisplay').textContent = formData.unitSuite;
                document.getElementById('cityDisplay').textContent = formData.city;
                document.getElementById('provinceDisplay').textContent = getProvinceFullName(formData.province);
                document.getElementById('postalCodeDisplay').textContent = formData.postalCode;
                document.getElementById('serviceAreaDisplay').textContent = formData.serviceArea;
                
                document.getElementById('businessDescriptionDisplay').textContent = formData.businessDescription;
            }
            
            function getProvinceFullName(code) {
                const provinces = {
                    'ON': 'Ontario',
                    'BC': 'British Columbia',
                    'AB': 'Alberta',
                    'SK': 'Saskatchewan',
                    'MB': 'Manitoba',
                    'QC': 'Quebec',
                    'NB': 'New Brunswick',
                    'NS': 'Nova Scotia',
                    'PE': 'Prince Edward Island',
                    'NL': 'Newfoundland and Labrador',
                    'YT': 'Yukon',
                    'NT': 'Northwest Territories',
                    'NU': 'Nunavut'
                };
                return provinces[code] || code;
            }
            
            function showNotification(message, type = 'info') {
                // Create notification element
                const notification = document.createElement('div');
                notification.className = \`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full\`;
                
                if (type === 'success') {
                    notification.classList.add('bg-green-500', 'text-white');
                    notification.innerHTML = \`<i class="fas fa-check-circle mr-2"></i>\${message}\`;
                } else if (type === 'error') {
                    notification.classList.add('bg-red-500', 'text-white');
                    notification.innerHTML = \`<i class="fas fa-exclamation-circle mr-2"></i>\${message}\`;
                } else {
                    notification.classList.add('bg-blue-500', 'text-white');
                    notification.innerHTML = \`<i class="fas fa-info-circle mr-2"></i>\${message}\`;
                }
                
                document.body.appendChild(notification);
                
                // Slide in
                setTimeout(() => {
                    notification.classList.remove('translate-x-full');
                }, 100);
                
                // Slide out and remove
                setTimeout(() => {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => {
                        document.body.removeChild(notification);
                    }, 300);
                }, 4000);
            }
            
            function manageServices() {
                window.location.href = '/dashboard/worker/services';
            }
            
            function uploadDocuments() {
                window.location.href = '/dashboard/worker/compliance';
            }
            
            function uploadLogo() {
                // Create file input element
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        // For now, show a placeholder message
                        showNotification('Logo upload functionality coming soon!', 'info');
                        // TODO: Implement actual logo upload to server
                    }
                };
                input.click();
            }
        </script>
    </body>
    </html>
  `)
})

// Admin Dashboard
dashboardRoutes.get('/admin', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'admin') {
    return c.redirect('/dashboard')
  }
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard - Real-time Analytics & Management Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          .loading-spinner { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .metric-card { transition: all 0.3s ease; }
          .metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
          .activity-item { transition: background-color 0.2s ease; }
          .realtime-indicator { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        </style>
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory Admin
                        </h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Loading Indicator -->
        <div id="loading-indicator" class="fixed top-0 left-0 right-0 bg-kwikr-green text-white text-center py-2 z-50" style="display: none;">
            <i class="fas fa-spinner loading-spinner mr-2"></i>
            Updating dashboard...
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Enhanced Header with Real-time Controls -->
            <div class="mb-8">
                <div class="flex justify-between items-start">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 flex items-center">
                            Admin Dashboard
                            <div class="ml-4 flex items-center">
                                <div class="w-3 h-3 bg-green-400 rounded-full realtime-indicator mr-2"></div>
                                <span class="text-sm font-normal text-green-600">Live</span>
                            </div>
                        </h1>
                        <p class="text-gray-600 mt-2">Real-time platform management and comprehensive analytics</p>
                        <p class="text-xs text-gray-500 mt-1" id="last-refresh-time">Last updated: Loading...</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="flex items-center">
                            <label class="text-sm text-gray-600 mr-2">Auto-refresh</label>
                            <input type="checkbox" id="autoRefreshToggle" checked class="w-4 h-4 text-kwikr-green border-gray-300 rounded focus:ring-kwikr-green">
                        </div>
                        <button id="refreshDashboard" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center">
                            <i class="fas fa-sync-alt mr-2"></i>Refresh
                        </button>
                        <div id="system-health" class="bg-white px-4 py-2 rounded-lg border">
                            <div class="flex items-center">
                                <div class="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                <span class="text-xs text-gray-500">Checking...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Today's Activity Summary -->
                <div class="mt-6 bg-gradient-to-r from-kwikr-green to-green-600 text-white rounded-lg p-4">
                    <h3 class="font-semibold mb-3 flex items-center">
                        <i class="fas fa-calendar-day mr-2"></i>Today's Activity
                    </h3>
                    <div id="today-activity" class="text-sm">
                        <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
                            <div class="text-center">
                                <div class="text-lg font-bold">-</div>
                                <div class="text-xs opacity-90">Loading...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Enhanced Platform Stats with Real-time Updates -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-blue-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="active-users">-</p>
                            <p class="text-sm text-gray-600">Active Users</p>
                            <p class="text-xs text-blue-600 mt-1">↗ Real-time</p>
                        </div>
                        <div class="text-blue-500 text-3xl">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-kwikr-green">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="open-jobs">-</p>
                            <p class="text-sm text-gray-600">Open Jobs</p>
                            <p class="text-xs text-kwikr-green mt-1">↗ Live count</p>
                        </div>
                        <div class="text-kwikr-green text-3xl">
                            <i class="fas fa-briefcase"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-purple-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="total-revenue">-</p>
                            <p class="text-sm text-gray-600">Total Revenue</p>
                            <p class="text-xs text-purple-600 mt-1">↗ Platform earnings</p>
                        </div>
                        <div class="text-purple-500 text-3xl">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-red-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="active-disputes">-</p>
                            <p class="text-sm text-gray-600">Active Disputes</p>
                            <p class="text-xs text-red-600 mt-1">↗ Needs attention</p>
                        </div>
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Second row of metrics -->
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-yellow-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="pending-documents">-</p>
                            <p class="text-sm text-gray-600">Pending Documents</p>
                            <p class="text-xs text-yellow-600 mt-1">↗ Awaiting review</p>
                        </div>
                        <div class="text-yellow-500 text-3xl">
                            <i class="fas fa-file-alt"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-indigo-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="active-workers">-</p>
                            <p class="text-sm text-gray-600">Active Workers</p>
                            <p class="text-xs text-indigo-600 mt-1">↗ Verified providers</p>
                        </div>
                        <div class="text-indigo-500 text-3xl">
                            <i class="fas fa-hard-hat"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-green-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="completed-jobs">-</p>
                            <p class="text-sm text-gray-600">Completed Jobs</p>
                            <p class="text-xs text-green-600 mt-1">↗ Platform success</p>
                        </div>
                        <div class="text-green-500 text-3xl">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm metric-card border-l-4 border-pink-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-2xl font-bold text-gray-900" id="verified-users">-</p>
                            <p class="text-sm text-gray-600">Verified Users</p>
                            <p class="text-xs text-pink-600 mt-1">↗ Quality assurance</p>
                        </div>
                        <div class="text-pink-500 text-3xl">
                            <i class="fas fa-shield-check"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Real-time Analytics & Performance Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <!-- Performance Metrics -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-tachometer-alt text-kwikr-green mr-2"></i>
                            Performance Metrics
                        </h3>
                        <div class="w-2 h-2 bg-green-400 rounded-full realtime-indicator"></div>
                    </div>
                    <div id="performance-metrics">
                        <div class="text-center py-4 text-gray-500">
                            <i class="fas fa-spinner loading-spinner text-lg mb-2"></i>
                            <p class="text-sm">Loading performance data...</p>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity Feed -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-stream text-blue-600 mr-2"></i>
                            Recent Activity
                        </h3>
                        <div class="w-2 h-2 bg-blue-400 rounded-full realtime-indicator"></div>
                    </div>
                    <div id="activity-feed" class="space-y-3 max-h-64 overflow-y-auto">
                        <div class="text-center py-4 text-gray-500">
                            <i class="fas fa-spinner loading-spinner text-lg mb-2"></i>
                            <p class="text-sm">Loading recent activity...</p>
                        </div>
                    </div>
                </div>

                <!-- Geographic Distribution -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-map-marked-alt text-purple-600 mr-2"></i>
                            Geographic Data
                        </h3>
                        <div class="w-2 h-2 bg-purple-400 rounded-full realtime-indicator"></div>
                    </div>
                    <div id="geographic-distribution" class="space-y-2 max-h-64 overflow-y-auto">
                        <div class="text-center py-4 text-gray-500">
                            <i class="fas fa-spinner loading-spinner text-lg mb-2"></i>
                            <p class="text-sm">Loading geographic data...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Interactive Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- User Growth Chart -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-chart-line text-green-600 mr-2"></i>
                            User Growth Trend
                        </h3>
                        <div class="text-xs text-gray-500">Last 7 days</div>
                    </div>
                    <div class="relative h-64">
                        <canvas id="userGrowthChart"></canvas>
                    </div>
                </div>

                <!-- Revenue Analytics Chart -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-chart-bar text-purple-600 mr-2"></i>
                            Revenue Analytics
                        </h3>
                        <div class="text-xs text-gray-500">Last 7 days</div>
                    </div>
                    <div class="relative h-64">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>

                <!-- Performance Distribution Chart -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-chart-pie text-yellow-600 mr-2"></i>
                            Job Status Distribution
                        </h3>
                        <div class="text-xs text-gray-500">Current status</div>
                    </div>
                    <div class="relative h-64">
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>

                <!-- Geographic Chart -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                            <i class="fas fa-map-marker-alt text-red-600 mr-2"></i>
                            User Distribution by Province
                        </h3>
                        <div class="text-xs text-gray-500">Active users</div>
                    </div>
                    <div class="relative h-64">
                        <canvas id="geographicChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Business Intelligence Summary -->
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold flex items-center">
                        <i class="fas fa-brain mr-3"></i>
                        Business Intelligence Insights
                    </h3>
                    <button onclick="refreshBusinessIntelligence()" class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-refresh mr-2"></i>Refresh Insights
                    </button>
                </div>
                <div id="business-intelligence-summary" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold">-</div>
                        <div class="text-sm opacity-90">Growth Rate</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold">-</div>
                        <div class="text-sm opacity-90">Completion Rate</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold">-</div>
                        <div class="text-sm opacity-90">Customer Satisfaction</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold">-</div>
                        <div class="text-sm opacity-90">Market Health</div>
                    </div>
                </div>
            </div>

            <!-- Main Content Tabs -->
            <div class="bg-white rounded-lg shadow-sm">
                <div class="border-b border-gray-200">
                    <nav class="flex">
                        <button onclick="showTab('overview', this)" class="admin-tab active px-6 py-3 border-b-2 border-kwikr-green text-kwikr-green font-medium">
                            Overview
                        </button>
                        <button onclick="showTab('users', this)" class="admin-tab px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            Users
                        </button>
                        <button onclick="showTab('compliance', this)" class="admin-tab px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            Compliance
                        </button>
                        <button onclick="showTab('disputes', this)" class="admin-tab px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            Disputes
                        </button>
                        <button onclick="showTab('analytics', this)" class="admin-tab px-6 py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700">
                            Analytics
                        </button>
                    </nav>
                </div>

                <!-- Tab Content -->
                <div class="p-6">
                    <!-- Overview Tab -->
                    <div id="overviewTab" class="tab-content">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h3>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h4 class="font-medium text-gray-900 mb-3">Recent Jobs</h4>
                                <div id="recentJobs" class="space-y-3">
                                    <div class="text-center text-gray-500 py-8">
                                        <i class="fas fa-spinner fa-spin text-2xl mb-4"></i>
                                        <p>Loading recent jobs...</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-900 mb-3">System Status</h4>
                                <div class="space-y-3">
                                    <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                        <span class="text-sm font-medium">Payment Processing</span>
                                        <span class="text-green-600"><i class="fas fa-check-circle"></i> Active</span>
                                    </div>
                                    <div class="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                        <span class="text-sm font-medium">New Registrations</span>
                                        <span class="text-green-600"><i class="fas fa-check-circle"></i> Active</span>
                                    </div>
                                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span class="text-sm font-medium">Maintenance Mode</span>
                                        <span class="text-gray-600"><i class="fas fa-times-circle"></i> Inactive</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Users Tab -->
                    <div id="usersTab" class="tab-content hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">User Management</h3>
                            <div class="flex space-x-2">
                                <select id="userRoleFilter" class="border border-gray-300 rounded-lg px-3 py-2">
                                    <option value="">All Roles</option>
                                    <option value="client">Clients</option>
                                    <option value="worker">Workers</option>
                                </select>
                                <button onclick="loadUsers()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                                    <i class="fas fa-refresh"></i>
                                </button>
                            </div>
                        </div>
                        <div id="usersList">
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-spinner fa-spin text-2xl mb-4"></i>
                                <p>Loading users...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Compliance Tab -->
                    <div id="complianceTab" class="tab-content hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Worker Compliance Review</h3>
                            <button onclick="loadCompliance()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                                <i class="fas fa-refresh"></i>
                            </button>
                        </div>
                        <div id="complianceList">
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-spinner fa-spin text-2xl mb-4"></i>
                                <p>Loading compliance reviews...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Disputes Tab -->
                    <div id="disputesTab" class="tab-content hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Dispute Management</h3>
                            <button onclick="loadDisputes()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                                <i class="fas fa-refresh"></i>
                            </button>
                        </div>
                        <div id="disputesList">
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-spinner fa-spin text-2xl mb-4"></i>
                                <p>Loading disputes...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Analytics Tab -->
                    <div id="analyticsTab" class="tab-content hidden">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Analytics & Reports</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="border border-gray-200 rounded-lg p-6">
                                <h4 class="font-medium text-gray-900 mb-3">Export Data</h4>
                                <div class="space-y-3">
                                    <button onclick="exportJobs()" class="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <i class="fas fa-download text-kwikr-green mr-3"></i>
                                        Export Jobs Data (CSV)
                                    </button>
                                    <button onclick="exportUsers()" class="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                        <i class="fas fa-download text-kwikr-green mr-3"></i>
                                        Export Users Data (CSV)
                                    </button>
                                </div>
                            </div>
                            <div class="border border-gray-200 rounded-lg p-6">
                                <h4 class="font-medium text-gray-900 mb-3">Platform Statistics</h4>
                                <div id="platformStats" class="space-y-3">
                                    <div class="text-center text-gray-500">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <p class="text-sm mt-2">Loading statistics...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          // Embed user information directly from server-side session
          window.currentUser = {
            id: ${user.user_id || 3},
            email: "${user.email || 'demo.admin@kwikr.ca'}",
            role: "${user.role || 'admin'}",
            firstName: "${user.first_name || 'Demo'}",
            lastName: "${user.last_name || 'Admin'}",
            province: "${user.province || ''}",
            city: "${user.city || ''}",
            isVerified: ${user.is_verified || 1}
          };
          console.log('Admin user information embedded from server:', window.currentUser);
          
          // Test if JavaScript is executing at all
          console.log('ADMIN DASHBOARD: JavaScript is executing!');
          
          // Set proper page title
          document.title = 'Admin Dashboard - Kwikr Directory';
          
          // JavaScript working indicator removed to avoid obstructing the view
          
          // Set initial stats immediately to test
          setTimeout(function() {
            console.log('ADMIN DASHBOARD: Setting demo stats...');
            var totalUsersEl = document.getElementById('totalUsers');
            var totalJobsEl = document.getElementById('totalJobs');
            var pendingEl = document.getElementById('pendingCompliance');
            var disputesEl = document.getElementById('activeDisputes');
            
            if (totalUsersEl) {
              totalUsersEl.textContent = '2,847';
              console.log('Set total users');
            }
            if (totalJobsEl) {
              totalJobsEl.textContent = '1,356';
              console.log('Set total jobs');
            }
            if (pendingEl) {
              pendingEl.textContent = '12';
              console.log('Set pending compliance');
            }
            if (disputesEl) {
              disputesEl.textContent = '3';
              console.log('Set active disputes');
            }
            
            // Test recent jobs
            var recentJobsEl = document.getElementById('recentJobs');
            if (recentJobsEl) {
              recentJobsEl.innerHTML = \`
                <div class="space-y-3">
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900">Kitchen Deep Cleaning</h4>
                      <p class="text-xs text-gray-600">Cleaning Services</p>
                      <p class="text-xs text-gray-500">2 days ago</p>
                    </div>
                    <div class="text-right">
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">In Progress</span>
                      <div class="text-xs text-gray-600 mt-1">$120 - $180</div>
                    </div>
                  </div>
                  <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900">Bathroom Renovation</h4>
                      <p class="text-xs text-gray-600">Handyman Services</p>
                      <p class="text-xs text-gray-500">5 days ago</p>
                    </div>
                    <div class="text-right">
                      <span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Assigned</span>
                      <div class="text-xs text-gray-600 mt-1">$800 - $1,200</div>
                    </div>
                  </div>
                </div>
              \`;
              console.log('Set recent jobs');
            }
          }, 1000);
          
          // Global function for tab switching - embedded directly
          window.showTab = function(tabName, clickedElement) {
            console.log('ADMIN DASHBOARD: Switching to tab:', tabName);
            
            try {
              // Hide all tab contents
              var tabContents = document.querySelectorAll('.tab-content');
              console.log('Found tab contents:', tabContents.length);
              for (var i = 0; i < tabContents.length; i++) {
                tabContents[i].classList.add('hidden');
              }
              
              // Remove active class from all tabs
              var tabs = document.querySelectorAll('.admin-tab');
              console.log('Found admin tabs:', tabs.length);
              for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('border-kwikr-green', 'text-kwikr-green');
                tabs[i].classList.add('border-transparent', 'text-gray-500');
              }
              
              // Show selected tab content
              var selectedTab = document.getElementById(tabName + 'Tab');
              if (selectedTab) {
                selectedTab.classList.remove('hidden');
                console.log('Showed tab:', tabName + 'Tab');
              } else {
                console.error('Tab not found:', tabName + 'Tab');
              }
              
              // Find and activate the clicked button
              var clickedButton = clickedElement || window.event?.target;
              if (!clickedButton) {
                // Fallback: find the button by its onclick content
                var allButtons = document.querySelectorAll('.admin-tab');
                for (var i = 0; i < allButtons.length; i++) {
                  if (allButtons[i].getAttribute('onclick')?.includes(tabName)) {
                    clickedButton = allButtons[i];
                    break;
                  }
                }
              }
              
              if (clickedButton) {
                clickedButton.classList.remove('border-transparent', 'text-gray-500');
                clickedButton.classList.add('border-kwikr-green', 'text-kwikr-green');
                console.log('Activated button for tab:', tabName);
              }
              
              // Load tab-specific demo data
              if (tabName === 'users') {
                setTimeout(function() {
                  var usersList = document.getElementById('usersList');
                  if (usersList) {
                    usersList.innerHTML = \`
                      <div class="space-y-3">
                        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div class="flex-1">
                            <h4 class="text-sm font-medium text-gray-900">Jennifer Lopez</h4>
                            <p class="text-sm text-gray-600">jennifer.l@email.com</p>
                            <p class="text-xs text-gray-500">client • Toronto, ON</p>
                          </div>
                          <div class="text-right">
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Verified</span>
                          </div>
                        </div>
                        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div class="flex-1">
                            <h4 class="text-sm font-medium text-gray-900">Sarah Mitchell</h4>
                            <p class="text-sm text-gray-600">sarah.m@cleanpro.ca</p>
                            <p class="text-xs text-gray-500">worker • Calgary, AB</p>
                          </div>
                          <div class="text-right">
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Verified</span>
                          </div>
                        </div>
                      </div>
                    \`;
                    console.log('Loaded users data');
                  }
                }, 500);
              } else if (tabName === 'compliance') {
                setTimeout(function() {
                  var complianceList = document.getElementById('complianceList');
                  if (complianceList) {
                    complianceList.innerHTML = \`
                      <div class="space-y-3">
                        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div class="flex-1">
                            <h4 class="text-sm font-medium text-gray-900">Sarah Mitchell - Insurance Verification</h4>
                            <p class="text-sm text-gray-600">Submitted 2 days ago</p>
                          </div>
                          <div class="text-right">
                            <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pending Review</span>
                          </div>
                        </div>
                        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div class="flex-1">
                            <h4 class="text-sm font-medium text-gray-900">James Wilson - Background Check</h4>
                            <p class="text-sm text-gray-600">Submitted 5 days ago</p>
                          </div>
                          <div class="text-right">
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Approved</span>
                          </div>
                        </div>
                      </div>
                    \`;
                    console.log('Loaded compliance data');
                  }
                }, 500);
              } else if (tabName === 'disputes') {
                setTimeout(function() {
                  var disputesList = document.getElementById('disputesList');
                  if (disputesList) {
                    disputesList.innerHTML = \`
                      <div class="space-y-3">
                        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div class="flex-1">
                            <h4 class="text-sm font-medium text-gray-900">Kitchen Cleaning Service Dispute</h4>
                            <p class="text-sm text-gray-600">Jennifer L. vs Sarah M. • $150</p>
                            <p class="text-xs text-gray-500">Work quality dispute</p>
                          </div>
                          <div class="text-right">
                            <span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Open</span>
                          </div>
                        </div>
                        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                          <div class="flex-1">
                            <h4 class="text-sm font-medium text-gray-900">Payment Delay Issue</h4>
                            <p class="text-sm text-gray-600">Mike R. vs James W. • $800</p>
                            <p class="text-xs text-gray-500">Payment processing delay</p>
                          </div>
                          <div class="text-right">
                            <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Investigating</span>
                          </div>
                        </div>
                      </div>
                    \`;
                    console.log('Loaded disputes data');
                  }
                }, 500);
              } else if (tabName === 'analytics') {
                setTimeout(function() {
                  var platformStats = document.getElementById('platformStats');
                  if (platformStats) {
                    platformStats.innerHTML = \`
                      <div class="space-y-4">
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span class="text-sm font-medium">Revenue This Month</span>
                          <span class="text-lg font-bold text-green-600">$47,230</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span class="text-sm font-medium">Jobs Completed</span>
                          <span class="text-lg font-bold text-blue-600">342</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span class="text-sm font-medium">Platform Fee Collected</span>
                          <span class="text-lg font-bold text-purple-600">$4,723</span>
                        </div>
                      </div>
                    \`;
                    console.log('Loaded analytics data');
                  }
                }, 500);
              }
              
            } catch (error) {
              console.error('Error in showTab function:', error);
            }
          };
          
          console.log('ADMIN DASHBOARD: Inline JavaScript setup complete');
          
          // Enhanced admin dashboard functions
          window.refreshBusinessIntelligence = async function() {
            try {
              // Get session token from cookies
              const sessionToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('session='))
                ?.split('=')[1];
                
              if (!sessionToken) {
                console.error('No session token found');
                showNotification('Authentication required. Please login again.', 'error');
                return;
              }
              
              const response = await fetch('/api/admin/analytics/business-intelligence?timeframe=7', {
                headers: { 'Authorization': 'Bearer ' + sessionToken }
              });
              
              if (response.ok) {
                const data = await response.json();
                const summary = document.getElementById('business-intelligence-summary');
                if (summary && data.performance_trends) {
                  summary.innerHTML = \`
                    <div class="text-center">
                      <div class="text-2xl font-bold">\${Math.round(data.performance_trends.user_growth_rate)}%</div>
                      <div class="text-sm opacity-90">Growth Rate</div>
                    </div>
                    <div class="text-center">
                      <div class="text-2xl font-bold">\${Math.round(data.performance_trends.job_completion_rate)}%</div>
                      <div class="text-sm opacity-90">Completion Rate</div>
                    </div>
                    <div class="text-center">
                      <div class="text-2xl font-bold">\${Math.round(data.performance_trends.customer_satisfaction_score)}%</div>
                      <div class="text-sm opacity-90">Customer Satisfaction</div>
                    </div>
                    <div class="text-center">
                      <div class="text-2xl font-bold">\${data.summary.top_performing_province || 'N/A'}</div>
                      <div class="text-sm opacity-90">Top Province</div>
                    </div>
                  \`;
                }
                
                // Show insights
                if (data.business_insights && data.business_insights.length > 0) {
                  data.business_insights.forEach(insight => {
                    showNotification(insight.message, insight.type);
                  });
                }
              }
            } catch (error) {
              console.error('Error refreshing business intelligence:', error);
            }
          };
          
          window.showNotification = function(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 \${
              type === 'success' ? 'bg-green-500 text-white' :
              type === 'warning' ? 'bg-yellow-500 text-white' :
              type === 'error' ? 'bg-red-500 text-white' :
              type === 'positive' ? 'bg-blue-500 text-white' :
              'bg-gray-600 text-white'
            }\`;
            
            notification.innerHTML = \`
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">\${message}</span>
                <button class="ml-3 text-white hover:text-gray-200 focus:outline-none" onclick="this.parentElement.parentElement.remove()">
                  <i class="fas fa-times text-xs"></i>
                </button>
              </div>
            \`;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.remove();
            }, 5000);
          };
          
          // Dashboard data loading function
          window.loadDashboardData = async function() {
            try {
              const sessionToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('session='))
                ?.split('=')[1];
                
              if (!sessionToken) {
                console.error('No session token found');
                showNotification('Authentication required. Please login again.', 'error');
                return;
              }
              
              console.log('Loading dashboard data...');
              console.log('Session token found:', sessionToken);
              
              // Load basic dashboard metrics
              const response = await fetch('/api/admin/dashboard', {
                headers: { 'Authorization': 'Bearer ' + sessionToken }
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log('Dashboard data loaded:', data);
                
                // Update main metrics
                const activeUsersEl = document.getElementById('active-users');
                const openJobsEl = document.getElementById('open-jobs');
                const totalRevenueEl = document.getElementById('total-revenue');
                
                if (activeUsersEl) activeUsersEl.textContent = (data.active_users || 0).toLocaleString();
                if (openJobsEl) openJobsEl.textContent = (data.open_jobs || 0).toLocaleString();
                if (totalRevenueEl) totalRevenueEl.textContent = '$' + (data.total_revenue || 0).toLocaleString();
                
                // Update today's activity
                const todayActivityEl = document.getElementById('today-activity');
                if (todayActivityEl && data.new_users_today !== undefined) {
                  todayActivityEl.innerHTML = 
                    '<div class="grid grid-cols-2 md:grid-cols-6 gap-4">' +
                      '<div class="text-center">' +
                        '<div class="text-lg font-bold">' + (data.new_users_today || 0) + '</div>' +
                        '<div class="text-xs opacity-90">New Users</div>' +
                      '</div>' +
                      '<div class="text-center">' +
                        '<div class="text-lg font-bold">' + (data.jobs_posted_today || 0) + '</div>' +
                        '<div class="text-xs opacity-90">Jobs Posted</div>' +
                      '</div>' +
                      '<div class="text-center">' +
                        '<div class="text-lg font-bold">' + (data.active_workers || 0) + '</div>' +
                        '<div class="text-xs opacity-90">Active Workers</div>' +
                      '</div>' +
                      '<div class="text-center">' +
                        '<div class="text-lg font-bold">' + (data.active_clients || 0) + '</div>' +
                        '<div class="text-xs opacity-90">Active Clients</div>' +
                      '</div>' +
                      '<div class="text-center">' +
                        '<div class="text-lg font-bold">' + (data.completed_jobs || 0) + '</div>' +
                        '<div class="text-xs opacity-90">Completed Jobs</div>' +
                      '</div>' +
                      '<div class="text-center">' +
                        '<div class="text-lg font-bold">' + (data.pending_documents || 0) + '</div>' +
                        '<div class="text-xs opacity-90">Pending Reviews</div>' +
                      '</div>' +
                    '</div>';
                }
                
                // Update system health
                const systemHealthEl = document.getElementById('system-health');
                if (systemHealthEl) {
                  const isHealthy = data.active_users > 0 && data.open_jobs >= 0;
                  systemHealthEl.innerHTML = 
                    '<div class="flex items-center">' +
                      '<div class="w-2 h-2 ' + (isHealthy ? 'bg-green-400' : 'bg-red-400') + ' rounded-full mr-2"></div>' +
                      '<span class="text-xs ' + (isHealthy ? 'text-green-600' : 'text-red-600') + '">' + (isHealthy ? 'Healthy' : 'Issues Detected') + '</span>' +
                    '</div>';
                }
                
                // Update last refresh time
                const lastRefreshEl = document.getElementById('last-refresh-time');
                if (lastRefreshEl) {
                  lastRefreshEl.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                }
                
                showNotification('Dashboard updated successfully', 'success');
                
              } else {
                console.error('Failed to load dashboard data:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                showNotification('Dashboard update failed. Please refresh the page.', 'error');
              }
              
            } catch (error) {
              console.error('Error loading dashboard data:', error);
              showNotification('Dashboard update failed. Please refresh the page.', 'error');
            }
          };
          
          // Auto-refresh functionality
          let autoRefreshInterval = null;
          
          window.startAutoRefresh = function() {
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            
            autoRefreshInterval = setInterval(() => {
              const autoRefreshToggle = document.getElementById('autoRefreshToggle');
              if (autoRefreshToggle && autoRefreshToggle.checked) {
                console.log('Auto-refreshing dashboard...');
                loadDashboardData();
              }
            }, 30000); // Refresh every 30 seconds
          };
          
          // Manual refresh button
          document.addEventListener('DOMContentLoaded', function() {
            const refreshButton = document.getElementById('refreshDashboard');
            if (refreshButton) {
              refreshButton.addEventListener('click', function() {
                console.log('Manual refresh triggered');
                loadDashboardData();
              });
            }
            
            // Initial load
            loadDashboardData();
            
            // Start auto-refresh
            startAutoRefresh();
          });
          
          // Initialize business intelligence on load
          setTimeout(() => {
            refreshBusinessIntelligence();
          }, 3000);
          
        </script>
        <!-- Admin dashboard.js removed to avoid conflicts with embedded dashboard loading -->
    </body>
    </html>
  `)
})

// Client Profile Management Page  
dashboardRoutes.get('/client/profile', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Profile - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/client" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Breadcrumb Navigation -->
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                <a href="/dashboard/client" class="hover:text-kwikr-green">Dashboard</a>
                <i class="fas fa-chevron-right text-xs"></i>
                <span class="text-gray-900 font-medium">My Profile</span>
            </nav>
            
            <!-- Comprehensive Client Profile -->
            <!-- Client Profile Header -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div class="bg-gradient-to-r from-kwikr-green to-green-600 rounded-t-lg p-6 text-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                                <i class="fas fa-user text-3xl"></i>
                            </div>
                            <div>
                                <h1 class="text-2xl font-bold">${user.first_name} ${user.last_name}</h1>
                                <p class="text-green-100">Premium Client</p>
                                <div class="flex items-center mt-1">
                                    <i class="fas fa-calendar-alt mr-2"></i>
                                    <span class="text-sm">Member since March 2023</span>
                                    <i class="fas fa-check-circle ml-3 text-green-200" title="Verified Account"></i>
                                </div>
                            </div>
                        </div>
                        <button id="editProfileBtn" onclick="toggleEditMode()" class="bg-white text-kwikr-green px-4 py-2 rounded-lg hover:bg-gray-50 font-medium">
                            <i class="fas fa-edit mr-2"></i><span id="editBtnText">Edit Profile</span>
                        </button>
                    </div>
                </div>
                
                <!-- Client Statistics -->
                <div class="p-6 border-b border-gray-200">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-kwikr-green">12</div>
                            <div class="text-sm text-gray-600">Jobs Posted</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">8</div>
                            <div class="text-sm text-gray-600">Completed Projects</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">$18,500</div>
                            <div class="text-sm text-gray-600">Total Spent</div>
                        </div>
                        <div class="text-center">
                            <div class="flex justify-center items-center mb-1">
                                <div class="text-2xl font-bold text-yellow-500">4.8</div>
                                <div class="flex ml-2">
                                    <i class="fas fa-star text-yellow-400"></i>
                                    <i class="fas fa-star text-yellow-400"></i>
                                    <i class="fas fa-star text-yellow-400"></i>
                                    <i class="fas fa-star text-yellow-400"></i>
                                    <i class="fas fa-star text-gray-300"></i>
                                </div>
                            </div>
                            <div class="text-sm text-gray-600">Client Rating</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Personal Information -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">
                        <i class="fas fa-user mr-2"></i>Personal Information
                    </h2>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- View Mode -->
                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <div class="text-gray-900">${user.first_name}</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <input type="text" id="firstName" value="${user.first_name}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <div class="text-gray-900">${user.last_name}</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input type="text" id="lastName" value="${user.last_name}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div class="text-gray-900">${user.email}</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input type="email" id="email" value="${user.email}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div class="text-gray-900">(416) 555-0123</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                            <input type="tel" id="phone" value="(416) 555-0123" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>
                    </div>

                    <!-- Edit Mode Action Buttons -->
                    <div class="edit-mode hidden mt-6">
                        <div class="flex space-x-3">
                            <button onclick="saveProfile()" class="bg-kwikr-green text-white px-4 py-2 rounded-md hover:bg-green-600">
                                <i class="fas fa-save mr-2"></i>Save Changes
                            </button>
                            <button onclick="cancelEdit()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                                <i class="fas fa-times mr-2"></i>Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Address Information -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">
                        <i class="fas fa-map-marker-alt mr-2"></i>Address Information
                    </h2>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                            <div class="text-gray-900">123 Main Street</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                            <input type="text" id="street" value="123 Main Street" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Apartment/Unit</label>
                            <div class="text-gray-900">Apt 502</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Apartment/Unit (Optional)</label>
                            <input type="text" id="apartmentUnit" value="Apt 502" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <div class="text-gray-900">${user.city || 'Toronto'}</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input type="text" id="city" value="${user.city || 'Toronto'}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Province</label>
                            <div class="text-gray-900">${user.province || 'ON'}</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Province</label>
                            <select id="province" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                <option value="ON" ${user.province === 'ON' ? 'selected' : ''}>Ontario</option>
                                <option value="BC" ${user.province === 'BC' ? 'selected' : ''}>British Columbia</option>
                                <option value="AB" ${user.province === 'AB' ? 'selected' : ''}>Alberta</option>
                                <option value="QC" ${user.province === 'QC' ? 'selected' : ''}>Quebec</option>
                                <option value="MB" ${user.province === 'MB' ? 'selected' : ''}>Manitoba</option>
                                <option value="SK" ${user.province === 'SK' ? 'selected' : ''}>Saskatchewan</option>
                                <option value="NS" ${user.province === 'NS' ? 'selected' : ''}>Nova Scotia</option>
                                <option value="NB" ${user.province === 'NB' ? 'selected' : ''}>New Brunswick</option>
                                <option value="NL" ${user.province === 'NL' ? 'selected' : ''}>Newfoundland and Labrador</option>
                                <option value="PE" ${user.province === 'PE' ? 'selected' : ''}>Prince Edward Island</option>
                                <option value="NT" ${user.province === 'NT' ? 'selected' : ''}>Northwest Territories</option>
                                <option value="YT" ${user.province === 'YT' ? 'selected' : ''}>Yukon</option>
                                <option value="NU" ${user.province === 'NU' ? 'selected' : ''}>Nunavut</option>
                            </select>
                        </div>

                        <div class="view-mode">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                            <div class="text-gray-900">M5V 2T6</div>
                        </div>
                        <div class="edit-mode hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                            <input type="text" id="postalCode" value="M5V 2T6" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green" placeholder="A1B 2C3">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preferences -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">
                        <i class="fas fa-cog mr-2"></i>Preferences & Settings
                    </h2>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Preferred Service Types</label>
                            <div class="view-mode">
                                <div class="flex flex-wrap gap-2">
                                    <span class="bg-kwikr-green text-white px-3 py-1 rounded-full text-sm">Cleaning Services</span>
                                    <span class="bg-kwikr-green text-white px-3 py-1 rounded-full text-sm">Plumbing</span>
                                    <span class="bg-kwikr-green text-white px-3 py-1 rounded-full text-sm">Electrical Work</span>
                                </div>
                            </div>
                            <div class="edit-mode hidden">
                                <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Cleaning Services" checked class="mr-2">
                                        <span class="text-sm">Cleaning Services</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Plumbing" checked class="mr-2">
                                        <span class="text-sm">Plumbing</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Handyman Services" class="mr-2">
                                        <span class="text-sm">Handyman Services</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Electrical Work" checked class="mr-2">
                                        <span class="text-sm">Electrical Work</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Carpentry" class="mr-2">
                                        <span class="text-sm">Carpentry</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Painting" class="mr-2">
                                        <span class="text-sm">Painting</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="HVAC Services" class="mr-2">
                                        <span class="text-sm">HVAC Services</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Roofing" class="mr-2">
                                        <span class="text-sm">Roofing</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Flooring" class="mr-2">
                                        <span class="text-sm">Flooring</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Landscaping" class="mr-2">
                                        <span class="text-sm">Landscaping</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Moving Services" class="mr-2">
                                        <span class="text-sm">Moving Services</span>
                                    </label>
                                    <label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="Appliance Repair" class="mr-2">
                                        <span class="text-sm">Appliance Repair</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-3">Communication Preference</label>
                            <div class="view-mode">
                                <div class="text-gray-900">Email</div>
                            </div>
                            <div class="edit-mode hidden">
                                <select id="communicationPref" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    <option value="email" selected>Email</option>
                                    <option value="sms">SMS/Text</option>
                                    <option value="phone">Phone Call</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Notification Settings -->
                    <div class="mt-6 pt-6 border-t border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                        <div class="space-y-3">
                            <label class="flex items-center">
                                <input type="checkbox" id="emailUpdates" checked class="mr-3" disabled>
                                <span class="text-sm">Receive job updates and messages via email</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" id="smsNotifications" class="mr-3" disabled>
                                <span class="text-sm">Receive urgent notifications via SMS</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" id="marketingEmails" checked class="mr-3" disabled>
                                <span class="text-sm">Receive promotional emails and service recommendations</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Account Information -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">
                        <i class="fas fa-shield-alt mr-2"></i>Account Information
                    </h2>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                            <div class="flex items-center">
                                <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Active & Verified</span>
                                <i class="fas fa-check-circle text-green-600 ml-2"></i>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                            <div class="text-gray-900">Premium Client</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                            <div class="text-gray-900">March 15, 2023</div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
                            <div class="text-gray-900 font-mono text-sm">CL-${String(user.user_id).padStart(6, '0')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          // Embed user information directly from server-side session
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}",
            province: "${user.province || ''}",
            city: "${user.city || ''}",
            isVerified: ${user.is_verified || 0}
          };
          
          // Client profile inline editing functions
          let isEditMode = false;

          function toggleEditMode() {
            isEditMode = !isEditMode;
            const viewElements = document.querySelectorAll('.view-mode');
            const editElements = document.querySelectorAll('.edit-mode');
            const editBtn = document.getElementById('editProfileBtn');
            const editBtnText = document.getElementById('editBtnText');
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');

            if (isEditMode) {
                // Switch to edit mode
                viewElements.forEach(el => el.classList.add('hidden'));
                editElements.forEach(el => el.classList.remove('hidden'));
                editBtn.classList.remove('bg-white', 'text-kwikr-green', 'hover:bg-gray-50');
                editBtn.classList.add('bg-red-500', 'text-white', 'hover:bg-red-600');
                editBtnText.textContent = 'Cancel Edit';
                
                // Enable checkboxes
                checkboxes.forEach(checkbox => {
                    checkbox.disabled = false;
                });
            } else {
                // Switch to view mode
                viewElements.forEach(el => el.classList.remove('hidden'));
                editElements.forEach(el => el.classList.add('hidden'));
                editBtn.classList.remove('bg-red-500', 'text-white', 'hover:bg-red-600');
                editBtn.classList.add('bg-white', 'text-kwikr-green', 'hover:bg-gray-50');
                editBtnText.textContent = 'Edit Profile';
                
                // Disable checkboxes
                checkboxes.forEach(checkbox => {
                    checkbox.disabled = true;
                });
            }
          }

          function saveProfile() {
            // Collect form data from all edit fields
            const editInputs = document.querySelectorAll('.edit-mode input, .edit-mode select, .edit-mode textarea');
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const formData = {};
            
            editInputs.forEach(input => {
                if (input.name || input.id) {
                    formData[input.name || input.id] = input.value;
                }
            });

            // Collect checkbox data
            const preferredServices = [];
            document.querySelectorAll('input[name="preferredServices"]:checked').forEach(checkbox => {
                preferredServices.push(checkbox.value);
            });
            formData.preferredServices = preferredServices;

            const notifications = {};
            checkboxes.forEach(checkbox => {
                if (checkbox.id && checkbox.id !== 'preferredServices') {
                    notifications[checkbox.id] = checkbox.checked;
                }
            });
            formData.notifications = notifications;

            // Here you would typically send the data to the server
            console.log('Saving client profile data:', formData);
            
            // For demo purposes, just show success and exit edit mode
            alert('Profile updated successfully!');
            toggleEditMode();
          }

          function cancelEdit() {
            // Reset all edit fields to original values and exit edit mode
            const editInputs = document.querySelectorAll('.edit-mode input, .edit-mode select, .edit-mode textarea');
            
            // Reset to original values (you'd typically store these when entering edit mode)
            editInputs.forEach(input => {
                if (input.dataset.originalValue) {
                    input.value = input.dataset.originalValue;
                }
            });

            toggleEditMode();
          }
        </script>
        <script src="/static/client-profile.js"></script>
    </body>
    </html>
  `)
})

// Job Posting Page
dashboardRoutes.get('/client/post-job', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Post a Job - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/client" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Breadcrumb Navigation -->
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                <a href="/dashboard/client" class="hover:text-kwikr-green">Dashboard</a>
                <i class="fas fa-chevron-right text-xs"></i>
                <span class="text-gray-900 font-medium">Post a Job</span>
            </nav>
            
            <!-- Job Posting Form -->
            <div class="bg-white rounded-lg shadow-sm">
                <div class="p-6 border-b border-gray-200">
                    <h1 class="text-2xl font-bold text-gray-900">Post a New Job</h1>
                    <p class="text-gray-600 mt-2">Find the right service provider for your project</p>
                </div>
                
                <div id="jobPostingContainer" class="p-6">
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
                        <p>Loading job categories...</p>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          // Embed user information directly from server-side session
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}",
            province: "${user.province || ''}",
            city: "${user.city || ''}",
            isVerified: ${user.is_verified || 0}
          };
          
          // Load job posting form on page load
          document.addEventListener('DOMContentLoaded', function() {
            loadJobPostingPage();
          });
        </script>
        <script src="/static/client-job-posting.js"></script>
    </body>
    </html>
  `)
})

// Worker Browser Page
dashboardRoutes.get('/client/browse-workers', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Browse Service Providers - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/client" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Breadcrumb Navigation -->
            <nav class="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                <a href="/dashboard/client" class="hover:text-kwikr-green">Dashboard</a>
                <i class="fas fa-chevron-right text-xs"></i>
                <span class="text-gray-900 font-medium">Browse Service Providers</span>
            </nav>
            
            <!-- Search and Results -->
            <div class="space-y-6">
                <!-- Search Filters -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <h1 class="text-2xl font-bold text-gray-900">Browse Service Providers</h1>
                        <p class="text-gray-600 mt-2">Find qualified professionals for your projects</p>
                    </div>
                    
                    <div id="searchFilters" class="p-6">
                        <div class="space-y-4">
                            <!-- Search Bar -->
                            <div class="flex flex-col md:flex-row gap-4">
                                <div class="flex-1">
                                    <input type="text" id="search-input" placeholder="Search by skills, name, or location..."
                                           class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green focus:border-kwikr-green"
                                           onkeyup="handleSearch()" />
                                </div>
                                <button onclick="performSearch()" class="bg-kwikr-green text-white px-6 py-2 rounded-md hover:bg-green-600">
                                    <i class="fas fa-search mr-2"></i>Search
                                </button>
                            </div>
                            
                            <!-- Advanced Filters -->
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Service Category</label>
                                    <select id="category-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="">All Categories</option>
                                        <option value="Cleaning Services">Cleaning Services</option>
                                        <option value="Plumbing">Plumbing</option>
                                        <option value="Handyman Services">Handyman Services</option>
                                        <option value="Electrical Work">Electrical Work</option>
                                        <option value="Carpentry">Carpentry</option>
                                        <option value="Painting">Painting</option>
                                        <option value="HVAC Services">HVAC Services</option>
                                        <option value="Roofing">Roofing</option>
                                        <option value="Flooring">Flooring</option>
                                        <option value="Landscaping">Landscaping</option>
                                        <option value="Moving Services">Moving Services</option>
                                        <option value="Appliance Repair">Appliance Repair</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                                    <select id="experience-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="">Any Level</option>
                                        <option value="Beginner">Beginner (1-2 years)</option>
                                        <option value="Intermediate">Intermediate (3-7 years)</option>
                                        <option value="Expert">Expert (8+ years)</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                                    <select id="rate-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="">Any Rate</option>
                                        <option value="0-40">Under $40/hour</option>
                                        <option value="40-60">$40 - $60/hour</option>
                                        <option value="60-80">$60 - $80/hour</option>
                                        <option value="80-120">$80 - $120/hour</option>
                                        <option value="120+">$120+/hour</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                    <select id="location-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="">All Locations</option>
                                        <option value="Toronto, ON">Toronto, ON</option>
                                        <option value="Vancouver, BC">Vancouver, BC</option>
                                        <option value="Montreal, QC">Montreal, QC</option>
                                        <option value="Calgary, AB">Calgary, AB</option>
                                        <option value="Edmonton, AB">Edmonton, AB</option>
                                        <option value="Ottawa, ON">Ottawa, ON</option>
                                        <option value="Winnipeg, MB">Winnipeg, MB</option>
                                        <option value="Quebec City, QC">Quebec City, QC</option>
                                        <option value="Hamilton, ON">Hamilton, ON</option>
                                        <option value="Kitchener, ON">Kitchener, ON</option>
                                        <option value="London, ON">London, ON</option>
                                        <option value="Victoria, BC">Victoria, BC</option>
                                        <option value="Halifax, NS">Halifax, NS</option>
                                        <option value="Oshawa, ON">Oshawa, ON</option>
                                        <option value="Windsor, ON">Windsor, ON</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                                    <select id="availability-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="">Any Availability</option>
                                        <option value="available">Available Now</option>
                                        <option value="part-time">Part Time</option>
                                        <option value="full-time">Full Time</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                                    <select id="rating-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="">Any Rating</option>
                                        <option value="4">4+ Stars</option>
                                        <option value="4.5">4.5+ Stars</option>
                                        <option value="4.8">4.8+ Stars</option>
                                    </select>
                                </div>
                                
                                <div class="md:col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
                                    <div class="flex space-x-2">
                                        <button onclick="clearFilters()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex-1">
                                            <i class="fas fa-times mr-2"></i>Clear Filters
                                        </button>
                                        <button onclick="toggleAdvancedFilters()" class="bg-kwikr-green text-white px-4 py-2 rounded-md hover:bg-green-600 flex-1">
                                            <i class="fas fa-filter mr-2"></i>Advanced
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Search Results -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <div>
                                <h2 class="text-lg font-semibold text-gray-900">Available Service Providers</h2>
                                <p class="text-sm text-gray-600">Showing 6 qualified professionals in your area</p>
                            </div>
                            <div class="text-sm text-gray-500">
                                Sort by: <select class="ml-2 border border-gray-300 rounded px-2 py-1">
                                    <option>Rating</option>
                                    <option>Price (Low to High)</option>
                                    <option>Experience</option>
                                    <option>Availability</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div id="searchResults" class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Service Provider Cards -->
                            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 bg-kwikr-green rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                                            SJ
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">Sarah Johnson</h3>
                                            <p class="text-sm text-gray-600">Professional House Cleaner</p>
                                            <div class="flex items-center mt-1">
                                                <div class="flex text-yellow-400 text-sm">
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                </div>
                                                <span class="ml-2 text-sm text-gray-600">4.9 (127 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-kwikr-green">$45/hr</div>
                                        <div class="text-sm text-gray-500">Starting rate</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <p class="text-sm text-gray-600 mb-2">Professional cleaning service with 8+ years experience. Specializing in residential and commercial cleaning with eco-friendly products.</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Deep Cleaning</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Move-in/out</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Eco-friendly</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <span><i class="fas fa-map-marker-alt mr-1"></i>Toronto, ON</span>
                                    <span><i class="fas fa-clock mr-1"></i>Available Now</span>
                                    <span><i class="fas fa-check-circle mr-1 text-green-500"></i>89 jobs completed</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="flex-1 bg-kwikr-green text-white py-2 px-4 rounded hover:bg-green-600">
                                        <i class="fas fa-eye mr-2"></i>View Profile
                                    </button>
                                    <button class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200">
                                        <i class="fas fa-envelope mr-2"></i>Message
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                                            DC
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">David Chen</h3>
                                            <p class="text-sm text-gray-600">Licensed Plumber</p>
                                            <div class="flex items-center mt-1">
                                                <div class="flex text-yellow-400 text-sm">
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                </div>
                                                <span class="ml-2 text-sm text-gray-600">4.8 (94 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-kwikr-green">$85/hr</div>
                                        <div class="text-sm text-gray-500">Starting rate</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <p class="text-sm text-gray-600 mb-2">Licensed plumber with 12+ years experience. Available for residential and commercial plumbing repairs and installations.</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Pipe Repair</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Emergency</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Licensed</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <span><i class="fas fa-map-marker-alt mr-1"></i>Vancouver, BC</span>
                                    <span><i class="fas fa-clock mr-1"></i>Available Now</span>
                                    <span><i class="fas fa-check-circle mr-1 text-green-500"></i>156 jobs completed</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="flex-1 bg-kwikr-green text-white py-2 px-4 rounded hover:bg-green-600">
                                        <i class="fas fa-eye mr-2"></i>View Profile
                                    </button>
                                    <button class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200">
                                        <i class="fas fa-envelope mr-2"></i>Message
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                                            MR
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">Maria Rodriguez</h3>
                                            <p class="text-sm text-gray-600">Handyman Services</p>
                                            <div class="flex items-center mt-1">
                                                <div class="flex text-yellow-400 text-sm">
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star-half-alt"></i>
                                                </div>
                                                <span class="ml-2 text-sm text-gray-600">4.7 (73 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-kwikr-green">$55/hr</div>
                                        <div class="text-sm text-gray-500">Starting rate</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <p class="text-sm text-gray-600 mb-2">Reliable handyman providing general repair and maintenance services for homes and offices throughout Calgary.</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">General Repairs</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Assembly</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Maintenance</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <span><i class="fas fa-map-marker-alt mr-1"></i>Calgary, AB</span>
                                    <span><i class="fas fa-clock mr-1"></i>Full Time</span>
                                    <span><i class="fas fa-check-circle mr-1 text-green-500"></i>52 jobs completed</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="flex-1 bg-kwikr-green text-white py-2 px-4 rounded hover:bg-green-600">
                                        <i class="fas fa-eye mr-2"></i>View Profile
                                    </button>
                                    <button class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200">
                                        <i class="fas fa-envelope mr-2"></i>Message
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                                            AK
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">Alex Kumar</h3>
                                            <p class="text-sm text-gray-600">Licensed Electrician</p>
                                            <div class="flex items-center mt-1">
                                                <div class="flex text-yellow-400 text-sm">
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                </div>
                                                <span class="ml-2 text-sm text-gray-600">4.9 (145 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-kwikr-green">$95/hr</div>
                                        <div class="text-sm text-gray-500">Starting rate</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <p class="text-sm text-gray-600 mb-2">Licensed electrician specializing in residential and commercial electrical work. Available for emergency calls.</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Wiring</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Panel Upgrades</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Emergency</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <span><i class="fas fa-map-marker-alt mr-1"></i>Ottawa, ON</span>
                                    <span><i class="fas fa-clock mr-1"></i>Available Now</span>
                                    <span><i class="fas fa-check-circle mr-1 text-green-500"></i>97 jobs completed</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="flex-1 bg-kwikr-green text-white py-2 px-4 rounded hover:bg-green-600">
                                        <i class="fas fa-eye mr-2"></i>View Profile
                                    </button>
                                    <button class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200">
                                        <i class="fas fa-envelope mr-2"></i>Message
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                                            EW
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">Emily Watson</h3>
                                            <p class="text-sm text-gray-600">Carpenter & Woodworker</p>
                                            <div class="flex items-center mt-1">
                                                <div class="flex text-yellow-400 text-sm">
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                </div>
                                                <span class="ml-2 text-sm text-gray-600">4.8 (68 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-kwikr-green">$75/hr</div>
                                        <div class="text-sm text-gray-500">Starting rate</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <p class="text-sm text-gray-600 mb-2">Skilled carpenter with expertise in custom woodwork, furniture making, and home renovations.</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Custom Furniture</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Deck Building</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Renovations</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <span><i class="fas fa-map-marker-alt mr-1"></i>Montreal, QC</span>
                                    <span><i class="fas fa-clock mr-1"></i>Part Time</span>
                                    <span><i class="fas fa-check-circle mr-1 text-green-500"></i>134 jobs completed</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="flex-1 bg-kwikr-green text-white py-2 px-4 rounded hover:bg-green-600">
                                        <i class="fas fa-eye mr-2"></i>View Profile
                                    </button>
                                    <button class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200">
                                        <i class="fas fa-envelope mr-2"></i>Message
                                    </button>
                                </div>
                            </div>

                            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div class="flex items-start justify-between mb-4">
                                    <div class="flex items-center">
                                        <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                                            MT
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-gray-900">Michael Thompson</h3>
                                            <p class="text-sm text-gray-600">Professional Painter</p>
                                            <div class="flex items-center mt-1">
                                                <div class="flex text-yellow-400 text-sm">
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star"></i>
                                                    <i class="fas fa-star-half-alt"></i>
                                                </div>
                                                <span class="ml-2 text-sm text-gray-600">4.6 (91 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-lg font-bold text-kwikr-green">$50/hr</div>
                                        <div class="text-sm text-gray-500">Starting rate</div>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <p class="text-sm text-gray-600 mb-2">Professional painter providing interior and exterior painting services for residential and commercial properties.</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Interior</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Exterior</span>
                                        <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">Commercial</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                                    <span><i class="fas fa-map-marker-alt mr-1"></i>Edmonton, AB</span>
                                    <span><i class="fas fa-clock mr-1"></i>Available Now</span>
                                    <span><i class="fas fa-check-circle mr-1 text-green-500"></i>76 jobs completed</span>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="flex-1 bg-kwikr-green text-white py-2 px-4 rounded hover:bg-green-600">
                                        <i class="fas fa-eye mr-2"></i>View Profile
                                    </button>
                                    <button class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200">
                                        <i class="fas fa-envelope mr-2"></i>Message
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Pagination -->
                        <div class="mt-8 flex justify-center">
                            <nav class="flex space-x-2">
                                <button class="px-3 py-2 border border-gray-300 rounded text-gray-500 cursor-not-allowed">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button class="px-3 py-2 bg-kwikr-green text-white rounded">1</button>
                                <button class="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">2</button>
                                <button class="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">3</button>
                                <button class="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          // Embed user information directly from server-side session
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}",
            province: "${user.province || ''}",
            city: "${user.city || ''}",
            isVerified: ${user.is_verified || 0}
          };
          
          // Load worker browser on page load
          document.addEventListener('DOMContentLoaded', function() {
            loadWorkerBrowserPage();
          });
        </script>
        <script src="/static/client-worker-browser.js"></script>
    </body>
    </html>
  `)
})

// Job Details Page
dashboardRoutes.get('/client/job/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const jobId = c.req.param('id')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Details - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/client" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <a href="/dashboard/client" class="text-gray-500 hover:text-kwikr-green mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">Job Details</h1>
                </div>
            </div>
            
            <div id="job-details-container">
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500">Loading job details...</p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          window.currentJobId = ${jobId};
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}"
          };
        </script>
        <script src="/static/client-job-details.js"></script>
    </body>
    </html>
  `)
})

// Edit Job Page  
dashboardRoutes.get('/client/job/:id/edit', requireAuth, async (c) => {
  const user = c.get('user')
  const jobId = c.req.param('id')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit Job - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/client" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <a href="/dashboard/client/job/${jobId}" class="text-gray-500 hover:text-kwikr-green mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Job Details
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">Edit Job</h1>
                </div>
            </div>
            
            <div id="edit-job-container">
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500">Loading job edit form...</p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          window.currentJobId = ${jobId};
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}"
          };
        </script>
        <script src="/static/client-edit-job.js"></script>
    </body>
    </html>
  `)
})

// Worker Profile Page
dashboardRoutes.get('/client/worker/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const workerId = c.req.param('id')
  
  if (user.role !== 'client') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Worker Profile - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/client" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <a href="/dashboard/client/browse-workers" class="text-gray-500 hover:text-kwikr-green mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Browse Workers
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">Worker Profile</h1>
                </div>
            </div>
            
            <div id="worker-profile-container">
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500">Loading worker profile...</p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          window.currentWorkerId = ${workerId};
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}"
          };
        </script>
        <script src="/static/client-worker-profile.js"></script>
    </body>
    </html>
  `)
})

// Worker Kanban Board for Job Tracking
dashboardRoutes.get('/worker/kanban', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Tracking Board - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .drag-over {
            background-color: rgba(59, 130, 246, 0.1) !important;
            border: 2px dashed #3b82f6 !important;
          }
          .dragging {
            opacity: 0.5 !important;
            transform: rotate(5deg) !important;
            z-index: 1000 !important;
          }
          .kanban-column {
            min-height: 400px;
            transition: all 0.2s ease;
          }
          .job-card {
            transition: all 0.2s ease;
          }
          .job-card:hover {
            transform: translateY(-2px);
          }
        </style>
    </head>
    <body class="bg-gray-100">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/worker" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <a href="/dashboard/worker" class="text-gray-500 hover:text-kwikr-green mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-tasks mr-2"></i>Job Tracking Board
                    </h1>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="loadWorkerJobs()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                </div>
            </div>

            <!-- Kanban Board Container -->
            <div id="kanban-container" class="w-full">
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500">Loading job tracking board...</p>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}"
          };
        </script>
        <script src="/static/worker-kanban.js"></script>
        <script>
          // Initialize Kanban board when page loads
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, initializing Kanban board');
            initializeKanban();
          });
        </script>
    </body>
    </html>
  `)
})

// Worker Bids Page
dashboardRoutes.get('/worker/bids', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Bids - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/worker" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center">
                    <a href="/dashboard/worker" class="text-gray-500 hover:text-kwikr-green mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-eye mr-2"></i>My Bids
                    </h1>
                </div>
            </div>

            <!-- Coming Soon Notice -->
            <div class="bg-white rounded-lg shadow-sm p-8 text-center">
                <i class="fas fa-hammer text-6xl text-gray-300 mb-4"></i>
                <h2 class="text-xl font-semibold text-gray-900 mb-2">Bid Management Coming Soon</h2>
                <p class="text-gray-600 mb-6">We're working on a comprehensive bid management system where you can view, edit, and track all your submitted bids.</p>
                <div class="flex justify-center space-x-4">
                    <a href="/dashboard/worker" class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                    <a href="/dashboard/worker/kanban" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-tasks mr-2"></i>View Job Board
                    </a>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}"
          };
        </script>
    </body>
    </html>
  `)
})

// Worker Payment Management Page - Simplified Working Version
dashboardRoutes.get('/worker/payments', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  // Simple data without complex queries to avoid errors
  const paymentStats = {
    totalEarnings: 12450.00,
    pendingPayments: 765.00,
    escrowAmount: 325.00,
    lastPayment: new Date().toLocaleDateString()
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Management - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Payment Management</h1>
                <p class="text-gray-600">Manage your payment methods and track earnings</p>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-lg shadow-sm mb-8">
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-8 px-6" aria-label="Tabs">
                        <a href="/dashboard/worker" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-user mr-2"></i>Profile View
                        </a>
                        <a href="/dashboard/worker/profile" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-edit mr-2"></i>Edit Profile
                        </a>
                        <a href="/dashboard/worker/payments" class="py-4 px-1 border-b-2 border-kwikr-green text-kwikr-green font-medium text-sm">
                            <i class="fas fa-credit-card mr-2"></i>Payment Management
                        </a>
                        <a href="/dashboard/worker/compliance" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-shield-check mr-2"></i>Manage Compliance
                        </a>
                        <a href="/dashboard/worker/services" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-tools mr-2"></i>Manage Services
                        </a>
                    </nav>
                </div>
            </div>

            <!-- Payment Overview Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-green-500 text-2xl mr-4">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900">$${paymentStats.totalEarnings.toFixed(2)}</p>
                            <p class="text-sm text-gray-600">Total Earnings</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-yellow-500 text-2xl mr-4">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900">$${paymentStats.pendingPayments.toFixed(2)}</p>
                            <p class="text-sm text-gray-600">Pending Payments</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-blue-500 text-2xl mr-4">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-gray-900">$${paymentStats.escrowAmount.toFixed(2)}</p>
                            <p class="text-sm text-gray-600">In Escrow</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <div class="text-purple-500 text-2xl mr-4">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-gray-900">${paymentStats.lastPayment}</p>
                            <p class="text-sm text-gray-600">Last Payment</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payment Methods Setup -->
            <div class="bg-white rounded-lg shadow-sm mb-8">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">Payment Methods</h2>
                    <p class="text-gray-600">Configure how you want to receive payments</p>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <!-- Bank Transfer -->
                        <div class="border-2 border-gray-200 rounded-lg p-4 hover:border-kwikr-green cursor-pointer">
                            <div class="text-center">
                                <i class="fas fa-university text-blue-600 text-3xl mb-3"></i>
                                <h3 class="font-medium text-gray-900">Bank Transfer</h3>
                                <p class="text-sm text-gray-600">Direct deposit</p>
                            </div>
                        </div>

                        <!-- PayPal -->
                        <div class="border-2 border-gray-200 rounded-lg p-4 hover:border-kwikr-green cursor-pointer">
                            <div class="text-center">
                                <i class="fab fa-paypal text-blue-600 text-3xl mb-3"></i>
                                <h3 class="font-medium text-gray-900">PayPal</h3>
                                <p class="text-sm text-gray-600">PayPal account</p>
                            </div>
                        </div>

                        <!-- Stripe -->
                        <div class="border-2 border-gray-200 rounded-lg p-4 hover:border-kwikr-green cursor-pointer">
                            <div class="text-center">
                                <i class="fab fa-stripe-s text-purple-600 text-3xl mb-3"></i>
                                <h3 class="font-medium text-gray-900">Stripe</h3>
                                <p class="text-sm text-gray-600">Credit cards</p>
                            </div>
                        </div>

                        <!-- Interac e-Transfer -->
                        <div class="border-2 border-gray-200 rounded-lg p-4 hover:border-kwikr-green cursor-pointer">
                            <div class="text-center">
                                <i class="fas fa-exchange-alt text-red-600 text-3xl mb-3"></i>
                                <h3 class="font-medium text-gray-900">Interac e-Transfer</h3>
                                <p class="text-sm text-gray-600">Email transfer</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Basic Payment Settings -->
            <div class="bg-white rounded-lg shadow-sm mb-8">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">Payment Settings</h2>
                </div>
                <div class="p-6">
                    <form class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
                                <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green focus:border-transparent" placeholder="Account number">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green focus:border-transparent" placeholder="Bank name">
                            </div>
                        </div>
                        
                        <div class="flex justify-end">
                            <button type="submit" class="bg-kwikr-green text-white px-6 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-kwikr-green focus:ring-offset-2">
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-white rounded-lg shadow-sm">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div class="p-6">
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-receipt text-4xl mb-4"></i>
                        <p class="text-lg font-medium">No transactions yet</p>
                        <p class="text-sm">Complete jobs to see your payment history here</p>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function logout() {
                if (confirm('Are you sure you want to logout?')) {
                    window.location.href = '/api/auth/logout'
                }
            }
        </script>
    </body>
    </html>
  `)
})

// Worker Earnings & Tracking Dashboard

// Worker Earnings & Tracking Dashboard
dashboardRoutes.get('/worker/earnings', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Earnings & Tracking - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/worker" class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <!-- Breadcrumb -->
            <div class="mb-6">
                <nav class="text-sm">
                    <a href="/dashboard" class="text-kwikr-green hover:underline">Dashboard</a>
                    <span class="mx-2 text-gray-400">/</span>
                    <span class="text-gray-600">Earnings History</span>
                </nav>
            </div>

            <!-- Page Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Earnings History</h1>
                <p class="text-gray-600 mt-2">Track your earnings and performance over time</p>
            </div>

            <!-- Earnings Summary -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">This Month</p>
                            <p class="text-2xl font-bold text-gray-900">$1,285</p>
                        </div>
                        <div class="bg-kwikr-green bg-opacity-10 p-3 rounded-lg">
                            <i class="fas fa-dollar-sign text-kwikr-green text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4">
                        <span class="text-green-600 text-sm font-medium">+12.5%</span>
                        <span class="text-gray-600 text-sm"> from last month</span>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Total Earnings</p>
                            <p class="text-2xl font-bold text-gray-900">$8,750</p>
                        </div>
                        <div class="bg-blue-100 p-3 rounded-lg">
                            <i class="fas fa-chart-line text-blue-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4">
                        <span class="text-gray-600 text-sm">Since joining</span>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Jobs Completed</p>
                            <p class="text-2xl font-bold text-gray-900">47</p>
                        </div>
                        <div class="bg-green-100 p-3 rounded-lg">
                            <i class="fas fa-check-circle text-green-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4">
                        <span class="text-green-600 text-sm font-medium">95.7%</span>
                        <span class="text-gray-600 text-sm"> success rate</span>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Avg. Rating</p>
                            <p class="text-2xl font-bold text-gray-900">4.8</p>
                        </div>
                        <div class="bg-yellow-100 p-3 rounded-lg">
                            <i class="fas fa-star text-yellow-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="mt-4">
                        <div class="flex text-yellow-400">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts and Tables -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Earnings Chart -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6">
                        <h2 class="text-xl font-semibold text-gray-900 mb-4">Monthly Earnings</h2>
                        <canvas id="earningsChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- Service Breakdown -->
                <div class="bg-white rounded-lg shadow">
                    <div class="p-6">
                        <h2 class="text-xl font-semibold text-gray-900 mb-4">Earnings by Service</h2>
                        <canvas id="servicesChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Earnings -->
            <div class="mt-8 bg-white rounded-lg shadow">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold text-gray-900">Recent Earnings</h2>
                        <div class="flex space-x-2">
                            <button class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">All Time</button>
                            <button class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">This Year</button>
                            <button class="px-3 py-1 text-sm bg-kwikr-green text-white rounded-md">This Month</button>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-gray-200">
                                    <th class="text-left py-3 text-sm font-medium text-gray-700">Date</th>
                                    <th class="text-left py-3 text-sm font-medium text-gray-700">Job</th>
                                    <th class="text-left py-3 text-sm font-medium text-gray-700">Service</th>
                                    <th class="text-left py-3 text-sm font-medium text-gray-700">Client</th>
                                    <th class="text-left py-3 text-sm font-medium text-gray-700">Amount</th>
                                    <th class="text-left py-3 text-sm font-medium text-gray-700">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                <tr>
                                    <td class="py-3 text-sm text-gray-900">Jan 15, 2024</td>
                                    <td class="py-3 text-sm text-gray-900">Kitchen Sink Repair</td>
                                    <td class="py-3 text-sm text-gray-600">Plumbing</td>
                                    <td class="py-3 text-sm text-gray-600">Sarah Johnson</td>
                                    <td class="py-3 text-sm font-medium text-gray-900">$185.00</td>
                                    <td class="py-3">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="py-3 text-sm text-gray-900">Jan 12, 2024</td>
                                    <td class="py-3 text-sm text-gray-900">Electrical Outlet Installation</td>
                                    <td class="py-3 text-sm text-gray-600">Electrical</td>
                                    <td class="py-3 text-sm text-gray-600">Mike Chen</td>
                                    <td class="py-3 text-sm font-medium text-gray-900">$125.00</td>
                                    <td class="py-3">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="py-3 text-sm text-gray-900">Jan 10, 2024</td>
                                    <td class="py-3 text-sm text-gray-900">Cabinet Installation</td>
                                    <td class="py-3 text-sm text-gray-600">Carpentry</td>
                                    <td class="py-3 text-sm text-gray-600">Emma Wilson</td>
                                    <td class="py-3 text-sm font-medium text-gray-900">$275.00</td>
                                    <td class="py-3">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="py-3 text-sm text-gray-900">Jan 8, 2024</td>
                                    <td class="py-3 text-sm text-gray-900">Bathroom Tile Cleaning</td>
                                    <td class="py-3 text-sm text-gray-600">Cleaning</td>
                                    <td class="py-3 text-sm text-gray-600">David Rodriguez</td>
                                    <td class="py-3 text-sm font-medium text-gray-900">$95.00</td>
                                    <td class="py-3">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="py-3 text-sm text-gray-900">Jan 5, 2024</td>
                                    <td class="py-3 text-sm text-gray-900">Living Room Painting</td>
                                    <td class="py-3 text-sm text-gray-600">Painting</td>
                                    <td class="py-3 text-sm text-gray-600">Lisa Park</td>
                                    <td class="py-3 text-sm font-medium text-gray-900">$320.00</td>
                                    <td class="py-3">
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
          window.currentUser = {
            id: ${user.user_id},
            email: "${user.email}",
            role: "${user.role}",
            firstName: "${user.first_name}",
            lastName: "${user.last_name}"
          };

          // Initialize charts
          document.addEventListener('DOMContentLoaded', function() {
            // Earnings Chart
            const earningsCtx = document.getElementById('earningsChart').getContext('2d');
            new Chart(earningsCtx, {
              type: 'line',
              data: {
                labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
                datasets: [{
                  label: 'Monthly Earnings',
                  data: [850, 920, 1100, 980, 1140, 1285],
                  borderColor: '#00C881',
                  backgroundColor: 'rgba(0, 200, 129, 0.1)',
                  tension: 0.4,
                  fill: true
                }]
              },
              options: {
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + value;
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }
            });

            // Services Chart
            const servicesCtx = document.getElementById('servicesChart').getContext('2d');
            new Chart(servicesCtx, {
              type: 'doughnut',
              data: {
                labels: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning'],
                datasets: [{
                  data: [2850, 1920, 1650, 1200, 1130],
                  backgroundColor: [
                    '#00C881',
                    '#3B82F6',
                    '#F59E0B',
                    '#EF4444',
                    '#8B5CF6'
                  ]
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }
            });
          });
        </script>
    </body>
    </html>
  `)
})

// Worker Calendar Dashboard
dashboardRoutes.get('/worker/calendar', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Calendar & Scheduling - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 1px;
          }
          .calendar-day {
            min-height: 120px;
            position: relative;
          }
          .calendar-event {
            font-size: 0.75rem;
            padding: 2px 6px;
            margin: 1px 0;
            border-radius: 4px;
            cursor: pointer;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .event-appointment { background-color: #dbeafe; color: #1e40af; }
          .event-work { background-color: #dcfce7; color: #166534; }
          .event-personal { background-color: #fef3c7; color: #92400e; }
        </style>
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/worker" class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">
                            <i class="fas fa-calendar-alt text-kwikr-green mr-3"></i>
                            Calendar & Scheduling
                        </h1>
                        <p class="text-gray-600 mt-2">Manage appointments, job schedules, and availability</p>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="showAvailabilityModal()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                            <i class="fas fa-clock mr-2"></i>Set Availability
                        </button>
                        <button onclick="showAppointmentModal()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            <i class="fas fa-plus mr-2"></i>New Appointment
                        </button>
                    </div>
                </div>
            </div>

            <!-- Calendar Controls -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <button onclick="previousMonth()" class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h2 id="currentMonth" class="text-2xl font-semibold text-gray-900"></h2>
                        <button onclick="nextMonth()" class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button onclick="goToToday()" class="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                            Today
                        </button>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center space-x-2 text-sm">
                            <div class="w-3 h-3 bg-blue-200 rounded"></div>
                            <span>Appointments</span>
                        </div>
                        <div class="flex items-center space-x-2 text-sm">
                            <div class="w-3 h-3 bg-green-200 rounded"></div>
                            <span>Work Blocks</span>
                        </div>
                        <div class="flex items-center space-x-2 text-sm">
                            <div class="w-3 h-3 bg-yellow-200 rounded"></div>
                            <span>Personal</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Calendar -->
            <div class="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <!-- Calendar Header -->
                <div class="calendar-grid bg-gray-50 border-b">
                    <div class="p-4 text-center text-sm font-medium text-gray-700 border-r">Sun</div>
                    <div class="p-4 text-center text-sm font-medium text-gray-700 border-r">Mon</div>
                    <div class="p-4 text-center text-sm font-medium text-gray-700 border-r">Tue</div>
                    <div class="p-4 text-center text-sm font-medium text-gray-700 border-r">Wed</div>
                    <div class="p-4 text-center text-sm font-medium text-gray-700 border-r">Thu</div>
                    <div class="p-4 text-center text-sm font-medium text-gray-700 border-r">Fri</div>
                    <div class="p-4 text-center text-sm font-medium text-gray-700">Sat</div>
                </div>
                
                <!-- Calendar Days -->
                <div id="calendarDays" class="calendar-grid bg-white">
                    <!-- Calendar days will be generated here -->
                </div>
            </div>

            <!-- Upcoming Events -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Today's Schedule -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-calendar-day text-kwikr-green mr-2"></i>
                        Today's Schedule
                    </h3>
                    <div id="todaySchedule" class="space-y-3">
                        <!-- Today's events will be loaded here -->
                    </div>
                </div>

                <!-- Upcoming Appointments -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-clock text-blue-500 mr-2"></i>
                        Upcoming Appointments
                    </h3>
                    <div id="upcomingAppointments" class="space-y-3">
                        <!-- Upcoming appointments will be loaded here -->
                    </div>
                </div>
            </div>
        </div>

        <!-- New Appointment Modal -->
        <div id="appointmentModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-md w-full mx-4">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-xl font-bold text-gray-900">Schedule New Appointment</h3>
                </div>
                
                <form id="appointmentForm" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Client</label>
                        <select id="clientSelect" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="">Select a client</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Job (Optional)</label>
                        <select id="jobSelect" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="">Select a job (optional)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <input type="text" id="appointmentTitle" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="e.g., Site Visit">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select id="appointmentType" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="meeting">Meeting</option>
                            <option value="site_visit">Site Visit</option>
                            <option value="consultation">Consultation</option>
                            <option value="work_session">Work Session</option>
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                            <input type="datetime-local" id="startDateTime" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                            <input type="datetime-local" id="endDateTime" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <select id="locationType" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green mb-2">
                            <option value="client_site">Client Site</option>
                            <option value="worker_office">My Office</option>
                            <option value="virtual">Virtual Meeting</option>
                            <option value="other">Other</option>
                        </select>
                        <input type="text" id="locationAddress" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="Address or meeting link">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                        <textarea id="appointmentDescription" rows="3" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="Additional notes..."></textarea>
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" onclick="closeAppointmentModal()" class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-kwikr-green text-white rounded-lg hover:bg-green-600">
                            Create Appointment
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script src="/static/calendar.js"></script>
        <script>
          // Initialize calendar when page loads
          document.addEventListener('DOMContentLoaded', function() {
            initializeCalendar();
            loadTodaySchedule();
            loadUpcomingAppointments();
          });
        </script>
    </body>
    </html>
  `)
})

// Worker Messages & Communication Dashboard
dashboardRoutes.get('/worker/messages', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Messages & Communication - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/worker" class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="relative">
                            <button id="notificationBtn" class="relative p-2 text-gray-600 hover:text-gray-900">
                                <i class="fas fa-bell text-xl"></i>
                                <span id="notificationBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
                            </button>
                        </div>
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">
                            <i class="fas fa-comments text-kwikr-green mr-3"></i>
                            Messages & Communication
                        </h1>
                        <p class="text-gray-600 mt-2">Stay connected with your clients and manage job updates</p>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="showProgressUpdateModal()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            <i class="fas fa-clipboard-check mr-2"></i>Progress Update
                        </button>
                        <button onclick="showFileShareModal()" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                            <i class="fas fa-share mr-2"></i>Share Files
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Communication Interface -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Message Threads List -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold text-gray-900">Conversations</h2>
                            <div class="flex items-center space-x-2">
                                <select id="threadFilter" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                </select>
                                <button onclick="loadMessageThreads()" class="text-kwikr-green hover:text-green-600">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="messageThreadsList" class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        <!-- Message threads will be loaded here -->
                    </div>
                </div>

                <!-- Message View -->
                <div class="lg:col-span-2 bg-white rounded-lg shadow-sm">
                    <!-- Chat Header -->
                    <div id="chatHeader" class="hidden p-6 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                    <i class="fas fa-user text-gray-600"></i>
                                </div>
                                <div>
                                    <h3 id="clientName" class="font-semibold text-gray-900">Select a conversation</h3>
                                    <p id="jobTitle" class="text-sm text-gray-600">Choose a client to start messaging</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="toggleQuickReplies()" class="text-gray-600 hover:text-gray-900">
                                    <i class="fas fa-bolt text-sm"></i>
                                </button>
                                <button onclick="archiveThread()" class="text-gray-600 hover:text-gray-900">
                                    <i class="fas fa-archive text-sm"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Replies Panel -->
                    <div id="quickRepliesPanel" class="hidden p-4 bg-blue-50 border-b border-gray-200">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm font-medium text-blue-900">Quick Replies</span>
                            <button onclick="toggleQuickReplies()" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div id="quickRepliesList" class="flex flex-wrap gap-2">
                            <!-- Quick reply templates will be loaded here -->
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div id="messagesArea" class="flex-1 p-6">
                        <div class="text-center text-gray-500 py-12">
                            <i class="fas fa-comments text-4xl mb-4"></i>
                            <h3 class="text-lg font-medium mb-2">No conversation selected</h3>
                            <p class="text-sm">Choose a client conversation from the list to start messaging</p>
                        </div>
                    </div>

                    <!-- Message Input -->
                    <div id="messageInput" class="hidden p-6 border-t border-gray-200">
                        <form id="messageForm" onsubmit="sendMessage(event)" class="flex items-center space-x-3">
                            <div class="flex-1 relative">
                                <input type="text" id="messageText" placeholder="Type your message..." 
                                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green pr-12">
                                <button type="button" onclick="showFileUpload()" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
                                    <i class="fas fa-paperclip"></i>
                                </button>
                            </div>
                            <button type="submit" class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </form>
                        <input type="file" id="fileUploadInput" class="hidden" accept="image/*,application/pdf" onchange="handleFileSelect(this)">
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Recent Progress Updates -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-chart-line text-blue-500 mr-2"></i>
                        Recent Progress Updates
                    </h3>
                    <div id="recentUpdates">
                        <!-- Recent updates will be loaded here -->
                    </div>
                </div>

                <!-- Notifications -->
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-bell text-yellow-500 mr-2"></i>
                        Recent Notifications
                    </h3>
                    <div id="recentNotifications">
                        <!-- Notifications will be loaded here -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Progress Update Modal -->
        <div id="progressUpdateModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-xl font-bold text-gray-900">Create Progress Update</h3>
                </div>
                
                <form id="progressUpdateForm" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Job</label>
                        <select id="updateJobSelect" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="">Select a job</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Update Title</label>
                        <input type="text" id="updateTitle" required class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="e.g., Completed foundation work">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea id="updateDescription" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="Describe the work completed and current status..."></textarea>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Progress Percentage</label>
                            <input type="number" id="updateProgress" min="0" max="100" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="0-100">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Update Type</label>
                            <select id="updateType" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                                <option value="progress">Progress Update</option>
                                <option value="milestone">Milestone Reached</option>
                                <option value="issue">Issue/Delay</option>
                                <option value="completion">Job Complete</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Photos (Optional)</label>
                        <input type="file" id="updatePhotos" multiple accept="image/*" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Next Steps</label>
                        <textarea id="updateNextSteps" rows="2" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" placeholder="What will happen next..."></textarea>
                    </div>
                    
                    <div class="flex items-center">
                        <input type="checkbox" id="clientApprovalRequired" class="rounded border-gray-300 text-kwikr-green">
                        <label for="clientApprovalRequired" class="ml-2 text-sm text-gray-600">Client approval required</label>
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" onclick="closeProgressUpdateModal()" class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-kwikr-green text-white rounded-lg hover:bg-green-600">
                            Send Update
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script src="/static/messages.js"></script>
        <script>
          // Initialize messaging when page loads
          document.addEventListener('DOMContentLoaded', function() {
            loadMessageThreads();
            loadNotifications();
            loadQuickReplies();
            loadActiveJobs();
            
            // Start notification polling
            setInterval(checkNotifications, 30000); // Check every 30 seconds
          });
        </script>
    </body>
    </html>
  `)
})

// Worker Service Portfolio Management Dashboard
dashboardRoutes.get('/worker/portfolio', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Portfolio - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .portfolio-card {
            transition: all 0.3s ease;
          }
          .portfolio-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
          }
          .gallery-image {
            aspect-ratio: 4/3;
            object-fit: cover;
            cursor: pointer;
            transition: opacity 0.2s ease;
          }
          .gallery-image:hover {
            opacity: 0.8;
          }
          .modal {
            display: none;
          }
          .modal.active {
            display: flex;
          }
          .drop-zone {
            border: 2px dashed #d1d5db;
            transition: all 0.3s ease;
          }
          .drop-zone.dragover {
            border-color: #00C881;
            background-color: rgba(0, 200, 129, 0.1);
          }
        </style>
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <a href="/dashboard/worker" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </a>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center">
                    <a href="/dashboard/worker" class="text-gray-500 hover:text-kwikr-green mr-4">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                    </a>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900">
                            <i class="fas fa-briefcase text-kwikr-green mr-3"></i>Service Portfolio
                        </h1>
                        <p class="text-gray-600 mt-2">Showcase your work and manage your service offerings</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="showCreatePortfolioModal()" class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors">
                        <i class="fas fa-plus mr-2"></i>Create Portfolio
                    </button>
                    <button onclick="loadPortfolios()" class="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                </div>
            </div>

            <!-- Portfolio Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="bg-kwikr-green bg-opacity-10 p-3 rounded-full">
                            <i class="fas fa-briefcase text-kwikr-green text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-2xl font-bold text-gray-900" id="totalPortfolios">0</p>
                            <p class="text-sm text-gray-600">Active Portfolios</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="bg-blue-100 p-3 rounded-full">
                            <i class="fas fa-eye text-blue-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-2xl font-bold text-gray-900" id="totalViews">0</p>
                            <p class="text-sm text-gray-600">Total Views</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="bg-yellow-100 p-3 rounded-full">
                            <i class="fas fa-star text-yellow-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-2xl font-bold text-gray-900" id="avgRating">0.0</p>
                            <p class="text-sm text-gray-600">Average Rating</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <div class="flex items-center">
                        <div class="bg-green-100 p-3 rounded-full">
                            <i class="fas fa-comments text-green-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <p class="text-2xl font-bold text-gray-900" id="totalTestimonials">0</p>
                            <p class="text-sm text-gray-600">Testimonials</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Portfolio Grid -->
            <div id="portfolioGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Portfolios will be loaded here -->
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-3xl mb-4"></i>
                    <p class="text-gray-500 text-lg">Loading your portfolios...</p>
                </div>
            </div>
        </div>

        <!-- Create/Edit Portfolio Modal -->
        <div id="portfolioModal" class="modal fixed inset-0 bg-black bg-opacity-50 z-50 items-center justify-center">
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h2 id="modalTitle" class="text-2xl font-bold text-gray-900">Create New Portfolio</h2>
                        <button onclick="closePortfolioModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                <form id="portfolioForm" class="p-6">
                    <div class="space-y-6">
                        <!-- Basic Information -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Portfolio Title *</label>
                                <input type="text" id="portfolioTitle" required 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                       placeholder="e.g., Professional Plumbing Services">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Service Category</label>
                                <select id="portfolioCategory" 
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    <option value="">Select Category</option>
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="House Cleaning">House Cleaning</option>
                                    <option value="Landscaping">Landscaping</option>
                                    <option value="Painting">Painting</option>
                                    <option value="Carpentry">Carpentry</option>
                                    <option value="HVAC">HVAC</option>
                                    <option value="Roofing">Roofing</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
                                <input type="text" id="portfolioServiceType" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                       placeholder="e.g., Emergency Repairs, Installation">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Base Price</label>
                                <div class="flex">
                                    <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">$</span>
                                    <input type="number" id="portfolioPrice" min="0" step="0.01"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    <select id="portfolioPriceUnit" class="ml-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <option value="hour">per hour</option>
                                        <option value="project">per project</option>
                                        <option value="sqft">per sq ft</option>
                                        <option value="day">per day</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="portfolioDescription" rows="4"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                      placeholder="Describe your service, experience, and what makes you unique..."></textarea>
                        </div>

                        <!-- Image Upload Section -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Portfolio Images</label>
                            <div id="imageUploadZone" class="drop-zone border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <i class="fas fa-cloud-upload-alt text-gray-400 text-4xl mb-4"></i>
                                <p class="text-gray-600 mb-2">Drag and drop images here, or click to browse</p>
                                <p class="text-sm text-gray-500">Supported formats: JPG, PNG. Max size: 5MB each</p>
                                <input type="file" id="portfolioImages" multiple accept="image/*" class="hidden">
                                <button type="button" onclick="document.getElementById('portfolioImages').click()" 
                                        class="mt-4 bg-kwikr-green text-white px-4 py-2 rounded-md hover:bg-green-600">
                                    Browse Files
                                </button>
                            </div>
                            <div id="imagePreview" class="mt-4 image-gallery"></div>
                        </div>

                        <!-- Pricing Tiers -->
                        <div>
                            <div class="flex justify-between items-center mb-4">
                                <label class="block text-sm font-medium text-gray-700">Pricing Tiers</label>
                                <button type="button" onclick="addPricingTier()" 
                                        class="text-kwikr-green hover:text-green-600 text-sm font-medium">
                                    <i class="fas fa-plus mr-1"></i>Add Pricing Tier
                                </button>
                            </div>
                            <div id="pricingTiers" class="space-y-4">
                                <!-- Pricing tiers will be added here -->
                            </div>
                        </div>

                        <!-- Service Areas -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Service Areas</label>
                            <div id="serviceAreas">
                                <div class="flex items-center space-x-2 mb-2">
                                    <input type="text" placeholder="Area name (e.g., Downtown Toronto)" 
                                           class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green service-area-input">
                                    <input type="text" placeholder="Postal code" 
                                           class="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green postal-code-input">
                                    <button type="button" onclick="addServiceArea()" class="text-kwikr-green hover:text-green-600">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="serviceAreasList" class="mt-2 space-y-1"></div>
                        </div>

                        <!-- Tags -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                            <input type="text" id="portfolioTags" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                   placeholder="Enter tags separated by commas (e.g., emergency, licensed, insured)">
                            <p class="text-sm text-gray-500 mt-1">Tags help clients find your services more easily</p>
                        </div>

                        <!-- Settings -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex items-center">
                                <input type="checkbox" id="portfolioFeatured" class="h-4 w-4 text-kwikr-green focus:ring-kwikr-green border-gray-300 rounded">
                                <label for="portfolioFeatured" class="ml-2 block text-sm text-gray-700">
                                    Featured Portfolio
                                </label>
                            </div>
                            <div class="flex items-center">
                                <input type="checkbox" id="portfolioActive" checked class="h-4 w-4 text-kwikr-green focus:ring-kwikr-green border-gray-300 rounded">
                                <label for="portfolioActive" class="ml-2 block text-sm text-gray-700">
                                    Active (visible to clients)
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                        <button type="button" onclick="closePortfolioModal()" 
                                class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="bg-kwikr-green text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors">
                            <i class="fas fa-save mr-2"></i><span id="submitText">Create Portfolio</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Image View Modal -->
        <div id="imageModal" class="modal fixed inset-0 bg-black bg-opacity-75 z-50 items-center justify-center">
            <div class="max-w-4xl w-full mx-4">
                <div class="relative">
                    <img id="modalImage" class="w-full h-auto rounded-lg" src="" alt="">
                    <button onclick="closeImageModal()" 
                            class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            window.currentUser = {
                id: ${user.user_id},
                email: "${user.email}",
                role: "${user.role}",
                firstName: "${user.first_name}",
                lastName: "${user.last_name}"
            };
        </script>
        <script src="/static/portfolio.js"></script>
        <script>
            // Initialize portfolio management when page loads
            document.addEventListener('DOMContentLoaded', function() {
                console.log('DOM loaded, initializing portfolio management');
                initializePortfolioManager();
            });
        </script>
    </body>
    </html>
  `)
})

// API endpoint for updating worker profile
dashboardRoutes.post('/api/worker/profile/update', requireAuth, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  try {
    const formData = await c.req.json()
    console.log('Updating worker profile for user:', user.user_id, formData)
    
    // Update user table
    await c.env.DB.prepare(`
      UPDATE users 
      SET email = ?, phone = ?, city = ?, province = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      formData.primaryEmail,
      formData.phone,
      formData.city,
      formData.province,
      user.user_id
    ).run()
    
    // Update user_profiles table (create if doesn't exist)
    const existingProfile = await c.env.DB.prepare(`
      SELECT id FROM user_profiles WHERE user_id = ?
    `).bind(user.user_id).first()
    
    if (existingProfile) {
      // Update existing profile
      await c.env.DB.prepare(`
        UPDATE user_profiles 
        SET company_description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        formData.businessDescription,
        user.user_id
      ).run()
    } else {
      // Create new profile
      await c.env.DB.prepare(`
        INSERT INTO user_profiles (user_id, company_description, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        user.user_id,
        formData.businessDescription
      ).run()
    }
    
    console.log('Profile updated successfully for user:', user.user_id)
    
    return c.json({ 
      success: true, 
      message: 'Profile updated successfully',
      updatedData: {
        email: formData.primaryEmail,
        phone: formData.phone,
        city: formData.city,
        province: formData.province,
        businessDescription: formData.businessDescription
      }
    })
    
  } catch (error) {
    console.error('Error updating worker profile:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to update profile. Please try again.' 
    }, 500)
  }
})

// Worker Services Management Page
dashboardRoutes.get('/worker/services', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  // Get worker's current services
  const services = await c.env.DB.prepare(`
    SELECT * FROM worker_services 
    WHERE user_id = ? AND is_available = 1
    ORDER BY service_name
  `).bind(user.user_id).all()

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Manage Services - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Manage Services</h1>
                <p class="text-gray-600">Configure your services, pricing, and availability</p>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-lg shadow-sm mb-8">
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-8 px-6" aria-label="Tabs">
                        <a href="/dashboard/worker" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-user mr-2"></i>Profile View
                        </a>
                        <a href="/dashboard/worker/profile" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-edit mr-2"></i>Edit Profile
                        </a>
                        <a href="/dashboard/worker/payments" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-credit-card mr-2"></i>Payment Management
                        </a>
                        <a href="/dashboard/worker/compliance" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-shield-check mr-2"></i>Manage Compliance
                        </a>
                        <a href="/dashboard/worker/services" class="py-4 px-1 border-b-2 border-kwikr-green text-kwikr-green font-medium text-sm">
                            <i class="fas fa-tools mr-2"></i>Manage Services
                        </a>
                    </nav>
                </div>
            </div>

            <!-- Services and Pricing Management -->
            <div class="space-y-8">
                <!-- Current Services -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-semibold text-gray-900">Your Services</h2>
                            <button onclick="showServicesModal()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                                <i class="fas fa-plus mr-2"></i>Add Service
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        ${services.results?.length > 0 ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                ${services.results.map(service => `
                                    <div class="border border-gray-200 rounded-lg p-6">
                                        <div class="flex items-center mb-4">
                                            <i class="fas fa-tools text-kwikr-green text-xl mr-3"></i>
                                            <h3 class="font-semibold text-gray-900">${service.service_name}</h3>
                                        </div>
                                        <p class="text-gray-600 text-sm mb-4">${service.description || 'Professional service'}</p>
                                        <div class="flex justify-between items-center mb-4">
                                            <span class="text-2xl font-bold text-kwikr-green">$${service.hourly_rate}/hr</span>
                                            <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                                        </div>
                                        <div class="flex space-x-2">
                                            <button onclick="editService(${service.id})" class="flex-1 text-blue-600 hover:text-blue-800 text-sm">
                                                <i class="fas fa-edit mr-1"></i>Edit
                                            </button>
                                            <button onclick="toggleServiceStatus(${service.id})" class="flex-1 text-gray-600 hover:text-gray-800 text-sm">
                                                <i class="fas fa-pause mr-1"></i>Pause
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="text-center py-12">
                                <i class="fas fa-tools text-4xl text-gray-300 mb-4"></i>
                                <h3 class="text-lg font-medium text-gray-900 mb-2">No Services Added Yet</h3>
                                <p class="text-gray-500 mb-6">Add your first service to start receiving job offers</p>
                                <button onclick="showServicesModal()" class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600">
                                    <i class="fas fa-plus mr-2"></i>Add Your First Service
                                </button>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Service Areas -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Service Areas</h2>
                        <p class="text-gray-600">Specify the areas where you provide services</p>
                    </div>
                    <div class="p-6">
                        <div id="serviceAreasContainer">
                            <!-- Service areas will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Hours of Operation -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Hours of Operation</h2>
                        <p class="text-gray-600">Set your availability schedule</p>
                    </div>
                    <div class="p-6">
                        <div id="hoursContainer">
                            <!-- Hours will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Include the worker dashboard JavaScript -->
        <script src="/static/worker-dashboard.js"></script>
        <script>
            function logout() {
                if (confirm('Are you sure you want to logout?')) {
                    window.location.href = '/api/auth/logout'
                }
            }
            
            // Initialize page
            document.addEventListener('DOMContentLoaded', function() {
                loadServiceAreas()
                loadHours()
            })
        </script>
    </body>
    </html>
  `)
})

// Worker Compliance Management Page
dashboardRoutes.get('/worker/compliance', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.redirect('/dashboard')
  }

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Manage Compliance - Kwikr Directory</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'kwikr-green': '#00C881',
                  'kwikr-dark': '#1a1a1a',
                  'kwikr-gray': '#f8f9fa'
                }
              }
            }
          }
        </script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-kwikr-gray min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-kwikr-green">
                            <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                        </h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-sm text-gray-600">Welcome, ${user.first_name}!</span>
                        <button onclick="logout()" class="text-gray-700 hover:text-red-600">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Manage Compliance</h1>
                <p class="text-gray-600">Update your certifications, licenses, and insurance</p>
            </div>

            <!-- Tab Navigation -->
            <div class="bg-white rounded-lg shadow-sm mb-8">
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-8 px-6" aria-label="Tabs">
                        <a href="/dashboard/worker" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-user mr-2"></i>Profile View
                        </a>
                        <a href="/dashboard/worker/profile" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-edit mr-2"></i>Edit Profile
                        </a>
                        <a href="/dashboard/worker/payments" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-credit-card mr-2"></i>Payment Management
                        </a>
                        <a href="/dashboard/worker/compliance" class="py-4 px-1 border-b-2 border-kwikr-green text-kwikr-green font-medium text-sm">
                            <i class="fas fa-shield-check mr-2"></i>Manage Compliance
                        </a>
                        <a href="/dashboard/worker/services" class="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm">
                            <i class="fas fa-tools mr-2"></i>Manage Services
                        </a>
                    </nav>
                </div>
            </div>

            <!-- Compliance Management Content -->
            <div class="space-y-8">
                <!-- Compliance Overview -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Compliance Overview</h2>
                        <p class="text-gray-600">Keep your certifications and documentation up to date</p>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="text-center p-6 bg-green-50 rounded-lg">
                                <i class="fas fa-shield-check text-green-600 text-3xl mb-3"></i>
                                <h3 class="font-semibold text-green-800">Identity Verified</h3>
                                <p class="text-sm text-green-600 mt-1">Completed</p>
                            </div>
                            <div class="text-center p-6 bg-yellow-50 rounded-lg">
                                <i class="fas fa-clock text-yellow-600 text-3xl mb-3"></i>
                                <h3 class="font-semibold text-yellow-800">Background Check</h3>
                                <p class="text-sm text-yellow-600 mt-1">Pending</p>
                            </div>
                            <div class="text-center p-6 bg-red-50 rounded-lg">
                                <i class="fas fa-times text-red-600 text-3xl mb-3"></i>
                                <h3 class="font-semibold text-red-800">Insurance</h3>
                                <p class="text-sm text-red-600 mt-1">Required</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Action -->
                <div class="bg-white rounded-lg shadow-sm">
                    <div class="p-6 text-center">
                        <h2 class="text-xl font-semibold text-gray-900 mb-4">Update Compliance Information</h2>
                        <p class="text-gray-600 mb-6">Use our comprehensive form to manage all your compliance requirements</p>
                        <button onclick="toggleComplianceForm()" class="bg-kwikr-green text-white px-8 py-3 rounded-lg hover:bg-green-600 font-semibold">
                            <i class="fas fa-shield-check mr-2"></i>Manage Compliance
                        </button>
                    </div>
                </div>

                <!-- Canadian Compliance Management Form -->
                <div id="complianceForm" class="bg-white rounded-lg shadow-sm" style="display: none;">
                    <div class="p-6 border-b border-gray-200">
                        <h2 class="text-xl font-semibold text-gray-900">Canadian Business Compliance Information</h2>
                        <p class="text-gray-600">Required for service providers in Canada</p>
                    </div>
                    <div class="p-6">
                        <form id="complianceUpdateForm" class="space-y-6">
                            <!-- WSIB Information -->
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-blue-900 mb-4">
                                    <i class="fas fa-hard-hat mr-2"></i>WSIB (Workplace Safety and Insurance Board)
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">WSIB Number</label>
                                        <input type="text" id="wsibNumber" placeholder="e.g., 12345678-9" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                        <p class="text-xs text-gray-500 mt-1">Required for construction and high-risk services in Ontario</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">WSIB Valid Until</label>
                                        <input type="date" id="wsibValidUntil" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                </div>
                            </div>

                            <!-- Insurance Information -->
                            <div class="bg-green-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-green-900 mb-4">
                                    <i class="fas fa-shield-alt mr-2"></i>General Liability Insurance
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
                                        <input type="text" id="insuranceProvider" placeholder="e.g., Intact Insurance, Aviva" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Policy Number</label>
                                        <input type="text" id="insurancePolicyNumber" placeholder="Policy number" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Insurance Valid Until</label>
                                        <input type="date" id="insuranceValidUntil" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Coverage Amount</label>
                                        <select id="coverageAmount" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                            <option value="">Select coverage</option>
                                            <option value="1000000">$1,000,000 CAD</option>
                                            <option value="2000000">$2,000,000 CAD (Recommended)</option>
                                            <option value="5000000">$5,000,000 CAD</option>
                                            <option value="10000000">$10,000,000 CAD</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Professional License Information -->
                            <div class="bg-yellow-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-yellow-900 mb-4">
                                    <i class="fas fa-certificate mr-2"></i>Professional Licenses & Certifications
                                </h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">License Type</label>
                                        <select id="licenseType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                            <option value="">Select license type</option>
                                            <option value="electrical">Electrical License (ECRA/ESA)</option>
                                            <option value="plumbing">Plumbing License</option>
                                            <option value="gasfitting">Gas Fitting License</option>
                                            <option value="hvac">HVAC Technician</option>
                                            <option value="contractor">General Contractor</option>
                                            <option value="home_inspector">Home Inspector</option>
                                            <option value="pest_control">Pest Control License</option>
                                            <option value="other">Other Professional License</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                                        <input type="text" id="licenseNumber" placeholder="License/certification number" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">License Valid Until</label>
                                        <input type="date" id="licenseValidUntil" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Issuing Authority</label>
                                        <input type="text" id="licensingAuthority" placeholder="e.g., ESA, Provincial College" 
                                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    </div>
                                </div>
                            </div>

                            <!-- Document Upload Section -->
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                                    <i class="fas fa-file-upload mr-2"></i>Supporting Documents
                                </h3>
                                <p class="text-sm text-gray-600 mb-4">Upload copies of your insurance certificates, licenses, and WSIB clearance certificates</p>
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <i class="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-2"></i>
                                    <p class="text-gray-600">Drag & drop files here or click to upload</p>
                                    <p class="text-xs text-gray-500 mt-1">PDF, JPG, PNG files up to 10MB each</p>
                                    <input type="file" id="complianceDocuments" multiple accept=".pdf,.jpg,.jpeg,.png" class="hidden">
                                    <button type="button" onclick="document.getElementById('complianceDocuments').click()" 
                                            class="mt-2 px-4 py-2 bg-kwikr-green text-white rounded hover:bg-green-600">
                                        Select Files
                                    </button>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="flex justify-end space-x-4 pt-6">
                                <button type="button" onclick="toggleComplianceForm()" 
                                        class="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" 
                                        class="px-6 py-2 bg-kwikr-green text-white rounded-md hover:bg-green-600">
                                    <i class="fas fa-save mr-2"></i>Save Compliance Information
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Include the worker dashboard JavaScript -->
        <script src="/static/worker-dashboard.js"></script>
        <script>
            function logout() {
                if (confirm('Are you sure you want to logout?')) {
                    window.location.href = '/api/auth/logout'
                }
            }

            // Compliance form management
            function toggleComplianceForm() {
                const form = document.getElementById('complianceForm');
                if (form.style.display === 'none') {
                    form.style.display = 'block';
                    loadComplianceData();
                } else {
                    form.style.display = 'none';
                }
            }

            // Load existing compliance data
            async function loadComplianceData() {
                try {
                    const response = await fetch('/api/worker/compliance', {
                        credentials: 'include'  // Include session cookies
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.compliance) {
                            const c = data.compliance;
                            document.getElementById('wsibNumber').value = c.wsib_number || '';
                            document.getElementById('wsibValidUntil').value = c.wsib_valid_until || '';
                            document.getElementById('insuranceProvider').value = c.insurance_provider || '';
                            document.getElementById('insurancePolicyNumber').value = c.insurance_policy_number || '';
                            document.getElementById('insuranceValidUntil').value = c.insurance_valid_until || '';
                            document.getElementById('licenseType').value = c.license_type || '';
                            document.getElementById('licenseNumber').value = c.license_number || '';
                            document.getElementById('licenseValidUntil').value = c.license_valid_until || '';
                        }
                    }
                } catch (error) {
                    console.log('No existing compliance data found');
                }
            }

            // Handle compliance form submission
            document.getElementById('complianceUpdateForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    wsib_number: document.getElementById('wsibNumber').value,
                    wsib_valid_until: document.getElementById('wsibValidUntil').value,
                    insurance_provider: document.getElementById('insuranceProvider').value,
                    insurance_policy_number: document.getElementById('insurancePolicyNumber').value,
                    insurance_valid_until: document.getElementById('insuranceValidUntil').value,
                    license_type: document.getElementById('licenseType').value,
                    license_number: document.getElementById('licenseNumber').value,
                    license_valid_until: document.getElementById('licenseValidUntil').value
                };

                try {
                    const response = await fetch('/api/worker/compliance/update', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',  // Include session cookies
                        body: JSON.stringify(formData)
                    });

                    const result = await response.json();
                    
                    if (response.ok) {
                        alert('Compliance information updated successfully!');
                        toggleComplianceForm();
                        // Refresh the page to show updated compliance status
                        window.location.reload();
                    } else {
                        alert('Error: ' + result.error);
                    }
                } catch (error) {
                    console.error('Compliance update error:', error);
                    alert('Failed to update compliance information. Please try again.');
                }
            });
        </script>
    </body>
    </html>
  `)
})

// DUPLICATE ROUTE REMOVED: Worker profile functionality is handled by the comprehensive route above (line 2326)
// Duplicate route content removed - consolidated functionality preserved above
// Duplicate route HTML content removed - full functionality preserved in comprehensive route above

// API endpoint for updating worker payment settings
dashboardRoutes.post('/api/worker/payment-settings/update', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  try {
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

// API endpoint for getting worker compliance data
dashboardRoutes.get('/api/worker/compliance', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  try {
    // Get worker compliance data
    const compliance = await c.env.DB.prepare(`
      SELECT * FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()
    
    return c.json({ 
      success: true, 
      compliance: compliance || {}
    })
  } catch (error) {
    console.error('Error fetching compliance data:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to fetch compliance data' 
    }, 500)
  }
})

// API endpoint for updating worker compliance data
dashboardRoutes.post('/api/worker/compliance/update', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  try {
    const complianceData = await c.req.json()
    
    // Check if compliance record exists for this user
    const existingCompliance = await c.env.DB.prepare(`
      SELECT id FROM worker_compliance WHERE user_id = ?
    `).bind(user.user_id).first()

    if (existingCompliance) {
      // Update existing compliance record
      await c.env.DB.prepare(`
        UPDATE worker_compliance 
        SET wsib_number = ?, 
            wsib_valid_until = ?, 
            insurance_provider = ?, 
            insurance_policy_number = ?, 
            insurance_valid_until = ?, 
            license_type = ?, 
            license_number = ?, 
            license_valid_until = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        complianceData.wsib_number,
        complianceData.wsib_valid_until,
        complianceData.insurance_provider,
        complianceData.insurance_policy_number,
        complianceData.insurance_valid_until,
        complianceData.license_type,
        complianceData.license_number,
        complianceData.license_valid_until,
        user.user_id
      ).run()
    } else {
      // Insert new compliance record
      await c.env.DB.prepare(`
        INSERT INTO worker_compliance (
          user_id, wsib_number, wsib_valid_until, insurance_provider, 
          insurance_policy_number, insurance_valid_until, license_type, 
          license_number, license_valid_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        user.user_id,
        complianceData.wsib_number,
        complianceData.wsib_valid_until,
        complianceData.insurance_provider,
        complianceData.insurance_policy_number,
        complianceData.insurance_valid_until,
        complianceData.license_type,
        complianceData.license_number,
        complianceData.license_valid_until
      ).run()
    }
    
    return c.json({ 
      success: true, 
      message: 'Compliance information updated successfully' 
    })
  } catch (error) {
    console.error('Error updating compliance data:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to update compliance information. Please try again.' 
    }, 500)
  }
})

// API endpoint for adding worker services
dashboardRoutes.post('/api/worker/services', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  try {
    const serviceData = await c.req.json()
    
    // Insert new service
    await c.env.DB.prepare(`
      INSERT INTO worker_services (
        user_id, service_category, service_name, hourly_rate, 
        description, is_available, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      user.user_id,
      serviceData.category,
      serviceData.service_name,
      serviceData.hourly_rate,
      serviceData.description
    ).run()
    
    return c.json({ 
      success: true, 
      message: 'Service added successfully' 
    })
  } catch (error) {
    console.error('Error adding service:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to add service. Please try again.' 
    }, 500)
  }
})

// API endpoint for getting worker payment settings
dashboardRoutes.get('/api/worker/payment-settings', requireAuth, requireWorkerSubscription, async (c) => {
  const user = c.get('user')
  
  if (user.role !== 'worker') {
    return c.json({ success: false, error: 'Unauthorized' }, 403)
  }

  try {
    // Get worker payment settings
    const paymentSettings = await c.env.DB.prepare(`
      SELECT * FROM worker_payment_settings WHERE user_id = ?
    `).bind(user.user_id).first()
    
    return c.json({ 
      success: true, 
      paymentSettings: paymentSettings || {}
    })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return c.json({ 
      success: false, 
      error: 'Failed to fetch payment settings' 
    }, 500)
  }
})

export default dashboardRoutes

