export interface Lista {
  id: string;
  criadaEm: string; // ISO — data de criação da listinha, mostrada no card da Home
}

export interface Item {
  id: string;
  listaId: string;
  texto: string;
  quantidade: number;
  unidade: string;
}

export interface Config {
  shibataToken: string | null;
}

export interface DataModel {
  listas: Lista[];
  itens: Item[];
  config: Config;
}

// --- resultado de uma cotação (POST /api/cotar) — nunca persistido, só
// trafega entre servidor e cliente na hora do clique em "Cotar" ---

export interface ItemEncontrado {
  itemId: string;
  itemTexto: string;
  quantidade: number;
  unidade: string;
  produtoNome: string;
  precoUnitario: number; // preço do produto encontrado no mercado, como veio de lá
  subtotal: number; // precoUnitario × quantidade — o que entra na soma do total do mercado
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
