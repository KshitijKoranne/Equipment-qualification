import { NextRequest, NextResponse } from "next/server";
import { db, ensureDB } from "@/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    const breakdowns = await db.execute({
      sql: `SELECT * FROM breakdowns WHERE equipment_id = ? ORDER BY reported_date DESC, created_at DESC`,
      args: [id],
    });
    const result = [];
    for (const bd of breakdowns.rows) {
      const phases = await db.execute({
        sql: `SELECT * FROM revalidation_phases WHERE breakdown_id = ? ORDER BY CASE phase WHEN 'IQ' THEN 1 WHEN 'OQ' THEN 2 WHEN 'PQ' THEN 3 ELSE 4 END`,
        args: [bd.id as number],
      });
      result.push({ ...bd, revalidation_phases: phases.rows });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/breakdowns/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    const body = await req.json();
    const { root_cause, breakdown_type, severity, maintenance_start, maintenance_end,
      maintenance_performed_by, maintenance_details, validation_impact, impact_assessment,
      status, closure_date, closed_by, closure_remarks, equipment_id, revalidation_phases } = body;

    await db.execute({
      sql: `UPDATE breakdowns SET root_cause=?, breakdown_type=?, severity=?, maintenance_start=?,
            maintenance_end=?, maintenance_performed_by=?, maintenance_details=?, validation_impact=?,
            impact_assessment=?, status=?, closure_date=?, closed_by=?, closure_remarks=?,
            updated_at=datetime('now') WHERE id=?`,
      args: [root_cause || null, breakdown_type, severity, maintenance_start || null,
        maintenance_end || null, maintenance_performed_by || null, maintenance_details || null,
        validation_impact, impact_assessment || null, status,
        closure_date || null, closed_by || null, closure_remarks || null, id],
    });

    if (Array.isArray(revalidation_phases)) {
      for (const rp of revalidation_phases) {
        if (rp.id) {
          await db.execute({
            sql: `UPDATE revalidation_phases SET protocol_number=?, execution_date=?, approval_date=?,
                  approved_by=?, status=?, remarks=?, updated_at=datetime('now') WHERE id=?`,
            args: [rp.protocol_number || null, rp.execution_date || null, rp.approval_date || null,
              rp.approved_by || null, rp.status, rp.remarks || null, rp.id],
          });
        }
      }
    }

    if (equipment_id) {
      const openBreakdowns = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM breakdowns WHERE equipment_id = ? AND status NOT IN ('Closed', 'Cancelled')`,
        args: [equipment_id],
      });
      const openCount = Number(openBreakdowns.rows[0].cnt);
      if (openCount === 0) {
        const pending = await db.execute({
          sql: `SELECT COUNT(*) as cnt FROM revalidation_phases rp JOIN breakdowns b ON rp.breakdown_id = b.id WHERE b.equipment_id = ? AND b.status = 'Closed' AND rp.status != 'Passed'`,
          args: [equipment_id],
        });
        if (Number(pending.rows[0].cnt) === 0) {
          await db.execute({
            sql: `UPDATE equipment SET status = 'Qualified', updated_at = datetime('now') WHERE id = ? AND status = 'Under Maintenance'`,
            args: [equipment_id],
          });
        } else {
          await db.execute({
            sql: `UPDATE equipment SET status = 'Revalidation Required', updated_at = datetime('now') WHERE id = ?`,
            args: [equipment_id],
          });
        }
      } else {
        await db.execute({
          sql: `UPDATE equipment SET status = 'Under Maintenance', updated_at = datetime('now') WHERE id = ?`,
          args: [equipment_id],
        });
      }
      await db.execute({
        sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Breakdown Updated', ?)`,
        args: [equipment_id, `Breakdown #${id} status: ${status}`],
      });
    }

    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("[PUT /api/breakdowns/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    await db.execute({ sql: `DELETE FROM revalidation_phases WHERE breakdown_id = ?`, args: [id] });
    await db.execute({ sql: `DELETE FROM breakdowns WHERE id = ?`, args: [id] });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("[DELETE /api/breakdowns/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
