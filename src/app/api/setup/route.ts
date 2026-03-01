import { NextResponse } from "next/server";
import { db, initDB } from "@/db";

export async function GET() {
  try {
    await initDB();

    const tables = await db.execute(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    );
    const tableNames = tables.rows.map(r => r.name as string);
    const expected = ["attachments","audit_log","breakdowns","equipment","qualifications","requalifications","revalidation_phases"];

    return NextResponse.json({
      ok: true,
      db_url: process.env.TURSO_DATABASE_URL ?? "NOT SET",
      tables: tableNames,
      missing: expected.filter(t => !tableNames.includes(t)),
      all_present: expected.every(t => tableNames.includes(t)),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      db_url: process.env.TURSO_DATABASE_URL ?? "NOT SET",
      error: String(err),
    }, { status: 500 });
  }
}
