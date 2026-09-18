// Score determinístico pra decidir se um candidato de busca é o mesmo
// produto que o item digitado — a única decisão de matching do app (ver
// escolherMatches em matching.ts), sem nenhuma chamada de IA.
//
// Roda inteiro em memória, sobre os candidatos que a busca ao vivo de cada
// mercado já devolve — sem banco, sem catálogo persistido, sem depender de
// EAN (que só o Shibata expõe, e nem isso é extraído hoje).
import { normalizarTexto, palavrasSignificativas } from "./matching";
import type { ProdutoEncontrado } from "./mercados/types";

// Pesos do score: cobertura de token pesa mais porque decide "é o mesmo
// produto" (leite bate com leite); similaridade de string é o desempate fino
// pra erro de digitação e variação de grafia dentro do mesmo produto.
const PESO_COBERTURA = 0.65;
const PESO_SIMILARIDADE = 0.35;

// Calibração inicial proposta (ver prompt-claude-code-v2.md) — ainda não
// validada contra lista real, por isso exportadas: dá pra rodar os testes de
// calibração trocando esses valores sem tocar no resto do módulo.
export const SCORE_MINIMO = 0.75;
export const MARGEM_MINIMA = 0.15;

// ---------------------------------------------------------------------
// Tamanho/quantidade — filtro duro, não é peso no score. Mesma lógica da
// função `extrair_tamanho` que existia na proposta em SQL, portada pra TS:
// converte pra uma unidade canônica (1000g, 500ml, 12un) então "Leite 1L"
// nunca casa com "Leite em Pó 380g" só por similaridade de texto.
// ---------------------------------------------------------------------
const TAMANHO_REGEX = /(\d+(?:[.,]\d+)?)\s*(kg|kilos?|quilos?|g|gr|gramas?|l|lt|litros?|ml|un|unid|unidades?)\b/i;

export function extrairTamanho(txt: string): string | null {
  const m = normalizarTexto(txt).match(TAMANHO_REGEX);
  if (!m) return null;

  const valor = parseFloat(m[1].replace(",", "."));
  const unidade = m[2];

  if (/^(kg|kilos?|quilos?)$/.test(unidade)) return `${Math.round(valor * 1000)}g`;
  if (/^(g|gr|gramas?)$/.test(unidade)) return `${Math.round(valor)}g`;
  if (/^(l|lt|litros?)$/.test(unidade)) return `${Math.round(valor * 1000)}ml`;
  if (unidade === "ml") return `${Math.round(valor)}ml`;
  return `${Math.round(valor)}un`;
}

// ---------------------------------------------------------------------
// Similaridade de string — Dice coefficient sobre bigramas de caractere.
// Multiset (não set): "aa" vs "aaa" não vira 1.0 só porque o bigrama "aa"
// existe nos dois — cada ocorrência só casa uma vez.
// ---------------------------------------------------------------------
function bigramas(s: string): string[] {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 2) return [];
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

export function diceCoeficiente(a: string, b: string): number {
  const ba = bigramas(a);
  const bb = bigramas(b);
  if (ba.length === 0 || bb.length === 0) return a === b ? 1 : 0;

  const restantes = new Map<string, number>();
  for (const bg of ba) restantes.set(bg, (restantes.get(bg) ?? 0) + 1);

  let intersecao = 0;
  for (const bg of bb) {
    const disponivel = restantes.get(bg) ?? 0;
    if (disponivel > 0) {
      intersecao++;
      restantes.set(bg, disponivel - 1);
    }
  }

  return (2 * intersecao) / (ba.length + bb.length);
}

// Limiar de tolerância por token — abaixo disso a diferença já é palavra
// diferente, não erro de digitação (ex.: "musculo" vs "mr" não deveria
// contar como cobertura só porque compartilham um bigrama qualquer).
const SIMILARIDADE_MINIMA_TOKEN = 0.7;

