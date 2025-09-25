// Client Worker Browser Page
let userInfo = null;
let workers = [];
let filteredWorkers = [];
let currentFilters = {};
let currentPage = 1;
let pageSize = 12;

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

// Initialize the worker browser page
async function loadWorkerBrowserPage() {
    try {
        console.log('Loading worker browser page...');
        
        // Get user info from embedded script
        if (window.userInfo) {
            userInfo = window.userInfo;
        }
        
        renderWorkerBrowserInterface();
        await loadWorkers();
        applyFilters();
        
        console.log('Worker browser page loaded successfully');
    } catch (error) {
        console.error('Error loading worker browser page:', error);
        showError('Failed to load worker browser page');
    }
}

// Render the worker browser interface
function renderWorkerBrowserInterface() {
    const filtersContainer = document.getElementById('searchFilters');
    const resultsContainer = document.getElementById('searchResults');
    
    if (!filtersContainer || !resultsContainer) {
        console.error('Required containers not found');
        return;
    }
    
    // Populate search filters
    filtersContainer.innerHTML = `
        <div class="space-y-4">
            <!-- Search Bar -->
            <div class="flex flex-col md:flex-row gap-4">
                <div class="flex-1">
                    <input type="text" id="search-input" placeholder="Search by skills, name, or location..."
                           class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                           onkeyup="handleSearch()" />
                </div>
                <button onclick="performSearch()" class="bg-kwikr-green text-white px-6 py-2 rounded-md hover:bg-green-600">
                    <i class="fas fa-search mr-2"></i>Search
                </button>
            </div>
            
            <!-- Advanced Filters -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select id="category-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="">All Categories</option>
                        <option value="Cleaning Services">Cleaning Services</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Handyman Services">Handyman Services</option>
                        <option value="Electrical Work">Electrical Work</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="Painting">Painting</option>
                        <option value="HVAC Services">HVAC Services</option>
                        <option value="Roofing">Roofing</option>
                        <option value="Flooring">Flooring</option>
                        <option value="Landscaping">Landscaping</option>
                        <option value="Moving Services">Moving Services</option>
                        <option value="Appliance Repair">Appliance Repair</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                            <select id="experience-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Any Level</option>
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Expert">Expert</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Hourly Rate</label>
                            <select id="rate-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Any Rate</option>
                                <option value="0-40">Under $40/hour</option>
                                <option value="40-60">$40 - $60/hour</option>
                                <option value="60-80">$60 - $80/hour</option>
                                <option value="80-120">$80 - $120/hour</option>
                                <option value="120+">$120+/hour</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <select id="location-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">All Locations</option>
                                <option value="Toronto, ON">Toronto, ON</option>
                                <option value="Vancouver, BC">Vancouver, BC</option>
                                <option value="Montreal, QC">Montreal, QC</option>
                                <option value="Calgary, AB">Calgary, AB</option>
                                <option value="Edmonton, AB">Edmonton, AB</option>
                                <option value="Ottawa, ON">Ottawa, ON</option>
                                <option value="Winnipeg, MB">Winnipeg, MB</option>
                                <option value="Quebec City, QC">Quebec City, QC</option>
                                <option value="Hamilton, ON">Hamilton, ON</option>
                                <option value="Kitchener, ON">Kitchener, ON</option>
                                <option value="London, ON">London, ON</option>
                                <option value="Victoria, BC">Victoria, BC</option>
                                <option value="Halifax, NS">Halifax, NS</option>
                                <option value="Oshawa, ON">Oshawa, ON</option>
                                <option value="Windsor, ON">Windsor, ON</option>
                                <option value="Saskatoon, SK">Saskatoon, SK</option>
                                <option value="Regina, SK">Regina, SK</option>
                                <option value="Barrie, ON">Barrie, ON</option>
                                <option value="St. John's, NL">St. John's, NL</option>
                                <option value="Kelowna, BC">Kelowna, BC</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                            <select id="availability-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Any Availability</option>
                                <option value="available">Available Now</option>
                                <option value="part-time">Part Time</option>
                                <option value="full-time">Full Time</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
                            <select id="rating-filter" onchange="applyFilters()" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option value="">Any Rating</option>
                                <option value="4">4+ Stars</option>
                                <option value="4.5">4.5+ Stars</option>
                                <option value="4.8">4.8+ Stars</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Summary -->
            <div id="results-summary" class="flex items-center justify-between mb-4">
                <div class="text-sm text-gray-600">
                    <span id="results-count">Loading...</span>
                </div>
                <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-600">Sort by:</label>
                    <select id="sort-filter" onchange="applySorting()" class="px-3 py-1 border border-gray-300 rounded-md text-sm">
                        <option value="rating">Highest Rated</option>
                        <option value="recent">Most Recent</option>
                        <option value="rate-low">Lowest Rate</option>
                        <option value="rate-high">Highest Rate</option>
                        <option value="name">Name A-Z</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input type="text" id="location-filter" placeholder="City, Province" onkeyup="applyFilters()"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
        </div>
    `;
    
    // Setup results container
    resultsContainer.innerHTML = `
        <div id="results-summary" class="flex items-center justify-between mb-4">
            <div class="text-sm text-gray-600">
                <span id="results-count">No workers loaded yet</span>
            </div>
        </div>
        <div id="workers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Workers will be populated here -->
        </div>
        <div id="pagination-container" class="mt-6">
            <!-- Pagination will be populated here -->
        </div>
    `;
}

