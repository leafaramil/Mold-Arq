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
      await sql`INSERT INTO itens (id, lista_id, texto, ordem)
                VALUES (${action.itemId}, ${action.listaId}, ${action.texto},
                  COALESCE((SELECT MAX(ordem) + 1 FROM itens WHERE lista_id = ${action.listaId}), 0))
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "removerItem":
      await sql`DELETE FROM itens WHERE id = ${action.itemId}`;
      return;
    case "editarItem":
      await sql`UPDATE itens SET texto = ${action.texto} WHERE id = ${action.itemId}`;
      return;
    case "reordenarItens":
      for (const { itemId, ordem } of action.atualizacoes) {
        await sql`UPDATE itens SET ordem = ${ordem} WHERE id = ${itemId}`;
      }
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
