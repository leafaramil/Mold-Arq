-- Dados iniciais da seção 7 da especificação, em SQL puro — pensado para
-- ser colado diretamente no editor de SQL da Vercel/Neon (Storage → seu
-- banco → aba "Query"/"SQL Editor"), sem precisar rodar nada no terminal.
-- Idempotente: pode rodar mais de uma vez sem duplicar nada.

INSERT INTO despesas (id, nome, icone, valor, dia, q, provisao_anual) VALUES
  ('energia', 'Energia', '⚡', 685.00, 1, NULL, NULL),
  ('iptu', 'IPTU', '🏛️', 194.43, 8, NULL, NULL),
  ('agua', 'Água', '💧', 290.40, 10, NULL, NULL),
  ('internet', 'Internet/TV', '📶', 190.53, 10, NULL, NULL),
  ('contador', 'Contador', '🧾', 190.00, 15, NULL, NULL),
  ('mercado_q1', 'Mercado', '🛒', 1000.00, NULL, 'Q1', NULL),
  ('nutricionista', 'Nutricionista', '🥗', 220.00, NULL, 'Q1', NULL),
  ('psicologo', 'Psicólogo', '🧠', 140.00, NULL, 'Q1', NULL),
  ('suplemento', 'Suplemento', '💊', 300.00, NULL, 'Q1', NULL),
  ('conducao', 'Condução', '🚌', 90.00, NULL, 'Q1', NULL),
  ('celular', 'Celular (pai)', '📱', 100.00, NULL, 'Q1', NULL),
  ('vigia', 'Vigia casa', '🧺', 35.00, NULL, 'Q1', NULL),
  ('ipva', 'IPVA/Licenciamento', '🚗', 140.00, NULL, 'Q1', 1680),
  ('imposto_rafael', 'Imposto Rafael', '📄', 820.00, 20, NULL, NULL),
  ('imposto_leticia', 'Imposto Letícia', '📄', 85.00, 20, NULL, NULL),
  ('plano_saude', 'Plano de saúde', '🩺', 1375.00, 30, NULL, NULL),
  ('mercado_q2', 'Mercado', '🛒', 1000.00, NULL, 'Q2', NULL),
  ('gasolina', 'Gasolina', '⛽', 200.00, NULL, 'Q2', NULL),
  ('lazer', 'Lazer', '🎉', 0.00, NULL, 'Q2', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO receitas (id, nome, icone, valor, dia, quando, q, ativa, reserva, dizimo, deduz) VALUES
  ('space30', 'Space Plan', '💼', 4500, NULL, 'dia 30 do mês anterior', 'Q1', true, false, true, true),
  ('otimiza', 'Otimiza', '⏳', 1500, 5, '5º dia útil', 'Q1', true, false, true, false),
  ('aluguel', 'Aluguel kitnet', '🏘️', 1400, 12, 'dia 12', 'Q1', false, false, true, false),
  ('space15', 'Space Plan', '💼', 4500, 15, 'dia 15', 'Q2', true, false, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cartoes (id, nome, icone, fechamento, fecha_ultimo_util, vencimento) VALUES
  ('cartao_rafa', 'Cartão Rafa', '💳', 3, false, 10),
  ('cartao_le', 'Cartão Lê', '💳', NULL, true, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO parcelas (id, descricao, parcela, atual, total, base, cartao_id) VALUES
  ('parc_1', 'Amazon', 58.33, 2, 12, '2026-08', 'cartao_rafa'),
  ('parc_2', 'Sancet', 58.34, 1, 3, '2026-08', 'cartao_rafa'),
  ('parc_3', 'Shopee', 21.87, 2, 5, '2026-08', 'cartao_rafa'),
  ('parc_4', 'Pisos reforma', 326.06, 6, 10, '2026-08', 'cartao_rafa'),
  ('parc_5', 'Mercado Livre', 45.65, 2, 5, '2026-08', 'cartao_rafa'),
  ('parc_6', 'Vacina filha', 83.75, 5, 8, '2026-08', 'cartao_rafa'),
  ('parc_7', 'Curso', 297.00, 3, 12, '2026-08', 'cartao_rafa'),
  ('parc_8', 'Vacina filha 2', 278.33, 6, 9, '2026-08', 'cartao_rafa'),
  ('parc_9', 'Curso 2', 30.30, 7, 12, '2026-08', 'cartao_rafa'),
  ('parc_10', 'Claude', 114.74, 1, 9999, '2026-08', 'cartao_rafa'),
  ('parc_11', 'YouTube', 53.90, 1, 9999, '2026-08', 'cartao_rafa'),
  ('parc_12', 'Google One', 96.99, 1, 9999, '2026-08', 'cartao_rafa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO caixinhas (chave, nome, icone) VALUES
  ('tag', 'Tag ZUL+ (pedágio)', '🛣️'),
  ('zona', 'Zona Azul (estacionamento)', '🅿️')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
