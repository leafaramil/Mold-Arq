import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  Caixinha,
  CaixinhaMov,
  Cartao,
  Config,
  DataModel,
  Despesa,
  Estados,
  GastoParcial,
  ItemOverride,
  Parcela,
  Parcelamento,
  PoteHist,
  Quinzena,
  Receita,
} from "./types";

// Postgres devolve NUMERIC como string (evita perda de precisão em ponto
// flutuante na wire); convertemos explicitamente para number aqui, na borda
// entre banco e app — o resto do código nunca lida com essa ambiguidade.
const num = (v: unknown): number => (v == null ? 0 : typeof v === "number" ? v : parseFloat(String(v)));
const numOrNull = (v: unknown): number | null => (v == null ? null : num(v));

type Row = Record<string, unknown>;

export async function loadModel(sql: NeonQueryFunction<false, false>): Promise<DataModel> {
  const [
    despesasRows,
    despesaOverridesRows,
    despesaParcelamentoRows,
    receitasRows,
    receitaOverridesRows,
    cartoesRows,
    parcelasRows,
    estadosRows,
    gastosRows,
    caixinhasRows,
    caixinhaMovRows,
    poteHistRows,
    avisosRows,
    configRows,
    consumoIaMesRows,
  ] = await Promise.all([
    sql`SELECT * FROM despesas ORDER BY criado_em`,
    sql`SELECT * FROM despesa_overrides`,
    sql`SELECT * FROM despesa_parcelamento`,
    sql`SELECT * FROM receitas ORDER BY criado_em`,
    sql`SELECT * FROM receita_overrides`,
    sql`SELECT * FROM cartoes`,
    sql`SELECT * FROM parcelas`,
    sql`SELECT * FROM estados`,
    sql`SELECT * FROM gastos ORDER BY criado_em`,
    sql`SELECT * FROM caixinhas`,
    sql`SELECT * FROM caixinha_mov ORDER BY criado_em`,
    sql`SELECT * FROM pote_hist ORDER BY criado_em DESC`,
    sql`SELECT chave FROM avisos_dispensados`,
    sql`SELECT * FROM config WHERE id = 1`,
    sql`SELECT * FROM consumo_ia_mes`,
  ]);

  const despesaOverrides = new Map<string, Record<string, ItemOverride>>();
  for (const row of despesaOverridesRows as Row[]) {
    const id = row.despesa_id as string;
    const map = despesaOverrides.get(id) ?? {};
    map[row.mes as string] = { valor: numOrNull(row.valor) ?? undefined, removido: Boolean(row.removido) };
    despesaOverrides.set(id, map);
  }

  const despesaParcelamento = new Map<string, Parcelamento>();
  for (const row of despesaParcelamentoRows as Row[]) {
    despesaParcelamento.set(row.despesa_id as string, {
      valor: num(row.valor),
      atual: num(row.atual),
      total: num(row.total),
      base: row.base as string,
    });
  }

  const receitaOverrides = new Map<string, Record<string, ItemOverride>>();
  for (const row of receitaOverridesRows as Row[]) {
    const id = row.receita_id as string;
    const map = receitaOverrides.get(id) ?? {};
    map[row.mes as string] = { valor: numOrNull(row.valor) ?? undefined, removido: Boolean(row.removido) };
    receitaOverrides.set(id, map);
  }

  const despesas: Despesa[] = (despesasRows as Row[]).map((r) => ({
    id: r.id as string,
    nome: r.nome as string,
    icone: r.icone as string,
    valor: num(r.valor),
    dia: numOrNull(r.dia),
    q: (r.q as Quinzena) ?? "Q1",
    provisaoAnual: numOrNull(r.provisao_anual),
    parcelamento: despesaParcelamento.get(r.id as string) ?? null,
    overrides: despesaOverrides.get(r.id as string) ?? {},
    apenasMes: (r.apenas_mes as string) ?? null,
  }));

  const receitas: Receita[] = (receitasRows as Row[]).map((r) => ({
    id: r.id as string,
    nome: r.nome as string,
    icone: r.icone as string,
    valor: num(r.valor),
    dia: numOrNull(r.dia),
    quando: (r.quando as string) ?? "",
    q: r.q as Quinzena,
    ativa: Boolean(r.ativa),
    reserva: Boolean(r.reserva),
    dizimo: Boolean(r.dizimo),
    deduz: Boolean(r.deduz),
    overrides: receitaOverrides.get(r.id as string) ?? {},
    apenasMes: (r.apenas_mes as string) ?? null,
  }));

  const cartoes: Cartao[] = (cartoesRows as Row[]).map((r) => ({
    id: r.id as string,
    nome: r.nome as string,
    icone: r.icone as string,
    fechamento: numOrNull(r.fechamento),
    fechaUltimoUtil: Boolean(r.fecha_ultimo_util),
    vencimento: numOrNull(r.vencimento),
  }));

  const parcelas: Parcela[] = (parcelasRows as Row[]).map((r) => ({
    id: r.id as string,
    desc: r.descricao as string,
    parcela: num(r.parcela),
    atual: num(r.atual),
    total: num(r.total),
    base: r.base as string,
    cartaoId: r.cartao_id as string,
  }));

  const gastosPorEstado = new Map<string, GastoParcial[]>();
  for (const row of gastosRows as Row[]) {
    const chave = `${row.mes}|${row.item_id}`;
    const lista = gastosPorEstado.get(chave) ?? [];
    lista.push({ id: row.id as string, valor: num(row.valor), data: String(row.data).slice(0, 10) });
    gastosPorEstado.set(chave, lista);
  }

  const estados: Estados = {};
  for (const row of estadosRows as Row[]) {
    const mes = row.mes as string;
    const itemId = row.item_id as string;
    estados[mes] = estados[mes] ?? {};
    estados[mes][itemId] = {
      separado: numOrNull(row.separado),
      pago: numOrNull(row.pago),
      recebido: numOrNull(row.recebido),
      devolvido: numOrNull(row.devolvido),
      gastos: gastosPorEstado.get(`${mes}|${itemId}`) ?? [],
    };
  }
  // gastos podem existir para um item sem uma linha em `estados` ainda
  // (ordem de escrita não é garantida entre dispositivos) — garante que
  // apareçam mesmo assim.
  for (const [chave, gastos] of gastosPorEstado) {
    const [mes, itemId] = chave.split("|");
    estados[mes] = estados[mes] ?? {};
    if (!estados[mes][itemId]) {
      estados[mes][itemId] = { separado: null, pago: null, recebido: null, devolvido: null, gastos };
    }
  }

  const movPorCaixinha = new Map<string, CaixinhaMov[]>();
  for (const row of caixinhaMovRows as Row[]) {
    const chave = row.caixinha as string;
    const lista = movPorCaixinha.get(chave) ?? [];
    lista.push({
      id: row.id as string,
      tipo: row.tipo as "recarga" | "gasto",
      disponivel: numOrNull(row.disponivel) ?? undefined,
      custo: numOrNull(row.custo) ?? undefined,
      tarifa: numOrNull(row.tarifa) ?? undefined,
      valor: numOrNull(row.valor) ?? undefined,
      data: String(row.data).slice(0, 10),
      mes: row.mes as string,
    });
    movPorCaixinha.set(chave, lista);
  }

  const caixinhas: Record<string, Caixinha> = {};
  for (const row of caixinhasRows as Row[]) {
    caixinhas[row.chave as string] = {
      nome: row.nome as string,
      icone: row.icone as string,
      mov: movPorCaixinha.get(row.chave as string) ?? [],
    };
  }

  const emergenciaHist: PoteHist[] = [];
  const folgaHist: PoteHist[] = [];
  for (const row of poteHistRows as Row[]) {
    const item: PoteHist = { id: row.id as string, desc: row.descricao as string, valor: num(row.valor), data: String(row.data).slice(0, 10) };
    if (row.pote === "emergencia") emergenciaHist.push(item);
    else folgaHist.push(item);
  }

  const avisosDispensados = (avisosRows as Row[]).map((r) => r.chave as string);

  const configRow = (configRows as Row[])[0];
  const consumoIAMes: Record<string, number> = {};
  for (const row of consumoIaMesRows as Row[]) consumoIAMes[row.mes as string] = num(row.valor);

  const config: Config = {
    reservaPct: num(configRow?.reserva_pct ?? 5),
    saldoInicial: num(configRow?.saldo_inicial ?? 0),
    assistente: (configRow?.assistente as string) ?? "Aristides",
    vozAtiva: configRow ? Boolean(configRow.voz_ativa) : true,
    consumoIA: num(configRow?.consumo_ia ?? 0),
    consumoIAMes,
  };

  return {
    despesas,
    receitas,
    cartoes,
    parcelas,
    estados,
    caixinhas,
    potes: { emergenciaHist, folgaHist },
    avisosDispensados,
    config,
  };
}
