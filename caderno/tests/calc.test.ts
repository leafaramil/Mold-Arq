import { describe, expect, it } from "vitest";
import {
  calcularAvisos,
  calcularLivre,
  custoIA,
  dizimoDe,
  dizimoPrevisto,
  estadoDe,
  faturaDoCartao,
  gastoTotal,
  mediaRealDe,
  mesDaPrimeiraParcela,
  mesVizinho,
  numeroDaParcela,
  parcelaAtivaNoMes,
  parcelaNoMes,
  quinzenaDoDia,
  resolverCartao,
  resolverDespesa,
  resolverReceita,
  round2,
  saldoCaixinha,
  ultimoDiaUtil,
} from "../src/lib/calc";
import type { CaixinhaMov, DataModel, EstadoItem } from "../src/lib/types";
import { ESTADO_VAZIO } from "../src/lib/types";
import { modeloInicial, PARCELAS_INICIAIS } from "./fixtures";

const MES = "2026-09"; // primeiro mês de uso, per seção 9
const HOJE = new Date(2026, 8, 1); // 1º de setembro de 2026

function estado(partial: Partial<EstadoItem>): EstadoItem {
  return { ...ESTADO_VAZIO, gastos: [], ...partial };
}

function setEstado(model: DataModel, mes: string, itemId: string, patch: Partial<EstadoItem>) {
  model.estados[mes] = model.estados[mes] || {};
  model.estados[mes][itemId] = { ...(model.estados[mes][itemId] ?? ESTADO_VAZIO), ...patch };
}

// ---------- quinzenaDoDia ----------

describe("quinzenaDoDia", () => {
  it("dia 15 é o limite exato de Q1", () => {
    expect(quinzenaDoDia(15, "Q2")).toBe("Q1");
  });
  it("dia 16 é o limite exato de Q2", () => {
    expect(quinzenaDoDia(16, "Q1")).toBe("Q2");
  });
  it("sem dia (null), usa o fallback", () => {
    expect(quinzenaDoDia(null, "Q2")).toBe("Q2");
    expect(quinzenaDoDia(null, "Q1")).toBe("Q1");
  });
});

// ---------- ultimoDiaUtil ----------

describe("ultimoDiaUtil", () => {
  it("mês terminando num sábado (outubro/2026) → sexta anterior", () => {
    expect(ultimoDiaUtil("2026-10")).toBe(30);
  });
  it("mês terminando num domingo (maio/2026) → sexta anterior", () => {
    expect(ultimoDiaUtil("2026-05")).toBe(29);
  });
  it("mês terminando em dia de semana (novembro/2026, segunda) → o próprio dia", () => {
    expect(ultimoDiaUtil("2026-11")).toBe(30);
  });
});

// ---------- parcelaNoMes ----------

describe("parcelaNoMes", () => {
  const p = { id: "x", desc: "Curso", parcela: 100, atual: 3, total: 12, base: "2026-08", cartaoId: "cartao_rafa" };

  it("dentro do intervalo", () => {
    expect(parcelaNoMes(p, "2026-09")).toBe(100); // parcela 4/12
  });
  it("fora do intervalo — antes da parcela 'atual'", () => {
    // base é 2026-08 com atual=3: 2026-08 corresponderia à parcela 3, então
    // não há mês "antes" da 3 dentro do próprio schema — testamos com atual=1
    const p2 = { ...p, atual: 1 };
    expect(parcelaNoMes(p2, "2026-07")).toBe(0);
  });
  it("fora do intervalo — depois do total de parcelas", () => {
    expect(parcelaNoMes(p, "2027-08")).toBe(0); // parcela 15/12, já acabou
  });
  it("recorrente sem fim (total 9999) nunca some", () => {
    const rec = { ...p, total: 9999 };
    expect(parcelaNoMes(rec, "2030-01")).toBe(100);
  });
});

// ---------- mesDaPrimeiraParcela ----------

describe("mesDaPrimeiraParcela", () => {
  it("compra antes do fechamento (dia fixo) → mês corrente", () => {
    expect(mesDaPrimeiraParcela("2026-09", 2, 3, false)).toBe("2026-09");
  });
  it("compra depois do fechamento (dia fixo) → mês seguinte", () => {
    expect(mesDaPrimeiraParcela("2026-09", 15, 3, false)).toBe("2026-10");
  });
  it("fechamento no último dia útil do mês anterior → sempre o mês corrente", () => {
    expect(mesDaPrimeiraParcela("2026-09", 1, null, true)).toBe("2026-09");
    expect(mesDaPrimeiraParcela("2026-09", 29, null, true)).toBe("2026-09");
  });
});

