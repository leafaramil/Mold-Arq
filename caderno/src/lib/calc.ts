// Funções puras de cálculo do Caderno (seção 4 da especificação).
// Nenhuma função aqui faz I/O — tudo recebe os dados de que precisa como
// argumento (inclusive a data de "hoje", quando relevante) para ser 100%
// testável sem mockar banco de dados ou relógio.

import type {
  Caixinha,
  CaixinhaMov,
  Cartao,
  Despesa,
  Estados,
  EstadoItem,
  GastoParcial,
  LivreBreakdown,
  Parcela,
  PoteHist,
  Quinzena,
  Receita,
  ResolvedCartao,
  ResolvedDespesa,
  ResolvedReceita,
  DataModel,
  Aviso,
} from "./types";
import { ESTADO_VAZIO } from "./types";

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------- consumo do Aristides (seção 6.4) ----------

/**
 * Custo estimado em reais de uma chamada à API da Anthropic.
 * Referência: Sonnet ~US$3/milhão de tokens de entrada, US$15/milhão de
 * saída, câmbio aproximado 5,4.
 */
export function custoIA(tokensEntrada: number, tokensSaida: number, cambio = 5.4): number {
  const dolares = (tokensEntrada / 1e6) * 3 + (tokensSaida / 1e6) * 15;
  return Math.round(dolares * cambio * 10000) / 10000;
}

// ---------- datas / meses ----------

/** "YYYY-MM" a partir de uma Date. */
export function mesRefDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Nome do mês por extenso em pt-BR, ex: "Setembro de 2026". */
export function nomeMes(mesRef: string): string {
  const [y, m] = mesRef.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mês vizinho a `delta` meses de distância (negativo = passado). */
export function mesVizinho(mesRef: string, delta: number): string {
  const [y, m] = mesRef.split("-").map(Number);
  return mesRefDe(new Date(y, m - 1 + delta, 1));
}

/** Último dia útil do mês (pula sábado e domingo). */
export function ultimoDiaUtil(mesRef: string): number {
  const [y, m] = mesRef.split("-").map(Number);
  const d = new Date(y, m, 0); // último dia do mês
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.getDate();
}

/** Quinzena derivada do dia de vencimento: até 15 = Q1, 16+ = Q2. Sem dia, usa o fallback. */
export function quinzenaDoDia(dia: number | null, fallback: Quinzena): Quinzena {
  if (!dia) return fallback;
  return dia <= 15 ? "Q1" : "Q2";
}

/** Dias até o vencimento (negativo = já venceu). null quando não há dia definido. */
export function diasAte(dia: number | null, mesRef: string, hoje: Date): number | null {
  if (!dia) return null;
  const [y, m] = mesRef.split("-").map(Number);
  const ultimoDoMes = new Date(y, m, 0).getDate();
  const venc = new Date(y, m - 1, Math.min(dia, ultimoDoMes));
  const h = new Date(hoje);
  h.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - h.getTime()) / 86400000);
}

// ---------- resolução de itens por mês ----------

/** Valor mensal efetivo de uma despesa, considerando provisão anual (seção 4.13). */
export function valorBaseDespesa(d: Pick<Despesa, "valor" | "provisaoAnual">): number {
  return d.provisaoAnual != null ? round2(d.provisaoAnual / 12) : d.valor;
}

/**
 * Resolve uma despesa para um mês: aplica apenasMes, parcelamento avulso,
 * overrides e deriva a quinzena do dia.
 *
 * Uma despesa com `parcelamento` só existe nos meses em que a parcela está
 * ativa (mesma regra de uma fatura de cartão, seção 4.8) — fora desse
 * intervalo, ela simplesmente não aparece, como se fosse `apenasMes` só que
 * para um intervalo de meses em vez de um único.
 */
export function resolverDespesa(d: Despesa, mesRef: string): ResolvedDespesa | null {
  if (d.apenasMes && d.apenasMes !== mesRef) return null;

  let valorBase = valorBaseDespesa(d);
  let parcelaInfo: { atual: number; total: number } | null = null;
  if (d.parcelamento) {
    if (!parcelaAtivaNoMes(d.parcelamento, mesRef)) return null;
    valorBase = d.parcelamento.valor;
    parcelaInfo = { atual: numeroDaParcela(d.parcelamento.base, d.parcelamento.atual, mesRef), total: d.parcelamento.total };
  }

  const ov = d.overrides?.[mesRef];
  if (ov?.removido) return null;
  const valor = ov?.valor !== undefined ? ov.valor : valorBase;
  return { ...d, valor, q: quinzenaDoDia(d.dia, d.q), parcelaInfo };
}