// ---------------------------------------------------------------------
// Cobertura de token: quanto do que a pessoa digitou aparece no candidato.
// Base do score — "leite" tem que estar no nome pra ser leite, não é só
// parecido o suficiente.
//
// Interseção exata SÓ não basta: num termo de uma palavra só (o caso mais
// comum digitado no celular — "sabonete", "madioquinha"), um erro de
// digitação zera a cobertura inteira e a similaridade de string (35% do
// score) nunca sozinha chega no limiar de decisão. Por isso cada token do
// termo conta como coberto quando bate EXATO OU quando o token mais parecido
// do candidato passa de `SIMILARIDADE_MINIMA_TOKEN` — preserva a tolerância a
// erro de digitação que o prompt de IA antigo tratava explicitamente
// ("Madioquinha" → "Mandioquinha"), sem abrir mão de token realmente
// diferente contar como não-coberto.
// ---------------------------------------------------------------------
export function coberturaTokens(tokensTermo: string[], tokensCandidato: string[]): number {
  if (tokensTermo.length === 0) return 0;
  if (tokensCandidato.length === 0) return 0;

  const encontrados = tokensTermo.filter((t) => tokensCandidato.some((c) => t === c || diceCoeficiente(t, c) >= SIMILARIDADE_MINIMA_TOKEN)).length;
  return encontrados / tokensTermo.length;
}

export interface CandidatoPontuado {
  indice: number;
  candidato: ProdutoEncontrado;
  cobertura: number;
  similaridade: number;
  score: number;
}

/**
 * Pontua cada candidato contra o item digitado. Candidatos com tamanho
 * identificado E divergente do item são descartados antes de pontuar (nunca
 * aparecem no resultado) — o resto vem ordenado por score, maior primeiro.
 */
export function pontuarCandidatos(itemTexto: string, candidatos: ProdutoEncontrado[]): CandidatoPontuado[] {
  const tokensTermo = palavrasSignificativas(itemTexto);
  const textoTermo = tokensTermo.join(" ");
  const tamanhoTermo = extrairTamanho(itemTexto);

  const pontuados: CandidatoPontuado[] = [];

  candidatos.forEach((candidato, indice) => {
    const tamanhoCandidato = extrairTamanho(candidato.nome);
    if (tamanhoTermo != null && tamanhoCandidato != null && tamanhoTermo !== tamanhoCandidato) {
      return; // filtro duro — nunca vira candidato, não importa a similaridade de texto
    }

    const tokensCandidato = palavrasSignificativas(candidato.nome);
    const cobertura = coberturaTokens(tokensTermo, tokensCandidato);
    const similaridade = diceCoeficiente(textoTermo, tokensCandidato.join(" "));
    const score = PESO_COBERTURA * cobertura + PESO_SIMILARIDADE * similaridade;

    pontuados.push({ indice, candidato, cobertura, similaridade, score });
  });

  return pontuados.sort((a, b) => b.score - a.score);
}

export interface ResultadoScore {
  /** Índice no array ORIGINAL de candidatos (antes do filtro de tamanho), ou null quando não resolveu sozinho. */
  indice: number | null;
  /** true quando não bateu os dois critérios de decisão — precisa de confirmação manual, nunca de IA. */
  ambiguo: boolean;
  /** Todos os candidatos que passaram o filtro de tamanho, ordenados por score — pra tela de confirmação mostrar os top N. */
  candidatos: CandidatoPontuado[];
}

/**
 * Decide se resolve automaticamente: só quando o 1º colocado tem score alto
 * E folga clara sobre o 2º. Os dois critérios são obrigatórios — score alto
 * com empate técnico é ambiguidade real (dois candidatos igualmente bons),
 * não acerto; folga grande com score baixo é "o menos ruim dentre opções
 * ruins", também não é acerto.
 */
export function decidirMatch(itemTexto: string, candidatosBrutos: ProdutoEncontrado[]): ResultadoScore {
  const candidatos = pontuarCandidatos(itemTexto, candidatosBrutos);
  if (candidatos.length === 0) return { indice: null, ambiguo: false, candidatos: [] };

  const [primeiro, segundo] = candidatos;
  const margem = segundo ? primeiro.score - segundo.score : 1;

  if (primeiro.score >= SCORE_MINIMO && margem >= MARGEM_MINIMA) {
    return { indice: primeiro.indice, ambiguo: false, candidatos };
  }
  return { indice: null, ambiguo: true, candidatos };
}
