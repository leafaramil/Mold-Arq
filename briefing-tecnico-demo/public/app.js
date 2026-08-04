/* Interface do levantamento técnico: tela inicial → conversa → prévia do resumo → PDF. */

const el = (id) => document.getElementById(id);

// Tempo máximo esperando uma resposta do servidor antes de desistir e avisar
// a pessoa. Sem isso, uma chamada à IA que trava deixa a tela "carregando"
// para sempre e a única saída é recarregar a página.
const TEMPO_LIMITE_MS = 65_000;

// A conversa vive aqui no navegador e é reenviada a cada passo: o servidor não
// guarda estado, o que permite rodar o mesmo código local e publicado na web.
const estado = {
  empresa: '',
  respondente: '',
  cargo: '',
  contato: '',
  conversa: [],
  resumo: null,
  finalizado: false,
  enviando: false,
  opcoesSelecionadas: new Set(),
  permiteAnexoAtual: false,
};

const corpoBase = () => ({
  empresa: estado.empresa,
  respondente: estado.respondente,
  cargo: estado.cargo,
  contato: estado.contato,
  conversa: estado.conversa,
});

/** Cancela a chamada se ela demorar demais, em vez de deixar a tela travada. */
async function comLimiteDeTempo(executar) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  try {
    return await executar(controlador.signal);
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error('A resposta demorou demais e foi cancelada. Tente enviar de novo.');
    }
    throw erro;
  } finally {
    clearTimeout(temporizador);
  }
}

async function api(caminho, opcoes = {}) {
  return comLimiteDeTempo(async (signal) => {
    const resposta = await fetch(`/api${caminho}`, {
      headers: { 'Content-Type': 'application/json' },
      signal,
      ...opcoes,
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível concluir a operação.');
    }
    return dados;
  });
}

function mostrarTela(id) {
  for (const tela of ['tela-inicio', 'tela-chat', 'tela-resumo']) {
    el(tela).hidden = tela !== id;
  }
}

function mostrarErro(id, mensagem) {
  const alvo = el(id);
  alvo.textContent = mensagem || '';
  alvo.hidden = !mensagem;
}

/* ---------- Conversa ---------- */

function adicionarBolha(texto, autor) {
  const bolha = document.createElement('div');
  bolha.className = `bolha bolha-${autor}`;
  bolha.textContent = texto;
  el('conversa').append(bolha);
  rolarParaFim();
}

function mostrarDigitando(ativo) {
  const existente = el('conversa').querySelector('.digitando');
  if (!ativo) {
    existente?.remove();
    return;
  }
  if (existente) return;
  const indicador = document.createElement('div');
  indicador.className = 'digitando';
  indicador.innerHTML = '<span></span><span></span><span></span>';
  el('conversa').append(indicador);
  rolarParaFim();
}

function rolarParaFim() {
  const conversa = el('conversa');
  conversa.scrollTop = conversa.scrollHeight;
}

function atualizarProgresso({ atual, total }) {
  el('progresso-texto').textContent = estado.finalizado
    ? 'Entrevista concluída'
    : `Pergunta ${atual} de ${total}`;
  const proporcao = estado.finalizado ? 1 : atual / total;
  el('barra-preenchida').style.width = `${Math.round(proporcao * 100)}%`;
}

function travarComposer(travado) {
  el('entrada').disabled = travado;
  el('btn-enviar').disabled = travado;
  el('btn-anexar').disabled = travado;
}

/* ---------- Opções de resposta rápida ---------- */

function mostrarOpcoes(opcoes) {
  const area = el('area-opcoes');
  area.replaceChildren();
  estado.opcoesSelecionadas = new Set();

  if (!opcoes || opcoes.length === 0) {
    area.hidden = true;
    return;
  }

  area.hidden = false;
  for (const opcao of opcoes) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = opcao;
    chip.addEventListener('click', () => {
      if (estado.opcoesSelecionadas.has(opcao)) {
        estado.opcoesSelecionadas.delete(opcao);
        chip.classList.remove('chip-selecionada');
      } else {
        estado.opcoesSelecionadas.add(opcao);
        chip.classList.add('chip-selecionada');
      }
    });
    area.append(chip);
  }
}

