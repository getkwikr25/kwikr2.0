import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const adminSubscriptionRoutes = new Hono<{ Bindings: Bindings }>()

// Admin Subscription Management Dashboard
adminSubscriptionRoutes.get('/subscriptions', async (c) => {
  try {
    // Get subscription analytics
    const analytics = await c.env.DB.prepare(`
      SELECT 
        sp.plan_name,
        sp.monthly_price,
        COUNT(ws.id) as subscriber_count,
        SUM(CASE WHEN ws.subscription_status = 'active' THEN ws.current_monthly_price ELSE 0 END) as monthly_revenue,
        COUNT(CASE WHEN ws.grandfathered_pricing = 1 THEN 1 END) as grandfathered_count
      FROM subscription_plans sp
      LEFT JOIN worker_subscriptions ws ON sp.id = ws.plan_id
      GROUP BY sp.id, sp.plan_name, sp.monthly_price
      ORDER BY sp.display_order
    `).all()

    // Get recent subscription changes
    const recentChanges = await c.env.DB.prepare(`
      SELECT 
        sh.*,
        u.first_name,
        u.last_name,
        u.email,
        sp_old.plan_name as old_plan_name,
        sp_new.plan_name as new_plan_name
      FROM subscription_history sh
      JOIN users u ON sh.user_id = u.id
      LEFT JOIN subscription_plans sp_old ON sh.old_plan_id = sp_old.id
      JOIN subscription_plans sp_new ON sh.new_plan_id = sp_new.id
      ORDER BY sh.created_at DESC
      LIMIT 10
    `).all()

    // Get all subscription plans
    const plans = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans ORDER BY display_order, monthly_price
    `).all()

    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Management - Kwikr Admin</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'kwikr-green': '#00C881',
                    'kwikr-dark': '#1a1a1a',
                    'kwikr-gray': '#f8f9fa'
                  }
                }
              }
            }
          </script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body class="bg-kwikr-gray min-h-screen">
          <!-- Navigation -->
          <nav class="bg-white shadow-sm border-b border-gray-200">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div class="flex justify-between items-center h-16">
                      <div class="flex items-center">
                          <a href="/admin/dashboard" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                              <i class="fas fa-bolt mr-2"></i>Kwikr Admin
                          </a>
                          <span class="ml-4 text-gray-500">|</span>
                          <span class="ml-4 text-lg font-medium text-gray-700">Subscription Management</span>
                      </div>
                      <div class="flex items-center space-x-4">
                          <a href="/admin/dashboard" class="text-gray-700 hover:text-kwikr-green">
                              <i class="fas fa-arrow-left mr-2"></i>Back to Dashboard
                          </a>
                      </div>
                  </div>
              </div>
          </nav>

          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <!-- Header -->
              <div class="mb-8">
                  <h1 class="text-3xl font-bold text-gray-900 flex items-center">
                      <i class="fas fa-credit-card text-kwikr-green mr-3"></i>
                      Subscription Management
                  </h1>
                  <p class="text-gray-600 mt-2">Manage subscription plans, pricing, and subscriber analytics</p>
              </div>

              <!-- Quick Actions -->
              <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
                  <div class="flex flex-wrap gap-4">
                      <button onclick="showAddPlanModal()" class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600 flex items-center">
                          <i class="fas fa-plus mr-2"></i>Add New Plan
                      </button>
                      <button onclick="showBulkPricingModal()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center">
                          <i class="fas fa-dollar-sign mr-2"></i>Bulk Price Update
                      </button>
                      <button onclick="exportSubscriptionData()" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center">
                          <i class="fas fa-download mr-2"></i>Export Data
                      </button>
                      <button onclick="refreshAnalytics()" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center">
                          <i class="fas fa-refresh mr-2"></i>Refresh Analytics
                      </button>
                  </div>
              </div>

              <!-- Subscription Analytics Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  ${(analytics.results || []).map(plan => `
                      <div class="bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                        plan.plan_name === 'Pro Plan' ? 'border-yellow-400' :
                        plan.plan_name === 'Growth Plan' ? 'border-green-400' :
                        'border-gray-400'
                      }">
                          <div class="flex items-center justify-between mb-4">
                              <h3 class="text-lg font-semibold text-gray-900">${plan.plan_name}</h3>
                              <span class="text-2xl font-bold ${
                                plan.plan_name === 'Pro Plan' ? 'text-yellow-600' :
                                plan.plan_name === 'Growth Plan' ? 'text-green-600' :
                                'text-gray-600'
                              }">$${plan.monthly_price}</span>
                          </div>
                          <div class="space-y-2">
                              <div class="flex justify-between">
                                  <span class="text-gray-600">Subscribers:</span>
                                  <span class="font-medium">${plan.subscriber_count}</span>
                              </div>
                              <div class="flex justify-between">
                                  <span class="text-gray-600">Monthly Revenue:</span>
                                  <span class="font-medium text-kwikr-green">$${plan.monthly_revenue?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div class="flex justify-between">
                                  <span class="text-gray-600">Grandfathered:</span>
                                  <span class="font-medium text-orange-600">${plan.grandfathered_count}</span>
                              </div>
                          </div>
                          <div class="mt-4 pt-4 border-t border-gray-200">
                              <button onclick="editPlan('${plan.plan_name}', ${plan.monthly_price})" 
                                      class="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  <i class="fas fa-edit mr-1"></i>Edit Pricing
                              </button>
                          </div>
                      </div>
                  `).join('')}
              </div>

              <!-- Subscription Plans Management -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <!-- Plans List -->
                  <div class="bg-white rounded-lg shadow-sm">
                      <div class="p-6 border-b border-gray-200">
                          <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                              <i class="fas fa-list text-kwikr-green mr-2"></i>
                              Subscription Plans
                          </h3>
                      </div>
                      <div class="p-6">
                          <div class="space-y-4">
                              ${(plans.results || []).map(plan => `
                                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                      <div class="flex justify-between items-start">
                                          <div class="flex-1">
                                              <div class="flex items-center mb-2">
                                                  <h4 class="text-lg font-semibold text-gray-900">${plan.plan_name}</h4>
                                                  <span class="ml-3 px-2 py-1 text-xs rounded-full ${
                                                    plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                  }">
                                                      ${plan.is_active ? 'Active' : 'Inactive'}
                                                  </span>
                                              </div>
                                              <p class="text-sm text-gray-600 mb-2">${plan.description}</p>
                                              <div class="flex items-center space-x-4 text-sm">
                                                  <span class="font-medium text-kwikr-green">$${plan.monthly_price}/month</span>
                                                  ${plan.annual_price ? `<span class="text-gray-500">$${plan.annual_price}/year</span>` : ''}
                                              </div>
                                          </div>
                                          <div class="flex space-x-2">
                                              <button onclick="editPlan('${plan.plan_name}', ${plan.monthly_price}, ${plan.annual_price || 0}, '${plan.description}', ${plan.id})" 
                                                      class="text-blue-600 hover:text-blue-800 p-2">
                                                  <i class="fas fa-edit"></i>
                                              </button>
                                              <button onclick="togglePlanStatus(${plan.id}, ${plan.is_active})" 
                                                      class="text-gray-600 hover:text-gray-800 p-2">
                                                  <i class="fas fa-power-off"></i>
                                              </button>
                                              <button onclick="viewPlanFeatures(${plan.id})" 
                                                      class="text-kwikr-green hover:text-green-700 p-2">
                                                  <i class="fas fa-list-ul"></i>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              `).join('')}
                          </div>
                      </div>
                  </div>

                  <!-- Recent Activity -->
                  <div class="bg-white rounded-lg shadow-sm">
                      <div class="p-6 border-b border-gray-200">
                          <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                              <i class="fas fa-history text-kwikr-green mr-2"></i>
                              Recent Subscription Changes
                          </h3>
                      </div>
                      <div class="p-6">
                          <div class="space-y-4">
                              ${(recentChanges.results || []).length > 0 ? 
                                (recentChanges.results || []).map(change => `
                                    <div class="bg-gray-50 rounded-lg p-4 border-l-4 ${
                                      change.change_type === 'upgrade' ? 'border-green-400' :
                                      change.change_type === 'downgrade' ? 'border-red-400' :
                                      change.change_type === 'new' ? 'border-blue-400' :
                                      'border-gray-400'
                                    }">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <div class="flex items-center mb-1">
                                                    <span class="font-medium text-gray-900">${change.first_name} ${change.last_name}</span>
                                                    <span class="ml-2 px-2 py-1 text-xs rounded-full ${
                                                      change.change_type === 'upgrade' ? 'bg-green-100 text-green-800' :
                                                      change.change_type === 'downgrade' ? 'bg-red-100 text-red-800' :
                                                      change.change_type === 'new' ? 'bg-blue-100 text-blue-800' :
                                                      'bg-gray-100 text-gray-800'
                                                    }">
                                                        ${change.change_type}
                                                    </span>
                                                </div>
                                                <div class="text-sm text-gray-600">
                                                    ${change.old_plan_name ? `${change.old_plan_name} → ` : ''}${change.new_plan_name}
                                                </div>
                                                <div class="text-sm text-gray-500">
                                                    ${change.old_monthly_price ? `$${change.old_monthly_price} → ` : ''}$${change.new_monthly_price}/month
                                                </div>
                                            </div>
                                            <div class="text-xs text-gray-400">
                                                ${new Date(change.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                `).join('') :
                                '<div class="text-center py-8 text-gray-500"><p>No recent subscription changes</p></div>'
                              }
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Revenue Analytics Chart -->
              <div class="bg-white rounded-lg shadow-sm mb-8">
                  <div class="p-6 border-b border-gray-200">
                      <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                          <i class="fas fa-chart-line text-kwikr-green mr-2"></i>
                          Revenue Analytics
                      </h3>
                  </div>
                  <div class="p-6">
                      <canvas id="revenueChart" width="400" height="200"></canvas>
                  </div>
              </div>
          </div>

          <!-- Edit Plan Modal -->
          <div id="editPlanModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div class="bg-white rounded-lg p-6 w-full max-w-md">
                  <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-semibold text-gray-900">Edit Plan Pricing</h3>
                      <button onclick="closeEditPlanModal()" class="text-gray-400 hover:text-gray-600">
                          <i class="fas fa-times"></i>
                      </button>
                  </div>
                  
                  <form id="editPlanForm" onsubmit="updatePlanPricing(event)">
                      <input type="hidden" id="editPlanId" name="planId">
                      
                      <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                          <input type="text" id="editPlanName" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" readonly>
                      </div>
                      
                      <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 mb-2">Monthly Price ($)</label>
                          <input type="number" id="editMonthlyPrice" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-kwikr-green focus:border-kwikr-green" required>
                      </div>
                      
                      <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 mb-2">Annual Price ($) <span class="text-gray-400">(optional)</span></label>
                          <input type="number" id="editAnnualPrice" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-kwikr-green focus:border-kwikr-green">
                      </div>
                      
                      <div class="mb-4">
                          <label class="flex items-center">
                              <input type="checkbox" id="grandfatherExisting" class="mr-2" checked>
                              <span class="text-sm text-gray-700">Grandfather existing subscribers at current price</span>
                          </label>
                      </div>
                      
                      <div class="mb-6">
                          <label class="block text-sm font-medium text-gray-700 mb-2">Change Notes</label>
                          <textarea id="changeNotes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-kwikr-green focus:border-kwikr-green" placeholder="Reason for price change..."></textarea>
                      </div>
                      
                      <div class="flex space-x-3">
                          <button type="button" onclick="closeEditPlanModal()" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                              Cancel
                          </button>
                          <button type="submit" class="flex-1 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                              <i class="fas fa-save mr-2"></i>Update Pricing
                          </button>
                      </div>
                  </form>
              </div>
          </div>

          <script>
              // Initialize revenue chart
              const ctx = document.getElementById('revenueChart').getContext('2d');
              const revenueChart = new Chart(ctx, {
                  type: 'line',
                  data: {
                      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      datasets: [{
                          label: 'Monthly Revenue',
                          data: [${(analytics.results || []).map(plan => plan.monthly_revenue || 0).join(', ')}],
                          borderColor: '#00C881',
                          backgroundColor: 'rgba(0, 200, 129, 0.1)',
                          tension: 0.4
                      }]
                  },
                  options: {
                      responsive: true,
                      scales: {
                          y: {
                              beginAtZero: true,
                              ticks: {
                                  callback: function(value) {
                                      return '$' + value;
                                  }
                              }
                          }
                      }
                  }
              });

              function editPlan(planName, monthlyPrice, annualPrice = 0, description = '', planId) {
                  document.getElementById('editPlanId').value = planId;
                  document.getElementById('editPlanName').value = planName;
                  document.getElementById('editMonthlyPrice').value = monthlyPrice;
                  document.getElementById('editAnnualPrice').value = annualPrice || '';
                  document.getElementById('editPlanModal').classList.remove('hidden');
              }

              function closeEditPlanModal() {
                  document.getElementById('editPlanModal').classList.add('hidden');
              }

              async function updatePlanPricing(event) {
                  event.preventDefault();
                  
                  const planId = document.getElementById('editPlanId').value;
                  const monthlyPrice = parseFloat(document.getElementById('editMonthlyPrice').value);
                  const annualPrice = document.getElementById('editAnnualPrice').value ? parseFloat(document.getElementById('editAnnualPrice').value) : null;
                  const grandfatherExisting = document.getElementById('grandfatherExisting').checked;
                  const changeNotes = document.getElementById('changeNotes').value;
                  
                  try {
                      const response = await fetch(\`/api/test/admin/plans/\${planId}/pricing\`, {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                              monthly_price: monthlyPrice,
                              annual_price: annualPrice,
                              grandfather_existing: grandfatherExisting,
                              change_notes: changeNotes
                          })
                      });

                      const result = await response.json();
                      
                      if (response.ok) {
                          alert('Plan pricing updated successfully!');
                          closeEditPlanModal();
                          window.location.reload();
                      } else {
                          alert('Error: ' + (result.error || 'Failed to update pricing'));
                      }
                  } catch (error) {
                      alert('Error updating pricing: ' + error.message);
                  }
              }

              function showAddPlanModal() {
                  alert('Add New Plan feature coming soon!');
              }

              function showBulkPricingModal() {
                  alert('Bulk Price Update feature coming soon!');
              }

              function exportSubscriptionData() {
                  alert('Export Data feature coming soon!');
              }

              function refreshAnalytics() {
                  window.location.reload();
              }

              function togglePlanStatus(planId, currentStatus) {
                  if (confirm(\`Are you sure you want to \${currentStatus ? 'deactivate' : 'activate'} this plan?\`)) {
                      alert('Plan status toggle feature coming soon!');
                  }
              }

              function viewPlanFeatures(planId) {
                  alert('View Plan Features feature coming soon!');
              }
          </script>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Error loading subscription management:', error)
    return c.html(`
      <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
              <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Subscription Management</h1>
              <p class="text-gray-600">Please try again later</p>
              <a href="/admin/dashboard" class="bg-blue-500 text-white px-4 py-2 rounded mt-4 inline-block">Back to Dashboard</a>
          </div>
      </div>
    `)
  }
})
