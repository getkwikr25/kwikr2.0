// Client Profile Management Page
let userInfo = null;

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

// Initialize the profile page
async function loadClientProfilePage() {
    try {
        console.log('Loading client profile page...');
        
        // Get user info from embedded script or fetch from API
        if (window.userInfo) {
            userInfo = window.userInfo;
        } else {
            try {
                const data = await window.apiRequest('/client/profile');
                userInfo = data.profile;
            } catch (error) {
                console.error('Failed to load user profile:', error);
            }
        }
        
        renderProfileForm();
        loadCompanyProfile();
        
        console.log('Client profile page loaded successfully');
    } catch (error) {
        console.error('Error loading client profile page:', error);
        showError('Failed to load profile page');
    }
}

// Render the comprehensive client profile
function renderProfileForm() {
    const container = document.getElementById('profileContainer');
    if (!container) return;
    
    // Mock data for demo - in real app this would come from database
    const clientData = {
        firstName: userInfo?.firstName || 'John',
        lastName: userInfo?.lastName || 'Smith', 
        email: userInfo?.email || 'john.smith@email.com',
        phone: '(416) 555-0123',
        city: userInfo?.city || 'Toronto',
        province: userInfo?.province || 'ON',
        memberSince: '2023-03-15',
        accountType: 'Premium Client',
        isVerified: true,
        totalJobsPosted: 12,
        completedProjects: 8,
        totalSpent: 18500,
        averageRating: 4.8,
        street: '123 Main Street',
        postalCode: 'M5V 2T6',
        apartmentUnit: 'Apt 502',
        preferredServices: ['Cleaning Services', 'Plumbing', 'Electrical Work'],
        communicationPref: 'email',
        notifications: {
            emailUpdates: true,
            smsNotifications: false,
            marketingEmails: true
        }
    };
    
    container.innerHTML = `
        <!-- Client Profile Header -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="bg-gradient-to-r from-kwikr-green to-green-600 rounded-t-lg p-6 text-white">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                            <i class="fas fa-user text-3xl"></i>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold">${clientData.firstName} ${clientData.lastName}</h1>
                            <p class="text-green-100">${clientData.accountType}</p>
                            <div class="flex items-center mt-1">
                                <i class="fas fa-calendar-alt mr-2"></i>
                                <span class="text-sm">Member since ${new Date(clientData.memberSince).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' })}</span>
                                ${clientData.isVerified ? '<i class="fas fa-check-circle ml-3 text-green-200" title="Verified Account"></i>' : ''}
                            </div>
                        </div>
                    </div>
                    <button id="editProfileBtn" onclick="toggleEditMode()" class="bg-white text-kwikr-green px-4 py-2 rounded-lg hover:bg-gray-50 font-medium">
                        <i class="fas fa-edit mr-2"></i><span id="editBtnText">Edit Profile</span>
                    </button>
                </div>
            </div>
            
            <!-- Client Statistics -->
            <div class="p-6 border-b border-gray-200">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-kwikr-green">${clientData.totalJobsPosted}</div>
                        <div class="text-sm text-gray-600">Jobs Posted</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">${clientData.completedProjects}</div>
                        <div class="text-sm text-gray-600">Completed Projects</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">$${clientData.totalSpent.toLocaleString()}</div>
                        <div class="text-sm text-gray-600">Total Spent</div>
                    </div>
                    <div class="text-center">
                        <div class="flex justify-center items-center mb-1">
                            <div class="text-2xl font-bold text-yellow-500">${clientData.averageRating}</div>
                            <div class="flex ml-2">
                                ${Array.from({length: 5}, (_, i) => 
                                    `<i class="fas fa-star text-yellow-400 ${i < Math.floor(clientData.averageRating) ? '' : 'text-gray-300'}"></i>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="text-sm text-gray-600">Client Rating</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Personal Information -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">
                    <i class="fas fa-user mr-2"></i>Personal Information
                </h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- View Mode -->
                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <div class="text-gray-900">${clientData.firstName}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        <input type="text" id="firstName" value="${clientData.firstName}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <div class="text-gray-900">${clientData.lastName}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input type="text" id="lastName" value="${clientData.lastName}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div class="text-gray-900">${clientData.email}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        <input type="email" id="email" value="${clientData.email}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div class="text-gray-900">${formatPhoneNumber(clientData.phone)}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        <input type="tel" id="phone" value="${clientData.phone}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>
                </div>

                <!-- Edit Mode Action Buttons -->
                <div class="edit-mode hidden mt-6">
                    <div class="flex space-x-3">
                        <button onclick="saveProfile()" class="bg-kwikr-green text-white px-4 py-2 rounded-md hover:bg-green-600">
                            <i class="fas fa-save mr-2"></i>Save Changes
                        </button>
                        <button onclick="cancelEdit()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
                            <i class="fas fa-times mr-2"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Address Information -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">
                    <i class="fas fa-map-marker-alt mr-2"></i>Address Information
                </h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <div class="text-gray-900">${clientData.street}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                        <input type="text" id="street" value="${clientData.street}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Apartment/Unit</label>
                        <div class="text-gray-900">${clientData.apartmentUnit || 'Not specified'}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Apartment/Unit (Optional)</label>
                        <input type="text" id="apartmentUnit" value="${clientData.apartmentUnit || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <div class="text-gray-900">${clientData.city}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input type="text" id="city" value="${clientData.city}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Province</label>
                        <div class="text-gray-900">${clientData.province}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Province</label>
                        <select id="province" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                            <option value="ON" ${clientData.province === 'ON' ? 'selected' : ''}>Ontario</option>
                            <option value="BC" ${clientData.province === 'BC' ? 'selected' : ''}>British Columbia</option>
                            <option value="AB" ${clientData.province === 'AB' ? 'selected' : ''}>Alberta</option>
                            <option value="QC" ${clientData.province === 'QC' ? 'selected' : ''}>Quebec</option>
                            <option value="MB" ${clientData.province === 'MB' ? 'selected' : ''}>Manitoba</option>
                            <option value="SK" ${clientData.province === 'SK' ? 'selected' : ''}>Saskatchewan</option>
                            <option value="NS" ${clientData.province === 'NS' ? 'selected' : ''}>Nova Scotia</option>
                            <option value="NB" ${clientData.province === 'NB' ? 'selected' : ''}>New Brunswick</option>
                            <option value="NL" ${clientData.province === 'NL' ? 'selected' : ''}>Newfoundland and Labrador</option>
                            <option value="PE" ${clientData.province === 'PE' ? 'selected' : ''}>Prince Edward Island</option>
                            <option value="NT" ${clientData.province === 'NT' ? 'selected' : ''}>Northwest Territories</option>
                            <option value="YT" ${clientData.province === 'YT' ? 'selected' : ''}>Yukon</option>
                            <option value="NU" ${clientData.province === 'NU' ? 'selected' : ''}>Nunavut</option>
                        </select>
                    </div>

                    <div class="view-mode">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <div class="text-gray-900">${clientData.postalCode}</div>
                    </div>
                    <div class="edit-mode hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                        <input type="text" id="postalCode" value="${clientData.postalCode}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green" placeholder="A1B 2C3">
                    </div>
                </div>
            </div>
        </div>

        <!-- Preferences -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">
                    <i class="fas fa-cog mr-2"></i>Preferences & Settings
                </h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-3">Preferred Service Types</label>
                        <div class="view-mode">
                            <div class="flex flex-wrap gap-2">
                                ${clientData.preferredServices.map(service => 
                                    `<span class="bg-kwikr-green text-white px-3 py-1 rounded-full text-sm">${service}</span>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="edit-mode hidden">
                            <div class="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                                ${['Cleaning Services', 'Plumbing', 'Handyman Services', 'Electrical Work', 'Carpentry', 'Painting', 'HVAC Services', 'Roofing', 'Flooring', 'Landscaping', 'Moving Services', 'Appliance Repair'].map(service => 
                                    `<label class="flex items-center">
                                        <input type="checkbox" name="preferredServices" value="${service}" ${clientData.preferredServices.includes(service) ? 'checked' : ''} class="mr-2">
                                        <span class="text-sm">${service}</span>
                                    </label>`
                                ).join('')}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-3">Communication Preference</label>
                        <div class="view-mode">
                            <div class="text-gray-900 capitalize">${clientData.communicationPref === 'email' ? 'Email' : clientData.communicationPref === 'sms' ? 'SMS/Text' : 'Phone Call'}</div>
                        </div>
                        <div class="edit-mode hidden">
                            <select id="communicationPref" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green">
                                <option value="email" ${clientData.communicationPref === 'email' ? 'selected' : ''}>Email</option>
                                <option value="sms" ${clientData.communicationPref === 'sms' ? 'selected' : ''}>SMS/Text</option>
                                <option value="phone" ${clientData.communicationPref === 'phone' ? 'selected' : ''}>Phone Call</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Notification Settings -->
                <div class="mt-6 pt-6 border-t border-gray-200">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                    <div class="space-y-3">
                        <label class="flex items-center">
                            <input type="checkbox" id="emailUpdates" ${clientData.notifications.emailUpdates ? 'checked' : ''} class="mr-3" ${isEditMode ? '' : 'disabled'}>
                            <span class="text-sm">Receive job updates and messages via email</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="smsNotifications" ${clientData.notifications.smsNotifications ? 'checked' : ''} class="mr-3" ${isEditMode ? '' : 'disabled'}>
                            <span class="text-sm">Receive urgent notifications via SMS</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" id="marketingEmails" ${clientData.notifications.marketingEmails ? 'checked' : ''} class="mr-3" ${isEditMode ? '' : 'disabled'}>
                            <span class="text-sm">Receive promotional emails and service recommendations</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Account Information -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
            <div class="p-6 border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-900">
                    <i class="fas fa-shield-alt mr-2"></i>Account Information
                </h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                        <div class="flex items-center">
                            <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Active & Verified</span>
                            <i class="fas fa-check-circle text-green-600 ml-2"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                        <div class="text-gray-900">${clientData.accountType}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                        <div class="text-gray-900">${new Date(clientData.memberSince).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
                        <div class="text-gray-900 font-mono text-sm">CL-${String(userInfo?.id || '12345').padStart(6, '0')}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Track edit mode state
let isEditMode = false;

// Toggle edit mode for profile
function toggleEditMode() {
    isEditMode = !isEditMode;
    const viewElements = document.querySelectorAll('.view-mode');
    const editElements = document.querySelectorAll('.edit-mode');
    const editBtn = document.getElementById('editProfileBtn');
    const editBtnText = document.getElementById('editBtnText');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    if (isEditMode) {
        // Switch to edit mode
        viewElements.forEach(el => el.classList.add('hidden'));
        editElements.forEach(el => el.classList.remove('hidden'));
        editBtn.classList.remove('bg-white', 'text-kwikr-green', 'hover:bg-gray-50');
        editBtn.classList.add('bg-red-500', 'text-white', 'hover:bg-red-600');
        editBtnText.textContent = 'Cancel Edit';
        
        // Enable checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.disabled = false;
        });
    } else {
        // Switch to view mode
        viewElements.forEach(el => el.classList.remove('hidden'));
        editElements.forEach(el => el.classList.add('hidden'));
        editBtn.classList.remove('bg-red-500', 'text-white', 'hover:bg-red-600');
        editBtn.classList.add('bg-white', 'text-kwikr-green', 'hover:bg-gray-50');
        editBtnText.textContent = 'Edit Profile';
        
        // Disable checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.disabled = true;
        });
    }
}

function saveProfile() {
    // Collect form data from all edit fields
    const editInputs = document.querySelectorAll('.edit-mode input, .edit-mode select, .edit-mode textarea');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const formData = {};
    
    editInputs.forEach(input => {
        if (input.name || input.id) {
            formData[input.name || input.id] = input.value;
        }
    });

    // Collect checkbox data
    const preferredServices = [];
    document.querySelectorAll('input[name="preferredServices"]:checked').forEach(checkbox => {
        preferredServices.push(checkbox.value);
    });
    formData.preferredServices = preferredServices;

    const notifications = {};
    checkboxes.forEach(checkbox => {
        if (checkbox.id && checkbox.id !== 'preferredServices') {
            notifications[checkbox.id] = checkbox.checked;
        }
    });
    formData.notifications = notifications;

    // Here you would typically send the data to the server
    console.log('Saving client profile data:', formData);
    
    // For demo purposes, just show success and exit edit mode
    alert('Profile updated successfully!');
    toggleEditMode();
}

function cancelEdit() {
    // Reset all edit fields to original values and exit edit mode
    const editInputs = document.querySelectorAll('.edit-mode input, .edit-mode select, .edit-mode textarea');
    
    // Reset to original values (you'd typically store these when entering edit mode)
    editInputs.forEach(input => {
        if (input.dataset.originalValue) {
            input.value = input.dataset.originalValue;
        }
    });

    toggleEditMode();
    } else {
        editActions.classList.remove('hidden');
        editButton.innerHTML = '<i class="fas fa-times mr-2"></i>Cancel Edit';
    }
}

// Cancel edit mode
function cancelEdit() {
    toggleEditMode();
    // Reset form values
    renderProfileForm();
}

// Save profile changes
async function saveProfile(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const profileData = Object.fromEntries(formData.entries());
        
        const response = await window.apiRequest('/client/profile', {
            method: 'PUT',
            body: profileData
        });
        
        userInfo = response;
        showSuccess('Profile updated successfully');
        toggleEditMode();
    } catch (error) {
        console.error('Error saving profile:', error);
        showError('Failed to save profile changes');
    }
}

// Load company profile information
async function loadCompanyProfile() {
    try {
        const response = await window.apiRequest('/client/company');
        
        const companyContainer = document.getElementById('company-info');
        
        const company = response;
        if (!company || !company.name) {
            companyContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-building text-gray-400 text-3xl mb-4"></i>
                    <p class="text-gray-500 mb-4">No company information found</p>
                    <button onclick="addCompanyInfo()" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Company Information
                    </button>
                </div>
            `;
        } else {
            companyContainer.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                        <p class="text-gray-900">${company.name || 'Not specified'}</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                        <p class="text-gray-900">${company.industry || 'Not specified'}</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
                        <p class="text-gray-900">${company.size || 'Not specified'}</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Website</label>
                        <p class="text-gray-900">
                            ${company.website ? 
                                `<a href="${company.website}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                    ${company.website}
                                    <i class="fas fa-external-link-alt ml-1 text-xs"></i>
                                </a>` : 
                                'Not specified'
                            }
                        </p>
                    </div>
                </div>
                
                <div class="mt-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <p class="text-gray-900">${company.description || 'No description provided'}</p>
                </div>
                
                <div class="mt-6">
                    <button onclick="editCompanyInfo()" class="btn btn-secondary">
                        <i class="fas fa-edit mr-2"></i>Edit Company Information
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading company profile:', error);
        const companyContainer = document.getElementById('company-info');
        if (companyContainer) {
            companyContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                    <p class="text-red-500">Failed to load company information</p>
                </div>
            `;
        }
    }
}

// Edit company information
function editCompanyInfo() {
    // This would open a company editing form
    // For now, show a placeholder
    showInfo('Company editing functionality coming soon');
}

// Add company information
function addCompanyInfo() {
    // This would open a company creation form
    // For now, show a placeholder
    showInfo('Company creation functionality coming soon');
}

// Utility functions
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

// Phone number formatting with privacy protection - mask last 4 digits
function formatPhoneNumber(phone) {
    if (!phone) return 'Not provided';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        // Format: (416) 555-**** - mask last 4 digits for privacy
        return `(${cleaned.substring(0,3)}) ${cleaned.substring(3,6)}-****`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
        // Format: +1 (416) 555-**** - mask last 4 digits for privacy
        return `+1 (${cleaned.substring(1,4)}) ${cleaned.substring(4,7)}-****`;
    }
    // For any other format, try to mask last 4 characters
    return phone.length > 4 ? phone.substring(0, phone.length - 4) + '****' : phone;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadClientProfilePage);