/**
 * Kwikr Admin Dashboard - Real-time Updates & Cross-Dashboard Synchronization
 * Advanced analytics, performance metrics, and business intelligence
 */

class AdminDashboard {
  constructor() {
    this.updateInterval = 30000 // 30 seconds
    this.syncInterval = 10000   // 10 seconds for critical data
    this.charts = {}
    this.lastUpdate = null
    this.isOnline = true
    this.retryCount = 0
    this.maxRetries = 5
    
    this.init()
  }

  init() {
    console.log('🚀 Initializing Kwikr Admin Dashboard v2.0')
    
    // Initialize event listeners
    this.setupEventListeners()
    
    // Start real-time updates
    this.startRealTimeUpdates()
    
    // Initialize charts
    this.initializeCharts()
    
    // Setup cross-dashboard synchronization
    this.setupCrossDashboardSync()
    
    // Initialize performance monitoring
    this.initPerformanceMonitoring()
    
    console.log('✅ Admin Dashboard initialized successfully')
  }

  setupEventListeners() {
    // Visibility change detection for pause/resume updates
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseUpdates()
      } else {
        this.resumeUpdates()
      }
    })

    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true
      this.showNotification('🟢 Connection restored', 'success')
      this.resumeUpdates()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.showNotification('🔴 Connection lost - Updates paused', 'warning')
      this.pauseUpdates()
    })

    // Refresh button
    const refreshBtn = document.getElementById('refreshDashboard')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.forceUpdate())
    }

    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('autoRefreshToggle')
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.resumeUpdates()
        } else {
          this.pauseUpdates()
        }
      })
    }
  }

  startRealTimeUpdates() {
    // Immediate first update
    this.updateDashboard()
    
    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      if (this.isOnline && !document.hidden) {
        this.updateDashboard()
      }
    }, this.updateInterval)

    // More frequent sync for critical data
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !document.hidden) {
        this.syncCriticalData()
      }
    }, this.syncInterval)
  }

  async updateDashboard() {
    try {
      console.log('🔄 Updating dashboard data...')
      this.showLoadingIndicator(true)

      // Fetch real-time dashboard data
      const response = await this.fetchWithAuth('/api/admin/dashboard/realtime')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      this.lastUpdate = new Date(data.timestamp)
      this.retryCount = 0

      // Update all dashboard sections
      this.updateMetricCards(data.dashboard_metrics)
      this.updateActivityFeed(data.recent_activity)
      this.updatePerformanceMetrics(data.performance_metrics)
      this.updateSystemHealth(data.system_health)
      this.updateGeographicData(data.geographic_distribution)
      this.updateTodayActivity(data.today_activity)

      // Update charts
      this.updateCharts(data)

      // Update last refresh time
      this.updateLastRefreshTime()

      this.showLoadingIndicator(false)
      console.log('✅ Dashboard updated successfully')

    } catch (error) {
      console.error('❌ Dashboard update failed:', error)
      this.handleUpdateError(error)
    }
  }

  async syncCriticalData() {
    try {
      // Sync only critical modules to reduce load
      const response = await this.fetchWithAuth('/api/admin/dashboard/sync?modules=users,disputes,performance')
      
      if (!response.ok) return

      const data = await response.json()
      
      // Update critical indicators only
      this.updateCriticalIndicators(data.modules)

    } catch (error) {
      console.error('Sync error:', error)
    }
  }

  updateMetricCards(metrics) {
    const cardMappings = {
      'total-users': metrics.active_users,
      'active-workers': metrics.active_workers,
      'open-jobs': metrics.open_jobs,
      'total-revenue': this.formatCurrency(metrics.total_revenue),
      'active-disputes': metrics.active_disputes,
      'pending-documents': metrics.pending_documents,
      'verified-users': metrics.verified_users,
      'jobs-in-progress': metrics.jobs_in_progress
    }

    Object.entries(cardMappings).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) {
        // Add animation for value changes
        const oldValue = element.textContent
        if (oldValue !== String(value)) {
          element.style.transform = 'scale(1.1)'
          element.style.color = '#00C881'
          setTimeout(() => {
            element.style.transform = 'scale(1)'
            element.style.color = ''
          }, 300)
        }
        element.textContent = value
      }
    })
  }

  updateActivityFeed(activities) {
    const feedContainer = document.getElementById('activity-feed')
    if (!feedContainer) return

    feedContainer.innerHTML = ''

    activities.forEach(activity => {
      const item = document.createElement('div')
      item.className = 'activity-item flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors'
      
      const icon = this.getActivityIcon(activity.activity_type)
      const timeAgo = this.timeAgo(new Date(activity.timestamp))
      
      item.innerHTML = `
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-kwikr-green bg-opacity-10 rounded-full flex items-center justify-center">
            <i class="${icon} text-kwikr-green text-sm"></i>
          </div>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-900">${activity.description}</p>
          <p class="text-xs text-gray-500">${timeAgo}</p>
        </div>
        ${activity.metadata ? `<span class="text-xs bg-gray-100 px-2 py-1 rounded">${activity.metadata}</span>` : ''}
      `
      
      feedContainer.appendChild(item)
    })
  }

  updatePerformanceMetrics(metrics) {
    const performanceContainer = document.getElementById('performance-metrics')
    if (!performanceContainer) return

    const metricsHtml = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold ${metrics.avg_dispute_resolution_hours > 72 ? 'text-red-600' : 'text-kwikr-green'}">
            ${Math.round(metrics.avg_dispute_resolution_hours * 10) / 10}h
          </div>
          <div class="text-xs text-gray-600">Avg Resolution Time</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold ${metrics.sla_violations > 0 ? 'text-red-600' : 'text-kwikr-green'}">
            ${metrics.sla_violations}
          </div>
          <div class="text-xs text-gray-600">SLA Violations</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold ${metrics.avg_document_review_hours > 48 ? 'text-yellow-600' : 'text-kwikr-green'}">
            ${Math.round(metrics.avg_document_review_hours * 10) / 10}h
          </div>
          <div class="text-xs text-gray-600">Doc Review Time</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold ${metrics.document_approval_rate < 80 ? 'text-yellow-600' : 'text-kwikr-green'}">
            ${Math.round(metrics.document_approval_rate)}%
          </div>
          <div class="text-xs text-gray-600">Approval Rate</div>
        </div>
      </div>
    `
    
    performanceContainer.innerHTML = metricsHtml
  }

  updateSystemHealth(health) {
    const healthContainer = document.getElementById('system-health')
    if (!healthContainer) return

    const healthStatus = health.database_responsive && health.system_load < 0.8 ? 'healthy' : 'warning'
    const healthColor = healthStatus === 'healthy' ? 'text-green-600' : 'text-yellow-600'
    
    healthContainer.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full ${healthStatus === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse mr-2"></div>
          <span class="text-sm font-medium ${healthColor}">
            System ${healthStatus === 'healthy' ? 'Healthy' : 'Warning'}
          </span>
        </div>
        <div class="text-xs text-gray-500">
          ${Math.round(health.response_time_ms)}ms response
        </div>
      </div>
      <div class="mt-2 space-y-1">
        <div class="flex justify-between text-xs">
          <span>Load: ${Math.round(health.system_load * 100)}%</span>
          <span>Memory: ${Math.round(health.memory_usage * 100)}%</span>
        </div>
        <div class="flex justify-between text-xs text-gray-500">
          <span>Sessions: ${health.active_sessions}</span>
          <span>Last backup: ${this.timeAgo(new Date(health.last_backup))}</span>
        </div>
      </div>
    `
  }

  updateGeographicData(geoData) {
    const geoContainer = document.getElementById('geographic-distribution')
    if (!geoContainer) return

    const sortedData = geoData.sort((a, b) => b.user_count - a.user_count).slice(0, 5)
    
    const geoHtml = sortedData.map(province => `
      <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
        <div class="flex items-center">
          <span class="text-sm font-medium text-gray-900">${province.province}</span>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold text-kwikr-green">${province.user_count}</div>
          <div class="text-xs text-gray-500">${province.worker_count}W / ${province.client_count}C</div>
        </div>
      </div>
    `).join('')

    geoContainer.innerHTML = geoHtml || '<p class="text-gray-500 text-sm">No geographic data available</p>'
  }

  updateTodayActivity(todayData) {
    const todayContainer = document.getElementById('today-activity')
    if (!todayContainer) return

    todayContainer.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="text-center">
          <div class="text-xl font-bold text-blue-600">${todayData.users_today || 0}</div>
          <div class="text-xs text-gray-600">New Users</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-green-600">${todayData.jobs_today || 0}</div>
          <div class="text-xs text-gray-600">Jobs Posted</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-purple-600">${todayData.applications_today || 0}</div>
          <div class="text-xs text-gray-600">Applications</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-red-600">${todayData.disputes_today || 0}</div>
          <div class="text-xs text-gray-600">Disputes</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-yellow-600">${todayData.documents_today || 0}</div>
          <div class="text-xs text-gray-600">Documents</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-indigo-600">${todayData.admin_actions_today || 0}</div>
          <div class="text-xs text-gray-600">Admin Actions</div>
        </div>
      </div>
    `
  }

  initializeCharts() {
    // Initialize Chart.js charts for various metrics
    this.initUserGrowthChart()
    this.initRevenueChart()
    this.initPerformanceChart()
    this.initGeographicChart()
  }

  initUserGrowthChart() {
    const ctx = document.getElementById('userGrowthChart')
    if (!ctx) return

    this.charts.userGrowth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'New Users',
          data: [],
          borderColor: '#00C881',
          backgroundColor: 'rgba(0, 200, 129, 0.1)',
          tension: 0.4,
          fill: true
        }, {
          label: 'New Workers',
          data: [],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Count'
            },
            beginAtZero: true
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    })
  }

  initRevenueChart() {
    const ctx = document.getElementById('revenueChart')
    if (!ctx) return

    this.charts.revenue = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Daily Revenue',
          data: [],
          backgroundColor: 'rgba(0, 200, 129, 0.8)',
          borderColor: '#00C881',
          borderWidth: 1
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
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Revenue ($)'
            },
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

  initPerformanceChart() {
    const ctx = document.getElementById('performanceChart')
    if (!ctx) return

    this.charts.performance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed Jobs', 'Active Jobs', 'Open Jobs'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [
            '#00C881',
            '#3B82F6',
            '#F59E0B'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          }
        }
      }
    })
  }

  initGeographicChart() {
    const ctx = document.getElementById('geographicChart')
    if (!ctx) return

    this.charts.geographic = new Chart(ctx, {
      type: 'horizontalBar',
      data: {
        labels: [],
        datasets: [{
          label: 'Users by Province',
          data: [],
          backgroundColor: 'rgba(0, 200, 129, 0.6)',
          borderColor: '#00C881',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'User Count'
            }
          }
        }
      }
    })
  }

  updateCharts(data) {
    // Update charts with new data
    this.updateUserGrowthChart(data)
    this.updateRevenueChart(data)
    this.updatePerformanceChart(data.dashboard_metrics)
    this.updateGeographicChart(data.geographic_distribution)
  }

  async updateUserGrowthChart(data) {
    try {
      // Fetch user growth data for chart
      const response = await this.fetchWithAuth('/api/admin/analytics/platform?period=7')
      if (!response.ok) return

      const analyticsData = await response.json()
      const userGrowth = analyticsData.user_growth || []

      if (this.charts.userGrowth && userGrowth.length > 0) {
        const labels = userGrowth.map(d => new Date(d.date).toLocaleDateString())
        const newUsers = userGrowth.map(d => d.new_users || 0)
        const newWorkers = userGrowth.map(d => d.new_workers || 0)

        this.charts.userGrowth.data.labels = labels
        this.charts.userGrowth.data.datasets[0].data = newUsers
        this.charts.userGrowth.data.datasets[1].data = newWorkers
        this.charts.userGrowth.update('none')
      }
    } catch (error) {
      console.error('Error updating user growth chart:', error)
    }
  }

  async updateRevenueChart(data) {
    try {
      // Fetch revenue data for chart
      const response = await this.fetchWithAuth('/api/admin/analytics/platform?period=7')
      if (!response.ok) return

      const analyticsData = await response.json()
      const revenueData = analyticsData.revenue_data || []

      if (this.charts.revenue && revenueData.length > 0) {
        const labels = revenueData.map(d => new Date(d.date).toLocaleDateString())
        const revenue = revenueData.map(d => d.total_value || 0)

        this.charts.revenue.data.labels = labels
        this.charts.revenue.data.datasets[0].data = revenue
        this.charts.revenue.update('none')
      }
    } catch (error) {
      console.error('Error updating revenue chart:', error)
    }
  }

  updatePerformanceChart(metrics) {
    if (!this.charts.performance) return

    const data = [
      metrics.completed_jobs || 0,
      metrics.jobs_in_progress || 0,
      metrics.open_jobs || 0
    ]

    this.charts.performance.data.datasets[0].data = data
    this.charts.performance.update('none')
  }

  updateGeographicChart(geoData) {
    if (!this.charts.geographic || !geoData.length) return

    const sortedData = geoData.sort((a, b) => b.user_count - a.user_count).slice(0, 8)
    const labels = sortedData.map(d => d.province)
    const data = sortedData.map(d => d.user_count)

    this.charts.geographic.data.labels = labels
    this.charts.geographic.data.datasets[0].data = data
    this.charts.geographic.update('none')
  }

  setupCrossDashboardSync() {
    // Listen for custom events from other dashboard components
    window.addEventListener('dashboardDataUpdate', (event) => {
      this.handleCrossDashboardUpdate(event.detail)
    })

    // Broadcast updates to other components
    window.addEventListener('beforeunload', () => {
      this.broadcastDashboardState()
    })

    // Sync with localStorage for cross-tab communication
    window.addEventListener('storage', (event) => {
      if (event.key === 'dashboardSync') {
        this.handleStorageSync(JSON.parse(event.newValue))
      }
    })
  }

  handleCrossDashboardUpdate(data) {
    // Handle updates from other dashboard components
    console.log('Received cross-dashboard update:', data)
    
    if (data.type === 'user_action') {
      this.incrementTodayMetric('admin_actions')
    } else if (data.type === 'dispute_update') {
      this.updateDisputeCount(data.change)
    } else if (data.type === 'document_review') {
      this.updateDocumentCount(data.change)
    }
  }

  broadcastDashboardState() {
    const state = {
      timestamp: new Date().toISOString(),
      lastUpdate: this.lastUpdate,
      isOnline: this.isOnline,
      retryCount: this.retryCount
    }
    
    localStorage.setItem('dashboardSync', JSON.stringify(state))
    
    // Broadcast to other components
    window.dispatchEvent(new CustomEvent('dashboardStateUpdate', {
      detail: state
    }))
  }

  handleStorageSync(data) {
    if (!data) return

    // Sync state with other tabs
    if (new Date(data.timestamp) > (this.lastUpdate || new Date(0))) {
      this.isOnline = data.isOnline
      this.retryCount = data.retryCount
    }
  }

  initPerformanceMonitoring() {
    // Monitor performance metrics
    setInterval(() => {
      this.checkPerformanceMetrics()
    }, 60000) // Every minute

    // Monitor for alerts
    this.setupAlertMonitoring()
  }

  async checkPerformanceMetrics() {
    try {
      const response = await this.fetchWithAuth('/api/admin/analytics/performance-metrics?period=1h&metrics=system,quality')
      if (!response.ok) return

      const data = await response.json()
      
      // Check for performance alerts
      this.processPerformanceAlerts(data.alerts || [])
      
    } catch (error) {
      console.error('Performance monitoring error:', error)
    }
  }

  setupAlertMonitoring() {
    // Set up real-time alert monitoring
    this.alertCheckInterval = setInterval(async () => {
      try {
        // Check for new disputes that exceed SLA
        const disputeResponse = await this.fetchWithAuth('/api/admin/disputes?status=open')
        if (disputeResponse.ok) {
          const disputeData = await disputeResponse.json()
          const overdueDisputes = disputeData.stats?.sla_violations || 0
          
          if (overdueDisputes > 0) {
            this.showAlert(`⚠️ ${overdueDisputes} disputes exceed SLA deadline`, 'warning')
          }
        }

        // Check for pending documents that need review
        const docResponse = await this.fetchWithAuth('/api/admin/compliance/documents?status=pending')
        if (docResponse.ok) {
          const docData = await docResponse.json()
          const pendingDocs = docData.documents?.length || 0
          
          if (pendingDocs > 10) {
            this.showAlert(`📄 ${pendingDocs} documents pending review`, 'info')
          }
        }

      } catch (error) {
        console.error('Alert monitoring error:', error)
      }
    }, 120000) // Every 2 minutes
  }

  processPerformanceAlerts(alerts) {
    alerts.forEach(alert => {
      this.showAlert(alert.message, alert.type, {
        persistent: alert.type === 'alert',
        action: alert.category === 'sla' ? 'View Disputes' : null,
        actionUrl: alert.category === 'sla' ? '/admin/disputes' : null
      })
    })
  }

  // Utility Methods

  async fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('admin_token') || 'admin_session_token_123' // Demo token
    
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  formatCurrency(amount) {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  timeAgo(date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  getActivityIcon(activityType) {
    const icons = {
      'user_registered': 'fas fa-user-plus',
      'job_posted': 'fas fa-briefcase',
      'dispute_created': 'fas fa-exclamation-triangle',
      'document_reviewed': 'fas fa-file-check',
      'payment_processed': 'fas fa-credit-card',
      'worker_verified': 'fas fa-shield-check'
    }
    return icons[activityType] || 'fas fa-info-circle'
  }

  showNotification(message, type = 'info', options = {}) {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`
    
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">${message}</span>
        <button class="ml-3 text-white hover:text-gray-200 focus:outline-none" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    `
    
    document.body.appendChild(notification)
    
    if (!options.persistent) {
      setTimeout(() => {
        notification.remove()
      }, 5000)
    }
  }

  showAlert(message, type = 'info', options = {}) {
    const alertsContainer = document.getElementById('alerts-container') || this.createAlertsContainer()
    
    const alert = document.createElement('div')
    alert.className = `alert-item p-3 mb-2 rounded-lg border-l-4 ${
      type === 'alert' ? 'bg-red-50 border-red-400 text-red-800' :
      type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
      'bg-blue-50 border-blue-400 text-blue-800'
    }`
    
    alert.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">${message}</span>
        <div class="flex items-center space-x-2">
          ${options.action && options.actionUrl ? `
            <a href="${options.actionUrl}" class="text-xs underline hover:no-underline">
              ${options.action}
            </a>
          ` : ''}
          <button class="text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.parentElement.parentElement.remove()">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>
    `
    
    alertsContainer.appendChild(alert)
    
    if (!options.persistent) {
      setTimeout(() => {
        alert.remove()
      }, 10000)
    }
  }

  createAlertsContainer() {
    const container = document.createElement('div')
    container.id = 'alerts-container'
    container.className = 'fixed top-20 right-4 z-40 w-80'
    document.body.appendChild(container)
    return container
  }

  showLoadingIndicator(show) {
    const indicator = document.getElementById('loading-indicator')
    if (indicator) {
      indicator.style.display = show ? 'flex' : 'none'
    }
  }

  updateLastRefreshTime() {
    const timeElement = document.getElementById('last-refresh-time')
    if (timeElement) {
      timeElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`
    }
  }

  updateCriticalIndicators(modules) {
    // Update critical metrics without full dashboard refresh
    if (modules.users) {
      this.updateElement('active-users-critical', modules.users.active_users)
    }
    if (modules.disputes) {
      this.updateElement('active-disputes-critical', modules.disputes.open_disputes + modules.disputes.active_disputes)
    }
    if (modules.performance) {
      this.updateElement('admin-actions-critical', modules.performance.admin_actions_today)
    }
  }

  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element && element.textContent !== String(value)) {
      element.textContent = value
      element.style.backgroundColor = '#00C881'
      element.style.color = 'white'
      setTimeout(() => {
        element.style.backgroundColor = ''
        element.style.color = ''
      }, 1000)
    }
  }

  incrementTodayMetric(metric) {
    const element = document.getElementById(`${metric}-today`)
    if (element) {
      const currentValue = parseInt(element.textContent) || 0
      element.textContent = currentValue + 1
      element.style.transform = 'scale(1.2)'
      setTimeout(() => {
        element.style.transform = 'scale(1)'
      }, 300)
    }
  }

  updateDisputeCount(change) {
    const element = document.getElementById('active-disputes')
    if (element) {
      const currentValue = parseInt(element.textContent) || 0
      element.textContent = Math.max(0, currentValue + change)
    }
  }

  updateDocumentCount(change) {
    const element = document.getElementById('pending-documents')
    if (element) {
      const currentValue = parseInt(element.textContent) || 0
      element.textContent = Math.max(0, currentValue + change)
    }
  }

  pauseUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    console.log('⏸️ Dashboard updates paused')
  }

  resumeUpdates() {
    if (!this.updateTimer) {
      this.startRealTimeUpdates()
      console.log('▶️ Dashboard updates resumed')
    }
  }

  forceUpdate() {
    this.showNotification('🔄 Refreshing dashboard...', 'info')
    this.updateDashboard()
  }

  handleUpdateError(error) {
    this.retryCount++
    this.showLoadingIndicator(false)
    
    if (this.retryCount <= this.maxRetries) {
      console.log(`⚠️ Retrying update (${this.retryCount}/${this.maxRetries})...`)
      setTimeout(() => {
        this.updateDashboard()
      }, Math.pow(2, this.retryCount) * 1000) // Exponential backoff
    } else {
      this.showNotification('❌ Dashboard update failed. Please refresh the page.', 'error', { persistent: true })
      console.error('Max retries exceeded. Stopping automatic updates.')
    }
  }

  destroy() {
    // Cleanup method for page navigation
    this.pauseUpdates()
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval)
    }

    // Destroy charts
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy()
      }
    })

    console.log('🧹 Dashboard cleanup completed')
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on an admin page
  if (window.location.pathname.includes('/admin')) {
    window.adminDashboard = new AdminDashboard()
  }
})

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.adminDashboard) {
    window.adminDashboard.destroy()
  }
})

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminDashboard
}