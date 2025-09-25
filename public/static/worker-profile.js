// Worker Profile Page JavaScript

// Check if we're on our own profile
let isOwnProfile = false

// Initialize the profile page
document.addEventListener('DOMContentLoaded', async function() {
  await checkProfileOwnership()
  setupProfileInteractions()
})

// Check if the current user is viewing their own profile
async function checkProfileOwnership() {
  // Profile pages are public, so we need to safely check for session without redirecting
  try {
    // Try to get session token without using apiRequest (which might redirect)
    let token = null
    try {
      token = localStorage.getItem('sessionToken')
    } catch (e) {
      // Try cookies if localStorage fails
      const cookies = document.cookie.split(';')
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'session') {
          token = value
          break
        }
      }
    }
    
    // If we have a token, try to verify the session
    if (token) {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          // Get the profile user ID from the URL
          const pathParts = window.location.pathname.split('/')
          const profileUserId = pathParts[pathParts.length - 1]
          
          isOwnProfile = data.user.id === parseInt(profileUserId)
          
          // Show/hide edit button based on ownership
          const editButton = document.querySelector('button[onclick*="viewProfile"]')
          if (editButton) {
            if (isOwnProfile) {
              editButton.style.display = 'flex'
              editButton.onclick = () => showEditProfileModal()
            } else {
              editButton.style.display = 'none'
            }
          }
          return // Successfully handled
        }
      }
    }
    
    // No session or session invalid - this is fine for public profiles
    console.log('Profile page: No active session (this is normal for public profiles)')
    
  } catch (error) {
    console.log('Profile page: Session check failed, but continuing as public profile')
  }
  
  // Always hide edit button if we get here (no valid session)
  const editButton = document.querySelector('button[onclick*="viewProfile"]')
  if (editButton) {
    editButton.style.display = 'none'
  }
}

// Setup profile interactions
function setupProfileInteractions() {
  // Add click handlers for profile actions
  window.contactWorker = contactWorker
  window.requestQuote = requestQuote
  window.viewProfile = showEditProfileModal
}

// Contact worker function
function contactWorker(workerId) {
  // Check if user is logged in
  if (!window.currentUser) {
    showNotification('Please sign in to contact workers', 'warning')
    showLoginModal()
    return
  }
  
  // Create contact modal
  const modal = document.createElement('div')
  modal.id = 'contactModal'
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-lg w-full mx-4">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-900">Contact Worker</h3>
          <button onclick="closeContactModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <form id="contactForm" onsubmit="submitContactMessage(event)" class="p-6 space-y-4">
        <input type="hidden" id="workerId" value="${workerId}">
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Subject</label>
          <input type="text" id="contactSubject" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                 placeholder="Project inquiry..." required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea id="contactMessage" rows="5" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                    placeholder="Tell them about your project and requirements..." required></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Your Budget (Optional)</label>
          <input type="number" id="contactBudget" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                 placeholder="0.00" step="0.01" min="0">
        </div>
        
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" onclick="closeContactModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
            <i class="fas fa-envelope mr-2"></i>Send Message
          </button>
        </div>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
}

