// Dicionário simples de sugestão de unidade a partir do texto do item —
// heurística por palavra-chave, sem chamada de IA (é só um valor inicial
// pro campo, a pessoa sempre pode trocar antes de adicionar o item).
//
// kg/g/l/ml só fazem sentido pra item vendido a granel/peso solto (açougue,
// hortifruti) — nesses casos o preço encontrado no mercado já É um preço
// por kg/L, e a quantidade multiplica esse preço corretamente (ex: 1,5kg de
// carne = 1,5 × preço/kg). Para item vendido em embalagem fechada (garrafa,
// caixa, lata, pacote), o preço encontrado é o preço de UMA embalagem
// inteira — multiplicar por "quantos ml/g tem a embalagem" dá um total
// absurdo (ex: azeite 500ml × preço da garrafa = preço × 500). Por isso
// líquidos comprados em garrafa/caixa (leite, óleo, água, refrigerante,
// suco) NÃO entram nesse dicionário como "l" — ficam em "un" por padrão,
// onde a quantidade significa "quantas embalagens comprar" (quase sempre
// 1, 2, 3...), não o volume de uma embalagem.
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
  alho: "kg",
  // dúzia
  ovo: "dz",
  ovos: "dz",
  // líquidos (leite, óleo, água, refrigerante, suco) ficam de fora de
  // propósito — são vendidos em embalagem fechada (garrafa/caixa/lata),
  // não a granel, então o padrão "un" é o correto (ver comentário acima).
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
