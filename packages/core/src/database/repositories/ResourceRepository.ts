import Database from 'better-sqlite3';
import { Resource, CreateResourceInput, ResourceType, ResourceCategory } from '../../types';
import { DatabaseClient } from '../client';

export class ResourceRepository {
  private db: Database.Database;

  constructor(dbClient: DatabaseClient) {
    this.db = dbClient.getDb();
  }

  /**
   * Create a new resource
   */
  create(input: CreateResourceInput): Resource {
    const id = DatabaseClient.uuid();
    const now = DatabaseClient.now();

    const stmt = this.db.prepare(`
      INSERT INTO resources (
        id, type, url, title, content, source, category,
        thumbnail_url, project_id, bookmarked_at, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.type,
      input.url,
      input.title || null,
      input.content || null,
      input.source || 'manual',
      input.category || null,
      input.thumbnail_url || null,
      input.project_id || null,
      now,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return this.findById(id)!;
  }

  /**
   * Find resource by ID
   */
  findById(id: string): Resource | null {
    const stmt = this.db.prepare('SELECT * FROM resources WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToResource(row);
  }

  /**
   * Find all resources with optional filters
   */
  findAll(filters?: {
    type?: ResourceType;
    category?: ResourceCategory;
    project_id?: string;
  }): Resource[] {
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters?.project_id) {
      query += ' AND project_id = ?';
      params.push(filters.project_id);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.mapRowToResource(row));
  }

  /**
   * Get recent resources (sorted by created_at DESC)
   */
  getRecent(limit: number = 20): Resource[] {
    const stmt = this.db.prepare(`
      SELECT * FROM resources
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.mapRowToResource(row));
  }

  /**
   * Search resources by title, content, or URL
   */
  search(query: string): Resource[] {
    const searchTerm = `%${query.toLowerCase()}%`;

    const stmt = this.db.prepare(`
      SELECT * FROM resources
      WHERE LOWER(title) LIKE ?
         OR LOWER(content) LIKE ?
         OR LOWER(url) LIKE ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as any[];
    return rows.map(row => this.mapRowToResource(row));
  }

  /**
   * Delete a resource
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM resources WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Update resource metadata (thumbnail, title, etc.)
   */
  update(id: string, updates: Partial<Resource>): Resource | null {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }

    if (updates.thumbnail_url !== undefined) {
      fields.push('thumbnail_url = ?');
      values.push(updates.thumbnail_url);
    }

    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }

    if (updates.project_id !== undefined) {
      fields.push('project_id = ?');
      values.push(updates.project_id);
    }

    if (updates.read_at !== undefined) {
      fields.push('read_at = ?');
      values.push(updates.read_at);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE resources SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Get resource count by category
   */
  getCountsByCategory(): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM resources
      WHERE category IS NOT NULL
      GROUP BY category
    `);

    const rows = stmt.all() as any[];
    const counts: Record<string, number> = {};

    rows.forEach(row => {
      counts[row.category] = row.count;
    });

    return counts;
  }

  /**
   * Map database row to Resource object
   */
  private mapRowToResource(row: any): Resource {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      url: row.url,
      content: row.content,
      source: row.source,
      category: row.category,
      thumbnail_url: row.thumbnail_url,
      project_id: row.project_id,
      read_at: row.read_at,
      bookmarked_at: row.bookmarked_at,
      created_at: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
