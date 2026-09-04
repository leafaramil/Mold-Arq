import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { loadModel } from "@/lib/db-load";
import { buscarShibata } from "@/lib/mercados/shibata";
import { buscarSemar } from "@/lib/mercados/semar";
import { buscarAlabarce } from "@/lib/mercados/alabarce";
import { buscarAtacadao } from "@/lib/mercados/atacadao";
import { buscarNagumo } from "@/lib/mercados/nagumo";
import { escolherMatches, extrairTermoBusca, type MercadoId } from "@/lib/matching";
import { buscarComFallback } from "@/lib/mercados/fallback";
import { mapComConcorrencia } from "@/lib/concorrencia";
import type { Item } from "@/lib/types";
import type { ItemNoMercado, ResultadoCotacao, ResultadoMercado } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCORRENCIA = 4;
const NOMES: Record<MercadoId, string> = { shibata: "Shibata", semar: "Semar", alabarce: "Alabarce", atacadao: "Atacadão", nagumo: "Nagumo" };

// O erro por item vive no próprio ItemNoMercado; aqui sobra só o que é
// mesmo do mercado inteiro (o token do Shibata).
interface AcumuladorMercado {
  tokenExpirado: boolean;
}

function acumuladorVazio(): AcumuladorMercado {
  return { tokenExpirado: false };
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
        buscarComFallback(termo, (t: string) => buscarShibata(t, shibataToken)),
        buscarComFallback(termo, buscarSemar),
        buscarComFallback(termo, buscarAlabarce),
        buscarComFallback(termo, buscarAtacadao),
        buscarComFallback(termo, buscarNagumo),
      ]);

      if (shibataRes.tokenExpirado) {
        shibataToken = null;
        acumuladores.shibata.tokenExpirado = true;
      }
      const { escolha, erro: erroMatching, mercadosComErro } = await escolherMatches(item.texto, {
        shibata: shibataRes.produtos,
        semar: semarRes.produtos,
        alabarce: alabarceRes.produtos,
        atacadao: atacadaoRes.produtos,
        nagumo: nagumoRes.produtos,
      });

      const buscas = { shibata: shibataRes, semar: semarRes, alabarce: alabarceRes, atacadao: atacadaoRes, nagumo: nagumoRes };
      for (const mercadoId of Object.keys(NOMES) as MercadoId[]) {
        const busca = buscas[mercadoId];
        // Falha na busca DESSE item nesse mercado (rede/HTTP/parse), token
        // expirado, ou falha do casamento por IA — tudo isso precisa chegar
        // na tela como "não deu pra consultar", nunca como "não encontrado":
        // um item que some em silêncio derruba o total do mercado e o faz
        // parecer o mais barato. O erro de matching só vale pros mercados
        // que dependiam da IA e ela falhou — um mercado já resolvido por
        // texto (matching híbrido) não pode virar "erro" só porque a IA
        // falhou pra OUTRO mercado do mesmo item.
        const erroItem = busca.erro ?? (busca.tokenExpirado ? "token expirado" : undefined) ?? (mercadosComErro?.includes(mercadoId) ? erroMatching : undefined);
        itensPorMercado[mercadoId].set(item.id, {
          itemId: item.id,
          itemTexto: item.texto,
          candidatos: busca.produtos,
          escolhaIndex: escolha[mercadoId],
          ...(erroItem ? { erro: erroItem } : {}),
        });
      }
    });

    const resultado: ResultadoCotacao = {
      geradoEm: new Date().toISOString(),
      mercados: (Object.keys(NOMES) as MercadoId[]).map((id): ResultadoMercado => {
        const acc = acumuladores[id];
        const mapa = itensPorMercado[id];
        const itensDoMercado = itens.map((item) => mapa.get(item.id)!);

        // O erro no nível do MERCADO ("não deu pra consultar esse mercado")
        // só vale quando TODOS os itens falharam — aí sim o mercado está
        // fora do ar. Antes bastava um item falhar pra pintar o mercado
        // inteiro de erro, escondendo que os outros itens vieram certos;
        // agora a falha pontual fica no item (ItemNoMercado.erro) e a tela
        // mostra exatamente qual item não deu pra consultar.
        const todosFalharam = itensDoMercado.length > 0 && itensDoMercado.every((i) => i.erro);
        const erroMercado = todosFalharam ? itensDoMercado[0].erro : undefined;

        return {
          mercadoId: id,
          mercadoNome: NOMES[id],
          itens: itensDoMercado,
          ...(id === "shibata" && acc.tokenExpirado ? { tokenExpirado: true } : {}),
          ...(erroMercado ? { erro: erroMercado } : {}),
        };
      }),
    };

    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
