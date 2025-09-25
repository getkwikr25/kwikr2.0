// Kwikr Directory - Main App JavaScript - FIXED VERSION

// Global configuration
const API_BASE = '/api'
let currentUser = null

// Check for session expiration message on page load
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search)
  const message = urlParams.get('message')
  
  if (message === 'session_expired') {
    showNotification('Your session has expired. Please sign in again to continue.', 'warning')
    
    // Clean up URL without reloading
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname
    window.history.replaceState({}, document.title, cleanUrl)
  }
})

// Utility functions
function showNotification(message, type = 'info') {
  const notification = document.createElement('div')
  notification.className = `notification ${type}`
  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 5000)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(amount)
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusBadge(status) {
  const statusClasses = {
    'posted': 'status-posted',
    'assigned': 'status-assigned',
    'in_progress': 'status-in-progress',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled',
    'verified': 'status-verified',
    'pending': 'status-pending',
    'rejected': 'status-rejected'
  }
  
  const statusLabels = {
    'posted': 'Posted',
    'assigned': 'Assigned',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'verified': 'Verified',
    'pending': 'Pending',
    'rejected': 'Rejected'
  }
  
  return `<span class="status-badge ${statusClasses[status] || 'status-pending'}">${statusLabels[status] || status}</span>`
}

function getUrgencyBadge(urgency) {
  const urgencyClasses = {
    'low': 'job-urgency-low',
    'normal': 'job-urgency-normal',
    'high': 'job-urgency-high',
    'urgent': 'job-urgency-urgent'
  }
  
  const urgencyLabels = {
    'low': 'Low',
    'normal': 'Normal',
    'high': 'High',
    'urgent': 'Urgent'
  }
  
  return `<span class="status-badge ${urgencyClasses[urgency] || 'job-urgency-normal'}">${urgencyLabels[urgency] || urgency}</span>`
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
  // Try to get token from localStorage first, then from cookies
  let token = null
  try {
    token = localStorage.getItem('sessionToken')
  } catch (e) {
    // localStorage access denied, try to get from cookies
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'session') {
        token = value
        break
      }
    }
  }
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  }
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config)
    const data = await response.json()
    
    if (!response.ok) {
      // Handle session expiration specifically
      if (response.status === 401 && (
        data.expired || 
        data.error === 'Session expired' || 
        data.error === 'Invalid or expired session' ||
        data.error === 'No session token provided' ||
        data.error === 'Authentication required'
      )) {
        console.log('Session expired detected in apiRequest:', data.error)
        
        // Clear stored session data
        try {
          localStorage.removeItem('sessionToken')
        } catch (e) {
          // Ignore localStorage errors
        }
        
        // Clear window.currentUser
        window.currentUser = null
        
        // For demo mode APIs, return error response instead of throwing
        if (endpoint.includes('assigned-jobs') || endpoint.includes('jobs-with-progress') || endpoint.includes('jobs/') && endpoint.includes('/status')) {
          console.log('Authentication failed for demo API - returning error response')
          return { success: false, error: 'Authentication failed', sessionExpired: true }
        }
        
        // Throw special error that can be caught by calling functions
        const sessionError = new Error('Session expired')
        sessionError.sessionExpired = true
        throw sessionError
      }
      
      throw new Error(data.error || 'Request failed')
    }
    
    return data
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// Modal functions
function showLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden')
  document.getElementById('loginModal').classList.add('modal-enter')
}

function hideLoginModal() {
  document.getElementById('loginModal').classList.add('hidden')
  document.getElementById('loginModal').classList.remove('modal-enter')
}

function showSignupModal(userType = '') {
  document.getElementById('signupModal').classList.remove('hidden')
  document.getElementById('signupModal').classList.add('modal-enter')
  
  if (userType) {
    selectUserType(userType)
  }
}

function hideSignupModal() {
  document.getElementById('signupModal').classList.add('hidden')
  document.getElementById('signupModal').classList.remove('modal-enter')
}

