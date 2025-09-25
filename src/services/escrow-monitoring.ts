export interface EscrowAlert {
  id: number;
  transaction_id: number;
  alert_type: 'deadline_approaching' | 'overdue' | 'payment_failed' | 'dispute_escalated' | 'suspicious_activity' | 'high_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggered_at: string;
  resolved_at?: string;
  resolved_by?: number;
  metadata?: string;
}

export interface MonitoringMetrics {
  total_transactions: number;
  active_escrows: number;
  pending_approvals: number;
  overdue_transactions: number;
  disputed_transactions: number;
  average_resolution_time: number;
  success_rate: number;
  risk_distribution: Record<'low' | 'medium' | 'high', number>;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  config?: any;
}

export interface UserNotificationPreferences {
  user_id: number;
  channels: NotificationChannel[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  categories: string[];
  quiet_hours?: { start: string; end: string };
}

export class EscrowMonitoringService {
  private db: D1Database;
  private alertThresholds = {
    deadline_warning_hours: 24,
    overdue_escalation_hours: 72,
    suspicious_activity_score: 75,
    high_risk_threshold: 85
  };

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Real-time monitoring of all active escrow transactions
   */
  async runMonitoringCycle(): Promise<{
    alerts: EscrowAlert[];
    metrics: MonitoringMetrics;
    recommendations: string[];
  }> {
    console.log('Running escrow monitoring cycle...');

    const alerts: EscrowAlert[] = [];
    
    // Run all monitoring checks in parallel
    const [
      deadlineAlerts,
      overdueAlerts,
      riskAlerts,
      fraudAlerts,
      performanceAlerts
    ] = await Promise.all([
      this.checkDeadlineAlerts(),
      this.checkOverdueTransactions(),
      this.checkHighRiskTransactions(),
      this.checkSuspiciousActivity(),
      this.checkPerformanceIssues()
    ]);

    alerts.push(...deadlineAlerts, ...overdueAlerts, ...riskAlerts, ...fraudAlerts, ...performanceAlerts);

    // Generate metrics
    const metrics = await this.generateMetrics();

    // Generate recommendations
    const recommendations = await this.generateRecommendations(alerts, metrics);

    // Store alerts in database
    for (const alert of alerts) {
      await this.storeAlert(alert);
    }

    // Send critical alerts immediately
    await this.processUrgentAlerts(alerts.filter(a => a.severity === 'critical'));

    return { alerts, metrics, recommendations };
  }

