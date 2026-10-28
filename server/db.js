/**
 * db.js
 * -----
 * Initialises the SQLite database using sql.js.
 *
 * sql.js keeps the database in-memory while the server runs.
 * To persist data across restarts we:
 *   1. Load the database file from disk on startup (if it exists).
 *   2. Export (save) the database back to disk after every write.
 *
 * We export:
 *   - `getDb()`  – returns the live Database object
 *   - `saveDb()` – writes the current state to disk
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES-module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path where the SQLite file will be stored on disk
const DB_PATH = path.join(__dirname, 'support_desk.db');

// Module-level variable holding the open database instance
let db = null;

/**
 * Initialises sql.js and loads (or creates) the database file.
 * Call once at server startup and await the result.
 */
export async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    // Load existing database file into memory
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing database from', DB_PATH);
  } else {
    // Create a brand-new empty database
    db = new SQL.Database();
    console.log('🆕 Created new database at', DB_PATH);
  }

  // Create all tables (IF NOT EXISTS = safe to run every startup)
  createSchema();

  // Save the freshly-created schema to disk immediately
  saveDb();

  return db;
}

/**
 * Returns the open Database object.
 * Throws if called before initDb() completes.
 */
export function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDb() first.');
  return db;
}

/**
 * Exports the in-memory database to disk.
 * Call this after every INSERT / UPDATE / DELETE.
 */
export function saveDb() {
  if (!db) return;
  const data = db.export();          // Uint8Array snapshot of the DB
  fs.writeFileSync(DB_PATH, data);
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

function createSchema() {
  // PRAGMA foreign_keys must be re-enabled every connection (sql.js default: off)
  db.run('PRAGMA foreign_keys = ON;');

  // -- Agents ---------------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      email     TEXT    NOT NULL UNIQUE,
      created_at TEXT   NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  // -- Tickets --------------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      subject         TEXT    NOT NULL,
      customer_name   TEXT    NOT NULL,
      customer_email  TEXT    NOT NULL,
      description     TEXT    NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'Open'
                        CHECK(status IN ('Open','In Progress','Waiting on Customer','Resolved')),
      priority        TEXT    NOT NULL DEFAULT 'Medium'
                        CHECK(priority IN ('Low','Medium','High','Urgent')),
      assignee_id     INTEGER REFERENCES agents(id) ON DELETE SET NULL,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  // -- Conversation entries (public replies + internal notes) ---------------
  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id  INTEGER NOT NULL REFERENCES tickets(id),
      type       TEXT    NOT NULL CHECK(type IN ('reply','note')),
      author     TEXT    NOT NULL,
      body       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  // -- Activity history -----------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   INTEGER NOT NULL REFERENCES tickets(id),
      event_type  TEXT    NOT NULL,   -- e.g. 'created', 'status_changed', etc.
      description TEXT    NOT NULL,
      author      TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  // -- Seed default agents (only if the table is empty) --------------------
  const count = db.exec('SELECT COUNT(*) as c FROM agents;');
  const agentCount = count[0]?.values[0][0] ?? 0;

  if (agentCount === 0) {
    db.run(`
      INSERT INTO agents (name, email) VALUES
        ('Alice Johnson', 'alice@support.com'),
        ('Bob Smith',     'bob@support.com'),
        ('Carol White',   'carol@support.com');
    `);
    console.log('🌱 Seeded 3 default support agents.');
  }
}
