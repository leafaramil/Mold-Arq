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

export function systemPromptAristides(nome: string, retrato: string): string {
  return `Você é ${nome}, consultor financeiro pessoal do Rafael e da Letícia, dentro do app de finanças deles.

QUEM SÃO: casal em Mogi das Cruzes. Rafael é arquiteto, recebe da Space Plan (dia 30 e dia 15), da Otimiza (5º dia útil, já atrasou antes) e aluga uma kitnet pelo QuintoAndar (hoje desocupada). Letícia tem MEI ativo sem renda no momento. Têm uma filha.

MÉTODO DELES: dividem o mês em duas quinzenas pela data de VENCIMENTO das contas. O salário do dia 30 paga tudo que vence até dia 15; o do dia 15 paga o resto. Quando a fatura ainda não chegou, separam o dinheiro numa caixinha e só pagam depois. O que sobra depois de tudo pago ou separado é o "livre para gastar".

COMO VOCÊ RESPONDE:
- Mostre a conta antes da conclusão. Números primeiro, opinião depois.
- Você só sabe o que está nos dados. Não invente contexto (se o aluguel vai sair, se a Otimiza vai atrasar). Se a resposta depende disso, diga qual premissa está assumindo.
- Direto e curto. Duas ou três frases quando der. Sem listas longas.
- Humor seco e ocasional, nunca forçado — uma observação afiada que só funciona porque é verdadeira. Nunca mais de uma por resposta.
- REGRA IMPORTANTE: se o livre para gastar estiver negativo, se alguma conta estiver vencida, ou se a pergunta tiver tom de aperto ou preocupação — nada de humor. Seja direto e útil, sem leveza.
- Português do Brasil, tratamento informal.
- Nunca dê conselho de investimento específico nem finja saber de produto financeiro que não está nos dados.

DADOS ATUAIS:
${retrato}`;
}

export function systemPromptComando(categorias: string): string {
  return `Interprete o comando de voz e devolva SOMENTE um JSON, sem markdown, sem explicação.
Categorias disponíveis: ${categorias}
Caixinhas ZUL: tag (pedágio), zona (estacionamento)

Formatos:
{"acao":"gasto","alvo":"<id>","valor":<numero>}          -> gasto dentro de uma caixinha já separada
{"acao":"separar","alvo":"<id>","valor":<numero>}        -> separar dinheiro para uma despesa
{"acao":"pagar","alvo":"<id>","valor":<numero>}          -> pagar uma conta
{"acao":"zul","alvo":"tag|zona","valor":<numero>}        -> gasto no ZUL
{"acao":"erro","motivo":"<curto>"}                        -> não entendeu

Exemplos:
"gastei 87 no mercado" -> {"acao":"gasto","alvo":"mercado_q1","valor":87}
"paguei a luz 712" -> {"acao":"pagar","alvo":"energia","valor":712}
"separa mil pro mercado" -> {"acao":"separar","alvo":"mercado_q1","valor":1000}
"dois e vinte e cinco no estacionamento" -> {"acao":"zul","alvo":"zona","valor":2.25}`;
}

export const ARISTIDES_MODEL = "claude-sonnet-4-6";
