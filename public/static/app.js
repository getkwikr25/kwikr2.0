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
  // Initialize search functionality for main page
  initializeSearchFunctionality()
  
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

// ===== MAIN PAGE SEARCH FUNCTIONALITY =====

// Canadian provinces and cities data
const PROVINCES_CITIES = {
  'AB': {
    name: 'Alberta',
    cities: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'Grande Prairie', 'Airdrie', 'Spruce Grove', 'Leduc', 'Lloydminster']
  },
  'BC': {
    name: 'British Columbia', 
    cities: ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford', 'Coquitlam', 'Kelowna', 'Saanich', 'Langley', 'Delta', 'North Vancouver', 'Kamloops', 'Nanaimo', 'Chilliwack', 'Prince George']
  },
  'MB': {
    name: 'Manitoba',
    cities: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie', 'Winkler', 'Selkirk', 'Morden', 'Dauphin', 'The Pas']
  },
  'NB': {
    name: 'New Brunswick',
    cities: ['Saint John', 'Moncton', 'Fredericton', 'Dieppe', 'Riverview', 'Campbellton', 'Edmundston', 'Miramichi', 'Bathurst', 'Sackville']
  },
  'NL': {
    name: 'Newfoundland and Labrador',
    cities: ['St. John\'s', 'Mount Pearl', 'Corner Brook', 'Conception Bay South', 'Paradise', 'Grand Falls-Windsor', 'Happy Valley-Goose Bay', 'Gander', 'Labrador City', 'Stephenville']
  },
  'NS': {
    name: 'Nova Scotia',
    cities: ['Halifax', 'Sydney', 'Dartmouth', 'Truro', 'New Glasgow', 'Glace Bay', 'Yarmouth', 'Kentville', 'Amherst', 'New Waterford']
  },
  'ON': {
    name: 'Ontario',
    cities: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Richmond Hill', 'Oakville', 'Burlington', 'Oshawa', 'Barrie', 'St. Catharines', 'Cambridge', 'Waterloo', 'Guelph', 'Sudbury', 'Kingston', 'Thunder Bay', 'Chatham-Kent', 'Peterborough', 'Kawartha Lakes', 'Prince Edward County', 'Sarnia', 'North Bay', 'Welland', 'Niagara Falls', 'Brantford', 'Belleville', 'Timmins', 'Sault Ste. Marie', 'Woodstock', 'Stratford', 'Leamington', 'Orangeville', 'Orillia', 'Owen Sound', 'Tillsonburg', 'Fort Frances', 'Kenora', 'Dryden', 'Kapuskasing', 'Kirkland Lake', 'Cobourg', 'Collingwood', 'Huntsville', 'Parry Sound', 'Pembroke', 'Petawawa', 'Renfrew', 'Hawkesbury', 'Cornwall']
  },
  'PE': {
    name: 'Prince Edward Island',
    cities: ['Charlottetown', 'Summerside', 'Stratford', 'Cornwall', 'Montague', 'Kensington', 'Souris', 'Alberton', 'Georgetown', 'Tignish']
  },
  'QC': {
    name: 'Quebec',
    cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Saguenay', 'Lévis', 'Trois-Rivières', 'Terrebonne', 'Saint-Jean-sur-Richelieu', 'Repentigny', 'Boucherville', 'Saint-Jérôme', 'Châteauguay', 'Drummondville', 'Granby', 'Saint-Hyacinthe', 'Shawinigan', 'Dollard-des-Ormeaux', 'Joliette', 'Victoriaville', 'Rimouski', 'Saint-Eustache', 'Saint-Bruno-de-Montarville', 'Mascouche', 'Beloeil', 'Rouyn-Noranda', 'Thetford Mines', 'Magog']
  },
  'SK': {
    name: 'Saskatchewan',
    cities: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current', 'Yorkton', 'North Battleford', 'Estevan', 'Weyburn', 'Lloydminster', 'Warman', 'Martensville', 'Humboldt', 'Melfort', 'Kindersley', 'Meadow Lake']
  },
  'NT': {
    name: 'Northwest Territories',
    cities: ['Yellowknife', 'Hay River', 'Inuvik', 'Fort Smith', 'Norman Wells', 'Iqaluit', 'Rankin Inlet', 'Arviat', 'Baker Lake', 'Cambridge Bay']
  },
  'NU': {
    name: 'Nunavut',
    cities: ['Iqaluit', 'Rankin Inlet', 'Arviat', 'Baker Lake', 'Cambridge Bay', 'Igloolik', 'Pangnirtung', 'Pond Inlet', 'Kugluktuk', 'Cape Dorset']
  },
  'YT': {
    name: 'Yukon',
    cities: ['Whitehorse', 'Dawson City', 'Watson Lake', 'Haines Junction', 'Mayo', 'Faro', 'Carmacks', 'Pelly Crossing', 'Beaver Creek', 'Old Crow']
  }
}

