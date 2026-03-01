import { NextRequest, NextResponse } from "next/server";
import { db, ensureDB } from "@/db";


export async function POST(req: NextRequest) {
  try {
        await ensureDB();
const body = await req.json();
    const { equipment_id, breakdown_ref, reported_date, reported_by, description,
      breakdown_type, severity, validation_impact, impact_assessment, revalidation_phases } = body;

    if (!equipment_id || !breakdown_ref || !reported_date || !description)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const result = await db.execute({
      sql: `INSERT INTO breakdowns (equipment_id, breakdown_ref, reported_date, reported_by, description,
            breakdown_type, severity, validation_impact, impact_assessment, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')`,
      args: [equipment_id, breakdown_ref, reported_date, reported_by || null, description,
        breakdown_type || "Mechanical", severity || "Minor",
        validation_impact || "No Impact", impact_assessment || null],
    });

    const breakdownId = Number(result.lastInsertRowid);

    if (Array.isArray(revalidation_phases)) {
      for (const phase of revalidation_phases) {
        await db.execute({
          sql: `INSERT INTO revalidation_phases (breakdown_id, phase, status) VALUES (?, ?, 'Pending')`,
          args: [breakdownId, phase],
        });
      }
    }

    await db.execute({
      sql: `UPDATE equipment SET status = 'Under Maintenance', updated_at = datetime('now') WHERE id = ?`,
      args: [equipment_id],
    });

    await db.execute({
      sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Breakdown Reported', ?)`,
      args: [equipment_id, `Breakdown ${breakdown_ref}: ${description.slice(0, 100)}`],
    });

    return NextResponse.json({ id: breakdownId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/breakdowns]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