/**
 * Resolve uma receita para um mês: aplica apenasMes e overrides — mas NUNCA
 * deriva a quinzena do dia. A quinzena de uma receita é a que ela PAGA, o
 * oposto de quando ela cai (seção 4.1) — fica como foi cadastrada.
 */
export function resolverReceita(r: Receita, mesRef: string): ResolvedReceita | null {
  if (r.apenasMes && r.apenasMes !== mesRef) return null;
  const ov = r.overrides?.[mesRef];
  if (ov?.removido) return null;
  const valor = ov?.valor !== undefined ? ov.valor : r.valor;
  return { ...r, valor };
}

/** Resolve um cartão para um mês: calcula a fatura a partir dos parcelamentos. */
export function resolverCartao(c: Cartao, parcelas: Parcela[], mesRef: string): ResolvedCartao {
  return { ...c, valor: faturaDoCartao(parcelas, c.id, mesRef), q: quinzenaDoDia(c.vencimento, "Q1") };
}

// ---------- parcelamentos (de cartão ou avulsos numa despesa) ----------

/** Número sequencial de uma parcela num mês, dado o mês/parcela de referência. */
export function numeroDaParcela(base: string, atual: number, mesRef: string): number {
  const [by, bm] = base.split("-").map(Number);
  const [ry, rm] = mesRef.split("-").map(Number);
  return atual + ((ry - by) * 12 + (rm - bm));
}

/**
 * Se uma parcela (de cartão — seção 4.8 — ou avulsa numa despesa) está ativa
 * num mês. `total >= 9999` é o mesmo padrão usado nos cartões para "recorrente
 * sem fim" (ex: assinaturas).
 */
export function parcelaAtivaNoMes(p: { atual: number; total: number; base: string }, mesRef: string): boolean {
  const n = numeroDaParcela(p.base, p.atual, mesRef);
  if (p.total >= 9999) return n >= p.atual;
  return n >= p.atual && n <= p.total;
}

/** Valor da parcela de `p` no mês `mesRef` (0 se estiver fora do intervalo). */
export function parcelaNoMes(p: Parcela, mesRef: string): number {
  return parcelaAtivaNoMes(p, mesRef) ? p.parcela : 0;
}

/**
 * Em qual mês a 1ª parcela de uma compra cai.
 * - Fechamento em dia fixo: compra até o dia do fechamento entra na fatura do
 *   mês corrente; depois, entra na do mês seguinte.
 * - Fechamento no último dia útil do mês ANTERIOR: toda compra do mês
 *   corrente já cai na fatura deste mesmo mês.
 */
export function mesDaPrimeiraParcela(
  mesCompra: string,
  diaCompra: number,
  fechamento: number | null,
  fechaUltimoUtil = false,
): string {
  if (fechaUltimoUtil) return mesCompra;
  if (!fechamento) return mesCompra;
  return diaCompra <= fechamento ? mesCompra : mesVizinho(mesCompra, 1);
}

/** Soma de todas as parcelas de um cartão que caem no mês `mesRef`. */
export function faturaDoCartao(parcelas: Parcela[], cartaoId: string, mesRef: string): number {
  return round2(
    parcelas.filter((p) => p.cartaoId === cartaoId).reduce((s, p) => s + parcelaNoMes(p, mesRef), 0),
  );
}

// ---------- estados / caixinhas de despesa ----------

export function estadoOuVazio(estados: Estados, mesRef: string, itemId: string): EstadoItem {
  return estados[mesRef]?.[itemId] ?? ESTADO_VAZIO;
}

export function gastoTotal(gastos: GastoParcial[]): number {
  return round2(gastos.reduce((s, g) => s + g.valor, 0));
}

export function estadoDe(e: EstadoItem): "aberto" | "separado" | "pago" {
  if (e.pago != null) return "pago";
  if (e.separado != null) return "separado";
  return "aberto";
}

// ---------- média automática (seção 4.4) ----------

export interface MediaReal {
  media: number;
  n: number;
}

/**
 * Média dos valores reais dos últimos `janela` meses (padrão 3): o valor
 * `pago` naquele mês, ou o valor ajustado manualmente (override) daquele mês.
 * `null` quando não há nenhum histórico. Recebe o id da despesa explicitamente
 * (em vez de embutir a busca do item) para ficar simples de testar.
 */
