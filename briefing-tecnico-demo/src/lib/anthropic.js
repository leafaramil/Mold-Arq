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

const client = hasApiKey
  ? new Anthropic({
      apiKey: config.apiKey,
      timeout: config.anthropicTimeoutMs,
      // Padrão do SDK é 2 tentativas extras (3 no total). Para chat
      // interativo isso multiplica demais a espera numa falha real; 1
      // tentativa extra já cobre uma instabilidade passageira de rede.
      maxRetries: 1,
    })
  : null;

export const usingLiveApi = hasApiKey;

/** Erro cuja mensagem pode ser mostrada ao usuário final. */
function erroPublico(mensagem) {
  const erro = new Error(mensagem);
  erro.publico = true;
  return erro;
}

/**
 * Traduz falhas da API em mensagens que alguém não técnico entenda.
 * O erro original continua no log do servidor.
 */
function traduzirErro(err) {
  console.error('Falha na chamada à API da Anthropic:', err?.status, err?.message);

  if (err?.status === 401 || err?.status === 403) {
    return erroPublico(
      'A chave da API não foi aceita. Confira se ela está correta e ainda ativa no arquivo .env.local.',
    );
  }
  if (err?.status === 429) {
    return erroPublico('Limite de uso da API atingido. Espere alguns instantes e tente de novo.');
  }
  if (err?.status >= 500 || err?.status === 529) {
    return erroPublico('O serviço da Anthropic está instável agora. Tente novamente em alguns segundos.');
  }
  if (err?.name === 'APIConnectionTimeoutError' || /timed?\s*out/i.test(err?.message || '')) {
    return erroPublico('A resposta da IA demorou demais e foi cancelada. Tente enviar de novo.');
  }
  if (err?.name === 'APIConnectionError' || err?.code === 'ENOTFOUND') {
    return erroPublico('Não foi possível falar com a API. Verifique sua conexão com a internet.');
  }
  return err;
}

/**
 * Rede de segurança contra artefatos raros de geração: em testes reais já
 * apareceu texto de controle vazando pra dentro do campo "mensagem" (ex.:
 * "...?<reasoning_effort>medium</{{" ou uma resposta que era só ","), mesmo
 * com "thinking" desligado. Isso nunca deveria acontecer, mas se acontecer é
 * melhor limpar o resíduo do que mostrar ao cliente.
 */
function limparMensagem(texto) {
  let limpo = texto.replace(/<\/?[a-zA-Z_][\w-]*(?:\s[^<>]*)?>/g, '').trim();
  limpo = limpo.replace(/^[,.;:]+\s*/, '').trim();
  // Essas mensagens nunca deveriam ter <, >, { ou } — se sobrar algum resíduo
  // de tag truncada, corta dali em diante em vez de mostrar o lixo ao cliente.
  const indiceLixo = limpo.search(/[<>{}]/);
  if (indiceLixo !== -1) limpo = limpo.slice(0, indiceLixo).trim();
  return limpo;
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function parseStructured(response, contexto) {
  if (response.stop_reason === 'refusal') {
    throw erroPublico(`O modelo recusou a solicitação (${contexto}). Tente reformular ou enviar de novo.`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw erroPublico(`Resposta truncada pelo limite de tokens (${contexto}). Tente enviar de novo.`);
  }
  const raw = textOf(response);
  try {
    return JSON.parse(raw);
  } catch {
    throw erroPublico(`Não foi possível interpretar a resposta do modelo (${contexto}). Tente enviar de novo.`);
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
      content: `Sou ${session.respondente}, cargo ${session.cargo}, contato ${session.contato}, da empresa ${session.empresa}. Pode começar o levantamento técnico.`,
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

  // Cache de prompt: a conversa é reenviada inteira a cada turno (o servidor
  // não guarda estado), então sem isso o custo cresce com o quadrado do
  // número de turnos. Marcando a última mensagem, o prefixo até aqui vira
  // cache hit no próximo turno (que reenvia este prefixo + 2 mensagens
  // novas) — só a parte nova é cobrada em cheio.
  const ultimaMensagem = messages[messages.length - 1];
  ultimaMensagem.content = [
    { type: 'text', text: ultimaMensagem.content, cache_control: { type: 'ephemeral' } },
  ];

  let response;
  try {
    response = await client.messages.create({
      model: config.model,
      // A resposta de cada turno é curta (uma pergunta), então 1500 tokens
      // sobram — um teto menor também limita o pior caso de latência.
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: buildConversationSystemPrompt({
            script: session.script,
            empresa: session.empresa,
            respondente: session.respondente,
            cargo: session.cargo,
            appTitle: config.appTitle,
            maxAiTurns: config.maxAiTurns,
          }),
          // O roteiro é o mesmo em toda a conversa — cache evita reprocessar
          // um texto de milhares de tokens a cada pergunta.
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
      // Claude Opus 5 pensa por padrão quando "thinking" não é informado —
      // isso soma segundos reais a cada turno do chat sem necessidade aqui
      // (é uma pergunta de roteiro, não um raciocínio complexo). Desligado
      // explicitamente; permitido até effort "high".
      thinking: { type: 'disabled' },
      output_config: {
        // "low" priorizava latência, mas em bateria de testes reais produziu
        // algumas respostas com texto corrompido (tag de controle vazando pra
        // mensagem). "medium" é um pouco mais lento/caro, mas mais confiável.
        effort: 'medium',
        format: { type: 'json_schema', schema: conversationSchema },
      },
    });
  } catch (err) {
    throw traduzirErro(err);
  }

  const parsed = parseStructured(response, 'condução da entrevista');
  return {
    mensagem: limparMensagem(String(parsed.mensagem || '')),
    topico: Number(parsed.topico) || 1,
    opcoes: (parsed.opcoes || []).map((o) => String(o).trim()).filter(Boolean),
    multiplaEscolha: Boolean(parsed.multiplaEscolha),
    mostrarTabela: Boolean(parsed.mostrarTabela),
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

  let response;
  try {
    response = await client.messages.create({
      model: config.model,
      max_tokens: 8000,
      system: buildSummarySystemPrompt({
        script: session.script,
        empresa: session.empresa,
        respondente: session.respondente,
        cargo: session.cargo,
        contato: session.contato,
      }),
      messages: [
        {
          role: 'user',
          // Cache: se o "Tentar de novo" reenviar a mesma transcrição, essa
          // chamada vira cache hit em vez de reprocessar tudo de novo.
          content: [
            {
              type: 'text',
              text: `Transcrição da entrevista de briefing:\n\n<transcricao>\n${transcricao}\n</transcricao>\n\nGere o resumo estruturado.`,
              cache_control: { type: 'ephemeral' },
            },
          ],
        },
      ],
      // Roteiro de 20 temas gera uma transcrição longa; desligamos o "pensamento"
      // (mesma razão do turno de chat) e usamos effort "low" para dar folga ao
      // teto de 60s da função serverless (Vercel, plano Hobby) — sem isso, o
      // resumo de uma entrevista longa passava do tempo e travava a tela.
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: summarySchema },
      },
    });
  } catch (err) {
    throw traduzirErro(err);
  }

  const parsed = parseStructured(response, 'geração do resumo');
  return {
    necessidades: (parsed.necessidades || []).map((i) => String(i).trim()).filter(Boolean),
    recomendacoes: (parsed.recomendacoes || []).map((i) => String(i).trim()).filter(Boolean),
    pendencias: (parsed.pendencias || []).map((i) => String(i).trim()).filter(Boolean),
    anexos: (parsed.anexos || []).map((i) => String(i).trim()).filter(Boolean),
  };
}
