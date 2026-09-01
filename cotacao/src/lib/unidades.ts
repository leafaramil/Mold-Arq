// Dicionário simples de sugestão de unidade a partir do texto do item —
// heurística por palavra-chave, sem chamada de IA (é só um valor inicial
// pro campo, a pessoa sempre pode trocar antes de adicionar o item).
export type Unidade = "un" | "kg" | "g" | "l" | "ml" | "dz" | "pct";

export const UNIDADES: { valor: Unidade; rotulo: string }[] = [
  { valor: "un", rotulo: "unidade" },
  { valor: "kg", rotulo: "kg" },
  { valor: "g", rotulo: "g" },
  { valor: "l", rotulo: "L" },
  { valor: "ml", rotulo: "ml" },
  { valor: "dz", rotulo: "dúzia" },
  { valor: "pct", rotulo: "pacote" },
];

export function rotuloUnidade(u: string): string {
  return UNIDADES.find((x) => x.valor === u)?.rotulo ?? u;
}

// Chaves sem acento — o texto do item é normalizado (acentos removidos)
// antes de comparar, então não precisa duplicar cada palavra com e sem
// acento aqui.
const PALAVRA_UNIDADE: Record<string, Unidade> = {
  // açougue/frios — normalmente vendidos por peso
  carne: "kg",
  carnes: "kg",
  frango: "kg",
  peixe: "kg",
  linguica: "kg",
  bisteca: "kg",
  costela: "kg",
  picanha: "kg",
  alcatra: "kg",
  patinho: "kg",
  moida: "kg",
  file: "kg",
  filezinho: "kg",
  queijo: "kg",
  presunto: "kg",
  mortadela: "kg",
  peito: "kg",
  coxa: "kg",
  asa: "kg",
  // hortifruti — normalmente vendidos por peso
  batata: "kg",
  cebola: "kg",
  tomate: "kg",
  cenoura: "kg",
  banana: "kg",
  maca: "kg",
  laranja: "kg",
  limao: "kg",
  uva: "kg",
  abacaxi: "kg",
  mamao: "kg",
  // dúzia
  ovo: "dz",
  ovos: "dz",
  // líquidos — comumente descritos em litros
  leite: "l",
  oleo: "l",
  agua: "l",
  refrigerante: "l",
  suco: "l",
};

const removerAcentos = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Sugere uma unidade a partir da primeira palavra do texto que bater no dicionário; "un" se nenhuma bater. */
export function sugerirUnidade(textoItem: string): Unidade {
  const normalizado = removerAcentos(textoItem.toLowerCase());
  const palavras = normalizado.split(/\s+/);
  for (const palavra of palavras) {
    const unidade = PALAVRA_UNIDADE[palavra];
    if (unidade) return unidade;
  }
  return "un";
}
