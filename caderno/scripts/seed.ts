// Carrega os dados iniciais da seção 7 da especificação. Idempotente
// (ON CONFLICT DO NOTHING) — pode ser rodado mais de uma vez sem duplicar.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const DESPESAS = [
  // 1ª quinzena (vence até dia 15)
  { id: "energia", nome: "Energia", icone: "⚡", valor: 685.0, dia: 1, q: null },
  { id: "iptu", nome: "IPTU", icone: "🏛️", valor: 194.43, dia: 8, q: null },
  { id: "agua", nome: "Água", icone: "💧", valor: 290.4, dia: 10, q: null },
  { id: "internet", nome: "Internet/TV", icone: "📶", valor: 190.53, dia: 10, q: null },
  { id: "contador", nome: "Contador", icone: "🧾", valor: 190.0, dia: 15, q: null },
  { id: "mercado_q1", nome: "Mercado", icone: "🛒", valor: 1000.0, dia: null, q: "Q1" },
  { id: "nutricionista", nome: "Nutricionista", icone: "🥗", valor: 220.0, dia: null, q: "Q1" },
  { id: "psicologo", nome: "Psicólogo", icone: "🧠", valor: 140.0, dia: null, q: "Q1" },
  { id: "suplemento", nome: "Suplemento", icone: "💊", valor: 300.0, dia: null, q: "Q1" },
  { id: "conducao", nome: "Condução", icone: "🚌", valor: 90.0, dia: null, q: "Q1" },
  { id: "celular", nome: "Celular (pai)", icone: "📱", valor: 100.0, dia: null, q: "Q1" },
  { id: "vigia", nome: "Vigia casa", icone: "🧺", valor: 35.0, dia: null, q: "Q1" },
  {
    id: "ipva",
    nome: "IPVA/Licenciamento",
    icone: "🚗",
    valor: 140.0,
    dia: null,
    q: "Q1",
    provisaoAnual: 1680,
  },
  // 2ª quinzena (vence do dia 16 em diante)
  { id: "imposto_rafael", nome: "Imposto Rafael", icone: "📄", valor: 820.0, dia: 20, q: null },
  { id: "imposto_leticia", nome: "Imposto Letícia", icone: "📄", valor: 85.0, dia: 20, q: null },
  { id: "plano_saude", nome: "Plano de saúde", icone: "🩺", valor: 1375.0, dia: 30, q: null },
  { id: "mercado_q2", nome: "Mercado", icone: "🛒", valor: 1000.0, dia: null, q: "Q2" },
  { id: "gasolina", nome: "Gasolina", icone: "⛽", valor: 200.0, dia: null, q: "Q2" },
  { id: "lazer", nome: "Lazer", icone: "🎉", valor: 0.0, dia: null, q: "Q2" },
];

const RECEITAS = [
  { id: "space30", nome: "Space Plan", icone: "💼", valor: 4500, dia: null, quando: "dia 30 do mês anterior", q: "Q1", ativa: true, reserva: false, dizimo: true, deduz: true },
  { id: "otimiza", nome: "Otimiza", icone: "⏳", valor: 1500, dia: 5, quando: "5º dia útil", q: "Q1", ativa: true, reserva: false, dizimo: true, deduz: false },
  { id: "aluguel", nome: "Aluguel kitnet", icone: "🏘️", valor: 1400, dia: 12, quando: "dia 12", q: "Q1", ativa: false, reserva: false, dizimo: true, deduz: false },
  { id: "space15", nome: "Space Plan", icone: "💼", valor: 4500, dia: 15, quando: "dia 15", q: "Q2", ativa: true, reserva: false, dizimo: true, deduz: true },
];

const CARTOES = [
  { id: "cartao_rafa", nome: "Cartão Rafa", icone: "💳", fechamento: 3, fechaUltimoUtil: false, vencimento: 10 },
  { id: "cartao_le", nome: "Cartão Lê", icone: "💳", fechamento: null, fechaUltimoUtil: true, vencimento: 10 },
];

const PARCELAS = [
  { desc: "Amazon", parcela: 58.33, atual: 2, total: 12 },
  { desc: "Sancet", parcela: 58.34, atual: 1, total: 3 },
  { desc: "Shopee", parcela: 21.87, atual: 2, total: 5 },
  { desc: "Pisos reforma", parcela: 326.06, atual: 6, total: 10 },
  { desc: "Mercado Livre", parcela: 45.65, atual: 2, total: 5 },
  { desc: "Vacina filha", parcela: 83.75, atual: 5, total: 8 },
  { desc: "Curso", parcela: 297.0, atual: 3, total: 12 },
  { desc: "Vacina filha 2", parcela: 278.33, atual: 6, total: 9 },
  { desc: "Curso 2", parcela: 30.3, atual: 7, total: 12 },
  { desc: "Claude", parcela: 114.74, atual: 1, total: 9999 },
  { desc: "YouTube", parcela: 53.9, atual: 1, total: 9999 },
  { desc: "Google One", parcela: 96.99, atual: 1, total: 9999 },
].map((p, i) => ({ ...p, id: `parc_${i + 1}`, base: "2026-08", cartaoId: "cartao_rafa" }));

const CAIXINHAS = [
  { chave: "tag", nome: "Tag ZUL+ (pedágio)", icone: "🛣️" },
  { chave: "zona", nome: "Zona Azul (estacionamento)", icone: "🅿️" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("DATABASE_URL / POSTGRES_URL não definida.");
    process.exit(1);
  }
  const sql = neon(connectionString);

  for (const d of DESPESAS) {
    await sql(
      `INSERT INTO despesas (id, nome, icone, valor, dia, q, provisao_anual)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [d.id, d.nome, d.icone, d.valor, d.dia, d.q, (d as { provisaoAnual?: number }).provisaoAnual ?? null],
    );
  }

  for (const r of RECEITAS) {
    await sql(
      `INSERT INTO receitas (id, nome, icone, valor, dia, quando, q, ativa, reserva, dizimo, deduz)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.nome, r.icone, r.valor, r.dia, r.quando, r.q, r.ativa, r.reserva, r.dizimo, r.deduz],
    );
  }

  for (const c of CARTOES) {
    await sql(
      `INSERT INTO cartoes (id, nome, icone, fechamento, fecha_ultimo_util, vencimento)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.nome, c.icone, c.fechamento, c.fechaUltimoUtil, c.vencimento],
    );
  }

  for (const p of PARCELAS) {
    await sql(
      `INSERT INTO parcelas (id, descricao, parcela, atual, total, base, cartao_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.desc, p.parcela, p.atual, p.total, p.base, p.cartaoId],
    );
  }

  for (const cx of CAIXINHAS) {
    await sql(
      `INSERT INTO caixinhas (chave, nome, icone) VALUES ($1,$2,$3) ON CONFLICT (chave) DO NOTHING`,
      [cx.chave, cx.nome, cx.icone],
    );
  }

  await sql(`INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

  console.log("Seed aplicado com sucesso.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