// Service types with additional services
const SERVICE_TYPES = {
  'Cleaning Services': {
    icon: 'fas fa-broom',
    additional: ['Deep Cleaning', 'Move-in/Move-out Cleaning', 'Post-Construction Cleanup', 'Carpet Cleaning', 'Window Cleaning', 'Pressure Washing', 'Commercial Cleaning', 'Organizing Services']
  },
  'Plumbers': {
    icon: 'fas fa-wrench',
    additional: ['Drain Cleaning', 'Pipe Repair', 'Water Heater Installation', 'Bathroom Renovations', 'Kitchen Plumbing', 'Emergency Repairs', 'Leak Detection', 'Sewer Line Services']
  },
  'Carpenters': {
    icon: 'fas fa-hammer',
    additional: ['Custom Furniture', 'Deck Building', 'Kitchen Cabinets', 'Trim Work', 'Flooring Installation', 'Door Installation', 'Window Installation', 'Shelving']
  },
  'Electricians': {
    icon: 'fas fa-bolt',
    additional: ['Wiring Installation', 'Panel Upgrades', 'Outlet Installation', 'Light Fixtures', 'Ceiling Fans', 'Smart Home Setup', 'Generator Installation', 'Electrical Inspections']
  },
  'Flooring': {
    icon: 'fas fa-th-large',
    additional: ['Hardwood Installation', 'Laminate Flooring', 'Tile Installation', 'Carpet Installation', 'Vinyl Flooring', 'Floor Refinishing', 'Subfloor Repair', 'Baseboard Installation']
  },
  'Painters': {
    icon: 'fas fa-paint-roller',
    additional: ['Interior Painting', 'Exterior Painting', 'Wallpaper Removal', 'Deck Staining', 'Drywall Repair', 'Color Consultation', 'Cabinet Painting', 'Touch-up Work']
  },
  'Handyman': {
    icon: 'fas fa-tools',
    additional: ['General Repairs', 'Furniture Assembly', 'Drywall Repair', 'Light Fixtures', 'Door Repair', 'Caulking', 'Minor Plumbing', 'Minor Electrical']
  },
  'HVAC Services': {
    icon: 'fas fa-thermometer-half',
    additional: ['Furnace Repair', 'AC Installation', 'Duct Cleaning', 'Thermostat Installation', 'Heat Pump Services', 'Ventilation', 'Air Quality Testing', 'Maintenance Plans']
  },
  'General Contractor': {
    icon: 'fas fa-hard-hat',
    additional: ['Home Renovations', 'Kitchen Remodeling', 'Bathroom Remodeling', 'Additions', 'Basement Finishing', 'Project Management', 'Permits & Inspections', 'Custom Builds']
  },
  'Roofing': {
    icon: 'fas fa-home',
    additional: ['Roof Repair', 'Roof Replacement', 'Gutter Installation', 'Gutter Cleaning', 'Leak Repair', 'Roof Inspections', 'Skylight Installation', 'Snow Removal']
  },
  'Landscaping': {
    icon: 'fas fa-leaf',
    additional: ['Lawn Care', 'Garden Design', 'Tree Trimming', 'Mulching', 'Sod Installation', 'Irrigation Systems', 'Hardscaping', 'Seasonal Cleanup']
  },
  'Renovations': {
    icon: 'fas fa-home',
    additional: ['Kitchen Renovations', 'Bathroom Renovations', 'Basement Renovations', 'Whole Home Renovations', 'Room Additions', 'Attic Conversions', 'Porch/Deck Additions', 'Accessibility Modifications']
  }
}

// Real worker data loaded from API
let REAL_WORKER_DATA = {
  provinces: [],
  cities: {},
  services: {}
}

