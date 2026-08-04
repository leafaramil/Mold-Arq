#!/bin/bash
# Atalho para rodar a demo no Mac: clique duas vezes neste arquivo.
# Cuida de tudo — pede a chave na primeira vez, instala o necessário,
# liga o programa e abre o navegador.

cd "$(dirname "$0")" || exit 1

echo ""
echo "  Levantamento Técnico — demo"
echo "  ------------------------------"
echo ""

# 1. Achar o Node.js: instalado no sistema ou numa pasta portátil aqui do lado.
if ! command -v node > /dev/null 2>&1; then
  for PASTA in ./node-v* ./node ../node-v*; do
    if [ -x "$PASTA/bin/node" ]; then
      PATH="$(cd "$PASTA/bin" && pwd):$PATH"
      export PATH
      break
    fi
  done
fi

if ! command -v node > /dev/null 2>&1; then
  echo "  Não encontrei o Node.js (o motor que roda o programa)."
  echo ""
  echo "  Se você NÃO pode instalar programas neste computador:"
  echo "    1. Baixe em https://nodejs.org/en/download o arquivo .tar.gz para macOS."
  echo "    2. Descompacte e coloque a pasta (node-v...) aqui, ao lado deste atalho."
  echo "    3. Clique neste arquivo de novo."
  echo ""
  echo "  Se você PODE instalar: baixe o instalador em https://nodejs.org"
  echo "  (botão LTS) e clique em avançar até o fim."
  echo ""
  read -r -p "  Aperte Enter para fechar. "
  exit 1
fi

# 2. A chave de API já foi cadastrada?
if [ ! -f .env.local ]; then
  echo "  Primeira vez por aqui. Preciso da sua chave da Anthropic."
  echo "  (aquele código comprido que começa com sk-ant-)"
  echo ""
  read -r -p "  Cole a chave aqui e aperte Enter: " CHAVE
  CHAVE=$(echo "$CHAVE" | tr -d '[:space:]')

  if [ -z "$CHAVE" ]; then
    echo ""
    echo "  Nada foi colado. O programa vai rodar em modo demonstração,"
    echo "  com perguntas fixas em vez da inteligência artificial."
    echo ""
  else
    printf 'ANTHROPIC_API_KEY=%s\n' "$CHAVE" > .env.local
    echo ""
    echo "  Chave guardada. Não vou pedir de novo."
    echo ""
  fi
fi

# 3. Instalar as dependências, se ainda não foram instaladas.
if [ ! -d node_modules ]; then
  echo "  Preparando (isso demora um pouco só na primeira vez)..."
  echo ""
  if ! npm install --no-audit --no-fund; then
    echo ""
    echo "  Não consegui baixar os componentes necessários."
    echo "  Verifique a internet, ou peça a versão já preparada,"
    echo "  que vem com a pasta node_modules pronta."
    read -r -p "  Aperte Enter para fechar. "
    exit 1
  fi
  echo ""
fi

# 4. Abrir o navegador assim que o programa subir.
( sleep 3; open http://localhost:3000 ) &

echo "  Ligando... o navegador abre sozinho em instantes."
echo "  Se não abrir, entre em: http://localhost:3000"
echo ""
echo "  Para desligar depois, feche esta janela preta."
echo ""

# Chama o node direto, sem depender do npm.
node src/server.js
