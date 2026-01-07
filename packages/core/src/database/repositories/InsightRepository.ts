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
   * THE MOAT - Advanced Analysis Methods
   */

  /**
   * Detect when tasks don't map to user's goals/projects (wasted effort)
   */
  detectGoalMisalignment(): Insight[] {
    const insights: Insight[] = [];

    // Get all tasks from last 30 days
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE created_at > datetime('now', '-30 days')
    `);
    const total = (totalStmt.get() as any).count;

    if (total < 10) return insights; // Not enough data

    // Count tasks with no project
    const unalignedStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE created_at > datetime('now', '-30 days')
        AND project_id IS NULL
    `);
    const unaligned = (unalignedStmt.get() as any).count;

    const unalignedPercent = (unaligned / total) * 100;

    if (unalignedPercent > 30) {
      insights.push(this.create({
        type: 'pattern',
        title: 'Many tasks don\'t map to your projects',
        content: `${Math.round(unalignedPercent)}% of your tasks (${unaligned}/${total}) in the last 30 days don't map to any of your projects. This suggests you're getting distracted or working on things that don't align with your $1M goal.`,
        confidence_score: Math.min(unalignedPercent / 100, 0.95),
        impact_prediction: 'Eliminating unaligned work could free up 30%+ of your time for high-value projects',
        metadata: { unaligned_count: unaligned, total_count: total, percent: unalignedPercent }
      }));
    }

    // Detect high-value projects being neglected
    const projectsStmt = this.db.prepare(`
      SELECT
        p.id,
        p.name,
        p.funding_amount,
        p.priority,
        COUNT(t.id) as task_count
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id AND t.created_at > datetime('now', '-30 days')
      WHERE p.status = 'active'
        AND p.funding_amount > 0
      GROUP BY p.id
      ORDER BY p.funding_amount DESC, p.priority DESC
    `);

    const projects = projectsStmt.all() as any[];

    if (projects.length > 0) {
      const topProject = projects[0];
      if (topProject.task_count < 5) {
        const fundingDisplay = `$${(topProject.funding_amount / 100).toLocaleString()}`;

        insights.push(this.create({
          type: 'suggestion',
          title: `${topProject.name} is being neglected`,
          content: `${topProject.name} has ${fundingDisplay} in potential funding but you've only created ${topProject.task_count} tasks for it in 30 days. This is your highest-value project - it should be your main focus.`,
          confidence_score: 0.85,
          impact_prediction: `Focusing on ${topProject.name} could secure ${fundingDisplay} funding and directly contribute to your $1M goal`,
          metadata: { project_id: topProject.id, project_name: topProject.name, task_count: topProject.task_count }
        }));
      }
    }

    return insights;
  }

  /**
   * Detect urgent deadlines and recommend immediate action
   */
  detectDeadlinePressure(): Insight[] {
    const insights: Insight[] = [];

    // Find tasks with deadlines in next 48 hours that aren't complete
    const urgentStmt = this.db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        p.funding_amount
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.completed_at IS NULL
        AND t.deadline IS NOT NULL
        AND datetime(t.deadline) <= datetime('now', '+2 days')
        AND datetime(t.deadline) >= datetime('now')
      ORDER BY t.deadline ASC
    `);

    const urgentTasks = urgentStmt.all() as any[];

    if (urgentTasks.length > 0) {
      const deadlineDate = new Date(urgentTasks[0].deadline);
      const hoursUntil = (deadlineDate.getTime() - Date.now()) / 3600000;
      const daysUntil = Math.ceil(hoursUntil / 24);

      const projectName = urgentTasks[0].project_name || 'Unknown Project';

      insights.push(this.create({
        type: 'suggestion',
        title: `Urgent: ${urgentTasks.length} tasks due in ${daysUntil} days`,
        content: `You have ${urgentTasks.length} incomplete tasks for ${projectName} due in ${daysUntil} days (${Math.round(hoursUntil)} hours). You need to clear your schedule and focus exclusively on these to hit the deadline.`,
        confidence_score: 0.95,
        impact_prediction: 'Missing this deadline could jeopardize funding or damage reputation',
        metadata: { urgent_task_count: urgentTasks.length, hours_until: hoursUntil, project: projectName }
      }));
    }

    return insights;
  }

  /**
   * Predict when user will hit financial goals based on current trajectory
   */
  predictFinancialTrajectory(): Insight[] {
    const insights: Insight[] = [];

    // Get $1M goal
    const goalStmt = this.db.prepare(`
      SELECT * FROM goals
      WHERE type = 'financial'
        AND status = 'active'
        AND target_amount >= 100000000
      ORDER BY target_amount DESC
      LIMIT 1
    `);

    const goal = goalStmt.get() as any;
    if (!goal) return insights;

    // Calculate total pending funding from projects
    const fundingStmt = this.db.prepare(`
      SELECT SUM(funding_amount) as total
      FROM projects
      WHERE funding_status = 'pending'
        OR funding_status = 'secured'
    `);

    const funding = (fundingStmt.get() as any).total || 0;
    const currentProgress = goal.current_progress + funding;

    const targetAmount = goal.target_amount;
    const targetDate = new Date(goal.target_date);
    const monthsUntilTarget = (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);

    const percentComplete = (currentProgress / targetAmount) * 100;

    if (percentComplete < 30 && monthsUntilTarget < 4) {
      // Less than 30% complete with less than 4 months to go
      const gap = targetAmount - currentProgress;
      const monthlyNeed = gap / monthsUntilTarget;

      insights.push(this.create({
        type: 'pattern',
        title: 'Financial trajectory: Behind schedule',
        content: `You're ${Math.round(percentComplete)}% toward your $1M goal with ${Math.round(monthsUntilTarget)} months left. At current pace, you'll miss the April 2026 deadline. You need to secure $${Math.round(monthlyNeed / 100).toLocaleString()}/month to catch up.`,
        confidence_score: 0.90,
        impact_prediction: 'Need to 3x funding pipeline or delay goal timeline',
        metadata: {
          percent_complete: percentComplete,
          months_remaining: monthsUntilTarget,
          monthly_need: monthlyNeed,
          gap: gap
        }
      }));
    }

    return insights;
  }

  /**
   * Detect excessive context switching between projects (kills momentum)
   */
  detectContextSwitching(): Insight[] {
    const insights: Insight[] = [];

    // Count distinct projects worked on in last 7 days
    const projectsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT project_id) as count
      FROM tasks
      WHERE project_id IS NOT NULL
        AND created_at > datetime('now', '-7 days')
    `);

    const projectCount = (projectsStmt.get() as any).count;

    if (projectCount >= 5) {
      insights.push(this.create({
        type: 'pattern',
        title: 'High context switching detected',
        content: `You're switching between ${projectCount} different projects this week. Research shows context switching reduces productivity by 40%. You should focus on 1-2 projects max per week to maintain momentum.`,
        confidence_score: 0.80,
        impact_prediction: 'Reducing to 2 projects/week could 2x your output quality and speed while maintaining momentum',
        metadata: { project_count: projectCount }
      }));
    }

    return insights;
  }

  /**
   * Detect causal patterns in task failures (blocked, dependencies, etc)
   */
  detectTaskFailurePatterns(): Insight[] {
    const insights: Insight[] = [];

    // Find tasks marked as blocked/having dependencies
    const blockedStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE metadata IS NOT NULL
        AND json_extract(metadata, '$.blocked') = 1
        AND created_at > datetime('now', '-30 days')
    `);

    const blocked = blockedStmt.get() as any;

    if (blocked.total >= 5) {
      const completionRate = blocked.total > 0 ? blocked.completed / blocked.total : 0;

      if (completionRate < 0.3) {
        insights.push(this.create({
          type: 'feature_proposal',
          title: 'Add dependency tracking system',
          content: `${blocked.total} tasks marked as "blocked" have only ${Math.round(completionRate * 100)}% completion rate. You need a proper dependency tracker to identify blockers early and unblock yourself faster.`,
          confidence_score: 0.75,
          impact_prediction: 'Dependency tracking could increase task completion rate by 50%',
          metadata: { blocked_tasks: blocked.total, completion_rate: completionRate }
        }));
      }
    }

    return insights;
  }

  /**
   * Run all pattern detection and feature suggestions
   * This should be called periodically (e.g., daily) or when enough new activity has occurred
   */
  runAnalysis(): Insight[] {
    const allInsights: Insight[] = [];

    // Basic patterns (already implemented)
    const notificationPattern = this.detectNotificationPatterns();
    if (notificationPattern) allInsights.push(notificationPattern);

    allInsights.push(...this.detectTaskCompletionPatterns());
    allInsights.push(...this.suggestFeatures());

    // THE MOAT - Advanced causal analysis
    allInsights.push(...this.detectGoalMisalignment());
    allInsights.push(...this.detectDeadlinePressure());
    allInsights.push(...this.predictFinancialTrajectory());
    allInsights.push(...this.detectContextSwitching());
    allInsights.push(...this.detectTaskFailurePatterns());

    return allInsights;
  }

  /**
   * Get insight readiness stats - shows what data is available for analysis
   */
  getReadinessStats(): {
    total_tasks: number;
    completed_tasks: number;
    high_priority_tasks: number;
    notification_events: number;
    manual_tasks_last_week: number;
    ready_for_analysis: boolean;
  } {
    // Count total tasks
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks');
    const total = (totalStmt.get() as any).count;

    // Count completed tasks
    const completedStmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed_at IS NOT NULL');
    const completed = (completedStmt.get() as any).count;

    // Count high priority tasks
    const highPriorityStmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks WHERE priority >= 80');
    const highPriority = (highPriorityStmt.get() as any).count;

    // Count notification events
    const notificationStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM activity_log
      WHERE event_type = 'notification_opened'
        AND timestamp > datetime('now', '-14 days')
    `);
    const notifications = (notificationStmt.get() as any).count;

    // Count manual tasks in last week
    const manualStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE source = 'manual'
        AND created_at > datetime('now', '-7 days')
    `);
    const manualTasks = (manualStmt.get() as any).count;

    // Determine if ready (need at least 10 tasks or some activity)
    const readyForAnalysis = total >= 10 || notifications >= 5 || manualTasks >= 15;

    return {
      total_tasks: total,
      completed_tasks: completed,
      high_priority_tasks: highPriority,
      notification_events: notifications,
      manual_tasks_last_week: manualTasks,
      ready_for_analysis: readyForAnalysis,
    };
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
