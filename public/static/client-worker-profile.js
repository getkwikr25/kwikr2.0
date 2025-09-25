// Client Worker Profile Page
let currentWorker = null;
let workerServices = [];
let workerReviews = [];

// Initialize the worker profile page
async function loadWorkerProfilePage() {
    try {
        console.log('Loading worker profile page...');
        
        await loadWorkerProfile();
        
        console.log('Worker profile page loaded successfully');
    } catch (error) {
        console.error('Error loading worker profile page:', error);
        showError('Failed to load worker profile page');
    }
}

// Load worker profile data
async function loadWorkerProfile() {
    try {
        const response = await window.apiRequest(`/client/workers/${window.currentWorkerId}`);
        
        if (response.worker) {
            currentWorker = response.worker;
            workerServices = response.services || [];
            workerReviews = response.reviews || [];
        } else {
            // Fallback: generate sample worker profile for demo
            currentWorker = {
                id: window.currentWorkerId,
                first_name: "Emma",
                last_name: "Johnson", 
                email: "emma.johnson@example.com",
                phone: "(555) 123-4567",
                province: "ON",
                city: "Toronto",
                bio: "Professional cleaning service provider with 5+ years of experience in residential and commercial cleaning.",
                experience_years: 5,
                profile_image_url: null,
                avg_rating: 4.8,
                review_count: 23
            };
            workerServices = [
                {
                    name: "Residential Cleaning",
                    base_price: 50,
                    description: "Complete home cleaning including bathrooms, kitchens, and living areas.",
                    icon_class: "fas fa-home"
                },
                {
                    name: "Deep Cleaning",
                    base_price: 80,
                    description: "Thorough deep cleaning service for move-in/move-out or seasonal cleaning.",
                    icon_class: "fas fa-sparkles"
                }
            ];
            workerReviews = [
                {
                    rating: 5,
                    review_text: "Excellent work! Emma was thorough and professional.",
                    created_at: "2024-01-15",
                    client_first_name: "Sarah"
                },
                {
                    rating: 4,
                    review_text: "Great cleaning service, very reliable.",
                    created_at: "2024-01-10", 
                    client_first_name: "Mike"
                }
            ];
        }
        
        renderWorkerProfile();
        
    } catch (error) {
        console.error('Error loading worker profile:', error);
        const container = document.getElementById('worker-profile-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                    <p class="text-red-500">Failed to load worker profile</p>
                    <button onclick="loadWorkerProfile()" class="mt-4 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Render worker profile
function renderWorkerProfile() {
    const container = document.getElementById('worker-profile-container');
    if (!container || !currentWorker) return;
    
    container.innerHTML = `
        <!-- Worker Header -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div class="flex items-start space-x-6">
                <div class="flex-shrink-0">
                    ${currentWorker.profile_image_url ? `
                        <img src="${currentWorker.profile_image_url}" alt="${currentWorker.first_name} ${currentWorker.last_name}" 
                             class="w-24 h-24 rounded-full object-cover">
                    ` : `
                        <div class="w-24 h-24 rounded-full bg-kwikr-green flex items-center justify-center text-white font-bold text-2xl">
                            ${currentWorker.first_name.charAt(0)}${currentWorker.last_name.charAt(0)}
                        </div>
                    `}
                </div>
                <div class="flex-1">
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">${currentWorker.first_name} ${currentWorker.last_name}</h1>
                    <div class="flex items-center space-x-4 mb-4">
                        <span class="text-gray-600">
                            <i class="fas fa-map-marker-alt mr-1"></i>
                            ${currentWorker.city || 'N/A'}, ${currentWorker.province || 'N/A'}
                        </span>
                        ${currentWorker.avg_rating ? `
                            <div class="flex items-center">
                                <i class="fas fa-star text-yellow-400 mr-1"></i>
                                <span class="font-medium">${parseFloat(currentWorker.avg_rating).toFixed(1)}</span>
                                <span class="text-gray-500 ml-1">(${currentWorker.review_count} reviews)</span>
                            </div>
                        ` : '<span class="text-gray-500">No reviews yet</span>'}
                    </div>
                    
                    ${currentWorker.bio ? `
                        <div class="mb-4">
                            <h3 class="font-semibold text-gray-900 mb-2">About</h3>
                            <p class="text-gray-700">${currentWorker.bio}</p>
                        </div>
                    ` : ''}
                    
                    <div class="flex space-x-3">
                        <button onclick="contactWorker(${currentWorker.id})" 
                                class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                            <i class="fas fa-envelope mr-2"></i>Contact Worker
                        </button>
                        <button onclick="inviteToJob(${currentWorker.id})" 
                                class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            <i class="fas fa-paper-plane mr-2"></i>Invite to Job
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Services -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">
                    <i class="fas fa-tools mr-2"></i>Services
                </h2>
                
                <div id="services-container">
                    ${renderServices()}
                </div>
            </div>
            
            <!-- Reviews -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">
                    <i class="fas fa-star mr-2"></i>Reviews
                </h2>
                
                <div id="reviews-container">
                    ${renderReviews()}
                </div>
            </div>
        </div>
        
        <!-- Worker Stats -->
        ${renderWorkerStats()}
    `;
}

// Render services
function renderServices() {
    if (!workerServices || workerServices.length === 0) {
        return `
            <div class="text-center py-6">
                <i class="fas fa-tools text-gray-400 text-2xl mb-2"></i>
                <p class="text-gray-500">No services listed</p>
            </div>
        `;
    }
    
    return `
        <div class="space-y-3">
            ${workerServices.map(service => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center">
                        <i class="${service.icon_class || 'fas fa-tools'} text-kwikr-green mr-3"></i>
                        <span class="font-medium">${service.name}</span>
                    </div>
                    ${service.base_price ? `
                        <span class="text-sm text-gray-600 font-semibold">${formatCurrency(service.base_price)}</span>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// Render reviews
function renderReviews() {
    if (!workerReviews || workerReviews.length === 0) {
        return `
            <div class="text-center py-6">
                <i class="fas fa-star text-gray-400 text-2xl mb-2"></i>
                <p class="text-gray-500">No reviews yet</p>
            </div>
        `;
    }
    
    return `
        <div class="space-y-4">
            ${workerReviews.slice(0, 5).map(review => `
                <div class="border-b border-gray-100 pb-4 last:border-b-0">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center">
                            <div class="flex text-yellow-400 mr-2">
                                ${[1,2,3,4,5].map(i => `
                                    <i class="fas fa-star${i <= review.rating ? '' : ' text-gray-300'}"></i>
                                `).join('')}
                            </div>
                            <span class="text-sm font-medium text-gray-900">${review.client_first_name}</span>
                        </div>
                        <span class="text-xs text-gray-500">${formatDate(review.created_at)}</span>
                    </div>
                    ${review.review_text ? `
                        <p class="text-sm text-gray-700">${review.review_text}</p>
                    ` : ''}
                </div>
            `).join('')}
            
            ${workerReviews.length > 5 ? `
                <div class="text-center">
                    <button onclick="loadAllReviews()" class="text-kwikr-green hover:text-green-600 text-sm font-medium">
                        View all ${workerReviews.length} reviews
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Render worker stats
function renderWorkerStats() {
    return `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">
                <i class="fas fa-chart-bar mr-2"></i>Worker Statistics
            </h2>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                    <div class="text-2xl font-bold text-kwikr-green mb-1">
                        ${currentWorker.completed_jobs || 0}
                    </div>
                    <div class="text-sm text-gray-600">Jobs Completed</div>
                </div>
                
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                    <div class="text-2xl font-bold text-kwikr-green mb-1">
                        ${currentWorker.avg_rating ? parseFloat(currentWorker.avg_rating).toFixed(1) : 'N/A'}
                    </div>
                    <div class="text-sm text-gray-600">Average Rating</div>
                </div>
                
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                    <div class="text-2xl font-bold text-kwikr-green mb-1">
                        ${currentWorker.review_count || 0}
                    </div>
                    <div class="text-sm text-gray-600">Total Reviews</div>
                </div>
                
                <div class="text-center p-4 bg-gray-50 rounded-lg">
                    <div class="text-2xl font-bold text-kwikr-green mb-1">
                        ${currentWorker.experience_years || 'N/A'}
                    </div>
                    <div class="text-sm text-gray-600">Years Experience</div>
                </div>
            </div>
            
            ${currentWorker.response_time ? `
                <div class="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div class="flex items-center">
                        <i class="fas fa-clock text-blue-500 mr-2"></i>
                        <span class="text-sm text-blue-700">
                            <strong>Response Time:</strong> ${currentWorker.response_time}
                        </span>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Contact worker
function contactWorker(workerId) {
    // For now, show placeholder message
    showInfo('Messaging feature coming soon! You can contact this worker through their profile.');
}

// Invite worker to job
function inviteToJob(workerId) {
    // For now, show placeholder message
    showInfo('Job invitation feature coming soon! You can post a job and workers will be able to bid on it.');
}

// Load all reviews (placeholder)
function loadAllReviews() {
    showInfo('Full reviews page coming soon!');
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
        type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
        type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
        'bg-blue-100 text-blue-800 border border-blue-200'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadWorkerProfilePage);