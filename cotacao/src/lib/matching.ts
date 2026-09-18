// Casamento de produto: cada item da lista de compras (texto livre, ex:
// "arroz 5kg", "sabonete dove") precisa ser comparado contra os resultados
// de busca de cada mercado pro mesmo termo. Um único item pode ter
// candidatos vindos de até 5 mercados ao mesmo tempo.
//
// Sem IA: primeiro tenta o cache de preferência aprendida (preferencia_match
// — nome de candidato já confirmado antes pra esse termo+mercado); se a
// busca ao vivo trouxe de novo um candidato com esse nome, resolve direto.
// Senão, pontua todos os candidatos por score determinístico (ver
// matching-score.ts) — cobertura de token + similaridade de string, com
// filtro duro de tamanho. Resolve automaticamente só quando o score é claro;
// o resto cai pra confirmação manual na tela de resultado (nunca IA).
import { decidirMatch } from "./matching-score";
import type { ProdutoEncontrado } from "./mercados/types";

export type MercadoId = "shibata" | "semar" | "alabarce" | "atacadao" | "nagumo";

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

/** Remove acentos pra comparar texto sem depender de "açúcar" vs "acucar" bater certinho. */
export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Palavras de conteúdo do item (sem número/unidade/conectivo), normalizadas pra comparar contra o nome do candidato. */
export function palavrasSignificativas(texto: string): string[] {
  return texto
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !ehDescartavel(p) && !CONECTIVO.test(p))
    .map(normalizarTexto);
}

interface CandidatosPorMercado {
  shibata: ProdutoEncontrado[];
  semar: ProdutoEncontrado[];
  alabarce: ProdutoEncontrado[];
  atacadao: ProdutoEncontrado[];
  nagumo: ProdutoEncontrado[];
}

export interface EscolhaMercado {
  // índice no array de candidatos daquele mercado, ou null quando nenhum foi escolhido.
  indice: number | null;
  // true quando `indice` é null porque o score não teve confiança suficiente
  // pra decidir sozinho (não é "esse mercado não vende isso") — precisa de
  // confirmação manual na tela de resultado.
  ambiguo: boolean;
}

export type MatchEscolhido = Record<MercadoId, EscolhaMercado>;

const SEM_ESCOLHA: EscolhaMercado = { indice: null, ambiguo: false };

/** Sem candidato nenhum nos 5 mercados, nem vale a pena tentar casar. */
function semCandidatos(c: CandidatosPorMercado): boolean {
  return c.shibata.length === 0 && c.semar.length === 0 && c.alabarce.length === 0 && c.atacadao.length === 0 && c.nagumo.length === 0;
}

/**
 * Chave de lookup no cache de preferência aprendida (preferencia_match, ver
 * src/lib/preferencia-match.ts) — termo+mercado, não mercado só, porque o
 * mesmo mercado vende coisas diferentes pra termos diferentes.
 */
export function chavePreferencia(itemTexto: string, mercado: MercadoId): string {
  return `${normalizarTexto(itemTexto.trim())}|${mercado}`;
}

/**
 * Decide o match pra um único mercado. Cache de preferência primeiro: se
 * algum candidato da busca ao vivo bate por nome normalizado com o
 * `nomePreferido` já confirmado antes pra esse termo+mercado, resolve
 * direto sem pontuar (a busca ao vivo pode não trazer o mesmo produto de
 * novo — por indisponibilidade ou mudança de nome — por isso é só um
 * atalho, não uma garantia). Senão, pontua todos os candidatos por score
 * (matching-score.ts): resolve automaticamente só com score alto e folga
 * clara sobre o 2º colocado; o resto é ambiguidade real.
 */
export function escolherMatchMercado(itemTexto: string, candidatos: ProdutoEncontrado[], nomePreferido: string | null): EscolhaMercado {
  if (candidatos.length === 0) return SEM_ESCOLHA;

  if (nomePreferido != null) {
    const indice = candidatos.findIndex((c) => normalizarTexto(c.nome) === nomePreferido);
    if (indice !== -1) return { indice, ambiguo: false };
  }

  const { indice, ambiguo } = decidirMatch(itemTexto, candidatos);
  return { indice, ambiguo };
}

export interface ResultadoMatching {
  escolha: MatchEscolhido;
}

/**
 * `preferencias` é o cache de preferência aprendida, carregado uma vez por
 * cotação inteira (não uma consulta por item/mercado) — ver
 * src/lib/preferencia-match.ts e o carregamento em src/app/api/cotar/route.ts.
 * Puramente síncrono: sem IA e sem chamada de banco aqui dentro.
 */
export function escolherMatches(itemTexto: string, candidatos: CandidatosPorMercado, preferencias: Map<string, string> = new Map()): ResultadoMatching {
  if (semCandidatos(candidatos)) {
    return { escolha: { shibata: SEM_ESCOLHA, semar: SEM_ESCOLHA, alabarce: SEM_ESCOLHA, atacadao: SEM_ESCOLHA, nagumo: SEM_ESCOLHA } };
  }

  const mercados = Object.keys(candidatos) as MercadoId[];
  const escolha = {} as MatchEscolhido;
  for (const m of mercados) {
    const nomePreferido = preferencias.get(chavePreferencia(itemTexto, m)) ?? null;
    escolha[m] = escolherMatchMercado(itemTexto, candidatos[m], nomePreferido);
  }

  return { escolha };
}
