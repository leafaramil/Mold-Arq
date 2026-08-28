// Reducer puro e otimista: aplica uma Action num DataModel já carregado em
// memória, para o cliente atualizar a tela instantaneamente (inclusive
// offline) antes da confirmação do servidor. Espelha exatamente as mesmas
// mutações que src/lib/db-actions.ts grava no Postgres.
import type { Action } from "./action-types";
import { round2 } from "./calc";
import { ESTADO_VAZIO, type DataModel, type EstadoItem } from "./types";

function patchEstado(model: DataModel, mes: string, itemId: string, patch: Partial<EstadoItem>): DataModel {
  const doMes = model.estados[mes] ?? {};
  const atual = doMes[itemId] ?? ESTADO_VAZIO;
  return {
    ...model,
    estados: {
      ...model.estados,
      [mes]: { ...doMes, [itemId]: { ...atual, ...patch } },
    },
  };
}

export function applyAction(model: DataModel, action: Action): DataModel {
  switch (action.type) {
    case "separar":
      return patchEstado(model, action.mes, action.itemId, { separado: action.valor });
    case "desSeparar":
      return patchEstado(model, action.mes, action.itemId, { separado: null, gastos: [] });
    case "pagar":
      return patchEstado(model, action.mes, action.itemId, { pago: action.valor });
    case "desPagar":
      return patchEstado(model, action.mes, action.itemId, { pago: null });
    case "receber": {
      let novo = patchEstado(model, action.mes, action.receitaId, { recebido: action.valor });
      if (action.reservaPct) {
        const reserva = round2(action.valor * (action.reservaPct / 100));
        const receitaNome = model.receitas.find((r) => r.id === action.receitaId)?.nome ?? action.receitaId;
        novo = {
          ...novo,
          potes: {
            ...novo.potes,
            emergenciaHist: [
              { id: `reserva-${action.receitaId}-${action.mes}`, desc: `Reserva automática · ${receitaNome}`, valor: reserva, data: action.mes + "-01" },
              ...novo.potes.emergenciaHist,
            ],
          },
        };
      }
      return novo;
    }
    case "desfazerRecebimento":
      return patchEstado(model, action.mes, action.receitaId, { recebido: null });
    case "devolver":
      return patchEstado(model, action.mes, action.receitaId, { devolvido: action.valor });
    case "desfazerDevolucao":
      return patchEstado(model, action.mes, action.receitaId, { devolvido: null });
    case "addGasto": {
      const atual = model.estados[action.mes]?.[action.itemId] ?? ESTADO_VAZIO;
      return patchEstado(model, action.mes, action.itemId, {
        gastos: [{ id: action.gastoId, valor: action.valor, data: action.data }, ...atual.gastos],
      });
    }
    case "delGasto": {
      const atual = model.estados[action.mes]?.[action.itemId] ?? ESTADO_VAZIO;
      return patchEstado(model, action.mes, action.itemId, {
        gastos: atual.gastos.filter((g) => g.id !== action.gastoId),
      });
    }
    case "fecharCaixinha": {
      const atual = model.estados[action.mes]?.[action.itemId] ?? ESTADO_VAZIO;
      const total = round2(atual.gastos.reduce((s, g) => s + g.valor, 0));
      return patchEstado(model, action.mes, action.itemId, { pago: total });
    }
    case "editarEstado":
      return patchEstado(model, action.mes, action.itemId, { [action.campo]: action.valor });
    case "recarregarCaixinha": {
      const cx = model.caixinhas[action.chave];
      return {
        ...model,
        caixinhas: {
          ...model.caixinhas,
          [action.chave]: {
            ...cx,
            mov: [
              { id: action.movId, tipo: "recarga", disponivel: action.disponivel, custo: action.custo, tarifa: action.tarifa, data: action.mes + "-01", mes: action.mes },
              ...cx.mov,
            ],
          },
        },
      };
    }
    case "gastarCaixinha": {
      const cx = model.caixinhas[action.chave];
      return {
        ...model,
        caixinhas: {
          ...model.caixinhas,
          [action.chave]: {
            ...cx,
            mov: [{ id: action.movId, tipo: "gasto", valor: action.valor, data: action.mes + "-01", mes: action.mes }, ...cx.mov],
          },
        },
      };
    }
    case "definirSaldoInicialZul": {
      const cx = model.caixinhas[action.chave];
      return {
        ...model,
        caixinhas: {
          ...model.caixinhas,
          [action.chave]: {
            ...cx,
            mov: [
              { id: action.movId, tipo: "recarga", disponivel: action.saldo, custo: 0, tarifa: 0, data: action.mes + "-01", mes: action.mes },
              ...cx.mov,
            ],
          },
        },
      };
    }
    case "delMovCaixinha": {
      const cx = model.caixinhas[action.chave];
      return { ...model, caixinhas: { ...model.caixinhas, [action.chave]: { ...cx, mov: cx.mov.filter((m) => m.id !== action.movId) } } };
    }
    case "dispensarAviso":
      return { ...model, avisosDispensados: [...model.avisosDispensados, action.chave] };
    case "editarValor": {
      const lista = action.tipo === "despesa" ? "despesas" : "receitas";
      return {
        ...model,
        [lista]: (model[lista] as { id: string; overrides: Record<string, { valor?: number; removido?: boolean }>; valor: number }[]).map((it) =>
          it.id !== action.itemId
            ? it
            : action.soNesseMes
              ? { ...it, overrides: { ...it.overrides, [action.mes]: { ...it.overrides[action.mes], valor: action.valor } } }
              : { ...it, valor: action.valor },
        ),
      } as DataModel;
    }
    case "removerItem": {
      const lista = action.tipo === "despesa" ? "despesas" : "receitas";
      if (action.soNesseMes) {
        return {
          ...model,
          [lista]: (model[lista] as { id: string; overrides: Record<string, { valor?: number; removido?: boolean }> }[]).map((it) =>
            it.id !== action.itemId ? it : { ...it, overrides: { ...it.overrides, [action.mes]: { ...it.overrides[action.mes], removido: true } } },
          ),
        } as DataModel;
      }
      return { ...model, [lista]: (model[lista] as { id: string }[]).filter((it) => it.id !== action.itemId) } as DataModel;
    }
    case "addDespesa":
      return {
        ...model,
        despesas: [
          ...model.despesas,
          {
            id: action.itemId,
            nome: action.dados.nome,
            icone: action.dados.icone,
            valor: action.dados.valor,
            dia: action.dados.dia,
            q: "Q1",
            provisaoAnual: null,
            overrides: {},
            apenasMes: action.apenasEsseMes ? action.mes : null,
          },
        ],
      };
    case "addReceita":
      return {
        ...model,
        receitas: [
          ...model.receitas,
          {
            id: action.itemId,
            nome: action.dados.nome,
            icone: action.dados.icone,
            valor: action.dados.valor,
            dia: action.dados.dia,
            quando: action.dados.quando,
            q: action.dados.q,
            ativa: true,
            reserva: false,
            dizimo: true,
            deduz: false,
            overrides: {},
            apenasMes: action.apenasEsseMes ? action.mes : null,
          },
        ],
      };
    case "toggleReceita":
      return {
        ...model,
        receitas: model.receitas.map((r) => (r.id === action.receitaId ? { ...r, [action.campo]: !r[action.campo] } : r)),
      };
    case "updateConfig":
      return { ...model, config: { ...model.config, [action.campo]: action.valor } };
    case "updateCartao":
      return { ...model, cartoes: model.cartoes.map((c) => (c.id === action.cartaoId ? { ...c, [action.campo]: action.valor } : c)) };
    case "addParcela":
      return {
        ...model,
        parcelas: [
          { id: action.parcelaId, desc: action.desc, parcela: action.parcela, atual: action.atual, total: action.total, cartaoId: action.cartaoId, base: action.base },
          ...model.parcelas,
        ],
      };
    case "delParcela":
      return { ...model, parcelas: model.parcelas.filter((p) => p.id !== action.parcelaId) };
    case "registrarConsumoIA": {
      const round4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
      return {
        ...model,
        config: {
          ...model.config,
          consumoIA: round4(model.config.consumoIA + action.custo),
          consumoIAMes: { ...model.config.consumoIAMes, [action.mes]: round4((model.config.consumoIAMes[action.mes] ?? 0) + action.custo) },
        },
      };
    }
    case "retirarPote": {
      const chave = action.pote === "emergencia" ? "emergenciaHist" : "folgaHist";
      return {
        ...model,
        potes: {
          ...model.potes,
          [chave]: [{ id: action.histId, desc: action.desc, valor: action.valor, data: new Date().toISOString().slice(0, 10) }, ...model.potes[chave]],
        },
      };
    }
    default:
      return model;
  }
}
