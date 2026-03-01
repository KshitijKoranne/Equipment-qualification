import { NextRequest, NextResponse } from "next/server";
import { db, ensureDB } from "@/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    const body = await req.json();
    const { frequency, tolerance_months, scheduled_date, execution_date, protocol_number, approval_date, approved_by, status, remarks } = body;
    await db.execute({
      sql: `UPDATE requalifications SET frequency=?, tolerance_months=?, scheduled_date=?, execution_date=?,
            protocol_number=?, approval_date=?, approved_by=?, status=?, remarks=?, updated_at=datetime('now') WHERE id=?`,
      args: [frequency, tolerance_months || "1", scheduled_date || null, execution_date || null,
        protocol_number || null, approval_date || null, approved_by || null, status, remarks || null, id],
    });
    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("[PUT /api/requalifications/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    await db.execute({ sql: `DELETE FROM requalifications WHERE id = ?`, args: [id] });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("[DELETE /api/requalifications/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
