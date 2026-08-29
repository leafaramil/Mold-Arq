// Textos e o "retrato financeiro" do Aristides (seção 6). Depende de
// calc.ts para os números, mas é montagem de texto/prompt — não faz parte
// da lógica de negócio testada na seção 8.1.
import {
  dizimoDe,
  dizimoPrevisto,
  estadoDe,
  faturaDoCartao,
  gastoTotal,
  mediaRealDe,
  nomeMes,
  previsto,
  resolverCartao,
  resolverDespesa,
  resolverReceita,
  saldoCaixinha,
  saldoPote,
} from "./calc";
import { fmt } from "./format";
import { ESTADO_VAZIO, type DataModel } from "./types";

export function retratoFinanceiro(model: DataModel, mes: string, hoje: Date): string {
  const despesas = model.despesas.map((d) => resolverDespesa(d, mes)).filter((d): d is NonNullable<typeof d> => d !== null);
  const receitas = model.receitas
    .map((r) => resolverReceita(r, mes))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => r.ativa);
  const cartoes = model.cartoes.map((c) => resolverCartao(c, model.parcelas, mes));
  const estadosDoMes = model.estados[mes] ?? {};

  const impostoRafaelValor = despesas.find((d) => d.id === "imposto_rafael")?.valor ?? 0;
  const contadorValor = despesas.find((d) => d.id === "contador")?.valor ?? 0;

  const linhaDespesa = (d: (typeof despesas)[number]) => {
    const e = estadosDoMes[d.id] ?? ESTADO_VAZIO;
    const st = estadoDe(e);
    const media = mediaRealDe(d.id, d.overrides, model.estados, mes);
    const estadoTxto = st === "pago" ? `pago ${fmt(e.pago)}` : st === "separado" ? `separado ${fmt(e.separado)}, gasto ${fmt(gastoTotal(e.gastos))}` : "em aberto";
    const parcelaTxt = d.parcelaInfo ? `, parcela ${d.parcelaInfo.atual}/${d.parcelaInfo.total}` : "";
    return `- ${d.nome}: previsto ${fmt(previsto(d.valor, media))}${d.dia ? `, vence dia ${d.dia}` : ""}${parcelaTxt} (${estadoTxto})`;
  };

  const linhasReceitas = receitas
    .map((r) => {
      const e = estadosDoMes[r.id] ?? ESTADO_VAZIO;
      const ok = e.recebido != null;
      const dizimoTxt = r.dizimo ? `, dízimo ${fmt(ok ? dizimoDe(r, e, impostoRafaelValor, contadorValor) : dizimoPrevisto(r, impostoRafaelValor, contadorValor))}` : "";
      return `- ${r.nome}: ${fmt(r.valor)} (${ok ? `recebido ${fmt(e.recebido)}` : "ainda não caiu"})${dizimoTxt}`;
    })
    .join("\n");

  const linhasCartoes = cartoes
    .map((c) => `- ${c.nome}: fatura ${fmt(faturaDoCartao(model.parcelas, c.id, mes))}${c.vencimento ? `, vence dia ${c.vencimento}` : ""}`)
    .join("\n");

  const linhasParcelas = model.parcelas
    .map((p) => `- ${p.desc}: ${fmt(p.parcela)}/mês, ${p.total >= 9999 ? "recorrente" : `parcela ${p.atual}/${p.total}`}`)
    .join("\n");

  const linhasCaixinhas = Object.values(model.caixinhas)
    .map((cx) => `- ${cx.nome}: saldo ${fmt(saldoCaixinha(cx.mov))}`)
    .join("\n");

  const receitasComReserva = receitas.filter((r) => r.reserva).map((r) => r.nome);

  return `MÊS: ${nomeMes(mes)} (hoje é dia ${hoje.getDate()})

RECEITAS:
${linhasReceitas || "(nenhuma ativa)"}

DESPESAS 1ª QUINZENA (vencem até dia 15, pagas com o salário do dia 30 anterior):
${despesas.filter((d) => d.q === "Q1").map(linhaDespesa).join("\n") || "(nenhuma)"}

DESPESAS 2ª QUINZENA (vencem do dia 16 em diante, pagas com o salário do dia 15):
${despesas.filter((d) => d.q === "Q2").map(linhaDespesa).join("\n") || "(nenhuma)"}

CARTÕES:
${linhasCartoes || "(nenhum)"}

PARCELAMENTOS E ASSINATURAS:
${linhasParcelas || "(nenhum)"}

CAIXINHAS ZUL (saldo atravessa meses):
${linhasCaixinhas || "(nenhuma)"}

POUPANÇA: emergência ${fmt(saldoPote(model.potes.emergenciaHist))}, folga ${fmt(saldoPote(model.potes.folgaHist))}
RESERVA AUTOMÁTICA: ${model.config.reservaPct}% (ativa em: ${receitasComReserva.join(", ") || "nenhuma receita"})`;
}

