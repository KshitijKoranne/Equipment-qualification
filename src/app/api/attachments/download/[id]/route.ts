import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";

let dbReady = false;
async function ensureReady() {
  if (!dbReady) { await initDB(); dbReady = true; }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureReady();
    const { id } = await params;
    const result = await db.execute({ sql: `SELECT * FROM attachments WHERE id = ?`, args: [id] });
    if (!result.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const file = result.rows[0];
    const buffer = Buffer.from(file.file_data as string, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": (file.file_type as string) || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.file_name}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[GET /api/attachments/download/[id]]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
