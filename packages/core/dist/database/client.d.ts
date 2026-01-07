import Database from 'better-sqlite3';
export declare class DatabaseClient {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    /**
     * Run initial migration to set up schema
     */
    migrate(): void;
    /**
     * Seed initial data
     */
    seed(): void;
    /**
     * Get raw database instance
     */
    getDb(): Database.Database;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Generate UUID
     */
    static uuid(): string;
    /**
     * Get current ISO timestamp
     */
    static now(): string;
}
export declare function getDatabase(dbPath?: string): DatabaseClient;
export declare function closeDatabase(): void;
