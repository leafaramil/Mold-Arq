import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { DataModel, Item } from "./types";

type Row = Record<string, unknown>;

export async function loadModel(sql: NeonQueryFunction<false, false>): Promise<DataModel> {
  const [itensRows, configRows] = await Promise.all([
    sql`SELECT * FROM itens ORDER BY criado_em`,
    sql`SELECT * FROM config WHERE id = 1`,
  ]);

  const itens: Item[] = (itensRows as Row[]).map((r) => ({ id: r.id as string, texto: r.texto as string }));
  const configRow = (configRows as Row[])[0];

  return {
    itens,
    config: { shibataToken: (configRow?.shibata_token as string | null) ?? null },
  };
}
