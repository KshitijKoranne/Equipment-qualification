import { NextRequest, NextResponse } from "next/server";
import { db, ensureDB } from "@/db";

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const { qualification_id, requalification_id, file_name, file_size, file_type, file_data } = await req.json();
    if (!file_name || !file_data || (!qualification_id && !requalification_id))
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    if (file_data.length > 7_000_000)
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });
    const result = await db.execute({
      sql: `INSERT INTO attachments (qualification_id, requalification_id, file_name, file_size, file_type, file_data)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [qualification_id || null, requalification_id || null, file_name, file_size || 0, file_type || "application/octet-stream", file_data],
    });
    return NextResponse.json({ id: Number(result.lastInsertRowid), file_name }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/attachments]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
