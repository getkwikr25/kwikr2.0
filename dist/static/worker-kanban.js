// Worker Kanban Board for Job Tracking
console.log('Worker Kanban Board script loaded')

// Global state
let allJobs = []
let jobStatuses = {
  'assigned': { title: 'Assigned Jobs', color: 'blue', icon: 'fas fa-clipboard-list' },
  'in_progress': { title: 'In Progress', color: 'yellow', icon: 'fas fa-cogs' },
  'completed': { title: 'Completed', color: 'green', icon: 'fas fa-check-circle' }
}

// Initialize Kanban board
async function initializeKanban() {
  console.log('Initializing Kanban board')
  await loadWorkerJobs()
  renderKanbanBoard()
}

// Load jobs assigned to current worker
async function loadWorkerJobs() {
  console.log('Loading worker jobs')
  try {
    // Check if we have API function available
    if (!window.apiRequest) {
      console.log('No API function available - using demo data')
      loadDemoJobs()
      return
    }
    
    const response = await window.apiRequest('/api/worker/assigned-jobs', { method: 'GET' })
    
    if (response && response.success !== false) {
      allJobs = response.jobs || []
      console.log('Loaded jobs:', allJobs)
    } else {
      console.error('API returned error:', response)
      loadDemoJobs()
    }
  } catch (error) {
    console.error('Error loading worker jobs:', error)
    loadDemoJobs()
  }
}

// Load demo jobs (fallback when API is not available)
function loadDemoJobs() {
  console.log('Loading demo jobs')
  // Fallback demo data for Worker Kanban
  allJobs = [
        {
          id: 1,
          title: 'Kitchen Deep Clean',
          description: 'Need a thorough deep cleaning of my kitchen including appliances, cabinets, and floors.',
          status: 'assigned',
          client_name: 'Sarah Johnson',
          budget_min: 150,
          budget_max: 250,
          location_city: 'Toronto',
          location_province: 'ON',
          urgency: 'normal',
          created_at: '2024-08-20T10:00:00Z',
          category_name: 'Cleaning',
          milestones: [
            { id: 1, milestone_name: 'Job Assigned', is_completed: true, completed_at: '2024-08-20T10:00:00Z' },
            { id: 2, milestone_name: 'Work Started', is_completed: false },
            { id: 3, milestone_name: 'Work Completed', is_completed: false }
          ]
        },
        {
          id: 2,
          title: 'Bathroom Plumbing Repair',
          description: 'Leaky faucet in master bathroom needs repair. Also need to check water pressure in shower.',
          status: 'in_progress',
          client_name: 'Mike Chen',
          budget_min: 100,
          budget_max: 200,
          location_city: 'Toronto',
          location_province: 'ON',
          urgency: 'high',
          created_at: '2024-08-21T09:00:00Z',
          category_name: 'Plumbing',
          milestones: [
            { id: 4, milestone_name: 'Job Assigned', is_completed: true, completed_at: '2024-08-21T09:00:00Z' },
            { id: 5, milestone_name: 'Work Started', is_completed: true, completed_at: '2024-08-22T08:00:00Z' },
            { id: 6, milestone_name: 'Work Completed', is_completed: false }
          ]
        },
        {
          id: 3,
          title: 'Living Room Painting',
          description: 'Paint living room walls (approx 300 sq ft). Paint will be provided, need labor only.',
          status: 'completed',
          client_name: 'Lisa Davis',
          budget_min: 300,
          budget_max: 500,
          location_city: 'Toronto',
          location_province: 'ON',
          urgency: 'low',
          created_at: '2024-08-18T14:00:00Z',
          completed_at: '2024-08-19T16:00:00Z',
          category_name: 'Painting',
          milestones: [
            { id: 7, milestone_name: 'Job Assigned', is_completed: true, completed_at: '2024-08-18T14:00:00Z' },
            { id: 8, milestone_name: 'Work Started', is_completed: true, completed_at: '2024-08-19T08:00:00Z' },
            { id: 9, milestone_name: 'Work Completed', is_completed: true, completed_at: '2024-08-19T16:00:00Z' }
          ]
        }
  ]
  console.log('Using fallback worker jobs')
}

