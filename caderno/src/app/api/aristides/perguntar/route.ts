import { NextResponse } from "next/server";
import { systemPromptAristides } from "@/lib/aristides";
import { chamarAnthropic } from "@/lib/anthropic-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { pergunta, retrato, nomeAssistente } = (await req.json()) as {
      pergunta: string;
      retrato: string;
      nomeAssistente: string;
    };
    if (!pergunta || !retrato) {
      return NextResponse.json({ erro: "pergunta e retrato são obrigatórios" }, { status: 400 });
    }
    const system = systemPromptAristides(nomeAssistente || "Aristides", retrato);
    const resposta = await chamarAnthropic(system, pergunta, 1000);
    return NextResponse.json(resposta);
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
