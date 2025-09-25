// Calendar & Scheduling functionality for Kwikr Directory

let currentDate = new Date()
let calendarEvents = []

// Initialize calendar
function initializeCalendar() {
  renderCalendar()
  loadCalendarEvents()
}

// Render calendar for current month
function renderCalendar() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // Update month header
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  const calendarDays = document.getElementById('calendarDays')
  calendarDays.innerHTML = ''
  
  // Add previous month's trailing days
  const prevMonth = new Date(year, month, 0)
  const daysInPrevMonth = prevMonth.getDate()
  
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i
    const dayElement = createCalendarDay(dayNumber, true, new Date(year, month - 1, dayNumber))
    calendarDays.appendChild(dayElement)
  }
  
  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = createCalendarDay(day, false, new Date(year, month, day))
    calendarDays.appendChild(dayElement)
  }
  
  // Add next month's leading days to fill grid
  const totalCells = calendarDays.children.length
  const remainingCells = 42 - totalCells // 6 rows × 7 days
  
  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createCalendarDay(day, true, new Date(year, month + 1, day))
    calendarDays.appendChild(dayElement)
  }
}

// Create calendar day element
function createCalendarDay(day, isOtherMonth, date) {
  const dayElement = document.createElement('div')
  dayElement.className = `calendar-day p-2 border-b border-r border-gray-200 ${
    isOtherMonth ? 'text-gray-400 bg-gray-50' : 'hover:bg-gray-50'
  }`
  
  // Check if this is today
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  
  dayElement.innerHTML = `
    <div class="flex justify-between items-start mb-1">
      <span class="text-sm font-medium ${isToday ? 'bg-kwikr-green text-white px-2 py-1 rounded-full' : ''}">${day}</span>
      <button onclick="showDayEvents('${date.toISOString().split('T')[0]}')" class="text-xs text-gray-400 hover:text-gray-600">
        <i class="fas fa-plus"></i>
      </button>
    </div>
    <div class="space-y-1" id="day-${date.toISOString().split('T')[0]}">
      <!-- Events will be added here -->
    </div>
  `
  
  return dayElement
}

// Load calendar events for current month
async function loadCalendarEvents() {
  try {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
    
    const response = await apiRequest(`/worker/calendar/events?start_date=${startDate}&end_date=${endDate}`)
    
    if (response.success) {
      calendarEvents = [
        ...response.events.appointments.map(apt => ({
          ...apt,
          event_type: 'appointment',
          type: 'appointment'
        })),
        ...response.events.time_blocks.map(tb => ({
          ...tb,
          event_type: 'time_block',
          type: 'work'
        })),
        ...response.events.personal.map(pe => ({
          ...pe,
          type: 'personal'
        }))
      ]
      
      renderCalendarEvents()
    }
  } catch (error) {
    console.error('Failed to load calendar events:', error)
    showNotification('Failed to load calendar events', 'error')
  }
}

// Render events on calendar
function renderCalendarEvents() {
  // Clear existing events
  document.querySelectorAll('[id^="day-"]').forEach(dayContainer => {
    dayContainer.innerHTML = ''
  })
  
  // Add events to appropriate days
  calendarEvents.forEach(event => {
    const eventDate = new Date(event.start_datetime).toISOString().split('T')[0]
    const dayContainer = document.getElementById(`day-${eventDate}`)
    
    if (dayContainer) {
      const eventElement = document.createElement('div')
      eventElement.className = `calendar-event event-${event.type}`
      eventElement.title = event.title + (event.description ? ` - ${event.description}` : '')
      eventElement.onclick = () => showEventDetails(event)
      
      const startTime = new Date(event.start_datetime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      
      eventElement.innerHTML = `${startTime} ${event.title}`
      dayContainer.appendChild(eventElement)
    }
  })
}

// Navigation functions
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1)
  renderCalendar()
  loadCalendarEvents()
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1)
  renderCalendar()
  loadCalendarEvents()
}

function goToToday() {
  currentDate = new Date()
  renderCalendar()
  loadCalendarEvents()
}

