import { Router } from 'express';
import { config } from '../config.js';
import { getScript } from '../lib/briefingScripts.js';
import * as ia from '../lib/anthropic.js';
import { renderSummaryPdf, savePdf } from '../lib/pdf.js';
import * as store from '../store/sessionStore.js';

export const router = Router();

const MAX_TEXTO = 2000;
const MAX_NOME = 120;

function limparTexto(valor, max) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Repassa erros assíncronos para o middleware de erro do Express. */
const rota = (handler) => (req, res, next) => handler(req, res, next).catch(next);

function progresso(session) {
  const total = session.script.topics.length;
  return {
    atual: Math.min(Math.max(session.topicoAtual, 1), total),
    total,
  };
}

function exigirSessao(req, res) {
  const session = store.get(req.params.id);
  if (!session) {
    res.status(404).json({ erro: 'Sessão não encontrada ou expirada. Recarregue a página para começar de novo.' });
    return null;
  }
  return session;
}

/** Contexto da aplicação para a interface. */
router.get('/config', (req, res) => {
  const script = getScript(config.scriptId);
  res.json({
    titulo: config.appTitle,
    modoDemonstracao: !ia.usingLiveApi,
    roteiro: { id: script.id, nome: script.nome, totalPerguntas: script.topics.length },
  });
});

/** Inicia um briefing e devolve a primeira mensagem da IA. */
router.post(
  '/briefing',
  rota(async (req, res) => {
    const empresa = limparTexto(req.body?.empresa, MAX_NOME);
    const respondente = limparTexto(req.body?.respondente, MAX_NOME);

    if (!empresa || !respondente) {
      return res.status(400).json({ erro: 'Informe o nome da empresa e o nome de quem está respondendo.' });
    }

    const session = store.create({ empresa, respondente, script: getScript(config.scriptId) });
    const resposta = await ia.nextQuestion(session);

    session.messages.push({ role: 'assistant', content: resposta.mensagem });
    store.update(session, { topicoAtual: resposta.topico, finished: resposta.encerrar });

    res.status(201).json({
      sessionId: session.id,
      empresa: session.empresa,
      respondente: session.respondente,
      mensagem: resposta.mensagem,
      progresso: progresso(session),
      finalizado: session.finished,
      modoDemonstracao: !ia.usingLiveApi,
    });
  }),
);

/** Envia a resposta do cliente e recebe a próxima fala da IA. */
router.post(
  '/briefing/:id/messages',
  rota(async (req, res) => {
    const session = exigirSessao(req, res);
    if (!session) return;

    if (session.finished) {
      return res.status(409).json({ erro: 'Esta entrevista já foi encerrada.' });
    }

    const texto = limparTexto(req.body?.texto, MAX_TEXTO);
    if (!texto) {
      return res.status(400).json({ erro: 'Escreva uma resposta antes de enviar.' });
    }

    session.messages.push({ role: 'user', content: texto });

    const falasDaIa = session.messages.filter((m) => m.role === 'assistant').length;
    const forcarEncerramento = falasDaIa + 1 >= config.maxAiTurns;

    const resposta = await ia.nextQuestion(session, { forcarEncerramento });
    session.messages.push({ role: 'assistant', content: resposta.mensagem });
    store.update(session, { topicoAtual: resposta.topico, finished: resposta.encerrar });

    res.json({
      mensagem: resposta.mensagem,
      progresso: progresso(session),
      finalizado: session.finished,
    });
  }),
);

/** Gera (e memoriza) o resumo estruturado da entrevista. */
router.post(
  '/briefing/:id/summary',
  rota(async (req, res) => {
    const session = exigirSessao(req, res);
    if (!session) return;

    if (session.messages.filter((m) => m.role === 'user').length === 0) {
      return res.status(400).json({ erro: 'A entrevista ainda não tem respostas para resumir.' });
    }

    if (!session.summary) {
      store.update(session, { summary: await ia.buildSummary(session) });
    }

    res.json({
      empresa: session.empresa,
      respondente: session.respondente,
      resumo: session.summary,
      modoDemonstracao: !ia.usingLiveApi,
    });
  }),
);

/** Renderiza o PDF, salva em /output e devolve para download. */
router.get(
  '/briefing/:id/pdf',
  rota(async (req, res) => {
    const session = exigirSessao(req, res);
    if (!session) return;

    if (!session.summary) {
      store.update(session, { summary: await ia.buildSummary(session) });
    }

    const data = new Date();
    const bytes = await renderSummaryPdf({
      empresa: session.empresa,
      respondente: session.respondente,
      summary: session.summary,
      data,
      modoDemonstracao: !ia.usingLiveApi,
    });

    // Salva localmente (pasta /output) e entrega no navegador ao mesmo tempo.
    const { filename, path: caminho } = await savePdf(bytes, { empresa: session.empresa, data });
    console.log(`PDF gerado: ${caminho}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(bytes));
  }),
);
