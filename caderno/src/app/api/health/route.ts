import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    return NextResponse.json({ ok: true, db: "conectado" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "sem conexão", erro: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
