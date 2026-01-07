import type Database from 'better-sqlite3';
import { Insight, InsightType, InsightStatus } from '../../types';
import { DatabaseClient } from '../client';

export class InsightRepository {
  private db: Database.Database;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient.getDb();
  }

  /**
   * Create a new insight
   */
  create(input: {
    type: InsightType;
    title: string;
    content: string;
    confidence_score: number;
    impact_prediction?: string;
    metadata?: Record<string, any>;
  }): Insight {
    const id = DatabaseClient.uuid();
    const now = DatabaseClient.now();

    const stmt = this.db.prepare(`
      INSERT INTO insights (id, type, title, content, confidence_score, status, impact_prediction, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.type,
      input.title,
      input.content,
      input.confidence_score,
      'pending_review',
      input.impact_prediction || null,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(id)!;
  }

  /**
   * Find insight by ID
   */
  findById(id: string): Insight | null {
    const stmt = this.db.prepare('SELECT * FROM insights WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToInsight(row) : null;
  }

  /**
   * Get all pending insights
   */
  getPending(): Insight[] {
    const stmt = this.db.prepare(`
      SELECT * FROM insights
      WHERE status = 'pending_review'
      ORDER BY confidence_score DESC, created_at DESC
    `);
    return stmt.all().map(row => this.mapRowToInsight(row as any));
  }

  /**
   * Get insights by status
   */
  findByStatus(status: InsightStatus): Insight[] {
    const stmt = this.db.prepare(`
      SELECT * FROM insights
      WHERE status = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(status).map(row => this.mapRowToInsight(row as any));
  }

  /**
   * Update insight status
   */
  updateStatus(id: string, status: InsightStatus): Insight | null {
    const now = DatabaseClient.now();
    const stmt = this.db.prepare(`
      UPDATE insights
      SET status = ?, reviewed_at = ?
      WHERE id = ?
    `);
    stmt.run(status, now, id);
    return this.findById(id);
  }

  /**
   * Detect notification timing patterns
   * Analyzes when user actually opens notifications to suggest optimal send times
   */
  detectNotificationPatterns(): Insight | null {
    const stmt = this.db.prepare(`
      SELECT
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as opens
      FROM activity_log
      WHERE event_type = 'notification_opened'
        AND timestamp > datetime('now', '-14 days')
      GROUP BY hour
      ORDER BY opens DESC
      LIMIT 1
    `);

    const result = stmt.get() as any;

    if (!result || result.opens < 5) {
      return null; // Not enough data
    }

    const peakHour = result.hour;
    const confidence = Math.min(result.opens / 20, 1); // Max confidence at 20+ opens

    return this.create({
      type: 'pattern',
      title: `Peak notification response time: ${peakHour}:00`,
      content: `You're most likely to respond to notifications around ${peakHour}:00. I've detected ${result.opens} notification opens in the past 2 weeks at this time.`,
      confidence_score: confidence,
      impact_prediction: 'Scheduling notifications at this time could increase engagement by 40%',
      metadata: { peak_hour: peakHour, sample_size: result.opens }
    });
  }

  /**
   * Detect task completion patterns
   * Identifies which types of tasks get completed vs abandoned
   */
  detectTaskCompletionPatterns(): Insight[] {
    const insights: Insight[] = [];

    // Check if high-priority tasks are being ignored
    const highPriorityStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE priority >= 80
        AND created_at > datetime('now', '-30 days')
    `);

    const highPriResult = highPriorityStmt.get() as any;

    if (highPriResult.total >= 10) {
      const completionRate = highPriResult.completed / highPriResult.total;

      if (completionRate < 0.4) {
        insights.push(this.create({
          type: 'pattern',
          title: 'High-priority tasks have low completion rate',
          content: `Only ${Math.round(completionRate * 100)}% of your high-priority tasks (80+) are getting completed. This suggests either tasks are being over-prioritized, or there are blockers preventing completion.`,
          confidence_score: 0.8,
          impact_prediction: 'Adjusting priority algorithm or adding blocker tracking could improve task completion by 30%',
          metadata: { completion_rate: completionRate, sample_size: highPriResult.total }
        }));
      }
    }

    // Check task source effectiveness
    const sourceStmt = this.db.prepare(`
      SELECT
        source,
        COUNT(*) as total,
        SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
        AVG(CAST((julianday(completed_at) - julianday(created_at)) * 24 AS REAL)) as avg_hours_to_complete
      FROM tasks
      WHERE created_at > datetime('now', '-30 days')
      GROUP BY source
      HAVING total >= 5
    `);

    const sources = sourceStmt.all() as any[];

    sources.forEach(src => {
      const completionRate = src.completed / src.total;

      if (completionRate > 0.8 && src.source !== 'mono_work') {
        insights.push(this.create({
          type: 'pattern',
          title: `${src.source} tasks have high completion rate`,
          content: `Tasks from ${src.source} have a ${Math.round(completionRate * 100)}% completion rate, averaging ${Math.round(src.avg_hours_to_complete)}h to complete. This is a reliable source.`,
          confidence_score: Math.min(src.total / 20, 0.9),
          impact_prediction: 'Could prioritize tasks from this source higher',
          metadata: { source: src.source, completion_rate: completionRate, sample_size: src.total }
        }));
      }
    });

    return insights;
  }

  /**
   * Suggest new features based on usage patterns
   */
  suggestFeatures(): Insight[] {
    const insights: Insight[] = [];

    // Check if user is creating a lot of manual tasks (could use templates)
    const manualTasksStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE source = 'manual'
        AND created_at > datetime('now', '-7 days')
    `);

    const manualResult = manualTasksStmt.get() as any;

    if (manualResult.count > 20) {
      insights.push(this.create({
        type: 'feature_proposal',
        title: 'Add task templates feature',
        content: `You've created ${manualResult.count} manual tasks in the past week. A task template system could save you time by letting you quickly create recurring task types.`,
        confidence_score: 0.75,
        impact_prediction: 'Could reduce task creation time by 60%',
        metadata: { manual_tasks_count: manualResult.count }
      }));
    }

    // Check if user is working late (could suggest better work boundaries)
    const lateWorkStmt = this.db.prepare(`
      SELECT COUNT(*) as late_sessions
      FROM activity_log
      WHERE event_type = 'task_started'
        AND CAST(strftime('%H', timestamp) AS INTEGER) >= 1
        AND CAST(strftime('%H', timestamp) AS INTEGER) <= 5
        AND timestamp > datetime('now', '-14 days')
    `);

    const lateWork = lateWorkStmt.get() as any;

    if (lateWork.late_sessions > 5) {
      insights.push(this.create({
        type: 'suggestion',
        title: 'You\'re working very late regularly',
        content: `I've detected ${lateWork.late_sessions} work sessions between 1 AM - 5 AM in the past 2 weeks. While you're productive 8pm-12am, working past midnight might hurt your consistency.`,
        confidence_score: 0.85,
        impact_prediction: 'Setting a hard stop at 12:30 AM could improve next-day productivity',
        metadata: { late_sessions: lateWork.late_sessions }
      }));
    }

    return insights;
  }

  /**
   * Run all pattern detection and feature suggestions
   * This should be called periodically (e.g., daily) or when enough new activity has occurred
   */
  runAnalysis(): Insight[] {
    const allInsights: Insight[] = [];

    // Detect patterns
    const notificationPattern = this.detectNotificationPatterns();
    if (notificationPattern) allInsights.push(notificationPattern);

    allInsights.push(...this.detectTaskCompletionPatterns());
    allInsights.push(...this.suggestFeatures());

    return allInsights;
  }

  /**
   * Map database row to Insight
   */
  private mapRowToInsight(row: any): Insight {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      confidence_score: row.confidence_score,
      status: row.status,
      impact_prediction: row.impact_prediction,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}
