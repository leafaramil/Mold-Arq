import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { DataModel, Item, Lista } from "./types";

type Row = Record<string, unknown>;

export async function loadModel(sql: NeonQueryFunction<false, false>): Promise<DataModel> {
  const [listasRows, itensRows, configRows] = await Promise.all([
    sql`SELECT * FROM listas ORDER BY criada_em DESC`,
    sql`SELECT * FROM itens ORDER BY criado_em`,
    sql`SELECT * FROM config WHERE id = 1`,
  ]);

  const listas: Lista[] = (listasRows as Row[]).map((r) => ({ id: r.id as string, criadaEm: String(r.criada_em) }));
  const itens: Item[] = (itensRows as Row[]).map((r) => ({ id: r.id as string, listaId: r.lista_id as string, texto: r.texto as string }));
  const configRow = (configRows as Row[])[0];

  return {
    listas,
    itens,
    config: { shibataToken: (configRow?.shibata_token as string | null) ?? null },
  };
}
