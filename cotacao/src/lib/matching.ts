// Casamento de produto: cada item da lista de compras (texto livre, ex:
// "arroz 5kg", "sabonete dove") precisa ser comparado contra os resultados
// de busca de cada mercado pro mesmo termo. Um único item pode ter
// candidatos vindos de até 5 mercados ao mesmo tempo.
//
// Híbrido, pra não gastar IA em toda cotação: primeiro tenta casar por
// texto (casamentoDeterministico) — resolve de graça os casos óbvios, tipo
// "arroz" batendo só com "Arroz Camil 5kg" entre os candidatos. Só o que
// sobra ambíguo (nome bem diferente, sinônimo, marca vs. genérico, ou dois
// candidatos parecidos demais pra decidir por texto) vai pra 1 chamada de
// IA cobrindo os mercados que restaram — nunca 1 chamada por mercado, e
// nenhuma chamada quando tudo já resolveu por texto.
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

/** Remove acentos pra comparar texto sem depender de "açúcar" vs "acucar" bater certinho. */
function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Palavras de conteúdo do item (sem número/unidade/conectivo), normalizadas pra comparar contra o nome do candidato. */
function palavrasSignificativas(texto: string): string[] {
  return texto
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !ehDescartavel(p) && !CONECTIVO.test(p))
    .map(normalizarTexto);
}

/**
 * Casamento por texto, sem IA: um candidato só é considerado match se TODAS
 * as palavras de conteúdo do item aparecerem no nome dele, e se ele for o
 * ÚNICO candidato nessa condição — dois batendo ao mesmo tempo (ou nenhum)
 * não é confiável o bastante pra decidir sozinho, cai pra IA. Cobre de graça
 * os casos óbvios ("arroz" → "Arroz Camil 5kg"); sinônimo, abreviação e
 * marca vs. genérico continuam precisando da IA pra não virar match errado.
 */