function selectUserType(type) {
  document.getElementById('userRole').value = type
  
  // Update button styles
  const clientBtn = document.getElementById('clientBtn')
  const workerBtn = document.getElementById('workerBtn')
  
  clientBtn.className = clientBtn.className.replace('border-kwikr-green bg-green-50', 'border-gray-200')
  workerBtn.className = workerBtn.className.replace('border-kwikr-green bg-green-50', 'border-gray-200')
  
  if (type === 'client') {
    clientBtn.className = clientBtn.className.replace('border-gray-200', 'border-kwikr-green bg-green-50')
  } else if (type === 'worker') {
    workerBtn.className = workerBtn.className.replace('border-gray-200', 'border-kwikr-green bg-green-50')
  }
}

// Demo login function for easy testing
async function demoLogin(role) {
  if (!role || !['client', 'worker', 'admin'].includes(role)) {
    showNotification('Invalid demo role', 'error')
    return
  }
  
  try {
    showNotification(`Accessing ${role} demo...`, 'info')
    
    // Use the dedicated demo-login endpoint that doesn't require password authentication
    const response = await apiRequest('/auth/demo-login', {
      method: 'POST',
      body: { role }
    })
    
    if (response.sessionToken) {
      console.log('Demo login successful, setting session token:', response.sessionToken)
      
      // Clear any existing session data first
      try {
        localStorage.removeItem('sessionToken')
      } catch (e) {
        console.log('localStorage not available, using cookies only')
      }
      // Clear existing session cookie with correct secure flag
      const isHttps = window.location.protocol === 'https:'
      document.cookie = `session=; path=/; max-age=0; secure=${isHttps}; samesite=lax`
      
      // Set new session data (cookie is primary, localStorage is backup)
      // Auto-detect if we're on HTTPS and set secure flag accordingly
      document.cookie = `session=${response.sessionToken}; path=/; max-age=604800; secure=${isHttps}; samesite=lax`
      try {
        localStorage.setItem('sessionToken', response.sessionToken)
      } catch (e) {
        console.log('localStorage not available, session stored in cookies only')
      }
      currentUser = response.user
      
      console.log('Session cookie set, redirecting to:', `/dashboard/${response.user.role}`)
      showNotification('Demo login successful! Redirecting to dashboard...', 'success')
      
      // Use window.location.replace to avoid back button issues
      setTimeout(() => {
        window.location.replace(`/dashboard/${response.user.role}`)
      }, 1500)
    }
    
  } catch (error) {
    console.error('Demo login error:', error)
    showNotification(error.message || 'Demo login failed', 'error')
  }
}

// Authentication functions
async function handleLogin(event) {
  event.preventDefault()
  
  const email = document.getElementById('loginEmail').value
  const password = document.getElementById('loginPassword').value
  
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    
    // Store session token in cookie (for dashboard authentication)
    document.cookie = `session=${response.sessionToken}; path=/; max-age=604800; secure=${window.location.protocol === 'https:'}; samesite=lax`
    
    // Also store in localStorage for API requests
    try {
      localStorage.setItem('sessionToken', response.sessionToken)
    } catch (e) {
      console.log('localStorage not available, session stored in cookies only')
    }
    currentUser = response.user
    
    showNotification('Login successful!', 'success')
    hideLoginModal()
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1000)
    
  } catch (error) {
    showNotification(error.message, 'error')
  }
}

async function handleSignup(event) {
  event.preventDefault()
  
  const role = document.getElementById('userRole').value
  const firstName = document.getElementById('firstName').value
  const lastName = document.getElementById('lastName').value
  const email = document.getElementById('signupEmail').value
  const password = document.getElementById('signupPassword').value
  const province = document.getElementById('province').value
  const city = document.getElementById('city').value
  
  if (!role) {
    showNotification('Please select an account type', 'warning')
    return
  }
  
  try {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        role,
        firstName,
        lastName,
        province,
        city
      }
    })
    
    showNotification('Account created successfully! Please log in.', 'success')
    
    hideSignupModal()
    showLoginModal()
    
    // Pre-fill login form
    document.getElementById('loginEmail').value = email
    
  } catch (error) {
    showNotification(error.message, 'error')
  }
}

