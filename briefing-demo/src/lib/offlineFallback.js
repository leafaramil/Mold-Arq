/**
 * Roteiro offline, usado apenas quando ANTHROPIC_API_KEY não está configurada.
 *
 * Serve para (a) conseguir rodar e testar a interface e a geração de PDF sem
 * chave e (b) ter uma rede de segurança se a apresentação acontecer sem
 * internet. As perguntas são fixas e o resumo é montado a partir das respostas,
 * sem nenhuma interpretação — por isso a interface deixa explícito que a sessão
 * está em modo demonstração.
 */

const PERGUNTAS = [
  'Oi! Vou conduzir um briefing rápido sobre o espaço de vocês, são seis perguntas. Para começar: o que a empresa faz, e em que segmento vocês atuam?',
  'Se vocês tivessem que descrever a cultura da empresa em poucas palavras, quais seriam?',
  'Qual é hoje a maior frustração de vocês com o espaço físico atual?',
  'Como vocês querem que as pessoas se sintam ao entrar nesse espaço — clientes e time?',
  'Existe algum espaço, escritório ou referência visual que vocês admiram? O que chama a atenção nele?',
  'Por último: o que é inegociável nesse projeto, e tem algo que vocês queiram registrar que eu não perguntei?',
];

const ENCERRAMENTO =
  'Obrigado, é material suficiente para uma primeira leitura. Vou organizar o resumo do briefing aqui na tela.';

function respostasDoCliente(session) {
  return session.messages.filter((m) => m.role === 'user').map((m) => m.content.trim());
}

export async function nextQuestion(session, { forcarEncerramento = false } = {}) {
  const total = session.script.topics.length;
  const jaPerguntadas = session.messages.filter((m) => m.role === 'assistant').length;

  if (forcarEncerramento || jaPerguntadas >= PERGUNTAS.length) {
    return { mensagem: ENCERRAMENTO, topico: total, encerrar: true };
  }

  return {
    mensagem: PERGUNTAS[jaPerguntadas],
    topico: Math.min(jaPerguntadas + 1, total),
    encerrar: false,
  };
}

/** Encaixa a fala do cliente no meio de uma frase, sem pontuação duplicada. */
function trecho(resposta) {
  const texto = (resposta || '').trim();
  if (!texto) return '(não informado na entrevista)';
  return texto.replace(/[.!?;,]+$/, '');
}

export async function buildSummary(session) {
  const respostas = respostasDoCliente(session);
  const [atuacao, cultura, problema, sensacao, referencias, prioridade] = respostas;

  const perfil = `${session.empresa} — atuação informada: ${trecho(atuacao)}. Cultura descrita pela própria empresa: ${trecho(
    cultura,
  )}. Briefing respondido por ${session.respondente}.`;

  const necessidades = [
    `Resolver a principal limitação apontada no espaço atual: ${trecho(problema)}.`,
    `Traduzir espacialmente a sensação desejada: ${trecho(sensacao)}.`,
    `Considerar as referências citadas pela empresa: ${trecho(referencias)}.`,
    `Atender ao ponto tratado como inegociável: ${trecho(prioridade)}.`,
  ];

  const recomendacoes = [
    'Vale iniciar por um diagnóstico do espaço atual, confrontando o incômodo relatado com medições de uso real por ambiente.',
    'Recomendamos tratar a cultura descrita como critério de projeto, e não apenas como tema de comunicação visual.',
    'Uma direção possível é priorizar as áreas de maior contato com clientes na primeira etapa, para gerar percepção de mudança mais cedo.',
    'Sugerimos validar as referências citadas em uma conversa de alinhamento antes de qualquer definição estética.',
  ];

  return { perfil, necessidades, recomendacoes };
}
