// Atacadão — GraphQL, sem autenticação (ver adendo do briefing).
//
// `seller` e `regionId` na facet "channel" são fixos, específicos da loja
// Atacadão mais próxima do CEP de Mogi das Cruzes — não são geolocalizados
// nem configuráveis, são exatamente os valores que o briefing mandou usar.
//
// Paginação: validada contra a API real — o cursor `after` aceita offset
// numérico direto como string ("0", "20", "40"...) e `pageInfo.totalCount`
// devolve o total de resultados pro termo. Busca em loop até esgotar o
// total ou até um teto de segurança (100 produtos / 5 páginas), o que
// vier primeiro — 100 candidatos por termo já é mais que suficiente pro
// matching por IA, e evita uma lista de páginas sem fim pra termos muito
// genéricos.
import type { BuscaMercado } from "./types";

const BASE = "https://www.atacadao.com.br/api/graphql";
const CHANNEL = JSON.stringify({ salesChannel: "1", seller: "atacadaobr940", regionId: "U1cjYXRhY2FkYW9icjkOMA==" });
const TAMANHO_PAGINA = 20;
const MAX_PRODUTOS = 100;

interface ProdutoAtacadao {
  name: string;
  offers?: { lowPrice?: number | null } | null;
}

export function montarUrlAtacadao(termo: string, after = "0"): string {
  const variables = {
    first: TAMANHO_PAGINA,
    after,
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

interface RespostaAtacadao {
  data?: {
    search?: {
      products?: {
        pageInfo?: { totalCount?: number };
        edges?: { node?: ProdutoAtacadao }[];
      };
    };
  };
}

export async function buscarAtacadao(termo: string): Promise<BuscaMercado> {
  const produtos: ReturnType<typeof mapearProdutos> = [];
  let after = 0;
  let total = Infinity;

  while (produtos.length < MAX_PRODUTOS && after < total) {
    let resp: Response;
    try {
      resp = await fetch(montarUrlAtacadao(termo, String(after)), { headers: { Accept: "application/json" } });
    } catch (e) {
      if (produtos.length === 0) return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
      break;
    }
    if (!resp.ok) {
      if (produtos.length === 0) return { produtos: [], erro: `Atacadão respondeu ${resp.status}` };
      break;
    }

    let dados: RespostaAtacadao;
    try {
      dados = await resp.json();
    } catch (e) {
      if (produtos.length === 0) return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
      break;
    }

    const searchNode = dados.data?.search?.products;
    const edges = searchNode?.edges ?? [];
    if (edges.length === 0) break;

    produtos.push(...mapearProdutos(edges));
    total = searchNode?.pageInfo?.totalCount ?? produtos.length;
    after += TAMANHO_PAGINA;
  }

  return { produtos: produtos.slice(0, MAX_PRODUTOS) };
}

function mapearProdutos(edges: { node?: ProdutoAtacadao }[]) {
  // A API não expõe estoque — trata todo produto com preço válido como
  // disponível (mesma regra do Semar/Alabarce quando falta esse campo).
  return edges
    .map((e) => e.node)
    .filter((n): n is ProdutoAtacadao => n != null && typeof n.offers?.lowPrice === "number")
    .map((n) => ({ nome: n.name, preco: n.offers!.lowPrice as number, disponivel: true }));
}