// Render the Kanban board
function renderKanbanBoard() {
  console.log('Rendering Kanban board')
  const container = document.getElementById('kanban-container')
  if (!container) {
    console.error('Kanban container not found')
    return
  }

  let html = '<div class="flex flex-col lg:flex-row gap-6 h-full">'
  
  // Create columns for each status
  Object.keys(jobStatuses).forEach(status => {
    const statusInfo = jobStatuses[status]
    const jobsInStatus = allJobs.filter(job => job.status === status)
    
    html += `
      <div class="flex-1 bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold flex items-center">
            <i class="${statusInfo.icon} text-${statusInfo.color}-600 mr-2"></i>
            ${statusInfo.title}
            <span class="ml-2 text-sm bg-${statusInfo.color}-100 text-${statusInfo.color}-800 px-2 py-1 rounded-full">
              ${jobsInStatus.length}
            </span>
          </h3>
        </div>
        
        <div class="space-y-4 kanban-column" id="column-${status}" data-status="${status}">
          ${jobsInStatus.map(job => renderJobCard(job)).join('')}
        </div>
      </div>
    `
  })
  
  html += '</div>'
  container.innerHTML = html
  
  // Add drag and drop functionality
  initializeDragAndDrop()
}

// Render individual job card
function renderJobCard(job) {
  const urgencyColors = {
    'low': 'blue',
    'normal': 'gray',
    'high': 'orange',
    'urgent': 'red'
  }
  
  const urgencyColor = urgencyColors[job.urgency] || 'gray'
  const completedMilestones = job.milestones ? job.milestones.filter(m => m.is_completed).length : 0
  const totalMilestones = job.milestones ? job.milestones.length : 0
  const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
  
  return `
    <div class="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow cursor-move job-card" 
         data-job-id="${job.id}" 
         draggable="true"
         ondragstart="return true">
      
      <!-- Job Header -->
      <div class="flex items-start justify-between mb-3">
        <h4 class="font-medium text-gray-900 flex-1">${job.title}</h4>
        <span class="px-2 py-1 text-xs rounded-full bg-${urgencyColor}-100 text-${urgencyColor}-800">
          ${job.urgency}
        </span>
      </div>
      
      <!-- Client Info -->
      <div class="flex items-center text-sm text-gray-600 mb-2">
        <i class="fas fa-user mr-2"></i>
        ${job.client_name || 'Client'}
      </div>
      
      <!-- Location -->
      <div class="flex items-center text-sm text-gray-600 mb-2">
        <i class="fas fa-map-marker-alt mr-2"></i>
        ${job.location_city}, ${job.location_province}
      </div>
      
      <!-- Budget -->
      <div class="flex items-center text-sm text-gray-600 mb-3">
        <i class="fas fa-dollar-sign mr-2"></i>
        $${job.budget_min} - $${job.budget_max}
      </div>
      
      <!-- Progress Bar -->
      <div class="mb-3">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
               style="width: ${progressPercent}%"></div>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          ${completedMilestones} of ${totalMilestones} milestones completed
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-2 mt-3">
        <button onclick="viewJobDetails(${job.id})" 
                class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
          <i class="fas fa-eye mr-1"></i>
          View Details
        </button>
        
        ${job.status === 'assigned' ? `
          <button onclick="startJob(${job.id})" 
                  class="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors">
            <i class="fas fa-play mr-1"></i>
            Start Job
          </button>
        ` : ''}
        
        ${job.status === 'in_progress' ? `
          <button onclick="completeJob(${job.id})" 
                  class="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors">
            <i class="fas fa-check mr-1"></i>
            Complete
          </button>
        ` : ''}
      </div>
    </div>
  `
}

// Initialize drag and drop functionality
function initializeDragAndDrop() {
  console.log('Initializing drag and drop')
  
  // Add event listeners for drag and drop
  const cards = document.querySelectorAll('[data-job-id]')
  const columns = document.querySelectorAll('[data-status]')
  
  console.log('Found cards:', cards.length, 'Found columns:', columns.length)
  
  cards.forEach(card => {
    card.setAttribute('draggable', 'true')
    card.addEventListener('dragstart', handleDragStart)
    card.addEventListener('dragend', handleDragEnd)
  })
  
  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver)
    column.addEventListener('drop', handleDrop)
    column.addEventListener('dragenter', handleDragEnter)
    column.addEventListener('dragleave', handleDragLeave)
  })
}

// Drag and drop event handlers
let draggedElement = null

function handleDragStart(e) {
  draggedElement = e.target
  e.target.classList.add('dragging')
  console.log('Drag started for job:', e.target.getAttribute('data-job-id'))
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging')
  // Clean up any drag-over classes
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over')
  })
  draggedElement = null
  console.log('Drag ended')
}

function handleDragOver(e) {
  e.preventDefault()
}

function handleDragEnter(e) {
  e.preventDefault()
  const column = e.target.closest('[data-status]')
  if (column && draggedElement) {
    column.classList.add('drag-over')
  }
}

function handleDragLeave(e) {
  const column = e.target.closest('[data-status]')
  if (column && !column.contains(e.relatedTarget)) {
    column.classList.remove('drag-over')
  }
}

