/**
 * Armazenamento das sessões de briefing.
 *
 * Implementação em memória, suficiente para a demo (uma apresentação, um
 * processo). A interface abaixo — create/get/update/remove — é o contrato que
 * uma implementação com banco (Postgres, Redis, Upstash) precisaria cumprir
 * para substituir este arquivo sem tocar nas rotas.
 */

import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

const sessions = new Map();

function expirou(session) {
  return Date.now() - session.updatedAt > config.sessionTtlMs;
}

function limparExpiradas() {
  for (const [id, session] of sessions) {
    if (expirou(session)) sessions.delete(id);
  }
}

export function create({ empresa, respondente, script }) {
  limparExpiradas();
  const agora = Date.now();
  const session = {
    id: randomUUID(),
    empresa,
    respondente,
    script,
    /** @type {{role: 'user'|'assistant', content: string}[]} */
    messages: [],
    topicoAtual: 1,
    finished: false,
    summary: null,
    createdAt: agora,
    updatedAt: agora,
  };
  sessions.set(session.id, session);
  return session;
}

export function get(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (expirou(session)) {
    sessions.delete(id);
    return null;
  }
  return session;
}

export function update(session, patch) {
  Object.assign(session, patch, { updatedAt: Date.now() });
  sessions.set(session.id, session);
  return session;
}

export function remove(id) {
  return sessions.delete(id);
}

export function count() {
  limparExpiradas();
  return sessions.size;
}
