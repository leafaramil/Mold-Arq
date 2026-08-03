import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, '..');

// .env.local tem prioridade sobre .env (nenhum dos dois e obrigatorio).
dotenv.config({ path: path.join(ROOT_DIR, '.env.local') });
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

export const config = {
  port: Number(process.env.PORT || 3000),
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
  outputDir: process.env.OUTPUT_DIR
    ? path.resolve(ROOT_DIR, process.env.OUTPUT_DIR)
    : path.join(ROOT_DIR, 'output'),
  publicDir: path.join(ROOT_DIR, 'public'),
  // Titulo generico: trocar aqui quando o produto tiver nome/identidade.
  appTitle: process.env.APP_TITLE || 'Briefing Arquitetônico',
  // Roteiro ativo. Novos roteiros ficam em src/lib/briefingScripts.js.
  scriptId: process.env.BRIEFING_SCRIPT || 'corporativo-basico',
  // Teto de mensagens da IA na conversa inteira (perguntas + follow-ups + encerramento).
  // 14 temas no roteiro padrão + folga para follow-ups e a mensagem de encerramento.
  maxAiTurns: Number(process.env.MAX_AI_TURNS || 20),
  // Freio contra uso inesperado da chave de API. 0 desliga o limite.
  maxBriefingsPorDia: Number(process.env.MAX_BRIEFINGS_POR_DIA ?? 40),
  // Tempo máximo esperando a API do Claude, por tentativa, antes de desistir
  // e avisar o usuário. O padrão do SDK é 10 minutos, tempo demais para uma
  // tela de chat — sem isso, uma instabilidade de rede trava a conversa em
  // silêncio. O SDK tenta de novo 1 vez em caso de timeout, então o tempo
  // real no pior caso é até 2x este valor (ver maxRetries em lib/anthropic.js).
  anthropicTimeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS || 20_000),
};

/** Na nuvem o disco é somente leitura (fora /tmp) e não há porta para escutar. */
export const ehServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const hasApiKey = Boolean(config.apiKey);
