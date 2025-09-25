/**
 * Notification API Routes for Kwikr Platform
 * 
 * Provides notification management endpoints including:
 * - Getting user notifications with filtering
 * - Marking notifications as read
 * - Managing notification preferences
 * - Real-time notification updates via Server-Sent Events
 * - Notification analytics and statistics
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { 
  NotificationSystemService, 
  NotificationSearchOptions,
  CreateNotificationData,
  createMessageNotification,
  createJobUpdateNotification,
  createInvoiceNotification,
  createFileSharedNotification
} from '../services/notification-system';

type Bindings = {
  DB: D1Database;
};

const notificationRoutes = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all notification routes
notificationRoutes.use('*', cors());

/**
 * Get user notifications with filtering and pagination
 * GET /api/notifications
 */
notificationRoutes.get('/', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Parse query parameters
    const searchOptions: NotificationSearchOptions = {
      userId,
      userRole,
      notificationTypes: c.req.query('types')?.split(',') as any,
      channels: c.req.query('channels')?.split(',') as any,
      statuses: c.req.query('statuses')?.split(',') as any,
      priorities: c.req.query('priorities')?.split(',') as any,
      unreadOnly: c.req.query('unreadOnly') === 'true',
      relatedEntityType: c.req.query('entityType'),
      relatedEntityId: c.req.query('entityId') ? parseInt(c.req.query('entityId')!) : undefined,
      createdAfter: c.req.query('after'),
      createdBefore: c.req.query('before'),
      search: c.req.query('search'),
      sortBy: c.req.query('sortBy') as any || 'created_at',
      sortOrder: c.req.query('sortOrder') as 'ASC' | 'DESC' || 'DESC',
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0
    };

    const result = await notificationService.getUserNotifications(searchOptions);

    return c.json({
      success: true,
      notifications: result.notifications,
      total: result.total,
      unreadCount: result.unreadCount,
      hasMore: result.hasMore,
      pagination: {
        limit: searchOptions.limit,
        offset: searchOptions.offset,
        total: result.total
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting notifications' 
    }, 500);
  }
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
notificationRoutes.get('/unread-count', async (c) => {
  try {
    const { DB } = c.env;
    const userId = parseInt(c.req.header('X-User-ID') || '0');

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const stmt = DB.prepare(`
      SELECT COUNT(*) as unread_count 
      FROM communication_notifications 
      WHERE user_id = ? AND read_at IS NULL
    `);
    
    const result = await stmt.bind(userId).first() as { unread_count: number };

    return c.json({
      success: true,
      unreadCount: result.unread_count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting unread count' 
    }, 500);
  }
});

/**
 * Mark notifications as read
 * PUT /api/notifications/mark-read
 */
notificationRoutes.put('/mark-read', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { notificationIds, markAll = false } = body;

    let result;
    if (markAll) {
      result = await notificationService.markAllAsRead(userId);
    } else if (notificationIds && Array.isArray(notificationIds)) {
      result = await notificationService.markNotificationsAsRead(notificationIds, userId);
    } else {
      return c.json({ 
        success: false, 
        error: 'Either notificationIds array or markAll flag required' 
      }, 400);
    }

    if (result.success) {
      return c.json({
        success: true,
        message: markAll ? 'All notifications marked as read' : 'Notifications marked as read'
      });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }

  } catch (error) {
    console.error('Mark notifications read error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error marking notifications as read' 
    }, 500);
  }
});

/**
 * Create a new notification (admin/system use)
 * POST /api/notifications
 */
notificationRoutes.post('/', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    // Only admin or system can create notifications manually
    if (userRole !== 'admin') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const body = await c.req.json();
    const {
      targetUserId,
      notificationType,
      title,
      message,
      data,
      priority,
      channels,
      scheduledFor,
      expiresAt,
      relatedEntityType,
      relatedEntityId
    } = body;

    if (!targetUserId || !notificationType || !title || !message) {
      return c.json({ 
        success: false, 
        error: 'targetUserId, notificationType, title, and message are required' 
      }, 400);
    }

    const notificationData: CreateNotificationData = {
      userId: targetUserId,
      notificationType,
      title,
      message,
      data,
      priority,
      channels,
      scheduledFor,
      expiresAt,
      relatedEntityType,
      relatedEntityId
    };

    const result = await notificationService.createNotification(notificationData);

    if (result.success) {
      return c.json({
        success: true,
        notification: result.notification,
        message: 'Notification created successfully'
      });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }

  } catch (error) {
    console.error('Create notification error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error creating notification' 
    }, 500);
  }
});

/**
 * Get user notification preferences
 * GET /api/notifications/preferences
 */
notificationRoutes.get('/preferences', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const notificationType = c.req.query('type') as any;

    const preferences = await notificationService.getUserPreferences(userId, notificationType);

    return c.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting preferences' 
    }, 500);
  }
});

/**
 * Update user notification preferences
 * PUT /api/notifications/preferences
 */
