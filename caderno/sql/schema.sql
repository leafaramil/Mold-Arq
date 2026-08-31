-- Caderno — schema Postgres (Vercel Postgres)
--
-- Desenho: cada mutação do app é um INSERT (para eventos: gastos, movimentações
-- de caixinha, histórico de potes, avisos dispensados) ou um UPDATE/UPSERT num
-- único registro identificado por chave natural (mes+item, ou o item em si).
-- Saldos que "atravessam meses" (caixinhas ZUL, potes) nunca são uma coluna
-- incrementada — são sempre a SOMA do histórico. Isso é o que garante a seção 2:
-- "escritas concorrentes não podem perder dados" — dois dispositivos gravando
-- ao mesmo tempo em itens diferentes (ou até no mesmo pote, via INSERT) nunca
-- se pisam; o único caso de last-write-wins é editar o MESMO campo do MESMO
-- item ao mesmo tempo, o que é aceitável.

CREATE TABLE IF NOT EXISTS despesas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  dia INTEGER,
  q TEXT CHECK (q IN ('Q1','Q2')),
  provisao_anual NUMERIC,
  apenas_mes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS despesa_overrides (
  despesa_id TEXT NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  valor NUMERIC,
  removido BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (despesa_id, mes)
);

-- Parcelamento avulso de uma despesa que NÃO é fatura de cartão (financiamento,
-- boleto em N vezes...). Mesma ideia de `parcelas`, só que ligado direto à
-- despesa em vez de a um cartão — a despesa só aparece nos meses em que a
-- parcela está ativa (ver `parcelaAtivaNoMes` em src/lib/calc.ts).
CREATE TABLE IF NOT EXISTS despesa_parcelamento (
  despesa_id TEXT PRIMARY KEY REFERENCES despesas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  atual INTEGER NOT NULL,
  total INTEGER NOT NULL,
  base TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS receitas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  dia INTEGER,
  quando TEXT,
  q TEXT NOT NULL CHECK (q IN ('Q1','Q2')),
  ativa BOOLEAN NOT NULL DEFAULT true,
  reserva BOOLEAN NOT NULL DEFAULT false,
  dizimo BOOLEAN NOT NULL DEFAULT false,
  deduz BOOLEAN NOT NULL DEFAULT false,
  apenas_mes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receita_overrides (
  receita_id TEXT NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  valor NUMERIC,
  removido BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (receita_id, mes)
);

CREATE TABLE IF NOT EXISTS cartoes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT NOT NULL,
  fechamento INTEGER,
  fecha_ultimo_util BOOLEAN NOT NULL DEFAULT false,
  vencimento INTEGER
);

-- Valor da fatura digitado direto num mês (uso do dia a dia — sem lançar
-- parcela por parcela). Quando existe uma linha aqui pro mês, ela substitui
-- o total calculado a partir de `parcelas` só naquele mês.
CREATE TABLE IF NOT EXISTS cartao_overrides (
  cartao_id TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  PRIMARY KEY (cartao_id, mes)
);

CREATE TABLE IF NOT EXISTS parcelas (
  id TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  parcela NUMERIC NOT NULL,
  atual INTEGER NOT NULL,
  total INTEGER NOT NULL,
  base TEXT NOT NULL,
  cartao_id TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE
);

-- um registro por item (despesa/receita/cartão) por mês
CREATE TABLE IF NOT EXISTS estados (
  mes TEXT NOT NULL,
  item_id TEXT NOT NULL,
  separado NUMERIC,
  pago NUMERIC,
  recebido NUMERIC,
  devolvido NUMERIC,
  PRIMARY KEY (mes, item_id)
);

-- gastos parciais dentro de uma caixinha de despesa (append-only)
CREATE TABLE IF NOT EXISTS gastos (
  id TEXT PRIMARY KEY,
  mes TEXT NOT NULL,
  item_id TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gastos_mes_item_idx ON gastos (mes, item_id);

-- caixinhas permanentes (ZUL): definição
CREATE TABLE IF NOT EXISTS caixinhas (
  chave TEXT PRIMARY KEY, -- 'tag' | 'zona'
  nome TEXT NOT NULL,
  icone TEXT NOT NULL
);

-- movimentações das caixinhas ZUL (append-only; saldo = soma)
CREATE TABLE IF NOT EXISTS caixinha_mov (
  id TEXT PRIMARY KEY,
  caixinha TEXT NOT NULL REFERENCES caixinhas(chave) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('recarga','gasto')),
  disponivel NUMERIC,
  custo NUMERIC,
  tarifa NUMERIC,
  valor NUMERIC,
  data DATE NOT NULL,
  mes TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caixinha_mov_chave_idx ON caixinha_mov (caixinha);

-- potes de poupança: histórico append-only (saldo = soma)
CREATE TABLE IF NOT EXISTS pote_hist (
  id TEXT PRIMARY KEY,
  pote TEXT NOT NULL CHECK (pote IN ('emergencia','folga')),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL, -- positivo = entrada, negativo = retirada
  data DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pote_hist_pote_idx ON pote_hist (pote);

-- avisos de vencimento dispensados (chave = "mes|itemId|estado")
CREATE TABLE IF NOT EXISTS avisos_dispensados (
  chave TEXT PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- configuração geral (linha única)
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reserva_pct NUMERIC NOT NULL DEFAULT 5,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  assistente TEXT NOT NULL DEFAULT 'Aristides',
  voz_ativa BOOLEAN NOT NULL DEFAULT true,
  consumo_ia NUMERIC NOT NULL DEFAULT 0
);

-- consumo de IA acumulado por mês
CREATE TABLE IF NOT EXISTS consumo_ia_mes (
  mes TEXT PRIMARY KEY,
  valor NUMERIC NOT NULL DEFAULT 0
);
