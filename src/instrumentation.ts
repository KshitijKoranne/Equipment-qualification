export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { db, initDB } = await import('@/db');
    try {
      // Fix: equipment_id was created NOT NULL in early versions — recreate table to drop the constraint
      // This is safe: SQLite allows CREATE TABLE ... AS SELECT to copy all data
      try {
        const info = await db.execute(`PRAGMA table_info(equipment)`);
        const col = info.rows.find((r) => r.name === 'equipment_id');
        if (col && col.notnull === 1) {
          console.log('[instrumentation] Migrating equipment.equipment_id to nullable...');
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
          await db.execute(`INSERT INTO equipment SELECT * FROM equipment_old`);
          await db.execute(`DROP TABLE equipment_old`);
          console.log('[instrumentation] Migration complete.');
        }
      } catch (migErr) {
        console.error('[instrumentation] equipment_id migration failed:', migErr);
      }

      await initDB();
      console.log('[instrumentation] DB initialized');
    } catch (err) {
      console.error('[instrumentation] DB init failed:', err);
    }
  }
}
