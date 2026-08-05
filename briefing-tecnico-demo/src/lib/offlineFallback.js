/**
 * Roteiro offline, usado apenas quando ANTHROPIC_API_KEY não está configurada.
 *
 * Serve para (a) conseguir rodar e testar a interface e a geração de PDF sem
 * chave e (b) ter uma rede de segurança se a apresentação acontecer sem
 * internet. As perguntas são fixas (sem os desvios condicionais do roteiro
 * real — regra do imóvel, follow-ups, etc.) e o resumo é montado a partir das
 * respostas, sem nenhuma interpretação — por isso a interface deixa
 * explícito que a sessão está em modo demonstração.
 *
 * Cada entrada carrega o número do tema (`topico`) explicitamente, porque a
 * primeira mensagem é uma boas-vindas sem tema (usa o tema 1 mesmo assim,
 * igual ao modo com IA) e as demais entradas mapeiam 1:1 com os temas do
 * roteiro em src/lib/briefingScripts.js.
 */

const PERGUNTAS = [
  {
    topico: 1,
    mensagem: 'Olá! Seja bem-vindo(a) ao Briefing Técnico. A ideia aqui é entender as necessidades da empresa para orientar o projeto, com perguntas simples e diretas. Qualquer informação que não estiver disponível agora pode ser complementada depois. Vamos começar?',
    opcoes: ['Vamos lá!'],
  },
  {
    topico: 1,
    mensagem: 'Esse projeto é uma reforma no espaço que vocês já ocupam hoje, ou uma mudança para um endereço novo?',
    opcoes: ['Reforma no espaço que já ocupamos hoje', 'Mudança para um espaço novo'],
  },
  {
    topico: 2,
    mensagem: 'Os postos de trabalho têm o mesmo perfil de equipamento para todo mundo — notebook ou desktop, quantos monitores — ou tem diferença entre o time em geral, gerência e diretoria?',
    opcoes: [],
  },
  {
    topico: 3,
    mensagem: 'A empresa tem algum manual ou norma interna que a instalação elétrica precisa seguir?',
    opcoes: ['Sim', 'Não'],
  },
  {
    topico: 4,
    mensagem: 'Nas salas fechadas, preferem interruptor na parede ou sensor de presença automático?',
    opcoes: ['Interruptor na parede', 'Sensor de presença automático', 'Não sabem, tanto faz'],
  },
  {
    topico: 5,
    mensagem: 'Sabem qual a voltagem de entrada de energia do prédio?',
    opcoes: ['110V', '220V', '380V', 'Não sabem'],
  },
  {
    topico: 6,
    mensagem: 'Vão ter controle de acesso?',
    opcoes: ['Sim', 'Não', 'Não sabem ainda'],
  },
  {
    topico: 7,
    mensagem: 'Se faltar luz, tem algum equipamento que não pode parar de jeito nenhum, tipo servidor ou sistema de segurança?',
    opcoes: [],
  },
  {
    topico: 8,
    mensagem: 'As salas de reunião vão precisar de TV ou projetor para chamada de vídeo?',
    opcoes: ['Sim', 'Não'],
  },
  {
    topico: 9,
    mensagem: 'As pessoas trabalham só por wifi, ou também precisam de cabo de rede na mesa?',
    opcoes: [],
  },
  {
    topico: 10,
    mensagem:
      'Em escritórios, o normal é toda a rede de cabos seguir um padrão único e organizado, chamado de cabeamento estruturado — é isso que vamos considerar, a não ser que a empresa tenha alguma exigência diferente. Tem alguma exigência específica de rede que devemos seguir?',
    opcoes: ['Não, sigam o padrão comum', 'Sim, temos uma exigência'],
  },
  {
    topico: 11,
    mensagem: 'A empresa guarda servidor físico no escritório ou está tudo na nuvem?',
    opcoes: ['Físico no escritório', 'Na nuvem', 'Os dois'],
  },
  {
    topico: 12,
    mensagem: 'Vocês têm uma central telefônica hoje?',
    opcoes: ['Sim', 'Não'],
  },
  {
    topico: 13,
    mensagem: 'Precisam de alguma ligação externa além da internet normal — por exemplo, alarme monitorado, TV a cabo ou antena de comunicação?',
    opcoes: [],
  },
  {
    topico: 14,
    mensagem: 'Esse projeto vai envolver mais de um andar do prédio — seja porque o espaço ocupa mais de um andar, ou porque precisa se conectar com outro andar que vocês já usam?',
    opcoes: ['Sim', 'Não'],
  },
  {
    topico: 15,
    mensagem: 'O prédio já tem sistema de ar-condicionado para reaproveitar ou vai ser tudo novo?',
    opcoes: ['Sim, dá pra reaproveitar', 'Não, vai ser tudo novo'],
  },
  {
    topico: 16,
    mensagem: 'Precisam guardar documentos físicos, arquivo morto, materiais ou equipamentos?',
    opcoes: [],
  },
  {
    topico: 17,
    mensagem: 'Tem móvel, equipamento ou material do espaço atual que vocês gostariam de levar/reaproveitar?',
    opcoes: ['Sim', 'Não'],
  },
  {
    topico: 18,
    mensagem: 'As pessoas têm mesa fixa, ou revezam entre mesas disponíveis?',
    opcoes: ['Mesa fixa', 'Revezam (hot-desking)', 'Mistura dos dois'],
  },
  {
    topico: 19,
    mensagem: 'Agora preencha a tabela abaixo com a quantidade de tomadas e pontos de rede por ambiente, e adicione outros ambientes se precisar.',
    opcoes: [],
    mostrarTabela: true,
  },
  {
    topico: 20,
    mensagem: 'Por último: tem algo específico de infraestrutura que queira registrar e que não foi perguntado?',
    opcoes: [],
  },
];

