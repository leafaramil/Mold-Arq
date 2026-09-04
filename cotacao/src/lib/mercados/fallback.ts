// Segunda tentativa de busca com termo mais curto — ver buscarComFallback.
import { termoFallback } from "../matching";
import type { BuscaMercado } from "./types";

/**
 * Busca no mercado e, se voltar VAZIO, tenta de novo com um termo mais
 * curto (só a primeira palavra de conteúdo: "feijão carioca" → "feijão").
 *
 * Por que isso existe: os mercados usam mecanismos de busca bem diferentes.
 * Alguns são tolerantes; outros (o Alabarce é o caso conhecido) casam o
 * termo de forma estrita, então uma palavra a mais devolve zero resultado.
 * Sem essa segunda tentativa, "não achei com esse termo" aparecia na tela
 * como "esse mercado não vende esse produto" — e um mercado que perde itens
 * assim soma menos e parece mais barato do que realmente é.
 *
 * Só tenta de novo em busca vazia e bem-sucedida: erro de rede/HTTP e token
 * expirado continuam sendo erro (repetir não ajudaria e mascararia a causa).
 */
export async function buscarComFallback(termo: string, buscar: (t: string) => Promise<BuscaMercado>): Promise<BuscaMercado> {
  const primeira = await buscar(termo);
  if (primeira.erro || primeira.tokenExpirado || primeira.produtos.length > 0) return primeira;

  const curto = termoFallback(termo);
  if (!curto) return primeira;

  const segunda = await buscar(curto);
  // Um erro só na segunda tentativa não invalida a primeira (que foi um
  // "vazio" legítimo) — devolve o resultado vazio original.
  if (segunda.erro) return primeira;
  return segunda;
}
