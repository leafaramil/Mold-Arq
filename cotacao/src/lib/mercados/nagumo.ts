// Nagumo — sem API JSON separada (ver adendo do briefing): os dados de
// produto vêm embutidos direto no HTML da página de busca, dentro de um
// elemento customizado `<search-card-grid products="...">` (JSON escapado
// como atributo HTML). Essa busca roda no servidor do próprio app, igual
// aos outros mercados — sem depender do proxy avulso mencionado no adendo
// (mesma lógica de extração, só que direto contra nagumo.com.br).
//
// Paginação: validada contra o site real. A primeira página continua vindo
// do HTML normal (acima). Páginas seguintes usam o endpoint AJAX interno
// do site (Search-UpdateGrid?q=...&start=N&sz=20) — mas atenção, ele NÃO
// devolve o mesmo formato embutido da página normal: é um JSON à parte,
// com os produtos em `productsSearchResult[]` (mesmos campos —
// productName/brand/price.sales.value/available — só que soltos no JSON,
// sem precisar decodificar entidades HTML) e o total de resultados em
// `count`. Busca em loop até esgotar `count` ou até um teto de segurança
// (100 produtos / 5 páginas), o que vier primeiro.
import type { BuscaMercado } from "./types";

const BASE = "https://www.nagumo.com.br/busca";
const UPDATE_GRID = "https://www.nagumo.com.br/on/demandware.store/Sites-Nagumo-Site/pt_BR/Search-UpdateGrid";
const TAMANHO_PAGINA = 20;
const MAX_PRODUTOS = 100;
const UA_NAVEGADOR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const ENTITY_MAP: Record<string, string> = {
  quot: '"',
  amp: "&",
  apos: "'",
  lt: "<",
  gt: ">",
  atilde: "ã",
  otilde: "õ",
  ccedil: "ç",
  Ccedil: "Ç",
  eacute: "é",
  Eacute: "É",
  ecirc: "ê",
  Ecirc: "Ê",
  iacute: "í",
  oacute: "ó",
  Oacute: "Ó",
  ocirc: "ô",
  uacute: "ú",
  agrave: "à",
  aacute: "á",
  Aacute: "Á",
  acirc: "â",
  ordm: "º",
  ordf: "ª",
  nbsp: " ",
  ntilde: "ñ",
};

export function decodeHtmlEntities(str: string): string {
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ent: string) => {
    if (ent[0] === "#") {
      const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return ENTITY_MAP[ent] !== undefined ? ENTITY_MAP[ent] : match;
  });
}

interface ProdutoNagumoRaw {
  productName: string;
  brand?: string;
  price?: { sales?: { value?: number } };
  available?: boolean;
}

/**
 * Acha o elemento `<search-card-grid products="...">` no HTML e devolve o
 * JSON já decodificado. `null` quando o elemento não aparece (busca sem
 * resultado, ou a página mudou de estrutura) — não é erro, só "nada aqui".
 * Um JSON malformado DEPOIS de achar o elemento, esse sim propaga como
 * erro de verdade (mudança de formato inesperada, vale investigar).
 */
export function extrairProdutosDoHtml(html: string): ProdutoNagumoRaw[] | null {
  const match = html.match(/<search-card-grid[^>]*\sproducts="([^"]*)"/);
  if (!match) return null;
  return JSON.parse(decodeHtmlEntities(match[1]));
}

interface RespostaUpdateGrid {
  productsSearchResult?: ProdutoNagumoRaw[];
  count?: number;
}

/**
 * Extrai produtos + total de uma resposta do endpoint AJAX de paginação
 * (Search-UpdateGrid) — formato JSON solto, diferente do embutido na
 * página normal, mas com os mesmos campos por produto.
 */
export function extrairProdutosDoUpdateGrid(json: string): { produtos: ProdutoNagumoRaw[]; total: number } {
  const dados = JSON.parse(json) as RespostaUpdateGrid;
  return { produtos: dados.productsSearchResult ?? [], total: dados.count ?? 0 };
}

function normalizarProdutos(produtosRaw: ProdutoNagumoRaw[]) {
  // Preço zerado/inválido é descartado: um candidato de R$ 0,00 escolhido
  // pela IA faria este mercado parecer artificialmente o mais barato.
  return produtosRaw
    .filter((p) => typeof p.price?.sales?.value === "number" && (p.price!.sales!.value as number) > 0)
    .map((p) => ({ nome: p.productName, preco: p.price!.sales!.value as number, disponivel: p.available !== false }));
}

export async function buscarNagumo(termo: string): Promise<BuscaMercado> {
  const params = new URLSearchParams({ q: termo, "search-button": "", lang: "null" });

  let resp: Response;
  try {
    resp = await fetch(`${BASE}?${params.toString()}`, {
      headers: { Accept: "text/html", "User-Agent": UA_NAVEGADOR },
    });
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (!resp.ok) {
    return { produtos: [], erro: `Nagumo respondeu ${resp.status}` };
  }

  const html = await resp.text();
  let produtosRaw: ProdutoNagumoRaw[] | null;
  try {
    produtosRaw = extrairProdutosDoHtml(html);
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }
  if (produtosRaw == null) {
    return { produtos: [] };
  }

  // Páginas seguintes: falha aqui não derruba a busca inteira — já temos a
  // primeira página, então simplesmente para de paginar.
  let start = TAMANHO_PAGINA;
  let total = produtosRaw.length;
  while (produtosRaw.length < MAX_PRODUTOS && start < total) {
    const paramsGrid = new URLSearchParams({ q: termo, start: String(start), sz: String(TAMANHO_PAGINA) });
    let respGrid: Response;
    try {
      respGrid = await fetch(`${UPDATE_GRID}?${paramsGrid.toString()}`, {
        headers: { Accept: "application/json", "User-Agent": UA_NAVEGADOR },
      });
    } catch {
      break;
    }
    if (!respGrid.ok) break;

    let pagina: { produtos: ProdutoNagumoRaw[]; total: number };
    try {
      pagina = extrairProdutosDoUpdateGrid(await respGrid.text());
    } catch {
      break;
    }
    if (pagina.produtos.length === 0) break;

    produtosRaw = produtosRaw.concat(pagina.produtos);
    total = pagina.total;
    start += TAMANHO_PAGINA;
  }

  return { produtos: normalizarProdutos(produtosRaw).slice(0, MAX_PRODUTOS) };
}
