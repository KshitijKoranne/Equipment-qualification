import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";

let initialized = false;
async function ensureDB() {
  if (!initialized) { await initDB(); initialized = true; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDB();
    const { id } = await params;
    const result = await db.execute({
      sql: `SELECT file_name, file_type, file_data FROM attachments WHERE id = ?`,
      args: [id],
    });

    if (!result.rows.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { file_name, file_type, file_data } = result.rows[0];
    const buffer = Buffer.from(file_data as string, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": (file_type as string) || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file_name}"`,
      },
    });
  } catch (err) {
    console.error("[GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
