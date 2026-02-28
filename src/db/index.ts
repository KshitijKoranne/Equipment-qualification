import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const ALL_PHASES = ["URS", "DQ", "FAT", "IQ", "OQ", "PQ", "Requalification"];

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
      requalification_tolerance TEXT DEFAULT '1',
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

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qualification_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      file_data TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (qualification_id) REFERENCES qualifications(id)
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

  // Safe migrations for existing DBs
  const migrations = [
    `ALTER TABLE equipment ADD COLUMN requalification_tolerance TEXT DEFAULT '1'`,
    `ALTER TABLE qualifications ADD COLUMN approved_by TEXT`,
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch { /* column exists */ }
  }

  // Add new phases to existing equipment that only have 4 phases
  const equipList = await db.execute(`SELECT id FROM equipment`);
  for (const eq of equipList.rows) {
    const existingPhases = await db.execute({
      sql: `SELECT phase FROM qualifications WHERE equipment_id = ?`,
      args: [eq.id as number],
    });
    const existing = existingPhases.rows.map((r) => r.phase as string);
    for (const phase of ALL_PHASES) {
      if (!existing.includes(phase)) {
        await db.execute({
          sql: `INSERT INTO qualifications (equipment_id, phase, status) VALUES (?, ?, 'Pending')`,
          args: [eq.id as number, phase],
        });
      }
    }
  }
}
