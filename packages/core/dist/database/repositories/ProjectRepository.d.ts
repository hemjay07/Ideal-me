import { Project, ProjectStatus } from '../../types';
import { DatabaseClient } from '../client';
export declare class ProjectRepository {
    private db;
    constructor(dbClient: DatabaseClient);
    /**
     * Find all projects
     */
    findAll(filters?: {
        status?: ProjectStatus;
        category?: string;
    }): Project[];
    /**
     * Find project by ID
     */
    findById(id: string): Project | null;
    /**
     * Get active projects
     */
    getActive(): Project[];
    /**
     * Update project
     */
    update(id: string, updates: Partial<Project>): Project | null;
    /**
     * Get project with tasks
     */
    getWithTasks(id: string): {
        project: Project;
        tasks: any[];
    } | null;
    /**
     * Map database row to Project object
     */
    private mapRowToProject;
}
