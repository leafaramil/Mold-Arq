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
  // Investigado em produção (rotas de diagnóstico temporárias, já
  // removidas): mandar `size` acima de ~20 (testado: 50 já quebra), ou
  // qualquer outro parâmetro extra (from, page, sortField, sortOrder,
  // brands/categories/tags vazios...) além de `search`+`size`, faz o
  // backend do Semar ignorar o termo buscado e devolver um catálogo
  // genérico de ~22 mil itens sem relação nenhuma com a busca. `size=20`
  // é o maior valor confirmado que ainda devolve busca de verdade.
  const params = new URLSearchParams({ search: termo, size: "20" });

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

  // Preço 0 nunca é um preço real de mercado — filtra por segurança. O
  // teto extra é só blindagem contra a resposta quebrada (ver comentário
  // acima) escapar pelo filtro de preço mesmo assim.
  const produtos = hits
    .map((h) => {
      // `promotionalPrice` vem 0 (não null/undefined) quando não há promoção
      // ativa — usar `??` aqui pegava esse 0 como se fosse o preço real,
      // zerando produtos com preço normal. Só usa promotionalPrice quando
      // é de fato um valor positivo (promoção ativa).
      const promo = h.pricing?.promotionalPrice;
      const preco = promo && promo > 0 ? promo : (h.pricing?.price ?? 0);
      return { nome: h.name, preco, disponivel: (h.quantity?.inStock ?? 0) > 0 };
    })
    .filter((p) => p.preco > 0)
    .slice(0, 30);

  // Diagnóstico: 0 produtos válidos, ou uma quantidade de hits brutos muito
  // acima do `size=20` pedido, indicam resposta fora do esperado — loga uma
  // amostra pra investigar via runtime logs (mesmo padrão do Alabarce).
  if (produtos.length === 0 || hits.length > 30) {
    console.error(`[semar] resposta suspeita pro termo "${termo}" — ${hits.length} hits brutos, ${produtos.length} com preço válido. Amostra: ${bruto.slice(0, 500)}`);
  }

  return { produtos };
}
