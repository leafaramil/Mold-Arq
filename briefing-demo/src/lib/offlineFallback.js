/**
 * Roteiro offline, usado apenas quando ANTHROPIC_API_KEY não está configurada.
 *
 * Serve para (a) conseguir rodar e testar a interface e a geração de PDF sem
 * chave e (b) ter uma rede de segurança se a apresentação acontecer sem
 * internet. As perguntas são fixas e o resumo é montado a partir das respostas,
 * sem nenhuma interpretação — por isso a interface deixa explícito que a sessão
 * está em modo demonstração.
 *
 * As perguntas espelham os 14 temas de src/lib/briefingScripts.js (roteiro
 * corporativo-basico), incluindo as versões indiretas de cultura e reuniões —
 * mas aqui elas são só reproduzidas, nunca interpretadas: quem faz a leitura
 * das pistas concretas é a IA de verdade (ver lib/anthropic.js), não este
 * roteiro fixo.
 */

const PERGUNTAS = [
  'Oi! Vou conduzir um briefing sobre o espaço de vocês, são catorze perguntas. Para começar: o que a empresa faz, e em que segmento vocês atuam?',
  'Como é o dia a dia por aí: as pessoas costumam se vestir mais formal ou mais à vontade, e quando um cliente chega para uma visita, o que costuma acontecer?',
  'Hoje, quantas pessoas fazem parte do time, e dá pra separar isso em áreas (comercial, jurídico, RH etc.) ou é tudo mais junto?',
  'Tem alguém ou algum time que precisa de mais privacidade, tipo uma sala fechada? E tem times que fazem questão de estar sempre perto um do outro?',
  'Num dia comum, o escritório costuma estar cheio ou tem gente trabalhando de casa também? E as pessoas sempre sentam no mesmo lugar, ou isso muda?',
  'Tem algum móvel de hoje que vocês fazem questão de levar pro espaço novo, ou vai ser tudo novo? E quem não tem mesa fixa guarda as coisas em algum lugar, tipo um armário?',
  'Qual é hoje a maior frustração de vocês com o espaço físico atual?',
  'Quando surge uma reunião importante com cliente ou um bate-papo maior de equipe, isso acontece hoje num espaço reservado pra isso, ou vira improviso?',
  'Quando alguém chega no escritório, como costuma ser recebido? E ao longo do dia, onde o time geralmente para pra tomar um café, almoçar ou dar uma respirada?',
  'Tem alguma tecnologia que vocês já usam ou fazem questão de ter no novo espaço — controle de acesso, automação de luz e ar-condicionado, algum equipamento específico?',
  'Sustentabilidade pesa nas decisões de vocês — tipo eficiência energética ou alguma certificação verde? Ou não é prioridade agora?',
  'Como vocês querem que as pessoas se sintam ao entrar nesse espaço — clientes e time?',
  'Existe algum espaço, escritório ou referência visual que vocês admiram? O que chama a atenção nele?',
  'Por último: o que é inegociável nesse projeto, já existe prazo ou orçamento definido para a obra, e tem algo que vocês queiram registrar que eu não perguntei?',
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
  const [
    atuacao,
    cenaCultura,
    equipe,
    espacosFechados,
    rotina,
    mobiliario,
    problema,
    reunioes,
    apoio,
    tecnologia,
    sustentabilidade,
    sensacao,
    referencias,
    fechamento,
  ] = respostas;

  const perfil = `${session.empresa} — atuação informada: ${trecho(atuacao)}. Briefing respondido por ${
    session.respondente
  }. (Modo demonstração: as respostas abaixo são reproduzidas como foram dadas, sem interpretação — inclusive as pistas indiretas de cultura e rotina, que a IA de verdade analisaria em vez de só transcrever.)`;

  const necessidades = [
    `Retrato do dia a dia relatado, como pista de cultura ainda não interpretada: ${trecho(cenaCultura)}.`,
    `Porte e estrutura do time relatados: ${trecho(equipe)}.`,
    `Necessidade de privacidade ou proximidade entre times: ${trecho(espacosFechados)}.`,
    `Rotina de presença no escritório relatada: ${trecho(rotina)}.`,
    `Mobiliário a reaproveitar e guarda-volumes: ${trecho(mobiliario)}.`,
    `Resolver a principal limitação apontada no espaço atual: ${trecho(problema)}.`,
    `Como reuniões acontecem hoje, como pista para dimensionar salas: ${trecho(reunioes)}.`,
    `Áreas de apoio e rotina de recepção/pausas relatadas: ${trecho(apoio)}.`,
    `Tecnologia e infraestrutura desejadas: ${trecho(tecnologia)}.`,
    `Prioridade de sustentabilidade relatada: ${trecho(sustentabilidade)}.`,
    `Traduzir espacialmente a sensação desejada: ${trecho(sensacao)}.`,
    `Considerar as referências citadas pela empresa: ${trecho(referencias)}.`,
    `Ponto tratado como inegociável, prazo/orçamento e complementos: ${trecho(fechamento)}.`,
  ];

  const recomendacoes = [
    'Vale iniciar por um diagnóstico do espaço atual, confrontando o incômodo relatado com medições de uso real por ambiente.',
    'Recomendamos usar o retrato do dia a dia relatado como pista de cultura, cruzando com uma conversa presencial antes de fixar isso como critério de projeto.',
    'Vale dimensionar estações de trabalho e salas de reunião a partir da rotina de presença, da estrutura do time e do jeito como as reuniões acontecem hoje, descritos nesta entrevista.',
    'Sugerimos validar as referências citadas, e as prioridades de tecnologia e sustentabilidade, em uma conversa de alinhamento antes de qualquer definição estética.',
  ];

  return { perfil, necessidades, recomendacoes };
}
