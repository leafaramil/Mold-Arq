export interface Item {
  id: string;
  texto: string;
}

export interface Config {
  shibataToken: string | null;
}

export interface DataModel {
  itens: Item[];
  config: Config;
}

// --- resultado de uma cotação (POST /api/cotar) — nunca persistido, só
// trafega entre servidor e cliente na hora do clique em "Cotar" ---

export interface ItemEncontrado {
  itemId: string;
  itemTexto: string;
  produtoNome: string;
  preco: number;
}

export interface ResultadoMercado {
  mercadoId: "shibata" | "semar" | "alabarce";
  mercadoNome: string;
  total: number;
  encontrados: ItemEncontrado[];
  naoEncontrados: string[]; // itemTexto dos itens sem match nesse mercado
  tokenExpirado?: boolean; // hoje só o Shibata usa isso
  erro?: string; // erro de rede/parse inesperado, distinto de "não encontrado"
}

export interface ResultadoCotacao {
  geradoEm: string;
  mercados: ResultadoMercado[];
}
