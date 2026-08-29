import { NextResponse } from "next/server";
import { systemPromptAristides } from "@/lib/aristides";
import { ARISTIDES_TOOLS } from "@/lib/aristides-tools";
import { chamarAnthropic } from "@/lib/anthropic-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { mensagem, retrato, indice, nomeAssistente, mesAtual } = (await req.json()) as {
      mensagem: string;
      retrato: string;
      indice: string;
      nomeAssistente: string;
      mesAtual: string;
    };
    if (!mensagem || !retrato) {
      return NextResponse.json({ erro: "mensagem e retrato são obrigatórios" }, { status: 400 });
    }
    const system = systemPromptAristides(nomeAssistente || "Aristides", retrato, indice || "", mesAtual || "");
    const resposta = await chamarAnthropic(system, mensagem, 1000, ARISTIDES_TOOLS);
    return NextResponse.json(resposta);
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
