/**
 * Roteiros de levantamento técnico.
 *
 * Cada roteiro é um objeto com id, nome e uma lista de temas. A lista de temas
 * define tanto o que a IA precisa cobrir quanto o indicador de progresso
 * ("Pergunta 3 de 19") mostrado na interface.
 *
 * Este roteiro traduz um levantamento de infraestrutura (o tipo de planilha
 * que um engenheiro preenche, cheia de kVA, categoria de cabeamento, specs de
 * rack) para uma conversa que qualquer pessoa da empresa consegue responder
 * sem apoio técnico. Nenhum item da planilha de referência foi removido —
 * onde a resposta exige um engenheiro de verdade, o objetivo do tema instrui
 * a IA a registrar a pendência com quem, no time do cliente, saberia
 * responder, em vez de cobrar um número exato de quem está respondendo.
 *
 * Campo `opcoes` nos objetivos: quando o texto especificar uma lista de
 * opções entre colchetes, a IA deve preencher o campo estruturado `opcoes`
 * da resposta com exatamente esses textos (a interface mostra como botões
 * clicáveis, sempre com um campo extra de "outro" ao lado). Fora esses
 * pontos, a resposta é só texto livre.
 *
 * Campo `permiteAnexo` no tema: a interface mostra um botão de anexar
 * arquivo (qualquer formato) junto da pergunta desse tema.
 *
 * Para adicionar um roteiro novo, registre outro objeto aqui e aponte
 * BRIEFING_SCRIPT no .env.local para o id dele.
 */