// Load today's schedule
async function loadTodaySchedule() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const response = await apiRequest(`/worker/calendar/events?start_date=${today}&end_date=${today}`)
    
    if (response.success) {
      const todayEvents = [
        ...response.events.appointments,
        ...response.events.time_blocks,
        ...response.events.personal
      ].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      
      const container = document.getElementById('todaySchedule')
      
      if (todayEvents.length === 0) {
        container.innerHTML = `
          <div class="text-center text-gray-500 py-4">
            <i class="fas fa-calendar-day text-2xl mb-2"></i>
            <p>No events scheduled for today</p>
          </div>
        `
        return
      }
      
      container.innerHTML = todayEvents.map(event => {
        const startTime = new Date(event.start_datetime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
        const endTime = new Date(event.end_datetime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
        
        let icon = 'fas fa-calendar-alt'
        let bgColor = 'bg-blue-50 border-blue-200'
        
        if (event.appointment_type || event.event_type === 'appointment') {
          icon = 'fas fa-handshake'
          bgColor = 'bg-blue-50 border-blue-200'
        } else if (event.block_type === 'work' || event.event_type === 'time_block') {
          icon = 'fas fa-tools'
          bgColor = 'bg-green-50 border-green-200'
        }
        
        return `
          <div class="p-3 border-l-4 ${bgColor} rounded-r-lg cursor-pointer hover:bg-opacity-75" onclick="showEventDetails(${JSON.stringify(event).replace(/"/g, '&quot;')})">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i class="${icon} text-sm mr-2"></i>
                <span class="font-medium">${event.title}</span>
              </div>
              <span class="text-sm text-gray-600">${startTime} - ${endTime}</span>
            </div>
            ${event.job_title ? `<p class="text-sm text-gray-600 mt-1">Job: ${event.job_title}</p>` : ''}
            ${event.client_first_name ? `<p class="text-sm text-gray-600 mt-1">Client: ${event.client_first_name} ${event.client_last_name}</p>` : ''}
          </div>
        `
      }).join('')
    }
  } catch (error) {
    console.error('Failed to load today\'s schedule:', error)
  }
}

// Load upcoming appointments
async function loadUpcomingAppointments() {
  try {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const response = await apiRequest(`/worker/calendar/events?start_date=${today.toISOString().split('T')[0]}&end_date=${nextWeek.toISOString().split('T')[0]}`)
    
    if (response.success) {
      const appointments = response.events.appointments
        .filter(apt => new Date(apt.start_datetime) > today)
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        .slice(0, 5)
      
      const container = document.getElementById('upcomingAppointments')
      
      if (appointments.length === 0) {
        container.innerHTML = `
          <div class="text-center text-gray-500 py-4">
            <i class="fas fa-clock text-2xl mb-2"></i>
            <p>No upcoming appointments</p>
          </div>
        `
        return
      }
      
      container.innerHTML = appointments.map(apt => {
        const appointmentDate = new Date(apt.start_datetime)
        const daysDiff = Math.ceil((appointmentDate - today) / (1000 * 60 * 60 * 24))
        
        let timeText = ''
        if (daysDiff === 0) {
          timeText = 'Today'
        } else if (daysDiff === 1) {
          timeText = 'Tomorrow'
        } else {
          timeText = appointmentDate.toLocaleDateString()
        }
        
        const time = appointmentDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
        
        return `
          <div class="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" onclick="showEventDetails(${JSON.stringify(apt).replace(/"/g, '&quot;')})">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium text-gray-900">${apt.title}</h4>
                <p class="text-sm text-gray-600">Client: ${apt.client_first_name} ${apt.client_last_name}</p>
                ${apt.job_title ? `<p class="text-sm text-gray-500">Job: ${apt.job_title}</p>` : ''}
              </div>
              <div class="text-right text-sm">
                <p class="font-medium text-gray-900">${timeText}</p>
                <p class="text-gray-600">${time}</p>
              </div>
            </div>
          </div>
        `
      }).join('')
    }
  } catch (error) {
    console.error('Failed to load upcoming appointments:', error)
  }
}

// Modal functions
function showAppointmentModal() {
  loadClientsAndJobs()
  document.getElementById('appointmentModal').classList.remove('hidden')
}

function closeAppointmentModal() {
  document.getElementById('appointmentModal').classList.add('hidden')
  document.getElementById('appointmentForm').reset()
}

