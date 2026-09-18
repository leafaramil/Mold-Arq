// Cache de preferência aprendida pro matching sem IA (ver matching.ts):
// guarda, por termo digitado + mercado, o nome (normalizado) do candidato
// que a pessoa já confirmou pra esse termo. Acelera o caso comum — mesmo
// termo, mesmo mercado, escolha já conhecida — sem repetir o score; não
// substitui o score, porque a busca ao vivo pode não trazer o mesmo
// produto de novo (indisponibilidade, mudança de nome no mercado).
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { chavePreferencia, type MercadoId } from "./matching";
import { normalizarTexto } from "./matching";

type Sql = NeonQueryFunction<false, false>;

interface LinhaPreferencia {
  termo_norm: string;
  mercado: string;
  nome_preferido: string;
}

/**
 * Carrega o cache inteiro numa única consulta — a tabela guarda no máximo
 * uma linha por termo+mercado que essa casa já comprou, então é pequena.
 * Devolve um Map pronto pra `escolherMatches` (chave `chavePreferencia`).
 */
export async function carregarPreferencias(sql: Sql): Promise<Map<string, string>> {
  const linhas = (await sql`SELECT termo_norm, mercado, nome_preferido FROM preferencia_match`) as LinhaPreferencia[];
  const mapa = new Map<string, string>();
  for (const l of linhas) {
    mapa.set(chavePreferencia(l.termo_norm, l.mercado as MercadoId), l.nome_preferido);
  }
  return mapa;
}

/**
 * Grava/reforça a escolha confirmada pra um termo+mercado. Idempotente:
 * confirmar a mesma escolha de novo só incrementa `vezes`; confirmar uma
 * escolha diferente substitui a anterior (a pessoa mudou de ideia, ou
 * corrigiu um erro).
 */
export async function registrarPreferencia(sql: Sql, itemTexto: string, mercado: MercadoId, nomeEscolhido: string): Promise<void> {
  const termoNorm = normalizarTexto(itemTexto.trim());
  const nomePreferido = normalizarTexto(nomeEscolhido.trim());
  await sql`
    INSERT INTO preferencia_match (termo_norm, mercado, nome_preferido)
    VALUES (${termoNorm}, ${mercado}, ${nomePreferido})
    ON CONFLICT (termo_norm, mercado) DO UPDATE
      SET nome_preferido = EXCLUDED.nome_preferido, vezes = preferencia_match.vezes + 1, atualizado_em = now()
  `;
}
