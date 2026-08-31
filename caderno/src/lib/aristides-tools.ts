// O Aristides como agente: cada ação que o app sabe fazer vira uma
// "ferramenta" que a API da Anthropic pode propor usar. O modelo NUNCA
// executa nada sozinho — ele só devolve o nome da ferramenta e os
// parâmetros; este arquivo traduz isso numa Action de verdade (mesma Action
// que o resto do app já usa) e numa frase legível, para o usuário confirmar
// antes de qualquer coisa ser gravada (seção 6.1: "sempre pede confirmação
// antes de gravar").
//
// Ficam de fora só duas ações que não fazem sentido como pedido em
// linguagem natural: dispensar aviso (é um "x" de tela) e registrar consumo
// de IA (é contabilidade interna, não algo que o usuário pede).
import { FAIXAS_TAG, FAIXAS_ZONA, mesDaPrimeiraParcela } from "./calc";
import { fmt, hojeISO, uid } from "./format";
import type { Action } from "./action-types";
import type { DataModel } from "./types";

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const CAMPOS_ESTADO = ["pago", "separado", "recebido", "devolvido"] as const;
const CAMPOS_CONFIG = ["reservaPct", "saldoInicial", "assistente", "vozAtiva"] as const;

export const ARISTIDES_TOOLS: AnthropicTool[] = [
  {
    name: "separar",
    description: "Separa dinheiro numa caixinha para uma despesa ou cartão específico, esperando a fatura chegar.",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string" }, mes: { type: "string", description: "AAAA-MM" }, valor: { type: "number" } },
      required: ["itemId", "mes", "valor"],
    },
  },
  {
    name: "desfazer_separar",
    description: "Desfaz a separação de uma despesa ou cartão, voltando ela para 'em aberto'.",
    input_schema: { type: "object", properties: { itemId: { type: "string" }, mes: { type: "string" } }, required: ["itemId", "mes"] },
  },
  {
    name: "pagar",
    description: "Marca uma despesa ou cartão como pago, com o valor real.",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string" }, mes: { type: "string" }, valor: { type: "number" } },
      required: ["itemId", "mes", "valor"],
    },
  },
  {
    name: "desfazer_pagar",
    description: "Desfaz o pagamento de uma despesa ou cartão, voltando ela para 'em aberto'.",
    input_schema: { type: "object", properties: { itemId: { type: "string" }, mes: { type: "string" } }, required: ["itemId", "mes"] },
  },
  {
    name: "confirmar_recebimento",
    description: "Confirma que uma receita caiu na conta, com o valor real recebido.",
    input_schema: {
      type: "object",
      properties: { receitaId: { type: "string" }, mes: { type: "string" }, valor: { type: "number" } },
      required: ["receitaId", "mes", "valor"],
    },
  },
  {
    name: "desfazer_recebimento",
    description: "Desfaz a confirmação de recebimento de uma receita.",
    input_schema: { type: "object", properties: { receitaId: { type: "string" }, mes: { type: "string" } }, required: ["receitaId", "mes"] },
  },
  {
    name: "devolver_dizimo",
    description: "Registra a devolução (pagamento) do dízimo de uma receita já recebida.",
    input_schema: {
      type: "object",
      properties: { receitaId: { type: "string" }, mes: { type: "string" }, valor: { type: "number" } },
      required: ["receitaId", "mes", "valor"],
    },
  },
  {
    name: "desfazer_devolucao_dizimo",
    description: "Desfaz a devolução do dízimo de uma receita.",
    input_schema: { type: "object", properties: { receitaId: { type: "string" }, mes: { type: "string" } }, required: ["receitaId", "mes"] },
  },
  {
    name: "registrar_gasto",
    description: "Registra um gasto parcial dentro de uma caixinha já separada (ex: gastou parte do mercado).",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string" }, mes: { type: "string" }, valor: { type: "number" } },
      required: ["itemId", "mes", "valor"],
    },
  },
  {
    name: "remover_gasto",
    description: "Remove um gasto parcial já lançado numa caixinha (use o gastoId do índice de dados).",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string" }, mes: { type: "string" }, gastoId: { type: "string" } },
      required: ["itemId", "mes", "gastoId"],
    },
  },
  {
    name: "fechar_caixinha",
    description: "Fecha uma caixinha de despesa e dá baixa: soma os gastos parciais e marca como pago.",
    input_schema: { type: "object", properties: { itemId: { type: "string" }, mes: { type: "string" } }, required: ["itemId", "mes"] },
  },
  {
    name: "corrigir_estado",
    description: "Corrige o valor de um estado já registrado (pago, separado, recebido ou devolvido) — não muda a previsão, só o fato já consumado.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        mes: { type: "string" },
        campo: { type: "string", enum: CAMPOS_ESTADO as unknown as string[] },
        valor: { type: "number" },
      },
      required: ["itemId", "mes", "campo", "valor"],
    },
  },
  {
    name: "recarregar_zul",
    description:
      "Recarrega uma caixinha ZUL (tag de pedágio ou Zona Azul). O valor disponível precisa ser uma das faixas oficiais: " +
      `Tag: ${FAIXAS_TAG.map((f) => fmt(f.disponivel)).join(", ")}. Zona Azul: ${FAIXAS_ZONA.map((f) => fmt(f.disponivel)).join(", ")}.`,
    input_schema: {
      type: "object",
      properties: { chave: { type: "string", enum: ["tag", "zona"] }, mes: { type: "string" }, disponivel: { type: "number" } },
      required: ["chave", "mes", "disponivel"],
    },
  },
  {
    name: "gastar_zul",
    description: "Registra um gasto (pedágio ou estacionamento) descontando do saldo já disponível na caixinha ZUL.",
    input_schema: {
      type: "object",
      properties: { chave: { type: "string", enum: ["tag", "zona"] }, mes: { type: "string" }, valor: { type: "number" } },
      required: ["chave", "mes", "valor"],
    },
  },
  {
    name: "remover_movimentacao_zul",
    description: "Remove uma movimentação (recarga ou gasto) do extrato de uma caixinha ZUL (use o movId do índice de dados).",
    input_schema: { type: "object", properties: { chave: { type: "string", enum: ["tag", "zona"] }, movId: { type: "string" } }, required: ["chave", "movId"] },
  },
  {
    name: "editar_valor_previsto",
    description: "Ajusta o valor previsto de uma despesa ou receita — a previsão, não um estado já pago/recebido.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["despesa", "receita"] },
        itemId: { type: "string" },
        mes: { type: "string" },
        valor: { type: "number" },
        soNesseMes: { type: "boolean", description: "true = só vale neste mês; false = muda o valor base para sempre" },
      },
      required: ["tipo", "itemId", "mes", "valor", "soNesseMes"],
    },
  },
  {
    name: "remover_item",
    description: "Remove uma despesa ou receita (do mês atual, ou de todos os meses).",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["despesa", "receita"] },
        itemId: { type: "string" },
        mes: { type: "string" },
        soNesseMes: { type: "boolean" },
      },
      required: ["tipo", "itemId", "mes", "soNesseMes"],
    },
  },
  {
    name: "adicionar_despesa",
    description: "Cadastra uma despesa nova. Se for paga em várias vezes (financiamento, boleto parcelado — não cartão), preencha o parcelamento.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        valor: { type: "number", description: "valor mensal, ou valor de cada parcela se for parcelado" },
        dia: { type: "number", description: "dia do vencimento, se houver" },
        parcelasTotal: { type: "number", description: "só se for parcelado: quantas parcelas ao todo" },
        parcelaAtual: { type: "number", description: "só se for parcelado: qual parcela é essa agora (padrão 1)" },
      },
      required: ["nome", "valor"],
    },
  },
  {
    name: "definir_parcelamento",
    description: "Marca uma despesa já existente como parcelada (ou corrige o parcelamento dela).",
    input_schema: {
      type: "object",
      properties: { despesaId: { type: "string" }, valor: { type: "number" }, atual: { type: "number" }, total: { type: "number" } },
      required: ["despesaId", "valor", "atual", "total"],
    },
  },
  {
    name: "remover_parcelamento",
    description: "Remove o parcelamento de uma despesa, voltando ela a ser uma despesa normal (mensal fixa).",
    input_schema: { type: "object", properties: { despesaId: { type: "string" } }, required: ["despesaId"] },
  },
  {
    name: "adicionar_receita",
    description: "Cadastra uma receita nova.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        valor: { type: "number" },
        dia: { type: "number" },
        quando: { type: "string", description: "texto livre, ex: 'dia 30 do mês anterior'" },
        q: { type: "string", enum: ["Q1", "Q2"], description: "quinzena que essa receita PAGA (não a data em que cai)" },
      },
      required: ["nome", "valor", "q"],
    },
  },
  {
    name: "alternar_receita",
    description: "Ativa/pausa uma receita, ou liga/desliga a reserva automática dela.",
    input_schema: {
      type: "object",
      properties: { receitaId: { type: "string" }, campo: { type: "string", enum: ["ativa", "reserva"] } },
      required: ["receitaId", "campo"],
    },
  },
  {
    name: "atualizar_configuracao",
    description: "Muda uma configuração geral do app.",
    input_schema: {
      type: "object",
      properties: {
        campo: { type: "string", enum: CAMPOS_CONFIG as unknown as string[] },
        valor: { description: "número para reservaPct/saldoInicial, texto para assistente, true/false para vozAtiva" },
      },
      required: ["campo", "valor"],
    },
  },
  {
    name: "atualizar_cartao",
    description: "Muda o dia de fechamento ou vencimento de um cartão.",
    input_schema: {
      type: "object",
      properties: { cartaoId: { type: "string" }, campo: { type: "string", enum: ["fechamento", "vencimento"] }, valor: { type: "number" } },
      required: ["cartaoId", "campo", "valor"],
    },
  },
  {
    name: "adicionar_parcela_cartao",
    description: "Lança uma compra parcelada num cartão de crédito.",
    input_schema: {
      type: "object",
      properties: {
        cartaoId: { type: "string" },
        desc: { type: "string" },
        parcela: { type: "number" },
        atual: { type: "number" },
        total: { type: "number", description: "9999 para assinatura recorrente sem fim" },
        diaCompra: { type: "number" },
      },
      required: ["cartaoId", "desc", "parcela", "atual", "total", "diaCompra"],
    },
  },
  {
    name: "remover_parcela_cartao",
    description: "Remove um lançamento parcelado de um cartão (use o parcelaId do índice de dados).",
    input_schema: { type: "object", properties: { parcelaId: { type: "string" } }, required: ["parcelaId"] },
  },
  {
    name: "retirar_poupanca",
    description: "Registra uma retirada de um dos potes de poupança (emergência ou folga), com o motivo.",
    input_schema: {
      type: "object",
      properties: { pote: { type: "string", enum: ["emergencia", "folga"] }, desc: { type: "string" }, valor: { type: "number" } },
      required: ["pote", "desc", "valor"],
    },
  },
  {
    name: "definir_saldo_inicial_zul",
    description: "Define o saldo inicial de uma caixinha ZUL (para configuração inicial, seção 9), com o valor real que já existe hoje.",
    input_schema: {
      type: "object",
      properties: { chave: { type: "string", enum: ["tag", "zona"] }, saldo: { type: "number" } },
      required: ["chave", "saldo"],
    },
  },
];