async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
    
    // Clear both localStorage and cookie
    try {
      localStorage.removeItem('sessionToken')
    } catch (e) {
      console.log('localStorage not available')
    }
    document.cookie = `session=; path=/; max-age=0; secure=${window.location.protocol === 'https:'}; samesite=lax`
    currentUser = null
    
    showNotification('Logged out successfully', 'success')
    
    setTimeout(() => {
      window.location.href = '/'
    }, 1000)
    
  } catch (error) {
    // Even if logout fails, clear local storage and cookie
    try {
      localStorage.removeItem('sessionToken')
    } catch (e) {
      console.log('localStorage not available')
    }
    document.cookie = `session=; path=/; max-age=0; secure=${window.location.protocol === 'https:'}; samesite=lax`
    currentUser = null
    window.location.href = '/'
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
  // Only run session validation on main page, not on dashboard pages
  if (window.location.pathname.startsWith('/dashboard')) {
    // Dashboard pages handle their own authentication
    return
  }
  
  // Check for existing session on main page only
  let token = null
  try {
    token = localStorage.getItem('sessionToken')
  } catch (e) {
    // localStorage not available, try cookies
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'session') {
        token = value
        break
      }
    }
  }
  
  if (token) {
    try {
      const response = await apiRequest('/auth/me')
      currentUser = response.user
      
      // If on main page and logged in, redirect to dashboard
      if (window.location.pathname === '/') {
        window.location.href = '/dashboard'
      }
    } catch (error) {
      // Invalid session, remove token and cookie
      try {
        localStorage.removeItem('sessionToken')
      } catch (e) {
        console.log('localStorage not available')
      }
      document.cookie = `session=; path=/; max-age=0; secure=${window.location.protocol === 'https:'}; samesite=lax`
    }
  }
  
  // Check URL parameters for login prompts (only on main page)
  const params = new URLSearchParams(window.location.search)
  if (params.get('login') === 'required') {
    showNotification('🔐 Please log in to access that page. Try our demo buttons below!', 'info')
    // Scroll to demo section instead of showing modal
    setTimeout(() => {
      const demoSection = document.querySelector('.demo-section')
      if (demoSection) {
        demoSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 1000)
  } else if (params.get('session') === 'expired') {
    showNotification('⏰ Your session has expired. Use the demo buttons below to try again!', 'warning')
    // Scroll to demo section instead of showing modal
    setTimeout(() => {
      const demoSection = document.querySelector('.demo-section')
      if (demoSection) {
        demoSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 1000)
  }
})

// Global error handler
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason)
  showNotification('An unexpected error occurred. Please try again.', 'error')
})

// Export functions for global use
window.demoLogin = demoLogin
window.showLoginModal = showLoginModal
window.hideLoginModal = hideLoginModal
window.showSignupModal = showSignupModal
window.hideSignupModal = hideSignupModal
window.selectUserType = selectUserType
window.handleLogin = handleLogin
window.handleSignup = handleSignup
window.logout = logout
window.apiRequest = apiRequest
window.showNotification = showNotification
window.formatCurrency = formatCurrency
window.formatDate = formatDate
window.getStatusBadge = getStatusBadge
window.getUrgencyBadge = getUrgencyBadge

// ===== SERVICE AREAS MANAGEMENT =====

// Load service areas for management
async function loadServiceAreas() {
  console.log('loadServiceAreas called')
  try {
    console.log('Making API request to /api/worker/service-areas')
    const response = await apiRequest('/worker/service-areas', {
      method: 'GET'
    })
    
    console.log('Service areas API response:', response)
    
    if (response.success !== false) {
      const areas = response.service_areas || []
      console.log('Loaded areas:', areas)
      displayServiceAreasManagement(areas)
    } else {
      console.error('API returned error:', response)
      // Fallback demo data
      const fallbackAreas = [
        { id: 1, city: 'Toronto', province: 'Ontario' },
        { id: 2, city: 'Mississauga', province: 'Ontario' },
        { id: 3, city: 'Oakville', province: 'Ontario' }
      ]
      console.log('Using fallback service areas')
      displayServiceAreasManagement(fallbackAreas)
    }
  } catch (error) {
    console.error('Error loading service areas:', error)
    // Fallback demo data
    const fallbackAreas = [
      { id: 1, city: 'Toronto', province: 'Ontario' },
      { id: 2, city: 'Mississauga', province: 'Ontario' },
      { id: 3, city: 'Oakville', province: 'Ontario' }
    ]
    console.log('Using fallback service areas')
    displayServiceAreasManagement(fallbackAreas)
  }
}