notificationRoutes.put('/preferences', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { 
      notificationType, 
      channels, 
      enabled, 
      quietHoursStart, 
      quietHoursEnd, 
      frequencyLimit, 
      batchDelivery 
    } = body;

    if (!notificationType) {
      return c.json({ 
        success: false, 
        error: 'notificationType is required' 
      }, 400);
    }

    const result = await notificationService.updateNotificationPreferences(
      userId, 
      notificationType, 
      {
        channels,
        enabled,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        frequency_limit: frequencyLimit,
        batch_delivery: batchDelivery
      }
    );

    if (result.success) {
      return c.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }

  } catch (error) {
    console.error('Update preferences error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error updating preferences' 
    }, 500);
  }
});

/**
 * Get notification analytics
 * GET /api/notifications/analytics
 */
notificationRoutes.get('/analytics', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const startDate = c.req.query('start');
    const endDate = c.req.query('end');
    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

    const analytics = await notificationService.getNotificationAnalytics(
      userRole === 'admin' ? undefined : userId,
      userRole,
      dateRange
    );

    return c.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting analytics' 
    }, 500);
  }
});

/**
 * Real-time notification stream via Server-Sent Events
 * GET /api/notifications/stream
 */
notificationRoutes.get('/stream', async (c) => {
  const userId = parseInt(c.req.header('X-User-ID') || '0');

  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  // Set up Server-Sent Events
  return new Response(
    new ReadableStream({
      start(controller) {
        // Send initial connection message
        const data = `data: ${JSON.stringify({ 
          type: 'connected', 
          timestamp: new Date().toISOString() 
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));

        // Set up periodic heartbeat (every 30 seconds)
        const heartbeat = setInterval(() => {
          const heartbeatData = `data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: new Date().toISOString() 
          })}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(heartbeatData));
          } catch (error) {
            console.error('Heartbeat failed:', error);
            clearInterval(heartbeat);
          }
        }, 30000);

        // In production, you would:
        // 1. Set up database listeners for new notifications
        // 2. Subscribe to notification events
        // 3. Send real-time updates when notifications are created/updated
        
        // Cleanup on disconnect
        setTimeout(() => {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch (error) {
            console.error('Stream close error:', error);
          }
        }, 3600000); // Close after 1 hour
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    }
  );
});

/**
 * Test notification creation (development helper)
 * POST /api/notifications/test
 */
notificationRoutes.post('/test', async (c) => {
  try {
    const { DB } = c.env;
    const notificationService = new NotificationSystemService(DB);

    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const body = await c.req.json();
    const { testType = 'message' } = body;

    let notificationData: CreateNotificationData;

    switch (testType) {
      case 'message':
        notificationData = createMessageNotification(
          userId,
          'Test User',
          'This is a test message notification',
          1
        );
        break;
      
      case 'job_update':
        notificationData = createJobUpdateNotification(
          userId,
          'Test Job',
          'completed',
          1
        );
        break;
      
      case 'invoice':
        notificationData = createInvoiceNotification(
          userId,
          'TEST001',
          150.00,
          'created',
          1
        );
        break;
      
      case 'file_shared':
        notificationData = createFileSharedNotification(
          userId,
          'test-document.pdf',
          'Test User',
          1
        );
        break;
      
      default:
        return c.json({ 
          success: false, 
          error: 'Invalid test type. Use: message, job_update, invoice, file_shared' 
        }, 400);
    }

    const result = await notificationService.createNotification(notificationData);

    if (result.success) {
      return c.json({
        success: true,
        notification: result.notification,
        message: `Test ${testType} notification created successfully`
      });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }

  } catch (error) {
    console.error('Test notification error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error creating test notification' 
    }, 500);
  }
});

/**
 * Get notification by ID
 * GET /api/notifications/:notificationId
 */
notificationRoutes.get('/:notificationId', async (c) => {
  try {
    const { DB } = c.env;
    const notificationId = parseInt(c.req.param('notificationId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Get notification with permission check
    let query = `
      SELECT * FROM communication_notifications 
      WHERE id = ? AND (user_id = ? OR ? = 'admin')
    `;
    
    const stmt = DB.prepare(query);
    const notification = await stmt.bind(notificationId, userId, userRole).first();

    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }

    return c.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Get notification error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error getting notification' 
    }, 500);
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:notificationId
 */
notificationRoutes.delete('/:notificationId', async (c) => {
  try {
    const { DB } = c.env;
    const notificationId = parseInt(c.req.param('notificationId'));
    const userId = parseInt(c.req.header('X-User-ID') || '0');
    const userRole = c.req.header('X-User-Role') || 'client';

    if (!userId) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Check if notification exists and user has permission
    const checkStmt = DB.prepare(`
      SELECT id FROM communication_notifications 
      WHERE id = ? AND (user_id = ? OR ? = 'admin')
    `);
    const exists = await checkStmt.bind(notificationId, userId, userRole).first();

    if (!exists) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }

    // Delete notification
    const deleteStmt = DB.prepare(`
      DELETE FROM communication_notifications WHERE id = ?
    `);
    await deleteStmt.bind(notificationId).run();

    return c.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return c.json({ 
      success: false, 
      error: 'Internal server error deleting notification' 
    }, 500);
  }
});

export default notificationRoutes;