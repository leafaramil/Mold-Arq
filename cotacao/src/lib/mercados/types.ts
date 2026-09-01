// Um resultado de busca já normalizado, na mesma forma pros 3 mercados —
// o resto do pipeline (matching por IA, soma de total) não precisa saber
// os detalhes de cada plataforma.
export interface ProdutoEncontrado {
  nome: string;
  preco: number;
  disponivel: boolean;
}

export interface BuscaMercado {
  produtos: ProdutoEncontrado[];
  // true só quando a causa foi autenticação (hoje, só o Shibata) — distinto
  // de uma busca que simplesmente não achou nada.
  tokenExpirado?: boolean;
  // erro de rede/parse inesperado, pra não confundir com "não encontrado"
  erro?: string;
}
