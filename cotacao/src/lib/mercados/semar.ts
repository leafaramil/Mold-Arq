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
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    return { produtos: [], erro: `Semar respondeu ${resp.status}` };
  }

  let dados: { hits?: HitSemar[] };
  try {
    dados = await resp.json();
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  const produtos = (dados.hits ?? []).map((h) => {
    const preco = h.pricing?.promotionalPrice ?? h.pricing?.price ?? 0;
    return { nome: h.name, preco, disponivel: (h.quantity?.inStock ?? 0) > 0 };
  });

  return { produtos };
}
