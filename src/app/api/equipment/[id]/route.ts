import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const equipment = await db.execute({ sql: `SELECT * FROM equipment WHERE id = ?`, args: [id] });
    if (!equipment.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const qualifications = await db.execute({
      sql: `SELECT * FROM qualifications WHERE equipment_id = ? ORDER BY
            CASE phase WHEN 'URS' THEN 1 WHEN 'DQ' THEN 2 WHEN 'FAT' THEN 3 WHEN 'SAT' THEN 4
            WHEN 'IQ' THEN 5 WHEN 'OQ' THEN 6 WHEN 'PQ' THEN 7 ELSE 8 END`,
      args: [id],
    });

    const auditLog = await db.execute({
      sql: `SELECT * FROM audit_log WHERE equipment_id = ? ORDER BY created_at DESC LIMIT 50`,
      args: [id],
    });

    return NextResponse.json({ equipment: equipment.rows[0], qualifications: qualifications.rows, auditLog: auditLog.rows });
  } catch (err) {
    console.error("[GET /api/equipment/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, department, location, manufacturer, model, serial_number, installation_date,
      requalification_frequency, requalification_tolerance, next_due_date, notes, status, qualifications,
      equipment_id, change_control_number, urs_number, urs_approval_date, capacity } = body;

    await db.execute({
      sql: `UPDATE equipment SET name=?, type=?, department=?, location=?, manufacturer=?, model=?,
            serial_number=?, installation_date=?, requalification_frequency=?, requalification_tolerance=?,
            next_due_date=?, notes=?, status=?, equipment_id=?, change_control_number=?, urs_number=?,
            urs_approval_date=?, capacity=?, updated_at=datetime('now') WHERE id=?`,
      args: [name, type, department, location, manufacturer || null, model || null, serial_number || null,
        installation_date || null, requalification_frequency || "Annual", requalification_tolerance || "1",
        next_due_date || null, notes || null, status, equipment_id || null,
        change_control_number || null, urs_number || null, urs_approval_date || null, capacity || null, id],
    });

    if (Array.isArray(qualifications)) {
      for (const q of qualifications) {
        await db.execute({
          sql: `UPDATE qualifications SET protocol_number=?, execution_date=?, approval_date=?,
                approved_by=?, status=?, remarks=?, updated_at=datetime('now') WHERE id=? AND equipment_id=?`,
          args: [q.protocol_number || null, q.execution_date || null, q.approval_date || null,
            q.approved_by || null, q.status, q.remarks || null, q.id, id],
        });
      }
    }

    // Recalculate status from phases
    const phases = await db.execute({ sql: `SELECT status FROM qualifications WHERE equipment_id = ?`, args: [id] });
    const statuses = phases.rows.map(p => p.status as string);
    let computed = status;
    if (statuses.every(s => ["Passed", "Waived", "Not Applicable"].includes(s))) computed = "Qualified";
    else if (statuses.some(s => s === "Failed")) computed = "Failed";
    else if (statuses.some(s => s === "In Progress")) computed = "In Progress";
    else if (statuses.some(s => s === "Passed")) computed = "In Progress";

    await db.execute({ sql: `UPDATE equipment SET status=? WHERE id=?`, args: [computed, id] });
    await db.execute({
      sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Equipment Updated', 'Details and phases updated')`,
      args: [id],
    });

    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("[PUT /api/equipment/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Delete dependents first
    const bds = await db.execute({ sql: `SELECT id FROM breakdowns WHERE equipment_id = ?`, args: [id] });
    for (const bd of bds.rows) {
      await db.execute({ sql: `DELETE FROM revalidation_phases WHERE breakdown_id = ?`, args: [bd.id as number] });
    }
    await db.execute({ sql: `DELETE FROM breakdowns WHERE equipment_id = ?`, args: [id] });
    await db.execute({ sql: `DELETE FROM requalifications WHERE equipment_id = ?`, args: [id] });
    const quals = await db.execute({ sql: `SELECT id FROM qualifications WHERE equipment_id = ?`, args: [id] });
    for (const q of quals.rows) {
      await db.execute({ sql: `DELETE FROM attachments WHERE qualification_id = ?`, args: [q.id as number] });
    }
    await db.execute({ sql: `DELETE FROM qualifications WHERE equipment_id = ?`, args: [id] });
    await db.execute({ sql: `DELETE FROM audit_log WHERE equipment_id = ?`, args: [id] });
    await db.execute({ sql: `DELETE FROM equipment WHERE id = ?`, args: [id] });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("[DELETE /api/equipment/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
