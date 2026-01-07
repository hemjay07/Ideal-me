import { Task, CreateTaskInput } from '../../types';
import { DatabaseClient } from '../client';
export declare class TaskRepository {
    private db;
    constructor(dbClient: DatabaseClient);
    /**
     * Create a new task
     */
    create(input: CreateTaskInput): Task;
    /**
     * Find task by ID
     */
    findById(id: string): Task | null;
    /**
     * Find all tasks
     */
    findAll(filters?: {
        completed?: boolean;
        project_id?: string;
        source?: string;
        limit?: number;
    }): Task[];
    /**
     * Get pending tasks (not completed)
     */
    getPending(limit?: number): Task[];
    /**
     * Get Mono work tasks
     */
    getMonoWork(): Task[];
    /**
     * Get tasks by priority (top N)
     */
    getTopPriority(limit?: number): Task[];
    /**
     * Get tasks with upcoming deadlines
     */
    getUpcoming(hours?: number): Task[];
    /**
     * Update task
     */
    update(id: string, updates: Partial<Task>): Task | null;
    /**
     * Mark task as completed
     */
    complete(id: string): Task | null;
    /**
     * Delete task
     */
    delete(id: string): boolean;
    /**
     * Get task completion stats
     */
    getStats(days?: number): {
        total: number;
        completed: number;
        pending: number;
        completion_rate: number;
    };
    /**
     * Map database row to Task object
     */
    private mapRowToTask;
}
