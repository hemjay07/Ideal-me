"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const client_1 = require("../client");
class TaskRepository {
    constructor(dbClient) {
        this.db = dbClient.getDb();
    }
    /**
     * Create a new task
     */
    create(input) {
        const id = client_1.DatabaseClient.uuid();
        const now = client_1.DatabaseClient.now();
        const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, content, source, priority, deadline, project_id,
        created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, input.content, input.source, input.priority || 0, input.deadline || null, input.project_id || null, now, now, input.metadata ? JSON.stringify(input.metadata) : null);
        return this.findById(id);
    }
    /**
     * Find task by ID
     */
    findById(id) {
        const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToTask(row);
    }
    /**
     * Find all tasks
     */
    findAll(filters) {
        let query = 'SELECT * FROM tasks WHERE 1=1';
        const params = [];
        if (filters?.completed !== undefined) {
            if (filters.completed) {
                query += ' AND completed_at IS NOT NULL';
            }
            else {
                query += ' AND completed_at IS NULL';
            }
        }
        if (filters?.project_id) {
            query += ' AND project_id = ?';
            params.push(filters.project_id);
        }
        if (filters?.source) {
            query += ' AND source = ?';
            params.push(filters.source);
        }
        query += ' ORDER BY priority DESC, deadline ASC';
        if (filters?.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        return rows.map(row => this.mapRowToTask(row));
    }
    /**
     * Get pending tasks (not completed)
     */
    getPending(limit) {
        return this.findAll({ completed: false, limit });
    }
    /**
     * Get Mono work tasks
     */
    getMonoWork() {
        return this.findAll({ source: 'mono_work', completed: false });
    }
    /**
     * Get tasks by priority (top N)
     */
    getTopPriority(limit = 5) {
        const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE completed_at IS NULL
      ORDER BY priority DESC, deadline ASC
      LIMIT ?
    `);
        const rows = stmt.all(limit);
        return rows.map(row => this.mapRowToTask(row));
    }
    /**
     * Get tasks with upcoming deadlines
     */
    getUpcoming(hours = 24) {
        const now = new Date();
        const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
        const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE completed_at IS NULL
        AND deadline IS NOT NULL
        AND deadline BETWEEN ? AND ?
      ORDER BY deadline ASC
    `);
        const rows = stmt.all(now.toISOString(), future.toISOString());
        return rows.map(row => this.mapRowToTask(row));
    }
    /**
     * Update task
     */
    update(id, updates) {
        const fields = [];
        const values = [];
        if (updates.content !== undefined) {
            fields.push('content = ?');
            values.push(updates.content);
        }
        if (updates.priority !== undefined) {
            fields.push('priority = ?');
            values.push(updates.priority);
        }
        if (updates.deadline !== undefined) {
            fields.push('deadline = ?');
            values.push(updates.deadline);
        }
        if (updates.completed_at !== undefined) {
            fields.push('completed_at = ?');
            values.push(updates.completed_at);
        }
        if (updates.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(updates.metadata));
        }
        fields.push('updated_at = ?');
        values.push(client_1.DatabaseClient.now());
        values.push(id);
        const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);
        stmt.run(...values);
        return this.findById(id);
    }
    /**
     * Mark task as completed
     */
    complete(id) {
        return this.update(id, { completed_at: client_1.DatabaseClient.now() });
    }
    /**
     * Delete task
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
    /**
     * Get task completion stats
     */
    getStats(days = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN completed_at IS NULL THEN 1 ELSE 0 END) as pending
      FROM tasks
      WHERE created_at >= ?
    `);
        const result = stmt.get(since.toISOString());
        return {
            total: result.total || 0,
            completed: result.completed || 0,
            pending: result.pending || 0,
            completion_rate: result.total > 0 ? (result.completed / result.total) : 0
        };
    }
    /**
     * Map database row to Task object
     */
    mapRowToTask(row) {
        return {
            id: row.id,
            content: row.content,
            source: row.source,
            priority: row.priority,
            deadline: row.deadline,
            completed_at: row.completed_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            project_id: row.project_id,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
    }
}
exports.TaskRepository = TaskRepository;
