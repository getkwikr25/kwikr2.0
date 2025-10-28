// Vercel API route for Kwikr Directory
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()

// Test API endpoint
app.get('/api/hello', (c) => {
  return c.json({ 
    message: 'Kwikr Directory API - Live on Vercel!',
    status: 'working',
    timestamp: new Date().toISOString()
  })
})

// Mock search stats for testing
app.get('/api/client/search/stats', (c) => {
  const serviceCategory = c.req.query('service_category')
  
  // Mock data based on your working local version
  const mockData = {
    provinces: [
      { province: "ON", worker_count: 1 },
      { province: "BC", worker_count: 1 },
      { province: "AB", worker_count: 1 }
    ],
    cities: [
      { province: "AB", city: "Calgary", worker_count: 1 },
      { province: "BC", city: "Vancouver", worker_count: 1 },
      { province: "ON", city: "Toronto", worker_count: 1 }
    ],
    services: [
      { province: "AB", service_category: "HVAC", worker_count: 1 },
      { province: "BC", service_category: "HVAC", worker_count: 1 },
      { province: "ON", service_category: "HVAC", worker_count: 1 }
    ]
  }
  
  return c.json(mockData)
})

// Root route - serves the main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kwikr Directory - Live on Vercel!</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-4xl mx-auto">
                <!-- Success Banner -->
                <div class="bg-green-100 border border-green-400 rounded-lg p-6 mb-8">
                    <div class="text-center">
                        <h1 class="text-3xl font-bold text-green-800 mb-2">
                            🎉 Success! Kwikr Directory is Live on Vercel!
                        </h1>
                        <p class="text-green-700 text-lg">No more Cloudflare API token headaches!</p>
                    </div>
                </div>

                <!-- Main Header -->
                <div class="text-center mb-8">
                    <h2 class="text-4xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-tools mr-3 text-blue-600"></i>
                        Kwikr Directory Platform
                    </h2>
                    <p class="text-xl text-gray-600">Connect with Verified Canadian Service Providers</p>
                </div>

                <!-- Service Search Form -->
                <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h3 class="text-2xl font-semibold mb-6 text-gray-800">Find Service Providers</h3>
                    
                    <div class="grid md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                            <select id="serviceType" class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Select Service</option>
                                <option value="HVAC">HVAC Services</option>
                                <option value="Plumbing">Plumbing Services</option>
                                <option value="Electrical">Electrical Services</option>
                                <option value="Renovation">Home Renovation</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Province</label>
                            <select id="province" class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="">All Provinces</option>
                                <option value="AB">Alberta (1)</option>
                                <option value="BC">British Columbia (1)</option>
                                <option value="ON">Ontario (1)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <select id="city" class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Select City</option>
                            </select>
                        </div>
                        
                        <div class="flex items-end">
                            <button id="searchBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition duration-200">
                                <i class="fas fa-search mr-2"></i>Find Providers
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Featured Workers -->
                <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h3 class="text-xl font-semibold mb-4 text-gray-800">Featured HVAC Professionals</h3>
                    <div class="grid md:grid-cols-3 gap-4">
                        <!-- Kevin Brown -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center mb-3">
                                <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">KB</div>
                                <div class="ml-3">
                                    <h4 class="font-semibold text-gray-800">Kevin Brown</h4>
                                    <p class="text-sm text-gray-600">HVAC Technician</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>Calgary, AB</p>
                            <p class="text-sm text-gray-700 mb-2"><i class="fas fa-clock mr-1"></i>8+ years experience</p>
                            <p class="font-semibold text-green-600 text-lg">$95/hour</p>
                            <div class="flex items-center mt-2">
                                <div class="text-yellow-400">★★★★★</div>
                                <span class="text-sm text-gray-600 ml-1">(4.9) • 127 reviews</span>
                            </div>
                        </div>
                        
                        <!-- Lisa Anderson -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center mb-3">
                                <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">LA</div>
                                <div class="ml-3">
                                    <h4 class="font-semibold text-gray-800">Lisa Anderson</h4>
                                    <p class="text-sm text-gray-600">HVAC Professional</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>Vancouver, BC</p>
                            <p class="text-sm text-gray-700 mb-2"><i class="fas fa-clock mr-1"></i>12+ years experience</p>
                            <p class="font-semibold text-green-600 text-lg">$105/hour</p>
                            <div class="flex items-center mt-2">
                                <div class="text-yellow-400">★★★★★</div>
                                <span class="text-sm text-gray-600 ml-1">(4.8) • 89 reviews</span>
                            </div>
                        </div>
                        
                        <!-- Mark Johnson -->
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center mb-3">
                                <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">MJ</div>
                                <div class="ml-3">
                                    <h4 class="font-semibold text-gray-800">Mark Johnson</h4>
                                    <p class="text-sm text-gray-600">HVAC Specialist</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 mb-1"><i class="fas fa-map-marker-alt mr-1"></i>Toronto, ON</p>
                            <p class="text-sm text-gray-700 mb-2"><i class="fas fa-clock mr-1"></i>15+ years experience</p>
                            <p class="font-semibold text-green-600 text-lg">$110/hour</p>
                            <div class="flex items-center mt-2">
                                <div class="text-yellow-400">★★★★★</div>
                                <span class="text-sm text-gray-600 ml-1">(5.0) • 201 reviews</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status & Next Steps -->
                <div class="grid md:grid-cols-2 gap-6">
                    <!-- Deployment Status -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-blue-800 mb-3">
                            <i class="fas fa-server mr-2"></i>Deployment Status
                        </h3>
                        <ul class="space-y-2 text-blue-700">
                            <li>✅ <strong>Vercel Hosting:</strong> Active</li>
                            <li>✅ <strong>Frontend:</strong> Responsive UI</li>
                            <li>✅ <strong>API Routes:</strong> Connected</li>
                            <li>🔧 <strong>Database:</strong> Ready for integration</li>
                        </ul>
                    </div>
                    
                    <!-- Next Steps -->
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 class="text-lg font-semibold text-green-800 mb-3">
                            <i class="fas fa-rocket mr-2"></i>Next Steps
                        </h3>
                        <ul class="space-y-2 text-green-700">
                            <li>🌐 <strong>Custom Domain:</strong> Add your domain</li>
                            <li>💾 <strong>Database:</strong> Vercel Postgres or Supabase</li>
                            <li>🔍 <strong>Live Search:</strong> Connect worker database</li>
                            <li>📧 <strong>Notifications:</strong> Email integration</li>
                        </ul>
                    </div>
                </div>

                <!-- API Test -->
                <div class="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">
                        <i class="fas fa-code mr-2"></i>API Test
                    </h3>
                    <button id="testApiBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                        Test API Connection
                    </button>
                    <div id="apiResult" class="mt-3 text-sm text-gray-600"></div>
                </div>
            </div>
        </div>

        <script>
            // Province-city mapping
            const cities = {
                'AB': [
                    { name: 'Calgary', count: 1 },
                    { name: 'Edmonton', count: 0 }
                ],
                'BC': [
                    { name: 'Vancouver', count: 1 },
                    { name: 'Victoria', count: 0 }
                ],
                'ON': [
                    { name: 'Toronto', count: 1 },
                    { name: 'Ottawa', count: 0 }
                ]
            };
            
            // Province change handler
            document.getElementById('province').addEventListener('change', function(e) {
                const citySelect = document.getElementById('city');
                citySelect.innerHTML = '<option value="">Select City</option>';
                
                if (cities[e.target.value]) {
                    cities[e.target.value].forEach(city => {
                        const countText = city.count > 0 ? \` (\${city.count})\` : ' (0)';
                        citySelect.innerHTML += \`<option value="\${city.name}">\${city.name}\${countText}</option>\`;
                    });
                }
            });
            
            // Search handler
            document.getElementById('searchBtn').addEventListener('click', function() {
                const service = document.getElementById('serviceType').value;
                const province = document.getElementById('province').value;
                const city = document.getElementById('city').value;
                
                if (!service || !province || !city) {
                    alert('Please select all fields to search for providers.');
                    return;
                }
                
                alert(\`Searching for \${service} providers in \${city}, \${province}. Database integration coming next!\`);
            });
            
            // API test
            document.getElementById('testApiBtn').addEventListener('click', async function() {
                const resultDiv = document.getElementById('apiResult');
                resultDiv.textContent = 'Testing API...';
                
                try {
                    const response = await fetch('/api/hello');
                    const data = await response.json();
                    resultDiv.innerHTML = \`<strong>✅ API Working:</strong> \${data.message}\`;
                } catch (error) {
                    resultDiv.innerHTML = \`<strong>❌ API Error:</strong> \${error.message}\`;
                }
            });
        </script>
    </body>
    </html>
  `)
})

// Handle all other routes
app.get('*', (c) => {
  return c.redirect('/')
})

export default handle(app)