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
  maxAiTurns: Number(process.env.MAX_AI_TURNS || 10),
  // Freio contra uso inesperado da chave de API. 0 desliga o limite.
  maxBriefingsPorDia: Number(process.env.MAX_BRIEFINGS_POR_DIA ?? 40),
};

/** Na nuvem o disco é somente leitura (fora /tmp) e não há porta para escutar. */
export const ehServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const hasApiKey = Boolean(config.apiKey);
