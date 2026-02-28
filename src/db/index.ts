import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const ALL_PHASES = ["URS", "DQ", "FAT", "SAT", "IQ", "OQ", "PQ"];

// Module-level init promise — runs once per serverless instance, all routes share it
let _initPromise: Promise<void> | null = null;
export function ensureDB(): Promise<void> {
  if (!_initPromise) _initPromise = initDB();
  return _initPromise;
}

export async function initDB() {
  // Core tables
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

  // Safe column migrations — each in its own try/catch so one failure doesn't block others
  const columnMigrations = [
    `ALTER TABLE equipment ADD COLUMN requalification_tolerance TEXT DEFAULT '1'`,
    `ALTER TABLE equipment ADD COLUMN change_control_number TEXT`,
    `ALTER TABLE equipment ADD COLUMN urs_number TEXT`,
    `ALTER TABLE equipment ADD COLUMN urs_approval_date TEXT`,
    `ALTER TABLE equipment ADD COLUMN capacity TEXT`,
    `ALTER TABLE equipment ADD COLUMN installation_date TEXT`,
    `ALTER TABLE qualifications ADD COLUMN approved_by TEXT`,
    `ALTER TABLE attachments ADD COLUMN requalification_id INTEGER`,
    `ALTER TABLE attachments ADD COLUMN revalidation_phase_id INTEGER`,
  ];
  for (const sql of columnMigrations) {
    try { await db.execute(sql); } catch { /* column already exists — safe to ignore */ }
  }

  // Make equipment_id nullable — SQLite can't ALTER COLUMN so we rebuild via rename-copy-drop
  // Safe to run repeatedly: IF NOT EXISTS on new table, check column info first
  try {
    const cols = await db.execute(`PRAGMA table_info(equipment)`);
    const eidCol = cols.rows.find(r => r.name === 'equipment_id');
    // notnull = 1 means the old NOT NULL constraint is still present
    if (eidCol && eidCol.notnull === 1) {
      await db.execute(`PRAGMA foreign_keys = OFF`);
      await db.execute(`ALTER TABLE equipment RENAME TO equipment_old`);
      await db.execute(`CREATE TABLE equipment (
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
      await db.execute(`INSERT INTO equipment SELECT
        id, equipment_id, name, type, department, location, manufacturer, model,
        serial_number, installation_date, status, requalification_frequency,
        requalification_tolerance, next_due_date, notes, change_control_number,
        urs_number, urs_approval_date, capacity, created_at, updated_at
        FROM equipment_old`);
      await db.execute(`DROP TABLE equipment_old`);
      await db.execute(`PRAGMA foreign_keys = ON`);
      console.log('[initDB] Migrated equipment_id to nullable');
    }
  } catch (err) {
    console.error('[initDB] equipment_id nullable migration failed:', err);
  }

  // Backfill missing phases for existing equipment
  // Done per-equipment so a single failure doesn't abort everything
  try {
    const equipList = await db.execute(`SELECT id FROM equipment`);
    for (const eq of equipList.rows) {
      try {
        const existing = await db.execute({
          sql: `SELECT phase FROM qualifications WHERE equipment_id = ?`,
          args: [eq.id as number],
        });
        const existingPhases = new Set(existing.rows.map((r) => r.phase as string));
        for (const phase of ALL_PHASES) {
          if (!existingPhases.has(phase)) {
            await db.execute({
              sql: `INSERT INTO qualifications (equipment_id, phase, status) VALUES (?, ?, 'Pending')`,
              args: [eq.id as number, phase],
            });
          }
        }
      } catch (err) {
        console.error(`[initDB] phase backfill failed for equipment ${eq.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[initDB] phase backfill loop failed:", err);
  }
}
