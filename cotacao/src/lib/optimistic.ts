// Reducer puro e otimista: aplica uma Action num DataModel já carregado em
// memória, para o cliente atualizar a tela instantaneamente (inclusive
// offline) antes da confirmação do servidor. Espelha exatamente as mesmas
// mutações que src/lib/db-actions.ts grava no Postgres.
import type { Action } from "./action-types";
import type { DataModel } from "./types";

export function applyAction(model: DataModel, action: Action): DataModel {
  switch (action.type) {
    case "criarLista":
      return { ...model, listas: [...model.listas, { id: action.listaId, criadaEm: action.criadaEm }] };
    case "removerLista":
      return {
        ...model,
        listas: model.listas.filter((l) => l.id !== action.listaId),
        itens: model.itens.filter((i) => i.listaId !== action.listaId),
      };
    case "addItem":
      return {
        ...model,
        itens: [...model.itens, { id: action.itemId, listaId: action.listaId, texto: action.texto, quantidade: action.quantidade, unidade: action.unidade }],
      };
    case "removerItem":
      return { ...model, itens: model.itens.filter((i) => i.id !== action.itemId) };
    case "setShibataToken":
      return { ...model, config: { ...model.config, shibataToken: action.token } };
    default:
      return model;
  }
}
