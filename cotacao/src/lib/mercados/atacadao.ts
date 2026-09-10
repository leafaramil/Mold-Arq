// Atacadão — GraphQL, sem autenticação (ver adendo do briefing).
//
// `seller` e `regionId` na facet "channel" são fixos, específicos da loja
// Atacadão mais próxima do CEP de Mogi das Cruzes — não são geolocalizados
// nem configuráveis, são exatamente os valores que o briefing mandou usar.
//
// Paginação: validada contra a API real — o cursor `after` aceita offset
// numérico direto como string ("0", "20", "40"...) e `pageInfo.totalCount`
// devolve o total de resultados pro termo. Busca até esgotar o total ou um
// teto de segurança (100 produtos / 5 páginas), o que vier primeiro — 100
// candidatos por termo já é mais que suficiente pro matching, e evita uma
// lista de páginas sem fim pra termos muito genéricos.
import type { BuscaMercado } from "./types";
import { fetchComTimeout } from "./fetch-timeout";

const BASE = "https://www.atacadao.com.br/api/graphql";
const CHANNEL = JSON.stringify({ salesChannel: "1", seller: "atacadaobr940", regionId: "U1cjYXRhY2FkYW9icjkOMA==" });
const TAMANHO_PAGINA = 20;
const MAX_PRODUTOS = 100;
const TIMEOUT_MS = 8000;

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

interface PaginaAtacadao {
  produtos: ReturnType<typeof mapearProdutos>;
  total: number | null;
  erro?: string;
}

async function buscarPagina(termo: string, after: number): Promise<PaginaAtacadao> {
  let resp: Response;
  try {
    resp = await fetchComTimeout(montarUrlAtacadao(termo, String(after)), { headers: { Accept: "application/json" } }, TIMEOUT_MS);
  } catch (e) {
    return { produtos: [], total: null, erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    return { produtos: [], total: null, erro: `Atacadão respondeu ${resp.status}` };
  }

  let dados: RespostaAtacadao;
  try {
    dados = await resp.json();
  } catch (e) {
    return { produtos: [], total: null, erro: e instanceof Error ? e.message : String(e) };
  }

  const searchNode = dados.data?.search?.products;
  const edges = searchNode?.edges ?? [];
  return { produtos: mapearProdutos(edges), total: searchNode?.pageInfo?.totalCount ?? null };
}

export async function buscarAtacadao(termo: string): Promise<BuscaMercado> {
  // Página 1 primeiro, sozinha: se ela falhar, é erro de verdade.
  const primeira = await buscarPagina(termo, 0);
  if (primeira.erro) return { produtos: [], erro: primeira.erro };
  if (primeira.produtos.length === 0) return { produtos: [] };

  let produtos = primeira.produtos;

  // Páginas seguintes em PARALELO, só as que o total real (devolvido pela
  // própria página 1) diz que existem — evita tanto a espera em série de
  // antes (cada página esperando a anterior) quanto pedir páginas que nem
  // existem pra termos com poucos resultados.
  const totalReal = primeira.total ?? produtos.length;
  const totalPaginas = Math.min(Math.ceil(MAX_PRODUTOS / TAMANHO_PAGINA), Math.ceil(totalReal / TAMANHO_PAGINA));
  if (produtos.length < MAX_PRODUTOS && totalPaginas > 1) {
    const offsets = Array.from({ length: totalPaginas - 1 }, (_, i) => (i + 1) * TAMANHO_PAGINA);
    const resto = await Promise.all(offsets.map((after) => buscarPagina(termo, after)));
    for (const r of resto) {
      if (r.produtos.length > 0) produtos = produtos.concat(r.produtos);
    }
  }

  return { produtos: produtos.slice(0, MAX_PRODUTOS) };
}

function mapearProdutos(edges: { node?: ProdutoAtacadao }[]) {
  // A API não expõe estoque — trata todo produto com preço válido como
  // disponível (mesma regra do Semar/Alabarce quando falta esse campo).
  // Preço zerado/inválido é descartado: um candidato de R$ 0,00 escolhido
  // pela IA faria este mercado parecer artificialmente o mais barato.
  return edges
    .map((e) => e.node)
    .filter((n): n is ProdutoAtacadao => n != null && typeof n.offers?.lowPrice === "number" && (n.offers.lowPrice as number) > 0)
    .map((n) => ({ nome: n.name, preco: n.offers!.lowPrice as number, disponivel: true }));
}