function esconderOpcoes() {
  el('area-opcoes').hidden = true;
  el('area-opcoes').replaceChildren();
  estado.opcoesSelecionadas = new Set();
}

/** Junta as opções clicadas com o texto livre (campo "outro") numa única resposta. */
function montarTextoDaResposta() {
  const digitado = el('entrada').value.trim();
  const selecionadas = [...estado.opcoesSelecionadas];

  if (selecionadas.length === 0) return digitado;
  if (!digitado) return selecionadas.join(', ');
  return `${selecionadas.join(', ')}; outro: ${digitado}`;
}

function atualizarBotaoAnexar(permite) {
  estado.permiteAnexoAtual = Boolean(permite);
  el('btn-anexar').hidden = !estado.permiteAnexoAtual;
}

/* ---------- Fluxo ---------- */

async function iniciarBriefing(evento) {
  evento.preventDefault();
  mostrarErro('erro-inicio', '');

  const empresa = el('empresa').value.trim();
  const respondente = el('respondente').value.trim();
  const cargo = el('cargo').value.trim();
  const contato = el('contato').value.trim();
  if (!empresa || !respondente || !cargo || !contato) {
    mostrarErro('erro-inicio', 'Preencha todos os campos para continuar.');
    return;
  }

  el('btn-iniciar').disabled = true;
  el('btn-iniciar').textContent = 'Preparando…';

  try {
    const dados = await api('/briefing/inicio', {
      method: 'POST',
      body: JSON.stringify({ empresa, respondente, cargo, contato }),
    });

    estado.empresa = empresa;
    estado.respondente = respondente;
    estado.cargo = cargo;
    estado.contato = contato;
    estado.conversa = [{ role: 'assistant', content: dados.mensagem }];
    estado.resumo = null;
    estado.finalizado = dados.finalizado;

    el('progresso-empresa').textContent = empresa;
    el('conversa').replaceChildren();
    mostrarTela('tela-chat');
    adicionarBolha(dados.mensagem, 'ia');
    mostrarOpcoes(dados.opcoes);
    atualizarBotaoAnexar(dados.permiteAnexo);
    atualizarProgresso(dados.progresso);
    el('entrada').focus();
  } catch (erro) {
    mostrarErro('erro-inicio', erro.message);
  } finally {
    el('btn-iniciar').disabled = false;
    el('btn-iniciar').textContent = 'Iniciar levantamento';
  }
}

async function enviarTexto(texto) {
  if (estado.enviando || estado.finalizado) return;
  if (!texto) return;

  mostrarErro('erro-chat', '');
  estado.enviando = true;
  travarComposer(true);
  adicionarBolha(texto, 'cliente');
  el('entrada').value = '';
  esconderOpcoes();
  mostrarDigitando(true);

  try {
    const dados = await api('/briefing/mensagem', {
      method: 'POST',
      body: JSON.stringify({ ...corpoBase(), texto }),
    });

    estado.conversa.push(
      { role: 'user', content: texto },
      { role: 'assistant', content: dados.mensagem },
    );

    mostrarDigitando(false);
    adicionarBolha(dados.mensagem, 'ia');
    estado.finalizado = dados.finalizado;
    atualizarProgresso(dados.progresso);

    if (dados.finalizado) {
      travarComposer(true);
      atualizarBotaoAnexar(false);
      // Pequena pausa para a pessoa ler o agradecimento antes da troca de tela.
      setTimeout(irParaResumo, 1200);
    } else {
      mostrarOpcoes(dados.opcoes);
      atualizarBotaoAnexar(dados.permiteAnexo);
      travarComposer(false);
      el('entrada').focus();
    }
  } catch (erro) {
    mostrarDigitando(false);
    mostrarErro('erro-chat', erro.message);
    el('entrada').value = texto;
    travarComposer(false);
  } finally {
    estado.enviando = false;
  }
}

async function enviarResposta(evento) {
  evento?.preventDefault();
  await enviarTexto(montarTextoDaResposta());
}

/**
 * O arquivo nunca sai do navegador — nesta demonstração não há onde guardá-lo.
 * Só o nome entra na conversa, como confirmação visual de que o anexo
 * "chegou", e vai para o resumo final em PDF.
 */
