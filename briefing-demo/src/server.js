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

  // Erros marcados como públicos já têm mensagem escrita para o usuário final
  // (ver traduzirErro em lib/anthropic.js). Os demais viram texto genérico.
  res.status(500).json({
    erro: err?.publico
      ? err.message
      : 'Não foi possível concluir a operação. Tente novamente em alguns segundos.',
    detalhe: err?.publico ? undefined : err?.message,
  });
});

const servidor = app.listen(config.port, () => {
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

// Mensagem em português no lugar do stack trace, para quem não é técnico.
servidor.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  A porta ${config.port} já está ocupada.`);
    console.error('  Provavelmente o programa já está aberto em outra janela.');
    console.error(`  Tente abrir http://localhost:${config.port} no navegador.`);
    console.error('  Se preferir recomeçar, feche a outra janela e clique de novo no atalho.\n');
  } else if (err.code === 'EACCES') {
    console.error(`\n  Sem permissão para usar a porta ${config.port}.`);
    console.error('  Escolha outra porta com a variável PORT no arquivo .env.local.\n');
  } else {
    console.error('\n  Não foi possível iniciar o servidor:', err.message, '\n');
  }
  process.exit(1);
});