export function casamentoDeterministico(itemTexto: string, candidatos: ProdutoEncontrado[]): number | null {
  const palavras = palavrasSignificativas(itemTexto);
  if (palavras.length === 0) return null;

  const indices: number[] = [];
  candidatos.forEach((c, i) => {
    const nome = normalizarTexto(c.nome);
    if (palavras.every((p) => nome.includes(p))) indices.push(i);
  });

  return indices.length === 1 ? indices[0] : null;
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

/** Sem candidato nenhum nos 5 mercados, nem vale a pena tentar casar. */
function semCandidatos(c: CandidatosPorMercado): boolean {
  return c.shibata.length === 0 && c.semar.length === 0 && c.alabarce.length === 0 && c.atacadao.length === 0 && c.nagumo.length === 0;
}

export interface ResultadoMatching {
  escolha: MatchEscolhido;
  tokensEntrada: number;
  tokensSaida: number;
  // Preenchido quando o casamento por IA NÃO pôde ser feito (API da
  // Anthropic fora do ar, sem crédito, resposta sem tool_use...). Nesse caso
  // isso não quer dizer "não encontrado" — quem chama precisa marcar como
  // falha os mercados listados em `mercadosComErro`, senão o produto some
  // da conta em silêncio. Mercados resolvidos por texto continuam válidos
  // mesmo que a IA falhe pros que sobraram ambíguos.
  erro?: string;
  mercadosComErro?: MercadoId[];
}

export async function escolherMatches(itemTexto: string, candidatos: CandidatosPorMercado): Promise<ResultadoMatching> {
  if (semCandidatos(candidatos)) {
    return { escolha: { shibata: null, semar: null, alabarce: null, atacadao: null, nagumo: null }, tokensEntrada: 0, tokensSaida: 0 };
  }

  // Passo 1 — casamento por texto, de graça: resolve os casos óbvios sem IA.
  // O que sobra ambíguo (ou sem nenhum candidato batendo por texto) vai pro
  // passo 2. `escolhaDeterministica` só tem chave pros mercados já
  // resolvidos (índice OU null explícito por falta de candidato) — chave
  // ausente é o sinal de "ainda precisa da IA", usado no merge final.
  const mercados = Object.keys(candidatos) as MercadoId[];
  const escolhaDeterministica: Partial<MatchEscolhido> = {};
  const candidatosParaIA: CandidatosPorMercado = { shibata: [], semar: [], alabarce: [], atacadao: [], nagumo: [] };
  let precisaDeIA = false;

  for (const m of mercados) {
    const lista = candidatos[m];
    if (lista.length === 0) {
      escolhaDeterministica[m] = null;
      continue;
    }
    const idx = casamentoDeterministico(itemTexto, lista);
    if (idx != null) {
      escolhaDeterministica[m] = idx;
    } else {
      candidatosParaIA[m] = lista;
      precisaDeIA = true;
    }
  }

  if (!precisaDeIA) {
    return { escolha: escolhaDeterministica as MatchEscolhido, tokensEntrada: 0, tokensSaida: 0 };
  }

  // Passo 2 — só os mercados que sobraram ambíguos vão pro prompt (os já
  // resolvidos entram como "sem resultados de busca", então a IA nem
  // precisa opinar sobre eles — o índice dela pra esses é ignorado no merge).
  const system =
    "Você ajuda a comparar preços de mercado. Recebe o item que a pessoa quer comprar (descrito livremente) e os resultados de busca " +
    "de até 5 mercados diferentes para esse item. Sua única tarefa é indicar qual resultado (se algum) de cada mercado é de fato o mesmo " +
    "produto — nunca invente um match forçado.";

  const mensagem = [
    `Item da lista de compras: "${itemTexto}"`,
    "",
    "Candidatos encontrados em cada mercado:",
    listarCandidatos("Shibata", candidatosParaIA.shibata),
    listarCandidatos("Semar", candidatosParaIA.semar),
    listarCandidatos("Alabarce", candidatosParaIA.alabarce),
    listarCandidatos("Atacadão", candidatosParaIA.atacadao),
    listarCandidatos("Nagumo", candidatosParaIA.nagumo),
  ].join("\n");

  // Mercados que ainda dependem da resposta da IA — se ela falhar, só esses
  // viram erro; os resolvidos no passo 1 continuam valendo.
  const mercadosPendentes = mercados.filter((m) => !(m in escolhaDeterministica));

  // Uma falha aqui costumava estourar a cotação inteira (500) ou, pior,
  // passar batido e marcar TODOS os mercados como "não encontrado" pra esse
  // item. Agora vira um erro explícito só nos mercados pendentes, que a
  // tela mostra como falha de busca e o ranking trata como "não comparável".
  let resposta;
  try {
    resposta = await chamarAnthropicComFerramenta(system, mensagem, TOOL);
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.error(`[matching] falha na chamada de IA pro item "${itemTexto}": ${erro}`);
    const escolhaComPendentesNulos = { ...escolhaDeterministica };
    for (const m of mercadosPendentes) escolhaComPendentesNulos[m] = null;
    return { escolha: escolhaComPendentesNulos as MatchEscolhido, tokensEntrada: 0, tokensSaida: 0, erro: "falha ao casar o produto", mercadosComErro: mercadosPendentes };
  }

  if (!resposta.ferramenta) {
    console.error(`[matching] resposta da IA sem tool_use pro item "${itemTexto}"`);
    const escolhaComPendentesNulos = { ...escolhaDeterministica };
    for (const m of mercadosPendentes) escolhaComPendentesNulos[m] = null;
    return {
      escolha: escolhaComPendentesNulos as MatchEscolhido,
      tokensEntrada: resposta.tokensEntrada,
      tokensSaida: resposta.tokensSaida,
      erro: "falha ao casar o produto",
      mercadosComErro: mercadosPendentes,
    };
  }

  const input = resposta.ferramenta.input;

  const escolhaIA: MatchEscolhido = {
    shibata: indiceValido(input.shibata as number | undefined, candidatosParaIA.shibata.length, "Shibata", itemTexto),
    semar: indiceValido(input.semar as number | undefined, candidatosParaIA.semar.length, "Semar", itemTexto),
    alabarce: indiceValido(input.alabarce as number | undefined, candidatosParaIA.alabarce.length, "Alabarce", itemTexto),
    atacadao: indiceValido(input.atacadao as number | undefined, candidatosParaIA.atacadao.length, "Atacadão", itemTexto),
    nagumo: indiceValido(input.nagumo as number | undefined, candidatosParaIA.nagumo.length, "Nagumo", itemTexto),
  };

  const escolha: MatchEscolhido = {
    shibata: "shibata" in escolhaDeterministica ? (escolhaDeterministica.shibata as number | null) : escolhaIA.shibata,
    semar: "semar" in escolhaDeterministica ? (escolhaDeterministica.semar as number | null) : escolhaIA.semar,
    alabarce: "alabarce" in escolhaDeterministica ? (escolhaDeterministica.alabarce as number | null) : escolhaIA.alabarce,
    atacadao: "atacadao" in escolhaDeterministica ? (escolhaDeterministica.atacadao as number | null) : escolhaIA.atacadao,
    nagumo: "nagumo" in escolhaDeterministica ? (escolhaDeterministica.nagumo as number | null) : escolhaIA.nagumo,
  };

  return { escolha, tokensEntrada: resposta.tokensEntrada, tokensSaida: resposta.tokensSaida };
}
