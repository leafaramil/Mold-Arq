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
    'Roteiro enxuto de descoberta para projetos de arquitetura corporativa: negocio, cultura, dores do espaco atual, sensacao desejada e referencias.',
  topics: [
    {
      id: 1,
      rotulo: 'Atuação da empresa',
      objetivo:
        'Entender o que a empresa faz, em que segmento atua e o porte/perfil da operação.',
    },
    {
      id: 2,
      rotulo: 'Cultura e identidade',
      objetivo:
        'Descobrir como a empresa descreveria a própria cultura e identidade em poucas palavras — o jeito de trabalhar, o clima interno.',
    },
    {
      id: 3,
      rotulo: 'Problema com o espaço atual',
      objetivo:
        'Identificar a principal frustração ou limitação com o espaço físico de hoje (ou, se ainda não ocupam um espaço, o que querem evitar).',
    },
    {
      id: 4,
      rotulo: 'Sensação desejada',
      objetivo:
        'Entender como a empresa quer que o espaço faça as pessoas se sentirem — clientes/visitantes e colaboradores.',
    },
    {
      id: 5,
      rotulo: 'Referências admiradas',
      objetivo:
        'Levantar referências visuais, espaços ou outros escritórios que a empresa admira (e por quê).',
    },
    {
      id: 6,
      rotulo: 'Prioridade e complementos',
      objetivo:
        'Fechar com o que é inegociável no projeto e abrir espaço para algo que o cliente queira registrar e não foi perguntado.',
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
