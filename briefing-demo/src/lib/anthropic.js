/**
 * Camada de acesso ao Claude.
 *
 * Duas operações: a próxima fala do entrevistador (nextQuestion) e o resumo
 * final estruturado (buildSummary). Ambas usam structured outputs, então o
 * servidor sempre recebe um objeto validado contra um schema — nada de parsear
 * texto livre.
 *
 * Sem ANTHROPIC_API_KEY configurada, o módulo cai para o roteiro offline de
 * src/lib/offlineFallback.js e marca a sessão como "modo demonstração".
 */

import Anthropic from '@anthropic-ai/sdk';
import { config, hasApiKey } from '../config.js';
import {
  buildConversationSystemPrompt,
  buildSummarySystemPrompt,
  conversationSchema,
  summarySchema,
} from './prompts.js';
import * as offline from './offlineFallback.js';

const client = hasApiKey ? new Anthropic({ apiKey: config.apiKey }) : null;

export const usingLiveApi = hasApiKey;

function textOf(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function parseStructured(response, contexto) {
  if (response.stop_reason === 'refusal') {
    throw new Error(`O modelo recusou a solicitação (${contexto}).`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Resposta truncada pelo limite de tokens (${contexto}).`);
  }
  const raw = textOf(response);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Não foi possível interpretar a resposta do modelo (${contexto}).`);
  }
}

/**
 * Próxima mensagem do entrevistador.
 *
 * @param {object} session estado da sessão (ver store/sessionStore.js)
 * @param {{ forcarEncerramento?: boolean }} opcoes
 * @returns {Promise<{mensagem: string, topico: number, encerrar: boolean}>}
 */
export async function nextQuestion(session, { forcarEncerramento = false } = {}) {
  if (!client) {
    return offline.nextQuestion(session, { forcarEncerramento });
  }

  // A API exige que a conversa comece por um turno do usuário, e no início do
  // briefing ainda não existe nenhum. Este turno de abertura carrega os dados
  // do formulário e não é exibido no chat.
  const messages = [
    {
      role: 'user',
      content: `Sou ${session.respondente}, da empresa ${session.empresa}. Pode começar o briefing.`,
    },
    ...session.messages.map(({ role, content }) => ({ role, content })),
  ];

  if (forcarEncerramento) {
    // Canal de operador: mensagem de sistema no meio da conversa (suportada no
    // Claude Opus 5). Diferente de texto no turno do usuário, isto não pode ser
    // forjado por quem está respondendo o briefing.
    messages.push({
      role: 'system',
      content:
        'Esta é a sua última mensagem nesta conversa. Agradeça em uma ou duas frases, avise que o resumo será gerado na tela e marque encerrar como true, mesmo que algum tema tenha ficado incompleto.',
    });
  }

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 4000,
    system: buildConversationSystemPrompt({
      script: session.script,
      empresa: session.empresa,
      respondente: session.respondente,
      maxAiTurns: config.maxAiTurns,
    }),
    messages,
    output_config: {
      effort: 'low', // conversa de chat: prioriza latência
      format: { type: 'json_schema', schema: conversationSchema },
    },
  });

  const parsed = parseStructured(response, 'condução da entrevista');
  return {
    mensagem: String(parsed.mensagem || '').trim(),
    topico: Number(parsed.topico) || 1,
    encerrar: Boolean(parsed.encerrar) || forcarEncerramento,
  };
}

/**
 * Resumo estruturado do briefing.
 *
 * @param {object} session
 * @returns {Promise<{perfil: string, necessidades: string[], recomendacoes: string[]}>}
 */
export async function buildSummary(session) {
  if (!client) {
    return offline.buildSummary(session);
  }

  const transcricao = session.messages
    .map((m) => `${m.role === 'user' ? session.respondente : 'Entrevistador'}: ${m.content}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 8000,
    system: buildSummarySystemPrompt({
      script: session.script,
      empresa: session.empresa,
      respondente: session.respondente,
    }),
    messages: [
      {
        role: 'user',
        content: `Transcrição da entrevista de briefing:\n\n<transcricao>\n${transcricao}\n</transcricao>\n\nGere o resumo estruturado.`,
      },
    ],
    output_config: {
      effort: 'medium', // documento final: vale um pouco mais de cuidado
      format: { type: 'json_schema', schema: summarySchema },
    },
  });

  const parsed = parseStructured(response, 'geração do resumo');
  return {
    perfil: String(parsed.perfil || '').trim(),
    necessidades: (parsed.necessidades || []).map((i) => String(i).trim()).filter(Boolean),
    recomendacoes: (parsed.recomendacoes || []).map((i) => String(i).trim()).filter(Boolean),
  };
}