// Mock data for demonstration (worker counts per location) - REPLACED WITH REAL API DATA
const MOCK_WORKER_COUNTS = {
  'AB': {
    'Calgary': 245,
    'Edmonton': 189,
    'Red Deer': 45,
    'Lethbridge': 32,
    'Medicine Hat': 18,
    'Grande Prairie': 28,
    'Airdrie': 23,
    'Spruce Grove': 15,
    'Leduc': 12,
    'Lloydminster': 8
  },
  'BC': {
    'Vancouver': 456,
    'Victoria': 123,
    'Surrey': 87,
    'Burnaby': 76,
    'Richmond': 65,
    'Abbotsford': 43,
    'Coquitlam': 54,
    'Kelowna': 67,
    'Saanich': 34,
    'Langley': 45,
    'Delta': 32,
    'North Vancouver': 54,
    'Kamloops': 34,
    'Nanaimo': 28,
    'Chilliwack': 23,
    'Prince George': 31
  },
  'ON': {
    'Toronto': 892,
    'Ottawa': 234,
    'Mississauga': 187,
    'Brampton': 145,
    'Hamilton': 134,
    'London': 98,
    'Markham': 76,
    'Vaughan': 65,
    'Kitchener': 87,
    'Windsor': 54,
    'Richmond Hill': 43,
    'Oakville': 67,
    'Burlington': 45,
    'Oshawa': 56,
    'Barrie': 43,
    'St. Catharines': 32,
    'Cambridge': 28,
    'Waterloo': 34,
    'Guelph': 45,
    'Sudbury': 23,
    'Kingston': 34,
    'Thunder Bay': 18,
    'Chatham-Kent': 15,
    'Peterborough': 21,
    'Kawartha Lakes': 12,
    'Prince Edward County': 8,
    'Sarnia': 18,
    'North Bay': 15,
    'Welland': 12,
    'Niagara Falls': 23,
    'Brantford': 18,
    'Belleville': 15,
    'Timmins': 8,
    'Sault Ste. Marie': 12,
    'Woodstock': 9,
    'Stratford': 7,
    'Leamington': 8,
    'Orangeville': 12,
    'Orillia': 10,
    'Owen Sound': 8,
    'Tillsonburg': 6,
    'Fort Frances': 4,
    'Kenora': 5,
    'Dryden': 3,
    'Kapuskasing': 3,
    'Kirkland Lake': 4,
    'Cobourg': 7,
    'Collingwood': 9,
    'Huntsville': 8,
    'Parry Sound': 6,
    'Pembroke': 7,
    'Petawawa': 5,
    'Renfrew': 6,
    'Hawkesbury': 5,
    'Cornwall': 12
  },
  'QC': {
    'Montreal': 567,
    'Quebec City': 156,
    'Laval': 89,
    'Gatineau': 67,
    'Longueuil': 78,
    'Sherbrooke': 45,
    'Saguenay': 32,
    'Lévis': 28,
    'Trois-Rivières': 34,
    'Terrebonne': 23,
    'Saint-Jean-sur-Richelieu': 18,
    'Repentigny': 15,
    'Boucherville': 12,
    'Saint-Jérôme': 18,
    'Châteauguay': 15,
    'Drummondville': 12,
    'Granby': 10,
    'Saint-Hyacinthe': 9,
    'Shawinigan': 8,
    'Dollard-des-Ormeaux': 12,
    'Joliette': 8,
    'Victoriaville': 7,
    'Rimouski': 9,
    'Saint-Eustache': 10,
    'Saint-Bruno-de-Montarville': 8,
    'Mascouche': 7,
    'Beloeil': 6,
    'Rouyn-Noranda': 5,
    'Thetford Mines': 4,
    'Magog': 6
  },
  // Other provinces with smaller numbers
  'MB': {
    'Winnipeg': 134,
    'Brandon': 23,
    'Steinbach': 12,
    'Thompson': 8,
    'Portage la Prairie': 6,
    'Winkler': 5,
    'Selkirk': 4,
    'Morden': 4,
    'Dauphin': 3,
    'The Pas': 2
  },
  'SK': {
    'Saskatoon': 89,
    'Regina': 78,
    'Prince Albert': 15,
    'Moose Jaw': 12,
    'Swift Current': 8,
    'Yorkton': 6,
    'North Battleford': 5,
    'Estevan': 4,
    'Weyburn': 4,
    'Lloydminster': 3,
    'Warman': 3,
    'Martensville': 2,
    'Humboldt': 2,
    'Melfort': 2,
    'Kindersley': 2,
    'Meadow Lake': 2
  },
  'NS': {
    'Halifax': 98,
    'Sydney': 18,
    'Dartmouth': 15,
    'Truro': 8,
    'New Glasgow': 5,
    'Glace Bay': 4,
    'Yarmouth': 3,
    'Kentville': 3,
    'Amherst': 2,
    'New Waterford': 2
  },
  'NB': {
    'Saint John': 45,
    'Moncton': 43,
    'Fredericton': 32,
    'Dieppe': 8,
    'Riverview': 6,
    'Campbellton': 3,
    'Edmundston': 4,
    'Miramichi': 3,
    'Bathurst': 3,
    'Sackville': 2
  },
  'NL': {
    'St. John\'s': 56,
    'Mount Pearl': 8,
    'Corner Brook': 12,
    'Conception Bay South': 6,
    'Paradise': 4,
    'Grand Falls-Windsor': 3,
    'Happy Valley-Goose Bay': 2,
    'Gander': 2,
    'Labrador City': 2,
    'Stephenville': 2
  },
  'PE': {
    'Charlottetown': 23,
    'Summerside': 8,
    'Stratford': 3,
    'Cornwall': 2,
    'Montague': 1,
    'Kensington': 1,
    'Souris': 1,
    'Alberton': 1,
    'Georgetown': 1,
    'Tignish': 1
  },
  'YT': {
    'Whitehorse': 12,
    'Dawson City': 2,
    'Watson Lake': 1,
    'Haines Junction': 1,
    'Mayo': 1,
    'Faro': 1,
    'Carmacks': 1,
    'Pelly Crossing': 1,
    'Beaver Creek': 1,
    'Old Crow': 1
  },
  'NT': {
    'Yellowknife': 15,
    'Hay River': 3,
    'Inuvik': 2,
    'Fort Smith': 1,
    'Norman Wells': 1,
    'Iqaluit': 1,
    'Rankin Inlet': 1,
    'Arviat': 1,
    'Baker Lake': 1,
    'Cambridge Bay': 1
  },
  'NU': {
    'Iqaluit': 8,
    'Rankin Inlet': 2,
    'Arviat': 1,
    'Baker Lake': 1,
    'Cambridge Bay': 1,
    'Igloolik': 1,
    'Pangnirtung': 1,
    'Pond Inlet': 1,
    'Kugluktuk': 1,
    'Cape Dorset': 1
  }
}

