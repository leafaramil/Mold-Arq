import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Cotacao, DataModel, Item, Lista, ResultadoCotacao } from "./types";

type Row = Record<string, unknown>;

// TIMESTAMPTZ volta do driver da Neon como objeto Date em alguns runtimes e
// como string em outros — normaliza pra ISO 8601 nos dois casos (sem isso,
// `String(new Date(...))` produz "Tue Sep 01 2026 18:50:22 GMT+0000 (...)",
// que quebra a formatação de data no cliente).
const paraIso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));

export async function loadModel(sql: NeonQueryFunction<false, false>): Promise<DataModel> {
  const [listasRows, itensRows, cotacoesRows, configRows] = await Promise.all([
    sql`SELECT * FROM listas ORDER BY criada_em DESC`,
    sql`SELECT * FROM itens ORDER BY criado_em`,
    sql`SELECT * FROM cotacoes`,
    sql`SELECT * FROM config WHERE id = 1`,
  ]);

  const listas: Lista[] = (listasRows as Row[]).map((r) => ({ id: r.id as string, criadaEm: paraIso(r.criada_em) }));
  const itens: Item[] = (itensRows as Row[]).map((r) => ({
    id: r.id as string,
    listaId: r.lista_id as string,
    texto: r.texto as string,
    quantidade: r.quantidade == null ? 1 : parseFloat(String(r.quantidade)),
    unidade: (r.unidade as string) ?? "un",
  }));
  const cotacoes: Cotacao[] = (cotacoesRows as Row[]).map((r) => ({
    listaId: r.lista_id as string,
    resultado: r.resultado as ResultadoCotacao,
  }));
  const configRow = (configRows as Row[])[0];

  return {
    listas,
    itens,
    cotacoes,
    config: { shibataToken: (configRow?.shibata_token as string | null) ?? null },
  };
}
