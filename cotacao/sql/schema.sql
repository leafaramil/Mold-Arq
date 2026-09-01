-- Cotação de Mercado — schema Postgres (Neon via Vercel)
--
-- Modelo simples, de propósito: a lista de compras é a única coisa que
-- precisa sincronizar entre os dois aparelhos em tempo real (mesmo padrão
-- do Caderno — fila otimista local + POST /api/actions + GET /api/state).
-- O resultado de uma cotação (busca nos mercados + matching por IA) é
-- sempre recalculado na hora, a pedido (POST /api/cotar) — não é gravado
-- no banco, então não precisa de tabela própria.

CREATE TABLE IF NOT EXISTS itens (
  id TEXT PRIMARY KEY,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- configuração geral (linha única) — hoje só guarda o token de sessão do
-- Shibata, que expira e precisa ser colado manualmente em Ajustes (ver
-- src/lib/mercados/shibata.ts).
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shibata_token TEXT
);
