import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";

let initialized = false;
async function ensureDB() {
  if (!initialized) {
    await initDB();
    initialized = true;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDB();
  const { id } = await params;

  const equipment = await db.execute({
    sql: `SELECT * FROM equipment WHERE id = ?`,
    args: [id],
  });

  if (!equipment.rows.length) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const qualifications = await db.execute({
    sql: `SELECT * FROM qualifications WHERE equipment_id = ? ORDER BY CASE phase WHEN 'DQ' THEN 1 WHEN 'IQ' THEN 2 WHEN 'OQ' THEN 3 WHEN 'PQ' THEN 4 END`,
    args: [id],
  });

  const auditLog = await db.execute({
    sql: `SELECT * FROM audit_log WHERE equipment_id = ? ORDER BY created_at DESC LIMIT 20`,
    args: [id],
  });

  return NextResponse.json({
    equipment: equipment.rows[0],
    qualifications: qualifications.rows,
    auditLog: auditLog.rows,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDB();
  const { id } = await params;
  const body = await req.json();

  const { name, type, department, location, manufacturer, model, serial_number, installation_date, requalification_frequency, next_due_date, notes, status, qualifications } = body;

  await db.execute({
    sql: `UPDATE equipment SET name=?, type=?, department=?, location=?, manufacturer=?, model=?, serial_number=?, installation_date=?, requalification_frequency=?, next_due_date=?, notes=?, status=?, updated_at=datetime('now') WHERE id=?`,
    args: [name, type, department, location, manufacturer || null, model || null, serial_number || null, installation_date || null, requalification_frequency || "Annual", next_due_date || null, notes || null, status, id],
  });

  // Update qualification phases if provided
  if (qualifications && Array.isArray(qualifications)) {
    for (const q of qualifications) {
      await db.execute({
        sql: `UPDATE qualifications SET protocol_number=?, execution_date=?, approval_date=?, approved_by=?, status=?, remarks=?, updated_at=datetime('now') WHERE id=? AND equipment_id=?`,
        args: [q.protocol_number || null, q.execution_date || null, q.approval_date || null, q.approved_by || null, q.status, q.remarks || null, q.id, id],
      });
    }
  }

  // Recalculate overall equipment status based on phases
  const phases = await db.execute({
    sql: `SELECT status FROM qualifications WHERE equipment_id = ?`,
    args: [id],
  });
  const allPassed = phases.rows.every((p) => p.status === "Passed");
  const anyFailed = phases.rows.some((p) => p.status === "Failed");
  const anyInProgress = phases.rows.some((p) => p.status === "In Progress");
  let computedStatus = status;
  if (allPassed) computedStatus = "Qualified";
  else if (anyFailed) computedStatus = "Failed";
  else if (anyInProgress) computedStatus = "In Progress";

  await db.execute({
    sql: `UPDATE equipment SET status=? WHERE id=?`,
    args: [computedStatus, id],
  });

  await db.execute({
    sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Equipment Updated', 'Equipment details and qualification phases updated')`,
    args: [id],
  });

  return NextResponse.json({ message: "Updated successfully" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDB();
  const { id } = await params;
  await db.execute({ sql: `DELETE FROM qualifications WHERE equipment_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM audit_log WHERE equipment_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM equipment WHERE id = ?`, args: [id] });
  return NextResponse.json({ message: "Deleted" });
}
