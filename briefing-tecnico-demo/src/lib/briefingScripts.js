/**
 * Roteiros de levantamento técnico.
 *
 * Cada roteiro e um objeto com id, nome e uma lista de temas. A lista de temas
 * define tanto o que a IA precisa cobrir quanto o indicador de progresso
 * ("Pergunta 3 de 15") mostrado na interface.
 *
 * Este roteiro traduz um levantamento de infraestrutura (o tipo de planilha
 * que um engenheiro preenche, cheia de kVA, categoria de cabeamento, specs de
 * rack) para uma conversa que qualquer pessoa da empresa — dono, RH,
 * facilities, TI — consegue responder sem ajuda. Onde a resposta certa exige
 * um engenheiro de verdade, o objetivo do tema já instrui a IA a anotar o
 * contato técnico em vez de cobrar um número da pessoa.
 *
 * Para adicionar um roteiro novo, registre outro objeto aqui e aponte
 * BRIEFING_SCRIPT no .env.local para o id dele.
 */

const tecnicoBasico = {
  id: 'tecnico-basico',
  nome: 'Levantamento técnico — infraestrutura',
  descricao:
    'Levantamento de infraestrutura para projetos de arquitetura corporativa (eletrica, rede, seguranca, ar-condicionado, servidores), traduzido para perguntas que uma pessoa leiga consegue responder sem apoio tecnico.',
  topics: [
    {
      id: 1,
      rotulo: 'Função de quem responde',
      objetivo:
        'Descobrir a função da pessoa na empresa (dono, RH, facilities, TI etc.) — isso ajuda a interpretar o resto das respostas depois. Pergunta simples e direta logo na abertura, como parte de se apresentar: "qual sua função aí na empresa?".',
    },
    {
      id: 2,
      rotulo: 'Situação do espaço',
      objetivo:
        'Descobrir se a empresa está (a) reformando ou ocupando um espaço que já usa hoje, (b) de mudança para um imóvel novo já definido mas ainda não ocupado, ou (c) ainda procurando imóvel. Pergunta direta e simples: "vocês estão reformando o espaço que já usam hoje, já têm um imóvel novo definido, ou ainda estão procurando?". Esta resposta é importante: nos casos (b) e (c), NUNCA pergunte depois no presente como se houvesse um "hoje" pra descrever (ex.: "o wifi de hoje cobre bem?") — pule essas perguntas ou reformule para o futuro/desejo, sem pedir para a pessoa "imaginar" uma experiência que ela nunca teve.',
    },
    {
      id: 3,
      rotulo: 'Escopo do levantamento',
      objetivo:
        'Descobrir se o levantamento é para o escritório inteiro ou só para algumas áreas específicas (ex.: só recepção e salas de reunião, sem mexer na área de trabalho). Pergunta direta: "esse levantamento é para o espaço inteiro, ou só para algumas áreas específicas?". A partir da resposta, pule sem comentário qualquer pergunta de um tema seguinte que trate de uma área fora do escopo — perguntar sobre área fora do escopo sinaliza que você não escutou.',
    },
    {
      id: 4,
      rotulo: 'Tomadas de energia e equipamentos de mesa (indireta)',
      objetivo:
        'Descobrir a necessidade real de tomadas SEM perguntar "quantas tomadas vocês precisam" (pergunta técnica que ninguém sabe calcular de cabeça). Pergunte de forma concreta: como é o computador que as pessoas usam (notebook ou desktop, quantos monitores), e se usam alguma estação de acoplamento (dock, pra ligar o notebook a monitor e teclado com um cabo só) ou impressora na própria mesa. A partir da resposta, você mesmo propõe uma quantidade preliminar de tomadas (ex.: notebook + 2 monitores + dock costuma pedir umas 6 tomadas) e pergunta se faz sentido pra realidade deles. Se a área de trabalho estiver fora do escopo (tema anterior), pergunte o equivalente só para as áreas do escopo (o que precisa de energia numa sala de reunião ou recepção: tela, videoconferência, notebook de visitante).',
    },
    {
      id: 5,
      rotulo: 'Segurança e acesso',
      objetivo:
        'Descobrir se vão ter controle de acesso (crachá, catraca, biometria, reconhecimento facial) e câmeras de segurança, e onde. Perguntas diretas e simples, uma de cada vez. Se a pessoa mencionar câmeras em banheiros, vestiários ou copa/refeitório, avise gentilmente que a LGPD não permite câmeras nesses ambientes por violar privacidade, e sugira reposicionar para entradas e áreas comuns — isso é um alerta legal, não uma opção entre outras. Pergunte também, numa mensagem separada, se o prédio já tem alarme de incêndio.',
    },
    {
      id: 6,
      rotulo: 'Salas de reunião e videoconferência',
      objetivo:
        'Descobrir se as salas de reunião vão precisar de TV ou projetor para chamada de vídeo. Se ao longo da conversa ficar claro que o time trabalha de forma híbrida (parte remota), pergunte também se a experiência de quem entra remoto nas reuniões hoje costuma ser boa ou frustrante, e proponha como recomendação que pelo menos uma sala seja preparada para isso (câmera, microfone que pega a sala toda, tratamento acústico) — a qualidade da sala de videochamada costuma importar mais que o tamanho dela.',
    },
    {
      id: 7,
      rotulo: 'Energia crítica',
      objetivo:
        'Descobrir se, numa falta de luz, algum equipamento não pode parar (servidor, sistema de segurança) e se vão precisar de no-break. Pergunta direta e simples: "se faltar luz, tem algum equipamento que não pode parar de jeito nenhum, tipo servidor ou sistema de segurança?". Não peça capacidade em kVA nem specs de transformador — se a pessoa não souber os detalhes técnicos, sugira anotar o contato do síndico ou do time de TI para essa parte, e registre como pendência técnica.',
    },
    {
      id: 8,
      rotulo: 'Internet e rede',
      objetivo:
        'Descobrir se as pessoas trabalham só por wifi ou também precisam de cabo de rede na mesa. Aplicando a regra da situação do espaço: só se a empresa já ocupa um espaço hoje, pergunte também (mensagem separada) se o wifi de hoje cobre bem o espaço todo. Não pergunte quantidade de pontos de acesso nem categoria de cabeamento — isso é dimensionamento técnico do instalador, não algo que a pessoa saiba de cabeça.',
    },
    {
      id: 9,
      rotulo: 'Servidores',
      objetivo:
        'Descobrir se a empresa guarda servidor físico no escritório ou está tudo na nuvem. Se físico, pergunte (mensagem separada) se sabem o tamanho aproximado do equipamento ou quantos equipamentos são — de forma simples, tipo "cabe numa mesa pequena, num armário, ou é uma sala inteira?", nunca pedindo medidas exatas. Se a pessoa não souber, sugira anotar o contato do TI.',
    },
    {
      id: 10,
      rotulo: 'Ar-condicionado, conforto térmico e qualidade do ar',
      objetivo:
        'Descobrir se o prédio já tem sistema de ar para reaproveitar ou se vai ser tudo novo. Aplicando a regra da situação do espaço (só se ocupam o espaço hoje), pergunte também, em mensagens separadas: se tem alguma área que vira "geladeira" ou "sauna" hoje, ou brigas por causa do controle remoto do ar-condicionado; e se em salas de reunião fechadas e cheias o ar costuma ficar pesado ou abafado. Se a empresa ainda não ocupa espaço hoje, não peça para "imaginar" — registre você mesmo, como recomendação preliminar, que salas de reunião fechadas merecem atenção extra de ventilação.',
    },
    {
      id: 11,
      rotulo: 'Armazenamento',
      objetivo:
        'Descobrir se a empresa precisa guardar documentos físicos, arquivo morto, materiais ou equipamentos, e se tem algo que já pode ser digitalizado ou descartado antes da mudança. Pergunta direta e simples.',
    },
    {
      id: 12,
      rotulo: 'Reaproveitamento de mobiliário e equipamentos',
      objetivo:
        'Aplicando a regra da situação do espaço (só se existe espaço atual em uso): descobrir se existe móvel, equipamento ou material do espaço atual que a empresa gostaria de levar/reaproveitar, em vez de comprar tudo novo. Se a empresa ainda não ocupa espaço hoje, pule este tema sem comentário.',
    },
    {
      id: 13,
      rotulo: 'Mesa fixa ou compartilhada',
      objetivo:
        'Descobrir se as pessoas têm mesa fixa ou se revezam (hot-desking). Pergunta direta: "as pessoas têm uma mesa fixa cada uma, ou revezam entre mesas disponíveis?". Se revezam, pergunte numa mensagem separada se já imaginam algum sistema de reserva (aplicativo, totem) ou se funciona por ordem de chegada mesmo. Se todo mundo tem mesa fixa, siga em frente sem perguntar sobre reserva.',
    },
    {
      id: 14,
      rotulo: 'Documentação existente',
      objetivo:
        'Aplicando a regra da situação do espaço (só se existe espaço atual em uso): descobrir se a empresa já tem as plantas do espaço de hoje (arquitetura, elétrica, ar-condicionado) e se têm aprovação da prefeitura de alguma reforma anterior no local. Pergunta direta e simples: "vocês têm as plantas do espaço atual — arquitetura, elétrica, ar-condicionado? E aprovação da prefeitura de alguma reforma anterior, se houve?". Se a empresa ainda não ocupa espaço hoje, pule este tema sem comentário.',
    },
    {
      id: 15,
      rotulo: 'Complementos',
      objetivo:
        'Fechar perguntando se tem algo específico de infraestrutura que a pessoa queira registrar e que não foi perguntado. Se ao longo da conversa surgiu algum item genuinamente técnico sem resposta clara (capacidade elétrica do prédio, especificação de cabeamento, sistema de supressão de incêndio para sala de servidor), confirme se a pessoa tem o contato de alguém técnico (síndico, TI, engenheiro do prédio) para essas pendências específicas, e registre esse contato no resumo.',
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