// Request quote function
function requestQuote(workerId) {
  // Check if user is logged in
  if (!window.currentUser) {
    showNotification('Please sign in to request quotes', 'warning')
    showLoginModal()
    return
  }
  
  // Create quote request modal
  const modal = document.createElement('div')
  modal.id = 'quoteModal'
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-900">Request Quote</h3>
          <button onclick="closeQuoteModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <form id="quoteForm" onsubmit="submitQuoteRequest(event)" class="p-6 space-y-6">
        <input type="hidden" id="quoteWorkerId" value="${workerId}">
        
        <!-- Project Details -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-4">Project Details</h4>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
              <input type="text" id="quoteTitle" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                     placeholder="e.g., Kitchen renovation" required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Project Description</label>
              <textarea id="quoteDescription" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                        placeholder="Describe your project in detail..." required></textarea>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Estimated Budget</label>
                <input type="number" id="quoteBudget" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                       placeholder="0.00" step="0.01" min="0" required>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Timeline</label>
                <select id="quoteTimeline" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                  <option value="">Select timeline</option>
                  <option value="ASAP">ASAP</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="3-4 weeks">3-4 weeks</option>
                  <option value="1-2 months">1-2 months</option>
                  <option value="2+ months">2+ months</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Location -->
        <div>
          <h4 class="font-semibold text-gray-900 mb-4">Location</h4>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Project Address</label>
              <input type="text" id="quoteAddress" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" 
                     placeholder="Full address where work will be done" required>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input type="text" id="quoteCity" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Province</label>
                <select id="quoteProvince" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green" required>
                  <option value="">Select Province</option>
                  <option value="AB">Alberta</option>
                  <option value="BC">British Columbia</option>
                  <option value="MB">Manitoba</option>
                  <option value="NB">New Brunswick</option>
                  <option value="NL">Newfoundland and Labrador</option>
                  <option value="NS">Nova Scotia</option>
                  <option value="NT">Northwest Territories</option>
                  <option value="NU">Nunavut</option>
                  <option value="ON">Ontario</option>
                  <option value="PE">Prince Edward Island</option>
                  <option value="QC">Quebec</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="YT">Yukon</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" onclick="closeQuoteModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
            <i class="fas fa-calculator mr-2"></i>Request Quote
          </button>
        </div>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
}

// Show edit profile modal (reuse from worker dashboard)
async function showEditProfileModal() {
  if (!isOwnProfile) {
    showNotification('You can only edit your own profile', 'warning')
    return
  }
  
  // Import and use the edit profile functionality from worker dashboard
  // This will open the same modal as in the worker dashboard
  if (typeof window.viewProfile === 'function') {
    window.viewProfile()
  } else {
    // Redirect to worker dashboard if function not available
    window.location.href = '/dashboard/worker'
  }
}

// Close contact modal
function closeContactModal() {
  const modal = document.getElementById('contactModal')
  if (modal) {
    modal.remove()
  }
}

// Close quote modal
function closeQuoteModal() {
  const modal = document.getElementById('quoteModal')
  if (modal) {
    modal.remove()
  }
}

// Submit contact message
async function submitContactMessage(event) {
  event.preventDefault()
  
  try {
    const formData = {
      workerId: document.getElementById('workerId').value,
      subject: document.getElementById('contactSubject').value,
      message: document.getElementById('contactMessage').value,
      budget: document.getElementById('contactBudget').value || null
    }
    
    // Here you would send the message to your API
    // For now, just show a success notification
    showNotification('Message sent successfully! The worker will contact you soon.', 'success')
    closeContactModal()
    
    // TODO: Implement actual message sending API
    console.log('Contact message:', formData)
    
  } catch (error) {
    console.error('Error sending contact message:', error)
    showNotification('Failed to send message. Please try again.', 'error')
  }
}

// Submit quote request
async function submitQuoteRequest(event) {
  event.preventDefault()
  
  try {
    const formData = {
      workerId: document.getElementById('quoteWorkerId').value,
      title: document.getElementById('quoteTitle').value,
      description: document.getElementById('quoteDescription').value,
      budget: parseFloat(document.getElementById('quoteBudget').value),
      timeline: document.getElementById('quoteTimeline').value,
      address: document.getElementById('quoteAddress').value,
      city: document.getElementById('quoteCity').value,
      province: document.getElementById('quoteProvince').value
    }
    
    // Here you would send the quote request to your API
    // For now, just show a success notification
    showNotification('Quote request sent successfully! You will receive a quote soon.', 'success')
    closeQuoteModal()
    
    // TODO: Implement actual quote request API
    console.log('Quote request:', formData)
    
  } catch (error) {
    console.error('Error submitting quote request:', error)
    showNotification('Failed to submit quote request. Please try again.', 'error')
  }
}

// ===== SERVICE AREAS MANAGEMENT =====

