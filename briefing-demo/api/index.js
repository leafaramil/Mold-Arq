/**
 * Ponto de entrada na nuvem (Vercel).
 *
 * A plataforma cuida da porta e do ciclo de vida; aqui so entregamos a mesma
 * aplicacao Express que roda localmente, para nao existirem dois codigos.
 */

export { app as default } from '../src/app.js';
