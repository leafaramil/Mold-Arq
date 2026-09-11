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
        cotacoes: model.cotacoes.filter((c) => c.listaId !== action.listaId),
      };
    case "addItem": {
      const itensDaLista = model.itens.filter((i) => i.listaId === action.listaId);
      const ordem = itensDaLista.length > 0 ? Math.max(...itensDaLista.map((i) => i.ordem)) + 1 : 0;
      return {
        ...model,
        itens: [...model.itens, { id: action.itemId, listaId: action.listaId, texto: action.texto, ordem }],
      };
    }
    case "removerItem":
      return { ...model, itens: model.itens.filter((i) => i.id !== action.itemId) };
    case "editarItem":
      return { ...model, itens: model.itens.map((i) => (i.id === action.itemId ? { ...i, texto: action.texto } : i)) };
    case "reordenarItens": {
      const novaOrdem = new Map(action.atualizacoes.map((a) => [a.itemId, a.ordem]));
      return { ...model, itens: model.itens.map((i) => (novaOrdem.has(i.id) ? { ...i, ordem: novaOrdem.get(i.id)! } : i)) };
    }
    case "setShibataToken":
      return { ...model, config: { ...model.config, shibataToken: action.token } };
    case "salvarCotacao":
      return {
        ...model,
        cotacoes: [...model.cotacoes.filter((c) => c.listaId !== action.listaId), { listaId: action.listaId, resultado: action.resultado }],
      };
    default:
      return model;
  }
}
