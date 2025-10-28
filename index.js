// Vercel-compatible entry point for Kwikr Directory
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono().basePath('/api')

// Basic route for testing
app.get('/hello', (c) => {
  return c.json({ 
    message: 'Hello from Kwikr Directory on Vercel!',
    status: 'working',
    platform: 'vercel'
  })
})

// Root route
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
                <!-- Header -->
                <div class="text-center mb-8">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-tools mr-3 text-blue-600"></i>
                        Kwikr Directory
                    </h1>
                    <p class="text-xl text-gray-600">🎉 Successfully Deployed to Vercel!</p>
                    <div class="mt-4 p-4 bg-green-100 border border-green-400 rounded-lg">
                        <p class="text-green-800 font-semibold">✅ Deployment Status: LIVE</p>
                        <p class="text-green-700">No more Cloudflare API token issues!</p>
                    </div>
                </div>

                <!-- Service Search Form -->
                <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h2 class="text-2xl font-semibold mb-6 text-gray-800">Find Canadian Service Providers</h2>
                    
                    <div class="grid md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                            <select id="serviceType" class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Select Service</option>
                                <option value="HVAC Services">HVAC Services</option>
                                <option value="Plumbing Services">Plumbing Services</option>
                                <option value="Electrical Services">Electrical Services</option>
                                <option value="Home Renovation">Home Renovation</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Province</label>
                            <select id="province" class="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Select Province</option>
                                <option value="AB">Alberta</option>
                                <option value="BC">British Columbia</option>
                                <option value="ON">Ontario</option>
                                <option value="QC">Quebec</option>
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

                <!-- Sample Workers Preview -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <h3 class="text-xl font-semibold mb-4 text-gray-800">Featured Service Providers</h3>
                    <div class="grid md:grid-cols-3 gap-4">
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-3">
                                <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">KB</div>
                                <div class="ml-3">
                                    <h4 class="font-semibold">Kevin Brown</h4>
                                    <p class="text-sm text-gray-600">HVAC Technician</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 mb-2">Calgary, AB</p>
                            <p class="font-semibold text-green-600">$95/hour</p>
                            <div class="flex items-center mt-2">
                                <div class="text-yellow-400">★★★★★</div>
                                <span class="text-sm text-gray-600 ml-1">(4.9)</span>
                            </div>
                        </div>
                        
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-3">
                                <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">LA</div>
                                <div class="ml-3">
                                    <h4 class="font-semibold">Lisa Anderson</h4>
                                    <p class="text-sm text-gray-600">HVAC Professional</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 mb-2">Vancouver, BC</p>
                            <p class="font-semibold text-green-600">$105/hour</p>
                            <div class="flex items-center mt-2">
                                <div class="text-yellow-400">★★★★★</div>
                                <span class="text-sm text-gray-600 ml-1">(4.8)</span>
                            </div>
                        </div>
                        
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex items-center mb-3">
                                <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">MJ</div>
                                <div class="ml-3">
                                    <h4 class="font-semibold">Mark Johnson</h4>
                                    <p class="text-sm text-gray-600">HVAC Specialist</p>
                                </div>
                            </div>
                            <p class="text-sm text-gray-700 mb-2">Toronto, ON</p>
                            <p class="font-semibold text-green-600">$110/hour</p>
                            <div class="flex items-center mt-2">
                                <div class="text-yellow-400">★★★★★</div>
                                <span class="text-sm text-gray-600 ml-1">(5.0)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Next Steps -->
                <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-blue-800 mb-3">🚀 Next Steps</h3>
                    <ul class="space-y-2 text-blue-700">
                        <li>✅ <strong>Vercel Deployment:</strong> Complete</li>
                        <li>🔧 <strong>Database Integration:</strong> Connect PostgreSQL/Supabase</li>
                        <li>🌐 <strong>Custom Domain:</strong> Add your domain name</li>
                        <li>📊 <strong>Full Search:</strong> Enable live worker search</li>
                    </ul>
                </div>
            </div>
        </div>

        <script>
            // Basic interactivity
            document.getElementById('searchBtn').addEventListener('click', function() {
                alert('Search functionality will be enabled after database integration!');
            });
            
            // Province change handler
            document.getElementById('province').addEventListener('change', function(e) {
                const citySelect = document.getElementById('city');
                const cities = {
                    'AB': ['Calgary', 'Edmonton', 'Red Deer'],
                    'BC': ['Vancouver', 'Victoria', 'Burnaby'],
                    'ON': ['Toronto', 'Ottawa', 'Hamilton'],
                    'QC': ['Montreal', 'Quebec City', 'Laval']
                };
                
                citySelect.innerHTML = '<option value="">Select City</option>';
                if (cities[e.target.value]) {
                    cities[e.target.value].forEach(city => {
                        citySelect.innerHTML += \`<option value="\${city}">\${city}</option>\`;
                    });
                }
            });
        </script>
    </body>
    </html>
  `)
})

export default handle(app)