export function mediaRealDe(
  despesaId: string,
  overrides: Record<string, { valor?: number; removido?: boolean }>,
  estados: Estados,
  mesAtual: string,
  janela = 3,
): MediaReal | null {
  const vals: number[] = [];
  for (let i = 1; i <= janela; i++) {
    const m = mesVizinho(mesAtual, -i);
    const e = estados[m]?.[despesaId];
    if (e?.pago != null) {
      vals.push(e.pago);
      continue;
    }
    const ov = overrides?.[m];
    if (ov && ov.valor !== undefined && !ov.removido) {
      vals.push(ov.valor);
    }
  }
  if (vals.length === 0) return null;
  return { media: round2(vals.reduce((a, b) => a + b, 0) / vals.length), n: vals.length };
}

/** Valor previsto para exibição/sugestão: a média real, ou o valor base se não houver histórico. */
export function previsto(despesaValorResolvido: number, media: MediaReal | null): number {
  return media ? media.media : despesaValorResolvido;
}

// ---------- dízimo (seção 4.5) ----------

/**
 * Dízimo sobre uma receita. Só existe depois que a receita foi confirmada
 * como recebida — antes disso é 0 (ver `dizimoPrevisto` para exibição).
 * `base` é o valor sobre o qual aplicar o cálculo: o `recebido` real.
 */
export function dizimoDe(
  receita: Pick<Receita, "dizimo" | "deduz">,
  estadoReceita: Pick<EstadoItem, "recebido">,
  impostoRafaelValor: number,
  contadorValor: number,
): number {
  if (!receita.dizimo) return 0;
  if (estadoReceita.recebido == null) return 0;
  let base = estadoReceita.recebido;
  if (receita.deduz) base = base - (impostoRafaelValor + contadorValor) / 2;
  return round2(base * 0.1);
}

/** Dízimo previsto (para exibição antes da confirmação), sobre o valor previsto da receita. */
export function dizimoPrevisto(
  receita: Pick<Receita, "dizimo" | "deduz" | "valor">,
  impostoRafaelValor: number,
  contadorValor: number,
): number {
  if (!receita.dizimo) return 0;
  let base = receita.valor;
  if (receita.deduz) base = base - (impostoRafaelValor + contadorValor) / 2;
  return round2(base * 0.1);
}

// ---------- ZUL (seção 4.9) ----------

export interface FaixaZul {
  disponivel: number;
  custo: number;
}

export const FAIXAS_TAG: FaixaZul[] = [
  { disponivel: 30, custo: 34.5 },
  { disponivel: 50, custo: 57.0 },
  { disponivel: 100, custo: 113.0 },
  { disponivel: 150, custo: 168.0 },
  { disponivel: 200, custo: 222.0 },
  { disponivel: 250, custo: 277.5 },
  { disponivel: 500, custo: 555.0 },
];

export const FAIXAS_ZONA: FaixaZul[] = [5, 10, 15, 20, 30, 60].map((v) => ({ disponivel: v, custo: v }));

/** Saldo de uma caixinha ZUL: soma das movimentações (recarga soma o disponível, gasto subtrai). */
export function saldoCaixinha(mov: CaixinhaMov[]): number {
  return round2(
    mov.reduce((s, m) => s + (m.tipo === "recarga" ? (m.disponivel ?? 0) : -(m.valor ?? 0)), 0),
  );
}

/** Soma dos custos de recarga lançados no mês (o que efetivamente afeta o livre daquele mês). */
export function gastoZulNoMes(caixinhas: Record<string, Caixinha>, mesRef: string): number {
  return round2(
    Object.values(caixinhas).reduce(
      (s, cx) => s + cx.mov.filter((m) => m.tipo === "recarga" && m.mes === mesRef).reduce((a, m) => a + (m.custo ?? 0), 0),
      0,
    ),
  );
}

// ---------- potes de poupança (seção 4.7) ----------

export function saldoPote(hist: PoteHist[]): number {
  return round2(hist.reduce((s, h) => s + h.valor, 0));
}

// ---------- avisos de vencimento (seção 4.10) ----------

