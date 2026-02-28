import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      installation_date TEXT,
      status TEXT NOT NULL DEFAULT 'Not Started',
      requalification_frequency TEXT DEFAULT 'Annual',
      next_due_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qualifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      phase TEXT NOT NULL,
      protocol_number TEXT,
      execution_date TEXT,
      approval_date TEXT,
      approved_by TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      changed_by TEXT DEFAULT 'System',
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    );
  `);
}
