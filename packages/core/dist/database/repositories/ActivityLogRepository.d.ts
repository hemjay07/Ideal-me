import { ActivityLog, ActivityEventType, EntityType } from '../../types';
import { DatabaseClient } from '../client';
export declare class ActivityLogRepository {
    private db;
    constructor(dbClient: DatabaseClient);
    /**
     * Log an activity
     */
    log(eventType: ActivityEventType, entityType?: EntityType, entityId?: string, durationSeconds?: number, metadata?: Record<string, any>): ActivityLog;
    /**
     * Find activity by ID
     */
    findById(id: string): ActivityLog | null;
    /**
     * Get recent activities
     */
    getRecent(limit?: number): ActivityLog[];
    /**
     * Get activities by event type
     */
    getByEventType(eventType: ActivityEventType, limit?: number): ActivityLog[];
    /**
     * Get activities in date range
     */
    getInRange(start: Date, end: Date): ActivityLog[];
    /**
     * Get activity pattern stats
     */
    getPatternStats(days?: number): {
        total_activities: number;
        by_event_type: Record<string, number>;
        by_hour: Record<number, number>;
        by_day: Record<string, number>;
    };
    /**
     * Get notification response patterns
     */
    getNotificationPatterns(days?: number): {
        sent: number;
        opened: number;
        dismissed: number;
        open_rate: number;
        morning_opens: number;
        evening_opens: number;
    };
    /**
     * Map database row to ActivityLog object
     */
    private mapRowToActivity;
}