// ---------- dizimoDe / dizimoPrevisto ----------

describe("dizimoDe", () => {
  const space = { dizimo: true, deduz: true };
  const otimiza = { dizimo: true, deduz: false };
  const impostoRafael = 820;
  const contador = 190;

  it("receita com dedução (Space): (recebido - (imposto+contador)/2) * 10%", () => {
    expect(dizimoDe(space, { recebido: 4500 }, impostoRafael, contador)).toBe(399.5);
  });
  it("receita sem dedução (Otimiza): 10% direto", () => {
    expect(dizimoDe(otimiza, { recebido: 1500 }, impostoRafael, contador)).toBe(150);
  });
  it("receita ainda não confirmada → 0, mesmo com dízimo ativo", () => {
    expect(dizimoDe(space, { recebido: null }, impostoRafael, contador)).toBe(0);
  });
  it("dizimoPrevisto usa o valor previsto da receita, não o recebido", () => {
    expect(dizimoPrevisto({ dizimo: true, deduz: true, valor: 4500 }, impostoRafael, contador)).toBe(399.5);
    expect(dizimoPrevisto({ dizimo: true, deduz: false, valor: 1400 }, 0, 0)).toBe(140);
  });
});

// ---------- dízimo — devolução manual (não é automática, seção 4.5 alterada a pedido do usuário) ----------

describe("dízimo no livre — só desconta quando devolvido", () => {
  it("confirmar o recebimento sozinho não desconta o dízimo do livre", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    expect(calcularLivre(model, MES, HOJE).livre).toBe(4500);
  });

  it("registrar a devolução desconta exatamente o valor devolvido do livre", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500, devolvido: 399.5 });
    expect(calcularLivre(model, MES, HOJE).livre).toBe(4100.5);
  });

  it("desfazer a devolução (devolvido: null) devolve o valor pro livre", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500, devolvido: null });
    expect(calcularLivre(model, MES, HOJE).livre).toBe(4500);
  });
});

// ---------- mediaRealDe ----------

describe("mediaRealDe", () => {
  it("sem histórico → null", () => {
    expect(mediaRealDe("agua", {}, {}, "2026-12")).toBeNull();
  });
  it("1 mês de histórico (pago)", () => {
    const estados = { "2026-11": { agua: estado({ pago: 300 }) } };
    expect(mediaRealDe("agua", {}, estados, "2026-12")).toEqual({ media: 300, n: 1 });
  });
  it("2 meses de histórico (pago)", () => {
    const estados = {
      "2026-11": { agua: estado({ pago: 300 }) },
      "2026-10": { agua: estado({ pago: 280 }) },
    };
    expect(mediaRealDe("agua", {}, estados, "2026-12")).toEqual({ media: 290, n: 2 });
  });
  it("3 meses de histórico (pago)", () => {
    const estados = {
      "2026-11": { agua: estado({ pago: 300 }) },
      "2026-10": { agua: estado({ pago: 280 }) },
      "2026-09": { agua: estado({ pago: 290 }) },
    };
    expect(mediaRealDe("agua", {}, estados, "2026-12")).toEqual({ media: 290, n: 3 });
  });
  it("mês com valor pago prevalece sobre mês só com override", () => {
    const estados = { "2026-11": { agua: estado({ pago: 300 }) } };
    const overrides = { "2026-11": { valor: 999 } };
    expect(mediaRealDe("agua", overrides, estados, "2026-12")).toEqual({ media: 300, n: 1 });
  });
  it("mês só com override (sem pago) conta no histórico", () => {
    const overrides = { "2026-11": { valor: 310 } };
    expect(mediaRealDe("agua", overrides, {}, "2026-12")).toEqual({ media: 310, n: 1 });
  });
});

// ---------- resolverDespesa / resolverReceita / resolverCartao ----------

