import { NextRequest, NextResponse } from "next/server";
import { db, initDB, ALL_PHASES } from "@/db";

let initialized = false;
async function ensureDB() {
  if (!initialized) { await initDB(); initialized = true; }
}

export async function GET() {
  await ensureDB();
  const result = await db.execute(`
    SELECT e.*,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'URS' ORDER BY q.id DESC LIMIT 1) as urs_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'DQ'  ORDER BY q.id DESC LIMIT 1) as dq_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'FAT' ORDER BY q.id DESC LIMIT 1) as fat_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'SAT' ORDER BY q.id DESC LIMIT 1) as sat_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'IQ'  ORDER BY q.id DESC LIMIT 1) as iq_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'OQ'  ORDER BY q.id DESC LIMIT 1) as oq_status,
      (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'PQ'  ORDER BY q.id DESC LIMIT 1) as pq_status,
      e.next_due_date
    FROM equipment e ORDER BY e.created_at DESC
  `);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureDB();
  const body = await req.json();
  const {
    name, type, department, location,
    manufacturer, model, serial_number, notes,
    change_control_number, urs_number, urs_approval_date, capacity,
    urs_attachment,
  } = body;

  if (!name || !type || !department || !location)
    return NextResponse.json({ error: "Name, Type, Department, and Location are required." }, { status: 400 });

  const result = await db.execute({
    sql: `INSERT INTO equipment (name, type, department, location, manufacturer, model,
          serial_number, notes, status, change_control_number, urs_number, urs_approval_date, capacity)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Not Started', ?, ?, ?, ?)`,
    args: [
      name, type, department, location,
      manufacturer || null, model || null, serial_number || null,
      notes || null,
      change_control_number || null, urs_number || null,
      urs_approval_date || null, capacity || null,
    ],
  });

  const newId = Number(result.lastInsertRowid);

  // Create all qualification phases
  for (const phase of ALL_PHASES) {
    await db.execute({
      sql: `INSERT INTO qualifications (equipment_id, phase, status) VALUES (?, ?, 'Pending')`,
      args: [newId, phase],
    });
  }

  // If a URS PDF was uploaded, attach it to the URS qualification phase
  if (urs_attachment?.file_data) {
    const ursQual = await db.execute({
      sql: `SELECT id FROM qualifications WHERE equipment_id = ? AND phase = 'URS'`,
      args: [newId],
    });
    if (ursQual.rows.length) {
      await db.execute({
        sql: `INSERT INTO attachments (qualification_id, file_name, file_size, file_type, file_data)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          Number(ursQual.rows[0].id),
          urs_attachment.file_name,
          urs_attachment.file_size || 0,
          urs_attachment.file_type || "application/pdf",
          urs_attachment.file_data,
        ],
      });
    }
  }

  await db.execute({
    sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Equipment Created', ?)`,
    args: [newId, `Equipment "${name}" added. CC: ${change_control_number || "—"}, URS: ${urs_number || "—"}`],
  });

  return NextResponse.json({ id: newId }, { status: 201 });
}
