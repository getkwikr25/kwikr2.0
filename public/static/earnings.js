// Earnings & Tracking functionality for Kwikr Directory

let earningsChart = null
let expensesChart = null
let currentYear = new Date().getFullYear()

// Initialize charts
function initializeCharts() {
  const earningsCtx = document.getElementById('earningsChart')?.getContext('2d')
  const expensesCtx = document.getElementById('expensesChart')?.getContext('2d')
  
  if (earningsCtx) {
    earningsChart = new Chart(earningsCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Gross Earnings',
          data: [],
          borderColor: '#00C881',
          backgroundColor: 'rgba(0, 200, 129, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString()
              }
            }
          }
        }
      }
    })
  }
  
  if (expensesCtx) {
    expensesChart = new Chart(expensesCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ['#00C881', '#36A2EB', '#FFCE56', '#FF6384', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    })
  }
}

// Load earnings summary
async function loadEarningsSummary() {
  try {
    const year = document.getElementById('yearFilter')?.value || currentYear
    const response = await apiRequest(`/worker/earnings/summary?year=${year}`)
    
    if (response.success) {
      const summary = response.summary
      
      // Update summary cards
      document.getElementById('totalEarnings').textContent = '$' + summary.yearly.total_gross.toLocaleString('en-CA', {minimumFractionDigits: 2})
      document.getElementById('totalFees').textContent = '$' + summary.yearly.total_fees.toLocaleString('en-CA', {minimumFractionDigits: 2})
      document.getElementById('pendingAmount').textContent = '$' + summary.pending.amount.toLocaleString('en-CA', {minimumFractionDigits: 2})
      document.getElementById('totalJobs').textContent = summary.yearly.total_jobs
      document.getElementById('pendingCount').textContent = summary.pending.count
      document.getElementById('avgJobValue').textContent = '$' + summary.yearly.avg_job_value.toLocaleString('en-CA', {minimumFractionDigits: 2})
      
      // Update fee percentage
      if (summary.yearly.total_gross > 0) {
        const feePercent = ((summary.yearly.total_fees / summary.yearly.total_gross) * 100).toFixed(1)
        document.getElementById('feePercentage').textContent = feePercent + '%'
      }
      
      // Update monthly chart data
      if (earningsChart && summary.monthly) {
        const monthlyData = new Array(12).fill(0)
        summary.monthly.forEach(month => {
          const monthIndex = parseInt(month.month) - 1
          monthlyData[monthIndex] = parseFloat(month.gross_amount)
        })
        earningsChart.data.datasets[0].data = monthlyData
        earningsChart.update()
      }
    }
  } catch (error) {
    console.error('Failed to load earnings summary:', error)
    showNotification('Failed to load earnings summary', 'error')
  }
}

