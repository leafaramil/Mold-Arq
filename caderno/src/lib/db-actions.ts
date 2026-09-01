import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Action } from "./action-types";

type Sql = NeonQueryFunction<false, false>;

async function upsertEstadoCampo(
  sql: Sql,
  mes: string,
  itemId: string,
  campo: "separado" | "pago" | "recebido" | "devolvido",
  valor: number | null,
) {
  switch (campo) {
    case "separado":
      await sql`INSERT INTO estados (mes, item_id, separado) VALUES (${mes}, ${itemId}, ${valor})
                ON CONFLICT (mes, item_id) DO UPDATE SET separado = EXCLUDED.separado`;
      return;
    case "pago":
      await sql`INSERT INTO estados (mes, item_id, pago) VALUES (${mes}, ${itemId}, ${valor})
                ON CONFLICT (mes, item_id) DO UPDATE SET pago = EXCLUDED.pago`;
      return;
    case "recebido":
      await sql`INSERT INTO estados (mes, item_id, recebido) VALUES (${mes}, ${itemId}, ${valor})
                ON CONFLICT (mes, item_id) DO UPDATE SET recebido = EXCLUDED.recebido`;
      return;
    case "devolvido":
      await sql`INSERT INTO estados (mes, item_id, devolvido) VALUES (${mes}, ${itemId}, ${valor})
                ON CONFLICT (mes, item_id) DO UPDATE SET devolvido = EXCLUDED.devolvido`;
      return;
  }
}

