// Client Edit Job Page
let currentJob = null;
let jobCategories = [];

// Initialize the edit job page
async function loadEditJobPage() {
    try {
        console.log('Loading edit job page...');
        
        await loadJobCategories();
        await loadJobForEdit();
        
        console.log('Edit job page loaded successfully');
    } catch (error) {
        console.error('Error loading edit job page:', error);
        showError('Failed to load edit job page');
    }
}

// Load job categories
async function loadJobCategories() {
    try {
        const response = await window.apiRequest('/client/job-categories');
        jobCategories = response.categories || [];
    } catch (error) {
        console.error('Error loading job categories:', error);
        // Use fallback categories
        jobCategories = [
            { id: 1, name: 'Cleaning Services' },
            { id: 2, name: 'Plumbers' },
            { id: 3, name: 'Carpenters' },
            { id: 4, name: 'Electricians' },
            { id: 5, name: 'Painters' }
        ];
    }
}

// Load job for editing
async function loadJobForEdit() {
    try {
        const response = await window.apiRequest(`/client/jobs/${window.currentJobId}`);
        currentJob = response.job;
        
        renderEditJobForm();
        populateJobData();
        
    } catch (error) {
        console.error('Error loading job for edit:', error);
        const container = document.getElementById('edit-job-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                    <p class="text-red-500">Failed to load job details</p>
                    <button onclick="loadJobForEdit()" class="mt-4 bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Render edit job form
function renderEditJobForm() {
    const container = document.getElementById('edit-job-container');
    if (!container) return;
    
    const categoryOptions = jobCategories.map(category => 
        `<option value="${category.id}">${category.name}</option>`
    ).join('');
    
    container.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <form id="edit-job-form" onsubmit="handleJobUpdate(event)">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                        <input type="text" id="jobTitle" name="title" required
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                        <select id="jobCategory" name="category_id" required
                                class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="">Select Category</option>
                            ${categoryOptions}
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                        <select id="jobUrgency" name="urgency"
                                class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Budget Min ($CAD) *</label>
                        <input type="number" id="budgetMin" name="budget_min" step="0.01" required
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Budget Max ($CAD) *</label>
                        <input type="number" id="budgetMax" name="budget_max" step="0.01" required
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Province *</label>
                        <select id="locationProvince" name="location_province" required
                                class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                            <option value="">Select Province</option>
                            <option value="AB">Alberta</option>
                            <option value="BC">British Columbia</option>
                            <option value="MB">Manitoba</option>
                            <option value="NB">New Brunswick</option>
                            <option value="NL">Newfoundland and Labrador</option>
                            <option value="NS">Nova Scotia</option>
                            <option value="ON">Ontario</option>
                            <option value="PE">Prince Edward Island</option>
                            <option value="QC">Quebec</option>
                            <option value="SK">Saskatchewan</option>
                            <option value="NT">Northwest Territories</option>
                            <option value="NU">Nunavut</option>
                            <option value="YT">Yukon</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">City *</label>
                        <input type="text" id="locationCity" name="location_city" required
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Address (Optional)</label>
                        <input type="text" id="locationAddress" name="location_address"
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input type="date" id="startDate" name="start_date"
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Expected Completion</label>
                        <input type="date" id="expectedCompletion" name="expected_completion"
                               class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green">
                    </div>
                </div>
                
                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea id="jobDescription" name="description" rows="4" required
                              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-kwikr-green"
                              placeholder="Describe the job in detail..."></textarea>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                    <button type="button" onclick="cancelEdit()" 
                            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        <i class="fas fa-times mr-2"></i>Cancel
                    </button>
                    <button type="submit" class="bg-kwikr-green text-white px-4 py-2 rounded-lg hover:bg-green-600">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Populate form with job data
function populateJobData() {
    if (!currentJob) return;
    
    document.getElementById('jobTitle').value = currentJob.title || '';
    document.getElementById('jobCategory').value = currentJob.category_id || '';
    document.getElementById('jobUrgency').value = currentJob.urgency || 'normal';
    document.getElementById('budgetMin').value = currentJob.budget_min || '';
    document.getElementById('budgetMax').value = currentJob.budget_max || '';
    document.getElementById('locationProvince').value = currentJob.location_province || '';
    document.getElementById('locationCity').value = currentJob.location_city || '';
    document.getElementById('locationAddress').value = currentJob.location_address || '';
    document.getElementById('jobDescription').value = currentJob.description || '';
    
    // Handle dates
    if (currentJob.start_date) {
        document.getElementById('startDate').value = currentJob.start_date.split('T')[0];
    }
    if (currentJob.expected_completion) {
        document.getElementById('expectedCompletion').value = currentJob.expected_completion.split('T')[0];
    }
}

// Handle job update
async function handleJobUpdate(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const jobData = Object.fromEntries(formData.entries());
        
        // Convert strings to appropriate types
        jobData.category_id = parseInt(jobData.category_id);
        jobData.budget_min = parseFloat(jobData.budget_min) || null;
        jobData.budget_max = parseFloat(jobData.budget_max) || null;
        
        // Validate required fields
        if (!jobData.title || !jobData.category_id || !jobData.description || 
            !jobData.location_province || !jobData.location_city) {
            showError('Please fill in all required fields');
            return;
        }
        
        await window.apiRequest(`/client/jobs/${window.currentJobId}`, {
            method: 'PUT',
            body: jobData
        });
        
        showSuccess('Job updated successfully!');
        
        // Redirect back to job details after a short delay
        setTimeout(() => {
            window.location.href = `/dashboard/client/job/${window.currentJobId}`;
        }, 1000);
        
    } catch (error) {
        console.error('Error updating job:', error);
        showError(error.message || 'Failed to update job');
    }
}

// Cancel edit
function cancelEdit() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.location.href = `/dashboard/client/job/${window.currentJobId}`;
    }
}

// Utility functions
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
document.addEventListener('DOMContentLoaded', loadEditJobPage);