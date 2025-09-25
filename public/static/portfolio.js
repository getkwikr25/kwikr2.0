/**
 * Kwikr Directory - Service Portfolio Management
 * Frontend JavaScript for portfolio creation, editing, and management
 */

class PortfolioManager {
    constructor() {
        this.currentPortfolioId = null;
        this.uploadedImages = [];
        this.pricingTiers = [];
        this.serviceAreas = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPortfolios();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Form submission
        const portfolioForm = document.getElementById('portfolioForm');
        if (portfolioForm) {
            portfolioForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePortfolio();
            });
        }

        // Image upload handling
        const imageInput = document.getElementById('portfolioImages');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files);
            });
        }

        // Modal close handlers
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('imageUploadZone');
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.handleImageUpload(files);
        });

        dropZone.addEventListener('click', () => {
            document.getElementById('portfolioImages').click();
        });
    }

    async loadPortfolios() {
        try {
            const response = await fetch('/api/worker/portfolios', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load portfolios');
            }

            const data = await response.json();
            this.renderPortfolios(data.portfolios);
            this.updateStatistics(data.portfolios);
        } catch (error) {
            console.error('Error loading portfolios:', error);
            this.showError('Failed to load portfolios');
        }
    }

    renderPortfolios(portfolios) {
        const grid = document.getElementById('portfolioGrid');
        if (!grid) return;

        if (portfolios.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-briefcase text-gray-300 text-6xl mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">No Portfolios Yet</h3>
                    <p class="text-gray-600 mb-6">Create your first service portfolio to showcase your work</p>
                    <button onclick="showCreatePortfolioModal()" 
                            class="bg-kwikr-green text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors">
                        <i class="fas fa-plus mr-2"></i>Create Portfolio
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = portfolios.map(portfolio => `
            <div class="portfolio-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <!-- Portfolio Image -->
                <div class="relative h-48 bg-gray-100 overflow-hidden">
                    ${portfolio.primary_image ? `
                        <img src="data:image/jpeg;base64,${portfolio.primary_image}" 
                             alt="${this.escapeHtml(portfolio.title)}"
                             class="w-full h-full object-cover">
                    ` : `
                        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-kwikr-green to-green-600">
                            <i class="fas fa-briefcase text-white text-4xl opacity-80"></i>
                        </div>
                    `}
                    
                    <!-- Status Badge -->
                    <div class="absolute top-3 left-3">
                        ${portfolio.is_featured ? `
                            <span class="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                <i class="fas fa-star mr-1"></i>Featured
                            </span>
                        ` : ''}
                        ${!portfolio.is_active ? `
                            <span class="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium ml-1">
                                <i class="fas fa-eye-slash mr-1"></i>Hidden
                            </span>
                        ` : ''}
                    </div>

                    <!-- Actions Menu -->
                    <div class="absolute top-3 right-3">
                        <div class="relative">
                            <button onclick="togglePortfolioMenu(${portfolio.id})" 
                                    class="bg-white bg-opacity-90 text-gray-600 p-2 rounded-full hover:bg-opacity-100 shadow-sm">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${portfolio.id}" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                                <button onclick="editPortfolio(${portfolio.id})" 
                                        class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                                    <i class="fas fa-edit mr-2"></i>Edit Portfolio
                                </button>
                                <button onclick="viewPortfolioStats(${portfolio.id})" 
                                        class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                                    <i class="fas fa-chart-bar mr-2"></i>View Analytics
                                </button>
                                <button onclick="managePortfolioImages(${portfolio.id})" 
                                        class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                                    <i class="fas fa-images mr-2"></i>Manage Images
                                </button>
                                <button onclick="togglePortfolioStatus(${portfolio.id}, ${!portfolio.is_active})" 
                                        class="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                                    <i class="fas fa-${portfolio.is_active ? 'eye-slash' : 'eye'} mr-2"></i>
                                    ${portfolio.is_active ? 'Hide' : 'Show'} Portfolio
                                </button>
                                <hr class="my-1">
                                <button onclick="deletePortfolio(${portfolio.id})" 
                                        class="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600">
                                    <i class="fas fa-trash mr-2"></i>Delete Portfolio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Portfolio Content -->
                <div class="p-6">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h3 class="text-xl font-semibold text-gray-900 mb-1">
                                ${this.escapeHtml(portfolio.title)}
                            </h3>
                            <p class="text-sm text-gray-600">
                                ${portfolio.category_name || portfolio.service_type}
                            </p>
                        </div>
                        <div class="text-right">
                            ${portfolio.base_price ? `
                                <p class="text-lg font-bold text-kwikr-green">
                                    $${parseFloat(portfolio.base_price).toFixed(2)}
                                </p>
                                <p class="text-xs text-gray-500">${portfolio.price_unit}</p>
                            ` : ''}
                        </div>
                    </div>

                    ${portfolio.description ? `
                        <p class="text-gray-700 text-sm mb-4 line-clamp-3">
                            ${this.escapeHtml(portfolio.description)}
                        </p>
                    ` : ''}

                    <!-- Portfolio Stats -->
                    <div class="flex justify-between items-center text-sm text-gray-600 border-t pt-4">
                        <div class="flex items-center space-x-4">
                            <span><i class="fas fa-images mr-1"></i>${portfolio.image_count} photos</span>
                            <span><i class="fas fa-star mr-1"></i>${parseFloat(portfolio.rating || 0).toFixed(1)}</span>
                            <span><i class="fas fa-comments mr-1"></i>${portfolio.testimonial_count} reviews</span>
                        </div>
                        <div>
                            <span><i class="fas fa-eye mr-1"></i>${portfolio.view_count} views</span>
                        </div>
                    </div>

                    <!-- Pricing Tiers Preview -->
                    ${portfolio.pricing_tier_count > 0 ? `
                        <div class="mt-4 pt-4 border-t">
                            <p class="text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-dollar-sign mr-1"></i>${portfolio.pricing_tier_count} pricing options available
                            </p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    updateStatistics(portfolios) {
        const totalPortfolios = portfolios.length;
        const totalViews = portfolios.reduce((sum, p) => sum + (p.view_count || 0), 0);
        const totalTestimonials = portfolios.reduce((sum, p) => sum + (p.testimonial_count || 0), 0);
        const avgRating = totalTestimonials > 0 ? 
            portfolios.reduce((sum, p) => sum + (p.rating || 0), 0) / portfolios.length : 0;

        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        updateElement('totalPortfolios', totalPortfolios);
        updateElement('totalViews', totalViews.toLocaleString());
        updateElement('totalTestimonials', totalTestimonials);
        updateElement('avgRating', avgRating.toFixed(1));
    }

    showCreatePortfolioModal() {
        this.currentPortfolioId = null;
        this.uploadedImages = [];
        this.pricingTiers = [];
        this.serviceAreas = [];

        // Reset form
        document.getElementById('portfolioForm').reset();
        document.getElementById('modalTitle').textContent = 'Create New Portfolio';
        document.getElementById('submitText').textContent = 'Create Portfolio';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('pricingTiers').innerHTML = '';
        document.getElementById('serviceAreasList').innerHTML = '';

        // Show modal
        document.getElementById('portfolioModal').classList.add('active');
    }

    closePortfolioModal() {
        document.getElementById('portfolioModal').classList.remove('active');
        this.currentPortfolioId = null;
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async handleImageUpload(files) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                this.showError('Please select only image files');
                continue;
            }

            if (file.size > 5 * 1024 * 1024) {
                this.showError(`File ${file.name} is too large. Max size is 5MB`);
                continue;
            }

            try {
                const base64 = await this.fileToBase64(file);
                const imageId = Date.now() + Math.random();
                
                this.uploadedImages.push({
                    id: imageId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64,
                    isPrimary: this.uploadedImages.length === 0
                });

                this.renderImagePreview();
            } catch (error) {
                console.error('Error processing image:', error);
                this.showError(`Failed to process ${file.name}`);
            }
        }
    }

    renderImagePreview() {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;

        preview.innerHTML = this.uploadedImages.map(image => `
            <div class="relative bg-gray-100 rounded-lg overflow-hidden">
                <img src="data:${image.type};base64,${image.data}" 
                     alt="${this.escapeHtml(image.name)}"
                     class="gallery-image w-full h-32 object-cover">
                
                <!-- Primary Badge -->
                ${image.isPrimary ? `
                    <div class="absolute top-2 left-2">
                        <span class="bg-kwikr-green text-white px-2 py-1 rounded text-xs font-medium">
                            Primary
                        </span>
                    </div>
                ` : `
                    <button onclick="portfolioManager.setPrimaryImage('${image.id}')"
                            class="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs hover:bg-opacity-75">
                        Set Primary
                    </button>
                `}

                <!-- Remove Button -->
                <button onclick="portfolioManager.removeImage('${image.id}')"
                        class="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                    <i class="fas fa-times text-xs"></i>
                </button>

                <!-- Image Info -->
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                    <p class="text-xs truncate">${this.escapeHtml(image.name)}</p>
                </div>
            </div>
        `).join('');
    }

    setPrimaryImage(imageId) {
        this.uploadedImages.forEach(img => {
            img.isPrimary = img.id == imageId;
        });
        this.renderImagePreview();
    }

    removeImage(imageId) {
        const index = this.uploadedImages.findIndex(img => img.id == imageId);
        if (index > -1) {
            const wasPrimary = this.uploadedImages[index].isPrimary;
            this.uploadedImages.splice(index, 1);
            
            // Set new primary if needed
            if (wasPrimary && this.uploadedImages.length > 0) {
                this.uploadedImages[0].isPrimary = true;
            }
            
            this.renderImagePreview();
        }
    }

    addPricingTier() {
        const tierId = Date.now() + Math.random();
        const container = document.getElementById('pricingTiers');
        
        const tierDiv = document.createElement('div');
        tierDiv.className = 'border border-gray-200 rounded-lg p-4';
        tierDiv.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h4 class="font-medium text-gray-900">Pricing Tier</h4>
                <button type="button" onclick="portfolioManager.removePricingTier('${tierId}')" 
                        class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tier Name</label>
                    <input type="text" class="tier-name w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green" 
                           placeholder="e.g., Basic, Standard, Premium">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <div class="flex">
                        <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">$</span>
                        <input type="number" class="tier-price w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green" 
                               min="0" step="0.01">
                    </div>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea class="tier-description w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green" 
                              rows="2" placeholder="What's included in this tier?"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
                    <input type="text" class="tier-duration w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-kwikr-green focus:border-kwikr-green" 
                           placeholder="e.g., 2-3 hours, 1-2 days">
                </div>
                <div class="flex items-center">
                    <input type="checkbox" class="tier-popular h-4 w-4 text-kwikr-green focus:ring-kwikr-green border-gray-300 rounded">
                    <label class="ml-2 block text-sm text-gray-700">Popular choice</label>
                </div>
            </div>
        `;
        
        tierDiv.dataset.tierId = tierId;
        container.appendChild(tierDiv);
    }

    removePricingTier(tierId) {
        const tierDiv = document.querySelector(`[data-tier-id="${tierId}"]`);
        if (tierDiv) {
            tierDiv.remove();
        }
    }

    addServiceArea() {
        const areaInput = document.querySelector('.service-area-input');
        const postalInput = document.querySelector('.postal-code-input');
        const areasList = document.getElementById('serviceAreasList');
        
        const areaName = areaInput.value.trim();
        const postalCode = postalInput.value.trim();
        
        if (!areaName) {
            this.showError('Please enter an area name');
            return;
        }

        const areaId = Date.now() + Math.random();
        const areaDiv = document.createElement('div');
        areaDiv.className = 'flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md';
        areaDiv.innerHTML = `
            <span class="text-sm text-gray-900">
                ${this.escapeHtml(areaName)} ${postalCode ? `(${postalCode})` : ''}
            </span>
            <button type="button" onclick="portfolioManager.removeServiceArea('${areaId}')" 
                    class="text-red-600 hover:text-red-800">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;
        
        areaDiv.dataset.areaId = areaId;
        areaDiv.dataset.areaName = areaName;
        areaDiv.dataset.postalCode = postalCode;
        areasList.appendChild(areaDiv);
        
        // Clear inputs
        areaInput.value = '';
        postalInput.value = '';
    }

    removeServiceArea(areaId) {
        const areaDiv = document.querySelector(`[data-area-id="${areaId}"]`);
        if (areaDiv) {
            areaDiv.remove();
        }
    }

    async savePortfolio() {
        try {
            const formData = this.collectFormData();
            
            if (!formData.title || !formData.service_type) {
                this.showError('Title and service type are required');
                return;
            }

            const url = this.currentPortfolioId 
                ? `/api/worker/portfolios/${this.currentPortfolioId}`
                : '/api/worker/portfolios';
            
            const method = this.currentPortfolioId ? 'PUT' : 'POST';

            // Create or update portfolio
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to save portfolio');
            }

            const data = await response.json();
            const portfolioId = this.currentPortfolioId || data.portfolio_id;

            // Upload images if any
            if (this.uploadedImages.length > 0) {
                await this.uploadPortfolioImages(portfolioId);
            }

            // Save pricing tiers
            await this.savePricingTiers(portfolioId);

            // Save service areas
            await this.saveServiceAreas(portfolioId);

            // Save tags
            if (formData.tags && formData.tags.length > 0) {
                await this.saveTags(portfolioId, formData.tags);
            }

            this.showSuccess(this.currentPortfolioId ? 'Portfolio updated successfully!' : 'Portfolio created successfully!');
            this.closePortfolioModal();
            this.loadPortfolios();

        } catch (error) {
            console.error('Error saving portfolio:', error);
            this.showError('Failed to save portfolio');
        }
    }

    collectFormData() {
        const form = document.getElementById('portfolioForm');
        const formData = new FormData(form);
        
        // Get tags
        const tagsInput = document.getElementById('portfolioTags').value;
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        return {
            title: document.getElementById('portfolioTitle').value,
            description: document.getElementById('portfolioDescription').value,
            category_name: document.getElementById('portfolioCategory').value,
            service_type: document.getElementById('portfolioServiceType').value,
            base_price: parseFloat(document.getElementById('portfolioPrice').value) || 0,
            price_unit: document.getElementById('portfolioPriceUnit').value,
            is_featured: document.getElementById('portfolioFeatured').checked,
            is_active: document.getElementById('portfolioActive').checked,
            tags: tags
        };
    }

    async uploadPortfolioImages(portfolioId) {
        const images = this.uploadedImages.map(img => ({
            name: img.name,
            type: img.type,
            size: img.size,
            data: img.data
        }));

        const response = await fetch(`/api/worker/portfolios/${portfolioId}/images`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
            },
            body: JSON.stringify({ images })
        });

        if (!response.ok) {
            throw new Error('Failed to upload images');
        }
    }

    async savePricingTiers(portfolioId) {
        const tierDivs = document.querySelectorAll('#pricingTiers > div');
        
        for (const tierDiv of tierDivs) {
            const tierData = {
                tier_name: tierDiv.querySelector('.tier-name').value,
                tier_description: tierDiv.querySelector('.tier-description').value,
                price: parseFloat(tierDiv.querySelector('.tier-price').value) || 0,
                price_unit: 'project',
                estimated_duration: tierDiv.querySelector('.tier-duration').value,
                is_popular: tierDiv.querySelector('.tier-popular').checked
            };

            if (tierData.tier_name && tierData.price > 0) {
                const response = await fetch(`/api/worker/portfolios/${portfolioId}/pricing`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                    },
                    body: JSON.stringify(tierData)
                });

                if (!response.ok) {
                    console.error('Failed to save pricing tier');
                }
            }
        }
    }

    async saveServiceAreas(portfolioId) {
        const areaDivs = document.querySelectorAll('#serviceAreasList > div');
        const areas = Array.from(areaDivs).map(div => ({
            area_name: div.dataset.areaName,
            postal_code: div.dataset.postalCode || null
        }));

        if (areas.length > 0) {
            const response = await fetch(`/api/worker/portfolios/${portfolioId}/service-areas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                },
                body: JSON.stringify({ areas })
            });

            if (!response.ok) {
                console.error('Failed to save service areas');
            }
        }
    }

    async saveTags(portfolioId, tags) {
        const response = await fetch(`/api/worker/portfolios/${portfolioId}/tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
            },
            body: JSON.stringify({ tags })
        });

        if (!response.ok) {
            console.error('Failed to save tags');
        }
    }

    // Utility Functions
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Global functions for UI interactions
window.portfolioManager = null;

