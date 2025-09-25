// Client Dashboard JavaScript

// Use global currentUser if already defined, otherwise create local one
if (typeof window.currentUser === 'undefined') {
  window.currentUser = null
}
let currentJobs = []

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

if (typeof window.getStatusBadge === 'undefined') {
  window.getStatusBadge = function(status) {
    const statusClasses = {
      'posted': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    
    const statusLabels = {
      'posted': 'Posted',
      'assigned': 'Assigned',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    }
    
    const cssClass = statusClasses[status] || 'bg-gray-100 text-gray-800'
    const label = statusLabels[status] || status
    
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${cssClass}">${label}</span>`
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
  await loadUserInfo()
  await loadJobStats()
  await loadJobs()
  await loadJobCategories()
})

// Load user information
async function loadUserInfo() {
  try {
    const response = await apiRequest('/auth/me')
    currentUser = response.user
    
    if (currentUser.role !== 'client') {
      window.location.href = '/dashboard'
      return
    }
  } catch (error) {
    console.error('Failed to load user info:', error)
    window.location.href = '/?session=expired'
  }
}

// Load job statistics
async function loadJobStats() {
  try {
    const response = await apiRequest('/jobs/client/stats')
    
    document.getElementById('totalJobs').textContent = response.total || '0'
    document.getElementById('activeJobs').textContent = response.active || '0'
    document.getElementById('completedJobs').textContent = response.completed || '0'
    document.getElementById('pendingBids').textContent = response.pendingBids || '0'
    
  } catch (error) {
    console.error('Failed to load job stats:', error)
    // Set defaults
    document.getElementById('totalJobs').textContent = '0'
    document.getElementById('activeJobs').textContent = '0'
    document.getElementById('completedJobs').textContent = '0'
    document.getElementById('pendingBids').textContent = '0'
  }
}

// Load client's jobs
async function loadJobs() {
  try {
    const response = await apiRequest('/client/jobs')
    currentJobs = response.jobs || []
    
    renderJobs(currentJobs)
  } catch (error) {
    console.error('Failed to load jobs:', error)
    document.getElementById('jobsList').innerHTML = `
      <div class="p-6 text-center text-gray-500">
        <i class="fas fa-exclamation-triangle text-2xl mb-4"></i>
        <p>Failed to load jobs. Please try again.</p>
        <button onclick="loadJobs()" class="mt-2 text-kwikr-green hover:underline">Retry</button>
      </div>
    `
  }
}

// Render jobs list
function renderJobs(jobs) {
  const jobsList = document.getElementById('jobsList')
  
  if (!jobs || jobs.length === 0) {
    jobsList.innerHTML = `
      <div class="p-6 text-center text-gray-500">
        <i class="fas fa-briefcase text-4xl mb-4 text-gray-300"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
        <p class="mb-4">Start by posting your first job to find service providers.</p>
        <button onclick="showPostJobModal()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
          <i class="fas fa-plus mr-2"></i>Post Your First Job
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
          ${getStatusBadge(job.status)}
          <div class="mt-2">
            ${getUrgencyBadge(job.urgency)}
          </div>
        </div>
      </div>
      
      <div class="flex justify-between items-center pt-3 border-t border-gray-100">
        <div class="text-sm text-gray-600">
          <i class="fas fa-users mr-1"></i> ${job.bid_count || 0} bids
        </div>
        <div class="flex space-x-2">
          <button onclick="viewJobDetails(${job.id})" class="text-kwikr-green hover:text-green-600 text-sm font-medium">
            View Details
          </button>
          ${job.status === 'posted' ? `
            <button onclick="editJob(${job.id})" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Edit
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('')
  
  jobsList.innerHTML = jobsHtml
}

// Load job categories for the post job form
async function loadJobCategories() {
  try {
    const response = await apiRequest('/jobs/categories')
    const categories = response.categories || []
    
    const categorySelect = document.getElementById('jobCategory')
    categorySelect.innerHTML = '<option value="">Select Category</option>'
    
    categories.forEach(category => {
      categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`
    })
    
  } catch (error) {
    console.error('Failed to load job categories:', error)
  }
}

// Post job - Navigate to job posting page
function showPostJobModal() {
  window.location.href = '/dashboard/client/post-job'
}

// Legacy post job modal functions removed - now using dedicated job posting page

// Handle post job form submission
async function handlePostJob(event) {
  event.preventDefault()
  
  const formData = {
    title: document.getElementById('jobTitle').value,
    category_id: parseInt(document.getElementById('jobCategory').value),
    urgency: document.getElementById('jobUrgency').value,
    budget_min: parseFloat(document.getElementById('budgetMin').value) || null,
    budget_max: parseFloat(document.getElementById('budgetMax').value) || null,
    description: document.getElementById('jobDescription').value,
    location_province: document.getElementById('locationProvince').value,
    location_city: document.getElementById('locationCity').value,
    location_address: document.getElementById('locationAddress').value || null,
    start_date: document.getElementById('startDate').value || null,
    expected_completion: document.getElementById('expectedCompletion').value || null
  }
  
  // Validate required fields
  if (!formData.title || !formData.category_id || !formData.description || 
      !formData.location_province || !formData.location_city) {
    showNotification('Please fill in all required fields', 'error')
    return
  }
  
  try {
    const response = await apiRequest('/client/jobs', {
      method: 'POST',
      body: formData
    })
    
    showNotification('Job posted successfully!', 'success')
    // Job posted successfully - reload to show in dashboard
    
    // Reload jobs and activities
    setTimeout(() => {
      if (typeof window.loadRecentActivities === 'function') {
        window.loadRecentActivities()
      }
      window.location.reload() // Refresh to show new job
    }, 1000)
    
  } catch (error) {
    showNotification(error.message || 'Failed to post job', 'error')
  }
}

// View job details - Navigate to job details page
function viewJobDetails(jobId) {
  window.location.href = `/dashboard/client/job/${jobId}`
}

// Job details modal functions removed - now using dedicated job details page

// Accept bid
async function acceptBid(bidId) {
  if (!confirm('Are you sure you want to accept this bid? This will assign the job to this worker.')) {
    return
  }
  
  try {
    await apiRequest(`/client/bids/${bidId}/accept`, { method: 'POST' })
    showNotification('Bid accepted successfully!', 'success')
    // Bid action completed
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error accepting bid:', error)
    showNotification('Failed to accept bid', 'error')
  }
}

// Decline bid
async function declineBid(bidId) {
  if (!confirm('Are you sure you want to decline this bid?')) {
    return
  }
  
  try {
    await apiRequest(`/client/bids/${bidId}/decline`, { method: 'POST' })
    showNotification('Bid declined', 'success')
    // Bid action completed
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error declining bid:', error)
    showNotification('Failed to decline bid', 'error')
  }
}

// Edit job - Navigate to edit job page
function editJob(jobId) {
  window.location.href = `/dashboard/client/job/${jobId}/edit`
}

// Edit job modal functions removed - now using dedicated edit job page

// Load job categories
async function loadJobCategories() {
  try {
    const response = await apiRequest('/client/job-categories')
    const categories = response.categories
    
    // Populate category dropdowns
    const categorySelects = document.querySelectorAll('select[name="category_id"]')
    categorySelects.forEach(select => {
      select.innerHTML = '<option value="">Select a category...</option>'
      categories.forEach(category => {
        const option = document.createElement('option')
        option.value = category.id
        option.textContent = category.name
        select.appendChild(option)
      })
    })
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

// Browse workers - Navigate to worker browser page
function browseWorkers() {
  window.location.href = '/dashboard/client/browse-workers'
}

// Worker search modal functions removed - now using dedicated browse workers page

// Load job categories for worker search
async function loadJobCategoriesForWorkerSearch() {
  try {
    const response = await apiRequest('/client/job-categories')
    const categories = response.categories
    
    const select = document.getElementById('workerSearchCategory')
    if (select && categories) {
      categories.forEach(category => {
        const option = document.createElement('option')
        option.value = category.name
        option.textContent = category.name
        select.appendChild(option)
      })
    }
  } catch (error) {
    console.error('Failed to load job categories:', error)
  }
}

// Search workers
async function searchWorkers() {
  const category = document.getElementById('workerSearchCategory')?.value || ''
  const province = document.getElementById('workerSearchProvince')?.value || ''
  const city = document.getElementById('workerSearchCity')?.value || ''
  
  const container = document.getElementById('workersContainer')
  if (!container) return
  
  // Show loading
  container.innerHTML = `
    <div class="text-center py-8 text-gray-500">
      <i class="fas fa-spinner fa-spin text-2xl mb-3"></i>
      <p>Searching for service providers...</p>
    </div>
  `
  
  try {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (province) params.append('province', province)  
    if (city) params.append('location', city)
    
    const response = await apiRequest(`/client/workers/search?${params.toString()}`)
    displayWorkersResults(response.workers || [])
  } catch (error) {
    console.error('Failed to search workers:', error)
    container.innerHTML = `
      <div class="text-center py-8 text-red-500">
        <i class="fas fa-exclamation-triangle text-2xl mb-3"></i>
        <p>Failed to search service providers</p>
        <p class="text-sm mt-2">Please try again</p>
      </div>
    `
  }
}

// Display workers search results
function displayWorkersResults(workers) {
  const container = document.getElementById('workersContainer')
  if (!container) return
  
  if (workers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-user-slash text-3xl mb-3"></i>
        <p>No service providers found matching your criteria</p>
        <p class="text-sm mt-2">Try adjusting your search filters</p>
      </div>
    `
    return
  }
  
  container.innerHTML = `
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-900">Found ${workers.length} service provider${workers.length !== 1 ? 's' : ''}</h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${workers.map(worker => `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              ${worker.profile_image_url ? `
                <img src="${worker.profile_image_url}" alt="${worker.first_name} ${worker.last_name}" 
                     class="w-16 h-16 rounded-full object-cover">
              ` : `
                <div class="w-16 h-16 rounded-full bg-kwikr-green flex items-center justify-center text-white font-bold text-xl">
                  ${worker.first_name.charAt(0)}${worker.last_name.charAt(0)}
                </div>
              `}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-lg font-semibold text-gray-900 mb-1">${worker.first_name} ${worker.last_name}</h4>
              <p class="text-sm text-gray-600 mb-2">
                <i class="fas fa-map-marker-alt mr-1"></i>
                ${worker.city || 'N/A'}, ${worker.province || 'N/A'}
              </p>
              
              ${worker.bio ? `
                <p class="text-sm text-gray-700 mb-3 line-clamp-2">${worker.bio.substring(0, 120)}${worker.bio.length > 120 ? '...' : ''}</p>
              ` : ''}
              
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3 text-sm text-gray-600">
                  ${worker.avg_rating ? `
                    <span class="flex items-center">
                      <i class="fas fa-star text-yellow-400 mr-1"></i>
                      ${parseFloat(worker.avg_rating).toFixed(1)} (${worker.review_count} reviews)
                    </span>
                  ` : '<span class="text-gray-400">No reviews yet</span>'}
                  ${worker.experience_years ? `
                    <span><i class="fas fa-calendar mr-1"></i>${worker.experience_years} years exp</span>
                  ` : ''}
                </div>
              </div>
              
              <div class="mt-3 flex space-x-2">
                <button onclick="viewWorkerProfile(${worker.id})" 
                        class="flex-1 bg-kwikr-green text-white px-3 py-2 rounded text-sm hover:bg-green-600">
                  <i class="fas fa-eye mr-1"></i>View Profile
                </button>
                <button onclick="contactWorker(${worker.id})" 
                        class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">
                  <i class="fas fa-envelope mr-1"></i>Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `
}

// Generate HTML for workers display
function displayWorkersHTML(workers) {
  if (workers.length === 0) {
    return `
      <div class="text-center py-8">
        <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No workers found</h3>
        <p class="text-gray-500">Try adjusting your search criteria</p>
      </div>
    `
  }
  
  return workers.map(worker => `
    <div class="bg-white rounded-lg border border-gray-200 p-6 mb-4 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-4">
          <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <i class="fas fa-user text-gray-400 text-xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">
              ${worker.first_name} ${worker.last_name}
            </h3>
            <p class="text-sm text-gray-600 mb-2">
              <i class="fas fa-map-marker-alt mr-1"></i>
              ${worker.city || 'N/A'}, ${worker.province || 'N/A'}
            </p>
            ${worker.bio ? `<p class="text-sm text-gray-600 mb-3">${worker.bio}</p>` : ''}
            <div class="flex items-center space-x-4 text-sm text-gray-500">
              ${worker.avg_rating ? `
                <span class="flex items-center">
                  <i class="fas fa-star text-yellow-400 mr-1"></i>
                  ${parseFloat(worker.avg_rating).toFixed(1)} (${worker.review_count} reviews)
                </span>
              ` : '<span>No reviews yet</span>'}
              ${worker.experience_years ? `
                <span><i class="fas fa-calendar mr-1"></i>${worker.experience_years} years exp</span>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="flex flex-col space-y-2">
          <button onclick="viewWorkerProfile(${worker.id})" 
                  class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm">
            View Profile
          </button>
          <button onclick="contactWorker(${worker.id})" 
                  class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">
            Contact
          </button>
        </div>
      </div>
    </div>
  `).join('')
}

// View worker profile - Navigate to worker profile page
function viewWorkerProfile(workerId) {
  window.location.href = `/dashboard/client/worker/${workerId}`
}

// Worker profile modal function removed - now using dedicated worker profile page

// Contact worker
function contactWorker(workerId) {
  showNotification('Messaging feature coming soon!', 'info')
}

// Invite worker to job
function inviteToJob(workerId) {
  showNotification('Job invitation feature coming soon!', 'info')
}

// View and edit client profile - Navigate to profile page
function viewProfile() {
  window.location.href = '/dashboard/client/profile'
}

// Client profile modal functions removed - now using dedicated profile page

// Load recent activities
async function loadRecentActivities() {
  try {
    const response = await apiRequest('/client/activities?limit=10')
    displayRecentActivities(response.activities || [])
  } catch (error) {
    console.error('Error loading activities:', error)
    displayRecentActivities([])
  }
}

// Display recent activities
function displayRecentActivities(activities) {
  const container = document.getElementById('recentActivities')
  if (!container) return

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-bell text-2xl mb-2"></i>
        <p>No recent activities</p>
        <p class="text-sm mt-2">Post your first job to get started!</p>
      </div>
    `
    return
  }

  container.innerHTML = activities.map(activity => `
    <div class="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg">
      <div class="flex-shrink-0 w-8 h-8 bg-kwikr-green rounded-full flex items-center justify-center">
        <i class="${getActivityIcon(activity.activity_type)} text-white text-sm"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900">${activity.activity_title}</p>
        <p class="text-sm text-gray-600">${activity.activity_description}</p>
        <p class="text-xs text-gray-500 mt-1">${formatDate(activity.activity_date)}</p>
      </div>
      ${activity.related_type === 'job' ? `
        <button onclick="viewJobDetails(${activity.related_id})" 
                class="text-kwikr-green hover:text-green-600 text-sm">
          View
        </button>
      ` : ''}
    </div>
  `).join('')
}

// Get activity icon
function getActivityIcon(activityType) {
  const icons = {
    'job_posted': 'fas fa-plus',
    'bid_received': 'fas fa-envelope',
    'job_status_change': 'fas fa-sync-alt'
  }
  return icons[activityType] || 'fas fa-bell'
}

// Make functions globally available
window.showPostJobModal = showPostJobModal
window.handlePostJob = handlePostJob
window.viewJobDetails = viewJobDetails
window.editJob = editJob
window.acceptBid = acceptBid
window.declineBid = declineBid
window.browseWorkers = browseWorkers
window.viewProfile = viewProfile
window.loadRecentActivities = loadRecentActivities
window.viewWorkerProfile = viewWorkerProfile
window.contactWorker = contactWorker
window.inviteToJob = inviteToJob
window.loadJobCategories = loadJobCategories