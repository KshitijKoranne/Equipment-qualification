import { NextRequest, NextResponse } from "next/server";
import { db, ensureDB } from "@/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "qualification";
    const col = type === "requalification" ? "requalification_id" : "qualification_id";
    const result = await db.execute({
      sql: `SELECT id, qualification_id, requalification_id, file_name, file_size, file_type, uploaded_at FROM attachments WHERE ${col} = ? ORDER BY uploaded_at DESC`,
      args: [id],
    });
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[GET /api/attachments/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    await db.execute({ sql: `DELETE FROM attachments WHERE id = ?`, args: [id] });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("[DELETE /api/attachments/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