const ENCERRAMENTO =
  'Obrigado, é material suficiente para uma primeira leitura técnica. Vou organizar o resumo aqui na tela.';

function respostasDoCliente(session) {
  return session.messages.filter((m) => m.role === 'user').map((m) => m.content.trim());
}

export async function nextQuestion(session, { forcarEncerramento = false } = {}) {
  const total = session.script.topics.length;
  const jaPerguntadas = session.messages.filter((m) => m.role === 'assistant').length;

  if (forcarEncerramento || jaPerguntadas >= PERGUNTAS.length) {
    return {
      mensagem: ENCERRAMENTO,
      topico: total,
      opcoes: [],
      multiplaEscolha: false,
      mostrarTabela: false,
      encerrar: true,
    };
  }

  const pergunta = PERGUNTAS[jaPerguntadas];
  return {
    mensagem: pergunta.mensagem,
    topico: pergunta.topico,
    opcoes: pergunta.opcoes,
    multiplaEscolha: Boolean(pergunta.multiplaEscolha),
    mostrarTabela: Boolean(pergunta.mostrarTabela),
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
  // respostas[0] é a confirmação do "Vamos começar?" — a situação do projeto
  // é a segunda resposta.
  const respostas = respostasDoCliente(session);
  const [, situacao, mesas, , iluminacao, voltagem, acesso] = respostas;

  const necessidades = [
    `Situação do projeto: ${trecho(situacao)}.`,
    `Perfil de estações de trabalho: ${trecho(mesas)}.`,
    `Preferência de iluminação nas salas fechadas: ${trecho(iluminacao)}.`,
    `Voltagem de entrada do prédio: ${trecho(voltagem)}.`,
    `Controle de acesso: ${trecho(acesso)}.`,
  ];

  const recomendacoes = [
    'Vale validar com a equipe de TI do cliente as pendências técnicas registradas nesta entrevista antes de fechar o projeto elétrico e de dados.',
    'Recomendamos confirmar a carga elétrica disponível no andar e a necessidade de transformador antes do dimensionamento final.',
    'Uma direção possível é priorizar a infraestrutura da sala de servidores (energia, ar-condicionado 24h, combate a incêndio) por ser a mais crítica do levantamento.',
  ];

  return {
    necessidades,
    recomendacoes,
    pendencias: [
      'Este é um resumo em modo demonstração (sem chave de API): pendências técnicas não são extraídas automaticamente aqui — revise a transcrição da conversa.',
    ],
    anexos: [],
  };
}