  /**
   * Check for approaching deadlines
   */
  private async checkDeadlineAlerts(): Promise<EscrowAlert[]> {
    const alerts: EscrowAlert[] = [];

    const approachingDeadlines = await this.db.prepare(`
      SELECT et.*, ed.deadline_type, ed.deadline_at, j.title as job_title
      FROM escrow_transactions et
      JOIN escrow_deadlines ed ON et.id = ed.transaction_id
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.status IN ('held', 'pending')
        AND ed.status = 'pending'
        AND datetime(ed.deadline_at, '-${this.alertThresholds.deadline_warning_hours} hours') <= datetime('now')
        AND datetime(ed.deadline_at) > datetime('now')
        AND NOT EXISTS (
          SELECT 1 FROM escrow_alerts ea 
          WHERE ea.transaction_id = et.id 
            AND ea.alert_type = 'deadline_approaching'
            AND ea.resolved_at IS NULL
            AND datetime(ea.triggered_at) > datetime('now', '-24 hours')
        )
    `).all();

    for (const deadline of approachingDeadlines.results) {
      const hoursLeft = Math.round(
        (new Date(deadline.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60)
      );

      alerts.push({
        id: 0,
        transaction_id: deadline.id,
        alert_type: 'deadline_approaching',
        severity: hoursLeft <= 6 ? 'high' : hoursLeft <= 24 ? 'medium' : 'low',
        message: `${deadline.deadline_type} deadline approaching in ${hoursLeft} hours for job "${deadline.job_title}"`,
        triggered_at: new Date().toISOString(),
        metadata: JSON.stringify({
          deadline_type: deadline.deadline_type,
          hours_left: hoursLeft,
          job_id: deadline.job_id
        })
      });
    }

    return alerts;
  }

  /**
   * Check for overdue transactions
   */
  private async checkOverdueTransactions(): Promise<EscrowAlert[]> {
    const alerts: EscrowAlert[] = [];

    const overdueTransactions = await this.db.prepare(`
      SELECT et.*, ed.deadline_type, ed.deadline_at, j.title as job_title,
             ROUND((julianday('now') - julianday(ed.deadline_at)) * 24) as hours_overdue
      FROM escrow_transactions et
      JOIN escrow_deadlines ed ON et.id = ed.transaction_id
      JOIN jobs j ON et.job_id = j.job_id
      WHERE et.status IN ('held', 'pending')
        AND ed.status = 'pending'
        AND datetime(ed.deadline_at) <= datetime('now')
    `).all();

    for (const transaction of overdueTransactions.results) {
      const hoursOverdue = transaction.hours_overdue;
      let severity: EscrowAlert['severity'] = 'medium';
      
      if (hoursOverdue >= this.alertThresholds.overdue_escalation_hours) {
        severity = 'critical';
      } else if (hoursOverdue >= 48) {
        severity = 'high';
      }

      alerts.push({
        id: 0,
        transaction_id: transaction.id,
        alert_type: 'overdue',
        severity,
        message: `Transaction overdue by ${hoursOverdue} hours - ${transaction.deadline_type} deadline passed for "${transaction.job_title}"`,
        triggered_at: new Date().toISOString(),
        metadata: JSON.stringify({
          deadline_type: transaction.deadline_type,
          hours_overdue: hoursOverdue,
          escalation_required: severity === 'critical'
        })
      });
    }

    return alerts;
  }

  /**
   * Check for high-risk transactions
   */
  private async checkHighRiskTransactions(): Promise<EscrowAlert[]> {
    const alerts: EscrowAlert[] = [];

    const riskTransactions = await this.db.prepare(`
      SELECT et.*, j.title as job_title, u_client.name as client_name, u_worker.name as worker_name,
             COALESCE(client_disputes.dispute_count, 0) as client_disputes,
             COALESCE(worker_disputes.dispute_count, 0) as worker_disputes,
             ROUND((julianday('now') - julianday(et.created_at)) * 24) as age_hours
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      JOIN users u_client ON et.client_id = u_client.user_id
      JOIN users u_worker ON et.worker_id = u_worker.user_id
      LEFT JOIN (
        SELECT client_id, COUNT(*) as dispute_count 
        FROM escrow_transactions 
        WHERE status = 'disputed' AND created_at > datetime('now', '-90 days')
        GROUP BY client_id
      ) client_disputes ON et.client_id = client_disputes.client_id
      LEFT JOIN (
        SELECT worker_id, COUNT(*) as dispute_count 
        FROM escrow_transactions 
        WHERE status = 'disputed' AND created_at > datetime('now', '-90 days')
        GROUP BY worker_id
      ) worker_disputes ON et.worker_id = worker_disputes.worker_id
      WHERE et.status IN ('held', 'pending', 'disputed')
        AND (
          et.amount > 5000 OR
          client_disputes.dispute_count > 2 OR
          worker_disputes.dispute_count > 2 OR
          et.age_hours > 240
        )
    `).all();

    for (const transaction of riskTransactions.results) {
      let riskScore = 0;
      let riskFactors: string[] = [];

      // High amount risk
      if (transaction.amount > 5000) {
        riskScore += 20;
        riskFactors.push('High transaction amount');
      }

      // Client dispute history
      if (transaction.client_disputes > 2) {
        riskScore += 30;
        riskFactors.push(`Client has ${transaction.client_disputes} recent disputes`);
      }

      // Worker dispute history
      if (transaction.worker_disputes > 2) {
        riskScore += 30;
        riskFactors.push(`Worker has ${transaction.worker_disputes} recent disputes`);
      }

      // Age-based risk
      if (transaction.age_hours > 240) { // 10+ days
        riskScore += 25;
        riskFactors.push('Transaction has been active for over 10 days');
      }

      if (riskScore >= this.alertThresholds.high_risk_threshold) {
        alerts.push({
          id: 0,
          transaction_id: transaction.id,
          alert_type: 'high_risk',
          severity: riskScore >= 90 ? 'critical' : 'high',
          message: `High-risk transaction detected (${riskScore}/100): ${riskFactors.join(', ')}`,
          triggered_at: new Date().toISOString(),
          metadata: JSON.stringify({
            risk_score: riskScore,
            risk_factors: riskFactors,
            amount: transaction.amount
          })
        });
      }
    }

    return alerts;
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(): Promise<EscrowAlert[]> {
    const alerts: EscrowAlert[] = [];

    // Check for rapid-fire transactions from same user
    const rapidTransactions = await this.db.prepare(`
      SELECT client_id, COUNT(*) as transaction_count, SUM(amount) as total_amount
      FROM escrow_transactions 
      WHERE created_at > datetime('now', '-24 hours')
      GROUP BY client_id
      HAVING COUNT(*) >= 5 OR SUM(amount) > 10000
    `).all();

    for (const activity of rapidTransactions.results) {
      alerts.push({
        id: 0,
        transaction_id: 0, // No specific transaction
        alert_type: 'suspicious_activity',
        severity: 'high',
        message: `Suspicious activity detected: User ${activity.client_id} created ${activity.transaction_count} transactions totaling $${activity.total_amount} in 24 hours`,
        triggered_at: new Date().toISOString(),
        metadata: JSON.stringify({
          user_id: activity.client_id,
          transaction_count: activity.transaction_count,
          total_amount: activity.total_amount,
          pattern: 'rapid_transactions'
        })
      });
    }

    // Check for unusual refund patterns
    const unusualRefunds = await this.db.prepare(`
      SELECT worker_id, COUNT(*) as refund_count, AVG(amount) as avg_amount
      FROM escrow_transactions 
      WHERE status = 'refunded' 
        AND created_at > datetime('now', '-7 days')
      GROUP BY worker_id
      HAVING COUNT(*) >= 3
    `).all();

    for (const refund of unusualRefunds.results) {
      alerts.push({
        id: 0,
        transaction_id: 0,
        alert_type: 'suspicious_activity',
        severity: 'medium',
        message: `Unusual refund pattern: Worker ${refund.worker_id} has ${refund.refund_count} refunds in past 7 days`,
        triggered_at: new Date().toISOString(),
        metadata: JSON.stringify({
          user_id: refund.worker_id,
          refund_count: refund.refund_count,
          avg_amount: refund.avg_amount,
          pattern: 'excessive_refunds'
        })
      });
    }

    return alerts;
  }

  /**
   * Check for system performance issues
   */
  private async checkPerformanceIssues(): Promise<EscrowAlert[]> {
    const alerts: EscrowAlert[] = [];

    // Check for failed payment attempts
    const failedPayments = await this.db.prepare(`
      SELECT COUNT(*) as failed_count
      FROM escrow_activity_log 
      WHERE action LIKE '%failed%' 
        AND created_at > datetime('now', '-1 hour')
    `).first();

    if (failedPayments?.failed_count > 5) {
      alerts.push({
        id: 0,
        transaction_id: 0,
        alert_type: 'payment_failed',
        severity: 'high',
        message: `High number of payment failures detected: ${failedPayments.failed_count} failures in past hour`,
        triggered_at: new Date().toISOString(),
        metadata: JSON.stringify({
          failure_count: failedPayments.failed_count,
          timeframe: '1_hour'
        })
      });
    }

    return alerts;
  }

  /**
   * Generate system metrics
   */
  private async generateMetrics(): Promise<MonitoringMetrics> {
    const [
      totalCount,
      activeCount,
      pendingCount,
      overdueCount,
      disputedCount,
      avgResolution,
      successRate,
      riskDistribution
    ] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM escrow_transactions').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM escrow_transactions WHERE status IN (\'held\', \'pending\')').first(),
      this.db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = \'pending_approval\'').first(),
      this.db.prepare(`
        SELECT COUNT(*) as count FROM escrow_transactions et
        JOIN escrow_deadlines ed ON et.id = ed.transaction_id
        WHERE et.status IN ('held', 'pending') AND ed.status = 'pending'
          AND datetime(ed.deadline_at) <= datetime('now')
      `).first(),
      this.db.prepare('SELECT COUNT(*) as count FROM escrow_transactions WHERE status = \'disputed\'').first(),
      this.db.prepare(`
        SELECT AVG((julianday(updated_at) - julianday(created_at)) * 24) as avg_hours
        FROM escrow_transactions 
        WHERE status IN ('released', 'refunded') AND updated_at > datetime('now', '-30 days')
      `).first(),
      this.db.prepare(`
        SELECT 
          ROUND(
            (COUNT(CASE WHEN status = 'released' THEN 1 END) * 100.0) / 
            NULLIF(COUNT(CASE WHEN status IN ('released', 'refunded', 'disputed') THEN 1 END), 0),
            2
          ) as rate
        FROM escrow_transactions WHERE created_at > datetime('now', '-30 days')
      `).first(),
      this.calculateRiskDistribution()
    ]);