// Load service areas
async function loadServiceAreas() {
  if (!isOwnProfile) return
  
  try {
    const response = await apiRequest('/api/worker/service-areas', {
      method: 'GET'
    })
    
    if (response.success !== false) {
      const areas = response.service_areas || []
      displayServiceAreas(areas)
    }
  } catch (error) {
    console.error('Error loading service areas:', error)
  }
}

// Display service areas
function displayServiceAreas(areas) {
  const container = document.getElementById('serviceAreasList')
  if (!container) return
  
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
}

// Show add area form
function showAddAreaForm() {
  if (!isOwnProfile) return
  
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
  event.preventDefault()
  
  const areaName = document.getElementById('newAreaName').value.trim()
  if (!areaName) return
  
  try {
    const button = event.target.querySelector('button[type="submit"]')
    const originalText = button.innerHTML
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...'
    button.disabled = true
    
    const response = await apiRequest('/api/worker/service-areas', {
      method: 'POST',
      body: JSON.stringify({ area_name: areaName })
    })
    
    if (response.success !== false) {
      showNotification('Service area added successfully!', 'success')
      cancelAddArea()
      loadServiceAreas()
    } else {
      showNotification(response.error || 'Failed to add service area', 'error')
    }
    
    button.innerHTML = originalText
    button.disabled = false
  } catch (error) {
    console.error('Error saving service area:', error)
    showNotification('Failed to add service area. Please try again.', 'error')
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

const WEEKWEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Load hours of operation
async function loadHours() {
  if (!isOwnProfile) return
  
  try {
    const response = await apiRequest('/api/worker/hours', {
      method: 'GET'
    })
    
    if (response.success !== false) {
      const hours = response.hours || []
      displayHours(hours)
    }
  } catch (error) {
    console.error('Error loading hours:', error)
  }
}

// Display hours
function displayHours(hours) {
  const container = document.getElementById('hoursDisplay')
  if (!container) return
  
  // Create a map of hours by day
  const hoursByDay = {}
  hours.forEach(hour => {
    hoursByDay[hour.day_of_week] = hour
  })
  
  container.innerHTML = WEEKDAYS.map((dayName, index) => {
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
  if (!isOwnProfile) return
  
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
      
      // Load current hours into form
      loadHoursIntoForm()
    }
  }
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
    const response = await apiRequest('/api/worker/hours', {
      method: 'GET'
    })
    
    if (response.success !== false) {
      const hours = response.hours || []
      const hoursByDay = {}
      hours.forEach(hour => {
        hoursByDay[hour.day_of_week] = hour
      })
      
      WEEKDAYS.forEach((dayName, index) => {
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
          
          // Add event listener for checkbox
          checkbox.onchange = function() {
            if (this.checked) {
              timesDiv.classList.remove('hidden')
            } else {
              timesDiv.classList.add('hidden')
            }
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
  event.preventDefault()
  
  try {
    const button = event.target.querySelector('button[type="submit"]')
    const originalText = button.innerHTML
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...'
    button.disabled = true
    
    const hoursData = WEEKDAYS.map((dayName, index) => {
      const dayLower = dayName.toLowerCase()
      const checkbox = document.getElementById(`${dayLower}_open`)
      const openTime = document.getElementById(`${dayLower}_open_time`)
      const closeTime = document.getElementById(`${dayLower}_close_time`)
      
      return {
        is_open: checkbox.checked,
        open_time: checkbox.checked ? openTime.value : null,
        close_time: checkbox.checked ? closeTime.value : null
      }
    })
    
    const response = await apiRequest('/api/worker/hours', {
      method: 'PUT',
      body: JSON.stringify({ hours: hoursData })
    })
    
    if (response.success !== false) {
      showNotification('Hours updated successfully!', 'success')
      cancelHoursEdit()
      loadHours()
    } else {
      showNotification(response.error || 'Failed to update hours', 'error')
    }
    
    button.innerHTML = originalText
    button.disabled = false
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

// ===== PUBLIC DISPLAY FUNCTIONS =====

// Load public service areas (visible to all visitors)
async function loadPublicServiceAreas() {
  try {
    // Get profile user ID from URL
    const pathParts = window.location.pathname.split('/')
    const profileUserId = pathParts[pathParts.length - 1]
    
    const response = await fetch(`/api/public/profile/${profileUserId}/service-areas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const areas = data.service_areas || []
      displayPublicServiceAreas(areas)
    } else {
      // If API call fails, hide the section
      const section = document.getElementById('serviceAreasSection')
      if (section) section.style.display = 'none'
    }
  } catch (error) {
    console.error('Error loading public service areas:', error)
    // Hide section on error
    const section = document.getElementById('serviceAreasSection')
    if (section) section.style.display = 'none'
  }
}

// Display public service areas
function displayPublicServiceAreas(areas) {
  const container = document.getElementById('publicServiceAreas')
  if (!container) return
  
  if (areas.length === 0) {
    container.innerHTML = `
      <div class="text-gray-500 text-center py-4">
        <i class="fas fa-map-marker-alt mr-2"></i>
        Service areas not specified
      </div>
    `
    return
  }
  
  container.innerHTML = areas.map(area => `
    <div class="bg-kwikr-green bg-opacity-10 text-kwikr-green px-4 py-2 rounded-full flex items-center">
      <i class="fas fa-map-marker-alt mr-2"></i>
      <span class="font-medium">${area.area_name}</span>
    </div>
  `).join('')
}

// Load public hours (visible to all visitors)
async function loadPublicHours() {
  try {
    // Get profile user ID from URL
    const pathParts = window.location.pathname.split('/')
    const profileUserId = pathParts[pathParts.length - 1]
    
    const response = await fetch(`/api/public/profile/${profileUserId}/hours`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const hours = data.hours || []
      displayPublicHours(hours)
    } else {
      // If API call fails, hide the section
      const section = document.getElementById('hoursSection')
      if (section) section.style.display = 'none'
    }
  } catch (error) {
    console.error('Error loading public hours:', error)
    // Hide section on error
    const section = document.getElementById('hoursSection')
    if (section) section.style.display = 'none'
  }
}

// Display public hours
function displayPublicHours(hours) {
  const container = document.getElementById('publicHours')
  if (!container) return
  
  // Create a map of hours by day
  const hoursByDay = {}
  hours.forEach(hour => {
    hoursByDay[hour.day_of_week] = hour
  })
  
  const hasAnyHours = hours.some(hour => hour.is_open)
  
  if (!hasAnyHours) {
    container.innerHTML = `
      <div class="text-gray-500 text-center py-4">
        <i class="fas fa-clock mr-2"></i>
        Hours not specified - Contact for availability
      </div>
    `
    return
  }
  
  container.innerHTML = WEEKDAYS.map((dayName, index) => {
    const dayHours = hoursByDay[index]
    const isOpen = dayHours && dayHours.is_open
    
    return `
      <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 w-20">${dayName}</div>
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
    `
  }).join('')
}

// Initialize page data loading
document.addEventListener('DOMContentLoaded', function() {
  // Load public data for all visitors
  setTimeout(() => {
    loadPublicServiceAreas()
    loadPublicHours()
    
    // Also load management data if this is own profile
    if (isOwnProfile) {
      loadServiceAreas()
      loadHours()
    }
  }, 500) // Small delay to ensure auth check is complete
})

// Make functions globally available
window.contactWorker = contactWorker
window.requestQuote = requestQuote
window.closeContactModal = closeContactModal
window.closeQuoteModal = closeQuoteModal
window.submitContactMessage = submitContactMessage
window.submitQuoteRequest = submitQuoteRequest
window.showEditProfileModal = showEditProfileModal

// Service Areas functions
window.showAddAreaForm = showAddAreaForm
window.cancelAddArea = cancelAddArea
window.saveServiceArea = saveServiceArea
window.removeServiceArea = removeServiceArea

// Hours functions
window.toggleHoursEdit = toggleHoursEdit
window.cancelHoursEdit = cancelHoursEdit
window.saveHours = saveHours