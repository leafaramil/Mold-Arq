// Todas as mutações possíveis do app. O mesmo formato é usado pelo reducer
// otimista do cliente (src/lib/optimistic.ts) e pela camada de banco
// (src/lib/db-actions.ts) — mesmo padrão do projeto Caderno.
import type { ResultadoCotacao } from "./types";

export type Action =
  | { type: "criarLista"; listaId: string; criadaEm: string }
  | { type: "removerLista"; listaId: string }
  | { type: "addItem"; itemId: string; listaId: string; texto: string }
  | { type: "removerItem"; itemId: string }
  | { type: "setShibataToken"; token: string }
  | { type: "salvarCotacao"; listaId: string; resultado: ResultadoCotacao };
