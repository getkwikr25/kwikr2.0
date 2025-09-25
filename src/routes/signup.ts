import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const signupRoutes = new Hono<{ Bindings: Bindings }>()

// Client Signup Page
signupRoutes.get('/client', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Up as Client - Kwikr Directory</title>
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
                        <a href="/auth/login" class="text-gray-700 hover:text-kwikr-green">Sign In</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8">
                <div>
                    <div class="text-center">
                        <div class="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                            <i class="fas fa-user text-2xl text-blue-600"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Sign up as Client</h2>
                        <p class="mt-2 text-gray-600">Create your account to hire trusted service providers</p>
                    </div>
                </div>
                
                <form id="clientSignupForm" class="mt-8 space-y-6">
                    <input type="hidden" id="userRole" value="client">
                    
                    <!-- Personal Information -->
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
                                <input id="firstName" name="firstName" type="text" required 
                                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            </div>
                            <div>
                                <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
                                <input id="lastName" name="lastName" type="text" required 
                                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            </div>
                        </div>
                        
                        <div>
                            <label for="signupEmail" class="block text-sm font-medium text-gray-700">Email Address</label>
                            <input id="signupEmail" name="email" type="email" required 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>
                        
                        <div>
                            <label for="signupPassword" class="block text-sm font-medium text-gray-700">Password</label>
                            <input id="signupPassword" name="password" type="password" required 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
                        </div>
                        
                        <!-- Location Information -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="province" class="block text-sm font-medium text-gray-700">Province</label>
                                <select id="province" name="province" required 
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    <option value="">Select Province</option>
                                    <option value="ON">Ontario</option>
                                    <option value="BC">British Columbia</option>
                                    <option value="AB">Alberta</option>
                                    <option value="MB">Manitoba</option>
                                    <option value="SK">Saskatchewan</option>
                                    <option value="QC">Quebec</option>
                                    <option value="NB">New Brunswick</option>
                                    <option value="NS">Nova Scotia</option>
                                    <option value="PE">Prince Edward Island</option>
                                    <option value="NL">Newfoundland and Labrador</option>
                                    <option value="NT">Northwest Territories</option>
                                    <option value="NU">Nunavut</option>
                                    <option value="YT">Yukon</option>
                                </select>
                            </div>
                            <div>
                                <label for="city" class="block text-sm font-medium text-gray-700">City</label>
                                <input id="city" name="city" type="text" required 
                                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            </div>
                        </div>
                    </div>

                    <!-- Agreement Checkbox -->
                    <div class="flex items-center">
                        <input id="agreeTermsClient" name="agreeTerms" type="checkbox" required 
                               class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                        <label for="agreeTermsClient" class="ml-2 block text-sm text-gray-900">
                            I agree to the <button type="button" onclick="showTermsModal()" class="text-blue-600 hover:text-blue-700 underline">Terms of Service</button> and <button type="button" onclick="showPrivacyModal()" class="text-blue-600 hover:text-blue-700 underline">Privacy Policy</button>
                        </label>
                    </div>

                    <!-- Submit Button -->
                    <div>
                        <button type="submit" 
                                class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                <i class="fas fa-user-plus text-blue-500 group-hover:text-blue-400"></i>
                            </span>
                            Create Client Account
                        </button>
                    </div>
                </form>

                <div class="text-center">
                    <p class="text-sm text-gray-600">
                        Need to provide services instead? 
                        <a href="/signup/worker" class="font-medium text-kwikr-green hover:text-green-600">Sign up as Service Provider</a>
                    </p>
                    <p class="text-sm text-gray-600 mt-2">
                        Already have an account? 
                        <a href="/auth/login" class="font-medium text-kwikr-green hover:text-green-600">Sign in</a>
                    </p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            document.getElementById('clientSignupForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    first_name: document.getElementById('firstName').value.trim(),
                    last_name: document.getElementById('lastName').value.trim(),
                    email: document.getElementById('signupEmail').value.trim(),
                    password: document.getElementById('signupPassword').value,
                    role: 'client',
                    province: document.getElementById('province').value,
                    city: document.getElementById('city').value.trim()
                };
                
                // Validation
                if (!formData.first_name || !formData.last_name || !formData.email || 
                    !formData.password || !formData.province || !formData.city) {
                    if (!formData.first_name) showFieldError('firstName', 'First name is required');
                    if (!formData.last_name) showFieldError('lastName', 'Last name is required');
                    if (!formData.email) showFieldError('signupEmail', 'Email address is required');
                    if (!formData.password) showFieldError('signupPassword', 'Password is required');
                    if (!formData.province) showFieldError('province', 'Province is required');
                    if (!formData.city) showFieldError('city', 'City is required');
                    return;
                }
                
                if (formData.password.length < 8) {
                    showFieldError('signupPassword', 'Password must be at least 8 characters long');
                    return;
                }
                
                if (!document.getElementById('agreeTermsClient').checked) {
                    showFieldError('agreeTermsClient', 'Please agree to the Terms of Service and Privacy Policy');
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Redirect directly to client dashboard after successful account creation
                        window.location.href = '/dashboard/client';
                    } else {
                        // Show error message inline instead of popup\n                        console.error('Registration failed:', data.error);\n                        // Could add inline error display here in future
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    // Show error message inline instead of popup\n                    console.error('Registration failed - network or server error');\n                    // Could add inline error display here in future
                }
            });
            
            // Field validation helper function
            function showFieldError(fieldId, message) {
                const field = document.getElementById(fieldId);
                if (!field) return;
                
                // Clear any existing error for this field
                const container = field.closest('div');
                if (container) {
                    const existingError = container.querySelector('.field-error');
                    if (existingError) {
                        existingError.remove();
                    }
                }
                
                // Add error styling to field
                field.classList.add('border-red-500', 'focus:border-red-500');
                field.classList.remove('border-gray-300', 'focus:border-kwikr-green');
                
                // Create and show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error text-red-500 text-sm mt-1';
                errorDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>' + message;
                
                if (container) {
                    container.appendChild(errorDiv);
                }
                
                // Scroll the field into view and focus
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                field.focus();
            }
        </script>

        <!-- Terms of Service Modal -->
        <div id="termsModal" class="hidden fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 class="text-2xl font-bold text-gray-900">Terms of Service</h3>
                    <button type="button" onclick="closeModal('termsModal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[70vh]">
                    <div class="prose max-w-none">
                        <p class="text-sm text-gray-500 mb-6">Last Updated: September 5, 2025</p>
                        
                        <h4 class="text-lg font-semibold mb-3">1. Acceptance of Terms</h4>
                        <p class="mb-4">By accessing and using Kwikr Directory, you accept and agree to be bound by the terms and provision of this agreement.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">2. Service Description</h4>
                        <p class="mb-4">Kwikr Directory is a platform that connects clients with service providers across Canada. We facilitate connections but do not directly provide services.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">3. User Obligations</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Provide accurate and truthful information</li>
                            <li>Maintain the confidentiality of your account</li>
                            <li>Use the service in accordance with applicable laws</li>
                            <li>Respect other users and maintain professional conduct</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">4. Service Provider Requirements</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Must have appropriate licenses and insurance</li>
                            <li>Must provide quality services as advertised</li>
                            <li>Must maintain professional standards</li>
                            <li>Must comply with subscription plan requirements</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">5. Payment Terms</h4>
                        <p class="mb-4">Payment terms vary by subscription plan. Service fees and subscription costs are outlined in your chosen plan. All payments are processed securely through our payment partners.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">6. Limitation of Liability</h4>
                        <p class="mb-4">Kwikr Directory acts as a platform facilitator. We are not liable for the quality, safety, or legality of services provided by third-party service providers.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">7. Privacy</h4>
                        <p class="mb-4">Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">8. Termination</h4>
                        <p class="mb-4">We reserve the right to terminate accounts that violate these terms or engage in fraudulent activity.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">9. Changes to Terms</h4>
                        <p class="mb-4">We may update these terms from time to time. Users will be notified of significant changes via email or platform notification.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">10. Contact Information</h4>
                        <p>For questions about these Terms of Service, please contact us at legal@kwikr.ca or through our support system.</p>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t border-gray-200">
                    <button type="button" onclick="closeModal('termsModal')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Close
                    </button>
                </div>
            </div>
        </div>

        <!-- Privacy Policy Modal -->
        <div id="privacyModal" class="hidden fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 class="text-2xl font-bold text-gray-900">Privacy Policy</h3>
                    <button type="button" onclick="closeModal('privacyModal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[70vh]">
                    <div class="prose max-w-none">
                        <p class="text-sm text-gray-500 mb-6">Last Updated: September 5, 2025</p>
                        
                        <h4 class="text-lg font-semibold mb-3">1. Information We Collect</h4>
                        <p class="mb-2"><strong>Personal Information:</strong></p>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Name, email address, phone number</li>
                            <li>Business information (for service providers)</li>
                            <li>Location data (province, city)</li>
                            <li>Payment information (processed securely by third parties)</li>
                        </ul>
                        
                        <p class="mb-2"><strong>Usage Information:</strong></p>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Platform usage analytics</li>
                            <li>Job posting and bidding activity</li>
                            <li>Communication between users</li>
                            <li>Device and browser information</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">2. How We Use Your Information</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>To facilitate connections between clients and service providers</li>
                            <li>To process payments and manage subscriptions</li>
                            <li>To improve our platform and user experience</li>
                            <li>To send important notifications and updates</li>
                            <li>To ensure platform security and prevent fraud</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">3. Information Sharing</h4>
                        <p class="mb-4">We do not sell your personal information. We may share information in the following circumstances:</p>
                        <ul class="list-disc pl-6 mb-4">
                            <li>With other users as part of the platform functionality</li>
                            <li>With service providers (payment processors, analytics)</li>
                            <li>When required by law or to protect our rights</li>
                            <li>With your explicit consent</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">4. Data Security</h4>
                        <p class="mb-4">We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">5. Data Retention</h4>
                        <p class="mb-4">We retain your information as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">6. Your Rights</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Access your personal information</li>
                            <li>Correct inaccurate information</li>
                            <li>Request deletion of your data</li>
                            <li>Opt-out of non-essential communications</li>
                            <li>Data portability (receive a copy of your data)</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">7. Cookies and Tracking</h4>
                        <p class="mb-4">We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">8. Third-Party Services</h4>
                        <p class="mb-4">Our platform integrates with third-party services for payments, analytics, and communication. These services have their own privacy policies.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">9. Changes to This Policy</h4>
                        <p class="mb-4">We may update this privacy policy from time to time. We will notify users of significant changes via email or platform notification.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">10. Contact Us</h4>
                        <p>For questions about this Privacy Policy or to exercise your rights, contact us at privacy@kwikr.ca or through our support system.</p>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t border-gray-200">
                    <button type="button" onclick="closeModal('privacyModal')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Close
                    </button>
                </div>
            </div>
        </div>

        <script src="/static/terms-modal.js"></script>
    </body>
    </html>
  `)
})

// Worker/Service Provider Signup Page
signupRoutes.get('/worker', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Up as Service Provider - Kwikr Directory</title>
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
                        <a href="/auth/login" class="text-gray-700 hover:text-kwikr-green">Sign In</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-lg w-full space-y-8">
                <div>
                    <div class="text-center">
                        <div class="mx-auto h-16 w-16 bg-kwikr-green bg-opacity-10 rounded-full flex items-center justify-center mb-6">
                            <i class="fas fa-tools text-2xl text-kwikr-green"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Join as Service Provider</h2>
                        <p class="mt-2 text-gray-600">Start growing your business with verified clients</p>
                    </div>
                </div>
                
                <form id="workerSignupForm" class="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg">
                    <input type="hidden" id="userRole" value="worker">
                    
                    <!-- Personal Information Section -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-medium text-gray-900 border-b pb-2">
                            <i class="fas fa-user mr-2 text-kwikr-green"></i>Personal Information
                        </h3>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="firstName" class="block text-sm font-medium text-gray-700">First Name *</label>
                                <input id="firstName" name="firstName" type="text" required 
                                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            </div>
                            <div>
                                <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name *</label>
                                <input id="lastName" name="lastName" type="text" required 
                                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            </div>
                        </div>
                        
                        <div>
                            <label for="signupEmail" class="block text-sm font-medium text-gray-700">Email Address *</label>
                            <input id="signupEmail" name="email" type="email" required 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>
                        
                        <div>
                            <label for="signupPassword" class="block text-sm font-medium text-gray-700">Password *</label>
                            <input id="signupPassword" name="password" type="password" required 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
                        </div>
                    </div>

                    <!-- Location Information Section -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-medium text-gray-900 border-b pb-2">
                            <i class="fas fa-map-marker-alt mr-2 text-kwikr-green"></i>Service Location
                        </h3>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="province" class="block text-sm font-medium text-gray-700">Province *</label>
                                <select id="province" name="province" required 
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                    <option value="">Select Province</option>
                                    <option value="ON">Ontario</option>
                                    <option value="BC">British Columbia</option>
                                    <option value="AB">Alberta</option>
                                    <option value="MB">Manitoba</option>
                                    <option value="SK">Saskatchewan</option>
                                    <option value="QC">Quebec</option>
                                    <option value="NB">New Brunswick</option>
                                    <option value="NS">Nova Scotia</option>
                                    <option value="PE">Prince Edward Island</option>
                                    <option value="NL">Newfoundland and Labrador</option>
                                    <option value="NT">Northwest Territories</option>
                                    <option value="NU">Nunavut</option>
                                    <option value="YT">Yukon</option>
                                </select>
                            </div>
                            <div>
                                <label for="city" class="block text-sm font-medium text-gray-700">City *</label>
                                <input id="city" name="city" type="text" required 
                                       class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            </div>
                        </div>
                    </div>

                    <!-- Business Information Section -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-medium text-gray-900 border-b pb-2">
                            <i class="fas fa-briefcase mr-2 text-kwikr-green"></i>Business Information
                        </h3>
                        
                        <div>
                            <label for="businessName" class="block text-sm font-medium text-gray-700">Company Name *</label>
                            <input id="businessName" name="businessName" type="text" required
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                   placeholder="Your Company Name">
                        </div>
                        
                        <div>
                            <label for="businessEmail" class="block text-sm font-medium text-gray-700">Company Email *</label>
                            <input id="businessEmail" name="businessEmail" type="email" required
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                   placeholder="company@example.com">
                            <p class="mt-1 text-xs text-gray-500">This will be your primary business contact email</p>
                        </div>
                        
                        <div>
                            <label for="phone" class="block text-sm font-medium text-gray-700">Company Phone *</label>
                            <input id="phone" name="phone" type="tel" required
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green"
                                   placeholder="(555) 123-4567">
                        </div>
                        
                        <div>
                            <label for="serviceType" class="block text-sm font-medium text-gray-700">Primary Service Category *</label>
                            <select id="serviceType" name="serviceType" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                <option value="">Select Service Type</option>
                                <option value="Cleaning Services">Cleaning Services</option>
                                <option value="Plumbers">Plumbers</option>
                                <option value="Carpenters">Carpenters</option>
                                <option value="Electricians">Electricians</option>
                                <option value="Painters">Painters</option>
                                <option value="Handyman">Handyman Services</option>
                                <option value="HVAC Services">HVAC Services</option>
                                <option value="Landscaping">Landscaping</option>
                                <option value="Roofing">Roofing</option>
                                <option value="Flooring">Flooring</option>
                                <option value="Renovations">Renovations</option>
                                <option value="General Contractor">General Contractor</option>
                            </select>
                        </div>
                    </div>

                    <!-- Agreement Checkbox -->
                    <div class="flex items-center">
                        <input id="agreeTerms" name="agreeTerms" type="checkbox" required 
                               class="h-4 w-4 text-kwikr-green focus:ring-kwikr-green border-gray-300 rounded">
                        <label for="agreeTerms" class="ml-2 block text-sm text-gray-900">
                            I agree to the <button type="button" onclick="showTermsModal()" class="text-kwikr-green hover:text-green-600 underline">Terms of Service</button> and <button type="button" onclick="showPrivacyModal()" class="text-kwikr-green hover:text-green-600 underline">Privacy Policy</button>
                        </label>
                    </div>

                    <!-- Submit Button -->
                    <div>
                        <button type="submit" 
                                class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-kwikr-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kwikr-green">
                            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                <i class="fas fa-tools text-green-500 group-hover:text-green-400"></i>
                            </span>
                            Create Service Provider Account
                        </button>
                    </div>
                </form>

                <div class="text-center">
                    <p class="text-sm text-gray-600">
                        Looking to hire services instead? 
                        <a href="/signup/client" class="font-medium text-kwikr-green hover:text-green-600">Sign up as Client</a>
                    </p>
                    <p class="text-sm text-gray-600 mt-2">
                        Already have an account? 
                        <a href="/auth/login" class="font-medium text-kwikr-green hover:text-green-600">Sign in</a>
                    </p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            document.getElementById('workerSignupForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const formData = {
                    firstName: document.getElementById('firstName').value.trim(),
                    lastName: document.getElementById('lastName').value.trim(),
                    email: document.getElementById('signupEmail').value.trim(),
                    password: document.getElementById('signupPassword').value,
                    role: 'worker',
                    province: document.getElementById('province').value,
                    city: document.getElementById('city').value.trim(),
                    businessName: document.getElementById('businessName').value.trim(),
                    businessEmail: document.getElementById('businessEmail').value.trim(),
                    phone: document.getElementById('phone').value.trim(),
                    serviceType: document.getElementById('serviceType').value
                };
                
                console.log('Form data being submitted:', formData);
                
                // Validation
                if (!formData.firstName || !formData.lastName || !formData.email || 
                    !formData.password || !formData.province || !formData.city ||
                    !formData.businessName || !formData.businessEmail || !formData.phone || 
                    !formData.serviceType) {
                    if (!formData.firstName) showFieldError('firstName', 'First name is required');
                    if (!formData.lastName) showFieldError('lastName', 'Last name is required');
                    if (!formData.email) showFieldError('signupEmail', 'Email address is required');
                    if (!formData.password) showFieldError('signupPassword', 'Password is required');
                    if (!formData.province) showFieldError('province', 'Province is required');
                    if (!formData.city) showFieldError('city', 'City is required');
                    if (!formData.businessName) showFieldError('businessName', 'Business name is required');
                    if (!formData.businessEmail) showFieldError('businessEmail', 'Business email is required');
                    if (!formData.phone) showFieldError('phone', 'Phone number is required');
                    if (!formData.serviceType) showFieldError('serviceType', 'Service type is required');
                    return;
                }
                
                if (formData.password.length < 8) {
                    showFieldError('signupPassword', 'Password must be at least 8 characters long');
                    return;
                }
                
                // Validate business email format (more permissive regex)
                const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(formData.businessEmail)) {
                    showFieldError('businessEmail', 'Please enter a valid business email address');
                    return;
                }
                
                // Validate phone format (basic validation)
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                const cleanPhone = formData.phone.replace(/[\s\(\)\-\.]/g, '');
                if (cleanPhone.length < 10) {
                    alert('Please enter a valid phone number (at least 10 digits)');
                    return;
                }
                
                if (!document.getElementById('agreeTerms').checked) {
                    alert('Please agree to the Terms of Service and Privacy Policy');
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await response.json();
                    console.log('Registration response:', data);
                    
                    if (response.ok && data.success) {
                        // Check if user selected a specific plan
                        const urlParams = new URLSearchParams(window.location.search);
                        const selectedPlan = urlParams.get('plan');
                        
                        if (selectedPlan && data.session_token) {
                            // Auto-subscribe to the selected plan
                            await subscribeToSelectedPlan(selectedPlan, data.session_token);
                        } else {
                            // Redirect to subscription selection after account creation
                            window.location.href = '/subscriptions/pricing';
                        }
                    } else {
                        // Show error message inline instead of popup\n                        console.error('Registration failed:', data.error);\n                        // Could add inline error display here in future
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    // Show error message inline instead of popup\n                    console.error('Registration failed - network or server error');\n                    // Could add inline error display here in future
                }
            });
            
            // Auto-subscribe to selected plan
            async function subscribeToSelectedPlan(planSlug, sessionToken) {
                try {
                    // Map plan slugs to IDs
                    const planMap = {
                        'payasyougo': 1,
                        'growth': 2,
                        'pro': 3
                    };
                    
                    const planId = planMap[planSlug];
                    if (!planId) {
                        // Invalid plan - redirect to subscription selection without popup
                        window.location.href = '/subscriptions/pricing';
                        return;
                    }
                    
                    const response = await fetch('/api/subscriptions/subscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': \`Bearer \${sessionToken}\`
                        },
                        body: JSON.stringify({
                            plan_id: planId,
                            billing_cycle: 'monthly'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        // Redirect directly to dashboard after successful signup - no popup needed
                        window.location.href = '/dashboard/worker/profile';
                    } else {
                        // Redirect to subscription selection - no popup needed
                        window.location.href = '/subscriptions/pricing';
                    }
                } catch (error) {
                    console.error('Subscription error:', error);
                    // Redirect to subscription selection after signup - no popup needed
                    window.location.href = '/subscriptions/pricing';
                }
            }
            
            // Field validation helper functions for worker signup
            function showFieldError(fieldId, message) {
                const field = document.getElementById(fieldId);
                if (!field) return;
                
                // Clear any existing error for this field
                const container = field.closest('div');
                if (container) {
                    const existingError = container.querySelector('.field-error');
                    if (existingError) {
                        existingError.remove();
                    }
                }
                
                // Add error styling to field
                field.classList.add('border-red-500', 'focus:border-red-500');
                field.classList.remove('border-gray-300', 'focus:border-kwikr-green');
                
                // Create and show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error text-red-500 text-sm mt-1';
                errorDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>' + message;
                
                if (container) {
                    container.appendChild(errorDiv);
                }
                
                // Scroll the field into view and focus
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                field.focus();
            }
        </script>

        <!-- Terms of Service Modal -->
        <div id="termsModal" class="hidden fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 class="text-2xl font-bold text-gray-900">Terms of Service</h3>
                    <button type="button" onclick="closeModal('termsModal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[70vh]">
                    <div class="prose max-w-none">
                        <p class="text-sm text-gray-500 mb-6">Last Updated: September 5, 2025</p>
                        
                        <h4 class="text-lg font-semibold mb-3">1. Acceptance of Terms</h4>
                        <p class="mb-4">By accessing and using Kwikr Directory, you accept and agree to be bound by the terms and provision of this agreement.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">2. Service Description</h4>
                        <p class="mb-4">Kwikr Directory is a platform that connects clients with service providers across Canada. We facilitate connections but do not directly provide services.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">3. User Obligations</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Provide accurate and truthful information</li>
                            <li>Maintain the confidentiality of your account</li>
                            <li>Use the service in accordance with applicable laws</li>
                            <li>Respect other users and maintain professional conduct</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">4. Service Provider Requirements</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Must have appropriate licenses and insurance</li>
                            <li>Must provide quality services as advertised</li>
                            <li>Must maintain professional standards</li>
                            <li>Must comply with subscription plan requirements</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">5. Payment Terms</h4>
                        <p class="mb-4">Payment terms vary by subscription plan. Service fees and subscription costs are outlined in your chosen plan. All payments are processed securely through our payment partners.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">6. Limitation of Liability</h4>
                        <p class="mb-4">Kwikr Directory acts as a platform facilitator. We are not liable for the quality, safety, or legality of services provided by third-party service providers.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">7. Privacy</h4>
                        <p class="mb-4">Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">8. Termination</h4>
                        <p class="mb-4">We reserve the right to terminate accounts that violate these terms or engage in fraudulent activity.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">9. Changes to Terms</h4>
                        <p class="mb-4">We may update these terms from time to time. Users will be notified of significant changes via email or platform notification.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">10. Contact Information</h4>
                        <p>For questions about these Terms of Service, please contact us at legal@kwikr.ca or through our support system.</p>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t border-gray-200">
                    <button type="button" onclick="closeModal('termsModal')" class="px-4 py-2 bg-kwikr-green text-white rounded-lg hover:bg-green-700">
                        Close
                    </button>
                </div>
            </div>
        </div>

        <!-- Privacy Policy Modal -->
        <div id="privacyModal" class="hidden fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 class="text-2xl font-bold text-gray-900">Privacy Policy</h3>
                    <button type="button" onclick="closeModal('privacyModal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[70vh]">
                    <div class="prose max-w-none">
                        <p class="text-sm text-gray-500 mb-6">Last Updated: September 5, 2025</p>
                        
                        <h4 class="text-lg font-semibold mb-3">1. Information We Collect</h4>
                        <p class="mb-2"><strong>Personal Information:</strong></p>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Name, email address, phone number</li>
                            <li>Business information (for service providers)</li>
                            <li>Location data (province, city)</li>
                            <li>Payment information (processed securely by third parties)</li>
                        </ul>
                        
                        <p class="mb-2"><strong>Usage Information:</strong></p>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Platform usage analytics</li>
                            <li>Job posting and bidding activity</li>
                            <li>Communication between users</li>
                            <li>Device and browser information</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">2. How We Use Your Information</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>To facilitate connections between clients and service providers</li>
                            <li>To process payments and manage subscriptions</li>
                            <li>To improve our platform and user experience</li>
                            <li>To send important notifications and updates</li>
                            <li>To ensure platform security and prevent fraud</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">3. Information Sharing</h4>
                        <p class="mb-4">We do not sell your personal information. We may share information in the following circumstances:</p>
                        <ul class="list-disc pl-6 mb-4">
                            <li>With other users as part of the platform functionality</li>
                            <li>With service providers (payment processors, analytics)</li>
                            <li>When required by law or to protect our rights</li>
                            <li>With your explicit consent</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">4. Data Security</h4>
                        <p class="mb-4">We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">5. Data Retention</h4>
                        <p class="mb-4">We retain your information as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">6. Your Rights</h4>
                        <ul class="list-disc pl-6 mb-4">
                            <li>Access your personal information</li>
                            <li>Correct inaccurate information</li>
                            <li>Request deletion of your data</li>
                            <li>Opt-out of non-essential communications</li>
                            <li>Data portability (receive a copy of your data)</li>
                        </ul>
                        
                        <h4 class="text-lg font-semibold mb-3">7. Cookies and Tracking</h4>
                        <p class="mb-4">We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">8. Third-Party Services</h4>
                        <p class="mb-4">Our platform integrates with third-party services for payments, analytics, and communication. These services have their own privacy policies.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">9. Changes to This Policy</h4>
                        <p class="mb-4">We may update this privacy policy from time to time. We will notify users of significant changes via email or platform notification.</p>
                        
                        <h4 class="text-lg font-semibold mb-3">10. Contact Us</h4>
                        <p>For questions about this Privacy Policy or to exercise your rights, contact us at privacy@kwikr.ca or through our support system.</p>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t border-gray-200">
                    <button type="button" onclick="closeModal('privacyModal')" class="px-4 py-2 bg-kwikr-green text-white rounded-lg hover:bg-green-700">
                        Close
                    </button>
                </div>
            </div>
        </div>

        <script src="/static/terms-modal.js"></script>
    </body>
    </html>
  `)
})

// Signup Selection Page removed - users go directly to /subscriptions/pricing or specific signup pages
