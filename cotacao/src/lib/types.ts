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
  cotacoes: Cotacao[]; // no máximo uma por listaId — ver sql/schema.sql
  config: Config;
}

// --- resultado de uma cotação: gerado a cada POST /api/cotar, e guardado
// (1 por listinha, sempre a mais recente — ver Cotacao abaixo) pra não
// precisar recotar toda vez que a listinha é reaberta ---

// Um produto encontrado na busca daquele mercado pra aquele item — nem
// todo candidato vira o escolhido; a lista inteira viaja pro cliente pra
// dar pra trocar a escolha da IA sem precisar buscar de novo.
export interface CandidatoProduto {
  nome: string;
  preco: number;
  disponivel: boolean;
}

export interface ItemNoMercado {
  itemId: string;
  itemTexto: string;
  quantidade: number;
  unidade: string;
  candidatos: CandidatoProduto[];
  // índice em `candidatos` escolhido (pela IA, ou pelo usuário depois de
  // trocar) — null quando nenhum candidato é um match razoável.
  escolhaIndex: number | null;
}

export interface ResultadoMercado {
  mercadoId: "shibata" | "semar" | "alabarce" | "atacadao";
  mercadoNome: string;
  itens: ItemNoMercado[]; // um por item da listinha, achado ou não
  tokenExpirado?: boolean; // hoje só o Shibata usa isso
  erro?: string; // erro de rede/parse inesperado, distinto de "não encontrado"
}

export interface ResultadoCotacao {
  geradoEm: string;
  mercados: ResultadoMercado[];
}

// A cotação salva de uma listinha — 1 por listaId, sempre a mais recente
// (cotar de novo, ou trocar uma escolha na tela, substitui).
export interface Cotacao {
  listaId: string;
  resultado: ResultadoCotacao;
}
