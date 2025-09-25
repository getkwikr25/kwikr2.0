/**
 * Kwikr Directory - Worker Messages & Communication Interface
 * Frontend JavaScript for messaging system, progress updates, file sharing, and notifications
 */

class KwikrMessagesApp {
    constructor() {
        this.currentThreadId = null;
        this.currentJobId = null;
        this.pollingInterval = null;
        this.lastMessageId = null;
        
        // Initialize the app
        this.init();
    }

    async init() {
        try {
            await this.loadThreads();
            this.setupEventListeners();
            this.startPolling();
            
            // Load first thread if available
            const firstThread = document.querySelector('.thread-item');
            if (firstThread) {
                firstThread.click();
            }
        } catch (error) {
            console.error('Failed to initialize messages app:', error);
            this.showError('Failed to load messages. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Thread selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.thread-item')) {
                const threadItem = e.target.closest('.thread-item');
                this.selectThread(threadItem);
            }
        });

        // Send message form
        const sendMessageForm = document.getElementById('sendMessageForm');
        if (sendMessageForm) {
            sendMessageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        // Message input auto-resize
        const messageInput = document.getElementById('messageContent');
        if (messageInput) {
            messageInput.addEventListener('input', this.autoResize);
        }

        // Progress Update Modal
        const progressBtn = document.getElementById('openProgressModal');
        const progressModal = document.getElementById('progressUpdateModal');
        const closeProgressModal = document.getElementById('closeProgressModal');
        
        if (progressBtn) {
            progressBtn.addEventListener('click', () => {
                if (this.currentJobId) {
                    progressModal.classList.remove('hidden');
                }
            });
        }
        
        if (closeProgressModal) {
            closeProgressModal.addEventListener('click', () => {
                progressModal.classList.add('hidden');
            });
        }

        // Progress Update Form
        const progressForm = document.getElementById('progressUpdateForm');
        if (progressForm) {
            progressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendProgressUpdate();
            });
        }

        // File input handling
        const fileInput = document.getElementById('progressPhotos');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect);
        }

        // Quick replies
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quick-reply-btn')) {
                e.preventDefault();
                const template = e.target.textContent;
                const messageInput = document.getElementById('messageContent');
                if (messageInput) {
                    messageInput.value = template;
                    messageInput.focus();
                }
            }
        });

        // Mark notifications as read when clicked
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-item[data-notification-id]')) {
                const notificationItem = e.target.closest('.notification-item');
                const notificationId = notificationItem.dataset.notificationId;
                this.markNotificationAsRead(notificationId);
            }
        });
    }

    async loadThreads() {
        try {
            const response = await fetch('/api/worker/messages/threads?status=active', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load message threads');
            }

            const data = await response.json();
            this.renderThreads(data.threads);
        } catch (error) {
            console.error('Error loading threads:', error);
            this.showError('Failed to load conversations');
        }
    }

    renderThreads(threads) {
        const threadsList = document.getElementById('threadsList');
        if (!threadsList) return;

        if (threads.length === 0) {
            threadsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-3xl mb-2"></i>
                    <p>No active conversations</p>
                </div>
            `;
            return;
        }

        threadsList.innerHTML = threads.map(thread => `
            <div class="thread-item cursor-pointer p-4 border-b border-gray-200 hover:bg-gray-50 ${thread.worker_unread_count > 0 ? 'bg-blue-50 border-l-4 border-l-kwikr-green' : ''}"
                 data-thread-id="${thread.id}" 
                 data-job-id="${thread.job_id}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-900">${this.escapeHtml(thread.job_title)}</h4>
                    ${thread.worker_unread_count > 0 ? 
                        `<span class="bg-kwikr-green text-white text-xs px-2 py-1 rounded-full">${thread.worker_unread_count}</span>` : 
                        ''
                    }
                </div>
                <p class="text-sm text-gray-600 mb-1">
                    Client: ${this.escapeHtml(thread.client_first_name)} ${this.escapeHtml(thread.client_last_name)}
                </p>
                <p class="text-xs text-gray-500 truncate">
                    ${thread.last_message_content ? this.escapeHtml(thread.last_message_content) : 'No messages yet'}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                    ${thread.last_message_at ? this.formatDate(thread.last_message_at) : ''}
                </p>
            </div>
        `).join('');
    }

    async selectThread(threadItem) {
        // Remove active state from all threads
        document.querySelectorAll('.thread-item').forEach(item => {
            item.classList.remove('bg-kwikr-green', 'text-white');
        });

        // Add active state to selected thread
        threadItem.classList.add('bg-kwikr-green', 'text-white');

        // Update current thread info
        this.currentThreadId = parseInt(threadItem.dataset.threadId);
        this.currentJobId = parseInt(threadItem.dataset.jobId);

        // Load messages for this thread
        await this.loadMessages();
        
        // Mark thread as read
        await this.markThreadAsRead();
        
        // Update UI
        this.updateChatHeader(threadItem);
    }

    async loadMessages() {
        if (!this.currentThreadId) return;

        try {
            const response = await fetch(`/api/worker/messages/threads/${this.currentThreadId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            this.renderMessages(data.messages);
            
            // Update last message ID for polling
            if (data.messages.length > 0) {
                this.lastMessageId = data.messages[data.messages.length - 1].id;
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('Failed to load messages');
        }
    }

    renderMessages(messages) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-comment text-3xl mb-2"></i>
                    <p>No messages in this conversation yet</p>
                    <p class="text-sm">Send the first message to start the conversation!</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = messages.map(message => {
            const isWorkerMessage = message.sender_type === 'worker';
            const isProgressUpdate = message.message_type === 'progress_update';
            
            return `
                <div class="mb-4 ${isWorkerMessage ? 'text-right' : 'text-left'}">
                    <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isWorkerMessage ? 'bg-kwikr-green text-white' : 'bg-gray-200 text-gray-900'
                    }">
                        ${isProgressUpdate ? `
                            <div class="mb-2">
                                <i class="fas fa-tasks mr-2"></i>
                                <span class="font-semibold">Progress Update</span>
                                ${message.progress_percentage ? `
                                    <div class="w-full bg-white bg-opacity-20 rounded-full h-2 mt-2">
                                        <div class="bg-white h-2 rounded-full" style="width: ${message.progress_percentage}%"></div>
                                    </div>
                                    <div class="text-xs mt-1">${message.progress_percentage}% Complete</div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        <p class="whitespace-pre-wrap">${this.escapeHtml(message.content)}</p>
                        
                        ${message.file_attachments ? this.renderFileAttachments(message.file_attachments) : ''}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${this.formatDate(message.created_at)}
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    renderFileAttachments(attachments) {
        if (!attachments || attachments.length === 0) return '';
        
        return `
            <div class="mt-2 space-y-2">
                ${attachments.map(file => `
                    <div class="flex items-center space-x-2 bg-white bg-opacity-20 rounded p-2">
                        <i class="fas ${this.getFileIcon(file.file_name)} text-sm"></i>
                        <span class="text-sm truncate flex-1">${this.escapeHtml(file.file_name)}</span>
                        <button onclick="window.downloadFile('${file.id}')" 
                                class="text-xs underline hover:no-underline">
                            Download
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageContent');
        if (!messageInput || !this.currentThreadId) return;

        const content = messageInput.value.trim();
        if (!content) return;

        try {
            const response = await fetch('/api/worker/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                },
                body: JSON.stringify({
                    thread_id: this.currentThreadId,
                    content: content,
                    message_type: 'regular'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            // Reload messages to show the new message
            await this.loadMessages();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    async sendProgressUpdate() {
        const form = document.getElementById('progressUpdateForm');
        const formData = new FormData(form);
        
        if (!this.currentJobId) return;

        try {
            const progressData = {
                job_id: this.currentJobId,
                update_type: formData.get('updateType'),
                description: formData.get('description'),
                progress_percentage: formData.get('progressPercentage') || null
            };

            // Handle file uploads
            const files = document.getElementById('progressPhotos').files;
            if (files.length > 0) {
                progressData.files = [];
                for (let file of files) {
                    const base64 = await this.fileToBase64(file);
                    progressData.files.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: base64
                    });
                }
            }

            const response = await fetch('/api/worker/progress-updates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                },
                body: JSON.stringify(progressData)
            });

            if (!response.ok) {
                throw new Error('Failed to send progress update');
            }

            // Close modal and reset form
            document.getElementById('progressUpdateModal').classList.add('hidden');
            form.reset();
            
            // Reload messages to show the progress update
            await this.loadMessages();
            
            this.showSuccess('Progress update sent successfully!');
            
        } catch (error) {
            console.error('Error sending progress update:', error);
            this.showError('Failed to send progress update');
        }
    }

    async markThreadAsRead() {
        if (!this.currentThreadId) return;

        try {
            await fetch(`/api/worker/messages/threads/${this.currentThreadId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                }
            });

            // Update UI to remove unread indicator
            const threadItem = document.querySelector(`[data-thread-id="${this.currentThreadId}"]`);
            if (threadItem) {
                const unreadBadge = threadItem.querySelector('.bg-kwikr-green.text-white.text-xs');
                if (unreadBadge) {
                    unreadBadge.remove();
                }
                threadItem.classList.remove('bg-blue-50', 'border-l-4', 'border-l-kwikr-green');
            }
        } catch (error) {
            console.error('Error marking thread as read:', error);
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            await fetch(`/api/worker/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                }
            });

            // Update UI to mark notification as read
            const notificationItem = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.classList.remove('bg-blue-50');
                notificationItem.classList.add('bg-gray-50');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    startPolling() {
        // Poll for new messages every 10 seconds
        this.pollingInterval = setInterval(() => {
            if (this.currentThreadId) {
                this.checkForNewMessages();
            }
        }, 10000);
    }

    async checkForNewMessages() {
        if (!this.currentThreadId || !this.lastMessageId) return;

        try {
            const response = await fetch(`/api/worker/messages/threads/${this.currentThreadId}/messages?after=${this.lastMessageId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.messages && data.messages.length > 0) {
                    // Append new messages
                    this.appendNewMessages(data.messages);
                    this.lastMessageId = data.messages[data.messages.length - 1].id;
                }
            }
        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }

    appendNewMessages(messages) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        messages.forEach(message => {
            const isWorkerMessage = message.sender_type === 'worker';
            const isProgressUpdate = message.message_type === 'progress_update';
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `mb-4 ${isWorkerMessage ? 'text-right' : 'text-left'}`;
            messageDiv.innerHTML = `
                <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isWorkerMessage ? 'bg-kwikr-green text-white' : 'bg-gray-200 text-gray-900'
                }">
                    ${isProgressUpdate ? `
                        <div class="mb-2">
                            <i class="fas fa-tasks mr-2"></i>
                            <span class="font-semibold">Progress Update</span>
                            ${message.progress_percentage ? `
                                <div class="w-full bg-white bg-opacity-20 rounded-full h-2 mt-2">
                                    <div class="bg-white h-2 rounded-full" style="width: ${message.progress_percentage}%"></div>
                                </div>
                                <div class="text-xs mt-1">${message.progress_percentage}% Complete</div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <p class="whitespace-pre-wrap">${this.escapeHtml(message.content)}</p>
                    
                    ${message.file_attachments ? this.renderFileAttachments(message.file_attachments) : ''}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    ${this.formatDate(message.created_at)}
                </div>
            `;

            messagesContainer.appendChild(messageDiv);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show notification for new messages from client
        const clientMessages = messages.filter(msg => msg.sender_type === 'client');
        if (clientMessages.length > 0) {
            this.showNotification(`You have ${clientMessages.length} new message(s) from the client`);
        }
    }

    updateChatHeader(threadItem) {
        const chatHeader = document.getElementById('chatHeader');
        if (!chatHeader) return;

        const jobTitle = threadItem.querySelector('h4').textContent;
        const clientName = threadItem.querySelector('p').textContent.replace('Client: ', '');

        chatHeader.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-900">${this.escapeHtml(jobTitle)}</h3>
            <p class="text-sm text-gray-600">${this.escapeHtml(clientName)}</p>
        `;
    }

    // Utility Functions
    autoResize(e) {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    }

    handleFileSelect(e) {
        const files = e.target.files;
        const fileList = document.getElementById('selectedFiles');
        if (!fileList) return;

        if (files.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = Array.from(files).map((file, index) => `
            <div class="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span class="text-sm truncate">${this.escapeHtml(file.name)}</span>
                <span class="text-xs text-gray-500">${this.formatFileSize(file.size)}</span>
            </div>
        `).join('');
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'jpg': 'fa-image',
            'jpeg': 'fa-image',
            'png': 'fa-image',
            'gif': 'fa-image',
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'txt': 'fa-file-alt',
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive'
        };
        return iconMap[ext] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return Math.floor(diff / 60000) + 'm ago';
        } else if (diff < 86400000) { // Less than 1 day
            return Math.floor(diff / 3600000) + 'h ago';
        } else {
            return date.toLocaleDateString();
        }
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

    showNotification(message) {
        this.showToast(message, 'info');
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

    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

// Global function for file downloads
window.downloadFile = async function(fileId) {
    try {
        const response = await fetch(`/api/worker/files/${fileId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('workerToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to download file');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Failed to download file');
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on the messages page
    if (window.location.pathname.includes('/messages')) {
        window.messagesApp = new KwikrMessagesApp();
    }
});

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.messagesApp) {
        window.messagesApp.destroy();
    }
});