// Display service areas in management interface
function displayServiceAreasManagement(areas) {
  console.log('displayServiceAreasManagement called with:', areas)
  const container = document.getElementById('serviceAreasList')
  if (!container) {
    console.error('serviceAreasList container not found')
    return
  }
  
  if (areas.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-map-marker-alt text-2xl mb-2"></i>
        <p>No service areas added yet. Add your first service area to show clients where you work.</p>
      </div>
    `
    return
  }
  
  container.innerHTML = areas.map(area => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center">
        <i class="fas fa-map-marker-alt text-kwikr-green mr-3"></i>
        <span class="font-medium text-gray-900">${area.area_name}</span>
      </div>
      <button onclick="removeServiceArea(${area.id})" class="text-red-500 hover:text-red-700">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('')
  console.log('Service areas displayed successfully')
}

// Show add area form
function showAddAreaForm() {
  const form = document.getElementById('addAreaForm')
  if (form) {
    form.classList.remove('hidden')
    document.getElementById('newAreaName').focus()
  }
}

// Cancel add area
function cancelAddArea() {
  const form = document.getElementById('addAreaForm')
  if (form) {
    form.classList.add('hidden')
    document.getElementById('newAreaName').value = ''
  }
}

// Save service area
async function saveServiceArea(event) {
  console.log('saveServiceArea called', event)
  event.preventDefault()
  
  const areaInput = document.getElementById('newAreaName')
  const areaText = areaInput.value.trim()
  console.log('Area input text:', areaText)
  
  if (!areaText) {
    console.log('No area name provided')
    showNotification('Please enter at least one area name', 'error')
    return
  }
  
  // Handle comma-separated areas
  const areas = areaText.split(',').map(area => area.trim()).filter(area => area.length > 0)
  console.log('Areas to add:', areas)
  
  if (areas.length === 0) {
    showNotification('Please enter valid area names', 'error')
    return
  }
  
  try {
    const button = event.target.querySelector('button[type="submit"]')
    console.log('Submit button:', button)
    
    if (button) {
      const originalText = button.innerHTML
      button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...'
      button.disabled = true
    }
    
    // Add areas one by one
    let successCount = 0
    let errors = []
    
    for (const area of areas) {
      try {
        console.log('Adding area:', area)
        const response = await apiRequest('/api/worker/service-areas', {
          method: 'POST',
          body: JSON.stringify({ area_name: area })
        })
        
        console.log('API response for', area, ':', response)
        
        if (response.success !== false) {
          successCount++
        } else {
          errors.push(`${area}: ${response.error || 'Failed to add'}`)
        }
      } catch (error) {
        console.error('Error adding area', area, ':', error)
        errors.push(`${area}: Network error`)
      }
    }
    
    // Show results
    if (successCount > 0) {
      showNotification(`Successfully added ${successCount} service area(s)!`, 'success')
      cancelAddArea()
      loadServiceAreas()
    }
    
    if (errors.length > 0) {
      showNotification(`Some areas failed to add: ${errors.join(', ')}`, 'error')
    }
    
    if (button) {
      button.innerHTML = '<i class="fas fa-save mr-2"></i>Save'
      button.disabled = false
    }
  } catch (error) {
    console.error('Error saving service areas:', error)
    showNotification('Failed to add service areas. Please try again.', 'error')
    
    const button = event.target.querySelector('button[type="submit"]')
    if (button) {
      button.innerHTML = '<i class="fas fa-save mr-2"></i>Save'
      button.disabled = false
    }
  }
}

// Remove service area
async function removeServiceArea(areaId) {
  if (!confirm('Are you sure you want to remove this service area?')) return
  
  try {
    const response = await apiRequest(`/api/worker/service-areas/${areaId}`, {
      method: 'DELETE'
    })
    
    if (response.success !== false) {
      showNotification('Service area removed successfully!', 'success')
      loadServiceAreas()
    } else {
      showNotification(response.error || 'Failed to remove service area', 'error')
    }
  } catch (error) {
    console.error('Error removing service area:', error)
    showNotification('Failed to remove service area. Please try again.', 'error')
  }
}

// ===== HOURS OF OPERATION MANAGEMENT =====

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Load hours of operation for management
async function loadHours() {
  console.log('loadHours called')
  try {
    console.log('Making API request to /api/worker/hours')
    const response = await apiRequest('/worker/hours', {
      method: 'GET'
    })
    
    console.log('Hours API response:', response)
    
    if (response.success !== false) {
      const hours = response.hours || []
      console.log('Loaded hours:', hours)
      displayHoursManagement(hours)
    } else {
      console.error('API returned error:', response)
      // Fallback demo hours
      const fallbackHours = [
        { is_open: false, open_time: null, close_time: null }, // Sunday
        { is_open: true, open_time: '09:00', close_time: '17:00' }, // Monday
        { is_open: true, open_time: '09:00', close_time: '17:00' }, // Tuesday
        { is_open: true, open_time: '09:00', close_time: '17:00' }, // Wednesday
        { is_open: true, open_time: '09:00', close_time: '17:00' }, // Thursday
        { is_open: true, open_time: '09:00', close_time: '17:00' }, // Friday
        { is_open: false, open_time: null, close_time: null } // Saturday
      ]
      console.log('Using fallback hours')
      displayHoursManagement(fallbackHours)
    }
  } catch (error) {
    console.error('Error loading hours:', error)
    // Fallback demo hours
    const fallbackHours = [
      { is_open: false, open_time: null, close_time: null }, // Sunday
      { is_open: true, open_time: '09:00', close_time: '17:00' }, // Monday
      { is_open: true, open_time: '09:00', close_time: '17:00' }, // Tuesday
      { is_open: true, open_time: '09:00', close_time: '17:00' }, // Wednesday
      { is_open: true, open_time: '09:00', close_time: '17:00' }, // Thursday
      { is_open: true, open_time: '09:00', close_time: '17:00' }, // Friday
      { is_open: false, open_time: null, close_time: null } // Saturday
    ]
    console.log('Using fallback hours')
    displayHoursManagement(fallbackHours)
  }
}

// Display hours in management interface
function displayHoursManagement(hours) {
  const container = document.getElementById('hoursDisplay')
  if (!container) return
  
  // Create a map of hours by day
  const hoursByDay = {}
  hours.forEach(hour => {
    hoursByDay[hour.day_of_week] = hour
  })
  
  container.innerHTML = DAYS.map((dayName, index) => {
    const dayHours = hoursByDay[index]
    const isOpen = dayHours && dayHours.is_open
    
    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center">
          <div class="w-20 font-medium text-gray-900">${dayName}</div>
          ${isOpen ? `
            <div class="flex items-center text-green-600">
              <i class="fas fa-clock mr-2"></i>
              <span>${formatTime(dayHours.open_time)} - ${formatTime(dayHours.close_time)}</span>
            </div>
          ` : `
            <div class="flex items-center text-gray-500">
              <i class="fas fa-times-circle mr-2"></i>
              <span>Closed</span>
            </div>
          `}
        </div>
      </div>
    `
  }).join('')
}