function initializePortfolioManager() {
    window.portfolioManager = new PortfolioManager();
}

function showCreatePortfolioModal() {
    if (window.portfolioManager) {
        window.portfolioManager.showCreatePortfolioModal();
    }
}

function closePortfolioModal() {
    if (window.portfolioManager) {
        window.portfolioManager.closePortfolioModal();
    }
}

function loadPortfolios() {
    if (window.portfolioManager) {
        window.portfolioManager.loadPortfolios();
    }
}

function togglePortfolioMenu(portfolioId) {
    // Close all other menus
    document.querySelectorAll('[id^="menu-"]').forEach(menu => {
        if (menu.id !== `menu-${portfolioId}`) {
            menu.classList.add('hidden');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${portfolioId}`);
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function editPortfolio(portfolioId) {
    // Implementation for editing portfolio
    console.log('Edit portfolio:', portfolioId);
    // TODO: Load portfolio data and populate edit modal
}

function viewPortfolioStats(portfolioId) {
    // Implementation for viewing portfolio statistics
    console.log('View portfolio stats:', portfolioId);
    // TODO: Show analytics modal
}

function managePortfolioImages(portfolioId) {
    // Implementation for managing portfolio images
    console.log('Manage portfolio images:', portfolioId);
    // TODO: Show image management modal
}

async function togglePortfolioStatus(portfolioId, newStatus) {
    try {
        const response = await fetch(`/api/worker/portfolios/${portfolioId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
            },
            body: JSON.stringify({ is_active: newStatus })
        });

        if (!response.ok) {
            throw new Error('Failed to update portfolio status');
        }

        // Reload portfolios
        if (window.portfolioManager) {
            window.portfolioManager.loadPortfolios();
        }

        // Close menu
        document.getElementById(`menu-${portfolioId}`).classList.add('hidden');

    } catch (error) {
        console.error('Error updating portfolio status:', error);
        alert('Failed to update portfolio status');
    }
}

async function deletePortfolio(portfolioId) {
    if (!confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/worker/portfolios/${portfolioId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete portfolio');
        }

        // Reload portfolios
        if (window.portfolioManager) {
            window.portfolioManager.loadPortfolios();
        }

        alert('Portfolio deleted successfully');

    } catch (error) {
        console.error('Error deleting portfolio:', error);
        alert('Failed to delete portfolio');
    }
}

function addPricingTier() {
    if (window.portfolioManager) {
        window.portfolioManager.addPricingTier();
    }
}

function addServiceArea() {
    if (window.portfolioManager) {
        window.portfolioManager.addServiceArea();
    }
}

function showImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.classList.add('active');
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close menus when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('[id^="menu-"]') && !e.target.closest('button')) {
        document.querySelectorAll('[id^="menu-"]').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePortfolioManager);
} else {
    initializePortfolioManager();
}