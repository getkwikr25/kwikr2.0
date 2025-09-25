export interface InvoiceAnalytics {
  id: number;
  report_date: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  total_invoices: number;
  total_amount: number;
  paid_invoices: number;
  paid_amount: number;
  overdue_invoices: number;
  overdue_amount: number;
  average_payment_time: number;
  collection_rate: number;
  standard_invoices: number;
  milestone_invoices: number;
  recurring_invoices: number;
  created_at: string;
}

export interface RevenueAnalytics {
  period: string;
  revenue: number;
  growth_rate: number;
  invoice_count: number;
  average_invoice_value: number;
}

export interface ClientAnalytics {
  client_id: number;
  client_name: string;
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  overdue_amount: number;
  last_payment_date?: string;
  payment_behavior: 'excellent' | 'good' | 'fair' | 'poor';
}

export class InvoiceAnalyticsService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Generate analytics report for a specific period
   */
  async generatePeriodAnalytics(
    period_type: InvoiceAnalytics['period_type'],
    report_date: string
  ): Promise<{ success: boolean; message: string; analytics?: InvoiceAnalytics }> {
    try {
      // Define date range based on period type
      const { start_date, end_date } = this.getPeriodRange(report_date, period_type);

      // Calculate analytics data
      const analytics = await this.calculateAnalytics(start_date, end_date, period_type, report_date);

      // Upsert analytics record
      await this.db.prepare(`
        INSERT OR REPLACE INTO invoice_analytics (
          report_date, period_type, total_invoices, total_amount, paid_invoices, paid_amount,
          overdue_invoices, overdue_amount, average_payment_time, collection_rate,
          standard_invoices, milestone_invoices, recurring_invoices, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        report_date,
        period_type,
        analytics.total_invoices,
        analytics.total_amount,
        analytics.paid_invoices,
        analytics.paid_amount,
        analytics.overdue_invoices,
        analytics.overdue_amount,
        analytics.average_payment_time,
        analytics.collection_rate,
        analytics.standard_invoices,
        analytics.milestone_invoices,
        analytics.recurring_invoices
      ).run();

      return {
        success: true,
        message: 'Analytics generated successfully',
        analytics: { ...analytics, id: 0, report_date, period_type, created_at: new Date().toISOString() }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to generate analytics: ${error.message}`
      };
    }
  }

  /**
   * Get revenue analytics over time
   */
  async getRevenueAnalytics(
    period_type: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    periods: number = 12
  ): Promise<RevenueAnalytics[]> {
    const result = await this.db.prepare(`
      SELECT 
        report_date as period,
        paid_amount as revenue,
        paid_invoices as invoice_count,
        CASE 
          WHEN paid_invoices > 0 THEN ROUND(paid_amount / paid_invoices, 2)
          ELSE 0 
        END as average_invoice_value
      FROM invoice_analytics 
      WHERE period_type = ?
      ORDER BY report_date DESC
      LIMIT ?
    `).bind(period_type, periods).all();

    const analytics = result.results as any[];

    // Calculate growth rates
    return analytics.map((item, index) => {
      let growth_rate = 0;
      if (index < analytics.length - 1) {
        const previousRevenue = analytics[index + 1].revenue;
        if (previousRevenue > 0) {
          growth_rate = ((item.revenue - previousRevenue) / previousRevenue) * 100;
        }
      }

      return {
        period: item.period,
        revenue: item.revenue,
        growth_rate: Math.round(growth_rate * 100) / 100,
        invoice_count: item.invoice_count,
        average_invoice_value: item.average_invoice_value
      };
    });
  }

  /**
   * Get client payment analytics
   */
  async getClientAnalytics(limit: number = 50): Promise<ClientAnalytics[]> {
    const result = await this.db.prepare(`
      SELECT 
        i.client_id,
        u.name as client_name,
        COUNT(i.id) as total_invoices,
        SUM(i.total_amount) as total_amount,
        SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN i.status = 'overdue' THEN i.total_amount ELSE 0 END) as overdue_amount,
        MAX(CASE WHEN i.status = 'paid' THEN i.paid_date END) as last_payment_date,
        AVG(
          CASE WHEN i.status = 'paid' AND i.paid_date IS NOT NULL 
          THEN julianday(i.paid_date) - julianday(i.due_date)
          END
        ) as avg_payment_delay
      FROM invoices i
      JOIN users u ON i.client_id = u.user_id
      WHERE i.created_at > datetime('now', '-12 months')
      GROUP BY i.client_id, u.name
      HAVING total_invoices > 0
      ORDER BY total_amount DESC
      LIMIT ?
    `).bind(limit).all();

    return (result.results as any[]).map(client => ({
      client_id: client.client_id,
      client_name: client.client_name,
      total_invoices: client.total_invoices,
      total_amount: client.total_amount || 0,
      paid_amount: client.paid_amount || 0,
      overdue_amount: client.overdue_amount || 0,
      last_payment_date: client.last_payment_date,
      payment_behavior: this.calculatePaymentBehavior(client.avg_payment_delay, client.overdue_amount, client.total_amount)
    }));
  }

  /**
   * Get invoice aging report
   */
  async getInvoiceAging(): Promise<{
    current: { count: number; amount: number };
    days_1_30: { count: number; amount: number };
    days_31_60: { count: number; amount: number };
    days_61_90: { count: number; amount: number };
    days_over_90: { count: number; amount: number };
  }> {
    const result = await this.db.prepare(`
      SELECT 
        SUM(CASE WHEN julianday('now') <= julianday(due_date) THEN 1 ELSE 0 END) as current_count,
        SUM(CASE WHEN julianday('now') <= julianday(due_date) THEN total_amount ELSE 0 END) as current_amount,
        
        SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 1 AND 30 THEN 1 ELSE 0 END) as days_1_30_count,
        SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 1 AND 30 THEN total_amount ELSE 0 END) as days_1_30_amount,
        
        SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 31 AND 60 THEN 1 ELSE 0 END) as days_31_60_count,
        SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 31 AND 60 THEN total_amount ELSE 0 END) as days_31_60_amount,
        
        SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 61 AND 90 THEN 1 ELSE 0 END) as days_61_90_count,
        SUM(CASE WHEN julianday('now') - julianday(due_date) BETWEEN 61 AND 90 THEN total_amount ELSE 0 END) as days_61_90_amount,
        
        SUM(CASE WHEN julianday('now') - julianday(due_date) > 90 THEN 1 ELSE 0 END) as days_over_90_count,
        SUM(CASE WHEN julianday('now') - julianday(due_date) > 90 THEN total_amount ELSE 0 END) as days_over_90_amount
      
      FROM invoices 
      WHERE status NOT IN ('paid', 'cancelled')
    `).first();

    return {
      current: { count: result?.current_count || 0, amount: result?.current_amount || 0 },
      days_1_30: { count: result?.days_1_30_count || 0, amount: result?.days_1_30_amount || 0 },
      days_31_60: { count: result?.days_31_60_count || 0, amount: result?.days_31_60_amount || 0 },
      days_61_90: { count: result?.days_61_90_count || 0, amount: result?.days_61_90_amount || 0 },
      days_over_90: { count: result?.days_over_90_count || 0, amount: result?.days_over_90_amount || 0 }
    };
  }

  /**
   * Get top performing workers by invoice revenue
   */
  async getTopWorkers(limit: number = 10, period_days: number = 90): Promise<Array<{
    worker_id: number;
    worker_name: string;
    total_invoices: number;
    total_revenue: number;
    paid_invoices: number;
    average_invoice_value: number;
    collection_rate: number;
  }>> {
    const result = await this.db.prepare(`
      SELECT 
        i.worker_id,
        u.name as worker_name,
        COUNT(i.id) as total_invoices,
        SUM(i.total_amount) as total_revenue,
        SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        AVG(i.total_amount) as average_invoice_value,
        CASE 
          WHEN COUNT(i.id) > 0 THEN ROUND((SUM(CASE WHEN i.status = 'paid' THEN 1.0 ELSE 0 END) / COUNT(i.id)) * 100, 2)
          ELSE 0 
        END as collection_rate
      FROM invoices i
      JOIN users u ON i.worker_id = u.user_id
      WHERE i.created_at > datetime('now', '-' || ? || ' days')
      GROUP BY i.worker_id, u.name
      HAVING total_invoices > 0
      ORDER BY total_revenue DESC
      LIMIT ?
    `).bind(period_days, limit).all();

    return result.results as any[];
  }

  /**
   * Get invoice status distribution
   */
  async getStatusDistribution(period_days: number = 30): Promise<Record<string, { count: number; amount: number }>> {
    const result = await this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as amount
      FROM invoices 
      WHERE created_at > datetime('now', '-' || ? || ' days')
      GROUP BY status
    `).bind(period_days).all();

    const distribution: Record<string, { count: number; amount: number }> = {};
    
    for (const row of result.results as any[]) {
      distribution[row.status] = {
        count: row.count,
        amount: row.amount || 0
      };
    }

    return distribution;
  }

  /**
   * Process overdue invoices and update statuses
   */
  async processOverdueInvoices(): Promise<{ updated: number; details: Array<{ invoice_id: number; days_overdue: number }> }> {
    // Get invoices that are overdue but not marked as such
    const overdueInvoices = await this.db.prepare(`
      SELECT id, invoice_number, due_date,
             CAST(julianday('now') - julianday(due_date) as INTEGER) as days_overdue
      FROM invoices 
      WHERE status IN ('sent', 'viewed', 'approved') 
        AND due_date < date('now')
    `).all();

    const updated = [];

    for (const invoice of overdueInvoices.results as any[]) {
      // Update status to overdue
      await this.db.prepare(`
        UPDATE invoices 
        SET status = 'overdue', updated_at = datetime('now')
        WHERE id = ?
      `).bind(invoice.id).run();

      // Log activity
      await this.db.prepare(`
        INSERT INTO invoice_activity_log (
          invoice_id, action, description, user_id, created_at
        ) VALUES (?, 'status_changed', ?, 0, datetime('now'))
      `).bind(
        invoice.id,
        `Invoice marked as overdue (${invoice.days_overdue} days past due)`
      ).run();

      updated.push({
        invoice_id: invoice.id,
        days_overdue: invoice.days_overdue
      });
    }

    console.log(`Processed ${updated.length} overdue invoices`);
    return { updated: updated.length, details: updated };
  }

  /**
   * Generate comprehensive dashboard data
   */
  async getDashboardData(): Promise<{
    summary: {
      total_revenue_ytd: number;
      total_invoices_ytd: number;
      average_invoice_value: number;
      collection_rate: number;
      overdue_amount: number;
    };
    revenue_trend: RevenueAnalytics[];
    aging_report: any;
    top_clients: ClientAnalytics[];
    top_workers: any[];
    status_distribution: any;
    recent_activity: any[];
  }> {
    const [
      summary,
      revenueTrend,
      agingReport,
      topClients,
      topWorkers,
      statusDistribution,
      recentActivity
    ] = await Promise.all([
      this.getYearToDateSummary(),
      this.getRevenueAnalytics('monthly', 6),
      this.getInvoiceAging(),
      this.getClientAnalytics(10),
      this.getTopWorkers(10),
      this.getStatusDistribution(30),
      this.getRecentActivity(20)
    ]);

    return {
      summary,
      revenue_trend: revenueTrend,
      aging_report: agingReport,
      top_clients: topClients,
      top_workers: topWorkers,
      status_distribution: statusDistribution,
      recent_activity: recentActivity
    };
  }

  // Private helper methods

  private getPeriodRange(report_date: string, period_type: string): { start_date: string; end_date: string } {
    const date = new Date(report_date);
    let start_date: Date;
    let end_date: Date;

    switch (period_type) {
      case 'daily':
        start_date = new Date(date);
        end_date = new Date(date);
        break;
      case 'weekly':
        start_date = new Date(date);
        start_date.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        end_date = new Date(start_date);
        end_date.setDate(start_date.getDate() + 6); // End of week (Saturday)
        break;
      case 'monthly':
        start_date = new Date(date.getFullYear(), date.getMonth(), 1);
        end_date = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3);
        start_date = new Date(date.getFullYear(), quarter * 3, 1);
        end_date = new Date(date.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'yearly':
        start_date = new Date(date.getFullYear(), 0, 1);
        end_date = new Date(date.getFullYear(), 11, 31);
        break;
      default:
        throw new Error('Invalid period type');
    }

    return {
      start_date: start_date.toISOString().split('T')[0],
      end_date: end_date.toISOString().split('T')[0]
    };
  }

  private async calculateAnalytics(
    start_date: string,
    end_date: string,
    period_type: string,
    report_date: string
  ): Promise<Omit<InvoiceAnalytics, 'id' | 'report_date' | 'period_type' | 'created_at'>> {
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_invoices,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END), 0) as overdue_amount,
        SUM(CASE WHEN invoice_type = 'standard' THEN 1 ELSE 0 END) as standard_invoices,
        SUM(CASE WHEN invoice_type = 'milestone' THEN 1 ELSE 0 END) as milestone_invoices,
        SUM(CASE WHEN invoice_type = 'recurring' THEN 1 ELSE 0 END) as recurring_invoices,
        AVG(
          CASE WHEN status = 'paid' AND paid_date IS NOT NULL 
          THEN julianday(paid_date) - julianday(due_date)
          END
        ) as avg_payment_delay
      FROM invoices 
      WHERE issue_date BETWEEN ? AND ?
    `).bind(start_date, end_date).first();

    const totalInvoices = result?.total_invoices || 0;
    const paidInvoices = result?.paid_invoices || 0;
    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) : 0;
    const avgPaymentTime = result?.avg_payment_delay || 0;

    return {
      total_invoices: totalInvoices,
      total_amount: result?.total_amount || 0,
      paid_invoices: paidInvoices,
      paid_amount: result?.paid_amount || 0,
      overdue_invoices: result?.overdue_invoices || 0,
      overdue_amount: result?.overdue_amount || 0,
      average_payment_time: Math.round(avgPaymentTime * 100) / 100,
      collection_rate: Math.round(collectionRate * 10000) / 100, // Convert to percentage with 2 decimal places
      standard_invoices: result?.standard_invoices || 0,
      milestone_invoices: result?.milestone_invoices || 0,
      recurring_invoices: result?.recurring_invoices || 0
    };
  }

  private calculatePaymentBehavior(
    avgPaymentDelay: number | null,
    overdueAmount: number,
    totalAmount: number
  ): ClientAnalytics['payment_behavior'] {
    const overdueRatio = totalAmount > 0 ? overdueAmount / totalAmount : 0;
    const delay = avgPaymentDelay || 0;

    if (overdueRatio > 0.3 || delay > 30) return 'poor';
    if (overdueRatio > 0.1 || delay > 7) return 'fair';
    if (delay <= 0 && overdueRatio === 0) return 'excellent';
    return 'good';
  }

  private async getYearToDateSummary(): Promise<any> {
    const currentYear = new Date().getFullYear();
    const result = await this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_revenue_ytd,
        COUNT(*) as total_invoices_ytd,
        AVG(total_amount) as average_invoice_value,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN status = 'paid' THEN 1.0 ELSE 0 END) / COUNT(*)) * 100, 2)
          ELSE 0 
        END as collection_rate,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END), 0) as overdue_amount
      FROM invoices 
      WHERE strftime('%Y', issue_date) = ?
    `).bind(currentYear.toString()).first();

    return {
      total_revenue_ytd: result?.total_revenue_ytd || 0,
      total_invoices_ytd: result?.total_invoices_ytd || 0,
      average_invoice_value: Math.round((result?.average_invoice_value || 0) * 100) / 100,
      collection_rate: result?.collection_rate || 0,
      overdue_amount: result?.overdue_amount || 0
    };
  }

  private async getRecentActivity(limit: number): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT ial.*, i.invoice_number, u.name as user_name
      FROM invoice_activity_log ial
      JOIN invoices i ON ial.invoice_id = i.id
      LEFT JOIN users u ON ial.user_id = u.user_id
      ORDER BY ial.created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return result.results;
  }
}