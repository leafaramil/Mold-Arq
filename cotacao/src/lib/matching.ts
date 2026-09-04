// Casamento de produto por IA (ver briefing): cada item da lista de compras
// (texto livre, ex: "arroz 5kg", "sabonete dove") precisa ser comparado
// contra os resultados de busca de cada mercado pro mesmo termo. Um único
// item pode ter candidatos vindos de até 3 mercados ao mesmo tempo — em vez
// de 1 chamada de IA por (item, mercado), que triplicaria o custo, este
// módulo faz 1 chamada por item, passando os candidatos dos 3 mercados
// juntos e pedindo pro modelo escolher (ou recusar) um match em cada um.
//
// Ponto de atenção de custo (ver briefing): pra uma lista de 20-30 itens,
// isso ainda é uma chamada de IA por item — nada de cache/otimização
// prematura nessa v1, mas o custo existe e cresce linear com o tamanho da
// lista.
import { chamarAnthropicComFerramenta, type AnthropicTool } from "./anthropic-server";
import type { ProdutoEncontrado } from "./mercados/types";

export type MercadoId = "shibata" | "semar" | "alabarce" | "atacadao" | "nagumo";

const SEM_MATCH = -1;

// Tokens que descrevem quantidade/embalagem, não o produto. Os mecanismos
// de busca dos mercados não lidam bem com eles misturados ao nome — e
// alguns (o Alabarce, notadamente) fazem match estrito, então uma palavra
// dessas sobrando na busca devolve ZERO resultado e o app mostra "não
// encontrado" como se o mercado não vendesse o produto.
const UNIDADE_COLADA = /^\d+([.,]\d+)?\s*(kg|k|g|gr|grs|mg|ml|l|lt|lts|un|und|unid|unidades?|pct|pacotes?|cx|caixas?|dz|d[úu]zias?|fardos?|latas?|garrafas?|sach[êe]s?|sacos?|litros?|gramas?|quilos?)$/i;
const UNIDADE_SOLTA = /^(kg|k|g|gr|grs|mg|ml|l|lt|lts|un|und|unid|unidades?|pct|pacotes?|cx|caixas?|dz|d[úu]zias?|fardos?|latas?|garrafas?|sach[êe]s?|sacos?|litros?|gramas?|quilos?|embalagens?|refis?|refil)$/i;
const NUMERO = /^\d+([.,]\d+)?$/;

// Preposições/artigos: não são "conteúdo" (não gastam o orçamento de
// palavras), mas TAMBÉM não são removidas do meio do termo — tirar o "de"
// de "creme de leite" gera "creme leite", que quebra busca por
// correspondência literal. Ficam quando estão entre duas palavras de
// conteúdo aproveitadas.
const CONECTIVO = /^(de|do|da|dos|das|e|em|no|na|nos|nas|com|sem|para|pra|ao|aos|à|às|a|o|os|as|um|uma|uns|umas|por|tipo)$/i;

// Quantas palavras de CONTEÚDO entram na busca. Mais que isso deixa o termo
// específico demais e volta vazio; menos, genérico demais.
const MAX_PALAVRAS_CONTEUDO = 2;

function ehDescartavel(palavra: string): boolean {
  return palavra.length === 0 || NUMERO.test(palavra) || UNIDADE_COLADA.test(palavra) || UNIDADE_SOLTA.test(palavra);
}

/**
 * Simplifica o texto livre do item para um termo de busca — ex:
 * "arroz 5 kg integral" → "arroz integral", "2 kg de feijão" → "feijão",
 * "sabão em pó omo" → "sabão em pó".
 *
 * Heurística determinística de propósito (sem chamada de IA extra):
 * descarta quantidade/unidade/embalagem, pega as duas primeiras palavras de
 * conteúdo e devolve o TRECHO ORIGINAL entre elas (preservando conectivos
 * no meio), pra não desmontar nomes como "creme de leite".
 */
