import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Action } from "./action-types";

type Sql = NeonQueryFunction<false, false>;

export async function applyActionToDb(sql: Sql, action: Action): Promise<void> {
  switch (action.type) {
    case "addItem":
      await sql`INSERT INTO itens (id, texto) VALUES (${action.itemId}, ${action.texto}) ON CONFLICT (id) DO NOTHING`;
      return;
    case "removerItem":
      await sql`DELETE FROM itens WHERE id = ${action.itemId}`;
      return;
    case "setShibataToken":
      await sql`UPDATE config SET shibata_token = ${action.token} WHERE id = 1`;
      return;
  }
}