describe("resolvedores", () => {
  it("provisão anual: valor mensal = provisaoAnual / 12", () => {
    const model = modeloInicial();
    const ipva = model.despesas.find((d) => d.id === "ipva")!;
    const r = resolverDespesa(ipva, MES)!;
    expect(r.valor).toBe(140);
  });

  it("cenário 9: receitas mantêm a quinzena cadastrada, não a do dia em que caem", () => {
    const model = modeloInicial();
    const space30 = resolverReceita(model.receitas.find((r) => r.id === "space30")!, MES)!;
    const otimiza = resolverReceita(model.receitas.find((r) => r.id === "otimiza")!, MES)!;
    const aluguel = resolverReceita(model.receitas.find((r) => r.id === "aluguel")!, MES)!;
    const space15 = resolverReceita(model.receitas.find((r) => r.id === "space15")!, MES)!;
    expect(space30.q).toBe("Q1");
    expect(otimiza.q).toBe("Q1");
    expect(aluguel.q).toBe("Q1");
    expect(space15.q).toBe("Q2"); // dia 15, mas paga a 2ª quinzena
  });

  it("cartões: quinzena vem do vencimento", () => {
    const model = modeloInicial();
    const rafa = resolverCartao(model.cartoes.find((c) => c.id === "cartao_rafa")!, model.parcelas, MES);
    expect(rafa.q).toBe("Q1"); // vence dia 10
  });

  it("cenário 8: editar 'só em setembro' não afeta outubro", () => {
    const model = modeloInicial();
    const agua = model.despesas.find((d) => d.id === "agua")!;
    agua.overrides["2026-09"] = { valor: 350 };
    expect(resolverDespesa(agua, "2026-09")!.valor).toBe(350);
    expect(resolverDespesa(agua, "2026-10")!.valor).toBe(290.4);
  });

  it("cartão: compra avulsa (gasto) soma em cima das parcelas, só naquele mês", () => {
    const model = modeloInicial();
    const rafa = model.cartoes.find((c) => c.id === "cartao_rafa")!;
    const totalSetembro = faturaDoCartao(model.parcelas, "cartao_rafa", "2026-09");
    const gastosSetembro = [{ id: "g1", valor: 85, data: "2026-09-01" }];
    expect(resolverCartao(rafa, model.parcelas, "2026-09", gastosSetembro).valor).toBe(round2(totalSetembro + 85));
    expect(resolverCartao(rafa, model.parcelas, "2026-10").valor).toBe(faturaDoCartao(model.parcelas, "cartao_rafa", "2026-10"));
  });
});

// ---------- parcelamento avulso numa despesa (não é fatura de cartão) ----------

describe("parcelaAtivaNoMes / numeroDaParcela", () => {
  const p = { atual: 1, total: 13, base: "2026-09" };

  it("está ativa no mês-base e nos seguintes, até o total", () => {
    expect(parcelaAtivaNoMes(p, "2026-09")).toBe(true);
    expect(numeroDaParcela(p.base, p.atual, "2026-09")).toBe(1);
    expect(parcelaAtivaNoMes(p, "2026-10")).toBe(true);
    expect(numeroDaParcela(p.base, p.atual, "2026-10")).toBe(2);
    expect(parcelaAtivaNoMes(p, "2027-09")).toBe(true); // 13ª parcela
    expect(numeroDaParcela(p.base, p.atual, "2027-09")).toBe(13);
  });

  it("não está mais ativa depois do total", () => {
    expect(parcelaAtivaNoMes(p, "2027-10")).toBe(false); // seria a 14ª
  });

  it("não está ativa antes do mês-base", () => {
    expect(parcelaAtivaNoMes(p, "2026-08")).toBe(false);
  });

  it("total 9999 nunca acaba (mesmo padrão dos cartões)", () => {
    const recorrente = { atual: 1, total: 9999, base: "2026-09" };
    expect(parcelaAtivaNoMes(recorrente, "2030-01")).toBe(true);
  });
});

