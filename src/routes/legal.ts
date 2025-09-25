import { Hono } from 'hono'

export const legalRoutes = new Hono()

// Terms of Service Page
legalRoutes.get('/terms', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terms of Service - Kwikr Directory</title>
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
    <body class="bg-gray-50 min-h-screen">
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
                        <a href="/legal/privacy" class="text-gray-700 hover:text-kwikr-green">Privacy Policy</a>
                        <a href="/auth/login" class="text-gray-700 hover:text-kwikr-green">Sign In</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-4 py-12">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
                <p class="text-sm text-gray-500 mb-8">Last Updated: September 5, 2025</p>
                
                <div class="prose max-w-none">
                    <h2 class="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                    <p class="mb-6">By accessing and using Kwikr Directory, you accept and agree to be bound by the terms and provision of this agreement.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">2. Service Description</h2>
                    <p class="mb-6">Kwikr Directory is a platform that connects clients with service providers across Canada. We facilitate connections but do not directly provide services.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">3. User Obligations</h2>
                    <ul class="list-disc pl-6 mb-6">
                        <li>Provide accurate and truthful information</li>
                        <li>Maintain the confidentiality of your account</li>
                        <li>Use the service in accordance with applicable laws</li>
                        <li>Respect other users and maintain professional conduct</li>
                    </ul>
                    
                    <h2 class="text-2xl font-semibold mb-4">4. Service Provider Requirements</h2>
                    <ul class="list-disc pl-6 mb-6">
                        <li>Must have appropriate licenses and insurance</li>
                        <li>Must provide quality services as advertised</li>
                        <li>Must maintain professional standards</li>
                        <li>Must comply with subscription plan requirements</li>
                    </ul>
                    
                    <h2 class="text-2xl font-semibold mb-4">5. Payment Terms</h2>
                    <p class="mb-6">Payment terms vary by subscription plan. Service fees and subscription costs are outlined in your chosen plan. All payments are processed securely through our payment partners.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
                    <p class="mb-6">Kwikr Directory acts as a platform facilitator. We are not liable for the quality, safety, or legality of services provided by third-party service providers.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">7. Privacy</h2>
                    <p class="mb-6">Your privacy is important to us. Please review our <a href="/legal/privacy" class="text-kwikr-green hover:text-green-600">Privacy Policy</a> to understand how we collect, use, and protect your information.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">8. Termination</h2>
                    <p class="mb-6">We reserve the right to terminate accounts that violate these terms or engage in fraudulent activity.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
                    <p class="mb-6">We may update these terms from time to time. Users will be notified of significant changes via email or platform notification.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">10. Contact Information</h2>
                    <p class="mb-6">For questions about these Terms of Service, please contact us at legal@kwikr.ca or through our support system.</p>
                </div>

                <div class="mt-8 pt-8 border-t border-gray-200">
                    <a href="/" class="inline-flex items-center text-kwikr-green hover:text-green-600">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Back to Home
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})

// Privacy Policy Page  
legalRoutes.get('/privacy', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Kwikr Directory</title>
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
    <body class="bg-gray-50 min-h-screen">
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
                        <a href="/legal/terms" class="text-gray-700 hover:text-kwikr-green">Terms of Service</a>
                        <a href="/auth/login" class="text-gray-700 hover:text-kwikr-green">Sign In</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="max-w-4xl mx-auto px-4 py-12">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
                <p class="text-sm text-gray-500 mb-8">Last Updated: September 5, 2025</p>
                
                <div class="prose max-w-none">
                    <h2 class="text-2xl font-semibold mb-4">1. Information We Collect</h2>
                    <p class="mb-2"><strong>Personal Information:</strong></p>
                    <ul class="list-disc pl-6 mb-4">
                        <li>Name, email address, phone number</li>
                        <li>Business information (for service providers)</li>
                        <li>Location data (province, city)</li>
                        <li>Payment information (processed securely by third parties)</li>
                    </ul>
                    
                    <p class="mb-2"><strong>Usage Information:</strong></p>
                    <ul class="list-disc pl-6 mb-6">
                        <li>Platform usage analytics</li>
                        <li>Job posting and bidding activity</li>
                        <li>Communication between users</li>
                        <li>Device and browser information</li>
                    </ul>
                    
                    <h2 class="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                    <ul class="list-disc pl-6 mb-6">
                        <li>To facilitate connections between clients and service providers</li>
                        <li>To process payments and manage subscriptions</li>
                        <li>To improve our platform and user experience</li>
                        <li>To send important notifications and updates</li>
                        <li>To ensure platform security and prevent fraud</li>
                    </ul>
                    
                    <h2 class="text-2xl font-semibold mb-4">3. Information Sharing</h2>
                    <p class="mb-4">We do not sell your personal information. We may share information in the following circumstances:</p>
                    <ul class="list-disc pl-6 mb-6">
                        <li>With other users as part of the platform functionality</li>
                        <li>With service providers (payment processors, analytics)</li>
                        <li>When required by law or to protect our rights</li>
                        <li>With your explicit consent</li>
                    </ul>
                    
                    <h2 class="text-2xl font-semibold mb-4">4. Data Security</h2>
                    <p class="mb-6">We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">5. Data Retention</h2>
                    <p class="mb-6">We retain your information as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">6. Your Rights</h2>
                    <ul class="list-disc pl-6 mb-6">
                        <li>Access your personal information</li>
                        <li>Correct inaccurate information</li>
                        <li>Request deletion of your data</li>
                        <li>Opt-out of non-essential communications</li>
                        <li>Data portability (receive a copy of your data)</li>
                    </ul>
                    
                    <h2 class="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
                    <p class="mb-6">We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
                    <p class="mb-6">Our platform integrates with third-party services for payments, analytics, and communication. These services have their own privacy policies.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
                    <p class="mb-6">We may update this privacy policy from time to time. We will notify users of significant changes via email or platform notification.</p>
                    
                    <h2 class="text-2xl font-semibold mb-4">10. Contact Us</h2>
                    <p class="mb-6">For questions about this Privacy Policy or to exercise your rights, contact us at privacy@kwikr.ca or through our support system.</p>
                </div>

                <div class="mt-8 pt-8 border-t border-gray-200">
                    <a href="/" class="inline-flex items-center text-kwikr-green hover:text-green-600">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Back to Home
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `)
})
