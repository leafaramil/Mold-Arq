export type Quinzena = "Q1" | "Q2";

export interface ItemOverride {
  valor?: number;
  removido?: boolean;
}

// Parcelamento avulso de uma despesa que NÃO é fatura de cartão (financiamento,
// boleto em N vezes, etc.) — mesmo formato de uma parcela de cartão (seção 4.8),
// só que anexado direto à despesa em vez de a um cartaoId.
export interface Parcelamento {
  valor: number; // valor de cada parcela
  atual: number; // número da parcela no mês-base
  total: number; // total de parcelas (9999 = recorrente sem fim, como nos cartões)
  base: string; // mês de referência de `atual`, ex: "2026-08"
}

export interface Despesa {
  id: string;
  nome: string;
  icone: string;
  valor: number; // valor base/previsão inicial (para provisaoAnual, é o valor MENSAL já dividido)
  dia: number | null;
  q: Quinzena; // só usado quando dia === null
  provisaoAnual: number | null;
  parcelamento: Parcelamento | null;
  overrides: Record<string, ItemOverride>;
  apenasMes: string | null;
}

export interface ResolvedDespesa extends Despesa {
  q: Quinzena; // sempre resolvida (derivada do dia, ou fallback)
  parcelaInfo: { atual: number; total: number } | null; // "3/13", pra exibir na interface
}

export interface Receita {
  id: string;
  nome: string;
  icone: string;
  valor: number;
  dia: number | null;
  quando: string;
  q: Quinzena; // FIXO — indica qual quinzena a receita PAGA (não deriva do dia)
  ativa: boolean;
  reserva: boolean;
  dizimo: boolean;
  deduz: boolean;
  overrides: Record<string, ItemOverride>;
  apenasMes: string | null;
}

export type ResolvedReceita = Receita;

export interface Cartao {
  id: string;
  nome: string;
  icone: string;
  fechamento: number | null;
  fechaUltimoUtil: boolean;
  vencimento: number | null;
}

export interface ResolvedCartao extends Cartao {
  valor: number; // fatura calculada a partir dos parcelamentos
  q: Quinzena;
}

export interface Parcela {
  id: string;
  desc: string;
  parcela: number;
  atual: number;
  total: number; // 9999 = recorrente sem fim
  base: string; // "YYYY-MM"
  cartaoId: string;
}

export interface GastoParcial {
  id: string;
  valor: number;
  data: string;
}

export interface EstadoItem {
  separado: number | null;
  pago: number | null;
  recebido: number | null;
  devolvido: number | null;
  gastos: GastoParcial[];
}

export const ESTADO_VAZIO: EstadoItem = {
  separado: null,
  pago: null,
  recebido: null,
  devolvido: null,
  gastos: [],
};

// estados[mes][itemId] = EstadoItem
export type Estados = Record<string, Record<string, EstadoItem>>;

export interface CaixinhaMov {
  id: string;
  tipo: "recarga" | "gasto";
  disponivel?: number;
  custo?: number;
  tarifa?: number;
  valor?: number;
  data: string;
  mes: string;
}

export interface Caixinha {
  nome: string;
  icone: string;
  mov: CaixinhaMov[];
}

export type Caixinhas = Record<string, Caixinha>;

export interface PoteHist {
  id: string;
  desc: string;
  valor: number; // positivo = entrada, negativo = retirada
  data: string;
}

export interface Potes {
  emergenciaHist: PoteHist[];
  folgaHist: PoteHist[];
}

export interface Config {
  reservaPct: number;
  saldoInicial: number;
  assistente: string;
  vozAtiva: boolean;
  consumoIA: number;
  consumoIAMes: Record<string, number>;
}

export interface DataModel {
  despesas: Despesa[];
  receitas: Receita[];
  cartoes: Cartao[];
  parcelas: Parcela[];
  estados: Estados;
  caixinhas: Caixinhas;
  potes: Potes;
  avisosDispensados: string[];
  config: Config;
}

export interface LivreBreakdown {
  livre: number;
  saldoInicial: number;
  recebido: number;
  pagoBruto: number;
  pago: number; // pagoBruto + gasto já saído das caixinhas ainda abertas
  separado: number; // ainda reservado, atravessando todas as despesas/cartões
  estouro: number;
  devolvido: number;
  gastoZulMes: number;
  cartoesLancados: number;
}

export interface Aviso {
  itemId: string;
  nome: string;
  icone: string;
  dias: number;
  chave: string;
}