function anexarArquivo() {
  if (estado.enviando || estado.finalizado) return;
  el('input-arquivo').click();
}

function aoEscolherArquivo(evento) {
  const arquivo = evento.target.files?.[0];
  evento.target.value = '';
  if (!arquivo) return;
  enviarTexto(`📎 Anexei: ${arquivo.name}`);
}

async function irParaResumo() {
  mostrarTela('tela-resumo');
  el('resumo-meta').textContent = `${estado.empresa} · respondido por ${estado.respondente} (${estado.cargo})`;
  el('resumo-carregando').hidden = false;
  el('resumo-conteudo').hidden = true;
  el('btn-pdf').disabled = true;
  mostrarErro('erro-resumo', '');

  try {
    const dados = await api('/briefing/resumo', {
      method: 'POST',
      body: JSON.stringify(corpoBase()),
    });
    estado.resumo = dados.resumo;
    const { perfil, necessidades, recomendacoes, pendencias, anexos } = dados.resumo;

    el('resumo-perfil').textContent = perfil;
    preencherLista('resumo-necessidades', necessidades);
    preencherLista('resumo-recomendacoes', recomendacoes);

    el('bloco-pendencias').hidden = !pendencias?.length;
    preencherLista('resumo-pendencias', pendencias || []);

    el('bloco-anexos').hidden = !anexos?.length;
    preencherLista('resumo-anexos', anexos || []);

    el('resumo-carregando').hidden = true;
    el('resumo-conteudo').hidden = false;
    el('btn-pdf').disabled = false;
  } catch (erro) {
    el('resumo-carregando').hidden = true;
    mostrarErro('erro-resumo', erro.message);
  }
}

function preencherLista(id, itens) {
  const lista = el(id);
  lista.replaceChildren();
  for (const item of itens) {
    const li = document.createElement('li');
    li.textContent = item;
    lista.append(li);
  }
}

async function baixarPdf() {
  mostrarErro('erro-resumo', '');
  el('btn-pdf').disabled = true;
  el('btn-pdf').textContent = 'Gerando…';

  try {
    const resposta = await comLimiteDeTempo((signal) =>
      fetch('/api/briefing/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          empresa: estado.empresa,
          respondente: estado.respondente,
          cargo: estado.cargo,
          contato: estado.contato,
          resumo: estado.resumo,
        }),
      }),
    );
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      throw new Error(dados.erro || 'Não foi possível gerar o PDF.');
    }

    const blob = await resposta.blob();
    const nome =
      resposta.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] || 'levantamento-tecnico.pdf';

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  } catch (erro) {
    mostrarErro('erro-resumo', erro.message);
  } finally {
    el('btn-pdf').disabled = false;
    el('btn-pdf').textContent = 'Baixar PDF';
  }
}

function reiniciar() {
  Object.assign(estado, {
    empresa: '',
    respondente: '',
    cargo: '',
    contato: '',
    conversa: [],
    resumo: null,
    finalizado: false,
    opcoesSelecionadas: new Set(),
    permiteAnexoAtual: false,
  });
  el('form-inicio').reset();
  el('conversa').replaceChildren();
  esconderOpcoes();
  atualizarBotaoAnexar(false);
  travarComposer(false);
  mostrarErro('erro-inicio', '');
  mostrarTela('tela-inicio');
  el('empresa').focus();
}

/* ---------- Inicialização ---------- */

async function carregarConfig() {
  try {
    const dados = await api('/config');
    document.title = dados.titulo;
    el('app-title').textContent = dados.titulo;
    el('selo-demo').hidden = !dados.modoDemonstracao;
  } catch {
    // Interface funciona com os textos padrão do HTML.
  }
}

el('form-inicio').addEventListener('submit', iniciarBriefing);
el('form-mensagem').addEventListener('submit', enviarResposta);
el('btn-pdf').addEventListener('click', baixarPdf);
el('btn-reiniciar').addEventListener('click', reiniciar);
el('btn-anexar').addEventListener('click', anexarArquivo);
el('input-arquivo').addEventListener('change', aoEscolherArquivo);

el('entrada').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    enviarResposta();
  }
});

carregarConfig();
