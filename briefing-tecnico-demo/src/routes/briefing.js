/**
 * Rotas do briefing — sem estado no servidor.
 *
 * O navegador guarda a conversa e reenvia a cada passo. Isso permite rodar o
 * mesmo código local e em ambiente serverless (onde cada requisição pode cair
 * numa instância diferente, e nada guardado em memória sobrevive).
 */

import { Router } from 'express';
import { config, ehServerless } from '../config.js';
import { getScript } from '../lib/briefingScripts.js';
import * as ia from '../lib/anthropic.js';
import { renderSummaryPdf, savePdf } from '../lib/pdf.js';
import { registrarUso } from '../lib/limiteDeUso.js';

export const router = Router();

const MAX_TEXTO = 2000;
const MAX_NOME = 120;
// Cobre user+assistant dos até MAX_AI_TURNS (130) turnos da IA, com folga.
const MAX_MENSAGENS = 280;
const MAX_ITENS_RESUMO = 16;

function limparTexto(valor, max) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function erroDeEntrada(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 400;
  erro.publico = true;
  return erro;
}

/** Repassa erros assíncronos para o middleware de erro do Express. */
const rota = (handler) => (req, res, next) => handler(req, res, next).catch(next);

/**
 * Reconstrói o estado da entrevista a partir do que o navegador enviou.
 * Tudo é validado: o corpo da requisição é dado de fora, não fonte de verdade.
 */
function lerSessao(body) {
  const empresa = limparTexto(body?.empresa, MAX_NOME);
  const respondente = limparTexto(body?.respondente, MAX_NOME);
  const cargo = limparTexto(body?.cargo, MAX_NOME);
  const contato = limparTexto(body?.contato, MAX_NOME);

  if (!empresa || !respondente || !cargo || !contato) {
    throw erroDeEntrada('Informe empresa, nome, cargo e contato de quem está respondendo.');
  }

  const bruta = Array.isArray(body?.conversa) ? body.conversa : [];
  if (bruta.length > MAX_MENSAGENS) {
    throw erroDeEntrada('Esta conversa ficou longa demais. Recarregue a página para começar de novo.');
  }

  const messages = bruta
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: limparTexto(m.content, MAX_TEXTO) }))
    .filter((m) => m.content);

  return { empresa, respondente, cargo, contato, messages, script: getScript(config.scriptId) };
}

function progresso(session, topico) {
  const total = session.script.topics.length;
  const atual = Math.min(Math.max(Number(topico) || 1, 1), total);
  const rotulo = session.script.topics.find((t) => t.id === atual)?.rotulo || '';
  return { atual, total, rotulo };
}

/** Alguns temas mostram um botão de anexar arquivo (ver src/lib/briefingScripts.js). */
function permiteAnexo(session, topico) {
  return Boolean(session.script.topics.find((t) => t.id === Number(topico))?.permiteAnexo);
}

/**
 * Alguns temas trocam a caixa de texto por uma tabela editável (ver
 * src/lib/briefingScripts.js), mas só na mensagem específica que introduz a
 * grade — o mesmo tema pode ter outra pergunta (ex.: equipamentos de uso
 * específico) que é texto livre. Por isso depende do sinal mostrarTabela que
 * a IA devolve por mensagem, não só do número do tema.
 */
function tabelaConfig(session, topico, mostrarTabela) {
  if (!mostrarTabela) return null;
  return session.script.topics.find((t) => t.id === Number(topico))?.tabela || null;
}

/** Contexto da aplicação para a interface. */
router.get('/config', (req, res) => {
  const script = getScript(config.scriptId);
  res.json({
    titulo: config.appTitle,
    modoDemonstracao: !ia.usingLiveApi,
    // Na nuvem não existe pasta local para guardar cópia do PDF.
    salvaCopiaLocal: !ehServerless,
    roteiro: { id: script.id, nome: script.nome, totalPerguntas: script.topics.length },
  });
});

