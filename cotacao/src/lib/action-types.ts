// Todas as mutações possíveis da lista de compras. O mesmo formato é usado
// pelo reducer otimista do cliente (src/lib/optimistic.ts) e pela camada de
// banco (src/lib/db-actions.ts) — mesmo padrão do projeto Caderno.
export type Action =
  | { type: "addItem"; itemId: string; texto: string }
  | { type: "removerItem"; itemId: string }
  | { type: "setShibataToken"; token: string };
