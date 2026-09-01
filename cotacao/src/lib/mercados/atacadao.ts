// Atacadão — GraphQL, sem autenticação (ver adendo do briefing).
//
// `seller` e `regionId` na facet "channel" são fixos, específicos da loja
// Atacadão mais próxima do CEP de Mogi das Cruzes — não são geolocalizados
// nem configuráveis, são exatamente os valores que o briefing mandou usar.
//
// Paginação: o adendo não confirma se `after` aceita string numérica
// incremental ("20", "40"...) ou exige o cursor devolvido em `pageInfo` da
// página anterior. Pra não arriscar quebrar silenciosamente numa hipótese
// não validada, busca só a primeira página (20 resultados) — mesmo padrão
// do Semar e do Alabarce, que também não paginam; 20 candidatos por termo
// já é generoso pro matching por IA.
import type { BuscaMercado } from "./types";

const BASE = "https://www.atacadao.com.br/api/graphql";
const CHANNEL = JSON.stringify({ salesChannel: "1", seller: "atacadaobr940", regionId: "U1cjYXRhY2FkYW9icjkOMA==" });

interface ProdutoAtacadao {
  name: string;
  offers?: { lowPrice?: number | null } | null;
}

export function montarUrlAtacadao(termo: string): string {
  const variables = {
    first: 20,
    after: "0",
    sort: "score_desc",
    term: termo,
    selectedFacets: [
      { key: "channel", value: CHANNEL },
      { key: "locale", value: "pt-BR" },
    ],
  };
  const params = new URLSearchParams({ operationName: "ProductsQuery", variables: JSON.stringify(variables) });
  return `${BASE}?${params.toString()}`;
}

export async function buscarAtacadao(termo: string): Promise<BuscaMercado> {
  let resp: Response;
  try {
    resp = await fetch(montarUrlAtacadao(termo), { headers: { Accept: "application/json" } });
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    return { produtos: [], erro: `Atacadão respondeu ${resp.status}` };
  }

  let dados: { data?: { search?: { products?: { edges?: { node?: ProdutoAtacadao }[] } } } };
  try {
    dados = await resp.json();
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  const edges = dados.data?.search?.products?.edges ?? [];
  // A API não expõe estoque — trata todo produto com preço válido como
  // disponível (mesma regra do Semar/Alabarce quando falta esse campo).
  const produtos = edges
    .map((e) => e.node)
    .filter((n): n is ProdutoAtacadao => n != null && typeof n.offers?.lowPrice === "number")
    .map((n) => ({ nome: n.name, preco: n.offers!.lowPrice as number, disponivel: true }));

  return { produtos };
}
