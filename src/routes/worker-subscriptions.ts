import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const workerSubscriptionRoutes = new Hono<{ Bindings: Bindings }>()

// Worker Subscription Management Page
workerSubscriptionRoutes.get('/pricing', async (c) => {
  try {
    // Get all active subscription plans
    const plans = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans 
      WHERE is_active = 1 
      ORDER BY display_order, monthly_price
    `).all()

    // Get plan features for each plan
    const planFeatures = new Map()
    for (const plan of (plans.results || [])) {
      const features = await c.env.DB.prepare(`
        SELECT feature_key, feature_name, feature_value, feature_type
        FROM subscription_plan_features
        WHERE plan_id = ? AND is_active = 1
        ORDER BY display_order
      `).bind(plan.id).all()
      planFeatures.set(plan.id, features.results || [])
    }

    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Plans - Kwikr Directory</title>
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
      </head>
      <body class="bg-gray-50">
          <!-- Navigation -->
          <nav class="bg-white shadow-sm border-b border-gray-200">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div class="flex justify-between items-center h-16">
                      <div class="flex items-center">
                          <a href="/" class="text-2xl font-bold text-kwikr-green hover:text-green-600">
                              <i class="fas fa-bolt mr-2"></i>Kwikr Directory
                          </a>
                      </div>
                      <div class="flex items-center space-x-4">
                          <a href="/" class="text-gray-700 hover:text-kwikr-green">Home</a>
                          <button onclick="showLoginModal()" class="text-gray-700 hover:text-kwikr-green">
                              Sign In
                          </button>
                          <button onclick="showSignupModal()" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                              Get Started
                          </button>
                      </div>
                  </div>
              </div>
          </nav>

          <!-- Subscription Plans Section -->
          <div class="py-16 bg-gradient-to-br from-kwikr-green to-green-600 text-white">
              <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div class="text-center mb-12">
                      <div class="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-medium mb-4">
                          <i class="fas fa-star mr-2"></i>Choose Your Plan
                      </div>
                      <h1 class="text-3xl md:text-4xl font-bold mb-4">Subscription Plans for Workers</h1>
                      <p class="text-lg md:text-xl text-green-100 mb-8">Get more leads, grow your business, and dominate your local market</p>
                      
                      <!-- Billing Toggle -->
                      <div class="flex justify-center items-center space-x-4 mb-8">
                          <span class="text-green-100">Monthly</span>
                          <button id="billingToggle" onclick="toggleBilling()" class="relative inline-flex h-6 w-11 items-center rounded-full bg-green-700 transition-colors focus:outline-none">
                              <span id="billingSlider" class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
                          </button>
                          <span class="text-green-100">Annual <span class="text-yellow-300 font-medium">(Save 10%)</span></span>
                      </div>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                      <!-- Pay-as-you-go Plan -->
                      <div class="bg-white text-gray-900 p-8 rounded-2xl shadow-xl border-2 border-transparent relative">
                          <div class="text-center">
                              <div class="text-kwikr-green text-4xl mb-4">
                                  <i class="fas fa-rocket"></i>
                              </div>
                              <h3 class="text-2xl font-bold mb-2">Pay-as-you-go</h3>
                              <p class="text-gray-600 mb-6">Perfect for new contractors testing the platform</p>
                              <div class="mb-6">
                                  <span class="text-4xl font-bold text-kwikr-green">$0</span>
                                  <span class="text-gray-600">/month</span>
                              </div>
                              <div class="mb-6">
                                  <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">939 Active Workers</span>
                              </div>
                          </div>
                          
                          <!-- Features -->
                          <div class="space-y-3 mb-8">
                              <div class="flex items-center">
                                  <i class="fas fa-check text-kwikr-green mr-3"></i>
                                  <span class="text-sm">$2.00 fee per completed booking</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-kwikr-green mr-3"></i>
                                  <span class="text-sm">Keep 90% of revenue</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-kwikr-green mr-3"></i>
                                  <span class="text-sm">Listed in 1 category</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-kwikr-green mr-3"></i>
                                  <span class="text-sm">Access to booking tools</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-kwikr-green mr-3"></i>
                                  <span class="text-sm">Lead inbox access</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-kwikr-green mr-3"></i>
                                  <span class="text-sm">Basic dashboard access</span>
                              </div>
                          </div>
                          
                          <a href="/signup/worker?plan=payasyougo" class="w-full bg-kwikr-green text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors block text-center">
                              <i class="fas fa-arrow-right mr-2"></i>Start Free
                          </a>
                      </div>
                      
                      <!-- Growth Plan -->
                      <div class="bg-white text-gray-900 p-8 rounded-2xl shadow-xl border-2 border-blue-500 relative transform scale-105">
                          <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                              <span class="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                          </div>
                          <div class="text-center">
                              <div class="text-blue-500 text-4xl mb-4">
                                  <i class="fas fa-chart-line"></i>
                              </div>
                              <h3 class="text-2xl font-bold mb-2">Growth Plan</h3>
                              <p class="text-gray-600 mb-6">Ready to grow and lower cost per job</p>
                              <div class="mb-6">
                                  <span class="text-4xl font-bold text-blue-500 monthly-price">$99</span>
                                  <span class="text-4xl font-bold text-blue-500 annual-price hidden">$90</span>
                                  <span class="text-gray-600">/month</span>
                              </div>
                              <div class="mb-6">
                                  <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">1 Active Worker</span>
                              </div>
                          </div>
                          
                          <!-- Features -->
                          <div class="space-y-3 mb-8">
                              <div class="flex items-center">
                                  <i class="fas fa-check text-blue-500 mr-3"></i>
                                  <span class="text-sm">No per-booking fees</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-blue-500 mr-3"></i>
                                  <span class="text-sm">Keep 100% of revenue</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-blue-500 mr-3"></i>
                                  <span class="text-sm">Listed in 3 categories</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-blue-500 mr-3"></i>
                                  <span class="text-sm">Priority search placement (Tier 2)</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-blue-500 mr-3"></i>
                                  <span class="text-sm">Advanced booking tools</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-blue-500 mr-3"></i>
                                  <span class="text-sm">Enhanced dashboard</span>
                              </div>
                          </div>
                          
                          <a href="/signup/worker?plan=growth" class="w-full bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors block text-center">
                              <i class="fas fa-crown mr-2"></i>Choose Growth
                          </a>
                      </div>
                      
                      <!-- Pro Plan -->
                      <div class="bg-white text-gray-900 p-8 rounded-2xl shadow-xl border-2 border-transparent relative">
                          <div class="text-center">
                              <div class="text-purple-500 text-4xl mb-4">
                                  <i class="fas fa-trophy"></i>
                              </div>
                              <h3 class="text-2xl font-bold mb-2">Pro Plan</h3>
                              <p class="text-gray-600 mb-6">Dominate local visibility and automate growth</p>
                              <div class="mb-6">
                                  <span class="text-4xl font-bold text-purple-500 monthly-price">$199</span>
                                  <span class="text-4xl font-bold text-purple-500 annual-price hidden">$179</span>
                                  <span class="text-gray-600">/month</span>
                              </div>
                              <div class="mb-6">
                                  <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">0 Active Workers</span>
                              </div>
                          </div>
                          
                          <!-- Features -->
                          <div class="space-y-3 mb-8">
                              <div class="flex items-center">
                                  <i class="fas fa-check text-purple-500 mr-3"></i>
                                  <span class="text-sm">No per-booking fees</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-purple-500 mr-3"></i>
                                  <span class="text-sm">Keep 100% of revenue</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-purple-500 mr-3"></i>
                                  <span class="text-sm">Listed in unlimited categories</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-purple-500 mr-3"></i>
                                  <span class="text-sm">Top search placement (Tier 1)</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-purple-500 mr-3"></i>
                                  <span class="text-sm">Premium booking tools</span>
                              </div>
                              <div class="flex items-center">
                                  <i class="fas fa-check text-purple-500 mr-3"></i>
                                  <span class="text-sm">Advanced analytics dashboard</span>
                              </div>
                          </div>
                          
                          <a href="/signup/worker?plan=pro" class="w-full bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors block text-center">
                              <i class="fas fa-rocket mr-2"></i>Go Pro
                          </a>
                      </div>
                  </div>
                  
                  <!-- Demo Access Info -->
                  <div class="mt-12 bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm max-w-4xl mx-auto">
                      <h4 class="text-lg font-semibold text-white mb-4 text-center">
                          <i class="fas fa-eye text-yellow-300 mr-2"></i>Want to See the Platform First?
                      </h4>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                          <a href="/dashboard/client" class="block bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-all">
                              <i class="fas fa-user text-yellow-300 text-2xl mb-2 block"></i>
                              <div class="font-medium text-white">Client Dashboard</div>
                              <div class="text-green-100 text-sm">Post jobs & manage projects</div>
                          </a>
                          <a href="/dashboard/worker" class="block bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-all">
                              <i class="fas fa-tools text-yellow-300 text-2xl mb-2 block"></i>
                              <div class="font-medium text-white">Worker Dashboard</div>
                              <div class="text-green-100 text-sm">Browse jobs & track earnings</div>
                          </a>
                          <a href="/api/admin/subscriptions" class="block bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-all">
                              <i class="fas fa-cog text-yellow-300 text-2xl mb-2 block"></i>
                              <div class="font-medium text-white">Admin Dashboard</div>
                              <div class="text-green-100 text-sm">Manage users & view analytics</div>
                          </a>
                      </div>
                  </div>
              </div>
          </div>

          <!-- FAQ Section -->
          <div class="bg-gray-50 py-16">
              <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div class="text-center mb-12">
                      <h2 class="text-3xl font-bold text-gray-900 mb-4">
                          Frequently Asked Questions
                      </h2>
                  </div>

                  <div class="space-y-6">
                      <div class="bg-white rounded-lg shadow-sm p-6">
                          <h3 class="text-lg font-semibold text-gray-900 mb-2">
                              Can I change plans at any time?
                          </h3>
                          <p class="text-gray-600">
                              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.
                          </p>
                      </div>

                      <div class="bg-white rounded-lg shadow-sm p-6">
                          <h3 class="text-lg font-semibold text-gray-900 mb-2">
                              What happens if I cancel my subscription?
                          </h3>
                          <p class="text-gray-600">
                              You can cancel anytime and continue using your current plan until the end of your billing period. After that, you'll be moved to the Pay-as-you-go plan.
                          </p>
                      </div>

                      <div class="bg-white rounded-lg shadow-sm p-6">
                          <h3 class="text-lg font-semibold text-gray-900 mb-2">
                              Do you offer annual discounts?
                          </h3>
                          <p class="text-gray-600">
                              Yes! Save 10% when you choose annual billing. You can switch between monthly and annual billing at any time.
                          </p>
                      </div>
                  </div>
              </div>
          </div>

          <script>
              let isAnnual = false;

              function toggleBilling() {
                  isAnnual = !isAnnual;
                  const slider = document.getElementById('billingSlider');
                  
                  if (isAnnual) {
                      slider.classList.add('translate-x-6');
                      slider.classList.remove('translate-x-1');
                  } else {
                      slider.classList.add('translate-x-1');
                      slider.classList.remove('translate-x-6');
                  }

                  // Toggle price displays
                  const monthlyPrices = document.querySelectorAll('.monthly-price');
                  const annualPrices = document.querySelectorAll('.annual-price');
                  
                  monthlyPrices.forEach(price => {
                      if (isAnnual) {
                          price.classList.add('hidden');
                      } else {
                          price.classList.remove('hidden');
                      }
                  });
                  
                  annualPrices.forEach(price => {
                      if (isAnnual) {
                          price.classList.remove('hidden');
                      } else {
                          price.classList.add('hidden');
                      }
                  });
              }

              function showLoginModal() {
                  alert('Login modal coming soon!');
              }

              function showSignupModal() {
                  alert('Signup modal coming soon!');
              }
          </script>
      </body>
      </html>
    `)
  } catch (error) {
    console.error('Error loading subscription pricing:', error)
    return c.html(`
      <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
              <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Pricing</h1>
              <p class="text-gray-600">Please try again later</p>
              <a href="/" class="bg-blue-500 text-white px-4 py-2 rounded mt-4 inline-block">Back to Home</a>
          </div>
      </div>
    `)
  }
})