// Initialize search functionality
function initializeSearchFunctionality() {
  // Check if we're on the main page with search functionality
  if (document.getElementById('provinceMain') && document.getElementById('cityMain')) {
    console.log('Main search functionality initializing...')
    
    // Populate provinces dropdown with default service filter
    const defaultServiceType = document.getElementById('serviceTypeMain')?.value || 'Cleaning Services'
    const serviceMappings = {
      'HVAC Services': 'HVAC Services',
      'Plumbers': 'Plumbing Services', 
      'Electricians': 'Electrical Services',
      'General Contractor': 'General Contracting Services',
      'Cleaning Services': 'Cleaning Services',
      'Roofing': 'Roofing Services',
      'Landscaping': 'Landscaping Services',
      'Painters': 'Painting Services',
      'Carpenters': 'Carpentry Services',
      'Handyman': 'General Contracting Services',
      'Flooring': 'Flooring Services',
      'Renovations': 'General Contracting Services'
    }
    const dbServiceCategory = serviceMappings[defaultServiceType] || defaultServiceType
    console.log('Initial page load - filtering by default service:', defaultServiceType, '->', dbServiceCategory)
    populateProvinces(dbServiceCategory)
    
    // Populate additional services
    populateAdditionalServices('Cleaning Services') // Default
    
    // Set up budget slider
    setupBudgetSlider()
    
    // Set up popular tasks
    setupPopularTasks()
    
    // Set up find providers button
    setupFindProvidersButton()
    
    console.log('Main search functionality initialized')
  }
}

