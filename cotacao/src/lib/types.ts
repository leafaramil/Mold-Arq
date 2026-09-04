export interface Lista {
  id: string;
  criadaEm: string; // ISO — data de criação da listinha, mostrada no card da Home
}

export interface Item {
  id: string;
  listaId: string;
  texto: string;
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
  candidatos: CandidatoProduto[];
  // índice em `candidatos` escolhido (pela IA, ou pelo usuário depois de
  // trocar) — null quando nenhum candidato é um match razoável.
  escolhaIndex: number | null;
  // multiplicador manual digitado na tela de resultado pra equalizar o
  // tamanho da embalagem encontrada nesse mercado (ver Resultado.tsx) —
  // opcional, ausente/undefined equivale a "1" (não ajustado).
  quantidade?: string;
  // A busca DESSE item nesse mercado falhou (rede, HTTP, parse, ou a
  // chamada de IA que faz o casamento). Distinto de escolhaIndex null com
  // erro ausente, que significa de verdade "esse mercado não vende isso".
  // Sem esse campo, uma falha pontual sumia como um "não encontrado"
  // silencioso e o item saía da conta — fazendo o mercado parecer mais
  // barato do que é.
  erro?: string;
}

export interface ResultadoMercado {
  mercadoId: "shibata" | "semar" | "alabarce" | "atacadao" | "nagumo";
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
