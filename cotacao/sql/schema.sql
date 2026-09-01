-- Cotação de Mercado — schema Postgres (Neon via Vercel)
--
-- A lista de compras vira várias "listinhas" datadas (uma por ida ao
-- mercado) em vez de uma lista única sem fim — mais perto de como a compra
-- acontece de verdade, e evita que a lista cresça pra sempre misturando
-- semanas diferentes. Cada listinha sincroniza entre os dois aparelhos com
-- o mesmo padrão do resto do app (fila otimista local + POST /api/actions +
-- GET /api/state). O resultado de uma cotação (busca nos mercados +
-- matching por IA) é sempre recalculado na hora, a pedido (POST
-- /api/cotar) — não é gravado no banco, então não precisa de tabela própria.

CREATE TABLE IF NOT EXISTS listas (
  id TEXT PRIMARY KEY,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS itens (
  id TEXT PRIMARY KEY,
  lista_id TEXT NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS itens_lista_idx ON itens (lista_id);

-- configuração geral (linha única) — hoje só guarda o token de sessão do
-- Shibata, que expira e precisa ser colado manualmente em Ajustes (ver
-- src/lib/mercados/shibata.ts).
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shibata_token TEXT
);
