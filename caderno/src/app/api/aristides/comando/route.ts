import { NextResponse } from "next/server";
import { systemPromptComando } from "@/lib/aristides";
import { chamarAnthropic } from "@/lib/anthropic-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { frase, categorias } = (await req.json()) as { frase: string; categorias: string };
    if (!frase) {
      return NextResponse.json({ erro: "frase é obrigatória" }, { status: 400 });
    }
    const system = systemPromptComando(categorias || "");
    const resposta = await chamarAnthropic(system, frase, 200);
    const limpo = resposta.texto.replace(/```json|```/g, "").trim();
    let comando: unknown;
    try {
      comando = JSON.parse(limpo);
    } catch {
      comando = { acao: "erro", motivo: "resposta em formato inesperado" };
    }
    return NextResponse.json({ comando, tokensEntrada: resposta.tokensEntrada, tokensSaida: resposta.tokensSaida });
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
