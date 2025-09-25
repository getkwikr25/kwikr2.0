/**
 * Notification System Service for Kwikr Platform
 * 
 * Provides comprehensive notification management including:
 * - Real-time notifications for messages, jobs, invoices, disputes
 * - Multi-channel delivery (in-app, email, SMS, push)
 * - User preferences and notification settings
 * - Notification templates and batching
 * - Analytics and delivery tracking
 */

export interface NotificationData {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data: Record<string, any>; // JSON data for action buttons, links, etc.
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduled_for?: string;
  sent_at?: string;
  read_at?: string;
  clicked_at?: string;
  created_at: string;
  expires_at?: string;
  related_entity_type?: string;
  related_entity_id?: number;
  template_id?: number;
  delivery_attempts: number;
  last_delivery_attempt?: string;
  delivery_error?: string;
}

export type NotificationType = 
  | 'message' 
  | 'job_update' 
  | 'invoice_created' 
  | 'invoice_paid' 
  | 'invoice_overdue'
  | 'dispute_opened' 
  | 'dispute_resolved'
  | 'file_shared'
  | 'milestone_reached'
  | 'payment_received'
  | 'system_announcement'
  | 'account_update'
  | 'security_alert';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'expired';

export interface NotificationPreferences {
  user_id: number;
  notification_type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency_limit?: number; // Max notifications per hour
  batch_delivery?: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  title_template: string;
  message_template: string;
  data_template?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  userId: number;
  notificationType: NotificationType;
  channels?: NotificationChannel[];
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledFor?: string;
  expiresAt?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  templateId?: number;
}

export interface NotificationSearchOptions {
  userId: number;
  userRole: string;
  notificationTypes?: NotificationType[];
  channels?: NotificationChannel[];
  statuses?: NotificationStatus[];
  priorities?: NotificationPriority[];
  unreadOnly?: boolean;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdAfter?: string;
  createdBefore?: string;
  search?: string;
  sortBy?: 'created_at' | 'priority' | 'read_at' | 'sent_at';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface NotificationBatch {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  batch_size: number;
  sent_at: string;
  notifications: NotificationData[];
}

export interface NotificationAnalytics {
  totalNotifications: number;
  unreadCount: number;
  deliveryStats: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  typeStats: Record<NotificationType, number>;
  priorityStats: Record<NotificationPriority, number>;
  recentActivity: Array<{
    type: string;
    count: number;
    date: string;
  }>;
  engagementStats: {
    readRate: number;
    clickRate: number;
    averageReadTime: number;
  };
}

export class NotificationSystemService {
  constructor(private db: D1Database) {}

  /**
   * Create and send a notification
   */
  async createNotification(notificationData: CreateNotificationData): Promise<{
    success: boolean;
    notification?: NotificationData;
    error?: string;
  }> {
    try {
      // Get user preferences for notification types and channels
      const preferences = await this.getUserPreferences(
        notificationData.userId, 
        notificationData.notificationType
      );

      if (!preferences.enabled) {
        return { 
          success: false, 
          error: 'User has disabled this notification type' 
        };
      }

      // Determine channels to use (user preferences or fallback to in_app)
      const channels = notificationData.channels?.filter(channel => 
        preferences.channels.includes(channel)
      ) || preferences.channels || ['in_app'];

      if (channels.length === 0) {
        return { 
          success: false, 
          error: 'No enabled channels for this notification' 
        };
      }

      // Check frequency limits
      if (preferences.frequency_limit) {
        const recentCount = await this.getRecentNotificationCount(
          notificationData.userId,
          notificationData.notificationType
        );
        
        if (recentCount >= preferences.frequency_limit) {
          return { 
            success: false, 
            error: 'Frequency limit exceeded for this notification type' 
          };
        }
      }

      // Create notifications for each channel
      const notifications: NotificationData[] = [];
      
      for (const channel of channels) {
        const notification = await this.createSingleNotification({
          ...notificationData,
          channel,
          preferences
        });
        notifications.push(notification);
      }

      // Schedule delivery (immediate or batched)
      if (preferences.batch_delivery && channel !== 'in_app') {
        await this.scheduleBatchDelivery(notificationData.userId, notifications);
      } else {
        // Send immediately
        for (const notification of notifications) {
          await this.sendNotification(notification);
        }
      }

      return {
        success: true,
        notification: notifications[0] // Return primary notification
      };

    } catch (error) {
      console.error('Failed to create notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification'
      };
    }
  }

