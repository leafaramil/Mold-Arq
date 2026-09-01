// Chamada à API da Anthropic. Só roda no servidor — a chave nunca deve
// chegar ao bundle do cliente. Mesmo padrão do projeto Caderno
// (src/lib/anthropic-server.ts de lá), reaproveitando a mesma
// ANTHROPIC_API_KEY já configurada no ambiente Vercel.
const COTACAO_MODEL = "claude-sonnet-4-6";

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface FerramentaProposta {
  nome: string;
  input: Record<string, unknown>;
}

export interface RespostaAnthropic {
  ferramenta: FerramentaProposta | null;
  tokensEntrada: number;
  tokensSaida: number;
}

/**
 * Chama a API com uma única ferramenta e força seu uso (`tool_choice`) —
 * o matching de produto (src/lib/matching.ts) sempre quer uma resposta
 * estruturada, nunca texto livre.
 */
export async function chamarAnthropicComFerramenta(system: string, mensagemUsuario: string, tool: AnthropicTool, maxTokens = 600): Promise<RespostaAnthropic> {
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
      model: COTACAO_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: mensagemUsuario }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    throw new Error(`Anthropic respondeu ${resp.status}: ${corpo.slice(0, 300)}`);
  }

  const dados = await resp.json();
  const blocos = (dados.content ?? []) as { type: string; name?: string; input?: Record<string, unknown> }[];
  const blocoFerramenta = blocos.find((b) => b.type === "tool_use");
  const ferramenta = blocoFerramenta ? { nome: blocoFerramenta.name ?? "", input: blocoFerramenta.input ?? {} } : null;

  return {
    ferramenta,
    tokensEntrada: dados.usage?.input_tokens ?? 0,
    tokensSaida: dados.usage?.output_tokens ?? 0,
  };
}