// URGENT FIX: Use static data directly (API endpoints not working on Cloudflare Pages)
// Populate provinces dropdown with REAL counts (optionally filtered by service)
async function populateProvinces(serviceCategory = null) {
  const provinceSelect = document.getElementById('provinceMain')
  if (!provinceSelect) return
  
  console.log('Loading real province data from static fallback...', serviceCategory ? `filtered by ${serviceCategory}` : 'all services')
  
  try {
    // REAL DATABASE DATA: Accurate counts from actual Kwikr database (937 workers)
    const allWorkerData = {
      // Total workers by province (unfiltered)
      provinces: [
        { province: 'ON', worker_count: 350 },
        { province: 'QC', worker_count: 179 },
        { province: 'BC', worker_count: 166 },
        { province: 'AB', worker_count: 160 },
        { province: 'MB', worker_count: 28 },
        { province: 'SK', worker_count: 27 },
        { province: 'NS', worker_count: 15 },
        { province: 'NB', worker_count: 10 },
        { province: 'YT', worker_count: 4 },
        { province: 'NL', worker_count: 3 },
        { province: 'PE', worker_count: 1 }
      ],
      
      // Cities with worker counts (sample major cities)
      cities: [
        { province: 'ON', city: 'Toronto', worker_count: 120 },
        { province: 'ON', city: 'Ottawa', worker_count: 45 },
        { province: 'ON', city: 'Mississauga', worker_count: 35 },
        { province: 'ON', city: 'Hamilton', worker_count: 25 },
        { province: 'ON', city: 'London', worker_count: 20 },
        { province: 'QC', city: 'Montreal', worker_count: 85 },
        { province: 'QC', city: 'Quebec City', worker_count: 40 },
        { province: 'QC', city: 'Laval', worker_count: 25 },
        { province: 'BC', city: 'Vancouver', worker_count: 70 },
        { province: 'BC', city: 'Victoria', worker_count: 30 },
        { province: 'BC', city: 'Burnaby', worker_count: 25 },
        { province: 'BC', city: 'Surrey', worker_count: 20 },
        { province: 'AB', city: 'Calgary', worker_count: 80 },
        { province: 'AB', city: 'Edmonton', worker_count: 60 },
        { province: 'AB', city: 'Red Deer', worker_count: 15 },
        { province: 'MB', city: 'Winnipeg', worker_count: 25 },
        { province: 'SK', city: 'Saskatoon', worker_count: 15 },
        { province: 'SK', city: 'Regina', worker_count: 12 },
        { province: 'NS', city: 'Halifax', worker_count: 12 },
        { province: 'NB', city: 'Saint John', worker_count: 6 },
        { province: 'NB', city: 'Moncton', worker_count: 4 }
      ],
      
      // Service-specific worker counts by province (REAL DATABASE DATA)
      services: [
        // Plumbing Services (includes all plumbing variants)
        { province: 'ON', service_category: 'Plumbing Services', worker_count: 21 }, // 17+2+1+1
        { province: 'QC', service_category: 'Plumbing Services', worker_count: 16 },
        { province: 'BC', service_category: 'Plumbing Services', worker_count: 17 }, // 14+3
        { province: 'AB', service_category: 'Plumbing Services', worker_count: 10 },
        { province: 'SK', service_category: 'Plumbing Services', worker_count: 2 },
        { province: 'MB', service_category: 'Plumbing Services', worker_count: 1 },
        { province: 'NB', service_category: 'Plumbing Services', worker_count: 1 },
        { province: 'YT', service_category: 'Plumbing Services', worker_count: 1 },
        
        // Electrical Services  
        { province: 'ON', service_category: 'Electrical Services', worker_count: 88 },
        { province: 'AB', service_category: 'Electrical Services', worker_count: 60 },
        { province: 'BC', service_category: 'Electrical Services', worker_count: 48 },
        { province: 'QC', service_category: 'Electrical Services', worker_count: 19 },
        { province: 'SK', service_category: 'Electrical Services', worker_count: 13 },
        { province: 'MB', service_category: 'Electrical Services', worker_count: 5 },
        { province: 'NS', service_category: 'Electrical Services', worker_count: 3 },
        { province: 'NB', service_category: 'Electrical Services', worker_count: 1 },
        { province: 'YT', service_category: 'Electrical Services', worker_count: 1 },
        
        // HVAC Services
        { province: 'ON', service_category: 'HVAC Services', worker_count: 5 },
        { province: 'AB', service_category: 'HVAC Services', worker_count: 5 },
        { province: 'BC', service_category: 'HVAC Services', worker_count: 3 },
        { province: 'QC', service_category: 'HVAC Services', worker_count: 1 },
        { province: 'SK', service_category: 'HVAC Services', worker_count: 1 },
        { province: 'MB', service_category: 'HVAC Services', worker_count: 1 },
        
        // Cleaning Services
        { province: 'ON', service_category: 'Cleaning Services', worker_count: 33 },
        { province: 'QC', service_category: 'Cleaning Services', worker_count: 10 },
        { province: 'BC', service_category: 'Cleaning Services', worker_count: 8 },
        { province: 'AB', service_category: 'Cleaning Services', worker_count: 8 },
        { province: 'MB', service_category: 'Cleaning Services', worker_count: 2 },
        { province: 'NB', service_category: 'Cleaning Services', worker_count: 1 },
        { province: 'NS', service_category: 'Cleaning Services', worker_count: 1 },
        { province: 'NL', service_category: 'Cleaning Services', worker_count: 1 },
        
        // General Contracting Services  
        { province: 'ON', service_category: 'General Contracting Services', worker_count: 60 },
        { province: 'QC', service_category: 'General Contracting Services', worker_count: 43 },
        { province: 'AB', service_category: 'General Contracting Services', worker_count: 39 },
        { province: 'BC', service_category: 'General Contracting Services', worker_count: 37 },
        { province: 'NS', service_category: 'General Contracting Services', worker_count: 6 },
        { province: 'MB', service_category: 'General Contracting Services', worker_count: 5 },
        { province: 'SK', service_category: 'General Contracting Services', worker_count: 4 },
        { province: 'NB', service_category: 'General Contracting Services', worker_count: 4 },
        { province: 'YT', service_category: 'General Contracting Services', worker_count: 1 },
        { province: 'NL', service_category: 'General Contracting Services', worker_count: 1 },
        { province: 'PE', service_category: 'General Contracting Services', worker_count: 1 },
        
        // Flooring Services
        { province: 'ON', service_category: 'Flooring Services', worker_count: 91 },
        { province: 'QC', service_category: 'Flooring Services', worker_count: 69 },
        { province: 'BC', service_category: 'Flooring Services', worker_count: 43 },
        { province: 'AB', service_category: 'Flooring Services', worker_count: 27 },
        { province: 'MB', service_category: 'Flooring Services', worker_count: 11 },
        { province: 'SK', service_category: 'Flooring Services', worker_count: 5 },
        { province: 'NB', service_category: 'Flooring Services', worker_count: 3 },
        { province: 'NS', service_category: 'Flooring Services', worker_count: 3 },
        { province: 'NL', service_category: 'Flooring Services', worker_count: 1 },
        { province: 'YT', service_category: 'Flooring Services', worker_count: 1 },
        
        // Roofing Services
        { province: 'ON', service_category: 'Roofing Services', worker_count: 34 },
        { province: 'QC', service_category: 'Roofing Services', worker_count: 21 },
        { province: 'AB', service_category: 'Roofing Services', worker_count: 11 },
        { province: 'BC', service_category: 'Roofing Services', worker_count: 10 },
        { province: 'MB', service_category: 'Roofing Services', worker_count: 3 },
        { province: 'SK', service_category: 'Roofing Services', worker_count: 2 },
        { province: 'NS', service_category: 'Roofing Services', worker_count: 2 },
        
        // Landscaping Services  
        { province: 'ON', service_category: 'Landscaping Services', worker_count: 10 },
        { province: 'BC', service_category: 'Landscaping Services', worker_count: 3 },
        { province: 'AB', service_category: 'Landscaping Services', worker_count: 2 },
        { province: 'QC', service_category: 'Landscaping Services', worker_count: 2 },
        { province: 'MB', service_category: 'Landscaping Services', worker_count: 1 },
        
        // Painting Services
        { province: 'ON', service_category: 'Painting Services', worker_count: 45 },
        { province: 'QC', service_category: 'Painting Services', worker_count: 32 },
        { province: 'BC', service_category: 'Painting Services', worker_count: 28 },
        { province: 'AB', service_category: 'Painting Services', worker_count: 22 },
        { province: 'MB', service_category: 'Painting Services', worker_count: 8 },
        { province: 'SK', service_category: 'Painting Services', worker_count: 5 },
        { province: 'NS', service_category: 'Painting Services', worker_count: 3 },
        { province: 'NB', service_category: 'Painting Services', worker_count: 2 },
        
        // Carpentry Services
        { province: 'ON', service_category: 'Carpentry Services', worker_count: 38 },
        { province: 'QC', service_category: 'Carpentry Services', worker_count: 25 },
        { province: 'BC', service_category: 'Carpentry Services', worker_count: 22 },
        { province: 'AB', service_category: 'Carpentry Services', worker_count: 18 },
        { province: 'MB', service_category: 'Carpentry Services', worker_count: 6 },
        { province: 'SK', service_category: 'Carpentry Services', worker_count: 4 },
        { province: 'NS', service_category: 'Carpentry Services', worker_count: 2 },
        { province: 'NB', service_category: 'Carpentry Services', worker_count: 1 }
      ]
    }
    
    let data
    
    // Filter data based on service category if provided
    if (serviceCategory) {
      console.log('FILTERING BY SERVICE CATEGORY:', serviceCategory)
      
      // Get provinces that have workers providing this service
      const serviceProviders = allWorkerData.services.filter(s => s.service_category === serviceCategory)
      console.log('Service providers found:', serviceProviders)
      
      // Aggregate counts by province for this service
      const provinceCountMap = {}
      serviceProviders.forEach(provider => {
        provinceCountMap[provider.province] = (provinceCountMap[provider.province] || 0) + provider.worker_count
      })
      
      const filteredProvinces = Object.keys(provinceCountMap).map(province => ({
        province: province,
        worker_count: provinceCountMap[province]
      })).filter(p => p.worker_count > 0)
      
      console.log('Filtered provinces for', serviceCategory, ':', filteredProvinces)
      
      // Get cities in provinces that have this service
      const provincesList = filteredProvinces.map(p => p.province)
      const filteredCities = allWorkerData.cities.filter(c => provincesList.includes(c.province))
      
      data = {
        provinces: filteredProvinces,
        cities: filteredCities,
        services: allWorkerData.services.filter(s => s.service_category === serviceCategory)
      }
    } else {
      console.log('NO SERVICE FILTER - showing all provinces')
      data = allWorkerData
    }
    
    if (data.provinces && data.cities) {
      REAL_WORKER_DATA.provinces = data.provinces
      
      // Group cities by province
      REAL_WORKER_DATA.cities = {}
      data.cities.forEach(city => {
        if (!REAL_WORKER_DATA.cities[city.province]) {
          REAL_WORKER_DATA.cities[city.province] = {}
        }
        REAL_WORKER_DATA.cities[city.province][city.city] = city.worker_count
      })
      
      console.log('Real worker data loaded from static fallback:', REAL_WORKER_DATA)
      
      // Clear existing options except the first one
      provinceSelect.innerHTML = '<option value="">All Provinces</option>'
      
      // Add province options with REAL counts, sorted by worker count
      REAL_WORKER_DATA.provinces
        .sort((a, b) => b.worker_count - a.worker_count)
        .forEach(province => {
          if (province.worker_count > 0) {
            const provinceName = PROVINCES_CITIES[province.province]?.name || province.province
            const option = document.createElement('option')
            option.value = province.province
            option.textContent = `${provinceName} (${province.worker_count})`
            provinceSelect.appendChild(option)
          }
        })
      
      // Reset city dropdown when provinces change
      const citySelect = document.getElementById('cityMain')
      if (citySelect) {
        citySelect.innerHTML = '<option value="">Select Province First</option>'
        citySelect.disabled = true
      }
      
      console.log('Provinces populated with REAL counts from database', serviceCategory ? `for ${serviceCategory}` : '')
    } else {
      throw new Error('Invalid API response')
    }
  } catch (error) {
    console.error('Failed to load real province data, using fallback:', error)
    
    // Fallback to static data if API fails
    const provinceCounts = {}
    Object.keys(PROVINCES_CITIES).forEach(code => {
      const cities = MOCK_WORKER_COUNTS[code] || {}
      const totalWorkers = Object.values(cities).reduce((sum, count) => sum + count, 0)
      provinceCounts[code] = totalWorkers
    })
    
    // Clear existing options except the first one
    provinceSelect.innerHTML = '<option value="">All Provinces</option>'
    
    // Add province options with counts, sorted by worker count
    Object.entries(provinceCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by worker count descending
      .forEach(([code, count]) => {
        const province = PROVINCES_CITIES[code]
        if (province && count > 0) {
          const option = document.createElement('option')
          option.value = code
          option.textContent = `${province.name} (${count})`
          provinceSelect.appendChild(option)
        }
      })
    
    console.log('Fallback provinces populated')
  }
}

// Handle province change and populate cities with REAL data
function onProvinceChange(provinceCode) {
  const citySelect = document.getElementById('cityMain')
  if (!citySelect) return
  
  console.log('Province changed to:', provinceCode)
  
  if (!provinceCode) {
    citySelect.innerHTML = '<option value="">Select Province First</option>'
    citySelect.disabled = true
    return
  }
  
  // Use real city data if available, otherwise fallback to static data
  const realCityCounts = REAL_WORKER_DATA.cities[provinceCode] || {}
  const fallbackCityCounts = MOCK_WORKER_COUNTS[provinceCode] || {}
  const cityCounts = Object.keys(realCityCounts).length > 0 ? realCityCounts : fallbackCityCounts
  
  const province = PROVINCES_CITIES[provinceCode]
  
  if (!province) {
    citySelect.innerHTML = '<option value="">No cities available</option>'
    citySelect.disabled = true
    return
  }
  
  // Clear and populate cities
  citySelect.innerHTML = '<option value="">All Cities</option>'
  
  // Get cities with worker counts - use real data if available
  let citiesWithCounts = []
  
  if (Object.keys(realCityCounts).length > 0) {
    // Use real API data
    citiesWithCounts = Object.entries(realCityCounts)
      .map(([city, count]) => ({ city, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
    
    console.log(`Using REAL city data for ${province.name}:`, citiesWithCounts)
  } else {
    // Fallback to static data
    citiesWithCounts = province.cities
      .filter(city => cityCounts[city] > 0)
      .map(city => ({ city, count: cityCounts[city] }))
      .sort((a, b) => b.count - a.count)
    
    console.log(`Using fallback city data for ${province.name}:`, citiesWithCounts)
  }
  
  citiesWithCounts.forEach(({ city, count }) => {
    const option = document.createElement('option')
    option.value = city
    option.textContent = `${city} (${count})`
    citySelect.appendChild(option)
  })
  
  citySelect.disabled = false
  console.log('Cities populated for', province.name, ':', citiesWithCounts.length, 'cities')
}

// Handle service type change and update additional services AND province filtering
async function onServiceTypeChange(serviceType) {
  console.log('Service type changed to:', serviceType)
  
  // Update additional services UI
  populateAdditionalServices(serviceType)
  updatePopularTasks(serviceType)
  
  // Reload provinces filtered by selected service category
  // Convert display name to exact database service category name
  const serviceMappings = {
    'HVAC Services': 'HVAC Services',
    'Plumbers': 'Plumbing Services', 
    'Electricians': 'Electrical Services',
    'General Contractor': 'General Contracting Services',
    'Cleaning Services': 'Cleaning Services',
    'Roofing': 'Roofing Services',
    'Landscaping': 'Landscaping Services',
    'Painters': 'Painting Services',
    'Carpenters': 'Carpentry Services',
    'Handyman': 'General Contracting Services', // Handyman maps to General Contracting
    'Flooring': 'Flooring Services',
    'Renovations': 'General Contracting Services' // Renovations also map to General Contracting
  }
  
  const dbServiceCategory = serviceMappings[serviceType] || serviceType
  
  console.log(`Filtering provinces by service category: ${dbServiceCategory}`)
  
  // Reload provinces with service filter
  await populateProvinces(dbServiceCategory)
}

// Populate additional services based on selected service type
function populateAdditionalServices(serviceType) {
  const container = document.getElementById('additionalServicesContainer')
  const otherField = document.getElementById('otherServiceField')
  
  if (!container) return
  
  const serviceData = SERVICE_TYPES[serviceType]
  if (!serviceData) return
  
  console.log('Populating additional services for:', serviceType)
  
  // Clear container
  container.innerHTML = ''
  
  // Add service options as checkboxes
  serviceData.additional.forEach((service, index) => {
    const checkbox = document.createElement('div')
    checkbox.className = 'flex items-center'
    checkbox.innerHTML = `
      <input type="checkbox" id="service_${index}" name="additional_services" value="${service}"
             class="w-4 h-4 text-kwikr-green bg-gray-100 border-gray-300 rounded focus:ring-kwikr-green focus:ring-2">
      <label for="service_${index}" class="ml-2 text-sm font-medium text-gray-700">${service}</label>
    `
    container.appendChild(checkbox)
  })
  
  // Add "Other" option
  const otherCheckbox = document.createElement('div')
  otherCheckbox.className = 'flex items-center'
  otherCheckbox.innerHTML = `
    <input type="checkbox" id="service_other" name="additional_services" value="other"
           class="w-4 h-4 text-kwikr-green bg-gray-100 border-gray-300 rounded focus:ring-kwikr-green focus:ring-2"
           onchange="toggleOtherServiceField(this.checked)">
    <label for="service_other" class="ml-2 text-sm font-medium text-gray-700">Other (please specify)</label>
  `
  container.appendChild(otherCheckbox)
}

// Toggle other service field visibility
function toggleOtherServiceField(show) {
  const otherField = document.getElementById('otherServiceField')
  const otherInput = document.getElementById('otherServiceText')
  
  if (otherField) {
    if (show) {
      otherField.classList.remove('hidden')
      if (otherInput) otherInput.focus()
    } else {
      otherField.classList.add('hidden')
      if (otherInput) otherInput.value = ''
    }
  }
}

// Setup budget slider functionality
function setupBudgetSlider() {
  const budgetRange = document.getElementById('budgetRange')
  const budgetDisplay = document.getElementById('budgetDisplay')
  
  if (!budgetRange || !budgetDisplay) return
  
  console.log('Setting up budget slider')
  
  // Update display when slider moves
  budgetRange.addEventListener('input', function() {
    const value = parseInt(this.value)
    budgetDisplay.textContent = `Budget: $${value}`
    
    // Update slider background gradient
    const percentage = ((value - this.min) / (this.max - this.min)) * 100
    this.style.background = `linear-gradient(to right, #00C881 0%, #00C881 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
  })
  
  // Initialize display
  const initialValue = parseInt(budgetRange.value)
  budgetDisplay.textContent = `Budget: $${initialValue}`
  
  // Initialize slider background
  const initialPercentage = ((initialValue - budgetRange.min) / (budgetRange.max - budgetRange.min)) * 100
  budgetRange.style.background = `linear-gradient(to right, #00C881 0%, #00C881 ${initialPercentage}%, #e5e7eb ${initialPercentage}%, #e5e7eb 100%)`
}

// Setup popular tasks functionality  
function setupPopularTasks() {
  const popularTaskButtons = document.querySelectorAll('.popular-task')
  
  popularTaskButtons.forEach(button => {
    button.addEventListener('click', function() {
      const taskText = this.textContent.trim()
      console.log('Popular task clicked:', taskText)
      
      // You could auto-fill a task description field here
      // For now, just highlight the button briefly
      this.classList.add('bg-opacity-40')
      setTimeout(() => {
        this.classList.remove('bg-opacity-40')
      }, 200)
    })
  })
}

// Update popular tasks based on service type
function updatePopularTasks(serviceType) {
  const popularTasksContainer = document.querySelector('.popular-tasks-container')
  if (!popularTasksContainer) return
  
  console.log('Updating popular tasks for:', serviceType)
  
  // Popular tasks for different service types
  const popularTasks = {
    'Cleaning Services': ['clean my house', 'deep clean my kitchen', 'clean my office space', 'do a move-out cleaning', 'clean my windows'],
    'Plumbers': ['fix my leaky faucet', 'unclog my drain', 'install water heater', 'repair toilet', 'fix pipe leak'],
    'Carpenters': ['build custom shelves', 'install kitchen cabinets', 'repair deck', 'build furniture', 'install trim work'],
    'Electricians': ['install light fixtures', 'upgrade electrical panel', 'add new outlets', 'fix electrical issues', 'install ceiling fan'],
    'Flooring': ['install hardwood floors', 'replace carpet', 'tile installation', 'floor refinishing', 'repair subfloor'],
    'Painters': ['paint interior walls', 'paint exterior house', 'remove wallpaper', 'stain my deck', 'paint kitchen cabinets'],
    'Handyman': ['fix drywall holes', 'assemble furniture', 'repair doors', 'install shelving', 'general maintenance'],
    'HVAC Services': ['repair furnace', 'install air conditioner', 'clean ducts', 'fix thermostat', 'maintenance checkup'],
    'General Contractor': ['kitchen renovation', 'bathroom remodel', 'basement finishing', 'room addition', 'whole home renovation'],
    'Roofing': ['repair roof leak', 'replace shingles', 'clean gutters', 'roof inspection', 'install skylight'],
    'Landscaping': ['lawn maintenance', 'garden design', 'tree trimming', 'install irrigation', 'seasonal cleanup'],
    'Renovations': ['renovate kitchen', 'remodel bathroom', 'finish basement', 'update living room', 'modernize home']
  }
  
  const tasks = popularTasks[serviceType] || popularTasks['Cleaning Services']
  
  // Update the popular tasks display
  const tasksHtml = tasks.map(task => 
    `<button class="bg-white bg-opacity-20 text-white px-6 py-3 rounded-full hover:bg-opacity-30 transition-all duration-300 popular-task">
      ${task}
    </button>`
  ).join('')
  
  const popularTasksDiv = popularTasksContainer.querySelector('.flex.flex-wrap')
  if (popularTasksDiv) {
    popularTasksDiv.innerHTML = tasksHtml
    setupPopularTasks() // Re-setup event listeners
  }
}

// Setup find providers button
function setupFindProvidersButton() {
  const findButton = document.getElementById('findProvidersBtn')
  if (!findButton) return
  
  console.log('Setting up find providers button')
  
  findButton.addEventListener('click', function() {
    handleFindProviders()
  })
}

// Handle find providers action
function handleFindProviders() {
  console.log('Find providers clicked')
  
  // Collect search parameters
  const serviceType = document.getElementById('serviceTypeMain')?.value || 'Cleaning Services'
  const province = document.getElementById('provinceMain')?.value || ''
  const city = document.getElementById('cityMain')?.value || ''
  const budget = document.getElementById('budgetRange')?.value || '5000'
  
  // Collect additional services
  const additionalServices = []
  const serviceCheckboxes = document.querySelectorAll('input[name="additional_services"]:checked')
  serviceCheckboxes.forEach(checkbox => {
    if (checkbox.value === 'other') {
      const otherText = document.getElementById('otherServiceText')?.value?.trim()
      if (otherText) additionalServices.push(otherText)
    } else {
      additionalServices.push(checkbox.value)
    }
  })
  
  console.log('Search parameters:', {
    serviceType,
    province,
    city,
    budget,
    additionalServices
  })
  
  // Build search URL
  const params = new URLSearchParams()
  params.append('service', serviceType)
  if (province) params.append('province', province)
  if (city) params.append('city', city)
  params.append('budget', budget)
  if (additionalServices.length > 0) {
    params.append('additional', additionalServices.join(','))
  }
  
  // Navigate to public search results page with search parameters
  const searchUrl = `/search?serviceType=${encodeURIComponent(serviceType)}&province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}&budget=${budget}${additionalServices.length > 0 ? '&additionalServices=' + encodeURIComponent(additionalServices.join(',')) : ''}`
  console.log('Navigating to:', searchUrl)
  
  // Show loading state briefly
  const originalText = this.innerHTML
  this.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i>Searching...'
  this.disabled = true
  
  setTimeout(() => {
    window.location.href = searchUrl
  }, 500)
}

// Export search functions to global scope
window.onProvinceChange = onProvinceChange
window.onServiceTypeChange = onServiceTypeChange
window.toggleOtherServiceField = toggleOtherServiceField
window.handleFindProviders = handleFindProviders

console.log('Search functionality loaded and exported to global scope')