function handleDrop(e) {
  e.preventDefault()
  
  const column = e.target.closest('[data-status]')
  if (column) {
    column.classList.remove('drag-over')
  }
  
  if (draggedElement && column) {
    const jobId = parseInt(draggedElement.getAttribute('data-job-id'))
    const newStatus = column.getAttribute('data-status')
    
    // Find current job status
    const job = allJobs.find(j => j.id === jobId)
    const currentStatus = job?.status
    
    console.log('Dropping job', jobId, 'from', currentStatus, 'to', newStatus)
    
    if (currentStatus && currentStatus !== newStatus) {
      // Update job status - this will trigger a re-render
      updateJobStatus(jobId, newStatus)
    } else {
      console.log('No status change needed or job not found')
    }
  }
}

// Job status update functions
async function updateJobStatus(jobId, newStatus) {
  console.log(`Updating job ${jobId} to status ${newStatus}`)
  
  try {
    // Check if we have a valid API function and user session
    if (!window.apiRequest || !window.currentUser) {
      console.log('No API function or user session - using demo mode')
      updateJobStatusDemo(jobId, newStatus)
      return
    }
    
    const response = await window.apiRequest(`/api/worker/jobs/${jobId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    })
    
    if (response && response.success !== false) {
      // Update local job data
      const job = allJobs.find(j => j.id === jobId)
      if (job) {
        job.status = newStatus
        
        // Update milestone completion based on status
        if (job.milestones) {
          job.milestones.forEach(milestone => {
            if (newStatus === 'in_progress' && milestone.milestone_name === 'Work Started') {
              milestone.is_completed = true
              milestone.completed_at = new Date().toISOString()
            } else if (newStatus === 'completed' && milestone.milestone_name === 'Work Completed') {
              milestone.is_completed = true
              milestone.completed_at = new Date().toISOString()
            }
          })
        }
      }
      
      // Re-render the board to update the UI
      renderKanbanBoard()
      showSuccess(`Job status updated to ${jobStatuses[newStatus]?.title || newStatus}`)
    } else {
      showError(response.error || 'Failed to update job status')
      // Re-render to restore original state
      renderKanbanBoard()
    }
  } catch (error) {
    console.error('Error updating job status:', error)
    console.log('API failed - falling back to demo mode')
    // Fall back to demo mode if API fails
    updateJobStatusDemo(jobId, newStatus)
  }
}

// Demo mode job status update (for when API is not available)
function updateJobStatusDemo(jobId, newStatus) {
  console.log(`Demo mode: Updating job ${jobId} to status ${newStatus}`)
  
  // Update local job data
  const job = allJobs.find(j => j.id === jobId)
  if (job) {
    job.status = newStatus
    
    // Update milestone completion based on status
    if (job.milestones) {
      job.milestones.forEach(milestone => {
        if (newStatus === 'in_progress' && milestone.milestone_name === 'Work Started') {
          milestone.is_completed = true
          milestone.completed_at = new Date().toISOString()
        } else if (newStatus === 'completed' && milestone.milestone_name === 'Work Completed') {
          milestone.is_completed = true
          milestone.completed_at = new Date().toISOString()
        }
      })
    }
  }
  
  // Re-render the board to update the UI
  renderKanbanBoard()
  showSuccess(`Job status updated to ${jobStatuses[newStatus]?.title || newStatus} (Demo Mode)`)
}

// Action button handlers
window.startJob = async function(jobId) {
  console.log('Start job clicked for job:', jobId)
  if (!confirm('Are you sure you want to start this job?')) return
  await updateJobStatus(jobId, 'in_progress')
}

window.completeJob = async function(jobId) {
  console.log('Complete job clicked for job:', jobId)
  if (!confirm('Are you sure you want to mark this job as completed?')) return
  await updateJobStatus(jobId, 'completed')
}

window.viewJobDetails = function(jobId) {
  // For now, navigate to client job details page since worker job details might not exist
  window.location.href = `/dashboard/client/job/${jobId}`
}

// Utility functions
function showSuccess(message) {
  if (window.showNotification) {
    window.showNotification(message, 'success')
  } else {
    alert(message)
  }
}

function showError(message) {
  if (window.showNotification) {
    window.showNotification(message, 'error')
  } else {
    alert(message)
  }
}

// Export functions for global access
window.initializeKanban = initializeKanban
window.loadWorkerJobs = loadWorkerJobs
window.renderKanbanBoard = renderKanbanBoard
window.startJob = startJob
window.completeJob = completeJob
window.viewJobDetails = viewJobDetails

console.log('Worker Kanban Board functions initialized')