export function textoAviso(dias: number): string {
  if (dias < 0) return `venceu há ${-dias} ${-dias === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "vence hoje";
  return `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

export function calcularAvisos(
  itens: { id: string; nome: string; icone: string; dia: number | null }[],
  estados: Record<string, Pick<EstadoItem, "pago">>,
  avisosDispensados: string[],
  mesRef: string,
  hoje: Date,
): Aviso[] {
  return itens
    .filter((it) => estados[it.id]?.pago == null)
    .map((it) => ({ it, dias: diasAte(it.dia, mesRef, hoje) }))
    .filter((x): x is { it: (typeof itens)[number]; dias: number } => x.dias !== null && x.dias <= 5)
    .map((x) => ({
      itemId: x.it.id,
      nome: x.it.nome,
      icone: x.it.icone,
      dias: x.dias,
      chave: `${mesRef}|${x.it.id}|${x.dias < 0 ? "vencido" : "avencer"}`,
    }))
    .filter((a) => !avisosDispensados.includes(a.chave))
    .sort((a, b) => a.dias - b.dias);
}

// ---------- o cálculo central: "livre para gastar" (seção 4.2 a 4.11) ----------

function temHistorico(model: DataModel, mesRef: string): boolean {
  if (model.estados[mesRef] && Object.keys(model.estados[mesRef]).length > 0) return true;
  // um mês pode ter só movimentação de ZUL (sem nenhuma despesa/receita
  // tocada) e ainda assim ser um mês "usado" — o saldo precisa atravessar.
  return Object.values(model.caixinhas).some((cx) => cx.mov.some((m) => m.mes === mesRef));
}

/**
 * Calcula o "livre para gastar" do mês, com a decomposição completa.
 * Recursivo sobre `saldoInicial`: o saldo positivo de um mês passa
 * automaticamente para o seguinte (seção 4.11); enquanto não houver
 * histórico do mês anterior, usa `config.saldoInicial`.
 */
export function calcularLivre(model: DataModel, mesRef: string, hoje: Date): LivreBreakdown {
  const despesas = model.despesas.map((d) => resolverDespesa(d, mesRef)).filter((d): d is ResolvedDespesa => d !== null);
  const receitas = model.receitas
    .map((r) => resolverReceita(r, mesRef))
    .filter((r): r is ResolvedReceita => r !== null)
    .filter((r) => r.ativa);
  const cartoes = model.cartoes.map((c) => resolverCartao(c, model.parcelas, mesRef));
  const estadosDoMes = model.estados[mesRef] ?? {};

  const gastoTotalDe = (id: string) => gastoTotal(estadosDoMes[id]?.gastos ?? []);

  const recebido = round2(receitas.reduce((s, r) => s + (estadosDoMes[r.id]?.recebido ?? 0), 0));

  const pagoBruto = round2(despesas.reduce((s, d) => s + (estadosDoMes[d.id]?.pago ?? 0), 0));

  const separadoDespesas = despesas.reduce((s, d) => {
    const e = estadosDoMes[d.id];
    if (!e || e.pago != null || e.separado == null) return s;
    return s + Math.max(0, e.separado - gastoTotalDe(d.id));
  }, 0);
  const separadoCartoes = cartoes.reduce((s, c) => {
    const e = estadosDoMes[c.id];
    if (!e || e.pago != null || e.separado == null) return s;
    return s + e.separado;
  }, 0);
  const separado = round2(separadoDespesas + separadoCartoes);

  const gastoDeCaixinhas = round2(
    despesas.reduce((s, d) => {
      const e = estadosDoMes[d.id];
      if (!e || e.pago != null || e.separado == null) return s;
      return s + Math.min(gastoTotalDe(d.id), e.separado);
    }, 0),
  );

  const estouro = round2(
    despesas.reduce((s, d) => {
      const e = estadosDoMes[d.id];
      if (!e || e.separado == null || e.pago != null) return s;
      return s + Math.max(0, gastoTotalDe(d.id) - e.separado);
    }, 0),
  );

  // O dízimo NÃO é descontado do livre sozinho ao confirmar o recebimento —
  // só quando a devolução é de fato registrada (botão "Devolver"). A
  // responsabilidade de separar e devolver é do usuário; o app não presume
  // isso por ele.
  const devolvido = round2(receitas.reduce((s, r) => s + (estadosDoMes[r.id]?.devolvido ?? 0), 0));

  const gastoZulMes = gastoZulNoMes(model.caixinhas, mesRef);

  const cartoesLancados = round2(
    cartoes.reduce((s, c) => {
      const e = estadosDoMes[c.id];
      if (!e) return s;
      if (e.pago != null) return s + e.pago;
      if (e.separado != null) return s + e.separado;
      return s;
    }, 0),
  );

  const mesAnterior = mesVizinho(mesRef, -1);
  const saldoInicial = temHistorico(model, mesAnterior)
    ? calcularLivre(model, mesAnterior, hoje).livre
    : model.config.saldoInicial;

  const livre = round2(
    saldoInicial +
      recebido -
      pagoBruto -
      separado -
      gastoDeCaixinhas -
      estouro -
      devolvido -
      gastoZulMes -
      cartoesLancados,
  );

  return {
    livre,
    saldoInicial,
    recebido,
    pagoBruto,
    pago: round2(pagoBruto + gastoDeCaixinhas),
    separado,
    estouro,
    devolvido,
    gastoZulMes,
    cartoesLancados,
  };
}
