// Alabarce — plataforma Bluesoft.
//
// O briefing descreve um proxy serverless separado (consulta-precos-proxy)
// criado só porque o site do Alabarce não libera CORS para chamadas de
// FRONTEND (browser). Essa busca aqui roda inteira no servidor do app (rota
// /api/cotar, chamada a partir de src/lib/mercados/*) — CORS é uma restrição
// que só o navegador aplica, então uma chamada servidor-a-servidor não
// esbarra nela, e o proxy separado deixa de ser necessário. Se o Alabarce
// algum dia passar a exigir algo além do header abaixo, o código-fonte do
// proxy antigo (no briefing) é a referência.
import type { BuscaMercado } from "./types";

const BASE = "https://alabarce.net.br/search";

interface ProdutoAlabarce {
  name: string;
  price: string; // formato brasileiro: "5,90" ou "1.234,56"
}

export function parsePrecoBR(preco: string): number {
  const n = parseFloat(String(preco).replace(".", "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export async function buscarAlabarce(termo: string): Promise<BuscaMercado> {
  const params = new URLSearchParams({ keywords: termo, hash: "false", webview: "" });

  let resp: Response;
  try {
    resp = await fetch(`${BASE}?${params.toString()}`, { headers: { Accept: "application/json" } });
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    return { produtos: [], erro: `Alabarce respondeu ${resp.status}` };
  }

  let dados: { products?: ProdutoAlabarce[] };
  try {
    dados = await resp.json();
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  // A API do Alabarce não expõe campo de estoque/disponibilidade — trata
  // tudo que veio na resposta como disponível (ver briefing).
  const produtos = (dados.products ?? []).map((p) => ({ nome: p.name, preco: parsePrecoBR(p.price), disponivel: true }));

  return { produtos };
}
