import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { loadModel } from "@/lib/db-load";
import { buscarShibata } from "@/lib/mercados/shibata";
import { buscarSemar } from "@/lib/mercados/semar";
import { buscarAlabarce } from "@/lib/mercados/alabarce";
import { escolherMatches, extrairTermoBusca, type MercadoId } from "@/lib/matching";
import { mapComConcorrencia } from "@/lib/concorrencia";
import { round2 } from "@/lib/format";
import type { Item } from "@/lib/types";
import type { ItemEncontrado, ResultadoCotacao, ResultadoMercado } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCORRENCIA = 4;
const NOMES: Record<MercadoId, string> = { shibata: "Shibata", semar: "Semar", alabarce: "Alabarce" };

interface AcumuladorMercado {
  total: number;
  encontrados: ItemEncontrado[];
  naoEncontrados: string[];
  tokenExpirado: boolean;
  erro: string | null;
}

function acumuladorVazio(): AcumuladorMercado {
  return { total: 0, encontrados: [], naoEncontrados: [], tokenExpirado: false, erro: null };
}

export async function POST(req: Request) {
  try {
    const { listaId } = (await req.json().catch(() => ({}))) as { listaId?: string };
    if (!listaId) {
      return NextResponse.json({ erro: "listaId é obrigatório." }, { status: 400 });
    }

    const model = await loadModel(getSql());
    const itens = model.itens.filter((i) => i.listaId === listaId);
    const token = model.config.shibataToken;

    if (itens.length === 0) {
      return NextResponse.json({ erro: "Essa listinha está vazia." }, { status: 400 });
    }

    const acumuladores: Record<MercadoId, AcumuladorMercado> = {
      shibata: acumuladorVazio(),
      semar: acumuladorVazio(),
      alabarce: acumuladorVazio(),
    };

    // Uma vez que o token do Shibata falha, não adianta insistir pros
    // próximos itens da mesma cotação — evita 20-30 chamadas 403 em série.
    let shibataToken = token;

    await mapComConcorrencia(itens, CONCORRENCIA, async (item: Item) => {
      const termo = extrairTermoBusca(item.texto);

      const [shibataRes, semarRes, alabarceRes] = await Promise.all([buscarShibata(termo, shibataToken), buscarSemar(termo), buscarAlabarce(termo)]);

      if (shibataRes.tokenExpirado) {
        shibataToken = null;
        acumuladores.shibata.tokenExpirado = true;
      }
      if (shibataRes.erro) acumuladores.shibata.erro = shibataRes.erro;
      if (semarRes.erro) acumuladores.semar.erro = semarRes.erro;
      if (alabarceRes.erro) acumuladores.alabarce.erro = alabarceRes.erro;

      const { escolha } = await escolherMatches(item.texto, {
        shibata: shibataRes.produtos,
        semar: semarRes.produtos,
        alabarce: alabarceRes.produtos,
      });

      const buscas = { shibata: shibataRes, semar: semarRes, alabarce: alabarceRes };
      for (const mercadoId of Object.keys(NOMES) as MercadoId[]) {
        const acc = acumuladores[mercadoId];
        const idx = escolha[mercadoId];
        if (idx == null) {
          acc.naoEncontrados.push(item.texto);
          continue;
        }
        const produto = buscas[mercadoId].produtos[idx];
        acc.total = round2(acc.total + produto.preco);
        acc.encontrados.push({ itemId: item.id, itemTexto: item.texto, produtoNome: produto.nome, preco: produto.preco });
      }
    });

    const resultado: ResultadoCotacao = {
      geradoEm: new Date().toISOString(),
      mercados: (Object.keys(NOMES) as MercadoId[]).map((id): ResultadoMercado => {
        const acc = acumuladores[id];
        return {
          mercadoId: id,
          mercadoNome: NOMES[id],
          total: acc.total,
          encontrados: acc.encontrados,
          naoEncontrados: acc.naoEncontrados,
          ...(id === "shibata" && acc.tokenExpirado ? { tokenExpirado: true } : {}),
          ...(acc.erro ? { erro: acc.erro } : {}),
        };
      }),
    };

    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
