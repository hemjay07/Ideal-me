import Database from 'better-sqlite3';
import { Task, CreateTaskInput } from '../../types';
import { DatabaseClient } from '../client';

export class TaskRepository {
  private db: Database.Database;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient.getDb();
  }

  /**
   * Create a new task
   */
  create(input: CreateTaskInput): Task {
    const id = DatabaseClient.uuid();
    const now = DatabaseClient.now();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, content, source, priority, deadline, project_id,
        created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.content,
      input.source,
      input.priority || 0,
      input.deadline || null,
      input.project_id || null,
      now,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(id)!;
  }

  /**
   * Find task by ID
   */
  findById(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToTask(row);
  }

  /**
   * Find all tasks
   */
  findAll(filters?: {
    completed?: boolean;
    project_id?: string;
    source?: string;
    limit?: number;
  }): Task[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (filters?.completed !== undefined) {
      if (filters.completed) {
        query += ' AND completed_at IS NOT NULL';
      } else {
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
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Get pending tasks (not completed)
   */
  getPending(limit?: number): Task[] {
    return this.findAll({ completed: false, limit });
  }

  /**
   * Get Mono work tasks
   */
  getMonoWork(): Task[] {
    return this.findAll({ source: 'mono_work', completed: false });
  }

  /**
   * Get tasks by priority (top N)
   */
  getTopPriority(limit: number = 5): Task[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE completed_at IS NULL
      ORDER BY priority DESC, deadline ASC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Get tasks with upcoming deadlines
   */
  getUpcoming(hours: number = 24): Task[] {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE completed_at IS NULL
        AND deadline IS NOT NULL
        AND deadline BETWEEN ? AND ?
      ORDER BY deadline ASC
    `);

    const rows = stmt.all(now.toISOString(), future.toISOString()) as any[];
    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Update task
   */
  update(id: string, updates: Partial<Task>): Task | null {
    const fields: string[] = [];
    const values: any[] = [];

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
    values.push(DatabaseClient.now());

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
  complete(id: string): Task | null {
    return this.update(id, { completed_at: DatabaseClient.now() });
  }

  /**
   * Delete task
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get task completion stats
   */
  getStats(days: number = 7): {
    total: number;
    completed: number;
    pending: number;
    completion_rate: number;
  } {
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

    const result = stmt.get(since.toISOString()) as any;

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
  private mapRowToTask(row: any): Task {
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
