/**
 * Roteiros de briefing.
 *
 * Cada roteiro e um objeto com id, nome e uma lista de temas. A lista de temas
 * define tanto o que a IA precisa cobrir quanto o indicador de progresso
 * ("Pergunta 3 de 6") mostrado na interface.
 *
 * Para adicionar um roteiro novo (ex: varejo, hotelaria, retrofit), basta
 * registrar outro objeto aqui e apontar BRIEFING_SCRIPT no .env.local para o id
 * dele. Nada mais no codigo precisa mudar.
 */

const corporativoBasico = {
  id: 'corporativo-basico',
  nome: 'Corporativo — descoberta ampliada',
  descricao:
    'Roteiro de descoberta para projetos de arquitetura corporativa, incorporando os pontos de um briefing técnico de referência (porte de equipe, mobiliário, reunioes, areas de apoio, tecnologia, sustentabilidade) — sempre em linguagem natural, nunca como formulario tecnico.',
  topics: [
    {
      id: 1,
      rotulo: 'Atuação da empresa',
      objetivo:
        'Entender o que a empresa faz, em que segmento atua e o porte/perfil da operação.',
    },
    {
      id: 2,
      rotulo: 'Cultura e identidade (indireta)',
      objetivo:
        'Descobrir o perfil cultural da empresa SEM perguntar diretamente "qual é a cultura de vocês" ou "qual o estilo de vocês" — a maioria das pessoas não sabe se autoanalisar assim, e a pergunta trava a conversa. Em vez disso, peça uma cena concreta do dia a dia que a pessoa consiga responder de cabeça: como as pessoas se vestem no escritório, se a reunião costuma ser marcada com antecedência ou resolvida de pé no corredor, o que acontece quando um cliente chega para uma visita. A partir da resposta concreta, é você (a IA) quem infere o perfil cultural — isso fica só no seu raciocínio interno e no resumo final, nunca é pedido ao cliente para nomear.',
    },
    {
      id: 3,
      rotulo: 'Porte e estrutura da equipe',
      objetivo:
        'Descobrir quantas pessoas trabalham na empresa hoje e como o time se organiza — se há áreas bem distintas (comercial, jurídico, RH, operação etc.) ou é um time mais enxuto e generalista. Esta é informação factual que o respondente sabe de cabeça, então pode perguntar de forma direta e simples, sem jargão de RH: algo como "hoje, quantas pessoas fazem parte do time, e dá pra separar isso em áreas ou é tudo mais junto?".',
    },
    {
      id: 4,
      rotulo: 'Espaços fechados e proximidade entre times',
      objetivo:
        'Descobrir se alguma posição de liderança ou área precisa de sala fechada/privada, e se existem times que fazem questão de ficar fisicamente próximos um do outro no dia a dia. Pergunta direta em linguagem simples, sem jargão como "sinergia entre equipes" ou "layout": algo como "tem alguém ou algum time que precisa de mais privacidade, tipo uma sala fechada? E tem times que fazem questão de estar sempre perto um do outro?".',
    },
    {
      id: 5,
      rotulo: 'Rotina e regime de trabalho (indireta)',
      objetivo:
        'Descobrir sinais sobre regime de trabalho sem usar jargão de RH/facilities (nunca pergunte "qual o regime de trabalho de vocês"). Pergunte de forma concreta e fácil de responder: num dia comum, o escritório costuma estar cheio ou tem gente trabalhando de casa também; se as pessoas sempre sentam no mesmo lugar ou isso muda. Infira presencial/híbrido e a necessidade de estações fixas ou compartilhadas a partir da resposta.',
    },
    {
      id: 6,
      rotulo: 'Mobiliário e o que aproveitar',
      objetivo:
        'Descobrir se há móveis do espaço atual que a empresa quer reaproveitar no projeto novo, e se quem não tem mesa fixa costuma guardar pertences em algum armário ou guarda-volumes individual. Pergunta direta: "tem algum móvel de hoje que vocês fazem questão de levar pro espaço novo, ou vai ser tudo novo? E quem não tem mesa fixa guarda as coisas em algum lugar, tipo um armário?".',
    },
    {
      id: 7,
      rotulo: 'Problema com o espaço atual',
      objetivo:
        'Identificar a principal frustração ou limitação com o espaço físico de hoje (ou, se ainda não ocupam um espaço, o que querem evitar). Se o cliente mencionar espontaneamente algo sobre banheiro, vestiário ou outra infraestrutura básica, registre isso — mas não pergunte diretamente sobre isso se não vier à tona sozinho.',
    },
    {
      id: 8,
      rotulo: 'Encontros e reuniões (indireta)',
      objetivo:
        'Entender a real necessidade de salas de reunião e áreas de colaboração sem perguntar diretamente "quantas salas de reunião vocês precisam" (pergunta técnica que o cliente não tem como calcular sozinho). Pergunte de forma concreta: quando surge uma reunião importante com cliente ou um bate-papo maior de equipe, isso acontece hoje num espaço reservado pra isso ou vira improviso. Infira a partir da resposta se falta espaço formal, informal, ou os dois. Se fizer sentido pelo porte ou segmento da empresa, pode complementar perguntando rapidamente se há necessidade de espaço para treinamento, gravação de conteúdo/podcast ou apresentações maiores — só quando for claramente relevante, sem forçar.',
    },
    {
      id: 9,
      rotulo: 'Áreas de apoio e o dia a dia',
      objetivo:
        'Entender a necessidade de áreas de apoio (recepção, copa/refeitório, área de descompressão, impressão, apoio de café) através de uma pergunta concreta sobre o dia a dia, nunca como lista técnica: algo como "quando alguém chega no escritório, como costuma ser recebido? E ao longo do dia, onde o time geralmente para pra tomar um café, almoçar ou dar uma respirada?". Se o cliente mencionar espontaneamente falta de vestiário, chuveiro ou banheiro adequado, registre como necessidade — não pergunte diretamente sobre isso.',
    },
    {
      id: 10,
      rotulo: 'Tecnologia e infraestrutura',
      objetivo:
        'Descobrir necessidades de tecnologia — controle de acesso, automação de iluminação/climatização, requisitos elétricos ou de dados, equipamentos específicos. Pergunta direta e simples: "tem alguma tecnologia que vocês já usam ou fazem questão de ter no novo espaço — controle de acesso, automação de luz e ar-condicionado, algum equipamento específico?".',
    },
    {
      id: 11,
      rotulo: 'Sustentabilidade',
      objetivo:
        'Descobrir se sustentabilidade é uma prioridade para a empresa — eficiência energética, certificação verde (LEED, WELL, AQUA) ou alguma prática que já seguem. Pergunta leve e direta: "sustentabilidade pesa nas decisões de vocês — tipo eficiência energética ou alguma certificação verde? Ou não é prioridade agora?". Se a resposta for neutra ou negativa, siga em frente sem insistir.',
    },
    {
      id: 12,
      rotulo: 'Sensação desejada',
      objetivo:
        'Entender como a empresa quer que o espaço faça as pessoas se sentirem — clientes/visitantes e colaboradores.',
    },
    {
      id: 13,
      rotulo: 'Referências admiradas',
      objetivo:
        'Levantar referências visuais, espaços ou outros escritórios que a empresa admira (e por quê).',
    },
    {
      id: 14,
      rotulo: 'Prioridade, prazo e complementos',
      objetivo:
        'Fechar perguntando o que é inegociável no projeto, e se já existe um prazo ou orçamento definido para a obra (sem pedir valor exato — só se já está decidido ou ainda em aberto, para o arquiteto saber se é uma pendência). Depois, abrir espaço para algo que o cliente queira registrar e não foi perguntado.',
    },
  ],
};

const scripts = new Map([[corporativoBasico.id, corporativoBasico]]);

export function getScript(id) {
  const script = scripts.get(id);
  if (!script) {
    const disponiveis = [...scripts.keys()].join(', ');
    throw new Error(`Roteiro de briefing "${id}" não existe. Disponíveis: ${disponiveis}`);
  }
  return script;
}

export function listScripts() {
  return [...scripts.values()].map(({ id, nome, descricao }) => ({ id, nome, descricao }));
}