type Input = Record<string, unknown>;
const num = (input: Input, campo: string): number => Number(input[campo]);
const str = (input: Input, campo: string): string => String(input[campo] ?? "");
const bool = (input: Input, campo: string, padrao = false): boolean => (typeof input[campo] === "boolean" ? (input[campo] as boolean) : padrao);

function nomeDoItem(model: DataModel, itemId: string): string {
  return (
    model.despesas.find((d) => d.id === itemId)?.nome ??
    model.receitas.find((r) => r.id === itemId)?.nome ??
    model.cartoes.find((c) => c.id === itemId)?.nome ??
    itemId
  );
}

export interface PropostaAcao {
  acao: Action;
  descricao: string;
}

/**
 * Traduz a ferramenta que a Anthropic propôs usar numa Action de verdade
 * (a mesma que o resto do app despacha) e numa frase pra confirmar. Nunca
 * executa nada sozinho — só monta a proposta.
 */
export function propostaParaAcao(nomeFerramenta: string, input: Input, model: DataModel, mesAtual: string): PropostaAcao | { erro: string } {
  const mes = (input.mes as string) || mesAtual;
  const hoje = hojeISO(new Date());

  switch (nomeFerramenta) {
    case "separar":
      return { acao: { type: "separar", itemId: str(input, "itemId"), mes, valor: num(input, "valor") }, descricao: `Separar ${fmt(num(input, "valor"))} para ${nomeDoItem(model, str(input, "itemId"))}` };
    case "desfazer_separar":
      return { acao: { type: "desSeparar", itemId: str(input, "itemId"), mes }, descricao: `Desfazer a separação de ${nomeDoItem(model, str(input, "itemId"))}` };
    case "pagar":
      return { acao: { type: "pagar", itemId: str(input, "itemId"), mes, valor: num(input, "valor") }, descricao: `Pagar ${nomeDoItem(model, str(input, "itemId"))} — ${fmt(num(input, "valor"))}` };
    case "desfazer_pagar":
      return { acao: { type: "desPagar", itemId: str(input, "itemId"), mes }, descricao: `Desfazer o pagamento de ${nomeDoItem(model, str(input, "itemId"))}` };
    case "confirmar_recebimento": {
      const receita = model.receitas.find((r) => r.id === str(input, "receitaId"));
      return {
        acao: { type: "receber", receitaId: str(input, "receitaId"), mes, valor: num(input, "valor"), reservaPct: receita?.reserva ? model.config.reservaPct : null },
        descricao: `Confirmar recebimento de ${nomeDoItem(model, str(input, "receitaId"))} — ${fmt(num(input, "valor"))}`,
      };
    }
    case "desfazer_recebimento":
      return { acao: { type: "desfazerRecebimento", receitaId: str(input, "receitaId"), mes }, descricao: `Desfazer o recebimento de ${nomeDoItem(model, str(input, "receitaId"))}` };
    case "devolver_dizimo":
      return { acao: { type: "devolver", receitaId: str(input, "receitaId"), mes, valor: num(input, "valor") }, descricao: `Devolver o dízimo de ${nomeDoItem(model, str(input, "receitaId"))} — ${fmt(num(input, "valor"))}` };
    case "desfazer_devolucao_dizimo":
      return { acao: { type: "desfazerDevolucao", receitaId: str(input, "receitaId"), mes }, descricao: `Desfazer a devolução do dízimo de ${nomeDoItem(model, str(input, "receitaId"))}` };
    case "registrar_gasto":
      return {
        acao: { type: "addGasto", itemId: str(input, "itemId"), mes, valor: num(input, "valor"), data: hoje, gastoId: uid() },
        descricao: `Registrar gasto de ${fmt(num(input, "valor"))} em ${nomeDoItem(model, str(input, "itemId"))}`,
      };
    case "remover_gasto":
      return { acao: { type: "delGasto", itemId: str(input, "itemId"), mes, gastoId: str(input, "gastoId") }, descricao: `Remover um gasto lançado em ${nomeDoItem(model, str(input, "itemId"))}` };
    case "fechar_caixinha":
      return { acao: { type: "fecharCaixinha", itemId: str(input, "itemId"), mes }, descricao: `Fechar a caixinha de ${nomeDoItem(model, str(input, "itemId"))} e dar baixa` };
    case "corrigir_estado": {
      const campo = str(input, "campo");
      if (!CAMPOS_ESTADO.includes(campo as (typeof CAMPOS_ESTADO)[number])) return { erro: `campo inválido: ${campo}` };
      return {
        acao: { type: "editarEstado", itemId: str(input, "itemId"), mes, campo: campo as (typeof CAMPOS_ESTADO)[number], valor: num(input, "valor") },
        descricao: `Corrigir o ${campo} de ${nomeDoItem(model, str(input, "itemId"))} para ${fmt(num(input, "valor"))}`,
      };
    }
    case "recarregar_zul": {
      const chave = str(input, "chave");
      const disponivel = num(input, "disponivel");
      const faixas = chave === "tag" ? FAIXAS_TAG : FAIXAS_ZONA;
      const faixa = faixas.find((f) => f.disponivel === disponivel);
      if (!faixa) return { erro: `Faixa inválida para ${chave}. Use um destes valores: ${faixas.map((f) => fmt(f.disponivel)).join(", ")}.` };
      return {
        acao: { type: "recarregarCaixinha", chave, mes, movId: uid(), disponivel: faixa.disponivel, custo: faixa.custo, tarifa: faixa.custo - faixa.disponivel },
        descricao: `Recarregar ${model.caixinhas[chave]?.nome ?? chave} — entram ${fmt(faixa.disponivel)}, paga ${fmt(faixa.custo)}`,
      };
    }
    case "gastar_zul":
      return {
        acao: { type: "gastarCaixinha", chave: str(input, "chave"), mes, movId: uid(), valor: num(input, "valor") },
        descricao: `Gasto de ${fmt(num(input, "valor"))} em ${model.caixinhas[str(input, "chave")]?.nome ?? str(input, "chave")}`,
      };
    case "remover_movimentacao_zul":
      return { acao: { type: "delMovCaixinha", chave: str(input, "chave"), movId: str(input, "movId") }, descricao: `Remover uma movimentação de ${model.caixinhas[str(input, "chave")]?.nome ?? str(input, "chave")}` };
    case "editar_valor_previsto":
      return {
        acao: { type: "editarValor", tipo: str(input, "tipo") as "despesa" | "receita", itemId: str(input, "itemId"), mes, valor: num(input, "valor"), soNesseMes: bool(input, "soNesseMes", true) },
        descricao: `Ajustar o valor previsto de ${nomeDoItem(model, str(input, "itemId"))} para ${fmt(num(input, "valor"))}${bool(input, "soNesseMes", true) ? " (só neste mês)" : " (todos os meses)"}`,
      };
    case "remover_item":
      return {
        acao: { type: "removerItem", tipo: str(input, "tipo") as "despesa" | "receita", itemId: str(input, "itemId"), mes, soNesseMes: bool(input, "soNesseMes", false) },
        descricao: `Remover ${nomeDoItem(model, str(input, "itemId"))}${bool(input, "soNesseMes", false) ? " (só neste mês)" : " (de todos os meses)"}`,
      };
    case "adicionar_despesa": {
      const parcelasTotal = input.parcelasTotal != null ? Number(input.parcelasTotal) : null;
      const parcelamento = parcelasTotal ? { valor: num(input, "valor"), atual: input.parcelaAtual != null ? Number(input.parcelaAtual) : 1, total: parcelasTotal, base: mes } : undefined;
      return {
        acao: { type: "addDespesa", itemId: uid(), mes, apenasEsseMes: false, dados: { nome: str(input, "nome"), icone: "📌", valor: num(input, "valor"), dia: input.dia != null ? Number(input.dia) : null, q: "Q1", parcelamento } },
        descricao: parcelamento
          ? `Adicionar despesa "${str(input, "nome")}" — ${fmt(parcelamento.valor)}, parcela ${parcelamento.atual}/${parcelamento.total}`
          : `Adicionar despesa "${str(input, "nome")}" — ${fmt(num(input, "valor"))}`,
      };
    }
    case "definir_parcelamento":
      return {
        acao: { type: "definirParcelamento", despesaId: str(input, "despesaId"), parcelamento: { valor: num(input, "valor"), atual: num(input, "atual"), total: num(input, "total"), base: mes } },
        descricao: `Marcar ${nomeDoItem(model, str(input, "despesaId"))} como parcelada — ${fmt(num(input, "valor"))}, parcela ${num(input, "atual")}/${num(input, "total")}`,
      };
    case "remover_parcelamento":
      return { acao: { type: "definirParcelamento", despesaId: str(input, "despesaId"), parcelamento: null }, descricao: `Remover o parcelamento de ${nomeDoItem(model, str(input, "despesaId"))}` };
    case "adicionar_receita":
      return {
        acao: {
          type: "addReceita",
          itemId: uid(),
          mes,
          apenasEsseMes: false,
          dados: { nome: str(input, "nome"), icone: "💰", valor: num(input, "valor"), dia: input.dia != null ? Number(input.dia) : null, quando: str(input, "quando") || (input.dia != null ? `dia ${input.dia}` : "sem data"), q: str(input, "q") as "Q1" | "Q2" },
        },
        descricao: `Adicionar receita "${str(input, "nome")}" — ${fmt(num(input, "valor"))}`,
      };
    case "alternar_receita":
      return { acao: { type: "toggleReceita", receitaId: str(input, "receitaId"), campo: str(input, "campo") as "ativa" | "reserva" }, descricao: `Alternar "${str(input, "campo")}" de ${nomeDoItem(model, str(input, "receitaId"))}` };
    case "atualizar_configuracao": {
      const campo = str(input, "campo") as (typeof CAMPOS_CONFIG)[number];
      const valor = campo === "assistente" ? String(input.valor) : campo === "vozAtiva" ? Boolean(input.valor) : Number(input.valor);
      return { acao: { type: "updateConfig", campo, valor }, descricao: `Mudar ${campo} para ${valor}` };
    }
    case "atualizar_cartao":
      return { acao: { type: "updateCartao", cartaoId: str(input, "cartaoId"), campo: str(input, "campo") as "fechamento" | "vencimento", valor: num(input, "valor") }, descricao: `Mudar o ${str(input, "campo")} de ${nomeDoItem(model, str(input, "cartaoId"))} para dia ${num(input, "valor")}` };
    case "adicionar_parcela_cartao": {
      const cartao = model.cartoes.find((c) => c.id === str(input, "cartaoId"));
      const base = mesDaPrimeiraParcela(mes, num(input, "diaCompra"), cartao?.fechamento ?? null, cartao?.fechaUltimoUtil ?? false);
      return {
        acao: { type: "addParcela", parcelaId: uid(), desc: str(input, "desc"), parcela: num(input, "parcela"), atual: num(input, "atual"), total: num(input, "total"), cartaoId: str(input, "cartaoId"), base },
        descricao: `Lançar "${str(input, "desc")}" no ${nomeDoItem(model, str(input, "cartaoId"))} — ${fmt(num(input, "parcela"))}/mês`,
      };
    }
    case "remover_parcela_cartao":
      return { acao: { type: "delParcela", parcelaId: str(input, "parcelaId") }, descricao: "Remover um lançamento parcelado do cartão" };
    case "retirar_poupanca":
      return {
        acao: { type: "retirarPote", pote: str(input, "pote") as "emergencia" | "folga", histId: uid(), desc: str(input, "desc"), valor: -Math.abs(num(input, "valor")) },
        descricao: `Retirar ${fmt(num(input, "valor"))} do pote ${str(input, "pote")} — ${str(input, "desc")}`,
      };
    case "definir_saldo_inicial_zul":
      return {
        acao: { type: "definirSaldoInicialZul", chave: str(input, "chave"), movId: uid(), saldo: num(input, "saldo"), mes },
        descricao: `Definir o saldo inicial de ${model.caixinhas[str(input, "chave")]?.nome ?? str(input, "chave")} em ${fmt(num(input, "saldo"))}`,
      };
    default:
      return { erro: `Ferramenta desconhecida: ${nomeFerramenta}` };
  }
}
