// Client Job Details Page
let currentJob = null;
let jobBids = [];

// Initialize the job details page
async function loadJobDetailsPage() {
    try {
        console.log('Loading job details page...');
        
        await loadJobDetails();
        
        console.log('Job details page loaded successfully');
    } catch (error) {
        console.error('Error loading job details page:', error);
        showError('Failed to load job details page');
    }
}

// Load job details and bids
async function loadJobDetails() {
    try {
        const response = await window.apiRequest(`/client/jobs/${window.currentJobId}`);
        currentJob = response.job;
        jobBids = response.bids || [];
        
        renderJobDetails();
        renderJobBids();
        
    } catch (error) {
        console.error('Error loading job details:', error);
        const container = document.getElementById('job-details-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                    <p class="text-red-500">Failed to load job details</p>
                    <button onclick="loadJobDetails()" class="mt-4 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Render job details
function renderJobDetails() {
    const container = document.getElementById('job-details-container');
    if (!container || !currentJob) return;
    
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div class="flex items-start justify-between mb-6">
                <div class="flex-1">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">${currentJob.title}</h2>
                    <div class="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <span><i class="fas fa-tag mr-1"></i>${currentJob.category_name || 'No category'}</span>
                        <span><i class="fas fa-calendar mr-1"></i>${formatDate(currentJob.created_at)}</span>
                        <span><i class="fas fa-map-marker-alt mr-1"></i>${currentJob.city}, ${currentJob.province}</span>
                    </div>
                    <div class="flex items-center space-x-4 mb-4">
                        ${getStatusBadge(currentJob.status)}
                        ${getUrgencyBadge(currentJob.urgency)}
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-kwikr-green mb-2">
                        ${formatCurrency(currentJob.budget_min)} - ${formatCurrency(currentJob.budget_max)}
                    </div>
                    ${currentJob.status === 'posted' ? `
                        <button onclick="editJob(${currentJob.id})" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            <i class="fas fa-edit mr-2"></i>Edit Job
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="border-t pt-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Job Description</h3>
                <p class="text-gray-700 whitespace-pre-wrap">${currentJob.description}</p>
            </div>
            
            ${currentJob.location_address ? `
                <div class="border-t pt-6 mt-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Location</h3>
                    <p class="text-gray-700">${currentJob.location_address}</p>
                </div>
            ` : ''}
            
            <div class="border-t pt-6 mt-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${currentJob.start_date ? `
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">Start Date</h4>
                            <p class="text-gray-700">${formatDate(currentJob.start_date)}</p>
                        </div>
                    ` : ''}
                    ${currentJob.expected_completion ? `
                        <div>
                            <h4 class="font-semibold text-gray-900 mb-2">Expected Completion</h4>
                            <p class="text-gray-700">${formatDate(currentJob.expected_completion)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <!-- Bids Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900">
                    <i class="fas fa-envelope mr-2"></i>Bids Received (${jobBids.length})
                </h2>
            </div>
            
            <div id="bids-container">
                <!-- Bids will be rendered here -->
            </div>
        </div>
    `;
}

// Render job bids
function renderJobBids() {
    const container = document.getElementById('bids-container');
    if (!container) return;
    
    if (jobBids.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-inbox text-gray-400 text-3xl mb-4"></i>
                <p class="text-gray-500 mb-2">No bids received yet</p>
                <p class="text-sm text-gray-400">Check back later for bids from service providers</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-4">
            ${jobBids.map(bid => `
                <div class="border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-2">
                                <h4 class="font-semibold text-gray-900 mr-3">${bid.first_name} ${bid.last_name}</h4>
                                ${bid.avg_rating ? `
                                    <div class="flex items-center text-sm text-gray-600">
                                        <i class="fas fa-star text-yellow-400 mr-1"></i>
                                        ${parseFloat(bid.avg_rating).toFixed(1)} (${bid.review_count} reviews)
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-sm">
                                <div class="text-gray-600">
                                    <i class="fas fa-dollar-sign mr-1"></i>
                                    <strong>Bid:</strong> ${formatCurrency(bid.bid_amount)}
                                </div>
                                <div class="text-gray-600">
                                    <i class="fas fa-clock mr-1"></i>
                                    <strong>Timeline:</strong> ${bid.estimated_timeline || 'Not specified'}
                                </div>
                                <div class="text-gray-600">
                                    <i class="fas fa-calendar mr-1"></i>
                                    <strong>Submitted:</strong> ${formatDate(bid.submitted_at)}
                                </div>
                            </div>
                            
                            ${bid.cover_message ? `
                                <div class="mb-3">
                                    <h5 class="font-medium text-gray-900 mb-1">Cover Message</h5>
                                    <p class="text-gray-700 text-sm">${bid.cover_message}</p>
                                </div>
                            ` : ''}
                            
                            ${bid.bio ? `
                                <div class="mb-3">
                                    <h5 class="font-medium text-gray-900 mb-1">About the Provider</h5>
                                    <p class="text-gray-700 text-sm">${bid.bio}</p>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="ml-4 flex flex-col space-y-2">
                            ${currentJob.status === 'posted' && bid.status === 'pending' ? `
                                <button onclick="acceptBid(${bid.id})" 
                                        class="bg-kwikr-green text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                                    <i class="fas fa-check mr-1"></i>Accept
                                </button>
                                <button onclick="declineBid(${bid.id})" 
                                        class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                                    <i class="fas fa-times mr-1"></i>Decline
                                </button>
                            ` : `
                                <span class="px-2 py-1 rounded text-xs ${bid.status === 'accepted' ? 'bg-green-100 text-green-800' : bid.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                                    ${bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                </span>
                            `}
                            <button onclick="viewWorkerProfile(${bid.worker_id})" 
                                    class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                                <i class="fas fa-user mr-1"></i>View Profile
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Accept bid
async function acceptBid(bidId) {
    if (!confirm('Are you sure you want to accept this bid? This will assign the job to this worker.')) {
        return;
    }
    
    try {
        await window.apiRequest(`/client/bids/${bidId}/accept`, { method: 'POST' });
        showSuccess('Bid accepted successfully!');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error accepting bid:', error);
        showError('Failed to accept bid');
    }
}

// Decline bid
async function declineBid(bidId) {
    if (!confirm('Are you sure you want to decline this bid?')) {
        return;
    }
    
    try {
        await window.apiRequest(`/client/bids/${bidId}/decline`, { method: 'POST' });
        showSuccess('Bid declined');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error declining bid:', error);
        showError('Failed to decline bid');
    }
}

// Edit job - Navigate to edit page
function editJob(jobId) {
    window.location.href = `/dashboard/client/job/${jobId}/edit`;
}

// View worker profile - Navigate to worker profile page
function viewWorkerProfile(workerId) {
    window.location.href = `/dashboard/client/worker/${workerId}`;
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

function getStatusBadge(status) {
    const statusClasses = {
        'posted': 'bg-blue-100 text-blue-800',
        'assigned': 'bg-yellow-100 text-yellow-800',
        'in_progress': 'bg-purple-100 text-purple-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    
    const statusLabels = {
        'posted': 'Posted',
        'assigned': 'Assigned',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    
    const cssClass = statusClasses[status] || 'bg-gray-100 text-gray-800';
    const label = statusLabels[status] || status;
    
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${cssClass}">${label}</span>`;
}

function getUrgencyBadge(urgency) {
    const urgencyClasses = {
        'low': 'bg-gray-100 text-gray-800',
        'normal': 'bg-blue-100 text-blue-800',
        'high': 'bg-yellow-100 text-yellow-800',
        'urgent': 'bg-red-100 text-red-800'
    };
    
    const urgencyLabels = {
        'low': 'Low',
        'normal': 'Normal',
        'high': 'High',
        'urgent': 'Urgent'
    };
    
    const cssClass = urgencyClasses[urgency] || 'bg-blue-100 text-blue-800';
    const label = urgencyLabels[urgency] || urgency;
    
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${cssClass}">${label}</span>`;
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
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
document.addEventListener('DOMContentLoaded', loadJobDetailsPage);