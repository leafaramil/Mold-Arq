// Shibata — plataforma VipCommerce.
//
// Limitação crítica conhecida (ver briefing): o TOKEN_JWT é um token de
// sessão anônima, capturado manualmente via DevTools do navegador — não foi
// encontrada a chamada que o gera automaticamente. Ele expira (frequência
// desconhecida). Por isso o token vive em Ajustes (colado manualmente pelo
// usuário) em vez de num segredo de servidor, e a API devolve 403 Forbidden
// quando expira — tratado aqui como um caso distinto de "produto não
// encontrado", pra não confundir o usuário mostrando "não achamos arroz no
// Shibata" quando na real é o token que morreu.
import type { BuscaMercado, ProdutoEncontrado } from "./types";
import { fetchComRetry } from "./fetch-timeout";

const BASE = "https://services.vipcommerce.com.br/api-admin/v1/org/161/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo";
// 100 candidatos (mesmo teto do Atacadão/Nagumo) já é mais que suficiente
// pro matching; não precisa da cauda longa de páginas raramente relevantes.
const MAX_PAGINAS = 5;
const MAX_PRODUTOS = 100;
const TIMEOUT_MS = 8000;

interface ProdutoShibata {
  produto_id: number;
  descricao: string;
  preco: string;
  disponivel: boolean;
  codigo_barras?: string;
}

interface PaginaShibata {
  produtos: ProdutoEncontrado[];
  tokenExpirado?: boolean;
  erro?: string;
}

function extrairProdutos(pagina: ProdutoShibata[]): ProdutoEncontrado[] {
  const produtos: ProdutoEncontrado[] = [];
  for (const p of pagina) {
    // Preço ilegível (NaN) ou zerado nunca é preço real — deixar passar
    // faria este mercado parecer o mais barato por causa de um dado ruim.
    const preco = parseFloat(p.preco);
    if (!Number.isFinite(preco) || preco <= 0) continue;
    produtos.push({ nome: p.descricao, preco, disponivel: Boolean(p.disponivel) });
  }
  return produtos;
}

async function buscarPagina(termo: string, token: string, session: string, page: number): Promise<PaginaShibata> {
  const url = `${BASE}/${encodeURIComponent(termo)}?page=${page}&session=${session}`;
  let resp: Response;
  try {
    resp = await fetchComRetry(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          OrganizationID: "161",
          DomainKey: "loja.shibata.com.br",
          Accept: "application/json",
        },
      },
      TIMEOUT_MS,
    );
  } catch (e) {
    console.error(`[shibata] falha de rede pro termo "${termo}" (página ${page}): ${e instanceof Error ? e.message : String(e)}`);
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  if (resp.status === 403) {
    console.error(`[shibata] token expirado (403) pro termo "${termo}" (página ${page})`);
    return { produtos: [], tokenExpirado: true };
  }
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    console.error(`[shibata] respondeu ${resp.status} pro termo "${termo}" (página ${page}): ${corpo.slice(0, 500)}`);
    return { produtos: [], erro: `Shibata respondeu ${resp.status}` };
  }

  let dados: { success?: boolean; data?: { produtos?: ProdutoShibata[] } };
  let bruto: string;
  try {
    bruto = await resp.text();
    dados = JSON.parse(bruto);
  } catch (e) {
    return { produtos: [], erro: e instanceof Error ? e.message : String(e) };
  }

  const produtos = extrairProdutos(dados.data?.produtos ?? []);
  // Diagnóstico: sem isso, um "0 produtos" do Shibata (busca vazia, ou
  // candidatos que vieram mas foram todos descartados por preço ilegível)
  // era completamente silencioso — só o Alabarce e o Semar logavam esse
  // caso, então uma falha de busca aqui parecia idêntica a "não achou" na
  // tela, sem nenhuma pista de qual dos dois motivos era.
  if (produtos.length === 0 && page === 1) {
    const brutos = dados.data?.produtos?.length ?? 0;
    console.error(`[shibata] 0 produtos pro termo "${termo}" na página 1 — success=${dados.success}, ${brutos} produtos brutos antes do filtro de preço. Resposta: ${bruto.slice(0, 500)}`);
  }
  return { produtos };
}

export async function buscarShibata(termo: string, token: string | null): Promise<BuscaMercado> {
  if (!token) {
    return { produtos: [], tokenExpirado: true };
  }

  const session = crypto.randomUUID();

  // Página 1 primeiro, sozinha: se ela falhar (token expirado, erro de
  // rede/HTTP), é erro de verdade e não vale a pena tentar o resto.
  const primeira = await buscarPagina(termo, token, session, 1);
  if (primeira.tokenExpirado) return { produtos: [], tokenExpirado: true };
  if (primeira.erro) return { produtos: [], erro: primeira.erro };
  if (primeira.produtos.length === 0) return { produtos: [] };

  let produtos = primeira.produtos;

  // Páginas seguintes em PARALELO (não mais uma de cada vez, esperando a
  // anterior) — pedir 4 páginas em série, cada uma com seu próprio timeout,
  // podia levar até 4x TIMEOUT_MS só nesse mercado, por item da lista. Uma
  // página que falhar aqui não derruba a busca (já temos a página 1 válida).
  if (produtos.length < MAX_PRODUTOS && MAX_PAGINAS > 1) {
    const resto = await Promise.all(Array.from({ length: MAX_PAGINAS - 1 }, (_, i) => buscarPagina(termo, token, session, i + 2)));
    for (const r of resto) {
      if (r.produtos.length > 0) produtos = produtos.concat(r.produtos);
    }
  }

  return { produtos: produtos.slice(0, MAX_PRODUTOS) };
}
