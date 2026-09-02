// Nagumo — sem API JSON separada (ver adendo do briefing): os dados de
// produto vêm embutidos direto no HTML da página de busca, dentro de um
// elemento customizado `<search-card-grid products="...">` (JSON escapado
// como atributo HTML). Essa busca roda no servidor do próprio app, igual
// aos outros mercados — sem depender do proxy avulso mencionado no adendo
// (mesma lógica de extração, só que direto contra nagumo.com.br).
//
// Limitação conhecida: a página só traz os primeiros ~20 produtos por busca
// (a "primeira página"). Existe paginação real no site
// (Search-UpdateGrid?q=...&start=20&sz=20), mas o adendo não confirma se
// ela devolve o mesmo formato embutido ou HTML parcial diferente — fica de
// fora até isso ser investigado, mesmo padrão adotado pros outros mercados
// quando a paginação não estava validada.
import type { BuscaMercado } from "./types";

const BASE = "https://www.nagumo.com.br/busca";

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

export async function buscarNagumo(termo: string): Promise<BuscaMercado> {
  const params = new URLSearchParams({ q: termo, "search-button": "", lang: "null" });

  let resp: Response;
  try {
    resp = await fetch(`${BASE}?${params.toString()}`, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
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

  const produtos = produtosRaw
    .filter((p) => typeof p.price?.sales?.value === "number")
    .map((p) => ({ nome: p.productName, preco: p.price!.sales!.value as number, disponivel: p.available !== false }));

  return { produtos };
}