const tecnicoBasico = {
  id: 'tecnico-basico',
  nome: 'Levantamento técnico — infraestrutura',
  descricao:
    'Levantamento de infraestrutura para projetos de arquitetura corporativa (elétrica, rede, segurança, ar-condicionado, servidores), traduzido para perguntas que uma pessoa leiga consegue responder sem apoio técnico.',
  topics: [
    {
      id: 1,
      rotulo: 'Situação do projeto e plantas',
      permiteAnexo: true,
      objetivo:
        'Primeira pergunta técnica da entrevista. Pergunta 1: "Esse projeto é uma reforma no espaço que vocês já ocupam hoje, ou uma mudança para um endereço novo?" — opcoes: ["Reforma no espaço que já ocupamos hoje", "Mudança para um espaço novo"]. A resposta define a "regra do imóvel" usada em vários temas seguintes: só pergunte algo no presente sobre "hoje" (wifi de hoje, temperatura de hoje, equipamento a reaproveitar) se a empresa ocupa o espaço atual; se for mudança para endereço novo, pule essas perguntas sem comentário. Pergunta 2, mensagem separada: "Vocês têm as plantas desse espaço?" — opcoes: ["Arquitetura", "Elétrica", "Ar-condicionado", "Dados e voz", "Combate a incêndio", "Detecção de fumaça", "Não temos nenhuma"]. Se a pessoa disser que tem alguma planta, ofereça o botão de anexar (já disponível na interface neste tema) para ela anexar o arquivo, em qualquer formato.',
    },
    {
      id: 2,
      rotulo: 'Tomadas por tipo de mesa',
      objetivo:
        'Descobrir a necessidade de tomadas sem perguntar "quantas tomadas vocês precisam" (ninguém calcula isso de cabeça). Pergunte por tipo de mesa, uma pergunta de cada vez, para não generalizar: (a) "Como é a mesa de trabalho do time em geral — notebook ou desktop? Quantos monitores, usam dock?" com opcoes ["Notebook", "Desktop", "Mistura dos dois"] para o tipo de computador; (b) "E a mesa dos gerentes, é parecida ou tem mais equipamento — mais telas, outro tipo de computador?"; (c) "E a diretoria, tem alguma diferença?". A partir das respostas, proponha uma quantidade preliminar de tomadas por tipo de mesa e confirme se faz sentido. Feche o tema perguntando, em mensagem separada: "Tem alguma mesa de algum setor específico que precise de uma quantidade diferente de tomadas do que a gente já conversou?" (texto livre).',
    },
    {
      id: 3,
      rotulo: 'Norma interna de instalação elétrica',
      permiteAnexo: true,
      objetivo:
        'Pergunta direta: "A empresa tem algum manual ou norma interna que a instalação elétrica precisa seguir?" — opcoes: ["Sim, temos uma norma", "Não"]. Se a resposta for sim, peça para anexar o documento (o botão de anexar já está disponível neste tema) e não peça para descrever o conteúdo por texto.',
    },
    {
      id: 4,
      rotulo: 'Iluminação',
      objetivo:
        'Pergunta 1: "Nas salas fechadas, preferem interruptor na parede, sensor de presença automático, ou não sabem/tanto faz?" — opcoes: ["Interruptor na parede", "Sensor de presença automático", "Não sabem, tanto faz"]. Pergunta 2, mensagem separada: "Tem algum ambiente que gostariam de ter luz com intensidade ajustável (dimmer)?" — opcoes: ["Sim, em algum ambiente", "Não"]. Se sim, peça em texto livre quais ambientes.',
    },
    {
      id: 5,
      rotulo: 'Infraestrutura elétrica do prédio',
      objetivo:
        'Três perguntas técnicas do prédio, cada uma em mensagem separada, aplicando a mecânica de pendência sempre que a pessoa não souber: (a) "Sabem qual a voltagem de entrada de energia do prédio?" — opcoes: ["110V", "220V", "380V", "Não sabem"]; (b) "Sabem quanta carga elétrica está disponível no andar, em kVA?" (texto livre, é um número — se não souberem, registre como pendência técnica); (c) "Vai precisar de transformador novo, já existe um, ou isso ainda é decisão do projeto técnico?" — opcoes: ["Vai precisar de um novo", "Já existe um", "Não sabem, é decisão do projeto"].',
    },
    {
      id: 6,
      rotulo: 'Segurança e acesso',
      objetivo:
        'Pergunta 1: "Vão ter controle de acesso? Que tipo?" — opcoes: ["Crachá", "Catraca", "Biometria", "Reconhecimento facial", "Não vão ter", "Não sabem ainda"]. Pergunta 2, mensagem separada: "Vão ter câmeras de segurança? Onde?" (texto livre, pois o local varia). Se a pessoa mencionar câmeras em banheiros, vestiários ou copa/refeitório, avise gentilmente que a LGPD não permite câmeras nesses ambientes por violar privacidade, e sugira reposicionar para entradas e áreas comuns — isso é um alerta legal, não uma opção entre outras. Pergunta 3, mensagem separada: "O prédio já tem sistema de detecção de incêndio? Sabem aproximadamente quantos detectores e de qual marca?" — opcoes: ["Já tem", "Não tem"]; se já tem, peça quantidade/marca em texto livre e registre como pendência se não souberem.',
    },
    {
      id: 7,
      rotulo: 'Energia crítica',
      objetivo:
        'Pergunta 1: "Se faltar luz, tem algum equipamento que não pode parar de jeito nenhum, tipo servidor ou sistema de segurança?" — opcoes: ["Servidor", "Sistema de segurança", "Nenhum"]. Pergunta 2, mensagem separada: "Tem algum equipamento sensível que precisaria de estabilizador de voltagem?" — opcoes: ["Sim", "Não"]. Pergunta 3, mensagem separada: "O prédio tem gerador de emergência, ou está nos planos ter um?" — opcoes: ["Já tem", "Está nos planos", "Não"].',
    },
    {
      id: 8,
      rotulo: 'Salas de reunião, recepção e videoconferência',
      objetivo:
        'Único lugar da entrevista que pergunta sobre TV/videoconferência — não repita isso em outro tema. Pergunta 1, só se a empresa ocupa o espaço hoje (regra do imóvel do tema 1): "Hoje, a recepção ou as salas de reunião já têm TV, projetor ou sistema de videoconferência instalado?" — opcoes: ["Sim", "Não"]. Pergunta 2, sempre: "As salas de reunião vão precisar de TV ou projetor para chamada de vídeo?" — opcoes: ["Sim", "Não"]. Se ao longo da conversa ficar claro que o time trabalha de forma híbrida (parte remota), pergunte também, mensagem separada: "A experiência de quem entra remoto nas reuniões hoje costuma ser boa ou frustrante?" — opcoes: ["Boa", "Frustrante", "Não fazemos reuniões híbridas"]; se a resposta for frustrante, pergunte o que costuma atrapalhar — áudio ruim, câmera ruim, dificuldade de ver todo mundo — antes de seguir em frente.',
    },
    {
      id: 9,
      rotulo: 'Internet e rede',
      objetivo:
        'Pergunta única: "As pessoas trabalham só por wifi, ou também precisam de cabo de rede na mesa?" — opcoes: ["Só wifi", "Wifi e cabo", "Não sabem"].',
    },
    {
      id: 10,
      rotulo: 'Rede de dados (cabeamento)',
      objetivo:
        'Pergunta única, já explicando o termo técnico dentro da própria pergunta (a pessoa não sabe o que é "cabeamento estruturado" nem qual seria a alternativa): "Em escritórios, o normal é toda a rede de cabos seguir um padrão único e organizado, chamado de cabeamento estruturado — é isso que vamos considerar aqui, a não ser que a empresa tenha alguma exigência diferente. Tem alguma exigência específica de rede que devemos seguir?" — opcoes: ["Não, sigam o padrão comum", "Sim, temos uma exigência"]; se sim, peça qual em texto livre.',
    },
    {
      id: 11,
      rotulo: 'Servidores',
      objetivo:
        'Sequência de perguntas curtas, cada uma em mensagem separada: (a) "A empresa guarda servidor físico no escritório ou está tudo na nuvem?" — opcoes: ["Físico no escritório", "Na nuvem", "Os dois"]; (b) se físico, "Já existe um rack (armário técnico) para reaproveitar, ou vai ser novo?" — opcoes: ["Já existe, dá pra reaproveitar", "Vai ser novo", "Não sabem"]; (c) "A ativação técnica dos equipamentos de rede — ligar e configurar — fica por conta de quem está tocando a obra/instalação, ou da equipe de TI de vocês?" — opcoes: ["Quem está tocando a obra/instalação", "Nossa equipe de TI", "Não sabem ainda"]; (d) "A sala de servidores precisa ficar com ar-condicionado ligado 24 horas, já que os equipamentos não podem esquentar? Nesse caso, o ideal é ter um sistema reserva (backup) caso o principal falhe — isso é algo que vocês já preveem?" — opcoes: ["Sim, precisa de ar 24h com reserva", "Sim, precisa de ar 24h, sem reserva por enquanto", "Não sabem"]; (e) "Essa sala vai ter sistema de combate a incêndio a gás, ou pode usar sprinkler comum?" — opcoes: ["Sistema a gás", "Sprinkler comum", "Não sabem"]. Sempre que a resposta for "não sabem", registre como pendência técnica seguindo a mecânica de pendências.',
    },
    {
      id: 12,
      rotulo: 'Telefonia',
      objetivo:
        'Pergunta 1: "Vocês usam uma central telefônica hoje, ou pretendem ter uma no projeto novo?" — opcoes: ["Sim, temos hoje e vamos manter", "Sim, mas queremos trocar", "Não temos e não pretendemos ter", "Ainda não sabemos"]. Pergunta 2 só aparece se a resposta indicar que têm ou vão ter central telefônica (as duas primeiras opções): "Sabem aproximadamente quantos ramais/linhas precisam?" (texto livre, é um número). Se a resposta for "não temos e não pretendemos ter", pule direto para o próximo tema sem fazer a pergunta 2.',
    },
    {
      id: 13,
      rotulo: 'Conexões externas',
      objetivo:
        'Pergunta única, de múltipla escolha (a pessoa pode marcar mais de uma opção): "Precisam de alguma ligação externa além da internet normal?" — opcoes: ["Alarme monitorado", "TV a cabo", "Antena de comunicação", "Nenhuma"].',
    },
    {
      id: 14,
      rotulo: 'Ligação entre andares',
      objetivo:
        'Pergunta 1, necessária porque nada até aqui revela isso: "O espaço de vocês vai ocupar mais de um andar?" — opcoes: ["Sim", "Não"]. Pergunta 2 só se a resposta for sim: "Sabem se a ligação entre os andares vai ser fibra óptica, cabo comum, ou é decisão do projeto?" — opcoes: ["Fibra óptica", "Cabo comum", "Decisão do projeto"]. Se a resposta da pergunta 1 for não, pule a pergunta 2 e siga para o próximo tema.',
    },
    {
      id: 15,
      rotulo: 'Ar-condicionado e conforto térmico',
      objetivo:
        'Pergunta 1: "O prédio já tem sistema de ar para reaproveitar ou vai ser tudo novo?" — opcoes: ["Sim, dá pra reaproveitar", "Não, vai ser tudo novo"]. Pergunta 2, mensagem separada: "Gostariam de controle de temperatura individual por sala, ou central já está bom?" — opcoes: ["Individual por sala", "Central para o andar todo", "Tanto faz"]. Pergunta 3, mensagem separada: "Algum ambiente vai precisar de exaustor, tipo copa ou banheiro?" — opcoes: ["Sim", "Não"]; se sim, peça quais em texto livre. Pergunta 4, só se a empresa ocupa o espaço hoje (regra do imóvel do tema 1): "Tem alguma área que costuma ficar bem mais fria ou mais quente que o resto do espaço?" — opcoes: ["Sim", "Não"]; se sim, peça qual área em texto livre.',
    },
    {
      id: 16,
      rotulo: 'Armazenamento',
      objetivo:
        'Pergunta única, de múltipla escolha: "Precisam guardar documentos físicos, arquivo morto, materiais ou equipamentos?" — opcoes: ["Documentos físicos", "Arquivo morto", "Materiais/equipamentos", "Nada disso"]. Se mencionarem documentos físicos ou arquivo morto, pergunte se tem algo que já pode ser digitalizado ou descartado antes da mudança.',
    },
    {
      id: 17,
      rotulo: 'Reaproveitamento de mobiliário e equipamentos',
      objetivo:
        'Aplicando a regra do imóvel do tema 1 (só pergunte se a empresa ocupa o espaço hoje; se for mudança para endereço novo, pule este tema sem comentário): "Tem móvel, equipamento ou material do espaço atual que vocês gostariam de levar/reaproveitar?" — opcoes: ["Sim, tem coisa que queremos levar", "Não"]; se sim, peça o quê em texto livre.',
    },
    {
      id: 18,
      rotulo: 'Mesa fixa ou compartilhada',
      objetivo:
        'Pergunta 1: "As pessoas têm mesa fixa cada uma, ou revezam entre mesas disponíveis?" — opcoes: ["Mesa fixa para cada um", "Revezam (hot-desking)", "Mistura dos dois"]. Pergunta 2 só se revezam, mensagem separada: "Já pensam nalgum sistema de reserva, ou é por ordem de chegada?" — opcoes: ["Aplicativo/sistema de reserva", "Ordem de chegada", "Ainda não pensaram"].',
    },
    {
      id: 19,
      rotulo: 'Complementos e fechamento',
      objetivo:
        'Pergunta de fechamento, texto livre, sem opções: "Tem algo específico de infraestrutura que queira registrar e que não foi perguntado?". Esta é a última pergunta do roteiro — a mensagem de encerramento que vem depois dela (agradecendo e avisando que o resumo será gerado na tela) deve marcar encerrar como true.',
    },
  ],
};

const scripts = new Map([[tecnicoBasico.id, tecnicoBasico]]);

export function getScript(id) {
  const script = scripts.get(id);
  if (!script) {
    const disponiveis = [...scripts.keys()].join(', ');
    throw new Error(`Roteiro de levantamento técnico "${id}" não existe. Disponíveis: ${disponiveis}`);
  }
  return script;
}

export function listScripts() {
  return [...scripts.values()].map(({ id, nome, descricao }) => ({ id, nome, descricao }));
}
