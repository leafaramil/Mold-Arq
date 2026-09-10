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

// Sizing pra listas de ~30 itens (o tamanho real mais provável, ver
// histórico) sem esbarrar nos 60s da Vercel Hobby de novo:
//
// - CONCORRENCIA maior processa mais itens ao mesmo tempo. Isso não é
//   trabalho de CPU, é rede (cada item dispara até 5 chamadas HTTP pros
//   mercados) — o gargalo é a latência dos sites externos, não este
//   processo, então mais itens em paralelo reduz o tempo total sem
//   sobrecarregar o servidor. 6 itens * até 5 mercados = até 30 requisições
//   simultâneas no pico, um aumento moderado sobre o valor anterior (4).
// - PRAZO_MS é uma rede de segurança: cada busca de mercado já tem timeout
//   próprio (fetchComTimeout), mas o total de itens × mercados × casamento
//   por IA ainda pode, em tese, superar 60s numa lista grande o bastante.
//   Em vez de deixar a função inteira estourar o limite da Vercel (erro
//   genérico, ZERO resultado pro usuário, nem os itens que já tinham
//   terminado), paramos de iniciar itens NOVOS perto do prazo e devolvemos
//   o que já foi cotado, marcando o resto como "sem tempo hábil". Garante
//   uma resposta sempre dentro do prazo, não importa o tamanho da lista.
const CONCORRENCIA = 6;
const PRAZO_MS = 50_000;
const ERRO_SEM_TEMPO = "Sem tempo hábil pra cotar (lista muito grande) — tente novamente ou divida a lista.";
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
    const { listaId, itemIds } = (await req.json().catch(() => ({}))) as { listaId?: string; itemIds?: string[] };
    if (!listaId) {
      return NextResponse.json({ erro: "listaId é obrigatório." }, { status: 400 });
    }

    const model = await loadModel(getSql());
    // `itemIds`, quando informado, cota só esse subconjunto — é a chamada de
    // continuação que o cliente dispara automaticamente pros itens que
    // sobraram de uma cotação anterior que bateu no prazo de segurança
    // (ver PRAZO_MS abaixo). Sem `itemIds`, cota a lista inteira, como antes.
    const idsFiltro = itemIds && itemIds.length > 0 ? new Set(itemIds) : null;
    const itens = model.itens.filter((i) => i.listaId === listaId && (idsFiltro == null || idsFiltro.has(i.id)));
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

    const inicio = Date.now();
    const itensPendentes: string[] = [];

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
      // Rede de segurança pra listas grandes: se já estourou o prazo
      // seguro, não inicia mais nenhuma busca — só marca o item como "sem
      // tempo hábil" em todos os mercados e segue pro próximo. Os itens já
      // concluídos antes disso não são afetados.
      if (Date.now() - inicio > PRAZO_MS) {
        itensPendentes.push(item.id);
        for (const mercadoId of Object.keys(NOMES) as MercadoId[]) {
          itensPorMercado[mercadoId].set(item.id, {
            itemId: item.id,
            itemTexto: item.texto,
            candidatos: [],
            escolhaIndex: null,
            erro: ERRO_SEM_TEMPO,
          });
        }
        return;
      }

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
      ...(itensPendentes.length > 0 ? { itensPendentes } : {}),
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
