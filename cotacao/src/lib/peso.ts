// Extrai o peso descrito no nome de um produto pra normalizar preços de
// itens vendidos a peso solto (carne, hortifruti — ver unidades.ts). Cada
// mercado pode listar o mesmo tipo de produto em pacotes de tamanhos
// diferentes (ex: "Alho 100g" num mercado, "Alho Kg" — preço já por kg —
// em outro), então comparar o preço bruto encontrado não é justo: precisa
// converter tudo pra "preço equivalente a 1kg" antes de multiplicar pela
// quantidade desejada e comparar entre mercados.
const PADRAO_PESO_NUMERICO = /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramas?)\b/i;
const PADRAO_KG_SOLTO = /\bkg\b/i;

/**
 * Devolve o peso em kg descrito no nome do produto, ou `null` quando não dá
 * pra identificar. Dois casos:
 * - Peso numérico explícito ("Alho 100g", "Batata 1,5kg") → converte pra kg.
 * - "Kg" solto sem número na frente ("Picanha Kg", "Tomate Kg") — produto
 *   vendido a peso variável, onde o preço encontrado JÁ é o preço por kg
 *   (nenhuma conversão necessária) → devolve 1.
 */
export function extrairPesoEmKg(nomeProduto: string): number | null {
  const numerico = nomeProduto.match(PADRAO_PESO_NUMERICO);
  if (numerico) {
    const valor = parseFloat(numerico[1].replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) return null;
    return numerico[2].toLowerCase() === "kg" ? valor : valor / 1000;
  }
  if (PADRAO_KG_SOLTO.test(nomeProduto)) return 1;
  return null;
}

/**
 * Preço normalizado pra 1kg desse produto (`preco / pesoEmKg`). `null`
 * quando não deu pra identificar o peso no nome — quem chama decide o
 * fallback (normalmente: usar o preço bruto e avisar que não normalizou).
 */
export function precoPorKg(preco: number, nomeProduto: string): number | null {
  const peso = extrairPesoEmKg(nomeProduto);
  if (peso == null || peso <= 0) return null;
  return preco / peso;
}
