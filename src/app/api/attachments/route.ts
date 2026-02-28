import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/db";

let initialized = false;
async function ensureDB() {
  if (!initialized) { await initDB(); initialized = true; }
}

// POST: upload attachment (base64 encoded)
export async function POST(req: NextRequest) {
  await ensureDB();
  const { qualification_id, file_name, file_size, file_type, file_data } = await req.json();

  if (!qualification_id || !file_name || !file_data)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  // Limit: 5MB per file
  if (file_data.length > 7_000_000)
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 413 });

  const result = await db.execute({
    sql: `INSERT INTO attachments (qualification_id, file_name, file_size, file_type, file_data)
          VALUES (?, ?, ?, ?, ?)`,
    args: [qualification_id, file_name, file_size || 0, file_type || "application/octet-stream", file_data],
  });

  return NextResponse.json({ id: Number(result.lastInsertRowid), file_name }, { status: 201 });
}
