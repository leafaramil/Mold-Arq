/**
 * Freio simples contra uso inesperado da chave de API.
 *
 * Conta quantos briefings foram iniciados no dia e recusa novos acima do teto.
 * O contador vive na memória do processo: localmente isso cobre bem; num
 * ambiente serverless, cada instância tem o seu próprio contador, então o teto
 * real pode ser algumas vezes maior que o configurado. É um freio contra
 * acidente e link vazado, não um cadeado — para controle rigoroso seria preciso
 * um contador compartilhado (banco ou Redis).
 */

import { config } from '../config.js';

let diaAtual = null;
let iniciadosHoje = 0;

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

/** Registra o início de um briefing. Lança erro quando o teto do dia é atingido. */
export function registrarUso() {
  if (!config.maxBriefingsPorDia) return;

  const dia = hoje();
  if (dia !== diaAtual) {
    diaAtual = dia;
    iniciadosHoje = 0;
  }

  if (iniciadosHoje >= config.maxBriefingsPorDia) {
    const erro = new Error(
      'O limite de briefings de hoje foi atingido. Tente novamente amanhã ou aumente o limite na configuração.',
    );
    erro.publico = true;
    erro.status = 429;
    throw erro;
  }

  iniciadosHoje += 1;
}

/** Estado atual do contador (útil para diagnóstico). */
export function estadoDoLimite() {
  return { dia: diaAtual, iniciadosHoje, teto: config.maxBriefingsPorDia };
}
