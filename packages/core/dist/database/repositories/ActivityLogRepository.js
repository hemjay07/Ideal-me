"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogRepository = void 0;
const client_1 = require("../client");
class ActivityLogRepository {
    constructor(dbClient) {
        this.db = dbClient.getDb();
    }
    /**
     * Log an activity
     */
    log(eventType, entityType, entityId, durationSeconds, metadata) {
        const id = client_1.DatabaseClient.uuid();
        const now = client_1.DatabaseClient.now();
        const stmt = this.db.prepare(`
      INSERT INTO activity_log (
        id, event_type, entity_type, entity_id, duration_seconds, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, eventType, entityType || null, entityId || null, durationSeconds || null, now, metadata ? JSON.stringify(metadata) : null);
        return this.findById(id);
    }
    /**
     * Find activity by ID
     */
    findById(id) {
        const stmt = this.db.prepare('SELECT * FROM activity_log WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToActivity(row);
    }
    /**
     * Get recent activities
     */
    getRecent(limit = 50) {
        const stmt = this.db.prepare(`
      SELECT * FROM activity_log
      ORDER BY timestamp DESC
      LIMIT ?
    `);
        const rows = stmt.all(limit);
        return rows.map(row => this.mapRowToActivity(row));
    }
    /**
     * Get activities by event type
     */
    getByEventType(eventType, limit) {
        let query = 'SELECT * FROM activity_log WHERE event_type = ? ORDER BY timestamp DESC';
        if (limit) {
            query += ' LIMIT ?';
        }
        const stmt = this.db.prepare(query);
        const rows = (limit ? stmt.all(eventType, limit) : stmt.all(eventType));
        return rows.map(row => this.mapRowToActivity(row));
    }
    /**
     * Get activities in date range
     */
    getInRange(start, end) {
        const stmt = this.db.prepare(`
      SELECT * FROM activity_log
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `);
        const rows = stmt.all(start.toISOString(), end.toISOString());
        return rows.map(row => this.mapRowToActivity(row));
    }
    /**
     * Get activity pattern stats
     */
    getPatternStats(days = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        // Total activities
        const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM activity_log WHERE timestamp >= ?
    `);
        const total = totalStmt.get(since.toISOString()).count;
        // By event type
        const eventStmt = this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      WHERE timestamp >= ?
      GROUP BY event_type
    `);
        const eventRows = eventStmt.all(since.toISOString());
        const by_event_type = {};
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
        const hourRows = hourStmt.all(since.toISOString());
        const by_hour = {};
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
        const dayRows = dayStmt.all(since.toISOString());
        const by_day = {};
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
    getNotificationPatterns(days = 7) {
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
        const rows = stmt.all(since.toISOString());
        let opened = 0;
        let dismissed = 0;
        let morning_opens = 0; // 6am-12pm
        let evening_opens = 0; // 6pm-12am
        rows.forEach((row) => {
            if (row.event_type === 'notification_opened') {
                opened += row.count;
                if (row.hour >= 6 && row.hour < 12) {
                    morning_opens += row.count;
                }
                else if (row.hour >= 18 && row.hour < 24) {
                    evening_opens += row.count;
                }
            }
            else if (row.event_type === 'notification_dismissed') {
                dismissed += row.count;
            }
        });
        // Get total sent from notifications table
        const sentStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE sent_at >= ?
    `);
        const sent = sentStmt.get(since.toISOString()).count;
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
    mapRowToActivity(row) {
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
exports.ActivityLogRepository = ActivityLogRepository;
