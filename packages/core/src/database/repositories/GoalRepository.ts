import type Database from 'better-sqlite3';
import { Goal, GoalType, GoalStatus } from '../../types';
import { DatabaseClient } from '../client';

export class GoalRepository {
  private db: Database.Database;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient.getDb();
  }

  create(input: {
    title: string;
    type: GoalType;
    target_amount?: number;
    target_metric?: string;
    target_date?: string;
    current_progress?: number;
    status?: GoalStatus;
    metadata?: Record<string, any>;
  }): Goal {
    const id = DatabaseClient.uuid();
    const now = DatabaseClient.now();

    const stmt = this.db.prepare(`
      INSERT INTO goals (id, title, type, target_amount, target_metric, target_date,
                         current_progress, status, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.title,
      input.type,
      input.target_amount || null,
      input.target_metric || null,
      input.target_date || null,
      input.current_progress || 0,
      input.status || 'active',
      now,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(id)!;
  }

  findById(id: string): Goal | null {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToGoal(row) : null;
  }

  findAll(filters?: { status?: GoalStatus; type?: GoalType }): Goal[] {
    let query = 'SELECT * FROM goals WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params).map(row => this.mapRowToGoal(row as any));
  }

  updateProgress(id: string, progress: number): Goal | null {
    const stmt = this.db.prepare(`
      UPDATE goals
      SET current_progress = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(progress, DatabaseClient.now(), id);
    return this.findById(id);
  }

  private mapRowToGoal(row: any): Goal {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      target_amount: row.target_amount,
      target_metric: row.target_metric,
      target_date: row.target_date,
      current_progress: row.current_progress,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