// Load workers from API
async function loadWorkers() {
    try {
        const response = await window.apiRequest('/client/workers/search');
        
        workers = response.workers || response;
        filteredWorkers = [...workers];
        if (!workers || workers.length === undefined) {
            // Generate sample workers for demonstration
            workers = generateSampleWorkers();
            filteredWorkers = [...workers];
        }
    } catch (error) {
        console.error('Error loading workers:', error);
        // Generate sample workers as fallback
        workers = generateSampleWorkers();
        filteredWorkers = [...workers];
    }
}

// Generate sample workers for demonstration
function generateSampleWorkers() {
    return [
        {
            id: 1,
            name: "Sarah Johnson",
            title: "Professional House Cleaner",
            category: "Cleaning Services",
            experience_level: "Expert",
            hourly_rate: 45,
            location: "Toronto, ON",
            avatar: null,
            rating: 4.9,
            reviews_count: 127,
            completed_jobs: 89,
            skills: ["Deep Cleaning", "Move-in/out Cleaning", "Commercial Cleaning", "Eco-friendly Products", "Post-construction Cleanup"],
            bio: "Professional cleaning service with 8+ years experience. Specializing in residential and commercial cleaning with eco-friendly products.",
            availability: "available",
            response_time: "Within 2 hours"
        },
        {
            id: 2,
            name: "David Chen",
            title: "Licensed Plumber",
            category: "Plumbing",
            experience_level: "Expert",
            hourly_rate: 85,
            location: "Vancouver, BC",
            avatar: null,
            rating: 4.8,
            reviews_count: 94,
            completed_jobs: 156,
            skills: ["Pipe Repair", "Drain Cleaning", "Water Heater Installation", "Bathroom Renovations", "Emergency Repairs"],
            bio: "Licensed plumber with 12+ years experience. Available for residential and commercial plumbing repairs and installations.",
            availability: "available",
            response_time: "Within 1 hour"
        },
        {
            id: 3,
            name: "Maria Rodriguez",
            title: "Handyman Services",
            category: "Handyman Services",
            experience_level: "Intermediate",
            hourly_rate: 55,
            location: "Calgary, AB",
            avatar: null,
            rating: 4.7,
            reviews_count: 73,
            completed_jobs: 52,
            skills: ["General Repairs", "Furniture Assembly", "Drywall Repair", "Light Fixtures", "Door Installation"],
            bio: "Reliable handyman providing general repair and maintenance services for homes and offices throughout Calgary.",
            availability: "full-time",
            response_time: "Within 3 hours"
        },
        {
            id: 4,
            name: "Alex Kumar",
            title: "Licensed Electrician",
            category: "Electrical Work",
            experience_level: "Expert",
            hourly_rate: 95,
            location: "Ottawa, ON",
            avatar: null,
            rating: 4.9,
            reviews_count: 145,
            completed_jobs: 97,
            skills: ["Wiring Installation", "Panel Upgrades", "Outlet Installation", "Light Fixtures", "Electrical Troubleshooting"],
            bio: "Licensed electrician specializing in residential and commercial electrical work. Available for emergency calls.",
            availability: "available",
            response_time: "Within 2 hours"
        },
        {
            id: 5,
            name: "Emily Watson",
            title: "Carpenter & Woodworker",
            category: "Carpentry",
            experience_level: "Expert",
            hourly_rate: 75,
            location: "Montreal, QC",
            avatar: null,
            rating: 4.8,
            reviews_count: 68,
            completed_jobs: 134,
            skills: ["Custom Furniture", "Deck Building", "Kitchen Cabinets", "Trim Work", "Wooden Floors"],
            bio: "Skilled carpenter with expertise in custom woodwork, furniture making, and home renovations.",
            availability: "part-time",
            response_time: "Within 4 hours"
        },
        {
            id: 6,
            name: "Michael Thompson",
            title: "Professional Painter",
            category: "Painting",
            experience_level: "Intermediate",
            hourly_rate: 50,
            location: "Edmonton, AB",
            avatar: null,
            rating: 4.6,
            reviews_count: 91,
            completed_jobs: 76,
            skills: ["Interior Painting", "Exterior Painting", "Wallpaper Removal", "Deck Staining", "Pressure Washing"],
            bio: "Professional painter providing interior and exterior painting services for residential and commercial properties.",
            availability: "available",
            response_time: "Within 2 hours"
        }
    ];
}

