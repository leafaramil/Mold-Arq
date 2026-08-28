import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { applyActionToDb } from "@/lib/db-actions";
import type { Action } from "@/lib/action-types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let action: Action;
  try {
    action = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ ok: false, erro: "corpo inválido" }, { status: 400 });
  }
  try {
    await applyActionToDb(getSql(), action);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
