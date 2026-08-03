import express from 'express';
import { config, hasApiKey } from './config.js';
import { router } from './routes/briefing.js';

const app = express();

app.use(express.json({ limit: '128kb' }));
app.use(express.static(config.publicDir));
app.use('/api', router);

// Middleware de erro: nunca vaza stack para a tela do cliente.
app.use((err, req, res, next) => {
  console.error('Erro na requisição:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    erro: 'Não foi possível concluir a operação. Tente novamente em alguns segundos.',
    detalhe: err?.message,
  });
});

app.listen(config.port, () => {
  console.log(`\n${config.appTitle} — demo local`);
  console.log(`  http://localhost:${config.port}`);
  console.log(`  roteiro: ${config.scriptId}`);
  console.log(`  PDFs salvos em: ${config.outputDir}`);
  if (hasApiKey) {
    console.log(`  modelo: ${config.model}\n`);
  } else {
    console.log('  ATENÇÃO: ANTHROPIC_API_KEY não configurada — rodando em MODO DEMONSTRAÇÃO');
    console.log('  (perguntas fixas e resumo sem interpretação). Crie .env.local para usar a IA.\n');
  }
});