describe("resolverDespesa com parcelamento avulso", () => {
  it("aparece com o valor e o número da parcela nos meses ativos", () => {
    const despesa = {
      id: "ipva_financiado",
      nome: "IPVA financiado",
      icone: "🚗",
      valor: 0,
      dia: 10,
      q: "Q1" as const,
      provisaoAnual: null,
      overrides: {},
      apenasMes: null,
      parcelamento: { valor: 140, atual: 1, total: 12, base: "2026-09" },
    };
    const setembro = resolverDespesa(despesa, "2026-09")!;
    expect(setembro.valor).toBe(140);
    expect(setembro.parcelaInfo).toEqual({ atual: 1, total: 12 });

    const outubro = resolverDespesa(despesa, "2026-10")!;
    expect(outubro.parcelaInfo).toEqual({ atual: 2, total: 12 });
  });

  it("some do calendário antes de começar e depois de terminar", () => {
    const despesa = {
      id: "financiamento",
      nome: "Financiamento",
      icone: "📄",
      valor: 0,
      dia: null,
      q: "Q1" as const,
      provisaoAnual: null,
      overrides: {},
      apenasMes: null,
      parcelamento: { valor: 300, atual: 1, total: 3, base: "2026-09" },
    };
    expect(resolverDespesa(despesa, "2026-08")).toBeNull(); // antes de começar
    expect(resolverDespesa(despesa, "2026-09")).not.toBeNull();
    expect(resolverDespesa(despesa, "2026-10")).not.toBeNull();
    expect(resolverDespesa(despesa, "2026-11")).not.toBeNull(); // 3ª e última
    expect(resolverDespesa(despesa, "2026-12")).toBeNull(); // já acabou
  });

  it("um override ainda pode ajustar o valor de uma parcela específica", () => {
    const despesa = {
      id: "financiamento",
      nome: "Financiamento",
      icone: "📄",
      valor: 0,
      dia: null,
      q: "Q1" as const,
      provisaoAnual: null,
      overrides: { "2026-10": { valor: 999 } },
      apenasMes: null,
      parcelamento: { valor: 300, atual: 1, total: 3, base: "2026-09" },
    };
    expect(resolverDespesa(despesa, "2026-09")!.valor).toBe(300);
    expect(resolverDespesa(despesa, "2026-10")!.valor).toBe(999);
  });
});

// ---------- fatura do cartão (parcelamentos) ----------

describe("faturaDoCartao — validação obrigatória (seção 7.4)", () => {
  it("agosto e setembro/2026 = R$ 1.465,26", () => {
    expect(faturaDoCartao(PARCELAS_INICIAIS, "cartao_rafa", "2026-08")).toBe(1465.26);
    expect(faturaDoCartao(PARCELAS_INICIAIS, "cartao_rafa", "2026-09")).toBe(1465.26);
  });
  it("dezembro/2026 = R$ 977,32", () => {
    expect(faturaDoCartao(PARCELAS_INICIAIS, "cartao_rafa", "2026-12")).toBe(977.32);
  });
  it("cronograma completo esperado pela especificação", () => {
    const esperado: [string, number][] = [
      ["2026-08", 1465.26],
      ["2026-09", 1465.26],
      ["2026-10", 1465.26],
      ["2026-11", 1406.92],
      ["2026-12", 977.32],
      ["2027-01", 651.26],
      ["2027-02", 620.96],
      ["2027-03", 620.96],
      ["2027-04", 620.96],
      ["2027-05", 620.96],
      ["2027-06", 323.96],
      ["2027-07", 265.63],
      ["2027-12", 265.63],
    ];
    for (const [mes, valor] of esperado) {
      expect(faturaDoCartao(PARCELAS_INICIAIS, "cartao_rafa", mes)).toBe(valor);
    }
  });
});

// ---------- custo do Aristides ----------

describe("custoIA", () => {
  it("aplica a fórmula da seção 6.4 (Sonnet US$3/US$15 por milhão, câmbio 5,4)", () => {
    expect(custoIA(1000, 500)).toBe(0.0567);
  });
  it("zero tokens → custo zero", () => {
    expect(custoIA(0, 0)).toBe(0);
  });
});

// ---------- gastoTotal / estadoDe ----------

describe("gastoTotal e estadoDe", () => {
  it("soma os gastos parciais", () => {
    expect(gastoTotal([{ id: "1", valor: 350, data: "2026-09-01" }, { id: "2", valor: 800, data: "2026-09-10" }])).toBe(1150);
  });
  it("estadoDe: aberto, separado, pago", () => {
    expect(estadoDe(estado({}))).toBe("aberto");
    expect(estadoDe(estado({ separado: 100 }))).toBe("separado");
    expect(estadoDe(estado({ separado: 100, pago: 100 }))).toBe("pago");
  });
});

// ---------- avisos (cenário 7) ----------

