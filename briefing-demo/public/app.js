/* Interface do briefing: tela inicial → conversa → prévia do resumo → PDF. */

const el = (id) => document.getElementById(id);

// A conversa vive aqui no navegador e é reenviada a cada passo: o servidor não
// guarda estado, o que permite rodar o mesmo código local e publicado na web.
const estado = {
  empresa: '',
  respondente: '',
  conversa: [],
  resumo: null,
  finalizado: false,
  enviando: false,
};

const corpoBase = () => ({
  empresa: estado.empresa,
  respondente: estado.respondente,
  conversa: estado.conversa,
});

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(`/api${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível concluir a operação.');
  }
  return dados;
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
}

/* ---------- Fluxo ---------- */

async function iniciarBriefing(evento) {
  evento.preventDefault();
  mostrarErro('erro-inicio', '');

  const empresa = el('empresa').value.trim();
  const respondente = el('respondente').value.trim();
  if (!empresa || !respondente) {
    mostrarErro('erro-inicio', 'Preencha os dois campos para continuar.');
    return;
  }

  el('btn-iniciar').disabled = true;
  el('btn-iniciar').textContent = 'Preparando…';

  try {
    const dados = await api('/briefing/inicio', {
      method: 'POST',
      body: JSON.stringify({ empresa, respondente }),
    });

    estado.empresa = empresa;
    estado.respondente = respondente;
    estado.conversa = [{ role: 'assistant', content: dados.mensagem }];
    estado.resumo = null;
    estado.finalizado = dados.finalizado;

    el('progresso-empresa').textContent = empresa;
    el('conversa').replaceChildren();
    mostrarTela('tela-chat');
    adicionarBolha(dados.mensagem, 'ia');
    atualizarProgresso(dados.progresso);
    el('entrada').focus();
  } catch (erro) {
    mostrarErro('erro-inicio', erro.message);
  } finally {
    el('btn-iniciar').disabled = false;
    el('btn-iniciar').textContent = 'Iniciar briefing';
  }
}

async function enviarResposta(evento) {
  evento?.preventDefault();
  if (estado.enviando || estado.finalizado) return;

  const texto = el('entrada').value.trim();
  if (!texto) return;

  mostrarErro('erro-chat', '');
  estado.enviando = true;
  travarComposer(true);
  adicionarBolha(texto, 'cliente');
  el('entrada').value = '';
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
      // Pequena pausa para a pessoa ler o agradecimento antes da troca de tela.
      setTimeout(irParaResumo, 1200);
    } else {
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

async function irParaResumo() {
  mostrarTela('tela-resumo');
  el('resumo-meta').textContent = `${estado.empresa} · respondido por ${estado.respondente}`;
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
    const { perfil, necessidades, recomendacoes } = dados.resumo;

    el('resumo-perfil').textContent = perfil;
    preencherLista('resumo-necessidades', necessidades);
    preencherLista('resumo-recomendacoes', recomendacoes);

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
    const resposta = await fetch('/api/briefing/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresa: estado.empresa,
        respondente: estado.respondente,
        resumo: estado.resumo,
      }),
    });
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      throw new Error(dados.erro || 'Não foi possível gerar o PDF.');
    }

    const blob = await resposta.blob();
    const nome =
      resposta.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] || 'briefing.pdf';

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
  Object.assign(estado, { empresa: '', respondente: '', conversa: [], resumo: null, finalizado: false });
  el('form-inicio').reset();
  el('conversa').replaceChildren();
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
    // A dica sobre a pasta local só vale quando o programa roda na máquina.
    el('dica-pdf').hidden = !dados.salvaCopiaLocal;
  } catch {
    // Interface funciona com os textos padrão do HTML.
  }
}

el('form-inicio').addEventListener('submit', iniciarBriefing);
el('form-mensagem').addEventListener('submit', enviarResposta);
el('btn-pdf').addEventListener('click', baixarPdf);
el('btn-reiniciar').addEventListener('click', reiniciar);

el('entrada').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    enviarResposta();
  }
});

carregarConfig();
