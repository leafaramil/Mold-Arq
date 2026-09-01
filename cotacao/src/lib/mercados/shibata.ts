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

const BASE = "https://services.vipcommerce.com.br/api-admin/v1/org/161/filial/1/centro_distribuicao/1/loja/buscas/produtos/termo";
const MAX_PAGINAS = 20;

interface ProdutoShibata {
  produto_id: number;
  descricao: string;
  preco: string;
  disponivel: boolean;
  codigo_barras?: string;
}

export async function buscarShibata(termo: string, token: string | null): Promise<BuscaMercado> {
  if (!token) {
    return { produtos: [], tokenExpirado: true };
  }

  const session = crypto.randomUUID();
  const produtos: ProdutoEncontrado[] = [];

  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const url = `${BASE}/${encodeURIComponent(termo)}?page=${page}&session=${session}`;
    let resp: Response;
    try {
      resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          OrganizationID: "161",
          DomainKey: "loja.shibata.com.br",
          Accept: "application/json",
        },
      });
    } catch (e) {
      return { produtos, erro: e instanceof Error ? e.message : String(e) };
    }

    if (resp.status === 403) {
      return { produtos, tokenExpirado: true };
    }
    if (!resp.ok) {
      return { produtos, erro: `Shibata respondeu ${resp.status}` };
    }

    let dados: { success?: boolean; data?: { produtos?: ProdutoShibata[] } };
    try {
      dados = await resp.json();
    } catch (e) {
      return { produtos, erro: e instanceof Error ? e.message : String(e) };
    }

    const pagina = dados.data?.produtos ?? [];
    if (pagina.length === 0) break;

    for (const p of pagina) {
      produtos.push({ nome: p.descricao, preco: parseFloat(p.preco), disponivel: Boolean(p.disponivel) });
    }
  }

  return { produtos };
}
