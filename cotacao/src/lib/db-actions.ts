import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Action } from "./action-types";
import type { MercadoId } from "./matching";
import { registrarPreferencia } from "./preferencia-match";
import type { ResultadoCotacao } from "./types";

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
      await aprenderConfirmacoesAmbiguas(sql, action.resultado);
      return;
  }
}

/**
 * Todo item que o servidor deixou ambíguo (score sem confiança) e que
 * chegou aqui com `escolhaIndex` preenchido só pode ter sido resolvido pela
 * pessoa trocando manualmente na tela de resultado — grava essa escolha no
 * cache de preferência (preferencia_match) pra próxima cotação do mesmo
 * termo nesse mercado resolver direto. Item que já resolveu sozinho
 * (ambiguo ausente) não passa por aqui, então recotar sem trocar nada não
 * gera escrita — só a confirmação de verdade é aprendida.
 */
async function aprenderConfirmacoesAmbiguas(sql: Sql, resultado: ResultadoCotacao): Promise<void> {
  for (const mercado of resultado.mercados) {
    for (const item of mercado.itens) {
      if (!item.ambiguo || item.escolhaIndex == null) continue;
      const candidato = item.candidatos[item.escolhaIndex];
      if (!candidato) continue;
      await registrarPreferencia(sql, item.itemTexto, mercado.mercadoId as MercadoId, candidato.nome);
    }
  }
}
