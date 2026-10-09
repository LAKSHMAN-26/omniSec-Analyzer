import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './cybersentinel.db';
const absoluteDbPath = path.resolve(process.cwd(), dbPath);

console.log(`[CyberSentinel DB] Initializing SQLite database at ${absoluteDbPath}`);

export const db = new Database(absoluteDbPath);

// Enable WAL mode for performance & concurrent reads
db.pragma('journal_mode = WAL');

// Execute schema
const schemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
const distSchemaPath = path.resolve(process.cwd(), 'dist/database/schema.sql');

if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
} else if (fs.existsSync(distSchemaPath)) {
  const schemaSql = fs.readFileSync(distSchemaPath, 'utf8');
  db.exec(schemaSql);
} else {
  console.warn('[CyberSentinel DB] schema.sql not found at standard path.');
}

export function logAuditEvent(eventType: string, details: string) {
  try {
    const stmt = db.prepare('INSERT INTO audit_events (timestamp, event_type, details) VALUES (?, ?, ?)');
    stmt.run(new Date().toISOString(), eventType, details);
  } catch (err) {
    console.error('[Audit Error]', err);
  }
}