// Handle search input
function handleSearch() {
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(performSearch, 300);
}

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    currentFilters.search = searchTerm;
    applyFilters();
}

// Toggle advanced filters visibility
function toggleFilters() {
    const filtersDiv = document.getElementById('advanced-filters');
    filtersDiv.classList.toggle('hidden');
}

// Clear all filters
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('experience-filter').value = '';
    document.getElementById('rate-filter').value = '';
    document.getElementById('location-filter').value = '';
    document.getElementById('availability-filter').value = '';
    document.getElementById('rating-filter').value = '';
    
    currentFilters = {};
    currentPage = 1;
    applyFilters();
}

// Apply all filters
function applyFilters() {
    // Collect filter values with null checks
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const experienceFilter = document.getElementById('experience-filter');
    const rateFilter = document.getElementById('rate-filter');
    const locationFilter = document.getElementById('location-filter');
    const availabilityFilter = document.getElementById('availability-filter');
    const ratingFilter = document.getElementById('rating-filter');
    
    currentFilters.search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    currentFilters.category = categoryFilter ? categoryFilter.value : '';
    currentFilters.experience = experienceFilter ? experienceFilter.value : '';
    currentFilters.rate = rateFilter ? rateFilter.value : '';
    currentFilters.location = locationFilter ? locationFilter.value.toLowerCase().trim() : '';
    currentFilters.availability = availabilityFilter ? availabilityFilter.value : '';
    currentFilters.rating = ratingFilter ? ratingFilter.value : '';
    
    // Filter workers
    filteredWorkers = workers.filter(worker => {
        // Search filter
        if (currentFilters.search) {
            const searchMatch = 
                worker.name.toLowerCase().includes(currentFilters.search) ||
                worker.title.toLowerCase().includes(currentFilters.search) ||
                (worker.skills || []).some(skill => skill.toLowerCase().includes(currentFilters.search)) ||
                worker.location.toLowerCase().includes(currentFilters.search);
            if (!searchMatch) return false;
        }
        
        // Category filter
        if (currentFilters.category && worker.category !== currentFilters.category) {
            return false;
        }
        
        // Experience filter
        if (currentFilters.experience && worker.experience_level !== currentFilters.experience) {
            return false;
        }
        
        // Rate filter
        if (currentFilters.rate) {
            const [min, max] = currentFilters.rate.split('-').map(r => r.replace('+', ''));
            const minRate = parseInt(min);
            const maxRate = max ? parseInt(max) : Infinity;
            
            if (worker.hourly_rate < minRate || worker.hourly_rate > maxRate) {
                return false;
            }
        }
        
        // Location filter
        if (currentFilters.location && !worker.location.toLowerCase().includes(currentFilters.location)) {
            return false;
        }
        
        // Availability filter
        if (currentFilters.availability && worker.availability !== currentFilters.availability) {
            return false;
        }
        
        // Rating filter
        if (currentFilters.rating && worker.rating < parseFloat(currentFilters.rating)) {
            return false;
        }
        
        return true;
    });
    
    applySorting();
    renderWorkers();
    updateResultsCount();
}