export function extrairTermoBusca(textoItem: string): string {
  const original = textoItem.trim();
  const palavras = original.split(/\s+/).filter((p) => p.length > 0);
  const uteis = palavras.filter((p) => !ehDescartavel(p));

  // Índices (dentro de `uteis`) das palavras que contam como conteúdo.
  const conteudo: number[] = [];
  for (let i = 0; i < uteis.length; i++) {
    if (!CONECTIVO.test(uteis[i])) conteudo.push(i);
  }

  // Nada além de números/unidades/conectivos — não dá pra melhorar, manda o
  // texto original e deixa o mercado decidir.
  if (conteudo.length === 0) return uteis.join(" ") || original;

  const inicio = conteudo[0];
  const fim = conteudo[Math.min(MAX_PALAVRAS_CONTEUDO, conteudo.length) - 1];
  return uteis.slice(inicio, fim + 1).join(" ");
}

/**
 * Termo mais curto pra segunda tentativa quando um mercado devolve zero
 * resultados: só a primeira palavra de conteúdo ("feijão carioca" →
 * "feijão"). Devolve `null` quando não existe termo mais curto que o
 * original — aí não vale a pena repetir a busca.
 */
export function termoFallback(termo: string): string | null {
  const partes = termo.split(/\s+/).filter((p) => p.length > 0 && !CONECTIVO.test(p));
  if (partes.length <= 1) return null;
  return partes[0];
}

interface CandidatosPorMercado {
  shibata: ProdutoEncontrado[];
  semar: ProdutoEncontrado[];
  alabarce: ProdutoEncontrado[];
  atacadao: ProdutoEncontrado[];
  nagumo: ProdutoEncontrado[];
}

export interface MatchEscolhido {
  shibata: number | null; // índice em candidatos.shibata, ou null
  semar: number | null;
  alabarce: number | null;
  atacadao: number | null;
  nagumo: number | null;
}

const TOOL: AnthropicTool = {
  name: "escolher_matches",
  description:
    "Escolhe, para cada mercado, qual candidato da lista (se algum) é realmente o mesmo produto que o item da lista de compras descreve. " +
    "Nomes e marcas variam entre mercados e entre como a pessoa descreveu o item — use bom senso (sinônimos, abreviações, marca vs. genérico). " +
    `Se nenhum candidato daquele mercado for um match razoável, responda ${SEM_MATCH} pra esse mercado — nunca escolha o candidato só por ser o mais parecido se ele não for realmente o mesmo produto.`,
  input_schema: {
    type: "object",
    properties: {
      shibata: { type: "integer", description: `Índice (a partir de 0) do candidato do Shibata, ou ${SEM_MATCH} se nenhum servir.` },
      semar: { type: "integer", description: `Índice (a partir de 0) do candidato do Semar, ou ${SEM_MATCH} se nenhum servir.` },
      alabarce: { type: "integer", description: `Índice (a partir de 0) do candidato do Alabarce, ou ${SEM_MATCH} se nenhum servir.` },
      atacadao: { type: "integer", description: `Índice (a partir de 0) do candidato do Atacadão, ou ${SEM_MATCH} se nenhum servir.` },
      nagumo: { type: "integer", description: `Índice (a partir de 0) do candidato do Nagumo, ou ${SEM_MATCH} se nenhum servir.` },
    },
    required: ["shibata", "semar", "alabarce", "atacadao", "nagumo"],
  },
};

function listarCandidatos(nome: string, produtos: ProdutoEncontrado[]): string {
  if (produtos.length === 0) return `${nome}: (sem resultados de busca)`;
  const linhas = produtos.map((p, i) => `  [${i}] ${p.nome} — R$ ${p.preco.toFixed(2)}${p.disponivel ? "" : " (indisponível)"}`);
  return `${nome}:\n${linhas.join("\n")}`;
}

function indiceValido(i: number | undefined, tamanho: number, mercado: string, itemTexto: string): number | null {
  if (i == null || i === SEM_MATCH) return null;
  if (i < 0 || i >= tamanho) {
    // Índice fora da lista é erro da IA, não "não encontrado" — vira null do
    // mesmo jeito (não dá pra adivinhar o produto), mas logar deixa isso
    // visível nos runtime logs em vez de virar um sumiço silencioso.
    console.error(`[matching] IA devolveu índice ${i} fora da lista de ${tamanho} candidatos do ${mercado} pro item "${itemTexto}"`);
    return null;
  }
  return i;
}