/** Primeira mensagem da entrevista. */
router.post(
  '/briefing/inicio',
  rota(async (req, res) => {
    const session = lerSessao({ ...req.body, conversa: [] });
    registrarUso();

    const resposta = await ia.nextQuestion(session);
    res.json({
      mensagem: resposta.mensagem,
      opcoes: resposta.opcoes,
      multiplaEscolha: resposta.multiplaEscolha,
      permiteAnexo: permiteAnexo(session, resposta.topico),
      tabela: tabelaConfig(session, resposta.topico, resposta.mostrarTabela),
      progresso: progresso(session, resposta.topico),
      finalizado: resposta.encerrar,
      modoDemonstracao: !ia.usingLiveApi,
    });
  }),
);

/** Resposta do cliente e próxima fala da IA. */
router.post(
  '/briefing/mensagem',
  rota(async (req, res) => {
    const session = lerSessao(req.body);
    const texto = limparTexto(req.body?.texto, MAX_TEXTO);

    if (!texto) {
      throw erroDeEntrada('Escreva uma resposta antes de enviar.');
    }

    session.messages.push({ role: 'user', content: texto });

    const falasDaIa = session.messages.filter((m) => m.role === 'assistant').length;
    const forcarEncerramento = falasDaIa + 1 >= config.maxAiTurns;

    const resposta = await ia.nextQuestion(session, { forcarEncerramento });
    res.json({
      mensagem: resposta.mensagem,
      opcoes: resposta.opcoes,
      multiplaEscolha: resposta.multiplaEscolha,
      permiteAnexo: permiteAnexo(session, resposta.topico),
      tabela: tabelaConfig(session, resposta.topico, resposta.mostrarTabela),
      progresso: progresso(session, resposta.topico),
      finalizado: resposta.encerrar,
    });
  }),
);

/** Resumo estruturado da entrevista. */
router.post(
  '/briefing/resumo',
  rota(async (req, res) => {
    const session = lerSessao(req.body);

    if (!session.messages.some((m) => m.role === 'user')) {
      throw erroDeEntrada('A entrevista ainda não tem respostas para resumir.');
    }

    const resumo = await ia.buildSummary(session);
    res.json({ resumo, modoDemonstracao: !ia.usingLiveApi });
  }),
);

/** Gera o PDF a partir do resumo já exibido na tela. */
router.post(
  '/briefing/pdf',
  rota(async (req, res) => {
    const empresa = limparTexto(req.body?.empresa, MAX_NOME);
    const respondente = limparTexto(req.body?.respondente, MAX_NOME);
    const cargo = limparTexto(req.body?.cargo, MAX_NOME);
    const contato = limparTexto(req.body?.contato, MAX_NOME);
    const enviado = req.body?.resumo;

    if (!empresa || !respondente || !enviado?.necessidades?.length) {
      throw erroDeEntrada('Faltam dados do resumo para gerar o PDF.');
    }

    const listar = (itens) =>
      (Array.isArray(itens) ? itens : [])
        .slice(0, MAX_ITENS_RESUMO)
        .map((i) => limparTexto(i, MAX_TEXTO))
        .filter(Boolean);

    const resumo = {
      necessidades: listar(enviado.necessidades),
      recomendacoes: listar(enviado.recomendacoes),
      pendencias: listar(enviado.pendencias),
      anexos: listar(enviado.anexos),
    };

    const data = new Date();
    const bytes = await renderSummaryPdf({
      empresa,
      respondente,
      cargo,
      contato,
      summary: resumo,
      data,
      modoDemonstracao: !ia.usingLiveApi,
    });

    // Na nuvem o disco é somente leitura, então a cópia local só faz sentido
    // quando o programa está rodando na máquina de alguém.
    let filename = `levantamento-tecnico-${data.toISOString().slice(0, 10)}.pdf`;
    if (!ehServerless) {
      const salvo = await savePdf(bytes, { empresa, data });
      filename = salvo.filename;
      console.log(`PDF gerado: ${salvo.path}`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(bytes));
  }),
);
