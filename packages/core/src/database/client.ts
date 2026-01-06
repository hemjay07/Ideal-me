import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseClient {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Default to user data directory
    this.dbPath = dbPath || path.join(process.cwd(), 'idealme.db');

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(this.dbPath);

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
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    this.db.exec(schema);

    console.log('Database schema migrated successfully');
  }

  /**
   * Seed initial data
   */
  seed() {
    const migrationPath = path.join(__dirname, '../../../database/migrations/001_initial.sql');
    const migration = fs.readFileSync(migrationPath, 'utf-8');

    // Remove .read directive (not supported by better-sqlite3)
    const cleanMigration = migration.replace('.read ../schema.sql', '');

    // Execute migration
    this.db.exec(cleanMigration);

    console.log('Database seeded successfully');
  }

  /**
   * Get raw database instance
   */
  getDb(): Database.Database {
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
  static uuid(): string {
    return uuidv4();
  }

  /**
   * Get current ISO timestamp
   */
  static now(): string {
    return new Date().toISOString();
  }
}

// Singleton instance
let dbInstance: DatabaseClient | null = null;

export function getDatabase(dbPath?: string): DatabaseClient {
  if (!dbInstance) {
    dbInstance = new DatabaseClient(dbPath);
  }
  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
