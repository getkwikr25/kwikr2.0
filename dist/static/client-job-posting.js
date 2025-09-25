// Client Job Posting Page
let userInfo = null;
let jobCategories = [];
let currentJob = null;

// Helper function to get session token
function getSessionToken() {
    // Try localStorage first, then cookies
    let token = null
    try {
        token = localStorage.getItem('sessionToken')
    } catch (e) {
        // localStorage access denied, try to get from cookies
        const cookies = document.cookie.split(';')
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === 'session') {
                token = value
                break
            }
        }
    }
    return token
}

// Initialize the job posting page
async function loadJobPostingPage() {
    try {
        console.log('Loading job posting page...');
        
        // Get user info from embedded script
        if (window.userInfo) {
            userInfo = window.userInfo;
        }
        
        await loadJobCategories();
        renderJobPostingForm();
        loadMyJobs();
        
        console.log('Job posting page loaded successfully');
    } catch (error) {
        console.error('Error loading job posting page:', error);
        showError('Failed to load job posting page');
    }
}

// Load job categories for the dropdown
async function loadJobCategories() {
    try {
        console.log('Loading job categories...');
        const response = await window.apiRequest('/client/job-categories');
        console.log('Categories response:', response);
        
        if (response && response.categories) {
            jobCategories = response.categories;
            console.log('Loaded categories:', jobCategories);
        } else {
            // Fallback categories if API fails
            console.log('Using fallback categories');
            jobCategories = [
                {id: 1, name: 'Cleaning', icon_class: 'fas fa-broom'},
                {id: 2, name: 'Plumbing', icon_class: 'fas fa-wrench'},
                {id: 3, name: 'Electrical', icon_class: 'fas fa-bolt'},
                {id: 4, name: 'Carpentry', icon_class: 'fas fa-hammer'},
                {id: 5, name: 'Painting', icon_class: 'fas fa-paint-roller'},
                {id: 9, name: 'Handyman', icon_class: 'fas fa-tools'},
                {id: 12, name: 'Other', icon_class: 'fas fa-question-circle'}
            ];
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        jobCategories = [{id: 12, name: 'Other', icon_class: 'fas fa-question-circle'}];
    }
}

// Render the job posting form
function renderJobPostingForm() {
    const container = document.getElementById('jobPostingContainer');
    if (!container) {
        console.error('Job posting container not found');
        return;
    }
    
    const categoryOptions = jobCategories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
    
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900">
                    <i class="fas fa-plus-circle mr-2"></i>Post a New Job
                </h2>
                <button onclick="clearForm()" class="btn btn-secondary">
                    <i class="fas fa-eraser mr-2"></i>Clear Form
                </button>
            </div>
            
            <form id="job-form" onsubmit="submitJob(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                        <input type="text" id="title" name="title" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="e.g., Full Stack Developer for E-commerce Site">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                        <select id="category" name="category" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Category</option>
                            ${categoryOptions}
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Budget Range (CAD) *</label>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Minimum Budget</label>
                                <input type="number" id="budgetMin" name="budgetMin" min="50" max="10000" step="10" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green"
                                       placeholder="150">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Maximum Budget</label>
                                <input type="number" id="budgetMax" name="budgetMax" min="50" max="10000" step="10" required
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green"
                                       placeholder="300">
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
                        <select id="urgency" name="urgency"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green">
                            <option value="normal">Normal - No rush</option>
                            <option value="high">High - Within a week</option>
                            <option value="urgent">Urgent - ASAP</option>
                            <option value="low">Low - Flexible timeline</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Location Details</label>
                        <input type="text" id="locationAddress" name="locationAddress"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kwikr-green"
                               placeholder="Specific address or area (optional)">
                        <p class="text-sm text-gray-500 mt-1">We'll use your profile city/province as the main location</p>
                    </div>
                </div>
                
                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
                    <textarea id="description" name="description" required rows="6"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Describe your project in detail. Include requirements, deliverables, and any specific preferences..."></textarea>
                </div>
                
                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Required Skills</label>
                    <input type="text" id="skills" name="skills"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           placeholder="e.g., Deep cleaning, Move-in/out cleaning, Commercial cleaning, Carpet cleaning (comma separated)">
                    <p class="text-sm text-gray-500 mt-1">Enter skills separated by commas</p>
                </div>
                
                <div class="mt-6 flex justify-end space-x-4">
                    <button type="button" onclick="saveDraft()" class="btn btn-secondary">
                        <i class="fas fa-save mr-2"></i>Save as Draft
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane mr-2"></i>Post Job
                    </button>
                </div>
            </form>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">
                <i class="fas fa-briefcase mr-2"></i>My Job Postings
            </h2>
            
            <div id="jobs-list">
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
                    <p class="text-gray-500">Loading job postings...</p>
                </div>
            </div>
        </div>
    `;
}

// Clear the form
function clearForm() {
    document.getElementById('job-form').reset();
    currentJob = null;
    updateFormTitle();
}

// Update form title based on whether editing or creating
function updateFormTitle() {
    const titleElement = document.querySelector('.bg-white h2');
    if (currentJob) {
        titleElement.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Job Posting';
    } else {
        titleElement.innerHTML = '<i class="fas fa-plus-circle mr-2"></i>Post a New Job';
    }
}

// Submit job (create or update)
async function submitJob(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const jobData = Object.fromEntries(formData.entries());
        
        // Validate required fields
        if (!jobData.title || !jobData.description || !jobData.category || !jobData.budgetMin || !jobData.budgetMax) {
            showError('Please fill in all required fields');
            return;
        }
        
        // Validate budget range
        const minBudget = parseFloat(jobData.budgetMin);
        const maxBudget = parseFloat(jobData.budgetMax);
        
        if (minBudget >= maxBudget) {
            showError('Maximum budget must be higher than minimum budget');
            return;
        }
        
        if (minBudget < 50) {
            showError('Minimum budget must be at least $50 CAD');
            return;
        }
        
        // Prepare data for API - match the backend schema
        const apiData = {
            title: jobData.title,
            description: jobData.description,
            category_id: parseInt(jobData.category),
            budget_min: minBudget,
            budget_max: maxBudget,
            location_province: window.currentUser?.province || 'ON',
            location_city: window.currentUser?.city || jobData.locationAddress || 'Unknown',
            location_address: jobData.locationAddress || null,
            urgency: jobData.urgency || 'normal'
        };
        
        console.log('Submitting job data:', apiData);
        
        const url = currentJob ? `/client/jobs/${currentJob.id}` : '/client/jobs';
        const method = currentJob ? 'PUT' : 'POST';
        
        const response = await window.apiRequest(url, {
            method: method,
            body: apiData
        });
        
        console.log('Job submission response:', response);
        
        if (response.error) {
            showError(response.error);
            return;
        }
        
        showSuccess(currentJob ? 'Job updated successfully!' : 'Job posted successfully!');
        clearForm();
        loadMyJobs();
        
    } catch (error) {
        console.error('Error submitting job:', error);
        showError(error.message || 'Failed to save job posting');
    }
}

// Save as draft
async function saveDraft() {
    try {
        const formData = new FormData(document.getElementById('job-form'));
        const jobData = Object.fromEntries(formData.entries());
        jobData.status = 'draft';
        
        // Convert skills string to array
        if (jobData.skills) {
            jobData.skills = jobData.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
        }
        
        const response = await window.apiRequest('/client/jobs', {
            method: 'POST',
            body: jobData
        });
        
        showSuccess('Job saved as draft');
        clearForm();
        loadMyJobs();
    } catch (error) {
        console.error('Error saving draft:', error);
        showError('Failed to save draft');
    }
}

// Load client's job postings
async function loadMyJobs() {
    try {
        console.log('Loading client jobs...');
        const response = await window.apiRequest('/client/jobs');
        console.log('Jobs response:', response);
        
        const jobsContainer = document.getElementById('jobs-list');
        if (!jobsContainer) {
            console.log('Jobs list container not found - skipping job loading');
            return;
        }
        
        const jobs = response.jobs || [];
            
        if (!jobs || jobs.length === 0) {
                jobsContainer.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-briefcase text-gray-400 text-3xl mb-4"></i>
                        <p class="text-gray-500">No job postings yet</p>
                        <p class="text-sm text-gray-400">Create your first job posting above</p>
                    </div>
                `;
                return;
            }
            
            jobsContainer.innerHTML = `
                <div class="space-y-4">
                    ${jobs.map(job => `
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h3 class="font-semibold text-gray-900 mb-2">${job.title}</h3>
                                    <div class="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                        <span><i class="fas fa-tag mr-1"></i>${job.category_name || 'No category'}</span>
                                        <span><i class="fas fa-dollar-sign mr-1"></i>$${job.budget_min} - $${job.budget_max} CAD</span>
                                        <span><i class="fas fa-exclamation-circle mr-1"></i>${job.urgency || 'normal'} priority</span>
                                        <span class="px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}">
                                            ${job.status || 'active'}
                                        </span>
                                    </div>
                                    <p class="text-gray-700 text-sm line-clamp-2">${job.description}</p>
                                    <div class="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                        <span><i class="fas fa-map-marker-alt mr-1"></i>${job.location_city}, ${job.location_province}</span>
                                        <span><i class="fas fa-paper-plane mr-1"></i>${job.bid_count || 0} bids</span>
                                        <span><i class="fas fa-calendar mr-1"></i>Posted ${formatDate(job.created_at)}</span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2 ml-4">
                                    <button onclick="viewJob(${job.id})" class="btn btn-sm btn-secondary">
                                        <i class="fas fa-eye mr-1"></i>View
                                    </button>
                                    <button onclick="editJob(${job.id})" class="btn btn-sm btn-primary">
                                        <i class="fas fa-edit mr-1"></i>Edit
                                    </button>
                                    ${job.status === 'posted' ? `
                                        <button onclick="cancelJob(${job.id})" class="btn btn-sm btn-warning">
                                            <i class="fas fa-times mr-1"></i>Cancel
                                        </button>
                                    ` : job.status === 'assigned' || job.status === 'in_progress' ? `
                                        <button onclick="viewProgress(${job.id})" class="btn btn-sm btn-info">
                                            <i class="fas fa-tasks mr-1"></i>Progress
                                        </button>
                                    ` : `
                                        <span class="text-sm text-gray-500">${job.status}</span>
                                    `}
                                    <button onclick="deleteJob(${job.id})" class="btn btn-sm btn-danger">
                                        <i class="fas fa-trash mr-1"></i>Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        if (!jobs || jobs.length === undefined) {
            jobsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                    <p class="text-red-500">Failed to load job postings</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        document.getElementById('jobs-list').innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                <p class="text-red-500">Failed to load job postings</p>
            </div>
        `;
    }
}

// View job details
function viewJob(jobId) {
    // Navigate to job details page
    window.location.href = `/dashboard/client/job/${jobId}`;
}

// Edit job
async function editJob(jobId) {
    try {
        const response = await window.apiRequest(`/client/jobs/${jobId}`);
        
        const job = response.job || response;
        currentJob = job;
            
            // Populate form with job data
            document.getElementById('title').value = job.title || '';
            document.getElementById('category').value = job.category || '';
            document.getElementById('budget').value = job.budget || '';
            document.getElementById('timeline').value = job.timeline || '';
            document.getElementById('experience_level').value = job.experience_level || '';
            document.getElementById('description').value = job.description || '';
            document.getElementById('skills').value = Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || '');
            
        updateFormTitle();
        
        // Scroll to form
        document.getElementById('job-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading job for edit:', error);
        showError('Failed to load job details');
    }
}

// Cancel job
async function cancelJob(jobId) {
    if (!confirm('Are you sure you want to cancel this job posting? This will remove it from search results.')) return;
    
    try {
        const response = await window.apiRequest(`/jobs/${jobId}/cancel`, {
            method: 'POST'
        });
        
        showSuccess('Job cancelled successfully');
        loadMyJobs();
    } catch (error) {
        console.error('Error cancelling job:', error);
        showError('Failed to cancel job');
    }
}

// View job progress
function viewProgress(jobId) {
    window.location.href = `/dashboard/client/job/${jobId}/progress`;
}

// Delete job
async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) return;
    
    try {
        const response = await window.apiRequest(`/client/jobs/${jobId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Job deleted successfully');
        loadMyJobs();
    } catch (error) {
        console.error('Error deleting job:', error);
        showError('Failed to delete job');
    }
}

// Utility functions
function getStatusColor(status) {
    switch (status) {
        case 'posted':
            return 'bg-green-100 text-green-800';
        case 'assigned':
            return 'bg-blue-100 text-blue-800';
        case 'in_progress':
            return 'bg-purple-100 text-purple-800';
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'cancelled':
            return 'bg-red-100 text-red-800';
        case 'disputed':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
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
document.addEventListener('DOMContentLoaded', loadJobPostingPage);