describe("calcularAvisos — cenário 7", () => {
  const itens = [{ id: "iptu", nome: "IPTU", icone: "🏛️", dia: 8 }];

  it("dispensar 'vence em 3 dias' não impede 'venceu há 1 dia' depois", () => {
    const hojeAntes = new Date(2026, 8, 5); // dia 5, IPTU vence dia 8 → em 3 dias
    const antes = calcularAvisos(itens, {}, [], MES, hojeAntes);
    expect(antes).toHaveLength(1);
    expect(antes[0].chave).toBe("2026-09|iptu|avencer");

    const dispensados = [antes[0].chave];
    const hojeDepois = new Date(2026, 8, 9); // dia 9, IPTU venceu há 1 dia
    const depois = calcularAvisos(itens, {}, dispensados, MES, hojeDepois);
    expect(depois).toHaveLength(1);
    expect(depois[0].chave).toBe("2026-09|iptu|vencido");
  });

  it("conta paga não gera aviso", () => {
    const hoje = new Date(2026, 8, 9);
    const pagos = calcularAvisos(itens, { iptu: { pago: 194.43 } }, [], MES, hoje);
    expect(pagos).toHaveLength(0);
  });

  it("sem data de vencimento não gera aviso", () => {
    const semData = [{ id: "lazer", nome: "Lazer", icone: "🎉", dia: null }];
    expect(calcularAvisos(semData, {}, [], MES, new Date(2026, 8, 9))).toHaveLength(0);
  });
});

// ---------- ZUL ----------

describe("caixinhas ZUL — cenário 5", () => {
  it("recarga soma o disponível ao saldo; gasto subtrai; saldo atravessa meses", () => {
    const mov: CaixinhaMov[] = [
      { id: "1", tipo: "recarga", disponivel: 30, custo: 34.5, tarifa: 4.5, data: "2026-09-01", mes: "2026-09" },
      { id: "2", tipo: "gasto", valor: 12.4, data: "2026-09-05", mes: "2026-09" },
    ];
    expect(saldoCaixinha(mov)).toBe(17.6);
  });
});

// ---------- os 9 cenários da seção 8, na íntegra, via calcularLivre ----------

describe("seção 8 — cenários obrigatórios", () => {
  it("cenário 1: mês zerado → livre = R$ 0,00", () => {
    const model = modeloInicial();
    const r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(0);
  });

  // O dízimo (seção 4.5) não desconta mais o livre sozinho ao confirmar o
  // recebimento — só quando a devolução é de fato registrada (ver describe
  // "dízimo — devolução manual" mais abaixo). Mudança pedida explicitamente
  // pelo usuário: a responsabilidade de separar e devolver é dele, não do
  // app presumir por ele.
  it("cenário 2: receita confirmada (Space 4500) → livre 4500 (dízimo não desconta sozinho)", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    const r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(4500);
  });

  it("cenário 3: caixinha do mercado — separar e gastar parcial não muda o livre", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    setEstado(model, MES, "mercado_q1", { separado: 1000 });
    let r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(3500);
    expect(r.separado).toBe(1000);

    setEstado(model, MES, "mercado_q1", {
      separado: 1000,
      gastos: [{ id: "g1", valor: 350, data: "2026-09-05" }],
    });
    r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(3500); // não muda
    expect(r.separado).toBe(650); // ainda reservado
    expect(r.pago).toBe(350); // já saiu da caixinha
  });

  it("cenário 4: estouro — gasta mais que o separado, desconta a diferença do livre na hora", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    setEstado(model, MES, "mercado_q1", {
      separado: 1000,
      gastos: [
        { id: "g1", valor: 350, data: "2026-09-05" },
        { id: "g2", valor: 800, data: "2026-09-10" },
      ],
    });
    const r = calcularLivre(model, MES, HOJE);
    expect(r.estouro).toBe(150);
    expect(r.livre).toBe(3350);
  });

  it("cenário 5: ZUL — recarga desconta do livre, gasto não; saldo atravessa o mês", () => {
    const model = modeloInicial();
    model.caixinhas.tag.mov.push({
      id: "r1",
      tipo: "recarga",
      disponivel: 30,
      custo: 34.5,
      tarifa: 4.5,
      data: "2026-09-01",
      mes: MES,
    });
    let r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(-34.5);
    expect(saldoCaixinha(model.caixinhas.tag.mov)).toBe(30);

    model.caixinhas.tag.mov.push({ id: "g1", tipo: "gasto", valor: 12.4, data: "2026-09-10", mes: MES });
    r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(-34.5); // gasto não mexe no livre do mês
    expect(saldoCaixinha(model.caixinhas.tag.mov)).toBe(17.6);

    // vira o mês: saldo continua, e outubro não é afetado pela recarga de setembro
    const outubro = calcularLivre(model, "2026-10", HOJE);
    expect(outubro.gastoZulMes).toBe(0);
    expect(saldoCaixinha(model.caixinhas.tag.mov)).toBe(17.6);
  });

  it("cenário 6: fatura do cartão em aberto não desconta do livre", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    const antes = calcularLivre(model, MES, HOJE);
    const cartaoRafa = resolverCartao(model.cartoes.find((c) => c.id === "cartao_rafa")!, model.parcelas, MES);
    expect(cartaoRafa.valor).toBe(1465.26);
    expect(cartaoRafa.q).toBe("Q1"); // vence dia 10
    expect(antes.cartoesLancados).toBe(0); // em aberto, não desconta
  });

  it("cenário 8 (repetido via calcularLivre): escopo do override não vaza pro mês seguinte", () => {
    const model = modeloInicial();
    const agua = model.despesas.find((d) => d.id === "agua")!;
    agua.overrides["2026-09"] = { valor: 350 };
    expect(resolverDespesa(agua, "2026-09")!.valor).toBe(350);
    expect(resolverDespesa(agua, "2026-10")!.valor).toBe(290.4);
  });

  it("cenário 9 (repetido): Space dia 15 na 2ª quinzena; dia 30, Otimiza e aluguel na 1ª", () => {
    const model = modeloInicial();
    const q = (id: string) => resolverReceita(model.receitas.find((r) => r.id === id)!, MES)!.q;
    expect(q("space30")).toBe("Q1");
    expect(q("otimiza")).toBe("Q1");
    expect(q("aluguel")).toBe("Q1");
    expect(q("space15")).toBe("Q2");
  });
});

