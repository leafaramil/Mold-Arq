/**
 * Roteiros de levantamento técnico.
 *
 * Cada roteiro é um objeto com id, nome e uma lista de temas. A lista de temas
 * define tanto o que a IA precisa cobrir quanto o indicador de progresso
 * ("Pergunta 3 de 20") mostrado na interface.
 *
 * Este roteiro é a versão final revisada pelo cliente (planilha original +
 * rodadas de ajuste de linguagem e de mecânica de resposta). Cobre tudo o que
 * a planilha técnica de referência pedia, sem cortar conteúdo — só traduzido
 * para perguntas que uma pessoa leiga consegue responder, e organizado para
 * caber numa conversa.
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
 * Campo `tabela` no tema: a interface mostra uma grade editável em vez da
 * caixa de texto normal — linhas padrão de ambiente, colunas numéricas, e um
 * botão para a pessoa adicionar mais ambientes. Ao confirmar, a grade vira
 * uma única resposta de texto (ex.: "Staff: 4 tomadas, 2 pontos de rede;
 * Gerente: 2 tomadas, 1 ponto de rede"), pelo mesmo canal de sempre.
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
        'Pergunta 1: "Esse projeto é uma reforma no espaço que vocês já ocupam hoje, ou uma mudança pra um endereço novo?" — opcoes: ["Reforma no espaço que já ocupamos hoje", "Mudança para um espaço novo"]. A resposta define a "regra do imóvel" usada em vários temas seguintes: só pergunte algo no presente sobre "hoje" se a empresa ocupa o espaço atual; se for mudança, pule essas perguntas sem comentário. Pergunta 2, mensagem separada, com a redação adaptada à resposta 1: se reforma, "Vocês têm o as-built do escritório atual?"; se mudança, "Vocês têm as plantas técnicas do novo espaço?" — opcoes: ["Sim", "Não"]. Se sim, pergunta 3, sem opções (pode ser mais de uma disciplina): "Quais disciplinas vocês têm — arquitetura, elétrica, ar-condicionado, dados e voz, combate a incêndio ou detecção de fumaça?". Pergunta 4, sem opções, é só um aviso antes do anexo: "Pode anexar todos os arquivos de uma vez pelo botão de anexo — selecione todos juntos no seletor, porque depois de enviar não dá pra abrir de novo nesse tema."',
    },
    {
      id: 2,
      rotulo: 'Lotação e perfil das estações de trabalho',
      objetivo:
        'Pergunta 1, sem opções: "Quantas pessoas trabalham hoje no local (ou vão trabalhar), e existe expectativa de crescimento? Quanto?". Pergunta 2, mensagem separada, sem opções: "Os postos de trabalho, de forma geral, usam desktop ou notebook? Têm monitores extras?". Pergunta 3, mensagem separada, sem opções: "A diretoria, a gerência ou alguma área específica tem uma configuração diferente dessa? Se sim, qual?".',
    },
    {
      id: 3,
      rotulo: 'Norma interna de instalação elétrica',
      permiteAnexo: true,
      objetivo:
        'Pergunta direta: "A empresa tem algum manual ou norma interna que a instalação elétrica precisa seguir?" — opcoes: ["Sim", "Não"]. Se sim, peça para anexar o documento pelo botão de anexo (não peça para descrever o conteúdo por texto).',
    },
    {
      id: 4,
      rotulo: 'Iluminação',
      objetivo:
        'Pergunta 1: "Nas salas fechadas, preferem interruptor na parede ou sensor de presença automático?" — opcoes: ["Interruptor na parede", "Sensor de presença automático", "Não sabem, tanto faz"]. Se a resposta for "interruptor na parede", pergunta 2, sem opções: "Onde fica o comando — na parede, na divisória, ou por automação — e em quais salas?". Se a resposta da pergunta 1 for "sensor de presença" ou "não sabem", pergunta 2 alternativa: "O comando é no quadro geral (manual), no quadro geral (com temporizador), interruptor na área do staff, ou sensor de presença?" — opcoes: ["Quadro geral (manual)", "Quadro geral (com temporizador)", "Interruptor na área do staff", "Sensor de presença"]. Pergunta 3, mensagem separada: "Tem algum ambiente que gostariam de ter luz com intensidade ajustável (dimmer)?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando quais ambientes. Pergunta 4, mensagem separada: "Precisam de automação de iluminação em algum ambiente?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando quais.',
    },
    {
      id: 5,
      rotulo: 'Infraestrutura elétrica do prédio',
      objetivo:
        'Pergunta 1: "A infraestrutura elétrica vai correr sob piso elevado, sobre o forro, ou isso ainda é decisão do projeto técnico?" — opcoes: ["Sob piso elevado", "Sobre o forro", "Decisão do projeto técnico"]. Pergunta 2, mensagem separada: "Sabem qual a voltagem de entrada de energia do prédio?" — opcoes: ["110V", "220V", "380V", "Não sabem"]. Pergunta 3, sem opções: "Sabem quanta carga elétrica está disponível no andar, em kVA?" (se não souberem, registre como pendência técnica). Pergunta 4: "Vocês vão precisar de transformador elétrico?" — opcoes: ["Sim", "Não", "Não sabem"]; se sim, follow-up: "Ele já existe, vai ser novo, ou isso ainda é decisão do projeto técnico?" — opcoes: ["Já existe", "Vai ser novo", "Decisão do projeto técnico"]; depois, follow-up: "Quem vai fornecer o transformador — vocês mesmos, ou a Space Plan?" — opcoes: ["Nós mesmos", "Space Plan"].',
    },
    {
      id: 6,
      rotulo: 'Segurança e acesso',
      objetivo:
        'Pergunta 1: "Vão ter controle de acesso?" — opcoes: ["Sim", "Não", "Não sabem ainda"]. Se sim, pergunta 2: "Que tipo?" — opcoes: ["Crachá", "Catraca", "Biometria", "Reconhecimento facial"]; pergunta 3, sem opções: "Em quais ambientes?"; pergunta 4, sem opções: "O sistema vai ser reaproveitado, e se sim, sabem o modelo do equipamento atual?"; pergunta 5: "Esse controle vai ser unificado com o sistema do condomínio?" — opcoes: ["Sim", "Não", "Não sabem"]; pergunta 6: "Vai ser unificado com o sistema de outro site da empresa?" — opcoes: ["Sim", "Não", "Não sabem"]. Pergunta 7, mensagem separada: "Vão ter câmeras de segurança? Onde?" — sem opções (o local varia); se a pessoa mencionar câmeras em banheiros, vestiários ou copa/refeitório, avise gentilmente que a LGPD não permite por violar privacidade, e sugira reposicionar — isso é um alerta legal, não uma opção entre outras. Se vão ter câmeras, pergunta 8, sem opções: "Quantas câmeras, aproximadamente, e o sistema atual vai ser reaproveitado? Se sim, sabem o modelo?". Pergunta 9, mensagem separada: "O prédio já tem sistema de detecção de fumaça?" — opcoes: ["Sim", "Não", "Não sabem"]; se sim, follow-up sem opções perguntando quantos detectores aproximadamente e, se for reaproveitar, o modelo.',
    },
    {
      id: 7,
      rotulo: 'Energia crítica',
      objetivo:
        'Pergunta 1, sem opções (pode citar mais de um equipamento): "Se faltar luz, tem algum equipamento que não pode parar de jeito nenhum, tipo servidor ou sistema de segurança?". Pergunta 2: "Vão precisar de estabilizador de voltagem?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções: "Em quais locais — por exemplo staff, gerência, diretoria, salas de reunião, phone booth, recepção, sala de servidores, impressoras?". Pergunta 3: "Vão ter no-break/UPS?" — opcoes: ["Sim", "Não"]; se sim, follow-up: "Já existe ou vai ser novo?" — opcoes: ["Já existe", "Vai ser novo"]; depois, sem opções: "Em quais locais (mesma lista de antes)?". Pergunta 4: "O prédio tem gerador de emergência?" — opcoes: ["Sim", "Não"]; se sim, follow-up: "É do condomínio, da empresa, ou vai ser novo?" — opcoes: ["Do condomínio", "Da empresa", "Vai ser novo"]; depois, sem opções: "Quais sistemas ele precisa atender — por exemplo estações de trabalho, salas de reunião, equipamento de audiovisual, sala de servidores, impressoras, ar-condicionado, iluminação, portas automáticas?".',
    },
    {
      id: 8,
      rotulo: 'Salas de reunião, recepção e videoconferência',
      objetivo:
        'Pergunta 1: "As salas de reunião vão precisar de TV ou projetor para chamada de vídeo?" — opcoes: ["Sim", "Não"]. Pergunta 2, mensagem separada: "Precisam de automação de multimídia — um painel único controlando TV, som e luz da sala?" — opcoes: ["Sim", "Não"]. Se ao longo da conversa ficar claro que o time trabalha de forma híbrida (parte remota), pergunte também, mensagem separada: "A experiência de quem entra remoto nas reuniões hoje costuma ser boa ou frustrante?" — opcoes: ["Boa", "Frustrante", "Não fazemos reuniões híbridas"]; se frustrante, follow-up sem opções perguntando o que costuma atrapalhar.',
    },
    {
      id: 9,
      rotulo: 'Internet e rede',
      objetivo:
        'Pergunta única, sem opções: "As pessoas trabalham só por wifi, ou também precisam de cabo de rede na mesa?". Se a resposta indicar que é só wifi, follow-up sem opções: "Mesmo assim, tem algum equipamento que precisa de cabo — tipo impressora ou o próprio roteador de wifi?".',
    },
    {
      id: 10,
      rotulo: 'Rede de dados (cabeamento e wifi)',
      objetivo:
        'Pergunta 1, já explicando o termo técnico dentro da própria pergunta: "Em escritórios, o normal é toda a rede de cabos seguir um padrão único e organizado, chamado de cabeamento estruturado — é isso que vamos considerar aqui, a não ser que a empresa tenha alguma exigência diferente. Tem alguma exigência específica de rede que devemos seguir?" — opcoes: ["Não, sigam o padrão comum", "Sim, temos uma exigência"]; se sim, follow-up sem opções perguntando qual, e se já usam uma marca e categoria específica em outros sites da empresa. Pergunta 2, mensagem separada, sem opções: "Quantos pontos de wifi por andar vocês estimam precisar, e eles costumam ficar fixados no forro ou na parede?".',
    },
    {
      id: 11,
      rotulo: 'Servidores e sala técnica (CPD)',
      objetivo:
        'Pergunta 1: "A empresa guarda servidor físico no escritório ou está tudo na nuvem?" — opcoes: ["Físico no escritório", "Na nuvem", "Os dois"]. Se físico ou os dois: pergunta 2: "Já existe um rack para os servidores, pra reaproveitar, ou vai ser novo?" — opcoes: ["Já existe", "Vai ser novo", "Não sabem"]; se já existe, follow-up sem opções perguntando o modelo. Pergunta 3: "E o rack de distribuição — switches e patch panels, separado do rack de servidor — já existe ou vai ser novo?" — opcoes: ["Já existe", "Vai ser novo", "Não sabem"]; se já existe, follow-up sem opções perguntando o modelo. Pergunta 4: "A ativação técnica dos equipamentos de rede fica com a Space Plan, ou com a equipe de TI de vocês?" — opcoes: ["Space Plan", "Nossa equipe de TI", "Não sabem ainda"]. Pergunta 5: "A sala de servidores precisa de ar-condicionado ligado 24 horas?" — opcoes: ["Sim", "Não", "Não sabem"]; se sim, follow-up: "Precisa de um sistema reserva (backup)?" — opcoes: ["Sim", "Não", "Não sabem"]; se sim, follow-up: "Esse backup entra automaticamente se o principal falhar?" — opcoes: ["Sim", "Não", "Não sabem"]. Pergunta 6: "Essa sala vai ter sistema de combate a incêndio a gás?" — opcoes: ["Sim", "Não", "Não sabem"]. Pergunta 7, sem opções: "Qual o tamanho mínimo que a sala de servidores precisa ter — em m² ou dimensões aproximadas?". Pergunta 8, sem opções: "Qual a potência elétrica dedicada pra essa sala, em kVA?" (pendência técnica se não souberem). Pergunta 9: "Vai ter cabeamento entre os racks dentro da sala?" — opcoes: ["Sim", "Não", "Não sabem"]; se sim, follow-up: "De que tipo — cat6, cat6a, fibra multimodo, ou fibra monomodo?" — opcoes: ["Cat6", "Cat6a", "Fibra multimodo", "Fibra monomodo", "Não sabem"]; depois, sem opções: "Sabem a velocidade necessária?". Sempre que a resposta for "não sabem", registre como pendência técnica seguindo a mecânica de pendências.',
    },
    {
      id: 12,
      rotulo: 'Telefonia',
      objetivo:
        'Pergunta 1: "O telefone funciona pela internet (VoIP) ou é central tradicional?" — opcoes: ["VoIP (pela internet)", "Central tradicional", "Não sabem"]. Pergunta 2, mensagem separada: "Têm uma central hoje?" — opcoes: ["Sim", "Não"]; se sim, follow-up: "Querem manter a atual, ou trocar?" — opcoes: ["Manter", "Trocar"]. Pergunta 3, sem opções: "Quantos ramais, aproximadamente?". Pergunta 4, sem opções: "Quantas linhas diretas, aproximadamente?". Pergunta 5: "Precisam de link E1?" — opcoes: ["Sim", "Não", "Não sabem"].',
    },
    {
      id: 13,
      rotulo: 'Conexões externas',
      objetivo:
        'Pergunta 1, sem opções (pode incluir mais de um item): "Precisam de alguma ligação externa além da internet normal — por exemplo, alarme monitorado, TV a cabo, antena de comunicação, dados por fibra, dados UTP, linha de voz, ou agência de notícias?". Pergunta 2, mensagem separada: "Se a internet cair, isso afeta a operação de vocês?" — opcoes: ["Sim", "Não"]; se sim, ao invés de fazer nova pergunta, registre como recomendação no resumo final que vale prever um segundo link de internet como backup.',
    },
    {
      id: 14,
      rotulo: 'Ligação entre andares',
      objetivo:
        'Pergunta 1: "Esse projeto envolve mais de um andar do prédio?" — opcoes: ["Sim", "Não"]. Se sim, pergunta 2: "Sabem se essa ligação entre andares vai ser fibra óptica, cabo comum, ou é decisão do projeto?" — opcoes: ["Fibra óptica", "Cabo comum", "Decisão do projeto"]; depois, sem opções: "Quantos cabos ou fibras, aproximadamente?". Se a resposta da pergunta 1 for não, pule as demais e siga para o próximo tema.',
    },
    {
      id: 15,
      rotulo: 'Ar-condicionado e conforto térmico',
      objetivo:
        'Pergunta 1: "O prédio já tem sistema de ar para reaproveitar, ou vai ser tudo novo?" — opcoes: ["Sim, dá pra reaproveitar", "Não, vai ser tudo novo"]; se reaproveitar, follow-up sem opções perguntando marca/tipo se souberem. Pergunta 2, mensagem separada, sem opções: "Alguma sala precisa de controle de temperatura próprio? Quais?". Pergunta 3: "Algum ambiente vai precisar de exaustor, tipo copa ou banheiro?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando quais. Pergunta 4: "As salas de reunião costumam servir café ou algo que gere odor?" — opcoes: ["Sim", "Não"]. Pergunta 5: "Precisam de ar-condicionado funcionando fora do horário comercial?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando em quais áreas. Pergunta 6, só se a empresa ocupa o espaço hoje (regra do imóvel do tema 1): "Tem alguma área que costuma ficar bem mais fria ou mais quente que o resto do espaço?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando qual área.',
    },
    {
      id: 16,
      rotulo: 'Armazenamento',
      objetivo:
        'Pergunta única, sem opções (pode incluir mais de um item): "Precisam guardar documentos físicos, arquivo morto, materiais ou equipamentos?". Se mencionarem documentos físicos ou arquivo morto, follow-up sem opções perguntando se tem algo que já pode ser digitalizado ou descartado antes da mudança.',
    },
    {
      id: 17,
      rotulo: 'Reaproveitamento de mobiliário e equipamentos',
      objetivo:
        'Este tema só se aplica a quem está de mudança para um endereço novo (regra do imóvel do tema 1) — se for reforma no espaço atual, pule este tema sem comentário. "Tem móvel ou equipamento do espaço atual que vocês gostariam de levar para o novo endereço?" — opcoes: ["Sim", "Não"]; se sim, follow-up sem opções perguntando o quê.',
    },
    {
      id: 18,
      rotulo: 'Mesa fixa ou compartilhada',
      objetivo:
        'Pergunta 1: "As pessoas têm mesa fixa, ou revezam entre mesas disponíveis?" — opcoes: ["Mesa fixa", "Revezam (hot-desking)", "Mistura dos dois"]. Se revezam: pergunta 2: "Vocês têm um sistema de reserva, ou é por ordem de chegada?" — opcoes: ["Sistema de reserva", "Ordem de chegada", "Ainda não pensaram"]; pergunta 3, sem opções: "Pensando em quantas mesas o grupo vai ter à disposição — vocês têm ideia de quantas mesas gostariam de ter pra suprir a demanda do dia?". Se o mobiliário já estiver definido, pergunta 4: "As tomadas dos postos de trabalho ficam em caixa de piso, régua na superfície da mesa, régua no rodapé do painel, na parede, ou parede com rodapé eletrificado?" — opcoes: ["Caixa de piso", "Régua na superfície da mesa", "Régua no rodapé do painel", "Na parede", "Parede com rodapé eletrificado", "Ainda não sabem"].',
    },
    {
      id: 19,
      rotulo: 'Tomadas e pontos de rede por tipo de posto',
      tabela: {
        colunas: ['Tomadas', 'Pontos de rede'],
        ambientesPadrao: ['Staff', 'Gerente', 'Diretor', 'Sala de reunião', 'Phone Booth', 'Recepção', 'Impressoras'],
      },
      objetivo:
        'Pergunta 1: a interface mostra uma tabela editável (linhas de ambiente pré-preenchidas, colunas de tomadas e pontos de rede, com opção de adicionar mais ambientes) — a pessoa preenche e confirma, e a resposta chega como texto no formato "Ambiente: X tomadas, Y pontos de rede" para cada linha preenchida. Não repita essa pergunta em palavras, ela é feita pela própria interface; quando a resposta chegar, agradeça brevemente e siga sem tentar reformular os números. Pergunta 2, mensagem separada, sem opções: "Que equipamentos de uso específico vão precisar de ponto próprio — por exemplo copiadora, impressora, filtro de água, micro-ondas, cafeteira, máquina de bebidas, geladeira ou frigobar? Sabem a voltagem (110V, 220V ou bivolt) e a potência aproximada de cada um?".',
    },
    {
      id: 20,
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