export async function applyActionToDb(sql: Sql, action: Action): Promise<void> {
  switch (action.type) {
    case "separar":
      await upsertEstadoCampo(sql, action.mes, action.itemId, "separado", action.valor);
      return;
    case "desSeparar":
      await sql`DELETE FROM gastos WHERE mes = ${action.mes} AND item_id = ${action.itemId}`;
      await upsertEstadoCampo(sql, action.mes, action.itemId, "separado", null);
      return;
    case "pagar":
      await upsertEstadoCampo(sql, action.mes, action.itemId, "pago", action.valor);
      return;
    case "desPagar":
      await upsertEstadoCampo(sql, action.mes, action.itemId, "pago", null);
      return;
    case "receber": {
      await upsertEstadoCampo(sql, action.mes, action.receitaId, "recebido", action.valor);
      if (action.reservaPct) {
        const reserva = Math.round(action.valor * (action.reservaPct / 100) * 100) / 100;
        const rows = await sql`SELECT nome FROM receitas WHERE id = ${action.receitaId}`;
        const nome = (rows[0] as { nome?: string } | undefined)?.nome ?? action.receitaId;
        await sql`INSERT INTO pote_hist (id, pote, descricao, valor, data)
                  VALUES (${`reserva-${action.receitaId}-${action.mes}`}, 'emergencia', ${`Reserva automática · ${nome}`}, ${reserva}, ${action.mes + "-01"})
                  ON CONFLICT (id) DO NOTHING`;
      }
      return;
    }
    case "desfazerRecebimento":
      await upsertEstadoCampo(sql, action.mes, action.receitaId, "recebido", null);
      return;
    case "devolver":
      await upsertEstadoCampo(sql, action.mes, action.receitaId, "devolvido", action.valor);
      return;
    case "desfazerDevolucao":
      await upsertEstadoCampo(sql, action.mes, action.receitaId, "devolvido", null);
      return;
    case "addGasto":
      await sql`INSERT INTO gastos (id, mes, item_id, valor, data) VALUES (${action.gastoId}, ${action.mes}, ${action.itemId}, ${action.valor}, ${action.data})
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "delGasto":
      await sql`DELETE FROM gastos WHERE id = ${action.gastoId}`;
      return;
    case "fecharCaixinha": {
      const rows = await sql`SELECT COALESCE(SUM(valor), 0) AS total FROM gastos WHERE mes = ${action.mes} AND item_id = ${action.itemId}`;
      const total = parseFloat(String((rows[0] as { total: string }).total));
      await upsertEstadoCampo(sql, action.mes, action.itemId, "pago", total);
      return;
    }
    case "editarEstado":
      await upsertEstadoCampo(sql, action.mes, action.itemId, action.campo, action.valor);
      return;
    case "recarregarCaixinha":
      await sql`INSERT INTO caixinha_mov (id, caixinha, tipo, disponivel, custo, tarifa, data, mes)
                VALUES (${action.movId}, ${action.chave}, 'recarga', ${action.disponivel}, ${action.custo}, ${action.tarifa}, ${action.mes + "-01"}, ${action.mes})
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "definirSaldoInicialZul":
      await sql`INSERT INTO caixinha_mov (id, caixinha, tipo, disponivel, custo, tarifa, data, mes)
                VALUES (${action.movId}, ${action.chave}, 'recarga', ${action.saldo}, 0, 0, ${action.mes + "-01"}, ${action.mes})
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "gastarCaixinha":
      await sql`INSERT INTO caixinha_mov (id, caixinha, tipo, valor, data, mes)
                VALUES (${action.movId}, ${action.chave}, 'gasto', ${action.valor}, ${action.mes + "-01"}, ${action.mes})
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "delMovCaixinha":
      await sql`DELETE FROM caixinha_mov WHERE id = ${action.movId}`;
      return;
    case "dispensarAviso":
      await sql`INSERT INTO avisos_dispensados (chave) VALUES (${action.chave}) ON CONFLICT (chave) DO NOTHING`;
      return;
    case "editarValor": {
      if (action.tipo === "despesa") {
        if (action.soNesseMes) {
          await sql`INSERT INTO despesa_overrides (despesa_id, mes, valor, removido)
                    VALUES (${action.itemId}, ${action.mes}, ${action.valor}, false)
                    ON CONFLICT (despesa_id, mes) DO UPDATE SET valor = EXCLUDED.valor, removido = false`;
        } else {
          await sql`UPDATE despesas SET valor = ${action.valor} WHERE id = ${action.itemId}`;
        }
      } else {
        if (action.soNesseMes) {
          await sql`INSERT INTO receita_overrides (receita_id, mes, valor, removido)
                    VALUES (${action.itemId}, ${action.mes}, ${action.valor}, false)
                    ON CONFLICT (receita_id, mes) DO UPDATE SET valor = EXCLUDED.valor, removido = false`;
        } else {
          await sql`UPDATE receitas SET valor = ${action.valor} WHERE id = ${action.itemId}`;
        }
      }
      return;
    }
    case "removerItem": {
      if (action.tipo === "despesa") {
        if (action.soNesseMes) {
          await sql`INSERT INTO despesa_overrides (despesa_id, mes, removido)
                    VALUES (${action.itemId}, ${action.mes}, true)
                    ON CONFLICT (despesa_id, mes) DO UPDATE SET removido = true`;
        } else {
          await sql`DELETE FROM despesas WHERE id = ${action.itemId}`;
        }
      } else {
        if (action.soNesseMes) {
          await sql`INSERT INTO receita_overrides (receita_id, mes, removido)
                    VALUES (${action.itemId}, ${action.mes}, true)
                    ON CONFLICT (receita_id, mes) DO UPDATE SET removido = true`;
        } else {
          await sql`DELETE FROM receitas WHERE id = ${action.itemId}`;
        }
      }
      return;
    }
    case "addDespesa": {
      const valorInicial = action.dados.parcelamento ? action.dados.parcelamento.valor : action.dados.valor;
      const apenasMes = action.dados.parcelamento ? null : action.apenasEsseMes ? action.mes : null;
      await sql`INSERT INTO despesas (id, nome, icone, valor, dia, q, apenas_mes)
                VALUES (${action.itemId}, ${action.dados.nome}, ${action.dados.icone}, ${valorInicial}, ${action.dados.dia}, ${action.dados.q}, ${apenasMes})
                ON CONFLICT (id) DO NOTHING`;
      if (action.dados.parcelamento) {
        const p = action.dados.parcelamento;
        await sql`INSERT INTO despesa_parcelamento (despesa_id, valor, atual, total, base)
                  VALUES (${action.itemId}, ${p.valor}, ${p.atual}, ${p.total}, ${p.base})
                  ON CONFLICT (despesa_id) DO NOTHING`;
      }
      return;
    }
    case "definirParcelamento": {
      if (action.parcelamento) {
        const p = action.parcelamento;
        await sql`INSERT INTO despesa_parcelamento (despesa_id, valor, atual, total, base)
                  VALUES (${action.despesaId}, ${p.valor}, ${p.atual}, ${p.total}, ${p.base})
                  ON CONFLICT (despesa_id) DO UPDATE SET valor = EXCLUDED.valor, atual = EXCLUDED.atual, total = EXCLUDED.total, base = EXCLUDED.base`;
        await sql`UPDATE despesas SET valor = ${p.valor} WHERE id = ${action.despesaId}`;
      } else {
        await sql`DELETE FROM despesa_parcelamento WHERE despesa_id = ${action.despesaId}`;
      }
      return;
    }
    case "addReceita":
      await sql`INSERT INTO receitas (id, nome, icone, valor, dia, quando, q, ativa, reserva, dizimo, deduz, apenas_mes)
                VALUES (${action.itemId}, ${action.dados.nome}, ${action.dados.icone}, ${action.dados.valor}, ${action.dados.dia}, ${action.dados.quando}, ${action.dados.q}, true, false, true, false, ${action.apenasEsseMes ? action.mes : null})
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "toggleReceita":
      if (action.campo === "ativa") {
        await sql`UPDATE receitas SET ativa = NOT ativa WHERE id = ${action.receitaId}`;
      } else {
        await sql`UPDATE receitas SET reserva = NOT reserva WHERE id = ${action.receitaId}`;
      }
      return;
    case "updateConfig": {
      switch (action.campo) {
        case "reservaPct":
          await sql`UPDATE config SET reserva_pct = ${action.valor as number} WHERE id = 1`;
          return;
        case "saldoInicial":
          await sql`UPDATE config SET saldo_inicial = ${action.valor as number} WHERE id = 1`;
          return;
        case "assistente":
          await sql`UPDATE config SET assistente = ${action.valor as string} WHERE id = 1`;
          return;
        case "vozAtiva":
          await sql`UPDATE config SET voz_ativa = ${action.valor as boolean} WHERE id = 1`;
          return;
        default:
          return;
      }
    }
    case "updateCartao":
      if (action.campo === "fechamento") {
        await sql`UPDATE cartoes SET fechamento = ${action.valor} WHERE id = ${action.cartaoId}`;
      } else {
        await sql`UPDATE cartoes SET vencimento = ${action.valor} WHERE id = ${action.cartaoId}`;
      }
      return;
    case "addParcela":
      await sql`INSERT INTO parcelas (id, descricao, parcela, atual, total, base, cartao_id)
                VALUES (${action.parcelaId}, ${action.desc}, ${action.parcela}, ${action.atual}, ${action.total}, ${action.base}, ${action.cartaoId})
                ON CONFLICT (id) DO NOTHING`;
      return;
    case "delParcela":
      await sql`DELETE FROM parcelas WHERE id = ${action.parcelaId}`;
      return;
    case "registrarConsumoIA":
      await sql`UPDATE config SET consumo_ia = consumo_ia + ${action.custo} WHERE id = 1`;
      await sql`INSERT INTO consumo_ia_mes (mes, valor) VALUES (${action.mes}, ${action.custo})
                ON CONFLICT (mes) DO UPDATE SET valor = consumo_ia_mes.valor + EXCLUDED.valor`;
      return;
    case "retirarPote":
      await sql`INSERT INTO pote_hist (id, pote, descricao, valor, data)
                VALUES (${action.histId}, ${action.pote}, ${action.desc}, ${action.valor}, ${new Date().toISOString().slice(0, 10)})
                ON CONFLICT (id) DO NOTHING`;
      return;
  }
}
