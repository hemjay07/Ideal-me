import Database from 'better-sqlite3';
import { Project, ProjectStatus, FundingStatus } from '../../types';
import { DatabaseClient } from '../client';

export class ProjectRepository {
  private db: Database.Database;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient.getDb();
  }

  /**
   * Find all projects
   */
  findAll(filters?: {
    status?: ProjectStatus;
    category?: string;
  }): Project[] {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.mapRowToProject(row));
  }

  /**
   * Find project by ID
   */
  findById(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToProject(row);
  }

  /**
   * Get active projects
   */
  getActive(): Project[] {
    return this.findAll({ status: 'active' });
  }

  /**
   * Update project
   */
  update(id: string, updates: Partial<Project>): Project | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.funding_status !== undefined) {
      fields.push('funding_status = ?');
      values.push(updates.funding_status);
    }

    if (updates.funding_amount !== undefined) {
      fields.push('funding_amount = ?');
      values.push(updates.funding_amount);
    }

    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    fields.push('updated_at = ?');
    values.push(DatabaseClient.now());

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE projects SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Get project with tasks
   */
  getWithTasks(id: string): {
    project: Project;
    tasks: any[];
  } | null {
    const project = this.findById(id);
    if (!project) return null;

    const tasksStmt = this.db.prepare(`
      SELECT * FROM tasks WHERE project_id = ? ORDER BY priority DESC
    `);

    const tasks = tasksStmt.all(id);

    return { project, tasks };
  }

  /**
   * Map database row to Project object
   */
  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      funding_amount: row.funding_amount,
      funding_status: row.funding_status,
      funding_source: row.funding_source,
      priority: row.priority,
      category: row.category,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}