/** Sem candidato nenhum nos 3 mercados, nem vale a pena chamar a IA. */
function semCandidatos(c: CandidatosPorMercado): boolean {
  return c.shibata.length === 0 && c.semar.length === 0 && c.alabarce.length === 0 && c.atacadao.length === 0 && c.nagumo.length === 0;
}

export interface ResultadoMatching {
  escolha: MatchEscolhido;
  tokensEntrada: number;
  tokensSaida: number;
  // Preenchido quando o casamento NÃO pôde ser feito (API da Anthropic fora
  // do ar, sem crédito, resposta sem tool_use...). Nesse caso `escolha` vem
  // toda nula, mas isso não quer dizer "não encontrado": quem chama precisa
  // marcar o item como falha, senão o produto some da conta em silêncio.
  erro?: string;
}

export async function escolherMatches(itemTexto: string, candidatos: CandidatosPorMercado): Promise<ResultadoMatching> {
  const vazio: MatchEscolhido = { shibata: null, semar: null, alabarce: null, atacadao: null, nagumo: null };
  if (semCandidatos(candidatos)) {
    return { escolha: vazio, tokensEntrada: 0, tokensSaida: 0 };
  }

  const system =
    "Você ajuda a comparar preços de mercado. Recebe o item que a pessoa quer comprar (descrito livremente) e os resultados de busca " +
    "de até 3 mercados diferentes para esse item. Sua única tarefa é indicar qual resultado (se algum) de cada mercado é de fato o mesmo " +
    "produto — nunca invente um match forçado.";

  const mensagem = [
    `Item da lista de compras: "${itemTexto}"`,
    "",
    "Candidatos encontrados em cada mercado:",
    listarCandidatos("Shibata", candidatos.shibata),
    listarCandidatos("Semar", candidatos.semar),
    listarCandidatos("Alabarce", candidatos.alabarce),
    listarCandidatos("Atacadão", candidatos.atacadao),
    listarCandidatos("Nagumo", candidatos.nagumo),
  ].join("\n");

  // Uma falha aqui costumava estourar a cotação inteira (500) ou, pior,
  // passar batido e marcar TODOS os mercados como "não encontrado" pra esse
  // item. Agora vira um erro explícito por item, que a tela mostra como
  // falha de busca e o ranking trata como "esse mercado não é comparável".
  let resposta;
  try {
    resposta = await chamarAnthropicComFerramenta(system, mensagem, TOOL);
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.error(`[matching] falha na chamada de IA pro item "${itemTexto}": ${erro}`);
    return { escolha: vazio, tokensEntrada: 0, tokensSaida: 0, erro: "falha ao casar o produto" };
  }

  if (!resposta.ferramenta) {
    console.error(`[matching] resposta da IA sem tool_use pro item "${itemTexto}"`);
    return { escolha: vazio, tokensEntrada: resposta.tokensEntrada, tokensSaida: resposta.tokensSaida, erro: "falha ao casar o produto" };
  }

  const input = resposta.ferramenta.input;

  const escolha: MatchEscolhido = {
    shibata: indiceValido(input.shibata as number | undefined, candidatos.shibata.length, "Shibata", itemTexto),
    semar: indiceValido(input.semar as number | undefined, candidatos.semar.length, "Semar", itemTexto),
    alabarce: indiceValido(input.alabarce as number | undefined, candidatos.alabarce.length, "Alabarce", itemTexto),
    atacadao: indiceValido(input.atacadao as number | undefined, candidatos.atacadao.length, "Atacadão", itemTexto),
    nagumo: indiceValido(input.nagumo as number | undefined, candidatos.nagumo.length, "Nagumo", itemTexto),
  };

  return { escolha, tokensEntrada: resposta.tokensEntrada, tokensSaida: resposta.tokensSaida };
}
