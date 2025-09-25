export interface Conversation {
  id: number;
  title?: string;
  conversation_type: 'direct' | 'job' | 'invoice' | 'dispute' | 'support' | 'group';
  job_id?: number;
  invoice_id?: number;
  dispute_id?: number;
  project_id?: number;
  client_id: number;
  worker_id: number;
  admin_id?: number;
  status: 'active' | 'archived' | 'closed' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_private: boolean;
  is_encrypted: boolean;
  moderation_status: 'approved' | 'pending' | 'flagged' | 'blocked';
  last_message_at?: string;
  last_message_by?: number;
  total_messages: number;
  unread_count_client: number;
  unread_count_worker: number;
  unread_count_admin: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  metadata?: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  recipient_id?: number;
  message_type: 'text' | 'file' | 'image' | 'voice' | 'video' | 'location' | 'system' | 'notification' | 'quote' | 'invoice_link';
  content: string;
  formatted_content?: string;
  is_system_message: boolean;
  is_important: boolean;
  is_edited: boolean;
  edit_count: number;
  original_message_id?: number;
  attachment_count: number;
  status: 'draft' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'deleted';
  is_private: boolean;
  is_encrypted: boolean;
  moderation_status: 'approved' | 'pending' | 'flagged' | 'blocked';
  moderation_reason?: string;
  delivered_at?: string;
  read_at?: string;
  read_by?: string; // JSON array of user IDs
  created_at: string;
  updated_at: string;
  edited_at?: string;
  deleted_at?: string;
  client_metadata?: string;
  server_metadata?: string;
}

export interface MessageAttachment {
  id: number;
  message_id: number;
  conversation_id: number;
  uploaded_by: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_extension?: string;
  storage_provider: 'cloudflare_r2' | 'external_url' | 'base64_embed';
  file_url: string;
  thumbnail_url?: string;
  storage_path?: string;
  attachment_type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  is_sensitive: boolean;
  processing_status: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed';
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'error';
  is_public: boolean;
  download_count: number;
  last_accessed?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  metadata?: string;
}

export interface CommunicationSession {
  id: number;
  user_id: number;
  session_token: string;
  connection_id?: string;
  device_info?: string;
  ip_address?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_activity: string;
  current_conversation_id?: number;
  is_typing_in_conversation?: number;
  typing_started_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface CreateConversationData {
  conversation_type?: string;
  job_id?: number;
  invoice_id?: number;
  dispute_id?: number;
  participant_id: number; // The other user in the conversation
  title?: string;
  initial_message?: string;
  priority?: string;
}

export interface SendMessageData {
  content: string;
  message_type?: string;
  is_important?: boolean;
  attachments?: Array<{
    filename: string;
    file_url: string;
    file_size: number;
    mime_type: string;
  }>;
}

export class RealtimeMessagingService {
  constructor(private db: D1Database) {}

  /**
   * Create or get existing conversation between users
   */
  async createOrGetConversation(
    conversationData: CreateConversationData,
    currentUserId: number
  ): Promise<{ success: boolean; message: string; conversation?: Conversation }> {
    try {
      const participantId = conversationData.participant_id;
      
      // Determine client and worker IDs
      const currentUser = await this.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).bind(currentUserId).first();

      const participant = await this.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).bind(participantId).first();

      if (!currentUser || !participant) {
        return { success: false, message: 'User not found' };
      }

      let clientId: number, workerId: number;
      if (currentUser.role === 'client') {
        clientId = currentUserId;
        workerId = participantId;
      } else {
        workerId = currentUserId;
        clientId = participantId;
      }

