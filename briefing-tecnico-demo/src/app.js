/**
 * Aplicação Express, sem o listen.
 *
 * Fica separada de server.js para poder ser usada de duas formas com o mesmo
 * código: localmente (server.js chama listen) e em ambiente serverless, onde a
 * plataforma cuida da porta (ver api/index.js).
 */

import express from 'express';
import { config } from './config.js';
import { router } from './routes/briefing.js';

export const app = express();

app.use(express.json({ limit: '512kb' }));
app.use(express.static(config.publicDir));
app.use('/api', router);

// Middleware de erro: nunca vaza stack para a tela do cliente.
app.use((err, req, res, next) => {
  console.error('Erro na requisição:', err);
  if (res.headersSent) return next(err);

  // Erros marcados como públicos já têm mensagem escrita para o usuário final
  // (ver traduzirErro em lib/anthropic.js). Os demais viram texto genérico —
  // e nunca incluem a mensagem interna, que pode conter detalhe que não é
  // pra vazar pro cliente.
  res.status(err?.status || 500).json({
    erro: err?.publico
      ? err.message
      : 'Não foi possível concluir a operação. Tente novamente em alguns segundos.',
  });
});

export default app;
