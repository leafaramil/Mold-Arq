// Chamada à API da Anthropic. Só roda no servidor — a chave nunca deve
// chegar ao bundle do cliente (seção 6.5).
import { ARISTIDES_MODEL } from "./aristides";
import type { AnthropicTool } from "./aristides-tools";

export interface FerramentaProposta {
  nome: string;
  input: Record<string, unknown>;
}

export interface RespostaAnthropic {
  texto: string;
  ferramenta: FerramentaProposta | null;
  tokensEntrada: number;
  tokensSaida: number;
}

export async function chamarAnthropic(system: string, mensagemUsuario: string, maxTokens = 1000, tools?: AnthropicTool[]): Promise<RespostaAnthropic> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ARISTIDES_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: mensagemUsuario }],
      ...(tools && tools.length > 0 ? { tools } : {}),
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new Error(`Anthropic respondeu ${resp.status}: ${corpo.slice(0, 300)}`);
  }

  const dados = await resp.json();
  const blocos = (dados.content ?? []) as { type: string; text?: string; name?: string; input?: Record<string, unknown> }[];
  const texto = blocos
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
  const blocoFerramenta = blocos.find((b) => b.type === "tool_use");
  const ferramenta = blocoFerramenta ? { nome: blocoFerramenta.name ?? "", input: blocoFerramenta.input ?? {} } : null;

  return {
    texto,
    ferramenta,
    tokensEntrada: dados.usage?.input_tokens ?? 0,
    tokensSaida: dados.usage?.output_tokens ?? 0,
  };
}