// Format time for display
function formatTime(timeString) {
  if (!timeString) return ''
  
  const [hours, minutes] = timeString.split(':')
  const hour12 = parseInt(hours) % 12 || 12
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${ampm}`
}

// Toggle hours edit mode
function toggleHoursEdit() {
  const display = document.getElementById('hoursDisplay')
  const editForm = document.getElementById('hoursEditForm')
  const editBtn = document.getElementById('editHoursBtn')
  
  if (display && editForm && editBtn) {
    if (editForm.classList.contains('hidden')) {
      // Show edit form
      display.classList.add('hidden')
      editForm.classList.remove('hidden')
      editBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel'
      editBtn.onclick = cancelHoursEdit
      
      // Initialize checkboxes first
      initializeHoursCheckboxes()
      
      // Load current hours into form
      loadHoursIntoForm()
    }
  }
}

// Initialize checkbox event handlers
function initializeHoursCheckboxes() {
  DAYS.forEach((dayName) => {
    const dayLower = dayName.toLowerCase()
    const checkbox = document.getElementById(`${dayLower}_open`)
    const timesDiv = document.getElementById(`${dayLower}_times`)
    
    if (checkbox && timesDiv) {
      checkbox.onchange = function() {
        if (this.checked) {
          timesDiv.classList.remove('hidden')
          // Set default times if empty
          const openTime = document.getElementById(`${dayLower}_open_time`)
          const closeTime = document.getElementById(`${dayLower}_close_time`)
          if (openTime && !openTime.value) openTime.value = '09:00'
          if (closeTime && !closeTime.value) closeTime.value = '17:00'
        } else {
          timesDiv.classList.add('hidden')
        }
      }
    }
  })
}

// Cancel hours edit
function cancelHoursEdit() {
  const display = document.getElementById('hoursDisplay')
  const editForm = document.getElementById('hoursEditForm')
  const editBtn = document.getElementById('editHoursBtn')
  
  if (display && editForm && editBtn) {
    display.classList.remove('hidden')
    editForm.classList.add('hidden')
    editBtn.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Hours'
    editBtn.onclick = toggleHoursEdit
  }
}

// Load current hours into edit form
async function loadHoursIntoForm() {
  try {
    const response = await apiRequest('/worker/hours', {
      method: 'GET'
    })
    
    if (response.success !== false) {
      const hours = response.hours || []
      const hoursByDay = {}
      hours.forEach(hour => {
        hoursByDay[hour.day_of_week] = hour
      })
      
      DAYS.forEach((dayName, index) => {
        const dayHours = hoursByDay[index]
        const dayLower = dayName.toLowerCase()
        
        const checkbox = document.getElementById(`${dayLower}_open`)
        const timesDiv = document.getElementById(`${dayLower}_times`)
        const openTime = document.getElementById(`${dayLower}_open_time`)
        const closeTime = document.getElementById(`${dayLower}_close_time`)
        
        if (checkbox && timesDiv && openTime && closeTime) {
          if (dayHours && dayHours.is_open) {
            checkbox.checked = true
            timesDiv.classList.remove('hidden')
            openTime.value = dayHours.open_time || '09:00'
            closeTime.value = dayHours.close_time || '17:00'
          } else {
            checkbox.checked = false
            timesDiv.classList.add('hidden')
            openTime.value = '09:00'
            closeTime.value = '17:00'
          }
        }
      })
    }
  } catch (error) {
    console.error('Error loading hours into form:', error)
  }
}

// Save hours
async function saveHours(event) {
  console.log('saveHours called', event)
  event.preventDefault()
  
  try {
    const button = event.target.querySelector('button[type="submit"]')
    console.log('Submit button:', button)
    
    if (button) {
      const originalText = button.innerHTML
      button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...'
      button.disabled = true
    }
    
    const hoursData = DAYS.map((dayName, index) => {
      const dayLower = dayName.toLowerCase()
      const checkbox = document.getElementById(`${dayLower}_open`)
      const openTime = document.getElementById(`${dayLower}_open_time`)
      const closeTime = document.getElementById(`${dayLower}_close_time`)
      
      return {
        is_open: checkbox ? checkbox.checked : false,
        open_time: checkbox && checkbox.checked && openTime ? openTime.value : null,
        close_time: checkbox && checkbox.checked && closeTime ? closeTime.value : null
      }
    })
    
    console.log('Hours data:', hoursData)
    console.log('Making API request...')
    
    const response = await apiRequest('/worker/hours', {
      method: 'PUT',
      body: JSON.stringify({ hours: hoursData })
    })
    
    console.log('API response:', response)
    
    if (response.success !== false) {
      showNotification('Hours updated successfully!', 'success')
      cancelHoursEdit()
      loadHours()
    } else {
      showNotification(response.error || 'Failed to update hours', 'error')
    }
    
    if (button) {
      button.innerHTML = '<i class="fas fa-save mr-2"></i>Save Hours'
      button.disabled = false
    }
  } catch (error) {
    console.error('Error saving hours:', error)
    showNotification('Failed to update hours. Please try again.', 'error')
    
    const button = event.target.querySelector('button[type="submit"]')
    if (button) {
      button.innerHTML = '<i class="fas fa-save mr-2"></i>Save Hours'
      button.disabled = false
    }
  }
}

// ===== SERVICE MANAGEMENT =====

// Show add service form
function showAddServiceForm() {
  const form = document.getElementById('serviceForm')
  if (form) {
    form.classList.remove('hidden')
    document.getElementById('serviceName').focus()
    
    // Reset form title
    const title = document.getElementById('serviceFormTitle')
    if (title) title.textContent = 'Add New Service'
  }
}

// Cancel service form
function cancelServiceForm() {
  const form = document.getElementById('serviceForm')
  if (form) {
    form.classList.add('hidden')
    // Reset form
    const serviceForm = document.getElementById('manageServiceForm')
    if (serviceForm) serviceForm.reset()
  }
}

// Export functions for global use
window.demoLogin = demoLogin
window.showLoginModal = showLoginModal
window.hideLoginModal = hideLoginModal
window.showSignupModal = showSignupModal
window.hideSignupModal = hideSignupModal
window.selectUserType = selectUserType
window.handleLogin = handleLogin
window.handleSignup = handleSignup
window.logout = logout
window.apiRequest = apiRequest
window.showNotification = showNotification
window.formatCurrency = formatCurrency
window.formatDate = formatDate
window.getStatusBadge = getStatusBadge
window.getUrgencyBadge = getUrgencyBadge

// Service Areas functions
window.showAddAreaForm = showAddAreaForm
window.cancelAddArea = cancelAddArea
window.saveServiceArea = saveServiceArea
window.removeServiceArea = removeServiceArea
window.loadServiceAreas = loadServiceAreas

// Hours functions
window.toggleHoursEdit = toggleHoursEdit
window.cancelHoursEdit = cancelHoursEdit
window.saveHours = saveHours
window.loadHours = loadHours

// Service management functions
window.showAddServiceForm = showAddServiceForm
window.cancelServiceForm = cancelServiceForm

// Add a simple test function
window.testButtonClick = function() {
  console.log('Test function called successfully')
  
  // Test all the key components
  const tests = [
    'localStorage access: ' + (localStorage ? 'OK' : 'FAIL'),
    'sessionToken: ' + (localStorage.getItem('sessionToken') ? 'Found' : 'Not found'),
    'apiRequest function: ' + (typeof window.apiRequest === 'function' ? 'OK' : 'FAIL'),
    'saveServiceArea function: ' + (typeof window.saveServiceArea === 'function' ? 'OK' : 'FAIL'),
    'handleSaveServiceArea function: ' + (typeof window.handleSaveServiceArea === 'function' ? 'OK' : 'FAIL'),
    'newAreaName input: ' + (document.getElementById('newAreaName') ? 'Found' : 'Not found'),
    'serviceAreasList container: ' + (document.getElementById('serviceAreasList') ? 'Found' : 'Not found')
  ]
  
  alert('JavaScript Status:\\n' + tests.join('\\n'))
}

// Simple button handlers that don't rely on form events
window.handleSaveServiceArea = function() {
  console.log('handleSaveServiceArea called')
  
  const areaInput = document.getElementById('newAreaName')
  if (!areaInput) {
    console.error('Area input not found')
    alert('Error: Could not find area input field')
    return
  }
  
  const areaText = areaInput.value.trim()
  console.log('Area text:', areaText)
  
  if (!areaText) {
    alert('Please enter at least one area name')
    return
  }
  
  // Create a fake event object for the existing function
  const fakeEvent = {
    preventDefault: () => {},
    target: {
      querySelector: (selector) => {
        if (selector === 'button[type="submit"]') {
          return document.querySelector('button[onclick*="handleSaveServiceArea"]')
        }
        return null
      }
    }
  }
  
  // Call the existing function
  saveServiceArea(fakeEvent)
}

window.handleSaveHours = function() {
  console.log('handleSaveHours called')
  
  // Create a fake event object for the existing function
  const fakeEvent = {
    preventDefault: () => {},
    target: {
      querySelector: (selector) => {
        if (selector === 'button[type="submit"]') {
          return document.querySelector('button[onclick*="handleSaveHours"]')
        }
        return null
      }
    }
  }
  
  // Call the existing function
  saveHours(fakeEvent)
}

// Debug: Confirm functions are loaded
console.log('Kwikr app.js loaded - all functions available')
console.log('saveServiceArea function:', typeof window.saveServiceArea)
console.log('saveHours function:', typeof window.saveHours)

// Initialize service areas and hours data when on profile management page
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on a profile page with management capabilities
  setTimeout(() => {
    if (document.getElementById('serviceAreasList') || document.getElementById('hoursDisplay')) {
      console.log('Management interface found, checking authentication...')
      
      // Check if user is authenticated and owns this profile
      checkAuthenticationAndLoad()
    }
    
    // Set up form event listeners after content loads
    setupFormListeners()
  }, 1000) // Delay to ensure auth is checked

  // Additional delay for late-loading elements
  setTimeout(() => {
    setupFormListeners()
  }, 3000)
})

// Check authentication and load data if authorized
async function checkAuthenticationAndLoad() {
  try {
    let user = null
    
    // First check if user is already embedded from server-side (dashboard pages)
    if (window.currentUser && window.currentUser.id) {
      console.log('Using server-side embedded user info:', window.currentUser)
      user = window.currentUser
    } else {
      // Fallback to API call if user not embedded (profile management pages)
      console.log('Fetching user info from API')
      const data = await apiRequest('/auth/me')
      
      if (data && data.user) {
        user = data.user
        console.log('User authenticated via API:', user)
      }
    }
    
    if (user) {
      console.log('User authenticated, loading management data')
      // Load management data
      loadServiceAreas()
      loadHours()
      return
    }
    
    console.log('User not authenticated, showing public view')
    // If not authenticated, show empty states
    displayServiceAreasManagement([])
    displayHoursManagement([])
    
  } catch (error) {
    console.error('Auth check failed:', error)
    // Show empty states on error
    displayServiceAreasManagement([])
    displayHoursManagement([])
  }
}

// Setup form event listeners
function setupFormListeners() {
  // Service area form
  const areaForm = document.querySelector('form[onsubmit*="saveServiceArea"]')
  if (areaForm) {
    console.log('Service area form found, adding event listener')
    // Remove any existing event listeners and add new one
    areaForm.onsubmit = null
    areaForm.addEventListener('submit', saveServiceArea)
  }
  
  // Hours form  
  const hoursForm = document.querySelector('form[onsubmit*="saveHours"]')
  if (hoursForm) {
    console.log('Hours form found, adding event listener')
    // Remove any existing event listeners and add new one
    hoursForm.onsubmit = null
    hoursForm.addEventListener('submit', saveHours)
  }
  
  // Also try to find forms by ID since they might not be loaded yet
  setTimeout(() => {
    const addAreaForm = document.getElementById('addAreaForm')
    if (addAreaForm) {
      const form = addAreaForm.querySelector('form')
      if (form && !form.hasAttribute('data-listener-added')) {
        console.log('Adding listener to area form by ID')
        form.setAttribute('data-listener-added', 'true')
        form.addEventListener('submit', saveServiceArea)
      }
    }
    
    const hoursEditForm = document.getElementById('hoursEditForm')
    if (hoursEditForm) {
      const form = hoursEditForm.querySelector('form')
      if (form && !form.hasAttribute('data-listener-added')) {
        console.log('Adding listener to hours form by ID')
        form.setAttribute('data-listener-added', 'true')
        form.addEventListener('submit', saveHours)
      }
    }
  }, 2000)
}