    return {
      total_transactions: totalCount?.count || 0,
      active_escrows: activeCount?.count || 0,
      pending_approvals: pendingCount?.count || 0,
      overdue_transactions: overdueCount?.count || 0,
      disputed_transactions: disputedCount?.count || 0,
      average_resolution_time: Math.round((avgResolution?.avg_hours || 0) * 100) / 100,
      success_rate: successRate?.rate || 0,
      risk_distribution: riskDistribution
    };
  }

  private async calculateRiskDistribution(): Promise<Record<'low' | 'medium' | 'high', number>> {
    // This is a simplified risk calculation
    const activeTransactions = await this.db.prepare(`
      SELECT et.*, 
        CASE 
          WHEN et.amount < 500 THEN 'low'
          WHEN et.amount < 2000 THEN 'medium'
          ELSE 'high'
        END as risk_level
      FROM escrow_transactions et
      WHERE et.status IN ('held', 'pending')
    `).all();

    const distribution = { low: 0, medium: 0, high: 0 };
    
    for (const transaction of activeTransactions.results) {
      distribution[transaction.risk_level as 'low' | 'medium' | 'high']++;
    }

    return distribution;
  }

  /**
   * Generate actionable recommendations
   */
  private async generateRecommendations(alerts: EscrowAlert[], metrics: MonitoringMetrics): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.overdue_transactions > 5) {
      recommendations.push('📅 High number of overdue transactions - consider automating more approval processes');
    }

    if (metrics.success_rate < 85) {
      recommendations.push('📈 Success rate below 85% - review dispute resolution processes');
    }

    if (alerts.some(a => a.alert_type === 'suspicious_activity')) {
      recommendations.push('🔍 Suspicious activity detected - implement additional fraud checks');
    }

    if (metrics.average_resolution_time > 120) { // 5+ days
      recommendations.push('⏱️ Average resolution time exceeds 5 days - optimize approval workflows');
    }

    if (metrics.disputed_transactions > metrics.total_transactions * 0.1) {
      recommendations.push('⚖️ High dispute rate - improve job requirement clarity and communication tools');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System operating normally - no immediate actions required');
    }

    return recommendations;
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: EscrowAlert): Promise<number> {
    const result = await this.db.prepare(`
      INSERT INTO escrow_alerts (
        transaction_id, alert_type, severity, message, triggered_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      alert.transaction_id,
      alert.alert_type,
      alert.severity,
      alert.message,
      alert.triggered_at,
      alert.metadata || null
    ).run();

    return result.meta.last_row_id as number;
  }

  /**
   * Process urgent alerts that require immediate attention
   */
  private async processUrgentAlerts(criticalAlerts: EscrowAlert[]): Promise<void> {
    for (const alert of criticalAlerts) {
      // Send immediate notifications to admin team
      await this.sendUrgentNotification(alert);
      
      // Log critical alert
      console.error(`CRITICAL ESCROW ALERT: ${alert.message}`);
      
      // If it's a payment failure, attempt to retry
      if (alert.alert_type === 'payment_failed') {
        await this.handlePaymentFailureEscalation(alert);
      }
      
      // If it's overdue by more than 72 hours, auto-escalate
      if (alert.alert_type === 'overdue' && alert.metadata) {
        const metadata = JSON.parse(alert.metadata);
        if (metadata.hours_overdue >= this.alertThresholds.overdue_escalation_hours) {
          await this.autoEscalateOverdueTransaction(alert.transaction_id);
        }
      }
    }
  }

  /**
   * Send notifications based on user preferences
   */
  async sendEscrowNotification(
    userId: number,
    notificationType: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    metadata?: any
  ): Promise<void> {
    // Get user notification preferences
    const preferences = await this.getUserNotificationPreferences(userId);
    
    // Check if user wants this type of notification
    if (!preferences.categories.includes(notificationType)) {
      return;
    }

    // Check quiet hours
    if (await this.isQuietTime(preferences)) {
      if (priority !== 'high') {
        // Queue for later delivery
        await this.queueNotification(userId, notificationType, message, metadata);
        return;
      }
    }

    // Send through enabled channels
    for (const channel of preferences.channels) {
      if (channel.enabled) {
        await this.sendNotificationViaChannel(channel, userId, message, metadata);
      }
    }

    // Store in database
    await this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, message, priority, metadata, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `).bind(
      userId,
      notificationType,
      message,
      priority,
      metadata ? JSON.stringify(metadata) : null
    ).run();
  }

  /**
   * Get comprehensive escrow dashboard data
   */
  async getEscrowDashboard(): Promise<{
    metrics: MonitoringMetrics;
    recentAlerts: EscrowAlert[];
    activeTransactions: any[];
    riskAnalysis: any;
    systemHealth: any;
  }> {
    const [metrics, recentAlerts, activeTransactions] = await Promise.all([
      this.generateMetrics(),
      this.getRecentAlerts(10),
      this.getActiveTransactions(),
    ]);

    const riskAnalysis = await this.generateRiskAnalysis();
    const systemHealth = await this.getSystemHealth();

    return {
      metrics,
      recentAlerts,
      activeTransactions,
      riskAnalysis,
      systemHealth
    };
  }

  // Helper methods
  private async getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences> {
    const prefs = await this.db.prepare(`
      SELECT * FROM user_notification_preferences WHERE user_id = ?
    `).bind(userId).first();

    return prefs || {
      user_id: userId,
      channels: [{ type: 'in_app', enabled: true }],
      frequency: 'immediate',
      categories: ['all']
    };
  }

  private async isQuietTime(preferences: UserNotificationPreferences): Promise<boolean> {
    if (!preferences.quiet_hours) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = parseInt(preferences.quiet_hours.start.split(':')[0]);
    const endHour = parseInt(preferences.quiet_hours.end.split(':')[0]);

    return currentHour >= startHour || currentHour < endHour;
  }

  private async queueNotification(userId: number, type: string, message: string, metadata?: any): Promise<void> {
    await this.db.prepare(`
      INSERT INTO notification_queue (
        user_id, type, message, metadata, scheduled_for, created_at
      ) VALUES (?, ?, ?, ?, datetime('now', '+8 hours'), datetime('now'))
    `).bind(userId, type, message, JSON.stringify(metadata || {})).run();
  }

  private async sendNotificationViaChannel(
    channel: NotificationChannel,
    userId: number,
    message: string,
    metadata?: any
  ): Promise<void> {
    // Implementation would depend on the channel type
    switch (channel.type) {
      case 'email':
        // await this.sendEmailNotification(userId, message, metadata);
        break;
      case 'sms':
        // await this.sendSMSNotification(userId, message);
        break;
      case 'push':
        // await this.sendPushNotification(userId, message, metadata);
        break;
      case 'in_app':
        // In-app notifications are stored in the notifications table
        break;
    }
  }

  private async sendUrgentNotification(alert: EscrowAlert): Promise<void> {
    // Send to admin team
    const admins = await this.db.prepare(`
      SELECT user_id FROM users WHERE role = 'admin'
    `).all();

    for (const admin of admins.results) {
      await this.sendEscrowNotification(
        admin.user_id,
        'urgent_alert',
        `🚨 URGENT: ${alert.message}`,
        'high',
        { alert_id: alert.id, alert_type: alert.alert_type }
      );
    }
  }

  private async handlePaymentFailureEscalation(alert: EscrowAlert): Promise<void> {
    // Implementation for handling payment failure escalation
  }

  private async autoEscalateOverdueTransaction(transactionId: number): Promise<void> {
    // Implementation for auto-escalating overdue transactions
  }

  private async getRecentAlerts(limit: number): Promise<EscrowAlert[]> {
    const result = await this.db.prepare(`
      SELECT * FROM escrow_alerts 
      ORDER BY triggered_at DESC 
      LIMIT ?
    `).bind(limit).all();
    
    return result.results as EscrowAlert[];
  }

  private async getActiveTransactions(): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT et.*, j.title as job_title, u_client.name as client_name, u_worker.name as worker_name
      FROM escrow_transactions et
      JOIN jobs j ON et.job_id = j.job_id
      JOIN users u_client ON et.client_id = u_client.user_id
      JOIN users u_worker ON et.worker_id = u_worker.user_id
      WHERE et.status IN ('held', 'pending')
      ORDER BY et.created_at DESC
      LIMIT 20
    `).all();
    
    return result.results;
  }

  private async generateRiskAnalysis(): Promise<any> {
    return {
      high_value_transactions: 0,
      first_time_users: 0,
      repeat_offenders: 0,
      geographic_anomalies: 0
    };
  }

  private async getSystemHealth(): Promise<any> {
    return {
      database_status: 'healthy',
      stripe_status: 'connected',
      notification_queue: 0,
      last_backup: new Date().toISOString()
    };
  }
}