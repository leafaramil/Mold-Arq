// Semar — plataforma Osuper. Sem autenticação, CORS liberado. Usa o
// endpoint de busca completa (não o "instant_search", que só traz 5
// resultados de preview).
import type { BuscaMercado } from "./types";

const BASE = "https://sense.osuper.com.br/336/1703/search";

interface HitSemar {
  name: string;
  pricing?: { price?: number; promotionalPrice?: number };
  quantity?: { inStock?: number };
}

export async function buscarSemar(termo: string): Promise<BuscaMercado> {
  const params = new URLSearchParams({
    brands: "",
    categories: "",
    tags: "",
    size: "200",
    from: "0",
    search: termo,
    sortField: "_score",
    sortOrder: "desc",
  });

  let resp: Response;
  try {
    resp = await fetch(`${BASE}?${params.toString()}`, { headers: { Accept: "application/json" } });
  } catch (e) {
    console.error(`[semar] falha de rede pro termo "${termo}": ${e instanceof Error ? e.message : String(e)}`);
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    console.error(`[semar] respondeu ${resp.status} pro termo "${termo}": ${corpo.slice(0, 500)}`);
    return { produtos: [], erro: `Semar respondeu ${resp.status}` };
  }

  const bruto = await resp.text();
  let dados: { hits?: HitSemar[] };
  try {
    dados = JSON.parse(bruto);
  } catch (e) {
    console.error(`[semar] resposta não é JSON pro termo "${termo}": ${bruto.slice(0, 500)}`);
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  const hits = dados.hits ?? [];

  // Visto em produção: o Semar às vezes ignora o `size=200` pedido e devolve
  // uma lista de "sugestões" genéricas (produtos sem relação com o termo
  // buscado) repetida milhares de vezes, sempre com preço 0 e indisponível —
  // não é resultado de busca de verdade. Preço 0 nunca é um preço real de
  // mercado, então filtra essas entradas; o teto extra é só uma blindagem
  // (o `size` pedido já devia bastar) pra não inflar o prompt da IA.
  const produtos = hits
    .map((h) => {
      const preco = h.pricing?.promotionalPrice ?? h.pricing?.price ?? 0;
      return { nome: h.name, preco, disponivel: (h.quantity?.inStock ?? 0) > 0 };
    })
    .filter((p) => p.preco > 0)
    .slice(0, 200);

  // Diagnóstico: 0 produtos válidos, ou uma quantidade de hits brutos muito
  // acima do `size` pedido, indicam resposta fora do esperado — loga uma
  // amostra pra investigar via runtime logs (mesmo padrão do Alabarce).
  if (produtos.length === 0 || hits.length > 200) {
    console.error(`[semar] resposta suspeita pro termo "${termo}" — ${hits.length} hits brutos, ${produtos.length} com preço válido. Amostra: ${bruto.slice(0, 500)}`);
  }

  return { produtos };
}
