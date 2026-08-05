/**
 * Geração do PDF do resumo.
 *
 * Diagramação simples e neutra: uma sans-serif padrão (Helvetica), paleta em
 * tons de cinza, hierarquia por tamanho e peso. Sem logotipo e sem cor de
 * marca — quando o produto tiver identidade, mexer só neste arquivo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { config } from '../config.js';

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { top: 64, bottom: 64, left: 56, right: 56 };
const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

const COLOR = {
  titulo: rgb(0.08, 0.08, 0.09),
  texto: rgb(0.16, 0.16, 0.18),
  suave: rgb(0.42, 0.42, 0.45),
  linha: rgb(0.82, 0.82, 0.84),
};

// As fontes padrão do PDF usam WinAnsi, que cobre acentuação do português.
// Alguns caracteres fora dessa tabela (setas, emoji, aspas exóticas) fariam a
// pdf-lib lançar erro, então normalizamos antes de desenhar.
const SUBSTITUICOES = new Map([
  ['‘', "'"], ['’', "'"], ['‚', "'"],
  ['“', '"'], ['”', '"'], ['„', '"'],
  ['–', '-'], ['—', '—'], ['…', '...'],
  [' ', ' '], ['→', '->'], ['•', '•'],
  ['\t', '    '],
]);

function sanitize(input) {
  const texto = String(input ?? '');
  let out = '';
  for (const char of texto) {
    if (SUBSTITUICOES.has(char)) {
      out += SUBSTITUICOES.get(char);
      continue;
    }
    const code = char.codePointAt(0);
    // Faixa segura de WinAnsi: ASCII imprimível + Latin-1 suplementar.
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      out += char;
    } else if (code === 10) {
      out += '\n';
    }
    // Demais caracteres são descartados de propósito.
  }
  return out;
}

function wrap(text, font, size, maxWidth) {
  const linhas = [];
  for (const paragrafo of sanitize(text).split('\n')) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (palavras.length === 0) {
      linhas.push('');
      continue;
    }
    let atual = '';
    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (font.widthOfTextAtSize(tentativa, size) <= maxWidth) {
        atual = tentativa;
      } else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}

function formatarData(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function slug(texto) {
  return sanitize(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'empresa';
}

/**
 * @param {object} params
 * @param {string} params.empresa
 * @param {string} params.respondente
 * @param {string} [params.cargo]
 * @param {string} [params.contato]
 * @param {{necessidades: string[], recomendacoes: string[], pendencias?: string[], anexos?: string[]}} params.summary
 * @param {Date} [params.data]
 * @param {boolean} [params.modoDemonstracao]
 * @returns {Promise<Uint8Array>}
 */
export async function renderSummaryPdf({
  empresa,
  respondente,
  cargo,
  contato,
  summary,
  data = new Date(),
  modoDemonstracao = false,
}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${config.appTitle} — ${sanitize(empresa)}`);
  doc.setSubject('Resumo de levantamento técnico');
  doc.setCreationDate(data);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN.top;

  const novaPagina = () => {
    page = doc.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN.top;
  };

  const espaco = (altura) => {
    if (y - altura < MARGIN.bottom) novaPagina();
    y -= altura;
  };

  const escrever = (texto, { font = regular, size = 11, color = COLOR.texto, leading = 1.45, indent = 0 } = {}) => {
    const largura = CONTENT_WIDTH - indent;
    const alturaLinha = size * leading;
    for (const linha of wrap(texto, font, size, largura)) {
      if (y - alturaLinha < MARGIN.bottom) novaPagina();
      y -= alturaLinha;
      if (linha) {
        page.drawText(linha, { x: MARGIN.left + indent, y, size, font, color });
      }
    }
  };

  const linhaHorizontal = () => {
    if (y - 12 < MARGIN.bottom) novaPagina();
    y -= 12;
    page.drawLine({
      start: { x: MARGIN.left, y },
      end: { x: PAGE.width - MARGIN.right, y },
      thickness: 0.75,
      color: COLOR.linha,
    });
  };

  const secao = (titulo) => {
    espaco(18);
    escrever(titulo.toUpperCase(), { font: bold, size: 10.5, color: COLOR.suave, leading: 1.2 });
    linhaHorizontal();
    espaco(8);
  };

  const bullets = (itens) => {
    for (const item of itens) {
      const alturaLinha = 11 * 1.45;
      if (y - alturaLinha < MARGIN.bottom) novaPagina();
      // Marcador desenhado na margem; o texto usa recuo próprio.
      page.drawText('•', { x: MARGIN.left, y: y - alturaLinha, size: 11, font: regular, color: COLOR.suave });
      escrever(item, { indent: 16 });
      espaco(6);
    }
  };

  // Cabeçalho: título é o produto com a empresa em destaque; a linha de
  // baixo identifica quem respondeu, sem repetir "Resumo do briefing".
  escrever(`${config.appTitle} (${sanitize(empresa)})`, { font: bold, size: 20, color: COLOR.titulo, leading: 1.25 });
  espaco(8);
  const linhaRespondente = [sanitize(respondente), cargo ? sanitize(cargo) : null, contato ? sanitize(contato) : null]
    .filter(Boolean)
    .join('  ·  ');
  escrever(`${linhaRespondente}  ·  ${formatarData(data)}`, {
    size: 10,
    color: COLOR.suave,
    leading: 1.3,
  });
  espaco(6);
  linhaHorizontal();
  espaco(16);

  secao('Necessidades identificadas');
  bullets(summary.necessidades);
  espaco(8);

  secao('Recomendações iniciais de direção de projeto');
  bullets(summary.recomendacoes);

  if (summary.pendencias?.length) {
    espaco(8);
    secao('Pendências técnicas — a confirmar com o responsável indicado');
    bullets(summary.pendencias);
  }

  if (summary.anexos?.length) {
    espaco(8);
    secao('Arquivos anexados pelo cliente durante a entrevista');
    bullets(summary.anexos);
  }

  // Nota de rodapé: ancorada na base da última página, na faixa abaixo da área
  // de conteúdo — nunca empurra uma página nova só para caber.
  const nota = modoDemonstracao
    ? 'Documento gerado automaticamente em modo demonstração (sem chave de API): o resumo reproduz as respostas da entrevista sem interpretação. As recomendações são pontos de partida para discussão, não definições de projeto.'
    : 'Documento gerado automaticamente a partir da entrevista de briefing. As recomendações são pontos de partida para discussão, não definições de projeto.';

  const notaSize = 8.5;
  const notaLeading = notaSize * 1.4;
  const notaLinhas = wrap(nota, regular, notaSize, CONTENT_WIDTH);
  let yNota = 26 + (notaLinhas.length - 1) * notaLeading;
  for (const linha of notaLinhas) {
    page.drawText(linha, { x: MARGIN.left, y: yNota, size: notaSize, font: regular, color: COLOR.suave });
    yNota -= notaLeading;
  }

  return doc.save();
}

/**
 * Grava o PDF na pasta de saída local e devolve o caminho.
 */
export async function savePdf(bytes, { empresa, data = new Date() }) {
  await fs.mkdir(config.outputDir, { recursive: true });
  const carimbo = data.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `levantamento-tecnico-${slug(empresa)}-${carimbo}.pdf`;
  const destino = path.join(config.outputDir, filename);
  await fs.writeFile(destino, bytes);
  return { filename, path: destino };
}

export { slug };
