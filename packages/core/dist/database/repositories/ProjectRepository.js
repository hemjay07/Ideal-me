"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectRepository = void 0;
const client_1 = require("../client");
class ProjectRepository {
    constructor(dbClient) {
        this.db = dbClient.getDb();
    }
    /**
     * Create a new project
     */
    create(input) {
        const id = client_1.DatabaseClient.uuid();
        const now = client_1.DatabaseClient.now();
        const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, name, description, status, funding_amount, funding_status,
        funding_source, priority, category, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, input.name, input.description || null, input.status || 'active', input.funding_amount || null, input.funding_status || null, input.funding_source || null, input.priority || 5, input.category || null, now, now, input.metadata ? JSON.stringify(input.metadata) : null);
        return this.findById(id);
    }
    /**
     * Find all projects
     */
    findAll(filters) {
        let query = 'SELECT * FROM projects WHERE 1=1';
        const params = [];
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
        const rows = stmt.all(...params);
        return rows.map(row => this.mapRowToProject(row));
    }
    /**
     * Find project by ID
     */
    findById(id) {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToProject(row);
    }
    /**
     * Get active projects
     */
    getActive() {
        return this.findAll({ status: 'active' });
    }
    /**
     * Update project
     */
    update(id, updates) {
        const fields = [];
        const values = [];
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
        values.push(client_1.DatabaseClient.now());
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
    getWithTasks(id) {
        const project = this.findById(id);
        if (!project)
            return null;
        const tasksStmt = this.db.prepare(`
      SELECT * FROM tasks WHERE project_id = ? ORDER BY priority DESC
    `);
        const tasks = tasksStmt.all(id);
        return { project, tasks };
    }
    /**
     * Map database row to Project object
     */
    mapRowToProject(row) {
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
exports.ProjectRepository = ProjectRepository;
