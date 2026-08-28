import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { loadModel } from "@/lib/db-load";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const model = await loadModel(getSql());
    const corpo = JSON.stringify({ versao: 1, exportadoEm: new Date().toISOString(), ...model }, null, 2);
    return new NextResponse(corpo, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="caderno-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
