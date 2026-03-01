import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const ALL_PHASES = ["URS", "DQ", "FAT", "SAT", "IQ", "OQ", "PQ"];

export async function initDB() {
  await db.execute(`CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT UNIQUE,
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
    requalification_tolerance TEXT DEFAULT '1',
    next_due_date TEXT,
    notes TEXT,
    change_control_number TEXT,
    urs_number TEXT,
    urs_approval_date TEXT,
    capacity TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS qualifications (
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
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qualification_id INTEGER,
    requalification_id INTEGER,
    revalidation_phase_id INTEGER,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    file_data TEXT NOT NULL,
    uploaded_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    changed_by TEXT DEFAULT 'System',
    details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS requalifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    requalification_ref TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'Annual',
    tolerance_months TEXT NOT NULL DEFAULT '1',
    scheduled_date TEXT,
    execution_date TEXT,
    protocol_number TEXT,
    approval_date TEXT,
    approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS breakdowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    breakdown_ref TEXT NOT NULL,
    reported_date TEXT NOT NULL,
    reported_by TEXT,
    description TEXT NOT NULL,
    root_cause TEXT,
    breakdown_type TEXT NOT NULL DEFAULT 'Mechanical',
    severity TEXT NOT NULL DEFAULT 'Minor',
    maintenance_start TEXT,
    maintenance_end TEXT,
    maintenance_performed_by TEXT,
    maintenance_details TEXT,
    validation_impact TEXT NOT NULL DEFAULT 'No Impact',
    impact_assessment TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    closure_date TEXT,
    closed_by TEXT,
    closure_remarks TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS revalidation_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    breakdown_id INTEGER NOT NULL,
    phase TEXT NOT NULL,
    protocol_number TEXT,
    execution_date TEXT,
    approval_date TEXT,
    approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    remarks TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (breakdown_id) REFERENCES breakdowns(id)
  )`);
}

// Auto-initialize on first import — runs once per serverless instance
let _initPromise: Promise<void> | null = null;
export function ensureDB(): Promise<void> {
  if (!_initPromise) _initPromise = initDB().catch((err) => {
    console.error('[db] initDB failed:', err);
    _initPromise = null; // allow retry on next request
    throw err;
  });
  return _initPromise;
}
