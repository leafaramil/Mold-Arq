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
 * da resposta com exatamente esses textos — a interface mostra como botões
 * que já enviam a resposta ao serem clicados (sem precisar digitar depois).
 * Por isso, `opcoes` só aparece em perguntas cuja resposta cabe inteiramente
 * numa escolha — nada que a pessoa ainda precise complementar por texto, e
 * nada que ela possa querer marcar mais de uma ao mesmo tempo (nesses casos
 * o objetivo pede texto livre).
 *
 * Campo `permiteAnexo` no tema: a interface mostra um botão de anexar
 * arquivo (qualquer formato, pode escolher vários de uma vez) junto da
 * pergunta desse tema.
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
        'Pergunta 1: "Esse projeto é uma reforma no espaço que vocês já ocupam hoje, ou uma mudança para um endereço novo?" — opcoes: ["Reforma no espaço que já ocupamos hoje", "Mudança para um espaço novo"]. A resposta define a "regra do imóvel" usada em vários temas seguintes: só pergunte algo no presente sobre "hoje" (wifi de hoje, temperatura de hoje, equipamento a reaproveitar) se a empresa ocupa o espaço atual; se for mudança para endereço novo, pule essas perguntas sem comentário. Pergunta 2, mensagem separada: "Vocês têm as plantas desse espaço?" — opcoes: ["Sim", "Não"]. Se a resposta for sim, pergunta 3 em texto livre (sem opções, pois pode ser mais de um tipo): "Quais plantas vocês têm — arquitetura, elétrica, ar-condicionado, dados e voz, combate a incêndio, detecção de fumaça? Pode anexar os arquivos pelo botão de anexo, em qualquer formato."',
    },
    {
      id: 2,
      rotulo: 'Perfil das estações de trabalho',
      objetivo:
        'Pergunta única, sem opções (a resposta é uma descrição, não uma escolha fechada): "Os postos de trabalho têm o mesmo perfil de equipamento para todo mundo — notebook ou desktop, quantos monitores, usam estação de acoplamento (dock)? — ou tem diferença entre o time em geral, gerência e diretoria?". Deixe a pessoa descrever livremente; só faça um follow-up curto se ela mencionar que há diferença entre os grupos e não tiver detalhado. A partir da resposta, proponha uma quantidade preliminar de tomadas por tipo de posto e confirme se faz sentido. Feche o tema perguntando, em mensagem separada e também sem opções: "Tem alguma mesa de algum setor específico que precise de uma quantidade diferente de tomadas do que a gente já conversou?"',
    },
    {
      id: 3,
      rotulo: 'Norma interna de instalação elétrica',
      permiteAnexo: true,
      objetivo:
        'Pergunta direta: "A empresa tem algum manual ou norma interna que a instalação elétrica precisa seguir?" — opcoes: ["Sim", "Não"]. Se a resposta for sim, peça para anexar o documento pelo botão de anexo (não peça para descrever o conteúdo por texto).',
    },
    {
      id: 4,
      rotulo: 'Iluminação',
      objetivo:
        'Pergunta 1: "Nas salas fechadas, preferem interruptor na parede ou sensor de presença automático?" — opcoes: ["Interruptor na parede", "Sensor de presença automático", "Não sabem, tanto faz"]. Pergunta 2, mensagem separada: "Tem algum ambiente que gostariam de ter luz com intensidade ajustável (dimmer)?" — opcoes: ["Sim", "Não"]. Se sim, follow-up sem opções: "Em quais ambientes?"',
    },
    {
      id: 5,
      rotulo: 'Infraestrutura elétrica do prédio',
      objetivo:
        'Três perguntas técnicas do prédio, cada uma em mensagem separada, aplicando a mecânica de pendência sempre que a pessoa não souber: (a) "Sabem qual a voltagem de entrada de energia do prédio?" — opcoes: ["110V", "220V", "380V", "Não sabem"]; (b) "Sabem quanta carga elétrica está disponível no andar, em kVA?" — sem opções, é um número (se não souberem, registre como pendência técnica); (c) "Vocês vão precisar de transformador elétrico?" — opcoes: ["Sim", "Não", "Não sabem"]; se a resposta for sim, follow-up: "Ele já existe, ou vai ser novo — ou isso ainda é decisão do projeto técnico?" — opcoes: ["Já existe", "Vai ser novo", "É decisão do projeto técnico"].',
    },
    {
      id: 6,
      rotulo: 'Segurança e acesso',
      objetivo:
        'Pergunta 1: "Vão ter controle de acesso?" — opcoes: ["Sim", "Não", "Não sabem ainda"]. Se sim, pergunta 2, mensagem separada: "Que tipo?" — opcoes: ["Crachá", "Catraca", "Biometria", "Reconhecimento facial"]; depois, pergunta 3, sem opções: "Em quais ambientes ou entradas?". Pergunta 4, mensagem separada, sem opções (o local varia): "Vão ter câmeras de segurança? Onde?" — se a pessoa mencionar câmeras em banheiros, vestiários ou copa/refeitório, avise gentilmente que a LGPD não permite por violar privacidade, e sugira reposicionar para entradas e áreas comuns — isso é um alerta legal, não uma opção entre outras. Pergunta 5, mensagem separada: "O prédio já tem sistema de detecção de fumaça?" — opcoes: ["Sim", "Não", "Não sabem"].',
    },
    {
      id: 7,
      rotulo: 'Energia crítica',
      objetivo:
        'Pergunta 1, sem opções (a resposta pode citar mais de um equipamento): "Se faltar luz, tem algum equipamento que não pode parar de jeito nenhum, tipo servidor ou sistema de segurança?". Pergunta 2, mensagem separada: "Tem algum equipamento sensível que precisaria de estabilizador de voltagem?" — opcoes: ["Sim", "Não"]. Pergunta 3, mensagem separada: "O prédio tem gerador de emergência?" — opcoes: ["Sim", "Não"].',
    },
    {
      id: 8,
      rotulo: 'Salas de reunião, recepção e videoconferência',
      objetivo:
        'Único lugar da entrevista que pergunta sobre TV/videoconferência — não repita isso em outro tema. Pergunta 1, só se a empresa ocupa o espaço hoje (regra do imóvel do tema 1): "Hoje, a recepção ou as salas de reunião já têm TV, projetor ou sistema de videoconferência instalado?" — opcoes: ["Sim", "Não"]. Pergunta 2, sempre: "As salas de reunião vão precisar de TV ou projetor para chamada de vídeo?" — opcoes: ["Sim", "Não"]. Se ao longo da conversa ficar claro que o time trabalha de forma híbrida (parte remota), pergunte também, mensagem separada: "A experiência de quem entra remoto nas reuniões hoje costuma ser boa ou frustrante?" — opcoes: ["Boa", "Frustrante", "Não fazemos reuniões híbridas"]; se a resposta for frustrante, follow-up sem opções perguntando o que costuma atrapalhar antes de seguir em frente.',
    },
    {
      id: 9,
      rotulo: 'Internet e rede',
      objetivo:
        'Pergunta única, sem opções: "As pessoas trabalham só por wifi, ou também precisam de cabo de rede na mesa?". Se a resposta indicar que é só wifi, follow-up sem opções: "Mesmo assim, tem algum equipamento que precisa de cabo — tipo impressora ou o próprio roteador de wifi?".',
    },
    {
      id: 10,
      rotulo: 'Rede de dados (cabeamento)',
      objetivo:
        'Pergunta única, já explicando o termo técnico dentro da própria pergunta (a pessoa não sabe o que é "cabeamento estruturado" nem qual seria a alternativa): "Em escritórios, o normal é toda a rede de cabos seguir um padrão único e organizado, chamado de cabeamento estruturado — é isso que vamos considerar aqui, a não ser que a empresa tenha alguma exigência diferente. Tem alguma exigência específica de rede que devemos seguir?" — opcoes: ["Não, sigam o padrão comum", "Sim, temos uma exigência"]; se sim, follow-up sem opções perguntando qual.',
    },
    {
      id: 11,
      rotulo: 'Servidores',
      objetivo:
        'Sequência de perguntas curtas, cada uma em mensagem separada: (a) "A empresa guarda servidor físico no escritório ou está tudo na nuvem?" — opcoes: ["Físico no escritório", "Na nuvem", "Os dois"]; (b) se físico, "Já existe um rack (armário técnico) para reaproveitar, ou vai ser novo?" — opcoes: ["Já existe, dá pra reaproveitar", "Vai ser novo", "Não sabem"]; (c) "A ativação técnica dos equipamentos de rede fica por conta da empresa responsável pela instalação, ou da equipe de TI de vocês?" — opcoes: ["Empresa responsável pela instalação", "Nossa equipe de TI", "Não sabem ainda"]; (d) "A sala de servidores precisa ficar com ar-condicionado ligado 24 horas?" — opcoes: ["Sim", "Não", "Não sabem"]; se sim, follow-up: "Nesse caso, podemos considerar que é importante ter um sistema reserva (backup) caso o principal falhe?" — opcoes: ["Sim", "Não", "Não sabem"]; (e) "Essa sala vai ter sistema de combate a incêndio a gás?" — opcoes: ["Sim", "Não", "Não sabem"] (não ofereça sprinkler como alternativa: sprinkler acionado em outra área do prédio molharia os equipamentos da sala de servidores sem necessidade — a proteção desse ambiente é detecção de fumaça, já perguntada no tema 6, e, se for o caso, sistema a gás). Sempre que a resposta for "não sabem", registre como pendência técnica seguindo a mecânica de pendências.',
    },
    {
      id: 12,
      rotulo: 'Telefonia',
      objetivo:
        'Pergunta 1: "Vocês têm uma central telefônica hoje?" — opcoes: ["Sim", "Não"]. Se sim, pergunta 2, mensagem separada: "Gostariam de continuar com ela no projeto novo, ou pensam em trocar?" — opcoes: ["Continuar com a atual", "Trocar por uma nova", "Ainda não sabemos"]; depois, pergunta 3, sem opções: "Sabem aproximadamente quantos ramais ou linhas precisam?". Se a resposta da pergunta 1 for não, pule direto para o próximo tema.',
    },
    {
      id: 13,
      rotulo: 'Conexões externas',
      objetivo:
        'Pergunta única, sem opções (a resposta pode incluir mais de um item): "Precisam de alguma ligação externa além da internet normal — por exemplo, alarme monitorado, TV a cabo ou antena de comunicação?".',
    },
    {
      id: 14,
      rotulo: 'Ligação entre andares',
      objetivo:
        'Pergunta 1: "Esse projeto vai envolver mais de um andar do prédio — seja porque o espaço ocupa mais de um andar, ou porque precisa se conectar com outro andar que vocês já usam?" — opcoes: ["Sim", "Não"]. Pergunta 2 só se a resposta for sim: "Sabem se essa ligação entre andares vai ser fibra óptica, cabo comum, ou é decisão do projeto?" — opcoes: ["Fibra óptica", "Cabo comum", "Decisão do projeto"]. Se a resposta da pergunta 1 for não, pule a pergunta 2 e siga para o próximo tema.',
    },
    {
      id: 15,
      rotulo: 'Ar-condicionado e conforto térmico',
      objetivo:
        'Pergunta 1: "O prédio já tem sistema de ar para reaproveitar ou vai ser tudo novo?" — opcoes: ["Sim, dá pra reaproveitar", "Não, vai ser tudo novo"]. Pergunta 2, mensagem separada, sem opções (a resposta é uma lista de ambientes específicos, não uma escolha fechada): "Tem alguma sala ou área que precisa de controle de temperatura próprio, separado do resto — por exemplo, sala da diretoria ou os phone booths? Quais?". Pergunta 3, mensagem separada: "Algum ambiente vai precisar de exaustor, tipo copa ou banheiro?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando quais. Pergunta 4, só se a empresa ocupa o espaço hoje (regra do imóvel do tema 1): "Tem alguma área que costuma ficar bem mais fria ou mais quente que o resto do espaço?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando qual área.',
    },
    {
      id: 16,
      rotulo: 'Armazenamento',
      objetivo:
        'Pergunta única, sem opções (a resposta pode incluir mais de um item): "Precisam guardar documentos físicos, arquivo morto, materiais ou equipamentos?". Se mencionarem documentos físicos ou arquivo morto, follow-up sem opções perguntando se tem algo que já pode ser digitalizado ou descartado antes da mudança.',
    },
    {
      id: 17,
      rotulo: 'Reaproveitamento de mobiliário e equipamentos',
      objetivo:
        'Aplicando a regra do imóvel do tema 1 (só pergunte se a empresa ocupa o espaço hoje; se for mudança para endereço novo, pule este tema sem comentário): "Tem móvel, equipamento ou material do espaço atual que vocês gostariam de levar/reaproveitar?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando o quê.',
    },
    {
      id: 18,
      rotulo: 'Mesa fixa ou compartilhada',
      objetivo:
        'Pergunta 1: "As pessoas têm mesa fixa, ou revezam entre mesas disponíveis?" — opcoes: ["Mesa fixa", "Revezam (hot-desking)", "Mistura dos dois"]. Pergunta 2 só se revezam, mensagem separada: "Vocês têm um sistema de reserva, ou é por ordem de chegada?" — opcoes: ["Sistema de reserva", "Ordem de chegada", "Ainda não pensaram"].',
    },
    {
      id: 19,
      rotulo: 'Complementos e fechamento',
      objetivo:
        'Pergunta de fechamento, sem opções: "Tem algo específico de infraestrutura que queira registrar e que não foi perguntado?". Esta é a última pergunta do roteiro — a mensagem de encerramento que vem depois dela (agradecendo e avisando que o resumo será gerado na tela) deve marcar encerrar como true.',
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
