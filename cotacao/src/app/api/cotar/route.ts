import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { loadModel } from "@/lib/db-load";
import { buscarShibata } from "@/lib/mercados/shibata";
import { buscarSemar } from "@/lib/mercados/semar";
import { buscarAlabarce } from "@/lib/mercados/alabarce";
import { buscarAtacadao } from "@/lib/mercados/atacadao";
import { buscarNagumo } from "@/lib/mercados/nagumo";
import { escolherMatches, extrairTermoBusca, type MercadoId } from "@/lib/matching";
import { mapComConcorrencia } from "@/lib/concorrencia";
import type { Item } from "@/lib/types";
import type { ItemNoMercado, ResultadoCotacao, ResultadoMercado } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCORRENCIA = 4;
const NOMES: Record<MercadoId, string> = { shibata: "Shibata", semar: "Semar", alabarce: "Alabarce", atacadao: "Atacadão", nagumo: "Nagumo" };

interface AcumuladorMercado {
  itens: ItemNoMercado[];
  tokenExpirado: boolean;
  erro: string | null;
}

function acumuladorVazio(): AcumuladorMercado {
  return { itens: [], tokenExpirado: false, erro: null };
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
      atacadao: acumuladorVazio(),
      nagumo: acumuladorVazio(),
    };

    // Uma vez que o token do Shibata falha, não adianta insistir pros
    // próximos itens da mesma cotação — evita 20-30 chamadas 403 em série.
    let shibataToken = token;

    // mapComConcorrencia processa vários itens ao mesmo tempo (ver o
    // próprio arquivo) — a ordem de chegada dos resultados não é garantida,
    // então cada mercado guarda seus itens num Map por itemId e só monta a
    // lista final (na ordem da lista de compras) depois que tudo terminou.
    const itensPorMercado: Record<MercadoId, Map<string, ItemNoMercado>> = {
      shibata: new Map(),
      semar: new Map(),
      alabarce: new Map(),
      atacadao: new Map(),
      nagumo: new Map(),
    };

    await mapComConcorrencia(itens, CONCORRENCIA, async (item: Item) => {
      const termo = extrairTermoBusca(item.texto);

      const [shibataRes, semarRes, alabarceRes, atacadaoRes, nagumoRes] = await Promise.all([
        buscarShibata(termo, shibataToken),
        buscarSemar(termo),
        buscarAlabarce(termo),
        buscarAtacadao(termo),
        buscarNagumo(termo),
      ]);

      if (shibataRes.tokenExpirado) {
        shibataToken = null;
        acumuladores.shibata.tokenExpirado = true;
      }
      if (shibataRes.erro) acumuladores.shibata.erro = shibataRes.erro;
      if (semarRes.erro) acumuladores.semar.erro = semarRes.erro;
      if (alabarceRes.erro) acumuladores.alabarce.erro = alabarceRes.erro;
      if (atacadaoRes.erro) acumuladores.atacadao.erro = atacadaoRes.erro;
      if (nagumoRes.erro) acumuladores.nagumo.erro = nagumoRes.erro;

      const { escolha } = await escolherMatches(item.texto, {
        shibata: shibataRes.produtos,
        semar: semarRes.produtos,
        alabarce: alabarceRes.produtos,
        atacadao: atacadaoRes.produtos,
        nagumo: nagumoRes.produtos,
      });

      const buscas = { shibata: shibataRes, semar: semarRes, alabarce: alabarceRes, atacadao: atacadaoRes, nagumo: nagumoRes };
      for (const mercadoId of Object.keys(NOMES) as MercadoId[]) {
        itensPorMercado[mercadoId].set(item.id, {
          itemId: item.id,
          itemTexto: item.texto,
          quantidade: item.quantidade,
          unidade: item.unidade,
          candidatos: buscas[mercadoId].produtos,
          escolhaIndex: escolha[mercadoId],
        });
      }
    });

    const resultado: ResultadoCotacao = {
      geradoEm: new Date().toISOString(),
      mercados: (Object.keys(NOMES) as MercadoId[]).map((id): ResultadoMercado => {
        const acc = acumuladores[id];
        const mapa = itensPorMercado[id];
        return {
          mercadoId: id,
          mercadoNome: NOMES[id],
          itens: itens.map((item) => mapa.get(item.id)!),
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
