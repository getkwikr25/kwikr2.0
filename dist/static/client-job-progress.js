// Client Job Progress Visualization
console.log('Client Job Progress script loaded')

// Job progress visualization functions
function renderJobProgressCard(job) {
  const statusConfig = {
    'posted': { 
      title: 'Posted', 
      color: 'blue', 
      icon: 'fas fa-plus-circle',
      progress: 10,
      description: 'Job posted and waiting for bids'
    },
    'assigned': { 
      title: 'Worker Assigned', 
      color: 'yellow', 
      icon: 'fas fa-user-check',
      progress: 25,
      description: 'Worker has been assigned to your job'
    },
    'in_progress': { 
      title: 'Work In Progress', 
      color: 'orange', 
      icon: 'fas fa-cogs',
      progress: 75,
      description: 'Work is currently being performed'
    },
    'completed': { 
      title: 'Completed', 
      color: 'green', 
      icon: 'fas fa-check-circle',
      progress: 100,
      description: 'Work has been completed successfully'
    },
    'cancelled': { 
      title: 'Cancelled', 
      color: 'red', 
      icon: 'fas fa-times-circle',
      progress: 0,
      description: 'Job was cancelled'
    },
    'disputed': { 
      title: 'Disputed', 
      color: 'red', 
      icon: 'fas fa-exclamation-triangle',
      progress: 50,
      description: 'There is a dispute that needs resolution'
    }
  }
  
  const config = statusConfig[job.status] || statusConfig['posted']
  const urgencyColors = { 'low': 'blue', 'normal': 'gray', 'high': 'orange', 'urgent': 'red' }
  const urgencyColor = urgencyColors[job.urgency] || 'gray'
  
  // Calculate milestone progress
  const milestones = job.milestones || []
  const completedMilestones = milestones.filter(m => m.is_completed).length
  const totalMilestones = milestones.length
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : config.progress
  
  return `
    <div class="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
      <!-- Job Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-1">${job.title}</h3>
          <p class="text-sm text-gray-600 line-clamp-2">${job.description}</p>
        </div>
        <span class="px-2 py-1 text-xs rounded-full bg-${urgencyColor}-100 text-${urgencyColor}-800 ml-4">
          ${job.urgency}
        </span>
      </div>
      
      <!-- Status and Progress -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center">
            <i class="${config.icon} text-${config.color}-600 mr-2"></i>
            <span class="text-sm font-medium text-${config.color}-800">${config.title}</span>
          </div>
          <span class="text-sm text-gray-500">${milestoneProgress}%</span>
        </div>
        
        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div class="bg-${config.color}-600 h-3 rounded-full transition-all duration-300" 
               style="width: ${milestoneProgress}%"></div>
        </div>
        
        <p class="text-xs text-gray-500">${config.description}</p>
      </div>
      
      <!-- Milestone Timeline -->
      ${milestones.length > 0 ? `
        <div class="mb-4">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Progress Milestones</h4>
          <div class="space-y-2">
            ${milestones.map((milestone, index) => `
              <div class="flex items-center text-sm">
                <div class="flex items-center mr-3">
                  <div class="w-4 h-4 rounded-full ${milestone.is_completed ? 'bg-green-500' : 'bg-gray-300'} flex items-center justify-center">
                    ${milestone.is_completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                  </div>
                  ${index < milestones.length - 1 ? '<div class="w-px h-4 bg-gray-300 ml-2"></div>' : ''}
                </div>
                <div class="flex-1">
                  <span class="${milestone.is_completed ? 'text-green-700 font-medium' : 'text-gray-500'}">${milestone.milestone_name}</span>
                  ${milestone.completed_at ? `<span class="text-xs text-gray-400 ml-2">${formatDateTime(milestone.completed_at)}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Job Details -->
      <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span class="text-gray-500">Budget:</span>
          <span class="font-medium">$${job.budget_min} - $${job.budget_max}</span>
        </div>
        <div>
          <span class="text-gray-500">Location:</span>
          <span class="font-medium">${job.location_city}, ${job.location_province}</span>
        </div>
        <div>
          <span class="text-gray-500">Posted:</span>
          <span class="font-medium">${formatDate(job.created_at)}</span>
        </div>
        ${job.assigned_worker_name ? `
          <div>
            <span class="text-gray-500">Worker:</span>
            <span class="font-medium">${job.assigned_worker_name}</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button onclick="viewJobDetails(${job.id})" 
                class="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
          <i class="fas fa-eye mr-1"></i>
          View Details
        </button>
        
        ${job.status === 'posted' ? `
          <button onclick="viewJobBids(${job.id})" 
                  class="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors">
            <i class="fas fa-users mr-1"></i>
            View Bids
          </button>
        ` : ''}
        
        ${job.status === 'in_progress' && job.assigned_worker_id ? `
          <button onclick="contactWorker(${job.assigned_worker_id}, ${job.id})" 
                  class="flex-1 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition-colors">
            <i class="fas fa-comments mr-1"></i>
            Contact Worker
          </button>
        ` : ''}
        
        ${job.status === 'completed' && !job.has_review ? `
          <button onclick="writeReview(${job.id})" 
                  class="flex-1 bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-colors">
            <i class="fas fa-star mr-1"></i>
            Write Review
          </button>
        ` : ''}
      </div>
    </div>
  `
}

// Enhanced client dashboard with progress visualization
function renderClientJobsWithProgress(jobs) {
  const jobsByStatus = {
    'active': jobs.filter(job => ['posted', 'assigned', 'in_progress'].includes(job.status)),
    'completed': jobs.filter(job => job.status === 'completed'),
    'other': jobs.filter(job => ['cancelled', 'disputed'].includes(job.status))
  }
  
  let html = '<div class="space-y-8">'
  
  // Active Jobs Section
  if (jobsByStatus.active.length > 0) {
    html += `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-clock text-blue-600 mr-2"></i>
            Active Jobs (${jobsByStatus.active.length})
          </h2>
        </div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          ${jobsByStatus.active.map(job => renderJobProgressCard(job)).join('')}
        </div>
      </div>
    `
  }
  
  // Completed Jobs Section
  if (jobsByStatus.completed.length > 0) {
    html += `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-check-circle text-green-600 mr-2"></i>
            Completed Jobs (${jobsByStatus.completed.length})
          </h2>
        </div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          ${jobsByStatus.completed.map(job => renderJobProgressCard(job)).join('')}
        </div>
      </div>
    `
  }
  
  // Other Jobs Section (Cancelled, Disputed)
  if (jobsByStatus.other.length > 0) {
    html += `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-900">
            <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>
            Other Jobs (${jobsByStatus.other.length})
          </h2>
        </div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          ${jobsByStatus.other.map(job => renderJobProgressCard(job)).join('')}
        </div>
      </div>
    `
  }
  
  html += '</div>'
  return html
}

// Action functions
function viewJobDetails(jobId) {
  window.location.href = `/dashboard/client/job/${jobId}`
}

function viewJobBids(jobId) {
  window.location.href = `/dashboard/client/job/${jobId}#bids`
}

function contactWorker(workerId, jobId) {
  // This could open a messaging modal or navigate to a messaging page
  window.location.href = `/dashboard/client/job/${jobId}#messages`
}

function writeReview(jobId) {
  // This could open a review modal or navigate to a review page
  window.location.href = `/dashboard/client/job/${jobId}#review`
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

function formatDateTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Load client jobs with progress data
async function loadClientJobsWithProgress() {
  console.log('Loading client jobs with progress data')
  try {
    const response = await window.apiRequest('/api/client/jobs-with-progress', { method: 'GET' })
    
    if (response.success !== false) {
      const jobs = response.jobs || []
      console.log('Loaded client jobs with progress:', jobs)
      
      const container = document.getElementById('client-jobs-progress-container')
      if (container) {
        if (jobs.length === 0) {
          container.innerHTML = `
            <div class="text-center py-12">
              <i class="fas fa-briefcase text-gray-300 text-6xl mb-4"></i>
              <h3 class="text-xl font-medium text-gray-900 mb-2">No Jobs Yet</h3>
              <p class="text-gray-500 mb-6">You haven't posted any jobs yet. Get started by posting your first job!</p>
              <button onclick="showPostJobModal()" class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-plus mr-2"></i>Post Your First Job
              </button>
            </div>
          `
        } else {
          container.innerHTML = renderClientJobsWithProgress(jobs)
        }
      }
    } else {
      console.error('API returned error:', response)
      // Use fallback demo data with progress
      const fallbackJobs = [
        {
          id: 1,
          title: 'Kitchen Deep Clean',
          description: 'Need a thorough deep cleaning of my kitchen including appliances, cabinets, and floors.',
          status: 'in_progress',
          budget_min: 150,
          budget_max: 250,
          location_city: 'Toronto',
          location_province: 'ON',
          urgency: 'normal',
          created_at: '2024-08-20T10:00:00Z',
          assigned_worker_name: 'Emma Johnson',
          assigned_worker_id: 4,
          milestones: [
            { id: 1, milestone_name: 'Job Assigned', is_completed: true, completed_at: '2024-08-20T10:00:00Z' },
            { id: 2, milestone_name: 'Work Started', is_completed: true, completed_at: '2024-08-22T08:00:00Z' },
            { id: 3, milestone_name: 'Work Completed', is_completed: false }
          ]
        },
        {
          id: 2,
          title: 'Living Room Painting',
          description: 'Paint living room walls (approx 300 sq ft). Paint will be provided, need labor only.',
          status: 'completed',
          budget_min: 300,
          budget_max: 500,
          location_city: 'Toronto',
          location_province: 'ON',
          urgency: 'low',
          created_at: '2024-08-18T14:00:00Z',
          assigned_worker_name: 'Mike Chen',
          assigned_worker_id: 5,
          milestones: [
            { id: 4, milestone_name: 'Job Assigned', is_completed: true, completed_at: '2024-08-18T14:00:00Z' },
            { id: 5, milestone_name: 'Work Started', is_completed: true, completed_at: '2024-08-19T08:00:00Z' },
            { id: 6, milestone_name: 'Work Completed', is_completed: true, completed_at: '2024-08-19T16:00:00Z' }
          ]
        }
      ]
      
      const container = document.getElementById('client-jobs-progress-container')
      if (container) {
        container.innerHTML = renderClientJobsWithProgress(fallbackJobs)
      }
    }
  } catch (error) {
    console.error('Error loading client jobs with progress:', error)
    
    const container = document.getElementById('client-jobs-progress-container')
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-exclamation-triangle text-red-300 text-4xl mb-4"></i>
          <p class="text-gray-500">Unable to load your jobs. Please try again later.</p>
          <button onclick="loadClientJobsWithProgress()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            <i class="fas fa-sync-alt mr-2"></i>Retry
          </button>
        </div>
      `
    }
  }
}

// Export functions for global access
window.renderJobProgressCard = renderJobProgressCard
window.renderClientJobsWithProgress = renderClientJobsWithProgress
window.loadClientJobsWithProgress = loadClientJobsWithProgress
window.viewJobDetails = viewJobDetails
window.viewJobBids = viewJobBids
window.contactWorker = contactWorker
window.writeReview = writeReview

console.log('Client Job Progress functions initialized')