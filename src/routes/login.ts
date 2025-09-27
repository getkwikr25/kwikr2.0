import { Hono } from 'hono'

type Bindings = {
  DB: D1Database;
}

export const loginRoutes = new Hono<{ Bindings: Bindings }>()

// Login Page
loginRoutes.get('/', async (c) => {
  try {
    return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign In - Kwikr Directory</title>
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
                        <a href="/signup/client" class="text-gray-700 hover:text-kwikr-green">Sign Up</a>
                    </div>
                </div>
            </div>
        </nav>

        <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white rounded-lg shadow-md p-8">
                <div>
                    <div class="text-center">
                        <div class="mx-auto h-16 w-16 bg-kwikr-green bg-opacity-10 rounded-full flex items-center justify-center mb-6">
                            <i class="fas fa-sign-in-alt text-2xl text-kwikr-green"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Welcome Back</h2>
                        <p class="mt-2 text-gray-600">Sign in to your Kwikr Directory account</p>
                    </div>
                </div>
                
                <form id="loginForm" class="space-y-6">
                    <div class="space-y-4">
                        <div>
                            <label for="loginEmail" class="block text-sm font-medium text-gray-700">Email Address</label>
                            <input id="loginEmail" name="email" type="email" required 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>
                        
                        <div>
                            <label for="loginPassword" class="block text-sm font-medium text-gray-700">Password</label>
                            <input id="loginPassword" name="password" type="password" required 
                                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                        </div>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 text-kwikr-green focus:ring-kwikr-green border-gray-300 rounded">
                            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div class="text-sm">
                            <a href="#" class="font-medium text-kwikr-green hover:text-green-600">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button type="submit" 
                                class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-kwikr-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kwikr-green">
                            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                <i class="fas fa-sign-in-alt text-green-500 group-hover:text-green-400"></i>
                            </span>
                            Sign In
                        </button>
                    </div>

                    <!-- Demo Login Buttons -->
                    <div class="mt-6">
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-300"></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span class="px-2 bg-white text-gray-500">Or try demo accounts</span>
                            </div>
                        </div>

                        <div class="mt-4 grid grid-cols-2 gap-3">
                            <button type="button" data-demo-role="client"
                                    class="w-full inline-flex justify-center items-center py-2 px-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                <i class="fas fa-user mr-2"></i>
                                Demo Client
                            </button>

                            <button type="button" data-demo-role="worker"
                                    class="w-full inline-flex justify-center items-center py-2 px-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                <i class="fas fa-tools mr-2"></i>
                                Demo Worker
                            </button>
                        </div>
                    </div>
                </form>

                <div class="text-center">
                    <p class="text-sm text-gray-600">
                        Don't have an account? 
                        <a href="/signup/client" class="font-medium text-kwikr-green hover:text-green-600">Sign up here</a>
                    </p>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('loginEmail').value.trim();
                const password = document.getElementById('loginPassword').value;
                
                if (!email || !password) {
                    alert('Please enter both email and password');
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include', // Essential for cookie handling
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Session cookie is automatically set by the server
                        // Store session token in localStorage as backup
                        if (data.sessionToken) {
                            localStorage.setItem('sessionToken', data.sessionToken);
                        }
                        
                        // Success - no alert needed
                        
                        // Redirect based on user role
                        if (data.user.role === 'client') {
                            window.location.href = '/dashboard/client';
                        } else if (data.user.role === 'worker') {
                            window.location.href = '/dashboard/worker';
                        } else if (data.user.role === 'admin') {
                            window.location.href = '/dashboard/admin';
                        } else {
                            window.location.href = '/dashboard';
                        }
                    } else {
                        alert(data.error || 'Login failed. Please check your credentials.');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    alert('Login failed. Please try again.');
                }
            });

            // Demo login function
            async function demoLogin(userType, button) {
                const originalText = button.innerHTML;
                
                try {
                    // Show loading state
                    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
                    button.disabled = true;
                    
                    // Call demo login API
                    const response = await fetch('/api/auth/demo-login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include', // Essential for cookie handling
                        body: JSON.stringify({ role: userType })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Store session token in multiple places for reliability
                        if (data.sessionToken) {
                            // Store in localStorage as backup
                            localStorage.setItem('sessionToken', data.sessionToken);
                            
                            // Also set cookie manually as additional backup
                            document.cookie = \`session=\${data.sessionToken}; path=/; max-age=31536000; samesite=lax\`;
                        }
                        
                        // Extended delay to ensure cookie is set properly in all browsers  
                        setTimeout(() => {
                            // Verify cookie was set before redirecting
                            const cookieSet = document.cookie.includes('session=');
                            console.log('Cookie verification before redirect:', cookieSet);
                            
                            if (!cookieSet) {
                                console.warn('Session cookie not found, retrying...');
                                // If cookie not set, try again with longer delay
                                setTimeout(() => {
                                    window.location.href = userType === 'client' ? '/dashboard/client' : 
                                                         userType === 'worker' ? '/dashboard/worker' : '/dashboard/admin';
                                }, 1000);
                                return;
                            }
                            
                            // Redirect to appropriate dashboard
                            if (userType === 'client') {
                                window.location.href = '/dashboard/client';
                            } else if (userType === 'worker') {
                                window.location.href = '/dashboard/worker';
                            } else if (userType === 'admin') {
                                window.location.href = '/dashboard/admin';
                            }
                        }, 500); // Increased from 100ms to 500ms
                        
                    } else {
                        const error = await response.json();
                        alert('Demo login failed: ' + (error.error || 'Please try again'));
                        
                        // Restore button state
                        button.innerHTML = originalText;
                        button.disabled = false;
                    }
                } catch (error) {
                    console.error('Demo login error:', error);
                    alert('Demo login failed. Please try again.');
                    
                    // Restore button state
                    button.innerHTML = originalText;
                    button.disabled = false;
                }
            }

            // Add event listeners for demo login buttons
            document.addEventListener('DOMContentLoaded', function() {
                document.querySelectorAll('[data-demo-role]').forEach(button => {
                    button.addEventListener('click', function() {
                        const userType = this.getAttribute('data-demo-role');
                        demoLogin(userType, this);
                    });
                });
            });
        </script>
    </body>
    </html>
  `)
  } catch (error) {
    console.error('Login page error:', error)
    return c.html(`<html><body><h1>Login Page Error</h1><p>Please try again later.</p></body></html>`)
  }
})
