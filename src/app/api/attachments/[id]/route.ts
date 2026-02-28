import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";

let initialized = false;
async function ensureDB() {
  if (!initialized) { await initDB(); initialized = true; }
}

// GET: fetch attachments for a qualification
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDB();
  const { id } = await params;
  const result = await db.execute({
    sql: `SELECT id, qualification_id, file_name, file_size, file_type, uploaded_at FROM attachments WHERE qualification_id = ? ORDER BY uploaded_at DESC`,
    args: [id],
  });
  return NextResponse.json(result.rows);
}

// DELETE: remove an attachment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureDB();
  const { id } = await params;
  await db.execute({ sql: `DELETE FROM attachments WHERE id = ?`, args: [id] });
  return NextResponse.json({ message: "Deleted" });
}
