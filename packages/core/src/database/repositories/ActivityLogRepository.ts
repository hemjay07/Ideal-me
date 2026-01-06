import Database from 'better-sqlite3';
import { ActivityLog, ActivityEventType, EntityType } from '../../types';
import { DatabaseClient } from '../client';

export class ActivityLogRepository {
  private db: Database.Database;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient.getDb();
  }

  /**
   * Log an activity
   */
  log(
    eventType: ActivityEventType,
    entityType?: EntityType,
    entityId?: string,
    durationSeconds?: number,
    metadata?: Record<string, any>
  ): ActivityLog {
    const id = DatabaseClient.uuid();
    const now = DatabaseClient.now();

    const stmt = this.db.prepare(`
      INSERT INTO activity_log (
        id, event_type, entity_type, entity_id, duration_seconds, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      eventType,
      entityType || null,
      entityId || null,
      durationSeconds || null,
      now,
      metadata ? JSON.stringify(metadata) : null
    );

    return this.findById(id)!;
  }

  /**
   * Find activity by ID
   */
  findById(id: string): ActivityLog | null {
    const stmt = this.db.prepare('SELECT * FROM activity_log WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToActivity(row);
  }

  /**
   * Get recent activities
   */
  getRecent(limit: number = 50): ActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_log
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.mapRowToActivity(row));
  }

  /**
   * Get activities by event type
   */
  getByEventType(eventType: ActivityEventType, limit?: number): ActivityLog[] {
    let query = 'SELECT * FROM activity_log WHERE event_type = ? ORDER BY timestamp DESC';

    if (limit) {
      query += ' LIMIT ?';
    }

    const stmt = this.db.prepare(query);
    const rows = (limit ? stmt.all(eventType, limit) : stmt.all(eventType)) as any[];

    return rows.map(row => this.mapRowToActivity(row));
  }

  /**
   * Get activities in date range
   */
  getInRange(start: Date, end: Date): ActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_log
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(start.toISOString(), end.toISOString()) as any[];
    return rows.map(row => this.mapRowToActivity(row));
  }

  /**
   * Get activity pattern stats
   */
  getPatternStats(days: number = 7): {
    total_activities: number;
    by_event_type: Record<string, number>;
    by_hour: Record<number, number>;
    by_day: Record<string, number>;
  } {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total activities
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM activity_log WHERE timestamp >= ?
    `);
    const total = (totalStmt.get(since.toISOString()) as any).count;

    // By event type
    const eventStmt = this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE timestamp >= ?
      GROUP BY event_type
    `);
    const eventRows = eventStmt.all(since.toISOString()) as any[];
    const by_event_type: Record<string, number> = {};
    eventRows.forEach(row => {
      by_event_type[row.event_type] = row.count;
    });

    // By hour of day
    const hourStmt = this.db.prepare(`
      SELECT
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as count
      FROM activity_log
      WHERE timestamp >= ?
      GROUP BY hour
    `);
    const hourRows = hourStmt.all(since.toISOString()) as any[];
    const by_hour: Record<number, number> = {};
    hourRows.forEach(row => {
      by_hour[row.hour] = row.count;
    });

    // By day of week
    const dayStmt = this.db.prepare(`
      SELECT
        strftime('%w', timestamp) as day,
        COUNT(*) as count
      FROM activity_log
      WHERE timestamp >= ?
      GROUP BY day
    `);
    const dayRows = dayStmt.all(since.toISOString()) as any[];
    const by_day: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayRows.forEach(row => {
      by_day[dayNames[parseInt(row.day)]] = row.count;
    });

    return {
      total_activities: total,
      by_event_type,
      by_hour,
      by_day
    };
  }

  /**
   * Get notification response patterns
   */
  getNotificationPatterns(days: number = 7): {
    sent: number;
    opened: number;
    dismissed: number;
    open_rate: number;
    morning_opens: number;
    evening_opens: number;
  } {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stmt = this.db.prepare(`
      SELECT
        event_type,
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as count
      FROM activity_log
      WHERE timestamp >= ?
        AND event_type IN ('notification_opened', 'notification_dismissed')
      GROUP BY event_type, hour
    `);

    const rows = stmt.all(since.toISOString()) as any[];

    let opened = 0;
    let dismissed = 0;
    let morning_opens = 0; // 6am-12pm
    let evening_opens = 0; // 6pm-12am

    rows.forEach((row: any) => {
      if (row.event_type === 'notification_opened') {
        opened += row.count;
        if (row.hour >= 6 && row.hour < 12) {
          morning_opens += row.count;
        } else if (row.hour >= 18 && row.hour < 24) {
          evening_opens += row.count;
        }
      } else if (row.event_type === 'notification_dismissed') {
        dismissed += row.count;
      }
    });

    // Get total sent from notifications table
    const sentStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE sent_at >= ?
    `);
    const sent = (sentStmt.get(since.toISOString()) as any).count;

    return {
      sent,
      opened,
      dismissed,
      open_rate: sent > 0 ? opened / sent : 0,
      morning_opens,
      evening_opens
    };
  }

  /**
   * Map database row to ActivityLog object
   */
  private mapRowToActivity(row: any): ActivityLog {
    return {
      id: row.id,
      event_type: row.event_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      duration_seconds: row.duration_seconds,
      timestamp: row.timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}