/**
 * Índice compacto de IDs reais do banco (despesas, receitas, cartões,
 * caixinhas, e os IDs de sub-itens do mês — gastos parciais, movimentações
 * do ZUL, parcelas de cartão) para o agente conseguir montar os parâmetros
 * das ferramentas sem inventar identificadores.
 */
export function indiceDados(model: DataModel, mes: string): string {
  const despesas = model.despesas.map((d) => `${d.id} = ${d.nome}`).join(" | ") || "(nenhuma)";
  const receitas = model.receitas.map((r) => `${r.id} = ${r.nome}`).join(" | ") || "(nenhuma)";
  const cartoes = model.cartoes.map((c) => `${c.id} = ${c.nome}`).join(" | ") || "(nenhum)";
  const caixinhas = Object.entries(model.caixinhas).map(([chave, cx]) => `${chave} = ${cx.nome}`).join(" | ");

  const estadosDoMes = model.estados[mes] ?? {};
  const gastos: string[] = [];
  for (const [itemId, estado] of Object.entries(estadosDoMes)) {
    for (const g of estado.gastos) gastos.push(`${g.id} (gasto de ${fmt(g.valor)} em ${itemId}, ${g.data})`);
  }

  const movs: string[] = [];
  for (const [chave, cx] of Object.entries(model.caixinhas)) {
    for (const m of cx.mov) {
      const valor = m.tipo === "recarga" ? (m.disponivel ?? 0) : (m.valor ?? 0);
      movs.push(`${m.id} (${m.tipo} de ${fmt(valor)} em ${chave}, ${m.data})`);
    }
  }

  const parcelasCartao = model.parcelas
    .map((p) => `${p.id} = "${p.desc}" no cartão ${p.cartaoId} (${fmt(p.parcela)}/mês)`)
    .join(" | ") || "(nenhuma)";

  const parcelamentosDespesa = model.despesas
    .filter((d) => d.parcelamento)
    .map((d) => `${d.id} está parcelada: ${d.parcelamento!.atual}/${d.parcelamento!.total} de ${fmt(d.parcelamento!.valor)}, começou em ${d.parcelamento!.base}`)
    .join(" | ") || "(nenhuma despesa parcelada avulsa)";

  return `IDS DE DESPESAS: ${despesas}
IDS DE RECEITAS: ${receitas}
IDS DE CARTÕES: ${cartoes}
IDS DE CAIXINHAS ZUL: ${caixinhas}
DESPESAS COM PARCELAMENTO AVULSO: ${parcelamentosDespesa}
PARCELAS DE CARTÃO (id = descrição): ${parcelasCartao}
GASTOS PARCIAIS LANÇADOS ESTE MÊS (id): ${gastos.join(" | ") || "(nenhum)"}
MOVIMENTAÇÕES ZUL ESTE MÊS (id): ${movs.join(" | ") || "(nenhuma)"}`;
}

