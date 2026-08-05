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

/* ---------- Opções de resposta rápida ----------
 * Clicar numa opção envia a resposta na hora, sem precisar apertar "Enviar"
 * depois — igual a um botão de resposta rápida de chat. O campo de texto
 * continua disponível ao lado, como caminho alternativo, mas nunca se
 * combina com a opção clicada: cada pergunta é respondida de um jeito só.
 */

function mostrarOpcoes(opcoes) {
  const area = el('area-opcoes');
  area.replaceChildren();

  if (!opcoes || opcoes.length === 0) {
    area.hidden = true;
    el('entrada').placeholder = 'Escreva sua resposta…';
    return;
  }

  area.hidden = false;
  for (const opcao of opcoes) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = opcao;
    chip.addEventListener('click', () => enviarTexto(opcao));
    area.append(chip);
  }
  // Com opções na tela, o texto livre vira o "outro" — não some, só muda o rótulo.
  el('entrada').placeholder = 'Outro (digite aqui)…';
}

function esconderOpcoes() {
  el('area-opcoes').hidden = true;
  el('area-opcoes').replaceChildren();
}

function atualizarBotaoAnexar(permite) {
  estado.permiteAnexoAtual = Boolean(permite);
  el('btn-anexar').hidden = !estado.permiteAnexoAtual;
}

/* ---------- Tabela de ambientes (tema de tomadas/pontos de rede) ----------
 * Em vez de texto livre, esse tema mostra uma grade: uma linha por ambiente
 * (já vem com os ambientes mais comuns preenchidos) e uma coluna por medida
 * (tomadas, pontos de rede). A pessoa só digita os números, pode adicionar
 * ambientes que não estavam na lista, e ao confirmar tudo vira uma única
 * resposta de texto — pelo mesmo caminho de sempre, sem rota nova no servidor.
 */

function criarLinhaTabela(colunas, nomeInicial, remover) {
  const linha = document.createElement('tr');

  const celulaNome = document.createElement('td');
  const campoNome = document.createElement('input');
  campoNome.type = 'text';
  campoNome.className = 'tabela-nome';
  campoNome.value = nomeInicial;
  campoNome.placeholder = 'Ambiente';
  celulaNome.append(campoNome);
  linha.append(celulaNome);

  for (const coluna of colunas) {
    const celula = document.createElement('td');
    const campo = document.createElement('input');
    campo.type = 'number';
    campo.min = '0';
    campo.inputMode = 'numeric';
    campo.placeholder = '0';
    campo.dataset.coluna = coluna;
    celula.append(campo);
    linha.append(celula);
  }

  const celulaAcao = document.createElement('td');
  if (remover) {
    const botaoRemover = document.createElement('button');
    botaoRemover.type = 'button';
    botaoRemover.className = 'tabela-remover';
    botaoRemover.textContent = '✕';
    botaoRemover.title = 'Remover linha';
    botaoRemover.addEventListener('click', () => linha.remove());
    celulaAcao.append(botaoRemover);
  }
  linha.append(celulaAcao);

  return linha;
}

function mostrarTabela(config) {
  if (!config) {
    esconderTabela();
    return;
  }

  const { colunas, ambientesPadrao } = config;

  const cabecalho = el('tabela-cabecalho');
  cabecalho.replaceChildren();
  const thAmbiente = document.createElement('th');
  thAmbiente.textContent = 'Ambiente';
  cabecalho.append(thAmbiente);
  for (const coluna of colunas) {
    const th = document.createElement('th');
    th.textContent = coluna;
    cabecalho.append(th);
  }
  cabecalho.append(document.createElement('th'));

  const linhas = el('tabela-linhas');
  linhas.replaceChildren();
  for (const ambiente of ambientesPadrao) {
    linhas.append(criarLinhaTabela(colunas, ambiente, false));
  }

  el('area-tabela').hidden = false;
  // .composer define display:flex, que sobrescreveria o [hidden] do atributo
  // — por isso o display é setado direto aqui, em vez de usar .hidden.
  el('form-mensagem').style.display = 'none';
  esconderOpcoes();
}

function esconderTabela() {
  el('area-tabela').hidden = true;
  el('form-mensagem').style.display = '';
}

function adicionarLinhaTabela() {
  const colunas = [...el('tabela-cabecalho').querySelectorAll('th')]
    .slice(1, -1)
    .map((th) => th.textContent);
  el('tabela-linhas').append(criarLinhaTabela(colunas, '', true));
}

/** Junta as linhas preenchidas da tabela numa única resposta de texto. */
function confirmarTabela() {
  const linhas = [...el('tabela-linhas').querySelectorAll('tr')];
  const partes = [];

  for (const linha of linhas) {
    const nome = linha.querySelector('.tabela-nome').value.trim();
    const campos = [...linha.querySelectorAll('input[data-coluna]')];
    const valores = campos
      .map((campo) => ({ coluna: campo.dataset.coluna, valor: campo.value.trim() }))
      .filter((v) => v.valor && Number(v.valor) > 0);

    if (!nome || valores.length === 0) continue;
    const descricaoValores = valores.map((v) => `${v.valor} ${v.coluna.toLowerCase()}`).join(', ');
    partes.push(`${nome}: ${descricaoValores}`);
  }

  if (partes.length === 0) {
    mostrarErro('erro-chat', 'Preencha ao menos um ambiente antes de confirmar.');
    return;
  }

  esconderTabela();
  enviarTexto(partes.join('; '));
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
    mostrarTabela(dados.tabela);
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
  esconderTabela();
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
      mostrarTabela(dados.tabela);
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
  await enviarTexto(el('entrada').value.trim());
}

/**
 * O arquivo nunca sai do navegador — nesta demonstração não há onde guardá-lo.
 * Só o nome entra na conversa, como confirmação visual de que o anexo
 * "chegou", e vai para o resumo final em PDF. O seletor aceita vários
 * arquivos de uma vez (segurando Ctrl/Cmd ou Shift na janela do sistema),
 * para não precisar reabrir o seletor a cada arquivo.
 */
function anexarArquivo() {
  if (estado.enviando || estado.finalizado) return;
  el('input-arquivo').click();
}

function aoEscolherArquivo(evento) {
  const arquivos = [...(evento.target.files || [])];
  evento.target.value = '';
  if (arquivos.length === 0) return;
  const nomes = arquivos.map((a) => a.name).join(', ');
  enviarTexto(`📎 Anexei: ${nomes}`);
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
    const { necessidades, recomendacoes, pendencias, anexos } = dados.resumo;

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
    permiteAnexoAtual: false,
  });
  el('form-inicio').reset();
  el('conversa').replaceChildren();
  esconderOpcoes();
  esconderTabela();
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
el('btn-add-ambiente').addEventListener('click', adicionarLinhaTabela);
el('btn-confirmar-tabela').addEventListener('click', confirmarTabela);

el('entrada').addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    enviarResposta();
  }
});

carregarConfig();
