/**
 * Roteiro offline, usado apenas quando ANTHROPIC_API_KEY não está configurada.
 *
 * Serve para (a) conseguir rodar e testar a interface e a geração de PDF sem
 * chave e (b) ter uma rede de segurança se a apresentação acontecer sem
 * internet. As perguntas são fixas (sem os desvios condicionais do roteiro
 * real — regra do imóvel, follow-ups de híbrido, etc.) e o resumo é montado a
 * partir das respostas, sem nenhuma interpretação — por isso a interface
 * deixa explícito que a sessão está em modo demonstração.
 */

const PERGUNTAS = [
  {
    mensagem:
      'Oi! A partir daqui as perguntas ficam mais técnicas — o ideal é que alguém de TI ou facilities esteja por perto, mas pode responder o que souber. Se algo não ficar claro, é só avisar que eu reformulo. Para começar: esse projeto é uma reforma no espaço que vocês já ocupam hoje, ou uma mudança para um endereço novo?',
    opcoes: ['Reforma no espaço que já ocupamos hoje', 'Mudança para um espaço novo'],
  },
  {
    mensagem: 'Como é a mesa de trabalho do time em geral — notebook ou desktop? Quantos monitores, usam dock?',
    opcoes: ['Notebook', 'Desktop', 'Mistura dos dois'],
  },
  {
    mensagem: 'A empresa tem algum manual ou norma interna que a instalação elétrica precisa seguir?',
    opcoes: ['Sim, temos uma norma', 'Não'],
  },
  {
    mensagem: 'Nas salas fechadas, preferem interruptor na parede, sensor de presença automático, ou não sabem/tanto faz?',
    opcoes: ['Interruptor na parede', 'Sensor de presença automático', 'Não sabem, tanto faz'],
  },
  {
    mensagem: 'Sabem qual a voltagem de entrada de energia do prédio?',
    opcoes: ['110V', '220V', '380V', 'Não sabem'],
  },
  {
    mensagem: 'Vão ter controle de acesso? Que tipo?',
    opcoes: ['Crachá', 'Catraca', 'Biometria', 'Reconhecimento facial', 'Não vão ter', 'Não sabem ainda'],
  },
  {
    mensagem: 'Se faltar luz, tem algum equipamento que não pode parar de jeito nenhum, tipo servidor ou sistema de segurança?',
    opcoes: ['Servidor', 'Sistema de segurança', 'Nenhum'],
  },
  {
    mensagem: 'As salas de reunião vão precisar de TV ou projetor para chamada de vídeo?',
    opcoes: ['Sim', 'Não'],
  },
  {
    mensagem: 'As pessoas trabalham só por wifi, ou também precisam de cabo de rede na mesa?',
    opcoes: ['Só wifi', 'Wifi e cabo', 'Não sabem'],
  },
  {
    mensagem:
      'Em escritórios, o normal é toda a rede de cabos seguir um padrão único e organizado, chamado de cabeamento estruturado — é isso que vamos considerar, a não ser que a empresa tenha alguma exigência diferente. Tem alguma exigência específica de rede que devemos seguir?',
    opcoes: ['Não, sigam o padrão comum', 'Sim, temos uma exigência'],
  },
  {
    mensagem: 'A empresa guarda servidor físico no escritório ou está tudo na nuvem?',
    opcoes: ['Físico no escritório', 'Na nuvem', 'Os dois'],
  },
  {
    mensagem: 'Vocês usam uma central telefônica hoje, ou pretendem ter uma no projeto novo?',
    opcoes: ['Sim, temos hoje e vamos manter', 'Sim, mas queremos trocar', 'Não temos e não pretendemos ter', 'Ainda não sabemos'],
  },
  {
    mensagem: 'Precisam de alguma ligação externa além da internet normal?',
    opcoes: ['Alarme monitorado', 'TV a cabo', 'Antena de comunicação', 'Nenhuma'],
  },
  {
    mensagem: 'O espaço de vocês vai ocupar mais de um andar?',
    opcoes: ['Sim', 'Não'],
  },
  {
    mensagem: 'O prédio já tem sistema de ar-condicionado para reaproveitar ou vai ser tudo novo?',
    opcoes: ['Sim, dá pra reaproveitar', 'Não, vai ser tudo novo'],
  },
  {
    mensagem: 'Precisam guardar documentos físicos, arquivo morto, materiais ou equipamentos?',
    opcoes: ['Documentos físicos', 'Arquivo morto', 'Materiais/equipamentos', 'Nada disso'],
  },
  {
    mensagem: 'Tem móvel, equipamento ou material do espaço atual que vocês gostariam de levar/reaproveitar?',
    opcoes: ['Sim, tem coisa que queremos levar', 'Não'],
  },
  {
    mensagem: 'As pessoas têm mesa fixa cada uma, ou revezam entre mesas disponíveis?',
    opcoes: ['Mesa fixa para cada um', 'Revezam (hot-desking)', 'Mistura dos dois'],
  },
  {
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
    return { mensagem: ENCERRAMENTO, topico: total, opcoes: [], encerrar: true };
  }

  const pergunta = PERGUNTAS[jaPerguntadas];
  return {
    mensagem: pergunta.mensagem,
    topico: Math.min(jaPerguntadas + 1, total),
    opcoes: pergunta.opcoes,
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
  const [situacao, mesas, , iluminacao, voltagem, acesso, energiaCritica] = respostas;

  const perfil = `${session.empresa} — situação do projeto: ${trecho(situacao)}. Levantamento técnico respondido por ${session.respondente}${
    session.cargo ? ` (${session.cargo})` : ''
  }.`;

  const necessidades = [
    `Perfil de estações de trabalho: ${trecho(mesas)}.`,
    `Preferência de iluminação nas salas fechadas: ${trecho(iluminacao)}.`,
    `Voltagem de entrada do prédio: ${trecho(voltagem)}.`,
    `Controle de acesso: ${trecho(acesso)}.`,
    `Equipamentos que não podem ficar sem energia: ${trecho(energiaCritica)}.`,
  ];

  const recomendacoes = [
    'Vale validar com a equipe de TI do cliente as pendências técnicas registradas nesta entrevista antes de fechar o projeto elétrico e de dados.',
    'Recomendamos confirmar a carga elétrica disponível no andar e a necessidade de transformador com a administração do prédio antes do dimensionamento final.',
    'Uma direção possível é priorizar a infraestrutura da sala de servidores (energia, ar-condicionado 24h, combate a incêndio) por ser a mais crítica do levantamento.',
  ];

  return {
    perfil,
    necessidades,
    recomendacoes,
    pendencias: [
      'Este é um resumo em modo demonstração (sem chave de API): pendências técnicas não são extraídas automaticamente aqui — revise a transcrição da conversa.',
    ],
    anexos: [],
  };
}