export function systemPromptAristides(nome: string, retrato: string, indice: string, mesAtual: string): string {
  return `Você é ${nome}, consultor financeiro pessoal do Rafael e da Letícia, e também o agente que opera o app de finanças deles por conversa (voz ou texto) — o mês atual em uso é ${mesAtual}.

QUEM SÃO: casal em Mogi das Cruzes. Rafael é arquiteto, recebe da Space Plan (dia 30 e dia 15), da Otimiza (5º dia útil, já atrasou antes) e aluga uma kitnet pelo QuintoAndar (hoje desocupada). Letícia tem MEI ativo sem renda no momento. Têm uma filha.

MÉTODO DELES: dividem o mês em duas quinzenas pela data de VENCIMENTO das contas. O salário do dia 30 paga tudo que vence até dia 15; o do dia 15 paga o resto. Quando a fatura ainda não chegou, separam o dinheiro numa caixinha e só pagam depois. O que sobra depois de tudo pago ou separado é o "livre para gastar".

COMO VOCÊ ACONSELHA (padrão de consultor financeiro sênior, não de chatbot genérico):
- Números primeiro, opinião depois — mostre a conta antes da conclusão.
- Separe o que é fato (o que está nos dados) do que é julgamento seu — e nomeie a premissa quando estiver assumindo algo (ex: "supondo que a Otimiza não atrase").
- Pense em fluxo de caixa por quinzena, não só o mês inteiro — o problema real deles é descompasso de timing entre a 1ª e a 2ª quinzena, não falta de dinheiro no total.
- Ao avaliar uma decisão nova (uma parcela nova, uma compra), calcule o impacto na quinzena em que ela vai pesar, não só a média mensal.
- Priorize nesta ordem quando houver conflito: (1) não deixar nada vencer, (2) manter a reserva de emergência intacta, (3) só depois considerar folga/lazer.
- Sinalize risco de concentração (ex: muita coisa vencendo na mesma quinzena, ou depender de uma única fonte de renda) quando for relevante, mesmo sem ser perguntado.
- Você só sabe o que está nos dados. Não invente contexto (se o aluguel vai sair, se a Otimiza vai atrasar).
- Direto e curto. Duas ou três frases quando der. Sem listas longas.
- Humor seco e ocasional, nunca forçado — uma observação afiada que só funciona porque é verdadeira. Nunca mais de uma por resposta.
- REGRA IMPORTANTE: se o livre para gastar estiver negativo, se alguma conta estiver vencida, ou se a pergunta tiver tom de aperto ou preocupação — nada de humor. Seja direto e útil, sem leveza.
- Português do Brasil, tratamento informal.
- Nunca dê conselho de investimento específico nem finja saber de produto financeiro que não está nos dados.

COMO VOCÊ AGE NO APP:
- Se o pedido for uma pergunta ou pedido de conselho, só responda em texto — não use nenhuma ferramenta.
- Se o pedido for para fazer algo no app (pagar, separar, lançar gasto, cadastrar, corrigir, remover, etc.), escolha a ferramenta certa e chame com os parâmetros corretos. Use os IDs do índice abaixo — nunca invente um ID.
- Chame NO MÁXIMO uma ferramenta por vez. Se o pedido implicar várias ações, proponha a primeira e diga que fará o resto em seguida.
- Você nunca executa nada sozinho: o app sempre mostra o que você propôs para a pessoa confirmar antes de gravar. Pode ser direto ao propor.
- Se faltar informação essencial (ex: valor, ou qual item), pergunte em texto em vez de adivinhar ou chamar a ferramenta com dados incompletos.
- Se o pedido não corresponder a nenhuma ferramenta disponível, diga isso em texto, sem chamar ferramenta nenhuma.

DADOS ATUAIS:
${retrato}

ÍNDICE DE IDs (use exatamente estes valores nos parâmetros de ferramenta):
${indice}`;
}

export const ARISTIDES_MODEL = "claude-sonnet-4-6";
