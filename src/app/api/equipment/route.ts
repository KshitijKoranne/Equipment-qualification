import { NextRequest, NextResponse } from "next/server";
import { db, ALL_PHASES, ensureDB } from "@/db";


export async function GET() {
  try {
    await ensureDB();
    const result = await db.execute(`
      SELECT e.*,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'URS' ORDER BY q.id DESC LIMIT 1) as urs_status,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'DQ'  ORDER BY q.id DESC LIMIT 1) as dq_status,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'FAT' ORDER BY q.id DESC LIMIT 1) as fat_status,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'SAT' ORDER BY q.id DESC LIMIT 1) as sat_status,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'IQ'  ORDER BY q.id DESC LIMIT 1) as iq_status,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'OQ'  ORDER BY q.id DESC LIMIT 1) as oq_status,
        (SELECT q.status FROM qualifications q WHERE q.equipment_id = e.id AND q.phase = 'PQ'  ORDER BY q.id DESC LIMIT 1) as pq_status
      FROM equipment e ORDER BY e.created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[GET /api/equipment]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { name, type, department, location, manufacturer, model, serial_number,
      notes, change_control_number, urs_number, urs_approval_date,
      urs_execution_date, urs_approved_by, urs_remarks,
      capacity, urs_attachment } = body;

    if (!name || !type || !department || !location)
      return NextResponse.json({ error: "Name, Type, Department and Location are required." }, { status: 400 });

    const result = await db.execute({
      sql: `INSERT INTO equipment (equipment_id, name, type, department, location, manufacturer, model,
            serial_number, notes, status, change_control_number, urs_number, urs_approval_date, capacity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Started', ?, ?, ?, ?)`,
      args: [`PENDING-${Date.now()}`, name, type, department, location,
        manufacturer || null, model || null, serial_number || null, notes || null,
        change_control_number || null, urs_number || null, urs_approval_date || null, capacity || null],
    });

    const newId = Number(result.lastInsertRowid);

    for (const phase of ALL_PHASES) {
      if (phase === "URS") {
        // URS is already prepared before equipment is added — mark as Passed with all details
        await db.execute({
          sql: `INSERT INTO qualifications (equipment_id, phase, protocol_number, execution_date, approval_date, approved_by, remarks, status)
                VALUES (?, 'URS', ?, ?, ?, ?, ?, 'Passed')`,
          args: [newId, urs_number || null, urs_execution_date || null, urs_approval_date || null, urs_approved_by || null, urs_remarks || null],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO qualifications (equipment_id, phase, status) VALUES (?, ?, 'Pending')`,
          args: [newId, phase],
        });
      }
    }

    if (urs_attachment?.file_data) {
      const ursQual = await db.execute({
        sql: `SELECT id FROM qualifications WHERE equipment_id = ? AND phase = 'URS'`,
        args: [newId],
      });
      if (ursQual.rows.length) {
        await db.execute({
          sql: `INSERT INTO attachments (qualification_id, file_name, file_size, file_type, file_data) VALUES (?, ?, ?, ?, ?)`,
          args: [Number(ursQual.rows[0].id), urs_attachment.file_name,
            urs_attachment.file_size || 0, urs_attachment.file_type || "application/pdf", urs_attachment.file_data],
        });
      }
    }

    await db.execute({
      sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Equipment Created', ?)`,
      args: [newId, `Equipment "${name}" added. CC: ${change_control_number || "—"}, URS: ${urs_number || "—"}`],
    });

    return NextResponse.json({ id: newId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/equipment]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
