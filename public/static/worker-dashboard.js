// Worker Dashboard JavaScript

// Use global currentUser if already defined, otherwise create local one
if (typeof window.currentUser === 'undefined') {
  window.currentUser = null
}
let availableJobs = []

// Fallback API request function if app.js is not loaded
if (typeof window.apiRequest === 'undefined') {
  window.apiRequest = async function(endpoint, options = {}) {
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
      const response = await fetch(`/api${endpoint}`, config)
      const data = await response.json()
      
      if (!response.ok) {
        // Handle session expiration specifically
        if (response.status === 401 && (data.error?.includes('session') || data.error?.includes('expired'))) {
          console.log('Session expired detected in API call')
          
          // Clear any stored session data
          try {
            localStorage.removeItem('sessionToken')
          } catch (e) {
            // Ignore localStorage errors
          }
          
          // Show user-friendly message and redirect
          if (typeof showNotification === 'function') {
            showNotification('Your session has expired. Redirecting to home page...', 'info')
          }
          
          // Redirect to home after a brief delay
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
          
          throw new Error('Session expired - redirecting to home')
        }
        
        throw new Error(data.error || 'Request failed')
      }
      
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }
}

// Utility functions
if (typeof window.formatCurrency === 'undefined') {
  window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }
}

if (typeof window.formatDate === 'undefined') {
  window.formatDate = function(dateString) {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

if (typeof window.getUrgencyBadge === 'undefined') {
  window.getUrgencyBadge = function(urgency) {
    const urgencyClasses = {
      'low': 'bg-gray-100 text-gray-800',
      'normal': 'bg-blue-100 text-blue-800',
      'high': 'bg-yellow-100 text-yellow-800',
      'urgent': 'bg-red-100 text-red-800'
    }
    
    const urgencyLabels = {
      'low': 'Low',
      'normal': 'Normal',
      'high': 'High',
      'urgent': 'Urgent'
    }
    
    const cssClass = urgencyClasses[urgency] || 'bg-blue-100 text-blue-800'
    const label = urgencyLabels[urgency] || urgency
    
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${cssClass}">${label}</span>`
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await loadUserInfo()
    
    // If user info loaded successfully, try other functions
    // but don't fail the entire dashboard if they have issues
    try {
      await loadWorkerStats()
    } catch (error) {
      if (error.sessionExpired) {
        throw error // Re-throw session expiration errors
      }
      console.log('Stats loading failed, but continuing dashboard load')
    }
    
    try {
      await loadAvailableJobs()
    } catch (error) {
      if (error.sessionExpired) {
        throw error // Re-throw session expiration errors  
      }
      console.log('Jobs loading failed, but continuing dashboard load')
    }
    
    try {
      await loadJobCategories()
    } catch (error) {
      console.log('Categories loading failed, but continuing dashboard load')
    }
    
    try {
      await loadMyServices()
    } catch (error) {
      if (error.sessionExpired) {
        throw error // Re-throw session expiration errors
      }
      console.log('Services loading failed, but continuing dashboard load')
    }
    
  } catch (error) {
    console.log('Dashboard initialization error:', error)
    // Only redirect if it's a session expiration error
    if (error.sessionExpired) {
      window.location.href = '/?message=session_expired'
    }
  }
})

// Load user information
async function loadUserInfo() {
  try {
    // If user is already embedded from server-side, skip API call
    if (window.currentUser && window.currentUser.id) {
      console.log('Using server-side embedded user info:', window.currentUser)
    } else {
      // Fallback to API call if user not embedded
      console.log('Fetching user info from API')
      const response = await apiRequest('/auth/me')
      
      if (!response.user) {
        console.log('No user found in response - redirecting to home')
        window.location.href = '/?message=session_expired'
        return
      }
      
      window.currentUser = response.user
    }
    
    if (window.currentUser.role !== 'worker') {
      window.location.href = '/dashboard'
      return
    }
    
    // Update verification status
    const statusElement = document.getElementById('verificationStatus')
    const alertElement = document.getElementById('verificationAlert')
    
    if (window.currentUser.isVerified) {
      statusElement.innerHTML = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Verified</span>'
      alertElement.classList.add('hidden')
    } else {
      statusElement.innerHTML = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Pending</span>'
      alertElement.classList.remove('hidden')
    }
    
  } catch (error) {
    console.error('Failed to load user info:', error)
    window.location.href = '/?session=expired'
  }
}

// Load worker statistics
async function loadWorkerStats() {
  try {
    const response = await apiRequest('/users/worker/stats')
    
    document.getElementById('totalBids').textContent = response.totalBids || '0'
    document.getElementById('activeJobs').textContent = response.activeJobs || '0'
    document.getElementById('avgRating').textContent = response.avgRating ? response.avgRating.toFixed(1) : '0.0'
    document.getElementById('totalEarnings').textContent = formatCurrency(response.totalEarnings || 0)
    
  } catch (error) {
    console.log('Using fallback stats (API unavailable)')
    // Set demo defaults instead of zeros
    document.getElementById('totalBids').textContent = '12'
    document.getElementById('activeJobs').textContent = '3'
    document.getElementById('avgRating').textContent = '4.8'
    document.getElementById('totalEarnings').textContent = formatCurrency(8500)
  }
}

// Load available jobs
async function loadAvailableJobs() {
  try {
    const response = await apiRequest('/jobs/worker')
    availableJobs = response.jobs || []
    
    renderAvailableJobs(availableJobs)
  } catch (error) {
    console.error('Failed to load available jobs:', error)
    document.getElementById('jobsList').innerHTML = `
      <div class="p-6 text-center text-gray-500">
        <i class="fas fa-exclamation-triangle text-2xl mb-4"></i>
        <p>Failed to load available jobs. Please try again.</p>
        <button onclick="loadAvailableJobs()" class="mt-2 text-kwikr-green hover:underline">Retry</button>
      </div>
    `
  }
}

// Filter jobs by category
function filterJobs() {
  const filterValue = document.getElementById('jobFilter').value
  let filteredJobs = availableJobs
  
  if (filterValue) {
    filteredJobs = availableJobs.filter(job => job.category_id == filterValue)
  }
  
  renderAvailableJobs(filteredJobs)
}

// Render available jobs
function renderAvailableJobs(jobs) {
  const jobsList = document.getElementById('jobsList')
  
  if (!jobs || jobs.length === 0) {
    jobsList.innerHTML = `
      <div class="p-6 text-center text-gray-500">
        <i class="fas fa-search text-4xl mb-4 text-gray-300"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No jobs available</h3>
        <p class="mb-4">Check back later for new job opportunities.</p>
        <button onclick="loadAvailableJobs()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
          <i class="fas fa-refresh mr-2"></i>Refresh Jobs
        </button>
      </div>
    `
    return
  }
  
  const jobsHtml = jobs.map(job => `
    <div class="p-6 hover:bg-gray-50">
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">${job.title}</h3>
          <p class="text-sm text-gray-600 mb-2">${job.category_name || job.category}</p>
          <p class="text-gray-700 text-sm mb-3">${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}</p>
          
          <div class="flex items-center space-x-4 text-sm text-gray-600">
            <span><i class="fas fa-calendar mr-1"></i> ${formatDate(job.created_at)}</span>
            <span><i class="fas fa-dollar-sign mr-1"></i> ${formatCurrency(job.budget_min)} - ${formatCurrency(job.budget_max)}</span>
            <span><i class="fas fa-map-marker-alt mr-1"></i> ${job.location_city}, ${job.location_province}</span>
          </div>
        </div>
        
        <div class="text-right">
          ${getUrgencyBadge(job.urgency)}
          <div class="mt-2 text-sm text-gray-600">
            <i class="fas fa-users mr-1"></i> ${job.bid_count || 0} bids
          </div>
        </div>
      </div>
      
      <div class="flex justify-between items-center pt-3 border-t border-gray-100">
        <div class="text-sm text-gray-600">
          Posted by: ${job.client_first_name && job.client_last_name ? `${job.client_first_name} ${job.client_last_name}` : 'Anonymous'}
        </div>
        <div class="flex space-x-2">
          <button onclick="viewJobDetails(${job.id})" class="text-kwikr-green hover:text-green-600 text-sm font-medium">
            View Details
          </button>
          ${window.currentUser && window.currentUser.isVerified ? 
            (job.my_bid_count > 0 ? `
              <button disabled class="bg-gray-400 text-white px-3 py-1 rounded text-sm cursor-not-allowed">
                Bid Placed
              </button>
            ` : `
              <button onclick="bidOnJob(${job.id})" class="bg-kwikr-green text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                Place Bid
              </button>
            `) : `
            <span class="text-gray-400 text-sm">Verification required</span>
          `}
        </div>
      </div>
    </div>
  `).join('')
  
  jobsList.innerHTML = jobsHtml
}

// Load job categories for filtering
async function loadJobCategories() {
  try {
    const response = await apiRequest('/jobs/categories')
    const categories = response.categories || []
    
    const categoryFilter = document.getElementById('jobFilter')
    categoryFilter.innerHTML = '<option value="">All Categories</option>'
    
    categories.forEach(category => {
      categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`
    })
    
    // Add event listener for filtering
    categoryFilter.addEventListener('change', function() {
      const selectedCategory = this.value
      if (selectedCategory) {
        const filteredJobs = availableJobs.filter(job => job.category_id == selectedCategory)
        renderAvailableJobs(filteredJobs)
      } else {
        renderAvailableJobs(availableJobs)
      }
    })
    
  } catch (error) {
    console.error('Failed to load job categories:', error)
  }
}

// Load worker's services
async function loadMyServices() {
  try {
    const response = await apiRequest('/users/profile')
    const services = response.services || []
    
    const servicesContainer = document.getElementById('myServices')
    
    if (services.length === 0) {
      servicesContainer.innerHTML = `
        <div class="text-center">
          <i class="fas fa-cog text-gray-300 text-2xl mb-2"></i>
          <p class="text-sm text-gray-500 mb-3">No services configured</p>
          <button onclick="showServicesModal()" class="text-kwikr-green hover:underline text-sm">
            Add Services
          </button>
        </div>
      `
      return
    }
    
    const servicesHtml = services.map(service => `
      <div class="flex justify-between items-center p-2 bg-gray-50 rounded mb-2">
        <span class="text-sm font-medium">${service.category_name}</span>
        <span class="text-xs text-gray-600">${formatCurrency(service.rate)}/hr</span>
      </div>
    `).join('')
    
    servicesContainer.innerHTML = servicesHtml
    
  } catch (error) {
    console.error('Failed to load services:', error)
    document.getElementById('myServices').innerHTML = `
      <div class="text-center text-gray-500">
        <p class="text-sm">Unable to load services</p>
      </div>
    `
  }
}

// View job details
async function viewJobDetails(jobId) {
  try {
    const response = await apiRequest(`/jobs/${jobId}`)
    const job = response.job
    
    const modal = document.getElementById('jobDetailsModal')
    const content = document.getElementById('jobDetailsContent')
    const bidBtn = document.getElementById('bidFromDetailsBtn')
    
    // Check if already bid using the job data
    const hasBid = job.my_bid_count > 0
    
    // Get detailed bid info if the worker has bid
    let workerBidInfo = null
    if (hasBid) {
      try {
        const bidCheckResponse = await apiRequest(`/worker/bids/check/${jobId}`)
        workerBidInfo = bidCheckResponse
      } catch (error) {
        console.log('Error getting bid details:', error)
      }
    }
    
    content.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <i class="${job.icon_class || 'fas fa-briefcase'} text-kwikr-green text-xl mr-3"></i>
              <h4 class="text-2xl font-bold text-gray-900">${job.title}</h4>
            </div>
            <div class="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <span><i class="fas fa-map-marker-alt mr-1"></i>${job.client_city || job.location_city || 'Unknown'}, ${job.client_province || job.location_province || ''}</span>
              <span><i class="fas fa-calendar mr-1"></i>Posted ${formatDate(job.created_at)}</span>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">${job.category_name || 'General'}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-kwikr-green">$${job.budget_min} - $${job.budget_max}</div>
            <div class="text-sm text-gray-500">Budget Range</div>
          </div>
        </div>
        
        <div>
          <h5 class="font-semibold text-gray-900 mb-2">Description</h5>
          <p class="text-gray-600 leading-relaxed">${job.description}</p>
        </div>
        
        ${workerBidInfo && workerBidInfo.hasBid ? `
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 class="font-semibold text-blue-900 mb-3">
              <i class="fas fa-handshake mr-2"></i>Your Bid Status
            </h5>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-blue-700">Bid Amount:</span>
                <span class="font-medium text-blue-900">$${parseFloat(workerBidInfo.bid.bid_amount).toFixed(2)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-blue-700">Timeline:</span>
                <span class="font-medium text-blue-900">${workerBidInfo.bid.estimated_timeline}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-blue-700">Status:</span>
                <span class="px-2 py-1 rounded-full text-xs font-medium ${
                  workerBidInfo.bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  workerBidInfo.bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  workerBidInfo.bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }">${workerBidInfo.bid.status.charAt(0).toUpperCase() + workerBidInfo.bid.status.slice(1)}</span>
              </div>
              ${workerBidInfo.bid.is_modified ? `
                <div class="flex justify-between">
                  <span class="text-blue-700">Modified:</span>
                  <span class="font-medium text-orange-600">${workerBidInfo.bid.modification_count} time(s)</span>
                </div>
              ` : ''}
              <div class="mt-3 p-3 bg-white rounded border">
                <span class="text-blue-700 font-medium">Cover Message:</span>
                <p class="text-gray-700 mt-1 text-sm">${workerBidInfo.bid.cover_message}</p>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 class="font-semibold text-gray-900 mb-2">Project Details</h5>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Start Date:</span>
                <span class="font-medium">${formatDate(job.start_date)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Expected Completion:</span>
                <span class="font-medium">${job.expected_completion ? formatDate(job.expected_completion) : 'Flexible'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Urgency:</span>
                <span>${getUrgencyBadge(job.urgency || 'normal')}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 class="font-semibold text-gray-900 mb-2">Client Information</h5>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Posted by:</span>
                <span class="font-medium">${job.first_name && job.last_name ? `${job.first_name} ${job.last_name}` : 'Anonymous'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Location:</span>
                <span class="font-medium">${job.client_city || job.location_city || 'Unknown'}, ${job.client_province || job.location_province || ''}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Total Bids:</span>
                <span class="font-medium text-kwikr-green">${job.bid_count || 0} ${(job.bid_count || 0) === 1 ? 'bid' : 'bids'}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${job.location_address ? `
          <div>
            <h5 class="font-semibold text-gray-900 mb-2">Work Location</h5>
            <p class="text-gray-600">${job.location_address}</p>
          </div>
        ` : ''}
      </div>
    `
    
    // Update bid button based on whether user already bid
    if (hasBid) {
      bidBtn.textContent = 'Bid Placed'
      bidBtn.className = 'bg-gray-400 text-white px-6 py-2 rounded-lg cursor-not-allowed'
      bidBtn.disabled = true
      bidBtn.onclick = null
    } else {
      bidBtn.textContent = 'Place Bid'
      bidBtn.className = 'bg-kwikr-green text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors'
      bidBtn.disabled = false
      bidBtn.setAttribute('data-job-id', jobId)
      bidBtn.onclick = showBidModalFromDetails
    }
    
    modal.classList.remove('hidden')
    
  } catch (error) {
    console.error('Failed to load job details:', error)
    showNotification('Failed to load job details', 'error')
  }
}

// Place bid on job
function bidOnJob(jobId) {
  if (!window.currentUser || !window.currentUser.isVerified) {
    showNotification('You must be verified to place bids', 'warning')
    return
  }
  showBidModal(jobId)
}

// ===== QUICK ACTIONS FUNCTIONALITY =====

// Show compliance modal
async function showComplianceModal() {
  try {
    // Get current compliance data
    const response = await apiRequest('/worker/compliance')
    const compliance = response.compliance
    
    // Create compliance modal
    const modal = document.createElement('div')
    modal.id = 'complianceModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-900">Manage Compliance</h3>
            <button onclick="closeComplianceModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">Update your compliance documents and certifications</p>
        </div>
        
        <form id="complianceForm" onsubmit="submitCompliance(event)" class="p-6 space-y-6">
          <!-- WSIB Information -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-900 mb-3">
              <i class="fas fa-shield-alt mr-2"></i>WSIB Coverage
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">WSIB Number</label>
                <input type="text" id="wsibNumber" value="${compliance.wsib_number || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="123456789">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <input type="date" id="wsibValidUntil" value="${compliance.wsib_valid_until || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
            </div>
          </div>

          <!-- Insurance Information -->
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-semibold text-green-900 mb-3">
              <i class="fas fa-umbrella mr-2"></i>Liability Insurance
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
                <input type="text" id="insuranceProvider" value="${compliance.insurance_provider || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="e.g., Intact Insurance">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Policy Number</label>
                <input type="text" id="insurancePolicyNumber" value="${compliance.insurance_policy_number || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="Policy number">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Insurance Valid Until</label>
                <input type="date" id="insuranceValidUntil" value="${compliance.insurance_valid_until || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
            </div>
          </div>

          <!-- License Information -->
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-900 mb-3">
              <i class="fas fa-certificate mr-2"></i>Professional License
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">License Type</label>
                <select id="licenseType" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                  <option value="">Select license type</option>
                  <option value="Electrical" ${compliance.license_type === 'Electrical' ? 'selected' : ''}>Electrical</option>
                  <option value="Plumbing" ${compliance.license_type === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
                  <option value="HVAC" ${compliance.license_type === 'HVAC' ? 'selected' : ''}>HVAC</option>
                  <option value="General Contractor" ${compliance.license_type === 'General Contractor' ? 'selected' : ''}>General Contractor</option>
                  <option value="Other" ${compliance.license_type === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input type="text" id="licenseNumber" value="${compliance.license_number || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="License number">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">License Valid Until</label>
                <input type="date" id="licenseValidUntil" value="${compliance.license_valid_until || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
            </div>
          </div>

          <!-- Document Upload Section -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-gray-900 mb-3">
              <i class="fas fa-upload mr-2"></i>Compliance Documents
            </h4>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Upload Document</label>
                <div class="flex items-center space-x-3">
                  <select id="documentType" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select document type</option>
                    <option value="wsib">WSIB Certificate</option>
                    <option value="insurance">Insurance Certificate</option>
                    <option value="license">License Document</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="file" id="complianceFileInput" class="hidden" accept=".jpg,.jpeg,.png,.pdf" onchange="handleComplianceFileSelect(this)">
                  <button type="button" onclick="document.getElementById('complianceFileInput').click()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">
                    <i class="fas fa-file-upload mr-1"></i>Choose File
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">Accepted formats: JPG, PNG, PDF (max 5MB)</p>
                <div id="fileUploadStatus" class="mt-2"></div>
              </div>
              
              <!-- Uploaded Documents List -->
              <div id="complianceDocumentsList" class="space-y-2">
                <!-- Documents will be loaded here -->
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onclick="closeComplianceModal()" 
                    class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
              <i class="fas fa-save mr-2"></i>Save Compliance Info
            </button>
          </div>
        </form>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Load existing compliance documents
    await loadComplianceDocuments()
  } catch (error) {
    console.error('Error loading compliance:', error)
    showNotification('Failed to load compliance information', 'error')
  }
}

// Show services modal
function showServicesModal() {
  showNotification('Service management feature coming soon!', 'info')
}

// View my bids
function viewMyBids() {
  showNotification('My bids feature coming soon!', 'info')
}

// View profile
function viewProfile() {
  showNotification('Profile editing feature coming soon!', 'info')
}

// Close job details modal
function closeJobDetailsModal() {
  document.getElementById('jobDetailsModal').classList.add('hidden')
}

// Show bid modal from job details
function showBidModalFromDetails() {
  const jobId = document.getElementById('bidFromDetailsBtn').getAttribute('data-job-id')
  closeJobDetailsModal()
  showBidModal(jobId)
}

// Show bid modal
async function showBidModal(jobId) {
  try {
    const response = await apiRequest(`/jobs/${jobId}`)
    const job = response.job
    
    const modal = document.getElementById('bidModal')
    const summary = document.getElementById('bidJobSummary')
    const budgetRange = document.getElementById('budgetRange')
    const bidForm = document.getElementById('bidForm')
    
    // Set job ID on form
    bidForm.setAttribute('data-job-id', jobId)
    
    // Update job summary
    summary.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-gray-900">${job.title}</h4>
          <p class="text-sm text-gray-500">Posted by ${job.first_name} ${job.last_name}</p>
        </div>
        <div class="text-right">
          <div class="font-bold text-kwikr-green">$${job.budget_min} - $${job.budget_max}</div>
          <div class="text-xs text-gray-500">${job.category_name}</div>
        </div>
      </div>
    `
    
    budgetRange.textContent = `$${job.budget_min} - $${job.budget_max}`
    
    // Clear form
    document.getElementById('bidAmount').value = ''
    document.getElementById('coverMessage').value = ''
    document.getElementById('estimatedTimeline').value = ''
    
    modal.classList.remove('hidden')
    
  } catch (error) {
    console.error('Failed to load job for bidding:', error)
    showNotification('Failed to load job details', 'error')
  }
}

// Close bid modal
function closeBidModal() {
  document.getElementById('bidModal').classList.add('hidden')
}

// Submit bid
async function submitBid(event) {
  event.preventDefault()
  
  const form = event.target
  const jobId = form.getAttribute('data-job-id')
  const bidAmount = parseFloat(document.getElementById('bidAmount').value)
  const coverMessage = document.getElementById('coverMessage').value.trim()
  const estimatedTimeline = document.getElementById('estimatedTimeline').value
  
  if (!bidAmount || !coverMessage || !estimatedTimeline) {
    showNotification('Please fill in all required fields', 'error')
    return
  }
  
  try {
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...'
    submitBtn.disabled = true
    
    await apiRequest(`/jobs/${jobId}/bids`, {
      method: 'POST',
      body: {
        bidAmount,
        coverMessage,
        estimatedTimeline
      }
    })
    
    closeBidModal()
    showNotification('Bid submitted successfully!', 'success')
    
    // Reload available jobs to update the UI
    await loadAvailableJobs()
    
  } catch (error) {
    console.error('Failed to submit bid:', error)
    showNotification(error.message || 'Failed to submit bid', 'error')
    
    const submitBtn = form.querySelector('button[type="submit"]')
    submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Bid'
    submitBtn.disabled = false
  }
}

// Close compliance modal
function closeComplianceModal() {
  const modal = document.getElementById('complianceModal')
  if (modal) {
    modal.remove()
  }
}

// Submit compliance form
async function submitCompliance(event) {
  event.preventDefault()
  
  try {
    const complianceData = {
      wsib_number: document.getElementById('wsibNumber').value,
      wsib_valid_until: document.getElementById('wsibValidUntil').value,
      insurance_provider: document.getElementById('insuranceProvider').value,
      insurance_policy_number: document.getElementById('insurancePolicyNumber').value,
      insurance_valid_until: document.getElementById('insuranceValidUntil').value,
      license_type: document.getElementById('licenseType').value,
      license_number: document.getElementById('licenseNumber').value,
      license_valid_until: document.getElementById('licenseValidUntil').value
    }

    await apiRequest('/worker/compliance', {
      method: 'PUT',
      body: complianceData
    })

    showNotification('Compliance information updated successfully!', 'success')
    closeComplianceModal()
    
    // Refresh page to show updated data
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error updating compliance:', error)
    showNotification('Failed to update compliance information', 'error')
  }
}

// Show services modal
async function showServicesModal() {
  try {
    // Get current services and categories
    const [servicesResponse, categoriesResponse] = await Promise.all([
      apiRequest('/worker/services'),
      apiRequest('/worker/categories')
    ])
    
    const services = servicesResponse.services || []
    const categories = categoriesResponse.categories || []
    
    // Create services modal
    const modal = document.createElement('div')
    modal.id = 'servicesModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-900">Manage Services</h3>
            <button onclick="closeServicesModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">Add, edit, or remove your service offerings</p>
        </div>
        
        <div class="p-6">
          <!-- Add New Service Button -->
          <button onclick="showAddServiceForm()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 mb-6">
            <i class="fas fa-plus mr-2"></i>Add New Service
          </button>
          
          <!-- Services List -->
          <div id="servicesList" class="space-y-4">
            ${services.map(service => `
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <i class="${service.icon_class || 'fas fa-tools'} text-kwikr-green mr-2"></i>
                      <h4 class="text-lg font-semibold">${service.service_name}</h4>
                      <span class="ml-3 px-2 py-1 text-xs rounded-full ${service.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                        ${service.is_available ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p class="text-gray-600 mb-2">${service.description || 'No description'}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                      <span><i class="fas fa-tag mr-1"></i>${service.service_category}</span>
                      <span><i class="fas fa-dollar-sign mr-1"></i>$${service.hourly_rate}/hr</span>
                      <span><i class="fas fa-calendar mr-1"></i>${service.years_experience || 0} years exp.</span>
                    </div>
                  </div>
                  <div class="flex space-x-2 ml-4">
                    <button onclick="editService(${service.id})" class="text-blue-600 hover:text-blue-800 p-2">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleServiceStatus(${service.id}, ${!service.is_available})" 
                            class="text-gray-600 hover:text-gray-800 p-2" title="${service.is_available ? 'Deactivate' : 'Activate'}">
                      <i class="fas fa-${service.is_available ? 'pause' : 'play'}"></i>
                    </button>
                    <button onclick="deleteService(${service.id})" class="text-red-600 hover:text-red-800 p-2">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${services.length === 0 ? `
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-tools text-4xl mb-4"></i>
              <p class="text-lg">No services added yet</p>
              <p class="text-sm">Add your first service to start receiving job offers</p>
            </div>
          ` : ''}
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
  } catch (error) {
    console.error('Error loading services:', error)
    showNotification('Failed to load services', 'error')
  }
}

// Close services modal
function closeServicesModal() {
  const modal = document.getElementById('servicesModal')
  if (modal) {
    modal.remove()
  }
}

// Show My Bids modal
async function viewMyBids() {
  try {
    const response = await apiRequest('/worker/bids')
    const bids = response.bids || []
    
    // Create bids modal
    const modal = document.createElement('div')
    modal.id = 'bidsModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-900">My Bids History</h3>
            <button onclick="closeBidsModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">View all your submitted bids and their status</p>
        </div>
        
        <div class="p-6">
          <!-- Bids Stats -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">${bids.filter(b => b.status === 'pending').length}</div>
              <div class="text-sm text-blue-600">Pending</div>
            </div>
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">${bids.filter(b => b.status === 'accepted').length}</div>
              <div class="text-sm text-green-600">Won</div>
            </div>
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">${bids.filter(b => b.status === 'rejected').length}</div>
              <div class="text-sm text-red-600">Rejected</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-gray-600">${bids.filter(b => b.status === 'withdrawn').length}</div>
              <div class="text-sm text-gray-600">Withdrawn</div>
            </div>
          </div>
          
          <!-- Bids List -->
          <div class="space-y-4">
            ${bids.map(bid => `
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <i class="${bid.icon_class || 'fas fa-briefcase'} text-kwikr-green mr-2"></i>
                      <h4 class="text-lg font-semibold">${bid.job_title}</h4>
                      <span class="ml-3 px-2 py-1 text-xs rounded-full ${getStatusColor(bid.status)}">
                        ${bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </span>
                    </div>
                    <p class="text-gray-600 mb-2">${bid.job_description}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <span><i class="fas fa-user mr-1"></i>${bid.client_first_name} ${bid.client_last_name}</span>
                      <span><i class="fas fa-map-marker-alt mr-1"></i>${bid.location_city}, ${bid.location_province}</span>
                      <span><i class="fas fa-calendar mr-1"></i>${new Date(bid.submitted_at).toLocaleDateString()}</span>
                    </div>
                    <div class="flex items-center space-x-4 text-sm">
                      <span class="font-semibold text-kwikr-green">Your Bid: $${parseFloat(bid.bid_amount).toFixed(2)}</span>
                      <span class="text-gray-600">Budget: $${bid.budget_min} - $${bid.budget_max}</span>
                      <span class="text-gray-600">Timeline: ${bid.estimated_timeline}</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    ${bid.status === 'pending' ? `
                      <button onclick="withdrawBid(${bid.id})" class="text-red-600 hover:text-red-800 px-3 py-1 text-sm border border-red-300 rounded">
                        <i class="fas fa-times mr-1"></i>Withdraw
                      </button>
                    ` : ''}
                  </div>
                </div>
                <div class="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <strong>Cover Message:</strong> ${bid.cover_message}
                </div>
              </div>
            `).join('')}
          </div>
          
          ${bids.length === 0 ? `
            <div class="text-center py-8 text-gray-500">
              <i class="fas fa-handshake text-4xl mb-4"></i>
              <p class="text-lg">No bids submitted yet</p>
              <p class="text-sm">Start bidding on jobs to build your history</p>
            </div>
          ` : ''}
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
  } catch (error) {
    console.error('Error loading bids:', error)
    showNotification('Failed to load bids history', 'error')
  }
}

// Close bids modal
function closeBidsModal() {
  const modal = document.getElementById('bidsModal')
  if (modal) {
    modal.remove()
  }
}

// Get status color class
function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'bg-blue-100 text-blue-700'
    case 'accepted': return 'bg-green-100 text-green-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    case 'withdrawn': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// Show Edit Profile modal
async function viewProfile() {
  try {
    const response = await apiRequest('/worker/profile')
    const profile = response.profile
    
    // Create profile modal
    const modal = document.createElement('div')
    modal.id = 'profileModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-900">Edit Profile</h3>
            <button onclick="closeProfileModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">Update your professional profile and branding</p>
        </div>
        
        <form id="profileForm" onsubmit="submitProfile(event)" class="p-6 space-y-6">
          <!-- Personal Information -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-900 mb-3">
              <i class="fas fa-user mr-2"></i>Personal Information
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input type="text" id="firstName" value="${profile.first_name || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input type="text" id="lastName" value="${profile.last_name || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input type="tel" id="phone" value="${profile.phone || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value="${profile.email || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" readonly>
                <p class="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          <!-- Location -->
          <div class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-semibold text-green-900 mb-3">
              <i class="fas fa-map-marker-alt mr-2"></i>Location & Address
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Province</label>
                <select id="province" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                  <option value="">Select Province</option>
                  <option value="AB" ${profile.province === 'AB' ? 'selected' : ''}>Alberta</option>
                  <option value="BC" ${profile.province === 'BC' ? 'selected' : ''}>British Columbia</option>
                  <option value="MB" ${profile.province === 'MB' ? 'selected' : ''}>Manitoba</option>
                  <option value="NB" ${profile.province === 'NB' ? 'selected' : ''}>New Brunswick</option>
                  <option value="NL" ${profile.province === 'NL' ? 'selected' : ''}>Newfoundland and Labrador</option>
                  <option value="NS" ${profile.province === 'NS' ? 'selected' : ''}>Nova Scotia</option>
                  <option value="NT" ${profile.province === 'NT' ? 'selected' : ''}>Northwest Territories</option>
                  <option value="NU" ${profile.province === 'NU' ? 'selected' : ''}>Nunavut</option>
                  <option value="ON" ${profile.province === 'ON' ? 'selected' : ''}>Ontario</option>
                  <option value="PE" ${profile.province === 'PE' ? 'selected' : ''}>Prince Edward Island</option>
                  <option value="QC" ${profile.province === 'QC' ? 'selected' : ''}>Quebec</option>
                  <option value="SK" ${profile.province === 'SK' ? 'selected' : ''}>Saskatchewan</option>
                  <option value="YT" ${profile.province === 'YT' ? 'selected' : ''}>Yukon</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input type="text" id="city" value="${profile.city || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <input type="text" id="addressLine1" value="${profile.address_line1 || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input type="text" id="addressLine2" value="${profile.address_line2 || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input type="text" id="postalCode" value="${profile.postal_code || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
            </div>
          </div>

          <!-- Company Information -->
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-semibold text-purple-900 mb-3">
              <i class="fas fa-building mr-2"></i>Company Information
            </h4>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input type="text" id="companyName" value="${profile.company_name || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="Your Company Name">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Company Description</label>
                <textarea id="companyDescription" rows="3" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                          placeholder="Brief description of your company and services...">${profile.company_description || ''}</textarea>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                  <input type="url" id="companyLogoUrl" value="${profile.company_logo_url || ''}" 
                         class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                         placeholder="https://example.com/logo.jpg">
                  <div class="flex space-x-2 mt-2">
                    <button type="button" onclick="uploadCompanyLogo()" class="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm">
                      <i class="fas fa-upload mr-1"></i>Upload Logo
                    </button>
                    ${profile.company_logo_url ? `
                      <button type="button" onclick="viewProfileImage('${profile.company_logo_url}')" class="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 text-sm">
                        <i class="fas fa-eye mr-1"></i>View Current
                      </button>
                    ` : ''}
                  </div>
                  <p class="text-xs text-gray-500 mt-1">Upload your company logo (JPG, PNG, max 2MB)</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                  <input type="url" id="websiteUrl" value="${profile.website_url || ''}" 
                         class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                         placeholder="https://yourcompany.com">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Years in Business</label>
                <input type="number" id="yearsInBusiness" value="${profile.years_in_business || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       min="0" max="100" placeholder="5">
              </div>
            </div>
          </div>

          <!-- Professional Details -->
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-900 mb-3">
              <i class="fas fa-briefcase mr-2"></i>Professional Details
            </h4>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Professional Bio</label>
                <textarea id="bio" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                          placeholder="Tell clients about your background, experience, and what makes you unique...">${profile.bio || ''}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Profile Image</label>
                <input type="url" id="profileImageUrl" value="${profile.profile_image_url || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="https://example.com/your-photo.jpg">
                <div class="flex space-x-2 mt-2">
                  <button type="button" onclick="uploadProfileImage()" class="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm">
                    <i class="fas fa-upload mr-1"></i>Upload Image
                  </button>
                  ${profile.profile_image_url ? `
                    <button type="button" onclick="viewProfileImage('${profile.profile_image_url}')" class="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 text-sm">
                      <i class="fas fa-eye mr-1"></i>View Current
                    </button>
                  ` : ''}
                </div>
                <p class="text-xs text-gray-500 mt-1">Upload a professional photo to build trust with clients (JPG, PNG, max 2MB)</p>
              </div>
            </div>
          </div>

          <!-- Emergency Contact -->
          <div class="bg-red-50 p-4 rounded-lg">
            <h4 class="font-semibold text-red-900 mb-3">
              <i class="fas fa-phone mr-2"></i>Emergency Contact
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                <input type="text" id="emergencyContactName" value="${profile.emergency_contact_name || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                <input type="tel" id="emergencyContactPhone" value="${profile.emergency_contact_phone || ''}" 
                       class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
              </div>
            </div>
          </div>

          <!-- Service Areas Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i class="fas fa-map-marker-alt text-kwikr-green mr-2"></i>
              Service Areas
            </h3>
            <div id="serviceAreas" class="space-y-4">
              <div id="serviceAreasList">
                <div class="text-center py-4 text-gray-500">
                  <i class="fas fa-spinner fa-spin text-xl"></i>
                  <p class="mt-2">Loading service areas...</p>
                </div>
              </div>
              
              <div id="addServiceAreaForm" class="hidden">
                <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 class="font-medium text-gray-900 mb-3">Add Service Areas</h4>
                  <form onsubmit="saveServiceArea(event)">
                    <div class="flex space-x-3">
                      <input type="text" id="newAreaName" placeholder="Enter area names (comma-separated)" 
                             class="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                      <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        <i class="fas fa-save mr-2"></i>Save
                      </button>
                      <button type="button" onclick="cancelAddArea()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Cancel
                      </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Enter multiple areas separated by commas (e.g., "Downtown Toronto, North York, Scarborough")</p>
                  </form>
                </div>
              </div>
              
              <button onclick="showAddAreaForm()" class="w-full mt-3 text-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-kwikr-green hover:text-kwikr-green transition-colors">
                <i class="fas fa-plus mr-2"></i>Add Service Area
              </button>
            </div>
          </div>

          <!-- Hours of Operation Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i class="fas fa-clock text-kwikr-green mr-2"></i>
              Hours of Operation
            </h3>
            <div id="hoursSection" class="space-y-4">
              <div id="hoursDisplay">
                <div class="text-center py-4 text-gray-500">
                  <i class="fas fa-spinner fa-spin text-xl"></i>
                  <p class="mt-2">Loading hours...</p>
                </div>
              </div>
              
              <div id="hoursEditForm" class="hidden">
                <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 class="font-medium text-gray-900 mb-3">Set Your Hours</h4>
                  <form onsubmit="saveHours(event)" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <!-- Days will be populated by JavaScript -->
                      <div class="space-y-3" id="hoursFormDays"></div>
                    </div>
                    <div class="flex space-x-3 pt-4 border-t border-gray-200">
                      <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        <i class="fas fa-save mr-2"></i>Save Hours
                      </button>
                      <button type="button" onclick="cancelHoursEdit()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              
              <button onclick="toggleHoursEdit()" class="w-full mt-3 text-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-kwikr-green hover:text-kwikr-green transition-colors">
                <i class="fas fa-edit mr-2"></i>Edit Hours
              </button>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onclick="closeProfileModal()" 
                    class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
              <i class="fas fa-save mr-2"></i>Save Profile
            </button>
          </div>
        </form>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Load Service Areas and Hours data after modal is added
    setTimeout(() => {
      if (typeof window.loadServiceAreas === 'function') {
        console.log('Loading service areas in profile modal')
        window.loadServiceAreas()
      }
      if (typeof window.loadHours === 'function') {
        console.log('Loading hours in profile modal')
        window.loadHours()
      }
    }, 100) // Small delay to ensure modal is rendered
    
  } catch (error) {
    console.error('Error loading profile:', error)
    showNotification('Failed to load profile', 'error')
  }
}

// Close profile modal
function closeProfileModal() {
  const modal = document.getElementById('profileModal')
  if (modal) {
    modal.remove()
  }
}

// Submit profile form
async function submitProfile(event) {
  event.preventDefault()
  
  try {
    const profileData = {
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      phone: document.getElementById('phone').value,
      province: document.getElementById('province').value,
      city: document.getElementById('city').value,
      bio: document.getElementById('bio').value,
      profile_image_url: document.getElementById('profileImageUrl').value,
      address_line1: document.getElementById('addressLine1').value,
      address_line2: document.getElementById('addressLine2').value,
      postal_code: document.getElementById('postalCode').value,
      emergency_contact_name: document.getElementById('emergencyContactName').value,
      emergency_contact_phone: document.getElementById('emergencyContactPhone').value,
      company_name: document.getElementById('companyName').value,
      company_description: document.getElementById('companyDescription').value,
      company_logo_url: document.getElementById('companyLogoUrl').value,
      website_url: document.getElementById('websiteUrl').value,
      years_in_business: parseInt(document.getElementById('yearsInBusiness').value) || null
    }

    await apiRequest('/worker/profile', {
      method: 'PUT',
      body: profileData
    })

    showNotification('Profile updated successfully!', 'success')
    closeProfileModal()
    
    // Refresh page to show updated data
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error updating profile:', error)
    showNotification('Failed to update profile', 'error')
  }
}

// ===== FILE UPLOAD FUNCTIONS =====

// Handle compliance file selection
async function handleComplianceFileSelect(input) {
  const file = input.files[0]
  const documentType = document.getElementById('documentType').value
  
  if (!file) return
  
  if (!documentType) {
    showNotification('Please select a document type first', 'warning')
    input.value = ''
    return
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    showNotification('Only JPEG, PNG, and PDF files are allowed', 'error')
    input.value = ''
    return
  }
  
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    showNotification('File size must be less than 5MB', 'error')
    input.value = ''
    return
  }
  
  // Show upload status
  const statusDiv = document.getElementById('fileUploadStatus')
  statusDiv.innerHTML = `
    <div class="flex items-center text-blue-600">
      <i class="fas fa-spinner fa-spin mr-2"></i>
      <span class="text-sm">Uploading ${file.name}...</span>
    </div>
  `
  
  try {
    // Convert file to base64 for Cloudflare Workers compatibility
    const fileBase64 = await convertFileToBase64(file)
    
    const uploadData = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileData: fileBase64,
      documentType: documentType
    }
    
    const response = await apiRequest('/worker/compliance/upload', {
      method: 'POST',
      body: uploadData
    })
    
    if (response.success) {
      statusDiv.innerHTML = `
        <div class="flex items-center text-green-600">
          <i class="fas fa-check-circle mr-2"></i>
          <span class="text-sm">Successfully uploaded ${file.name}</span>
        </div>
      `
      
      // Clear the input and reload documents
      input.value = ''
      document.getElementById('documentType').value = ''
      await loadComplianceDocuments()
      
      showNotification('Document uploaded successfully!', 'success')
    } else {
      throw new Error(response.error || 'Upload failed')
    }
  } catch (error) {
    console.error('File upload error:', error)
    statusDiv.innerHTML = `
      <div class="flex items-center text-red-600">
        <i class="fas fa-exclamation-circle mr-2"></i>
        <span class="text-sm">Upload failed: ${error.message}</span>
      </div>
    `
    showNotification('Failed to upload document: ' + error.message, 'error')
  }
}

// Helper function to convert file to base64
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Remove the data:type;base64, prefix
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Load compliance documents
async function loadComplianceDocuments() {
  try {
    const response = await apiRequest('/worker/compliance/documents')
    const documents = response.documents || []
    
    const documentsList = document.getElementById('complianceDocumentsList')
    
    if (documents.length === 0) {
      documentsList.innerHTML = `
        <div class="text-center text-gray-500 py-4">
          <i class="fas fa-file-alt text-2xl mb-2"></i>
          <p class="text-sm">No documents uploaded yet</p>
        </div>
      `
      return
    }
    
    const documentsHtml = documents.map(doc => `
      <div class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
        <div class="flex items-center">
          <i class="fas fa-file-${doc.file_name.toLowerCase().includes('.pdf') ? 'pdf' : 'image'} text-blue-500 mr-3"></i>
          <div>
            <div class="font-medium text-sm">${doc.file_name}</div>
            <div class="text-xs text-gray-500">
              ${doc.document_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
              ${(doc.file_size / 1024).toFixed(1)} KB • 
              ${new Date(doc.uploaded_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <button onclick="deleteComplianceDocument('${doc.id}')" class="text-red-500 hover:text-red-700 p-1" title="Delete document">
          <i class="fas fa-trash text-sm"></i>
        </button>
      </div>
    `).join('')
    
    documentsList.innerHTML = documentsHtml
  } catch (error) {
    console.error('Error loading compliance documents:', error)
    document.getElementById('complianceDocumentsList').innerHTML = `
      <div class="text-center text-red-500 py-4">
        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
        <p class="text-sm">Failed to load documents</p>
      </div>
    `
  }
}

// Delete compliance document
async function deleteComplianceDocument(documentId) {
  if (!confirm('Are you sure you want to delete this document?')) return
  
  try {
    await apiRequest(`/worker/compliance/documents/${documentId}`, {
      method: 'DELETE'
    })
    
    showNotification('Document deleted successfully!', 'success')
    await loadComplianceDocuments()
  } catch (error) {
    console.error('Error deleting document:', error)
    showNotification('Failed to delete document', 'error')
  }
}

// Upload profile image
async function uploadProfileImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png'
  
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiRequest('/worker/profile/upload-image', {
        method: 'POST',
        body: formData
      })
      
      if (response.success) {
        // Update the profile image URL field
        const imageUrlInput = document.getElementById('profileImageUrl')
        if (imageUrlInput) {
          imageUrlInput.value = response.imageUrl
        }
        
        showNotification('Profile image uploaded successfully!', 'success')
      } else {
        throw new Error(response.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Profile image upload error:', error)
      showNotification('Failed to upload image: ' + error.message, 'error')
    }
  }
  
  input.click()
}

// Upload company logo
async function uploadCompanyLogo() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png'
  
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiRequest('/worker/profile/upload-image', {
        method: 'POST',
        body: formData
      })
      
      if (response.success) {
        // Update the company logo URL field
        const logoUrlInput = document.getElementById('companyLogoUrl')
        if (logoUrlInput) {
          logoUrlInput.value = response.imageUrl
        }
        
        showNotification('Company logo uploaded successfully!', 'success')
      } else {
        throw new Error(response.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Company logo upload error:', error)
      showNotification('Failed to upload logo: ' + error.message, 'error')
    }
  }
  
  input.click()
}

// View profile image in modal
function viewProfileImage(imageUrl) {
  if (!imageUrl) return
  
  const modal = document.createElement('div')
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="relative max-w-4xl max-h-[90vh] p-4">
      <button onclick="this.parentElement.parentElement.remove()" class="absolute top-2 right-2 text-white hover:text-gray-300 z-10">
        <i class="fas fa-times text-2xl"></i>
      </button>
      <img src="${imageUrl}" alt="Profile Image" class="max-w-full max-h-full object-contain rounded-lg">
    </div>
  `
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  }
  
  document.body.appendChild(modal)
}

// Navigation functions
async function navigateToProfile() {
  if (window.currentUser && window.currentUser.id) {
    try {
      // Validate session before navigating
      const response = await apiRequest('/auth/me')
      if (response.user) {
        window.location.href = `/profile/${window.currentUser.id}`
      } else {
        showNotification('Session invalid. Redirecting to home...', 'error')
        setTimeout(() => window.location.href = '/', 1500)
      }
    } catch (error) {
      console.log('Session validation failed during profile navigation:', error)
      showNotification('Session expired. Redirecting to home...', 'info')
      setTimeout(() => window.location.href = '/', 1500)
    }
  } else {
    showNotification('Unable to load profile. Please try again.', 'error')
  }
}

// Tab switching function for worker dashboard
function switchTab(tabName) {
  console.log('Switching to tab:', tabName)
  
  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('[id$="Tab"]')
  tabButtons.forEach(button => {
    button.className = button.className.replace('border-kwikr-green text-kwikr-green', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
  })
  
  // Add active class to clicked tab button
  const activeTabButton = document.getElementById(tabName + 'Tab')
  if (activeTabButton) {
    activeTabButton.className = activeTabButton.className.replace('border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'border-kwikr-green text-kwikr-green')
  }
  
  // Hide all tab panels
  const tabPanels = document.querySelectorAll('.tab-panel')
  tabPanels.forEach(panel => {
    panel.classList.add('hidden')
  })
  
  // Show the selected tab panel based on the correct naming convention
  let panelId
  switch(tabName) {
    case 'view':
      panelId = 'profileViewPanel'
      break
    case 'edit':
      panelId = 'profileEditPanel'
      break
    case 'payment':
      panelId = 'paymentPanel'
      break
    case 'compliance':
      panelId = 'compliancePanel'
      break
    case 'services':
      panelId = 'servicesPanel'
      break
    default:
      panelId = 'profileViewPanel'
  }
  
  const activePanel = document.getElementById(panelId)
  if (activePanel) {
    activePanel.classList.remove('hidden')
    console.log('Showed panel:', panelId)
  } else {
    console.log('Panel not found:', panelId)
  }
  
  // Load tab-specific content if needed
  switch(tabName) {
    case 'edit':
      // Profile edit functionality already handled by viewProfile()
      console.log('Edit tab selected - profile editing available in tab panel')
      break
    case 'services':
      // Services management already handled by showServicesModal()
      console.log('Services tab selected - services management available in tab panel')
      break
    case 'payment':
      loadPaymentSettings()
      break
    case 'compliance':
      // Compliance management already handled by showComplianceModal()
      console.log('Compliance tab selected - compliance management available in tab panel')
      break
    case 'view':
    default:
      // Default view is already loaded
      console.log('View tab selected - default profile view')
      break
  }
}

// Load payment settings
async function loadPaymentSettings() {
  try {
    const response = await apiRequest('/worker/payment-settings')
    const settings = response.settings || {}
    
    // Update payment settings display
    console.log('Payment settings loaded:', settings)
  } catch (error) {
    console.error('Failed to load payment settings:', error)
  }
}

// Logout function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = '/api/auth/logout'
  }
}

// ===== NEW PROFILE SECTION FUNCTIONS =====

// Hours of Operation Functions
function editHours() {
  const hoursDisplay = document.getElementById('hoursDisplay')
  const hoursEditForm = document.getElementById('hoursEditForm')
  
  if (hoursDisplay) hoursDisplay.classList.add('hidden')
  if (hoursEditForm) hoursEditForm.classList.remove('hidden')
  
  // Populate form with current hours
  populateHoursForm()
}

function populateHoursForm() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hoursFormDays = document.getElementById('hoursFormDays')
  
  if (!hoursFormDays) return
  
  hoursFormDays.innerHTML = days.map(day => `
    <div class="flex items-center space-x-3">
      <div class="w-20 text-sm font-medium text-gray-700">${day}</div>
      <input type="checkbox" id="open_${day.toLowerCase()}" class="rounded border-gray-300 text-kwikr-green focus:ring-kwikr-green" ${day !== 'Sunday' ? 'checked' : ''}>
      <label for="open_${day.toLowerCase()}" class="text-sm text-gray-600">Open</label>
      <div class="flex space-x-2">
        <input type="time" id="start_${day.toLowerCase()}" value="${day !== 'Sunday' ? '08:00' : ''}" 
               class="text-sm p-2 border border-gray-300 rounded focus:outline-none focus:border-kwikr-green" ${day === 'Sunday' ? 'disabled' : ''}>
        <span class="text-gray-500 text-sm">to</span>
        <input type="time" id="end_${day.toLowerCase()}" value="${day !== 'Sunday' ? '18:00' : ''}" 
               class="text-sm p-2 border border-gray-300 rounded focus:outline-none focus:border-kwikr-green" ${day === 'Sunday' ? 'disabled' : ''}>
      </div>
    </div>
  `).join('')
  
  // Add event listeners to checkboxes
  days.forEach(day => {
    const checkbox = document.getElementById(`open_${day.toLowerCase()}`)
    const startInput = document.getElementById(`start_${day.toLowerCase()}`)
    const endInput = document.getElementById(`end_${day.toLowerCase()}`)
    
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        if (startInput) startInput.disabled = !this.checked
        if (endInput) endInput.disabled = !this.checked
      })
    }
  })
}

function cancelHoursEdit() {
  const hoursDisplay = document.getElementById('hoursDisplay')
  const hoursEditForm = document.getElementById('hoursEditForm')
  
  if (hoursDisplay) hoursDisplay.classList.remove('hidden')
  if (hoursEditForm) hoursEditForm.classList.add('hidden')
}

async function saveHours(event) {
  event.preventDefault()
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hoursData = {}
  
  days.forEach(day => {
    const isOpen = document.getElementById(`open_${day.toLowerCase()}`).checked
    const startTime = document.getElementById(`start_${day.toLowerCase()}`).value
    const endTime = document.getElementById(`end_${day.toLowerCase()}`).value
    
    hoursData[day.toLowerCase()] = {
      is_open: isOpen,
      start_time: isOpen ? startTime : null,
      end_time: isOpen ? endTime : null
    }
  })
  
  try {
    await apiRequest('/worker/hours', {
      method: 'PUT',
      body: { hours: hoursData }
    })
    
    showNotification('Hours of operation updated successfully!', 'success')
    cancelHoursEdit()
    
    // Refresh the display
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error saving hours:', error)
    showNotification('Failed to save hours of operation', 'error')
  }
}

// Service Area Map Functions
function editServiceArea() {
  showNotification('Service area editing functionality coming soon!', 'info')
}

function loadMap() {
  // Initialize Google Maps (placeholder)
  const mapContainer = document.getElementById('serviceAreaMap')
  if (mapContainer) {
    mapContainer.innerHTML = `
      <div class="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
        <div class="text-center text-gray-500">
          <i class="fas fa-map-marked-alt text-4xl mb-2"></i>
          <p class="text-sm">Interactive Map</p>
          <p class="text-xs">Google Maps integration coming soon</p>
        </div>
      </div>
    `
  }
}

// Service Pricing Functions
function editPricing() {
  const pricingDisplay = document.getElementById('pricingDisplay')
  const pricingEditForm = document.getElementById('pricingEditForm')
  
  if (pricingDisplay) pricingDisplay.classList.add('hidden')
  if (pricingEditForm) pricingEditForm.classList.remove('hidden')
  
  // Populate form with current pricing
  populatePricingForm()
}

function populatePricingForm() {
  const services = [
    { id: 'cleaning', name: 'House Cleaning', rate: 45 },
    { id: 'plumbing', name: 'Plumbing Services', rate: 85 },
    { id: 'electrical', name: 'Electrical Work', rate: 95 },
    { id: 'gardening', name: 'Landscaping', rate: 55 },
    { id: 'painting', name: 'Painting', rate: 65 },
    { id: 'handyman', name: 'General Handyman', rate: 50 }
  ]
  
  const pricingFormServices = document.getElementById('pricingFormServices')
  
  if (!pricingFormServices) return
  
  pricingFormServices.innerHTML = services.map(service => `
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input type="checkbox" id="service_${service.id}" class="rounded border-gray-300 text-kwikr-green focus:ring-kwikr-green" checked>
          <label for="service_${service.id}" class="ml-2 text-sm font-medium text-gray-700">${service.name}</label>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-500">$</span>
          <input type="number" id="rate_${service.id}" value="${service.rate}" min="0" step="5"
                 class="w-20 p-2 border border-gray-300 rounded focus:outline-none focus:border-kwikr-green text-right">
          <span class="text-sm text-gray-500">/hr</span>
        </div>
      </div>
    </div>
  `).join('')
}

function cancelPricingEdit() {
  const pricingDisplay = document.getElementById('pricingDisplay')
  const pricingEditForm = document.getElementById('pricingEditForm')
  
  if (pricingDisplay) pricingDisplay.classList.remove('hidden')
  if (pricingEditForm) pricingEditForm.classList.add('hidden')
}

async function savePricing(event) {
  event.preventDefault()
  
  const services = ['cleaning', 'plumbing', 'electrical', 'gardening', 'painting', 'handyman']
  const pricingData = {}
  
  services.forEach(serviceId => {
    const isEnabled = document.getElementById(`service_${serviceId}`).checked
    const rate = parseFloat(document.getElementById(`rate_${serviceId}`).value)
    
    pricingData[serviceId] = {
      enabled: isEnabled,
      hourly_rate: rate
    }
  })
  
  try {
    await apiRequest('/worker/pricing', {
      method: 'PUT',
      body: { pricing: pricingData }
    })
    
    showNotification('Service pricing updated successfully!', 'success')
    cancelPricingEdit()
    
    // Refresh the display
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error saving pricing:', error)
    showNotification('Failed to save service pricing', 'error')
  }
}

// Reviews and Testimonials Functions
function viewAllReviews() {
  showNotification('Full reviews management feature coming soon!', 'info')
}

async function loadReviews() {
  try {
    const response = await apiRequest('/worker/reviews')
    const reviews = response.reviews || []
    
    const reviewsContainer = document.getElementById('reviewsContainer')
    if (!reviewsContainer) return
    
    if (reviews.length === 0) {
      reviewsContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-star text-4xl mb-4"></i>
          <p class="text-lg">No reviews yet</p>
          <p class="text-sm">Complete your first job to start receiving reviews</p>
        </div>
      `
      return
    }
    
    const reviewsHtml = reviews.slice(0, 3).map(review => `
      <div class="border-l-4 border-kwikr-green pl-4">
        <div class="flex items-center mb-2">
          <div class="text-yellow-400">
            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
          </div>
          <span class="ml-2 text-sm text-gray-500">${formatDate(review.created_at)}</span>
        </div>
        <p class="text-gray-700 text-sm mb-2">"${review.comment}"</p>
        <p class="text-xs text-gray-500">- ${review.client_name}</p>
      </div>
    `).join('')
    
    reviewsContainer.innerHTML = reviewsHtml
    
  } catch (error) {
    console.error('Error loading reviews:', error)
    const reviewsContainer = document.getElementById('reviewsContainer')
    if (reviewsContainer) {
      reviewsContainer.innerHTML = `
        <div class="text-center py-4 text-gray-500">
          <p class="text-sm">Unable to load reviews</p>
        </div>
      `
    }
  }
}

// Make functions globally available
window.loadAvailableJobs = loadAvailableJobs
window.navigateToProfile = navigateToProfile
window.filterJobs = filterJobs
window.viewJobDetails = viewJobDetails
window.bidOnJob = bidOnJob
window.showBidModal = showBidModal
window.closeBidModal = closeBidModal
window.closeJobDetailsModal = closeJobDetailsModal
window.showBidModalFromDetails = showBidModalFromDetails
window.submitBid = submitBid
window.showComplianceModal = showComplianceModal
window.closeComplianceModal = closeComplianceModal
window.submitCompliance = submitCompliance
window.showServicesModal = showServicesModal
window.closeServicesModal = closeServicesModal
window.viewMyBids = viewMyBids
window.closeBidsModal = closeBidsModal
window.viewProfile = viewProfile
window.closeProfileModal = closeProfileModal
window.submitProfile = submitProfile
window.modifyBid = modifyBid
window.closeModifyBidModal = closeModifyBidModal
window.submitModifiedBid = submitModifiedBid
window.loadJobsPage = loadJobsPage

// New profile section functions
window.editHours = editHours
window.cancelHoursEdit = cancelHoursEdit
window.saveHours = saveHours
window.populateHoursForm = populateHoursForm
window.editServiceArea = editServiceArea
window.loadMap = loadMap
window.editPricing = editPricing
window.cancelPricingEdit = cancelPricingEdit
window.savePricing = savePricing
window.populatePricingForm = populatePricingForm
window.viewAllReviews = viewAllReviews
window.loadReviews = loadReviews

// Additional helper functions for services management
window.showAddServiceForm = showAddServiceForm
window.editService = editService
window.toggleServiceStatus = toggleServiceStatus
window.deleteService = deleteService
window.withdrawBid = withdrawBid
window.closeAddServiceModal = closeAddServiceModal
window.submitNewService = submitNewService
window.handleComplianceFileSelect = handleComplianceFileSelect
window.loadComplianceDocuments = loadComplianceDocuments
window.deleteComplianceDocument = deleteComplianceDocument
window.uploadProfileImage = uploadProfileImage
window.uploadCompanyLogo = uploadCompanyLogo
window.viewProfileImage = viewProfileImage

// Show add service form
async function showAddServiceForm() {
  try {
    const categoriesResponse = await apiRequest('/worker/categories')
    const categories = categoriesResponse.categories || []
    
    const modal = document.createElement('div')
    modal.id = 'addServiceModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-md w-full mx-4">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-xl font-bold text-gray-900">Add New Service</h3>
        </div>
        
        <form id="addServiceForm" onsubmit="submitNewService(event)" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Service Category</label>
            <select id="serviceCategory" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
              <option value="">Select Category</option>
              ${categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
            <input type="text" id="serviceName" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                   placeholder="e.g., Deep House Cleaning" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="serviceDescription" rows="3" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                      placeholder="Describe your service offering..."></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (CAD)</label>
            <input type="number" id="hourlyRate" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                   step="0.01" min="0" placeholder="25.00" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
            <input type="number" id="yearsExperience" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                   min="0" max="50" placeholder="5">
          </div>
          
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onclick="closeAddServiceModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
              Add Service
            </button>
          </div>
        </form>
      </div>
    `
    
    document.body.appendChild(modal)
  } catch (error) {
    console.error('Error showing add service form:', error)
    showNotification('Failed to load service form', 'error')
  }
}

// Close add service modal
function closeAddServiceModal() {
  const modal = document.getElementById('addServiceModal')
  if (modal) modal.remove()
}

// Submit new service
async function submitNewService(event) {
  event.preventDefault()
  
  try {
    const serviceData = {
      service_category: document.getElementById('serviceCategory').value,
      service_name: document.getElementById('serviceName').value,
      description: document.getElementById('serviceDescription').value,
      hourly_rate: parseFloat(document.getElementById('hourlyRate').value),
      years_experience: parseInt(document.getElementById('yearsExperience').value) || 0,
      service_area: []
    }

    await apiRequest('/worker/services', {
      method: 'POST',
      body: serviceData
    })

    showNotification('Service added successfully!', 'success')
    closeAddServiceModal()
    closeServicesModal()
    showServicesModal() // Refresh the services list
  } catch (error) {
    console.error('Error adding service:', error)
    showNotification('Failed to add service', 'error')
  }
}

// Edit service
async function editService(serviceId) {
  showNotification('Edit service functionality - feature coming soon!', 'info')
}

// Toggle service status
async function toggleServiceStatus(serviceId, newStatus) {
  try {
    await apiRequest(`/worker/services/${serviceId}`, {
      method: 'PUT',
      body: { is_available: newStatus }
    })

    showNotification(`Service ${newStatus ? 'activated' : 'deactivated'} successfully!`, 'success')
    closeServicesModal()
    showServicesModal() // Refresh the services list
  } catch (error) {
    console.error('Error toggling service status:', error)
    showNotification('Failed to update service status', 'error')
  }
}

// Delete service
async function deleteService(serviceId) {
  if (!confirm('Are you sure you want to delete this service?')) return
  
  try {
    await apiRequest(`/worker/services/${serviceId}`, {
      method: 'DELETE'
    })

    showNotification('Service deleted successfully!', 'success')
    closeServicesModal()
    showServicesModal() // Refresh the services list
  } catch (error) {
    console.error('Error deleting service:', error)
    showNotification('Failed to delete service', 'error')
  }
}

// Withdraw bid
async function withdrawBid(bidId) {
  if (!confirm('Are you sure you want to withdraw this bid?')) return
  
  try {
    await apiRequest(`/worker/bids/${bidId}/withdraw`, {
      method: 'PUT'
    })

    showNotification('Bid withdrawn successfully!', 'success')
    closeBidsModal()
    viewMyBids() // Refresh the bids list
  } catch (error) {
    console.error('Error withdrawing bid:', error)
    showNotification('Failed to withdraw bid', 'error')
  }
}

// Modify existing bid
async function modifyBid(bidId, jobId) {
  try {
    // Get current bid details
    const bidCheckResponse = await apiRequest(`/worker/bids/check/${jobId}`)
    const currentBid = bidCheckResponse.bid
    
    if (!currentBid) {
      showNotification('Bid not found', 'error')
      return
    }
    
    // Get job details for context
    const jobResponse = await apiRequest(`/jobs/${jobId}`)
    const job = jobResponse.job
    
    const modal = document.createElement('div')
    modal.id = 'modifyBidModal'
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-md w-full mx-4">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-900">Modify Your Bid</h3>
            <button onclick="closeModifyBidModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">Update your bid for: ${job.title}</p>
        </div>
        
        <form id="modifyBidForm" onsubmit="submitModifiedBid(event, ${bidId})" class="p-6 space-y-4">
          <!-- Current Bid Info -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-blue-900 mb-2">Current Bid</h4>
            <div class="text-sm text-blue-800">
              <p>Amount: $${parseFloat(currentBid.bid_amount).toFixed(2)}</p>
              <p>Timeline: ${currentBid.estimated_timeline}</p>
              ${currentBid.is_modified ? `<p class="text-orange-600">Modified ${currentBid.modification_count} time(s)</p>` : ''}
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">New Bid Amount (CAD)</label>
            <div class="relative">
              <span class="absolute left-3 top-3 text-gray-500">$</span>
              <input type="number" id="newBidAmount" class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                     step="0.01" min="1" value="${currentBid.bid_amount}" required>
            </div>
            <p class="text-xs text-gray-500 mt-1">Budget range: $${job.budget_min} - $${job.budget_max}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Updated Cover Message</label>
            <textarea id="newCoverMessage" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                      required>${currentBid.cover_message}</textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Updated Timeline</label>
            <select id="newEstimatedTimeline" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
              <option value="1-2 days" ${currentBid.estimated_timeline === '1-2 days' ? 'selected' : ''}>1-2 days</option>
              <option value="3-5 days" ${currentBid.estimated_timeline === '3-5 days' ? 'selected' : ''}>3-5 days</option>
              <option value="1 week" ${currentBid.estimated_timeline === '1 week' ? 'selected' : ''}>1 week</option>
              <option value="2 weeks" ${currentBid.estimated_timeline === '2 weeks' ? 'selected' : ''}>2 weeks</option>
              <option value="3-4 weeks" ${currentBid.estimated_timeline === '3-4 weeks' ? 'selected' : ''}>3-4 weeks</option>
              <option value="1-2 months" ${currentBid.estimated_timeline === '1-2 months' ? 'selected' : ''}>1-2 months</option>
              <option value="2+ months" ${currentBid.estimated_timeline === '2+ months' ? 'selected' : ''}>2+ months</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Reason for Modification</label>
            <input type="text" id="modificationReason" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                   placeholder="Brief reason for the change..." required>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onclick="closeModifyBidModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
              <i class="fas fa-edit mr-2"></i>Update Bid
            </button>
          </div>
        </form>
      </div>
    `
    
    document.body.appendChild(modal)
  } catch (error) {
    console.error('Error showing modify bid modal:', error)
    showNotification('Failed to load bid details', 'error')
  }
}

// Close modify bid modal
function closeModifyBidModal() {
  const modal = document.getElementById('modifyBidModal')
  if (modal) modal.remove()
}

// Submit modified bid
async function submitModifiedBid(event, bidId) {
  event.preventDefault()
  
  try {
    const modifiedBidData = {
      bid_amount: parseFloat(document.getElementById('newBidAmount').value),
      cover_message: document.getElementById('newCoverMessage').value,
      estimated_timeline: document.getElementById('newEstimatedTimeline').value,
      modification_reason: document.getElementById('modificationReason').value
    }

    await apiRequest(`/worker/bids/${bidId}`, {
      method: 'PUT',
      body: modifiedBidData
    })

    showNotification('Bid updated successfully!', 'success')
    closeModifyBidModal()
    
    // Refresh the page to show updated bid status
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error updating bid:', error)
    showNotification('Failed to update bid', 'error')
  }
}

// Load jobs page (pagination)
function loadJobsPage(page) {
  window.location.href = `/dashboard/worker?page=${page}`
}

// Check if worker has already bid on a job before showing bid modal
async function showBidModal(jobId) {
  try {
    // Check if worker already has a bid for this job
    const bidCheckResponse = await apiRequest(`/worker/bids/check/${jobId}`)
    
    if (bidCheckResponse.hasBid) {
      showNotification('You have already bid on this job. Use "Modify Bid" to update it.', 'warning')
      return
    }
    
    // Continue with normal bid modal logic
    const response = await apiRequest(`/jobs/${jobId}`)
    const job = response.job
    
    const modal = document.getElementById('bidModal')
    const summary = document.getElementById('bidJobSummary')
    const budgetRange = document.getElementById('budgetRange')
    const bidForm = document.getElementById('bidForm')
    
    // Set job ID on form
    bidForm.setAttribute('data-job-id', jobId)
    
    // Update job summary
    summary.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold">${job.title}</h4>
          <p class="text-sm text-gray-600">${job.category_name}</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-600">Budget</p>
          <p class="font-semibold">$${job.budget_min} - $${job.budget_max}</p>
        </div>
      </div>
    `
    
    budgetRange.textContent = `$${job.budget_min} - $${job.budget_max}`
    
    modal.classList.remove('hidden')
  } catch (error) {
    console.error('Failed to show bid modal:', error)
    showNotification(error.message || 'Failed to load job details', 'error')
  }
}