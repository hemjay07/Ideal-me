"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseClient = void 0;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class DatabaseClient {
    constructor(dbPath) {
        // Default to user data directory
        this.dbPath = dbPath || path_1.default.join(process.cwd(), 'idealme.db');
        // Ensure directory exists
        const dir = path_1.default.dirname(this.dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        // Initialize database
        this.db = new better_sqlite3_1.default(this.dbPath);
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        // WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
        console.log(`Database initialized at: ${this.dbPath}`);
    }
    /**
     * Run initial migration to set up schema
     */
    migrate() {
        const schemaPath = path_1.default.join(__dirname, '../../../database/schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
        // Execute schema
        this.db.exec(schema);
        console.log('Database schema migrated successfully');
    }
    /**
     * Seed initial data
     */
    seed() {
        const migrationPath = path_1.default.join(__dirname, '../../../database/migrations/001_initial.sql');
        const migration = fs_1.default.readFileSync(migrationPath, 'utf-8');
        // Remove .read directive (not supported by better-sqlite3)
        const cleanMigration = migration.replace('.read ../schema.sql', '');
        // Execute migration
        this.db.exec(cleanMigration);
        console.log('Database seeded successfully');
    }
    /**
     * Get raw database instance
     */
    getDb() {
        return this.db;
    }
    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
    /**
     * Generate UUID
     */
    static uuid() {
        return (0, uuid_1.v4)();
    }
    /**
     * Get current ISO timestamp
     */
    static now() {
        return new Date().toISOString();
    }
}
exports.DatabaseClient = DatabaseClient;
// Singleton instance
let dbInstance = null;
function getDatabase(dbPath) {
    if (!dbInstance) {
        dbInstance = new DatabaseClient(dbPath);
    }
    return dbInstance;
}
function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
