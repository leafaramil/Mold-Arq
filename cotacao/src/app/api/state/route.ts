import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { loadModel } from "@/lib/db-load";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const model = await loadModel(getSql());
    return NextResponse.json(model);
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
