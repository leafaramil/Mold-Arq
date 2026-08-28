// Dados iniciais da seção 7 da especificação, no formato usado pelas funções
// puras de cálculo. Espelha scripts/seed.ts (mesmos ids e valores).
import type { Cartao, DataModel, Despesa, Parcela, Receita } from "../src/lib/types";

function despesa(partial: Partial<Despesa> & Pick<Despesa, "id" | "nome" | "icone" | "valor">): Despesa {
  return {
    dia: null,
    q: "Q1",
    provisaoAnual: null,
    overrides: {},
    apenasMes: null,
    ...partial,
  };
}

function receita(partial: Partial<Receita> & Pick<Receita, "id" | "nome" | "icone" | "valor" | "q">): Receita {
  return {
    dia: null,
    quando: "",
    ativa: true,
    reserva: false,
    dizimo: false,
    deduz: false,
    overrides: {},
    apenasMes: null,
    ...partial,
  };
}

export const DESPESAS_INICIAIS: Despesa[] = [
  despesa({ id: "energia", nome: "Energia", icone: "⚡", valor: 685.0, dia: 1 }),
  despesa({ id: "iptu", nome: "IPTU", icone: "🏛️", valor: 194.43, dia: 8 }),
  despesa({ id: "agua", nome: "Água", icone: "💧", valor: 290.4, dia: 10 }),
  despesa({ id: "internet", nome: "Internet/TV", icone: "📶", valor: 190.53, dia: 10 }),
  despesa({ id: "contador", nome: "Contador", icone: "🧾", valor: 190.0, dia: 15 }),
  despesa({ id: "mercado_q1", nome: "Mercado", icone: "🛒", valor: 1000.0, q: "Q1" }),
  despesa({ id: "nutricionista", nome: "Nutricionista", icone: "🥗", valor: 220.0, q: "Q1" }),
  despesa({ id: "psicologo", nome: "Psicólogo", icone: "🧠", valor: 140.0, q: "Q1" }),
  despesa({ id: "suplemento", nome: "Suplemento", icone: "💊", valor: 300.0, q: "Q1" }),
  despesa({ id: "conducao", nome: "Condução", icone: "🚌", valor: 90.0, q: "Q1" }),
  despesa({ id: "celular", nome: "Celular (pai)", icone: "📱", valor: 100.0, q: "Q1" }),
  despesa({ id: "vigia", nome: "Vigia casa", icone: "🧺", valor: 35.0, q: "Q1" }),
  despesa({ id: "ipva", nome: "IPVA/Licenciamento", icone: "🚗", valor: 140.0, q: "Q1", provisaoAnual: 1680 }),
  despesa({ id: "imposto_rafael", nome: "Imposto Rafael", icone: "📄", valor: 820.0, dia: 20 }),
  despesa({ id: "imposto_leticia", nome: "Imposto Letícia", icone: "📄", valor: 85.0, dia: 20 }),
  despesa({ id: "plano_saude", nome: "Plano de saúde", icone: "🩺", valor: 1375.0, dia: 30 }),
  despesa({ id: "mercado_q2", nome: "Mercado", icone: "🛒", valor: 1000.0, q: "Q2" }),
  despesa({ id: "gasolina", nome: "Gasolina", icone: "⛽", valor: 200.0, q: "Q2" }),
  despesa({ id: "lazer", nome: "Lazer", icone: "🎉", valor: 0.0, q: "Q2" }),
];

export const RECEITAS_INICIAIS: Receita[] = [
  receita({ id: "space30", nome: "Space Plan", icone: "💼", valor: 4500, quando: "dia 30 do mês anterior", q: "Q1", dizimo: true, deduz: true }),
  receita({ id: "otimiza", nome: "Otimiza", icone: "⏳", valor: 1500, dia: 5, quando: "5º dia útil", q: "Q1", dizimo: true }),
  receita({ id: "aluguel", nome: "Aluguel kitnet", icone: "🏘️", valor: 1400, dia: 12, quando: "dia 12", q: "Q1", ativa: false, dizimo: true }),
  receita({ id: "space15", nome: "Space Plan", icone: "💼", valor: 4500, dia: 15, quando: "dia 15", q: "Q2", dizimo: true, deduz: true }),
];

export const CARTOES_INICIAIS: Cartao[] = [
  { id: "cartao_rafa", nome: "Cartão Rafa", icone: "💳", fechamento: 3, fechaUltimoUtil: false, vencimento: 10 },
  { id: "cartao_le", nome: "Cartão Lê", icone: "💳", fechamento: null, fechaUltimoUtil: true, vencimento: 10 },
];

const PARCELAS_RAFA: Omit<Parcela, "id" | "base" | "cartaoId">[] = [
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
];

export const PARCELAS_INICIAIS: Parcela[] = PARCELAS_RAFA.map((p, i) => ({
  ...p,
  id: `parc_${i + 1}`,
  base: "2026-08",
  cartaoId: "cartao_rafa",
}));

export function modeloInicial(): DataModel {
  return {
    despesas: structuredClone(DESPESAS_INICIAIS),
    receitas: structuredClone(RECEITAS_INICIAIS),
    cartoes: structuredClone(CARTOES_INICIAIS),
    parcelas: structuredClone(PARCELAS_INICIAIS),
    estados: {},
    caixinhas: {
      tag: { nome: "Tag ZUL+ (pedágio)", icone: "🛣️", mov: [] },
      zona: { nome: "Zona Azul (estacionamento)", icone: "🅿️", mov: [] },
    },
    potes: { emergenciaHist: [], folgaHist: [] },
    avisosDispensados: [],
    config: {
      reservaPct: 5,
      saldoInicial: 0,
      assistente: "Aristides",
      vozAtiva: true,
      consumoIA: 0,
      consumoIAMes: {},
    },
  };
}
