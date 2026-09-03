import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Action } from "./action-types";

type Sql = NeonQueryFunction<false, false>;

export async function applyActionToDb(sql: Sql, action: Action): Promise<void> {
  switch (action.type) {
    case "criarLista":
      await sql`INSERT INTO listas (id, criada_em) VALUES (${action.listaId}, ${action.criadaEm}) ON CONFLICT (id) DO NOTHING`;
      return;
    case "removerLista":
      await sql`DELETE FROM listas WHERE id = ${action.listaId}`;
      return;
    case "addItem":
      await sql`INSERT INTO itens (id, lista_id, texto) VALUES (${action.itemId}, ${action.listaId}, ${action.texto}) ON CONFLICT (id) DO NOTHING`;
      return;
    case "removerItem":
      await sql`DELETE FROM itens WHERE id = ${action.itemId}`;
      return;
    case "setShibataToken":
      await sql`UPDATE config SET shibata_token = ${action.token} WHERE id = 1`;
      return;
    case "salvarCotacao":
      await sql`INSERT INTO cotacoes (lista_id, resultado, atualizado_em)
                VALUES (${action.listaId}, ${JSON.stringify(action.resultado)}::jsonb, now())
                ON CONFLICT (lista_id) DO UPDATE SET resultado = EXCLUDED.resultado, atualizado_em = now()`;
      return;
  }
}