// Apply sorting
function applySorting() {
    const sortFilter = document.getElementById('sort-filter');
    const sortBy = sortFilter ? sortFilter.value : 'rating';
    
    filteredWorkers.sort((a, b) => {
        switch (sortBy) {
            case 'rating':
                return b.rating - a.rating;
            case 'recent':
                return new Date(b.created_at || '2024-01-01') - new Date(a.created_at || '2024-01-01');
            case 'rate-low':
                return a.hourly_rate - b.hourly_rate;
            case 'rate-high':
                return b.hourly_rate - a.hourly_rate;
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    renderWorkers();
}

// Render workers grid
function renderWorkers() {
    const grid = document.getElementById('workers-grid');
    if (!grid) {
        console.log('Workers grid not found - skipping render');
        return;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageWorkers = filteredWorkers.slice(startIndex, endIndex);
    
    if (pageWorkers.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No workers found</h3>
                <p class="text-gray-500 mb-4">Try adjusting your search criteria or filters</p>
                <button onclick="clearFilters()" class="btn btn-primary">Clear Filters</button>
            </div>
        `;
        renderPagination();
        return;
    }
    
    grid.innerHTML = pageWorkers.map(worker => `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    ${worker.avatar ? 
                        `<img src="${worker.avatar}" alt="${worker.name}" class="w-12 h-12 rounded-full object-cover">` :
                        `<i class="fas fa-user text-gray-400 text-xl"></i>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-900 truncate">${worker.name}</h3>
                    <p class="text-sm text-gray-600 mb-2">${worker.title}</p>
                    <div class="flex items-center text-sm text-gray-500 mb-2">
                        <i class="fas fa-star text-yellow-400 mr-1"></i>
                        <span class="font-medium">${worker.rating}</span>
                        <span class="mx-1">•</span>
                        <span>${worker.reviews_count} reviews</span>
                        <span class="mx-1">•</span>
                        <span>${worker.completed_jobs} jobs</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-500 mb-3">
                        <i class="fas fa-map-marker-alt mr-1"></i>
                        <span>${worker.location}</span>
                        <span class="mx-2">•</span>
                        <span class="font-semibold text-green-600">$${worker.hourly_rate}/hr</span>
                    </div>
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${(worker.skills || []).slice(0, 3).map(skill => 
                            `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${skill}</span>`
                        ).join('')}
                        ${(worker.skills || []).length > 3 ? 
                            `<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">+${(worker.skills || []).length - 3} more</span>` : 
                            ''
                        }
                    </div>
                    <p class="text-sm text-gray-600 line-clamp-2 mb-4">${worker.bio}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-xs text-gray-500">
                            <div class="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                            <span>${worker.response_time}</span>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="viewWorkerProfile(${worker.id})" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye mr-1"></i>View
                            </button>
                            <button onclick="contactWorker(${worker.id})" class="btn btn-sm btn-primary">
                                <i class="fas fa-envelope mr-1"></i>Contact
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    renderPagination();
}

// Update results count
function updateResultsCount() {
    const countElement = document.getElementById('results-count');
    if (!countElement) {
        console.log('Results count element not found');
        return;
    }
    
    const start = Math.min((currentPage - 1) * pageSize + 1, filteredWorkers.length);
    const end = Math.min(currentPage * pageSize, filteredWorkers.length);
    
    countElement.textContent = `Showing ${start}-${end} of ${filteredWorkers.length} workers`;
}

// Render pagination
function renderPagination() {
    const pagination = document.getElementById('pagination-container');
    if (!pagination) {
        console.log('Pagination container not found');
        return;
    }
    
    const totalPages = Math.ceil(filteredWorkers.length / pageSize);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <nav class="flex items-center space-x-2">
            <button onclick="changePage(${currentPage - 1})" 
                    class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left mr-1"></i>Previous
            </button>
    `;
    
    // Show page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" 
                    class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 ${i === currentPage ? 'bg-blue-600 text-white border-blue-600' : ''}">
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
            <button onclick="changePage(${currentPage + 1})" 
                    class="px-3 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                Next<i class="fas fa-chevron-right ml-1"></i>
            </button>
        </nav>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredWorkers.length / pageSize)) return;
    
    currentPage = page;
    renderWorkers();
    updateResultsCount();
    
    // Scroll to top of results
    document.getElementById('workers-grid').scrollIntoView({ behavior: 'smooth' });
}

// View worker profile
function viewWorkerProfile(workerId) {
    // Navigate to worker profile page
    window.location.href = `/dashboard/worker/profile/${workerId}`;
}

// Contact worker
function contactWorker(workerId) {
    // Navigate to messaging or contact form
    window.location.href = `/dashboard/messages/new?worker=${workerId}`;
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadWorkerBrowserPage);