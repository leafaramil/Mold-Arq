// Fase 4 — validação dos 9 cenários obrigatórios da seção 8 da
// especificação, cada um no seu próprio teste, com os valores exatos
// citados no documento. Este arquivo é o "portão de qualidade" da fase:
// se qualquer um destes falhar, a lógica de negócio tem um erro e o
// projeto não deve avançar para a fase seguinte.
import { describe, expect, it } from "vitest";
import { calcularAvisos, calcularLivre, resolverCartao, resolverDespesa, resolverReceita } from "../src/lib/calc";
import type { DataModel, EstadoItem } from "../src/lib/types";
import { ESTADO_VAZIO } from "../src/lib/types";
import { modeloInicial } from "./fixtures";

const MES = "2026-09"; // setembro/2026 — primeiro mês de uso (seção 9)
const HOJE = new Date(2026, 8, 1);

function setEstado(model: DataModel, mes: string, itemId: string, patch: Partial<EstadoItem>) {
  model.estados[mes] = model.estados[mes] || {};
  model.estados[mes][itemId] = { ...(model.estados[mes][itemId] ?? ESTADO_VAZIO), ...patch };
}

describe("Cenário 1 — mês zerado", () => {
  it("setembro/2026, nada confirmado → livre = R$ 0,00", () => {
    const model = modeloInicial();
    const r = calcularLivre(model, MES, HOJE);
    expect(r.livre).toBe(0);
  });
});

describe("Cenário 2 — receita confirmada", () => {
  it("confirma Space dia 30 (R$4.500) → dízimo R$399,50; livre = R$4.100,50", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    const r = calcularLivre(model, MES, HOJE);
    expect(r.dizimoAberto).toBe(399.5);
    expect(r.livre).toBe(4100.5);
  });
});

describe("Cenário 3 — caixinha do mercado", () => {
  it("separa R$1.000 → livre R$3.100,50; separado R$1.000. Gasta R$350 pelo ＋ → livre não muda", () => {
    const model = modeloInicial();
    setEstado(model, MES, "space30", { recebido: 4500 });
    setEstado(model, MES, "mercado_q1", { separado: 1000 });

    const antes = calcularLivre(model, MES, HOJE);
    expect(antes.livre).toBe(3100.5);
    expect(antes.separado).toBe(1000);

    setEstado(model, MES, "mercado_q1", { separado: 1000, gastos: [{ id: "g1", valor: 350, data: "2026-09-05" }] });
    const depois = calcularLivre(model, MES, HOJE);
    expect(depois.livre).toBe(3100.5); // livre não muda
    expect(depois.separado).toBe(650); // separado = R$650
    expect(depois.pago).toBe(350); // pago = R$350
  });
});

describe("Cenário 4 — estouro", () => {
  it("gasta mais R$800 (total R$1.150) → estouro de R$150 → livre cai para R$2.950,50", () => {
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
    expect(r.livre).toBe(2950.5);
    // a quinzena seguinte não é afetada: outubro parte do livre de setembro, sem estouro adicional
    const outubro = calcularLivre(model, "2026-10", HOJE);
    expect(outubro.estouro).toBe(0);
  });
});

describe("Cenário 5 — ZUL", () => {
  it("recarrega Tag na faixa de R$30 (paga R$34,50) → saldo R$30. Gasta R$12,40 → saldo R$17,60. Vira o mês → saldo continua", () => {
    const model = modeloInicial();
    model.caixinhas.tag.mov.push({ id: "r1", tipo: "recarga", disponivel: 30, custo: 34.5, tarifa: 4.5, data: "2026-09-01", mes: MES });
    const antes = calcularLivre(model, MES, HOJE);
    expect(antes.livre).toBe(-34.5);
    expect(antes.gastoZulMes).toBe(34.5);

    model.caixinhas.tag.mov.push({ id: "g1", tipo: "gasto", valor: 12.4, data: "2026-09-05", mes: MES });
    const depois = calcularLivre(model, MES, HOJE);
    expect(depois.livre).toBe(-34.5); // gasto não mexe no livre

    const outubro = calcularLivre(model, "2026-10", HOJE);
    expect(outubro.gastoZulMes).toBe(0); // outubro não tem recarga própria
    expect(outubro.saldoInicial).toBe(depois.livre); // saldo do mês passa para o seguinte
  });
});

describe("Cenário 6 — cartões", () => {
  it("fatura do Cartão Rafa em setembro/2026 = R$1.465,26, vence dia 10 (1ª quinzena), aberta, sem descontar do livre", () => {
    const model = modeloInicial();
    const cartaoRafa = resolverCartao(model.cartoes.find((c) => c.id === "cartao_rafa")!, model.parcelas, MES);
    expect(cartaoRafa.valor).toBe(1465.26);
    expect(cartaoRafa.q).toBe("Q1");

    const r = calcularLivre(model, MES, HOJE);
    expect(r.cartoesLancados).toBe(0);
  });
});

describe("Cenário 7 — avisos", () => {
  it("dispensar 'IPTU vence em 3 dias' não impede que 'IPTU venceu há 1 dia' apareça depois", () => {
    const itens = [{ id: "iptu", nome: "IPTU", icone: "🏛️", dia: 8 }];

    const hojeAntes = new Date(2026, 8, 5); // dia 5 — IPTU vence dia 8, em 3 dias
    const avisosAntes = calcularAvisos(itens, {}, [], MES, hojeAntes);
    expect(avisosAntes).toHaveLength(1);
    const chaveAvencer = avisosAntes[0].chave;
    expect(chaveAvencer).toBe("2026-09|iptu|avencer");

    const hojeDepois = new Date(2026, 8, 9); // dia 9 — IPTU venceu há 1 dia
    const avisosDepois = calcularAvisos(itens, {}, [chaveAvencer], MES, hojeDepois);
    expect(avisosDepois).toHaveLength(1); // não foi bloqueado pela dispensa anterior
    expect(avisosDepois[0].chave).toBe("2026-09|iptu|vencido");
  });
});

describe("Cenário 8 — escopo", () => {
  it("editar a água 'só em setembro' → outubro mantém o valor original", () => {
    const model = modeloInicial();
    const agua = model.despesas.find((d) => d.id === "agua")!;
    agua.overrides["2026-09"] = { valor: 350 };
    expect(resolverDespesa(agua, "2026-09")!.valor).toBe(350);
    expect(resolverDespesa(agua, "2026-10")!.valor).toBe(290.4);
  });
});

describe("Cenário 9 — receitas e quinzenas", () => {
  it("Space dia 15 na 2ª quinzena; Space dia 30, Otimiza e aluguel na 1ª", () => {
    const model = modeloInicial();
    const q = (id: string) => resolverReceita(model.receitas.find((r) => r.id === id)!, MES)!.q;
    expect(q("space30")).toBe("Q1");
    expect(q("otimiza")).toBe("Q1");
    expect(q("aluguel")).toBe("Q1");
    expect(q("space15")).toBe("Q2");
  });
});