      // Check for existing conversation
      let existingConversation = null;
      if (conversationData.conversation_type === 'job' && conversationData.job_id) {
        existingConversation = await this.db.prepare(`
          SELECT * FROM conversations 
          WHERE job_id = ? AND client_id = ? AND worker_id = ?
        `).bind(conversationData.job_id, clientId, workerId).first();
      } else if (conversationData.conversation_type === 'invoice' && conversationData.invoice_id) {
        existingConversation = await this.db.prepare(`
          SELECT * FROM conversations 
          WHERE invoice_id = ? AND client_id = ? AND worker_id = ?
        `).bind(conversationData.invoice_id, clientId, workerId).first();
      } else if (conversationData.conversation_type === 'dispute' && conversationData.dispute_id) {
        existingConversation = await this.db.prepare(`
          SELECT * FROM conversations 
          WHERE dispute_id = ? AND client_id = ? AND worker_id = ?
        `).bind(conversationData.dispute_id, clientId, workerId).first();
      } else {
        // Direct conversation
        existingConversation = await this.db.prepare(`
          SELECT * FROM conversations 
          WHERE conversation_type = 'direct' AND client_id = ? AND worker_id = ?
          AND job_id IS NULL AND invoice_id IS NULL AND dispute_id IS NULL
        `).bind(clientId, workerId).first();
      }

      if (existingConversation) {
        return {
          success: true,
          message: 'Existing conversation found',
          conversation: existingConversation as Conversation
        };
      }

      // Create new conversation
      const conversationResult = await this.db.prepare(`
        INSERT INTO conversations (
          conversation_type, job_id, invoice_id, dispute_id, client_id, worker_id,
          title, priority, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      `).bind(
        conversationData.conversation_type || 'direct',
        conversationData.job_id || null,
        conversationData.invoice_id || null,
        conversationData.dispute_id || null,
        clientId,
        workerId,
        conversationData.title || null,
        conversationData.priority || 'normal'
      ).run();

      const conversationId = conversationResult.meta.last_row_id as number;

      // Send initial message if provided
      if (conversationData.initial_message) {
        await this.sendMessage(conversationId, currentUserId, {
          content: conversationData.initial_message,
          message_type: 'text'
        });
      }

      // Get the created conversation
      const newConversation = await this.db.prepare(`
        SELECT * FROM conversations WHERE id = ?
      `).bind(conversationId).first();

      return {
        success: true,
        message: 'Conversation created successfully',
        conversation: newConversation as Conversation
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to create conversation: ${error.message}`
      };
    }
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: number,
    senderId: number,
    messageData: SendMessageData
  ): Promise<{ success: boolean; message: string; message_id?: number; messageObj?: Message }> {
    try {
      // Verify conversation access
      const conversation = await this.db.prepare(`
        SELECT * FROM conversations 
        WHERE id = ? AND (client_id = ? OR worker_id = ? OR admin_id = ?)
      `).bind(conversationId, senderId, senderId, senderId).first();

      if (!conversation) {
        return { success: false, message: 'Conversation not found or access denied' };
      }

      // Determine recipient
      let recipientId = null;
      if (conversation.client_id === senderId) {
        recipientId = conversation.worker_id;
      } else if (conversation.worker_id === senderId) {
        recipientId = conversation.client_id;
      }

      // Create message
      const messageResult = await this.db.prepare(`
        INSERT INTO messages (
          conversation_id, sender_id, recipient_id, message_type, content,
          is_important, attachment_count, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'), datetime('now'))
      `).bind(
        conversationId,
        senderId,
        recipientId,
        messageData.message_type || 'text',
        messageData.content,
        messageData.is_important || false,
        messageData.attachments?.length || 0
      ).run();

      const messageId = messageResult.meta.last_row_id as number;

      // Add attachments if provided
      if (messageData.attachments && messageData.attachments.length > 0) {
        for (const attachment of messageData.attachments) {
          await this.db.prepare(`
            INSERT INTO message_attachments (
              message_id, conversation_id, uploaded_by, filename, original_filename,
              file_size, mime_type, file_url, attachment_type, processing_status,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', datetime('now'), datetime('now'))
          `).bind(
            messageId,
            conversationId,
            senderId,
            attachment.filename,
            attachment.filename,
            attachment.file_size,
            attachment.mime_type,
            attachment.file_url,
            this.getAttachmentType(attachment.mime_type)
          ).run();
        }
      }

      // Update conversation
      await this.updateConversationActivity(conversationId, senderId, messageId);

      // Update unread counts
      await this.updateUnreadCounts(conversationId, senderId);

      // Get the created message
      const newMessage = await this.db.prepare(`
        SELECT * FROM messages WHERE id = ?
      `).bind(messageId).first();

      // Create notification for recipient
      if (recipientId) {
        await this.createMessageNotification(conversationId, messageId, recipientId, senderId);
      }

      return {
        success: true,
        message: 'Message sent successfully',
        message_id: messageId,
        messageObj: newMessage as Message
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to send message: ${error.message}`
      };
    }
  }

