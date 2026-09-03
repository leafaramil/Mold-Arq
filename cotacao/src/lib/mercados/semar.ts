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

  const produtos = (dados.hits ?? []).map((h) => {
    const preco = h.pricing?.promotionalPrice ?? h.pricing?.price ?? 0;
    return { nome: h.name, preco, disponivel: (h.quantity?.inStock ?? 0) > 0 };
  });

  // Diagnóstico: 0 produtos pode ser genuíno (termo sem resultado), mas
  // também pode indicar mudança de formato de resposta — loga o bruto pra
  // investigar via runtime logs (mesmo padrão do Alabarce).
  if (produtos.length === 0) {
    console.error(`[semar] 0 produtos pro termo "${termo}" — resposta: ${bruto.slice(0, 500)}`);
  }

  return { produtos };
}
