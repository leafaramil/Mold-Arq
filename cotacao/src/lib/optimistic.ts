// Reducer puro e otimista: aplica uma Action num DataModel já carregado em
// memória, para o cliente atualizar a tela instantaneamente (inclusive
// offline) antes da confirmação do servidor. Espelha exatamente as mesmas
// mutações que src/lib/db-actions.ts grava no Postgres.
import type { Action } from "./action-types";
import type { DataModel } from "./types";

export function applyAction(model: DataModel, action: Action): DataModel {
  switch (action.type) {
    case "addItem":
      return { ...model, itens: [...model.itens, { id: action.itemId, texto: action.texto }] };
    case "removerItem":
      return { ...model, itens: model.itens.filter((i) => i.id !== action.itemId) };
    case "setShibataToken":
      return { ...model, config: { ...model.config, shibataToken: action.token } };
    default:
      return model;
  }
}