  /**
   * Send a notification through the specified channel
   */
  async sendNotification(notification: NotificationData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      let deliveryResult = false;

      switch (notification.channel) {
        case 'in_app':
          deliveryResult = await this.sendInAppNotification(notification);
          break;
        case 'email':
          deliveryResult = await this.sendEmailNotification(notification);
          break;
        case 'sms':
          deliveryResult = await this.sendSMSNotification(notification);
          break;
        case 'push':
          deliveryResult = await this.sendPushNotification(notification);
          break;
        case 'webhook':
          deliveryResult = await this.sendWebhookNotification(notification);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Update notification status
      const status = deliveryResult ? 'sent' : 'failed';
      await this.updateNotificationStatus(notification.id, status, deliveryResult ? null : 'Delivery failed');

      return { success: deliveryResult };

    } catch (error) {
      console.error('Failed to send notification:', error);
      
      // Update as failed
      await this.updateNotificationStatus(
        notification.id, 
        'failed', 
        error instanceof Error ? error.message : 'Send failed'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      };
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(options: NotificationSearchOptions): Promise<{
    notifications: NotificationData[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    try {
      let query = `
        SELECT n.*, u.name as related_user_name
        FROM communication_notifications n
        LEFT JOIN users u ON n.related_entity_id = u.id AND n.related_entity_type = 'user'
        WHERE n.user_id = ?
      `;
      
      const params: any[] = [options.userId];
      let paramIndex = 2;

      // Apply filters
      if (options.notificationTypes && options.notificationTypes.length > 0) {
        const placeholders = options.notificationTypes.map(() => `?${paramIndex++}`).join(',');
        query += ` AND n.notification_type IN (${placeholders})`;
        params.push(...options.notificationTypes);
      }

      if (options.channels && options.channels.length > 0) {
        const placeholders = options.channels.map(() => `?${paramIndex++}`).join(',');
        query += ` AND n.channel IN (${placeholders})`;
        params.push(...options.channels);
      }

      if (options.statuses && options.statuses.length > 0) {
        const placeholders = options.statuses.map(() => `?${paramIndex++}`).join(',');
        query += ` AND n.status IN (${placeholders})`;
        params.push(...options.statuses);
      }

      if (options.priorities && options.priorities.length > 0) {
        const placeholders = options.priorities.map(() => `?${paramIndex++}`).join(',');
        query += ` AND n.priority IN (${placeholders})`;
        params.push(...options.priorities);
      }

      if (options.unreadOnly) {
        query += ` AND n.read_at IS NULL`;
      }

      if (options.relatedEntityType && options.relatedEntityId) {
        query += ` AND n.related_entity_type = ?${paramIndex++} AND n.related_entity_id = ?${paramIndex++}`;
        params.push(options.relatedEntityType, options.relatedEntityId);
      }

      if (options.createdAfter) {
        query += ` AND n.created_at >= ?${paramIndex++}`;
        params.push(options.createdAfter);
      }

      if (options.createdBefore) {
        query += ` AND n.created_at <= ?${paramIndex++}`;
        params.push(options.createdBefore);
      }

      if (options.search) {
        query += ` AND (n.title LIKE ?${paramIndex++} OR n.message LIKE ?${paramIndex++})`;
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add sorting
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'DESC';
      query += ` ORDER BY n.${sortBy} ${sortOrder}`;

      // Add pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query += ` LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`;
      params.push(limit + 1, offset);

      // Execute query
      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).all();
      
      const notifications = result.results as NotificationData[];
      const hasMore = notifications.length > limit;
      
      if (hasMore) {
        notifications.pop();
      }

      // Get total count
      let countQuery = query.replace(/SELECT n\.\*, u\.name as related_user_name/, 'SELECT COUNT(*) as total');
      countQuery = countQuery.replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');
      
      const countParams = params.slice(0, -2);
      const countStmt = this.db.prepare(countQuery);
      const countResult = await countStmt.bind(...countParams).first() as { total: number };

      // Get unread count
      const unreadStmt = this.db.prepare(`
        SELECT COUNT(*) as unread_count 
        FROM communication_notifications 
        WHERE user_id = ? AND read_at IS NULL
      `);
      const unreadResult = await unreadStmt.bind(options.userId).first() as { unread_count: number };

      return {
        notifications,
        total: countResult.total,
        unreadCount: unreadResult.unread_count,
        hasMore
      };

    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw new Error('Failed to get notifications');
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(
    notificationIds: number[], 
    userId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (notificationIds.length === 0) {
        return { success: true };
      }

      const placeholders = notificationIds.map((_, index) => `?${index + 2}`).join(',');
      const stmt = this.db.prepare(`
        UPDATE communication_notifications 
        SET read_at = datetime('now'),
            status = CASE 
              WHEN status = 'sent' THEN 'read'
              WHEN status = 'delivered' THEN 'read'
              ELSE status 
            END
        WHERE id IN (${placeholders}) AND user_id = ?1
      `);
      
      await stmt.bind(userId, ...notificationIds).run();

      return { success: true };

    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notifications as read'
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const stmt = this.db.prepare(`
        UPDATE communication_notifications 
        SET read_at = datetime('now'),
            status = CASE 
              WHEN status = 'sent' THEN 'read'
              WHEN status = 'delivered' THEN 'read'
              ELSE status 
            END
        WHERE user_id = ? AND read_at IS NULL
      `);
      
      await stmt.bind(userId).run();

      return { success: true };

    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
      };
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: number,
    notificationType: NotificationType,
    preferences: Partial<Omit<NotificationPreferences, 'user_id' | 'notification_type' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO communication_preferences (
          user_id, notification_type, channels, enabled, quiet_hours_start, 
          quiet_hours_end, frequency_limit, batch_delivery, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      await stmt.bind(
        userId,
        notificationType,
        JSON.stringify(preferences.channels || ['in_app']),
        preferences.enabled !== false ? 1 : 0,
        preferences.quiet_hours_start || null,
        preferences.quiet_hours_end || null,
        preferences.frequency_limit || null,
        preferences.batch_delivery ? 1 : 0
      ).run();

      return { success: true };

    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences'
      };
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(
    userId: number, 
    notificationType?: NotificationType
  ): Promise<NotificationPreferences> {
    try {
      let query = `
        SELECT * FROM communication_preferences 
        WHERE user_id = ?
      `;
      const params = [userId];

      if (notificationType) {
        query += ` AND notification_type = ?`;
        params.push(notificationType);
      }

      query += ` ORDER BY updated_at DESC LIMIT 1`;

      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).first() as any;

      if (result) {
        return {
          ...result,
          channels: JSON.parse(result.channels || '["in_app"]'),
          enabled: result.enabled === 1,
          batch_delivery: result.batch_delivery === 1
        };
      }

      // Return default preferences
      return {
        user_id: userId,
        notification_type: notificationType || 'message',
        channels: ['in_app'],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get user preferences:', error);
      
      // Return safe defaults on error
      return {
        user_id: userId,
        notification_type: notificationType || 'message',
        channels: ['in_app'],
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(
    userId?: number, 
    userRole?: string,
    dateRange?: { start: string; end: string }
  ): Promise<NotificationAnalytics> {
    try {
      const isAdmin = userRole === 'admin';
      const userFilter = isAdmin ? '' : `WHERE n.user_id = ${userId}`;
      const dateFilter = dateRange ? 
        `${userFilter ? 'AND' : 'WHERE'} n.created_at BETWEEN '${dateRange.start}' AND '${dateRange.end}'` : '';

      // Total notifications and unread count
      const totalQuery = `
        SELECT 
          COUNT(*) as total_notifications,
          SUM(CASE WHEN n.read_at IS NULL THEN 1 ELSE 0 END) as unread_count
        FROM communication_notifications n
        ${userFilter} ${dateFilter}
      `;
      const totalResult = await this.db.prepare(totalQuery).first() as {
        total_notifications: number;
        unread_count: number;
      };

      // Delivery stats by channel
      const deliveryQuery = `
        SELECT 
          n.channel,
          COUNT(*) as total,
          SUM(CASE WHEN n.status = 'sent' OR n.status = 'delivered' OR n.status = 'read' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN n.status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM communication_notifications n
        ${userFilter} ${dateFilter}
        GROUP BY n.channel
      `;
      const deliveryResults = await this.db.prepare(deliveryQuery).all();
      
      const deliveryStats: Record<NotificationChannel, any> = {} as any;
      deliveryResults.results.forEach((row: any) => {
        const deliveryRate = row.total > 0 ? (row.delivered / row.total) * 100 : 0;
        deliveryStats[row.channel] = {
          sent: row.total,
          delivered: row.delivered,
          failed: row.failed,
          deliveryRate: Math.round(deliveryRate * 100) / 100
        };
      });

      // Stats by notification type
      const typeQuery = `
        SELECT n.notification_type, COUNT(*) as count
        FROM communication_notifications n
        ${userFilter} ${dateFilter}
        GROUP BY n.notification_type
        ORDER BY count DESC
      `;
      const typeResults = await this.db.prepare(typeQuery).all();
      const typeStats: Record<NotificationType, number> = {} as any;
      typeResults.results.forEach((row: any) => {
        typeStats[row.notification_type] = row.count;
      });

      // Stats by priority
      const priorityQuery = `
        SELECT n.priority, COUNT(*) as count
        FROM communication_notifications n
        ${userFilter} ${dateFilter}
        GROUP BY n.priority
      `;
      const priorityResults = await this.db.prepare(priorityQuery).all();
      const priorityStats: Record<NotificationPriority, number> = {} as any;
      priorityResults.results.forEach((row: any) => {
        priorityStats[row.priority] = row.count;
      });

      // Recent activity (last 7 days)
      const activityQuery = `
        SELECT 
          date(n.created_at) as date,
          n.notification_type as type,
          COUNT(*) as count
        FROM communication_notifications n
        ${userFilter}
        WHERE n.created_at >= datetime('now', '-7 days')
        GROUP BY date(n.created_at), n.notification_type
        ORDER BY date DESC
      `;
      const activityResults = await this.db.prepare(activityQuery).all();
      const recentActivity = activityResults.results.map((row: any) => ({
        type: row.type,
        count: row.count,
        date: row.date
      }));

      // Engagement stats
      const engagementQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN n.read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
          SUM(CASE WHEN n.clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked_count,
          AVG(CASE 
            WHEN n.read_at IS NOT NULL AND n.sent_at IS NOT NULL 
            THEN (julianday(n.read_at) - julianday(n.sent_at)) * 24 * 60 
            ELSE NULL 
          END) as avg_read_time_minutes
        FROM communication_notifications n
        ${userFilter} ${dateFilter}
        AND n.status IN ('sent', 'delivered', 'read')
      `;
      const engagementResult = await this.db.prepare(engagementQuery).first() as {
        total: number;
        read_count: number;
        clicked_count: number;
        avg_read_time_minutes: number;
      };

      const readRate = engagementResult.total > 0 ? 
        (engagementResult.read_count / engagementResult.total) * 100 : 0;
      const clickRate = engagementResult.read_count > 0 ? 
        (engagementResult.clicked_count / engagementResult.read_count) * 100 : 0;

      return {
        totalNotifications: totalResult.total_notifications,
        unreadCount: totalResult.unread_count,
        deliveryStats,
        typeStats,
        priorityStats,
        recentActivity,
        engagementStats: {
          readRate: Math.round(readRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          averageReadTime: Math.round((engagementResult.avg_read_time_minutes || 0) * 100) / 100
        }
      };

    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      throw new Error('Failed to get notification analytics');
    }
  }

  // Private helper methods

  private async createSingleNotification(data: CreateNotificationData & {
    channel: NotificationChannel;
    preferences: NotificationPreferences;
  }): Promise<NotificationData> {
    const stmt = this.db.prepare(`
      INSERT INTO communication_notifications (
        user_id, notification_type, channel, title, message, data,
        priority, status, scheduled_for, expires_at, related_entity_type,
        related_entity_id, template_id, delivery_attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 0, datetime('now'))
      RETURNING *
    `);

    const result = await stmt.bind(
      data.userId,
      data.notificationType,
      data.channel,
      data.title,
      data.message,
      JSON.stringify(data.data || {}),
      data.priority || 'medium',
      data.scheduledFor || null,
      data.expiresAt || null,
      data.relatedEntityType || null,
      data.relatedEntityId || null,
      data.templateId || null
    ).first();

    return result as NotificationData;
  }

  private async getRecentNotificationCount(
    userId: number,
    notificationType: NotificationType
  ): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM communication_notifications 
      WHERE user_id = ? 
      AND notification_type = ? 
      AND created_at >= datetime('now', '-1 hour')
    `);
    
    const result = await stmt.bind(userId, notificationType).first() as { count: number };
    return result.count;
  }

  private async scheduleBatchDelivery(
    userId: number, 
    notifications: NotificationData[]
  ): Promise<void> {
    // For now, just mark as pending - in production, use a job queue
    for (const notification of notifications) {
      await this.db.prepare(`
        UPDATE communication_notifications 
        SET scheduled_for = datetime('now', '+15 minutes')
        WHERE id = ?
      `).bind(notification.id).run();
    }
  }

  private async updateNotificationStatus(
    notificationId: number,
    status: NotificationStatus,
    error?: string | null
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE communication_notifications 
      SET status = ?, 
          sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END,
          delivery_attempts = delivery_attempts + 1,
          last_delivery_attempt = datetime('now'),
          delivery_error = ?
      WHERE id = ?
    `);

    await stmt.bind(status, status, error || null, notificationId).run();
  }

  // Channel-specific delivery methods

  private async sendInAppNotification(notification: NotificationData): Promise<boolean> {
    // In-app notifications are already stored in the database
    // Just mark as sent (they'll be retrieved via API)
    return true;
  }

  private async sendEmailNotification(notification: NotificationData): Promise<boolean> {
    try {
      // In production, integrate with email service (SendGrid, Mailgun, etc.)
      // For now, just simulate email sending
      console.log('Sending email notification:', {
        to: notification.user_id,
        subject: notification.title,
        body: notification.message
      });
      
      // Simulate async email delivery
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Email notification failed:', error);
      return false;
    }
  }

  private async sendSMSNotification(notification: NotificationData): Promise<boolean> {
    try {
      // In production, integrate with SMS service (Twilio, etc.)
      console.log('Sending SMS notification:', {
        to: notification.user_id,
        message: `${notification.title}: ${notification.message}`
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('SMS notification failed:', error);
      return false;
    }
  }

  private async sendPushNotification(notification: NotificationData): Promise<boolean> {
    try {
      // In production, integrate with push service (Firebase, OneSignal, etc.)
      console.log('Sending push notification:', {
        to: notification.user_id,
        title: notification.title,
        body: notification.message,
        data: notification.data
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }

  private async sendWebhookNotification(notification: NotificationData): Promise<boolean> {
    try {
      // In production, send HTTP POST to user's webhook URL
      console.log('Sending webhook notification:', {
        userId: notification.user_id,
        notification: notification
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Webhook notification failed:', error);
      return false;
    }
  }
}

// Utility functions for creating common notifications

export function createMessageNotification(
  userId: number,
  senderName: string,
  messagePreview: string,
  conversationId: number
): CreateNotificationData {
  return {
    userId,
    notificationType: 'message',
    title: `New message from ${senderName}`,
    message: messagePreview,
    data: {
      conversation_id: conversationId,
      action_url: `/conversations/${conversationId}`,
      action_text: 'View Message'
    },
    priority: 'medium',
    relatedEntityType: 'conversation',
    relatedEntityId: conversationId
  };
}

export function createJobUpdateNotification(
  userId: number,
  jobTitle: string,
  updateType: string,
  jobId: number
): CreateNotificationData {
  return {
    userId,
    notificationType: 'job_update',
    title: `Job Update: ${jobTitle}`,
    message: `Your job has been ${updateType}`,
    data: {
      job_id: jobId,
      update_type: updateType,
      action_url: `/jobs/${jobId}`,
      action_text: 'View Job'
    },
    priority: 'medium',
    relatedEntityType: 'job',
    relatedEntityId: jobId
  };
}

export function createInvoiceNotification(
  userId: number,
  invoiceNumber: string,
  amount: number,
  type: 'created' | 'paid' | 'overdue',
  invoiceId: number
): CreateNotificationData {
  const messages = {
    created: `New invoice #${invoiceNumber} for $${amount}`,
    paid: `Invoice #${invoiceNumber} has been paid`,
    overdue: `Invoice #${invoiceNumber} is overdue`
  };

  return {
    userId,
    notificationType: type === 'created' ? 'invoice_created' : 
                     type === 'paid' ? 'invoice_paid' : 'invoice_overdue',
    title: `Invoice ${type}`,
    message: messages[type],
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      amount,
      action_url: `/invoices/${invoiceId}`,
      action_text: 'View Invoice'
    },
    priority: type === 'overdue' ? 'high' : 'medium',
    relatedEntityType: 'invoice',
    relatedEntityId: invoiceId
  };
}

export function createFileSharedNotification(
  userId: number,
  fileName: string,
  sharedBy: string,
  fileId: number
): CreateNotificationData {
  return {
    userId,
    notificationType: 'file_shared',
    title: `File shared: ${fileName}`,
    message: `${sharedBy} shared a file with you`,
    data: {
      file_id: fileId,
      file_name: fileName,
      shared_by: sharedBy,
      action_url: `/files/${fileId}`,
      action_text: 'View File'
    },
    priority: 'low',
    relatedEntityType: 'file',
    relatedEntityId: fileId
  };
}