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
  nome: 'Corporativo — descoberta inicial',
  descricao:
    'Roteiro enxuto de descoberta para projetos de arquitetura corporativa: negocio, cultura (via pistas concretas), regime de trabalho, reunioes, dores do espaco atual, sensacao desejada, referencias e prioridades.',
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
      rotulo: 'Rotina e regime de trabalho (indireta)',
      objetivo:
        'Descobrir sinais sobre regime de trabalho e porte da equipe sem usar jargão de RH/facilities (nunca pergunte "qual o regime de trabalho de vocês" ou peça headcount exato por cargo). Pergunte de forma concreta e fácil de responder: num dia comum, o escritório costuma estar cheio ou tem gente trabalhando de casa também; se as pessoas sempre sentam no mesmo lugar ou isso muda. Infira presencial/híbrido e a necessidade de estações fixas ou compartilhadas a partir da resposta.',
    },
    {
      id: 4,
      rotulo: 'Problema com o espaço atual',
      objetivo:
        'Identificar a principal frustração ou limitação com o espaço físico de hoje (ou, se ainda não ocupam um espaço, o que querem evitar).',
    },
    {
      id: 5,
      rotulo: 'Encontros e reuniões (indireta)',
      objetivo:
        'Entender a real necessidade de salas de reunião e áreas de colaboração sem perguntar diretamente "quantas salas de reunião vocês precisam" (pergunta técnica que o cliente não tem como calcular sozinho). Pergunte de forma concreta: quando surge uma reunião importante com cliente ou um bate-papo maior de equipe, isso acontece hoje num espaço reservado pra isso ou vira improviso. Infira a partir da resposta se falta espaço formal, informal, ou os dois.',
    },
    {
      id: 6,
      rotulo: 'Sensação desejada',
      objetivo:
        'Entender como a empresa quer que o espaço faça as pessoas se sentirem — clientes/visitantes e colaboradores.',
    },
    {
      id: 7,
      rotulo: 'Referências admiradas',
      objetivo:
        'Levantar referências visuais, espaços ou outros escritórios que a empresa admira (e por quê).',
    },
    {
      id: 8,
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
