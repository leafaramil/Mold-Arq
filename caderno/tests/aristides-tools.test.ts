// O Aristides como agente (seção 6, versão com tool use): cada ferramenta
// que a Anthropic pode propor precisa virar a Action certa, com os campos
// computados (reservaPct, faixa do ZUL, base da parcela) corretos — porque
// o app confia nessa tradução para decidir o que mostrar na confirmação e
// o que gravar quando o usuário confirmar.
import { describe, expect, it } from "vitest";
import { propostaParaAcao } from "../src/lib/aristides-tools";
import { modeloInicial } from "./fixtures";

const MES = "2026-09";

describe("propostaParaAcao", () => {
  it("separar: monta a Action e uma descrição legível com o nome do item", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("separar", { itemId: "mercado_q1", mes: MES, valor: 1000 }, model, MES);
    expect("erro" in r).toBe(false);
    if ("erro" in r) return;
    expect(r.acao).toEqual({ type: "separar", itemId: "mercado_q1", mes: MES, valor: 1000 });
    expect(r.descricao).toContain("Mercado");
    expect(r.descricao).toContain("1.000,00");
  });

  it("confirmar_recebimento: aplica reservaPct só se a receita tiver reserva ativada", () => {
    const model = modeloInicial();
    const semReserva = propostaParaAcao("confirmar_recebimento", { receitaId: "space30", mes: MES, valor: 4500 }, model, MES);
    if ("erro" in semReserva) throw new Error("não deveria dar erro");
    expect(semReserva.acao).toMatchObject({ type: "receber", reservaPct: null });

    model.receitas.find((r) => r.id === "space30")!.reserva = true;
    const comReserva = propostaParaAcao("confirmar_recebimento", { receitaId: "space30", mes: MES, valor: 4500 }, model, MES);
    if ("erro" in comReserva) throw new Error("não deveria dar erro");
    expect(comReserva.acao).toMatchObject({ type: "receber", reservaPct: 5 });
  });

  it("recarregar_zul: converte o disponível na faixa oficial (custo e tarifa)", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("recarregar_zul", { chave: "tag", mes: MES, disponivel: 30 }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao).toMatchObject({ type: "recarregarCaixinha", chave: "tag", disponivel: 30, custo: 34.5, tarifa: 4.5 });
  });

  it("recarregar_zul: valor fora das faixas oficiais dá erro, não inventa tarifa", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("recarregar_zul", { chave: "tag", mes: MES, disponivel: 37 }, model, MES);
    expect("erro" in r).toBe(true);
  });

  it("adicionar_despesa: sem parcelamento vira uma despesa normal", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("adicionar_despesa", { nome: "Curso de inglês", valor: 250 }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao.type).toBe("addDespesa");
    if (r.acao.type !== "addDespesa") return;
    expect(r.acao.dados.parcelamento).toBeUndefined();
    expect(r.acao.dados.valor).toBe(250);
  });

  it("adicionar_despesa: com parcelasTotal vira uma despesa com parcelamento avulso", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("adicionar_despesa", { nome: "IPVA financiado", valor: 140, parcelasTotal: 13 }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao.type).toBe("addDespesa");
    if (r.acao.type !== "addDespesa") return;
    expect(r.acao.dados.parcelamento).toEqual({ valor: 140, atual: 1, total: 13, base: MES });
    expect(r.descricao).toContain("1/13");
  });

  it("adicionar_receita: sem dizimo informado, assume true (comportamento antigo)", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("adicionar_receita", { nome: "Freela", valor: 500, q: "Q1" }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao.type).toBe("addReceita");
    if (r.acao.type !== "addReceita") return;
    expect(r.acao.dados.dizimo).toBe(true);
  });

  it("adicionar_receita: dizimo false para algo como devolução de empréstimo", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("adicionar_receita", { nome: "Empréstimo devolvido", valor: 100, q: "Q1", dizimo: false }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao.type).toBe("addReceita");
    if (r.acao.type !== "addReceita") return;
    expect(r.acao.dados.dizimo).toBe(false);
  });

  it("adicionar_parcela_cartao: calcula a base a partir do fechamento do cartão", () => {
    const model = modeloInicial(); // cartao_rafa fecha dia 3
    const antesDoFechamento = propostaParaAcao("adicionar_parcela_cartao", { cartaoId: "cartao_rafa", desc: "Notebook", parcela: 200, atual: 1, total: 10, diaCompra: 2 }, model, MES);
    if ("erro" in antesDoFechamento) throw new Error("não deveria dar erro");
    expect(antesDoFechamento.acao).toMatchObject({ type: "addParcela", base: "2026-09" });

    const depoisDoFechamento = propostaParaAcao("adicionar_parcela_cartao", { cartaoId: "cartao_rafa", desc: "Notebook", parcela: 200, atual: 1, total: 10, diaCompra: 20 }, model, MES);
    if ("erro" in depoisDoFechamento) throw new Error("não deveria dar erro");
    expect(depoisDoFechamento.acao).toMatchObject({ type: "addParcela", base: "2026-10" });
  });

  it("atualizar_configuracao: converte o tipo certo por campo", () => {
    const model = modeloInicial();
    const pct = propostaParaAcao("atualizar_configuracao", { campo: "reservaPct", valor: 10 }, model, MES);
    if ("erro" in pct) throw new Error("não deveria dar erro");
    expect(pct.acao).toMatchObject({ type: "updateConfig", campo: "reservaPct", valor: 10 });

    const nomeAssistente = propostaParaAcao("atualizar_configuracao", { campo: "assistente", valor: "Aristóteles" }, model, MES);
    if ("erro" in nomeAssistente) throw new Error("não deveria dar erro");
    expect(nomeAssistente.acao).toMatchObject({ type: "updateConfig", campo: "assistente", valor: "Aristóteles" });
  });

  it("retirar_poupanca: sempre grava valor negativo, mesmo se vier positivo", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("retirar_poupanca", { pote: "emergencia", desc: "conserto do carro", valor: 300 }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao).toMatchObject({ type: "retirarPote", pote: "emergencia", valor: -300 });
  });

  it("remover_parcelamento: limpa o parcelamento da despesa", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("remover_parcelamento", { despesaId: "ipva" }, model, MES);
    if ("erro" in r) throw new Error("não deveria dar erro");
    expect(r.acao).toEqual({ type: "definirParcelamento", despesaId: "ipva", parcelamento: null });
  });

  it("ferramenta desconhecida dá erro em vez de quebrar", () => {
    const model = modeloInicial();
    const r = propostaParaAcao("ferramenta_que_nao_existe", {}, model, MES);
    expect("erro" in r).toBe(true);
  });
});
