-- Cotação de Mercado — schema Postgres (Neon via Vercel)
--
-- A lista de compras vira várias "listinhas" datadas (uma por ida ao
-- mercado) em vez de uma lista única sem fim — mais perto de como a compra
-- acontece de verdade, e evita que a lista cresça pra sempre misturando
-- semanas diferentes. Cada listinha sincroniza entre os dois aparelhos com
-- o mesmo padrão do resto do app (fila otimista local + POST /api/actions +
-- GET /api/state).

CREATE TABLE IF NOT EXISTS listas (
  id TEXT PRIMARY KEY,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens (
  id TEXT PRIMARY KEY,
  lista_id TEXT NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  -- quantidade/unidade: legado, não usadas mais pelo app (a lista só guarda
  -- o que a pessoa quer, sem quantidade — a quantidade desejada é digitada
  -- na tela de resultado, só pra estimar um total, e não é persistida por
  -- item). Colunas mantidas com DEFAULT pra não exigir migração; ok remover
  -- num cleanup futuro.
  quantidade NUMERIC NOT NULL DEFAULT 1,
  unidade TEXT NOT NULL DEFAULT 'un',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS itens_lista_idx ON itens (lista_id);

-- Última cotação de cada listinha (1 por listinha, não histórico — cotar
-- de novo substitui). Guarda o ResultadoCotacao inteiro (src/lib/types.ts)
-- como um bloco só, incluindo trocas manuais de produto feitas na tela de
-- resultado (ver src/components/Resultado.tsx) — é sempre o retrato da
-- última tela vista, não dado normalizado de negócio, por isso JSONB em
-- vez de tabelas separadas por item/candidato.
CREATE TABLE IF NOT EXISTS cotacoes (
  lista_id TEXT PRIMARY KEY REFERENCES listas(id) ON DELETE CASCADE,
  resultado JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- configuração geral (linha única) — hoje só guarda o token de sessão do
-- Shibata, que expira e precisa ser colado manualmente em Ajustes (ver
-- src/lib/mercados/shibata.ts).
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shibata_token TEXT
);