// ---------- saldo entre meses (seção 4.11) ----------

describe("saldo entre meses", () => {
  it("sem histórico do mês anterior, usa config.saldoInicial", () => {
    const model = modeloInicial();
    model.config.saldoInicial = 200;
    const r = calcularLivre(model, MES, HOJE);
    expect(r.saldoInicial).toBe(200);
    expect(r.livre).toBe(200);
  });

  it("com histórico, o livre do mês anterior passa para o saldo inicial do mês seguinte", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    const setembro = calcularLivre(model, MES, HOJE);
    const outubro = calcularLivre(model, "2026-10", HOJE);
    expect(outubro.saldoInicial).toBe(setembro.livre);
  });
});

// ---------- livre: todos os componentes juntos ----------

describe("calcularLivre — todos os componentes somando corretamente", () => {
  it("recebido, pago, separado, estouro, devolvido, ZUL e cartões", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 }); // dízimo não desconta sozinho — só quando devolvido
    setEstado(model, MES, "energia", { pago: 700 }); // pago
    setEstado(model, MES, "iptu", { separado: 194.43 }); // separado, sem gasto
    setEstado(model, MES, "mercado_q1", {
      separado: 1000,
      gastos: [{ id: "g1", valor: 1200, data: "2026-09-05" }], // estouro de 200
    });
    setEstado(model, MES, "cartao_rafa", { separado: 1465.26 }); // cartão separado
    model.caixinhas.tag.mov.push({ id: "r1", tipo: "recarga", disponivel: 30, custo: 34.5, data: "2026-09-01", mes: MES });

    const r = calcularLivre(model, MES, HOJE);

    expect(r.recebido).toBe(4500);
    expect(r.pagoBruto).toBe(700);
    expect(r.pago).toBe(700 + 1000); // energia paga + mercado todo consumido da caixinha (min(gasto,separado))
    expect(r.separado).toBe(194.43 + 1465.26); // iptu (sem gasto) + cartão; mercado zerou (gastou tudo e mais)
    expect(r.estouro).toBe(200);
    expect(r.gastoZulMes).toBe(34.5);
    expect(r.cartoesLancados).toBe(1465.26);

    const esperado = round2(
      0 + 4500 - 700 - (194.43 + 1465.26) - 1000 - 200 - 0 - 34.5 - 1465.26,
    );
    expect(r.livre).toBe(esperado);
  });
});
