import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";
let dbReady = false;
async function ensureReady() {
  if (!dbReady) { await initDB(); dbReady = true; }
}


export async function GET(req: NextRequest) {
  try {
        await ensureReady();
const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get("equipment_id");
    if (!equipmentId) return NextResponse.json({ error: "equipment_id required" }, { status: 400 });
    const result = await db.execute({
      sql: `SELECT * FROM requalifications WHERE equipment_id = ? ORDER BY scheduled_date ASC, created_at ASC`,
      args: [equipmentId],
    });
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[GET /api/requalifications]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
        await ensureReady();
const body = await req.json();
    const { equipment_id, requalification_ref, frequency, tolerance_months, scheduled_date, protocol_number, remarks } = body;
    if (!equipment_id || !requalification_ref)
      return NextResponse.json({ error: "equipment_id and requalification_ref are required" }, { status: 400 });
    const result = await db.execute({
      sql: `INSERT INTO requalifications (equipment_id, requalification_ref, frequency, tolerance_months, scheduled_date, protocol_number, remarks, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
      args: [equipment_id, requalification_ref, frequency || "Annual", tolerance_months || "1", scheduled_date || null, protocol_number || null, remarks || null],
    });
    await db.execute({
      sql: `INSERT INTO audit_log (equipment_id, action, details) VALUES (?, 'Requalification Scheduled', ?)`,
      args: [equipment_id, `${requalification_ref} scheduled — ${frequency || "Annual"}`],
    });
    return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/requalifications]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
