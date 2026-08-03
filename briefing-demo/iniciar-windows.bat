@echo off
REM Atalho para rodar a demo no Windows: clique duas vezes neste arquivo.
REM Cuida de tudo - pede a chave na primeira vez, instala o necessario,
REM liga o programa e abre o navegador.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo   Briefing Arquitetonico - demo
echo   ------------------------------
echo.

REM 1. O Node.js esta instalado?
where node >nul 2>nul
if errorlevel 1 (
  echo   Falta instalar o Node.js ^(e o motor que roda o programa^).
  echo.
  echo   1. Baixe em: https://nodejs.org  ^(botao da esquerda, versao LTS^)
  echo   2. Instale clicando em avancar ate o fim.
  echo   3. Volte aqui e clique neste arquivo de novo.
  echo.
  pause
  exit /b 1
)

REM 2. A chave de API ja foi cadastrada?
if not exist ".env.local" (
  echo   Primeira vez por aqui. Preciso da sua chave da Anthropic.
  echo   ^(aquele codigo comprido que comeca com sk-ant-^)
  echo.
  set /p CHAVE="  Cole a chave aqui e aperte Enter: "
  set "CHAVE=!CHAVE: =!"

  if "!CHAVE!"=="" (
    echo.
    echo   Nada foi colado. O programa vai rodar em modo demonstracao,
    echo   com perguntas fixas em vez da inteligencia artificial.
    echo.
  ) else (
    > .env.local echo ANTHROPIC_API_KEY=!CHAVE!
    echo.
    echo   Chave guardada. Nao vou pedir de novo.
    echo.
  )
)

REM 3. Instalar as dependencias, se ainda nao foram instaladas.
if not exist "node_modules" (
  echo   Preparando ^(isso demora um pouco so na primeira vez^)...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   Algo deu errado ao preparar. Verifique sua conexao com a internet.
    pause
    exit /b 1
  )
  echo.
)

REM 4. Abrir o navegador assim que o programa subir.
start "" /b powershell -NoProfile -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000'"

echo   Ligando... o navegador abre sozinho em instantes.
echo   Se nao abrir, entre em: http://localhost:3000
echo.
echo   Para desligar depois, feche esta janela preta.
echo.

call npm run dev
