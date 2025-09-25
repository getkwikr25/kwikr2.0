// Terms of Service and Privacy Policy Modal System

// Show Terms of Service Modal
function showTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Show Privacy Policy Modal
function showPrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Close Modal Function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside content area
function setupModalClickHandlers() {
    document.addEventListener('DOMContentLoaded', function() {
        // Terms Modal
        const termsModal = document.getElementById('termsModal');
        if (termsModal) {
            termsModal.addEventListener('click', function(e) {
                if (e.target === termsModal) {
                    closeModal('termsModal');
                }
            });
        }

        // Privacy Modal
        const privacyModal = document.getElementById('privacyModal');
        if (privacyModal) {
            privacyModal.addEventListener('click', function(e) {
                if (e.target === privacyModal) {
                    closeModal('privacyModal');
                }
            });
        }

        // ESC key handler
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal('termsModal');
                closeModal('privacyModal');
            }
        });
    });
}

// Initialize modal handlers
setupModalClickHandlers();