  /**
   * Get conversation messages with pagination
   */
  async getConversationMessages(
    conversationId: number,
    userId: number,
    options: { limit?: number; offset?: number; before_message_id?: number } = {}
  ): Promise<{ success: boolean; messages: Message[]; attachments: { [messageId: number]: MessageAttachment[] }; total: number }> {
    try {
      // Verify access
      const conversation = await this.db.prepare(`
        SELECT * FROM conversations 
        WHERE id = ? AND (client_id = ? OR worker_id = ? OR admin_id = ?)
      `).bind(conversationId, userId, userId, userId).first();

      if (!conversation) {
        return { success: false, messages: [], attachments: {}, total: 0 };
      }

      let query = `
        SELECT * FROM messages 
        WHERE conversation_id = ? AND status != 'deleted'
      `;
      const params = [conversationId];

      if (options.before_message_id) {
        query += ` AND id < ?`;
        params.push(options.before_message_id);
      }

      query += ` ORDER BY created_at DESC`;

      if (options.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
        
        if (options.offset) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const messagesResult = await this.db.prepare(query).bind(...params).all();
      const messages = messagesResult.results as Message[];

      // Get attachments for these messages
      const attachments: { [messageId: number]: MessageAttachment[] } = {};
      if (messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        const attachmentsQuery = `
          SELECT * FROM message_attachments 
          WHERE message_id IN (${messageIds.map(() => '?').join(',')})
          ORDER BY created_at ASC
        `;
        const attachmentsResult = await this.db.prepare(attachmentsQuery).bind(...messageIds).all();
        
        for (const attachment of attachmentsResult.results as MessageAttachment[]) {
          if (!attachments[attachment.message_id]) {
            attachments[attachment.message_id] = [];
          }
          attachments[attachment.message_id].push(attachment);
        }
      }

      // Get total count
      const countResult = await this.db.prepare(`
        SELECT COUNT(*) as total FROM messages 
        WHERE conversation_id = ? AND status != 'deleted'
      `).bind(conversationId).first();

      return {
        success: true,
        messages: messages.reverse(), // Return in chronological order
        attachments,
        total: countResult?.total || 0
      };

    } catch (error) {
      return {
        success: false,
        messages: [],
        attachments: {},
        total: 0
      };
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: number,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ success: boolean; conversations: any[]; total: number }> {
    try {
      let query = `
        SELECT c.*, 
               uc.first_name as client_first_name, uc.last_name as client_last_name,
               uw.first_name as worker_first_name, uw.last_name as worker_last_name,
               j.title as job_title, i.invoice_number, d.title as dispute_title,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_content,
               (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id
        FROM conversations c
        LEFT JOIN users uc ON c.client_id = uc.id
        LEFT JOIN users uw ON c.worker_id = uw.id
        LEFT JOIN jobs j ON c.job_id = j.id
        LEFT JOIN invoices i ON c.invoice_id = i.id
        LEFT JOIN invoice_disputes d ON c.dispute_id = d.id
        WHERE (c.client_id = ? OR c.worker_id = ? OR c.admin_id = ?)
      `;
      
      const params = [userId, userId, userId];

      if (options.status) {
        query += ` AND c.status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY c.last_message_at DESC, c.updated_at DESC`;

      if (options.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
        
        if (options.offset) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const conversationsResult = await this.db.prepare(query).bind(...params).all();

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM conversations 
        WHERE (client_id = ? OR worker_id = ? OR admin_id = ?)
      ` + (options.status ? ` AND status = ?` : '');
      
      const countParams = [userId, userId, userId];
      if (options.status) countParams.push(options.status);
      
      const countResult = await this.db.prepare(countQuery).bind(...countParams).first();

      return {
        success: true,
        conversations: conversationsResult.results || [],
        total: countResult?.total || 0
      };

    } catch (error) {
      return {
        success: false,
        conversations: [],
        total: 0
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: number,
    userId: number,
    messageIds?: number[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify access
      const conversation = await this.db.prepare(`
        SELECT * FROM conversations 
        WHERE id = ? AND (client_id = ? OR worker_id = ? OR admin_id = ?)
      `).bind(conversationId, userId, userId, userId).first();

      if (!conversation) {
        return { success: false, message: 'Conversation not found or access denied' };
      }

      let query: string;
      let params: any[];

      if (messageIds && messageIds.length > 0) {
        // Mark specific messages as read
        query = `
          UPDATE messages 
          SET status = 'read', read_at = datetime('now'),
              read_by = json_insert(COALESCE(read_by, '[]'), '$[#]', ?)
          WHERE id IN (${messageIds.map(() => '?').join(',')}) 
          AND conversation_id = ? AND sender_id != ?
        `;
        params = [userId, ...messageIds, conversationId, userId];
      } else {
        // Mark all unread messages as read
        query = `
          UPDATE messages 
          SET status = 'read', read_at = datetime('now'),
              read_by = json_insert(COALESCE(read_by, '[]'), '$[#]', ?)
          WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
        `;
        params = [userId, conversationId, userId];
      }

      await this.db.prepare(query).bind(...params).run();

      // Update unread counts
      await this.updateUnreadCounts(conversationId, null, true);

      return {
        success: true,
        message: 'Messages marked as read'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to mark messages as read: ${error.message}`
      };
    }
  }

  /**
   * Update user's online status and activity
   */
  async updateUserPresence(
    userId: number,
    status: 'online' | 'away' | 'busy' | 'offline',
    sessionToken: string,
    conversationId?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Update or create session
      await this.db.prepare(`
        INSERT OR REPLACE INTO communication_sessions (
          user_id, session_token, status, last_activity, 
          current_conversation_id, created_at, updated_at
        ) VALUES (?, ?, ?, datetime('now'), ?, 
          COALESCE((SELECT created_at FROM communication_sessions WHERE session_token = ?), datetime('now')),
          datetime('now'))
      `).bind(userId, sessionToken, status, conversationId || null, sessionToken).run();

      return {
        success: true,
        message: 'Presence updated successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update presence: ${error.message}`
      };
    }
  }

  /**
   * Get online users (for presence indicators)
   */
  async getOnlineUsers(conversationId?: number): Promise<{ success: boolean; users: any[] }> {
    try {
      let query = `
        SELECT DISTINCT cs.user_id, cs.status, cs.last_activity,
               u.first_name, u.last_name, u.role
        FROM communication_sessions cs
        JOIN users u ON cs.user_id = u.id
        WHERE cs.status IN ('online', 'away', 'busy')
        AND cs.last_activity > datetime('now', '-15 minutes')
      `;

      const params: any[] = [];

      if (conversationId) {
        // Get users in specific conversation
        query += ` AND cs.user_id IN (
          SELECT client_id FROM conversations WHERE id = ?
          UNION
          SELECT worker_id FROM conversations WHERE id = ?
          UNION  
          SELECT admin_id FROM conversations WHERE id = ? AND admin_id IS NOT NULL
        )`;
        params.push(conversationId, conversationId, conversationId);
      }

      query += ` ORDER BY cs.last_activity DESC`;

      const result = await this.db.prepare(query).bind(...params).all();

      return {
        success: true,
        users: result.results || []
      };

    } catch (error) {
      return {
        success: false,
        users: []
      };
    }
  }

  /**
   * Search messages across conversations
   */
  async searchMessages(
    userId: number,
    searchQuery: string,
    options: { conversation_id?: number; message_type?: string; limit?: number } = {}
  ): Promise<{ success: boolean; messages: any[]; total: number }> {
    try {
      let query = `
        SELECT m.*, c.conversation_type, c.job_id, c.invoice_id,
               u.first_name as sender_first_name, u.last_name as sender_last_name
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN users u ON m.sender_id = u.id
        WHERE (c.client_id = ? OR c.worker_id = ? OR c.admin_id = ?)
        AND m.status != 'deleted'
        AND m.content LIKE ?
      `;

      const params = [userId, userId, userId, `%${searchQuery}%`];

      if (options.conversation_id) {
        query += ` AND m.conversation_id = ?`;
        params.push(options.conversation_id);
      }

      if (options.message_type) {
        query += ` AND m.message_type = ?`;
        params.push(options.message_type);
      }

      query += ` ORDER BY m.created_at DESC`;

      if (options.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
      }

      const result = await this.db.prepare(query).bind(...params).all();

      // Get total count
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
      const countResult = await this.db.prepare(countQuery).bind(...params.slice(0, -1)).first();

      return {
        success: true,
        messages: result.results || [],
        total: countResult?.total || 0
      };

    } catch (error) {
      return {
        success: false,
        messages: [],
        total: 0
      };
    }
  }

  // Helper Methods

  private async updateConversationActivity(conversationId: number, userId: number, messageId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE conversations 
      SET last_message_at = datetime('now'),
          last_message_by = ?,
          total_messages = total_messages + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(userId, conversationId).run();
  }

  private async updateUnreadCounts(conversationId: number, senderId?: number | null, reset = false): Promise<void> {
    if (reset) {
      // Reset unread counts after messages are read
      const conversation = await this.db.prepare(`
        SELECT client_id, worker_id, admin_id FROM conversations WHERE id = ?
      `).bind(conversationId).first();

      if (conversation) {
        // Count unread messages for each participant
        const clientUnread = await this.db.prepare(`
          SELECT COUNT(*) as count FROM messages 
          WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
        `).bind(conversationId, conversation.client_id).first();

        const workerUnread = await this.db.prepare(`
          SELECT COUNT(*) as count FROM messages 
          WHERE conversation_id = ? AND sender_id != ? AND status != 'read'
        `).bind(conversationId, conversation.worker_id).first();

        await this.db.prepare(`
          UPDATE conversations 
          SET unread_count_client = ?, unread_count_worker = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(clientUnread?.count || 0, workerUnread?.count || 0, conversationId).run();
      }
    } else if (senderId) {
      // Increment unread count for recipients
      const conversation = await this.db.prepare(`
        SELECT client_id, worker_id, admin_id FROM conversations WHERE id = ?
      `).bind(conversationId).first();

      if (conversation) {
        if (senderId === conversation.client_id) {
          // Client sent message, increment worker's unread count
          await this.db.prepare(`
            UPDATE conversations 
            SET unread_count_worker = unread_count_worker + 1, updated_at = datetime('now')
            WHERE id = ?
          `).bind(conversationId).run();
        } else if (senderId === conversation.worker_id) {
          // Worker sent message, increment client's unread count
          await this.db.prepare(`
            UPDATE conversations 
            SET unread_count_client = unread_count_client + 1, updated_at = datetime('now')
            WHERE id = ?
          `).bind(conversationId).run();
        }
      }
    }
  }

  private async createMessageNotification(
    conversationId: number,
    messageId: number,
    recipientId: number,
    senderId: number
  ): Promise<void> {
    try {
      // Get sender info
      const sender = await this.db.prepare(`
        SELECT first_name, last_name FROM users WHERE id = ?
      `).bind(senderId).first();

      // Get message content
      const message = await this.db.prepare(`
        SELECT content, message_type FROM messages WHERE id = ?
      `).bind(messageId).first();

      if (sender && message) {
        const senderName = `${sender.first_name} ${sender.last_name}`;
        let notificationContent = '';
        
        if (message.message_type === 'file') {
          notificationContent = `${senderName} sent you a file`;
        } else if (message.message_type === 'image') {
          notificationContent = `${senderName} sent you an image`;
        } else {
          // Truncate long messages
          const content = message.content.length > 50 
            ? message.content.substring(0, 50) + '...'
            : message.content;
          notificationContent = `${senderName}: ${content}`;
        }

        await this.db.prepare(`
          INSERT INTO communication_notifications (
            user_id, source_type, source_id, conversation_id, message_id,
            title, content, notification_type, priority, created_at, updated_at
          ) VALUES (?, 'message', ?, ?, ?, 'New Message', ?, 'message', 'normal', datetime('now'), datetime('now'))
        `).bind(
          recipientId,
          senderId,
          conversationId,
          messageId,
          notificationContent
        ).run();
      }
    } catch (error) {
      console.error('Failed to create message notification:', error);
    }
  }

  private getAttachmentType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
    return 'document';
  }
}