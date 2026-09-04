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
    // Alguns backends legados bloqueiam/filtram requisições sem User-Agent
    // de navegador (voltam vazio em vez de erro) — buscando "feijão" direto
    // no site funciona, mas via fetch de servidor não achava nada, então
    // este header é a primeira hipótese testada.
    resp = await fetch(`${BASE}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    return { produtos: [], erro: `Alabarce respondeu ${resp.status}` };
  }

  const bruto = await resp.text();
  let dados: { products?: ProdutoAlabarce[] };
  try {
    dados = JSON.parse(bruto);
  } catch (e) {
    console.error(`[alabarce] resposta não é JSON pro termo "${termo}": ${bruto.slice(0, 300)}`);
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  // A API do Alabarce não expõe campo de estoque/disponibilidade — trata
  // tudo que veio na resposta como disponível (ver briefing).
  //
  // O filtro de preço > 0 não é detalhe: `parsePrecoBR` devolve 0 pra
  // qualquer preço que não dê pra ler, e um candidato de R$ 0,00 escolhido
  // pela IA faria este mercado parecer artificialmente o mais barato.
  const produtos = (dados.products ?? [])
    .map((p) => ({ nome: p.name, preco: parsePrecoBR(p.price), disponivel: true }))
    .filter((p) => p.preco > 0);

  // Diagnóstico temporário: se não achou nada, loga o formato bruto da
  // resposta pra investigar via runtime logs — a busca direto no site do
  // Alabarce encontra resultados (confirmado manualmente), então uma busca
  // vazia por aqui é sinal de formato de resposta ou header inesperado, não
  // de "esse mercado não tem esse produto".
  if (produtos.length === 0) {
    console.error(`[alabarce] 0 produtos pro termo "${termo}" — resposta: ${bruto.slice(0, 500)}`);
  }

  return { produtos };
}
