import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";

let initialized = false;
async function ensureDB() {
  if (!initialized) {
    await initDB();
    initialized = true;
  }
}

export async function GET() {
  await ensureDB();
  const result = await db.execute(`
    SELECT 
      e.*,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'DQ' ORDER BY q.id DESC LIMIT 1) as dq_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'IQ' ORDER BY q.id DESC LIMIT 1) as iq_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'OQ' ORDER BY q.id DESC LIMIT 1) as oq_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'PQ' ORDER BY q.id DESC LIMIT 1) as pq_status,
      e.next_due_date
    FROM equipment e
    ORDER BY e.created_at DESC
  `);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureDB();
  const body = await req.json();

  const {
    equipment_id, name, type, department, location,
    manufacturer, model, serial_number, installation_date,
    requalification_frequency, requalification_tolerance, notes
  } = body;

  if (!equipment_id || !name || !type || !department || !location) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await db.execute({
    sql: `INSERT INTO equipment 
          (equipment_id, name, type, department, location, manufacturer, model, serial_number, 
           installation_date, requalification_frequency, requalification_tolerance, notes, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Started')`,
    args: [
      equipment_id, name, type, department, location,
      manufacturer || null, model || null, serial_number || null,
      installation_date || null,
      requalification_frequency || "Annual",
      requalification_tolerance || "1",
      notes || null
    ],
  });

  const newId = Number(result.lastInsertRowid);

  // Create default qualification phases
  const phases = ["DQ", "IQ", "OQ", "PQ"];
  for (const phase of phases) {
    await db.execute({
      sql: `INSERT INTO qualifications (equipment_id, phase, status) VALUES (?, ?, 'Pending')`,
      args: [newId, phase],
    });
  }

  await db.execute({
    sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Equipment Created', ?)`,
    args: [newId, `Equipment ${name} (${equipment_id}) added to system`],
  });

  return NextResponse.json({ id: newId, message: "Equipment created successfully" }, { status: 201 });
}
