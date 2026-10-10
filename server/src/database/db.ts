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

const scanCheckColumns = db.pragma('table_info(scan_checks)') as Array<{ name: string }>;
if (!scanCheckColumns.some((column) => column.name === 'wstg_references')) {
  db.exec('ALTER TABLE scan_checks ADD COLUMN wstg_references TEXT');
}
if (!scanCheckColumns.some((column) => column.name === 'explanation')) {
  db.exec('ALTER TABLE scan_checks ADD COLUMN explanation TEXT');
}
if (!scanCheckColumns.some((column) => column.name === 'duration_ms')) {
  db.exec('ALTER TABLE scan_checks ADD COLUMN duration_ms INTEGER DEFAULT 0');
}

const scanJobColumns = db.pragma('table_info(scan_jobs)') as Array<{ name: string }>;
if (!scanJobColumns.some((column) => column.name === 'errors_count')) {
  db.exec('ALTER TABLE scan_jobs ADD COLUMN errors_count INTEGER DEFAULT 0');
}
if (!scanJobColumns.some((column) => column.name === 'untested_count')) {
  db.exec('ALTER TABLE scan_jobs ADD COLUMN untested_count INTEGER DEFAULT 0');
}

const scanHistoryColumns = db.pragma('table_info(scan_history)') as Array<{ name: string }>;
if (!scanHistoryColumns.some((column) => column.name === 'errors_count')) {
  db.exec('ALTER TABLE scan_history ADD COLUMN errors_count INTEGER DEFAULT 0');
}
if (!scanHistoryColumns.some((column) => column.name === 'untested_count')) {
  db.exec('ALTER TABLE scan_history ADD COLUMN untested_count INTEGER DEFAULT 0');
}

db.exec("DELETE FROM application_settings WHERE key = 'rate_limit_default_max'");
db.exec('DROP TABLE IF EXISTS bola_demo_accounts');

export function logAuditEvent(eventType: string, details: string) {
  try {
    const stmt = db.prepare('INSERT INTO audit_events (timestamp, event_type, details) VALUES (?, ?, ?)');
    stmt.run(new Date().toISOString(), eventType, details);
  } catch (err) {
    console.error('[Audit Error]', err);
  }
}