// Load clients and jobs for appointment form
async function loadClientsAndJobs() {
  try {
    // Load clients from recent jobs or bids
    const response = await apiRequest('/worker/bids')
    if (response.bids) {
      const clientSelect = document.getElementById('clientSelect')
      const jobSelect = document.getElementById('jobSelect')
      
      // Extract unique clients
      const clients = {}
      const jobs = {}
      
      response.bids.forEach(bid => {
        if (bid.client_first_name) {
          clients[bid.job_id] = `${bid.client_first_name} ${bid.client_last_name}`
          jobs[bid.job_id] = bid.job_title
        }
      })
      
      // Populate client select
      clientSelect.innerHTML = '<option value="">Select a client</option>'
      Object.keys(clients).forEach(jobId => {
        clientSelect.innerHTML += `<option value="${jobId}" data-client="${clients[jobId]}">${clients[jobId]} (${jobs[jobId]})</option>`
      })
      
      // Update job select when client changes
      clientSelect.addEventListener('change', function() {
        const selectedJobId = this.value
        if (selectedJobId) {
          jobSelect.innerHTML = `<option value="${selectedJobId}">${jobs[selectedJobId]}</option>`
        } else {
          jobSelect.innerHTML = '<option value="">Select a job (optional)</option>'
        }
      })
    }
  } catch (error) {
    console.error('Failed to load clients and jobs:', error)
  }
}

// Handle appointment form submission
document.getElementById('appointmentForm')?.addEventListener('submit', async function(e) {
  e.preventDefault()
  
  const formData = {
    client_id: document.getElementById('clientSelect').value,
    job_id: document.getElementById('jobSelect').value || null,
    title: document.getElementById('appointmentTitle').value,
    description: document.getElementById('appointmentDescription').value,
    appointment_type: document.getElementById('appointmentType').value,
    start_datetime: document.getElementById('startDateTime').value,
    end_datetime: document.getElementById('endDateTime').value,
    location_type: document.getElementById('locationType').value,
    location_address: document.getElementById('locationAddress').value
  }
  
  try {
    const response = await apiRequest('/worker/calendar/appointments', {
      method: 'POST',
      body: formData
    })
    
    if (response.success) {
      showNotification('Appointment created successfully!', 'success')
      closeAppointmentModal()
      loadCalendarEvents()
      loadTodaySchedule()
      loadUpcomingAppointments()
    } else {
      throw new Error(response.error || 'Failed to create appointment')
    }
  } catch (error) {
    showNotification('Failed to create appointment: ' + error.message, 'error')
  }
})

// Show event details
function showEventDetails(event) {
  // For now, just show a simple alert with event details
  // In a full implementation, this would open a detailed modal
  const startTime = new Date(event.start_datetime).toLocaleString()
  const endTime = new Date(event.end_datetime).toLocaleString()
  
  let details = `${event.title}\n\n`
  details += `Start: ${startTime}\n`
  details += `End: ${endTime}\n`
  
  if (event.description) {
    details += `Description: ${event.description}\n`
  }
  
  if (event.client_first_name) {
    details += `Client: ${event.client_first_name} ${event.client_last_name}\n`
  }
  
  if (event.job_title) {
    details += `Job: ${event.job_title}\n`
  }
  
  if (event.location_address) {
    details += `Location: ${event.location_address}\n`
  }
  
  alert(details)
}

// Availability modal (placeholder)
function showAvailabilityModal() {
  showNotification('Availability management coming soon!', 'info')
}

// Show events for a specific day
function showDayEvents(date) {
  showNotification(`Events for ${date} - Full day view coming soon!`, 'info')
}

// Export functions to global scope
window.initializeCalendar = initializeCalendar
window.previousMonth = previousMonth
window.nextMonth = nextMonth
window.goToToday = goToToday
window.showAppointmentModal = showAppointmentModal
window.closeAppointmentModal = closeAppointmentModal
window.showAvailabilityModal = showAvailabilityModal
window.showEventDetails = showEventDetails
window.showDayEvents = showDayEvents
window.loadTodaySchedule = loadTodaySchedule
window.loadUpcomingAppointments = loadUpcomingAppointments