// Load earnings history
async function loadEarningsHistory(page = 1) {
  try {
    const status = document.getElementById('statusFilter')?.value || 'all'
    const year = document.getElementById('yearFilter')?.value || 'all'
    
    const response = await apiRequest(`/worker/earnings/history?page=${page}&status=${status}&year=${year}`)
    
    if (response.success) {
      const tbody = document.getElementById('earningsTableBody')
      
      if (response.earnings.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-8 text-gray-500">
              <i class="fas fa-dollar-sign text-2xl mb-2"></i>
              <p>No earnings records found</p>
            </td>
          </tr>
        `
        return
      }
      
      tbody.innerHTML = response.earnings.map(earning => {
        const createdDate = new Date(earning.created_at).toLocaleDateString()
        const statusColors = {
          'paid': 'bg-green-100 text-green-800',
          'pending': 'bg-yellow-100 text-yellow-800', 
          'processing': 'bg-blue-100 text-blue-800',
          'failed': 'bg-red-100 text-red-800'
        }
        
        return `
          <tr class="hover:bg-gray-50">
            <td class="py-3 px-6 text-sm text-gray-900">${createdDate}</td>
            <td class="py-3 px-6 text-sm text-gray-900">${earning.job_title || 'N/A'}</td>
            <td class="py-3 px-6 text-sm text-gray-600">${earning.client_first_name} ${earning.client_last_name}</td>
            <td class="py-3 px-6 text-sm text-gray-600">${earning.hours_worked || 'N/A'}</td>
            <td class="py-3 px-6 text-sm font-medium text-gray-900">$${parseFloat(earning.gross_amount).toFixed(2)}</td>
            <td class="py-3 px-6 text-sm text-gray-600">$${parseFloat(earning.platform_fee).toFixed(2)}</td>
            <td class="py-3 px-6 text-sm font-medium text-green-600">$${parseFloat(earning.net_amount).toFixed(2)}</td>
            <td class="py-3 px-6">
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[earning.payment_status] || 'bg-gray-100 text-gray-800'}">
                ${earning.payment_status.charAt(0).toUpperCase() + earning.payment_status.slice(1)}
              </span>
            </td>
          </tr>
        `
      }).join('')
    }
  } catch (error) {
    console.error('Failed to load earnings history:', error)
    showNotification('Failed to load earnings history', 'error')
  }
}

// Check for active time tracking sessions
async function checkActiveTimeSessions() {
  try {
    const response = await apiRequest('/worker/earnings/time-tracking/active')
    
    if (response.success && response.active_sessions.length > 0) {
      const session = response.active_sessions[0]
      const sessionStart = new Date(session.session_start)
      
      document.getElementById('activeTimeTracking').classList.remove('hidden')
      document.getElementById('activeSessionInfo').textContent = `Job: ${session.job_title} - Started at ${sessionStart.toLocaleTimeString()}`
      
      // Start timer
      startSessionTimer(sessionStart)
    }
  } catch (error) {
    console.error('Failed to check active sessions:', error)
  }
}

// Start session timer
function startSessionTimer(startTime) {
  const timerElement = document.getElementById('sessionTimer')
  
  function updateTimer() {
    const now = new Date()
    const elapsed = now - startTime
    const hours = Math.floor(elapsed / (1000 * 60 * 60))
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000)
    
    timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  updateTimer()
  setInterval(updateTimer, 1000)
}

// Stop time tracking
async function stopTimeTracking() {
  try {
    const response = await apiRequest('/worker/earnings/time-tracking/active')
    if (response.success && response.active_sessions.length > 0) {
      const sessionId = response.active_sessions[0].id
      
      const breakMinutes = prompt('How many minutes did you take for breaks?', '0')
      if (breakMinutes === null) return
      
      const stopResponse = await apiRequest('/worker/earnings/time-tracking/stop', {
        method: 'POST',
        body: {
          session_id: sessionId,
          break_minutes: parseInt(breakMinutes) || 0
        }
      })
      
      if (stopResponse.success) {
        document.getElementById('activeTimeTracking').classList.add('hidden')
        showNotification('Time tracking stopped successfully!', 'success')
        
        // Show earnings summary
        const session = stopResponse.session
        const message = `Session completed!\nDuration: ${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m\nBreaks: ${session.break_minutes}m\nEarnings: $${session.earnings_amount.toFixed(2)}`
        alert(message)
        
        // Reload data
        loadEarningsSummary()
      }
    }
  } catch (error) {
    console.error('Failed to stop time tracking:', error)
    showNotification('Failed to stop time tracking: ' + error.message, 'error')
  }
}

// Switch chart view
function switchChart(type) {
  const grossBtn = document.getElementById('grossBtn')
  const netBtn = document.getElementById('netBtn')
  
  if (type === 'gross') {
    grossBtn.className = 'px-3 py-1 bg-kwikr-green text-white rounded-lg'
    netBtn.className = 'px-3 py-1 border border-gray-300 rounded-lg'
    
    if (earningsChart) {
      earningsChart.data.datasets[0].label = 'Gross Earnings'
      earningsChart.data.datasets[0].borderColor = '#00C881'
      // Would need to reload with gross data
    }
  } else {
    netBtn.className = 'px-3 py-1 bg-kwikr-green text-white rounded-lg'
    grossBtn.className = 'px-3 py-1 border border-gray-300 rounded-lg'
    
    if (earningsChart) {
      earningsChart.data.datasets[0].label = 'Net Earnings'
      earningsChart.data.datasets[0].borderColor = '#10B981'
      // Would need to reload with net data
    }
  }
}

// Tab management
function showTab(tabName) {
  // Hide all tab contents
  document.getElementById('earningsContent').classList.add('hidden')
  document.getElementById('expensesContent').classList.add('hidden')
  document.getElementById('timeTrackingContent').classList.add('hidden')
  document.getElementById('taxInfoContent').classList.add('hidden')
  
  // Reset all tab buttons
  document.getElementById('earningsTab').className = 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700'
  document.getElementById('expensesTab').className = 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700'
  document.getElementById('timeTrackingTab').className = 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700'
  document.getElementById('taxInfoTab').className = 'pb-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700'
  
  // Show selected tab content and update button
  document.getElementById(tabName + 'Content').classList.remove('hidden')
  document.getElementById(tabName + 'Tab').className = 'pb-2 text-sm font-medium border-b-2 border-kwikr-green text-kwikr-green'
  
  // Load tab-specific content
  if (tabName === 'expenses') {
    loadExpenses()
  } else if (tabName === 'timeTracking') {
    loadTimeTrackingSessions()
  } else if (tabName === 'taxInfo') {
    loadTaxSummary()
  }
}

// Expense modal functions
function showExpenseModal() {
  document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0]
  document.getElementById('expenseModal').classList.remove('hidden')
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.add('hidden')
  document.getElementById('expenseForm').reset()
}

// Handle expense form submission
document.getElementById('expenseForm')?.addEventListener('submit', async function(e) {
  e.preventDefault()
  
  const formData = new FormData()
  const receiptFile = document.getElementById('receiptFile').files[0]
  
  let receiptData = null
  if (receiptFile) {
    receiptData = await convertFileToBase64(receiptFile)
  }
  
  const expenseData = {
    expense_category: document.getElementById('expenseCategory').value,
    description: document.getElementById('expenseDescription').value,
    amount: parseFloat(document.getElementById('expenseAmount').value),
    expense_date: document.getElementById('expenseDate').value,
    receipt_data: receiptData,
    is_business_expense: document.getElementById('isBusinessExpense').checked,
    is_tax_deductible: document.getElementById('isTaxDeductible').checked
  }
  
  try {
    const response = await apiRequest('/worker/earnings/expenses', {
      method: 'POST',
      body: expenseData
    })
    
    if (response.success) {
      showNotification('Expense added successfully!', 'success')
      closeExpenseModal()
      if (document.getElementById('expensesContent') && !document.getElementById('expensesContent').classList.contains('hidden')) {
        loadExpenses()
      }
    } else {
      throw new Error(response.error || 'Failed to add expense')
    }
  } catch (error) {
    showNotification('Failed to add expense: ' + error.message, 'error')
  }
})

// Load expenses (placeholder)
function loadExpenses() {
  const expensesList = document.getElementById('expensesList')
  expensesList.innerHTML = `
    <div class="text-center text-gray-500 py-8">
      <i class="fas fa-receipt text-2xl mb-2"></i>
      <p>Expense tracking functionality coming soon!</p>
    </div>
  `
}

// Load time tracking sessions (placeholder)
function loadTimeTrackingSessions() {
  const sessionsList = document.getElementById('timeTrackingSessions')
  sessionsList.innerHTML = `
    <div class="text-center text-gray-500 py-8">
      <i class="fas fa-clock text-2xl mb-2"></i>
      <p>Time tracking history coming soon!</p>
    </div>
  `
}

// Load tax summary
async function loadTaxSummary() {
  try {
    const year = document.getElementById('yearFilter')?.value || currentYear
    const response = await apiRequest(`/worker/earnings/tax-summary/${year}`)
    
    if (response.success) {
      const taxSummary = response.tax_summary
      
      document.getElementById('taxSummary').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Income Summary (${year})</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Total Gross Earnings:</span>
                <span class="font-medium">$${parseFloat(taxSummary.total_gross_earnings || 0).toLocaleString('en-CA', {minimumFractionDigits: 2})}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Platform Fees:</span>
                <span class="font-medium text-red-600">-$${parseFloat(taxSummary.total_platform_fees || 0).toLocaleString('en-CA', {minimumFractionDigits: 2})}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Business Expenses:</span>
                <span class="font-medium text-red-600">-$${parseFloat(taxSummary.total_tax_deductible_expenses || 0).toLocaleString('en-CA', {minimumFractionDigits: 2})}</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-semibold">
                <span>Net Taxable Income:</span>
                <span>$${parseFloat(taxSummary.net_taxable_income || 0).toLocaleString('en-CA', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Tax Information</h3>
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-blue-800 mb-2">
                <i class="fas fa-info-circle mr-2"></i>
                Tax documents and detailed reporting will be available during tax season.
              </p>
              <p class="text-xs text-blue-600">
                Consult with a tax professional for personalized advice.
              </p>
            </div>
            <button onclick="generateTaxReport()" class="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600">
              <i class="fas fa-download mr-2"></i>Download Tax Summary (PDF)
            </button>
          </div>
        </div>
      `
    }
  } catch (error) {
    console.error('Failed to load tax summary:', error)
    document.getElementById('taxSummary').innerHTML = `
      <div class="text-center text-red-500 py-8">
        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
        <p>Failed to load tax summary</p>
      </div>
    `
  }
}

// Generate tax report (placeholder)
function generateTaxReport() {
  showNotification('Tax report generation coming soon!', 'info')
}

// Helper function for file conversion
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Year filter change handler
document.getElementById('yearFilter')?.addEventListener('change', function() {
  currentYear = parseInt(this.value)
  loadEarningsSummary()
  loadEarningsHistory()
})

// Status filter change handler  
document.getElementById('statusFilter')?.addEventListener('change', function() {
  loadEarningsHistory()
})

// Export functions to global scope
window.initializeCharts = initializeCharts
window.loadEarningsSummary = loadEarningsSummary
window.loadEarningsHistory = loadEarningsHistory
window.checkActiveTimeSessions = checkActiveTimeSessions
window.stopTimeTracking = stopTimeTracking
window.switchChart = switchChart
window.showTab = showTab
window.showExpenseModal = showExpenseModal
window.closeExpenseModal = closeExpenseModal
window.generateTaxReport = generateTaxReport