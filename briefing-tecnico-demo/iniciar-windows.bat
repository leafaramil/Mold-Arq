@echo off
REM Atalho para rodar a demo no Windows: clique duas vezes neste arquivo.
REM Cuida de tudo - pede a chave na primeira vez, instala o necessario,
REM liga o programa e abre o navegador.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo   Levantamento Tecnico - demo
echo   ------------------------------
echo.

REM 1. Achar o Node.js: instalado no sistema ou numa pasta portatil aqui do lado.
where node >nul 2>nul
if not errorlevel 1 goto :node_encontrado

for /d %%D in ("%~dp0node-v*") do if exist "%%D\node.exe" set "NODEDIR=%%D"
if not defined NODEDIR if exist "%~dp0node\node.exe" set "NODEDIR=%~dp0node"
for /d %%D in ("%~dp0..\node-v*") do if not defined NODEDIR if exist "%%D\node.exe" set "NODEDIR=%%D"

if defined NODEDIR (
  set "PATH=!NODEDIR!;%PATH%"
  goto :node_encontrado
)

echo   Nao encontrei o Node.js ^(o motor que roda o programa^).
echo.
echo   Se voce NAO pode instalar programas neste computador:
echo     1. Baixe em https://nodejs.org/en/download o arquivo
echo        "Windows Binary (.zip)" de 64 bits.
echo     2. Descompacte e coloque a pasta ^(node-v...-win-x64^)
echo        aqui dentro, ao lado deste atalho.
echo     3. Clique neste arquivo de novo.
echo.
echo   Se voce PODE instalar: baixe o instalador em https://nodejs.org
echo   ^(botao LTS^) e clique em avancar ate o fim.
echo.
pause
exit /b 1

:node_encontrado

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

REM 3. Instalar as dependencias, se ainda nao vieram junto.
if not exist "node_modules" (
  echo   Preparando ^(isso demora um pouco so na primeira vez^)...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   Nao consegui baixar os componentes necessarios.
    echo   Verifique a internet ou peca a versao ja preparada,
    echo   que vem com a pasta node_modules pronta.
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

REM Chama o node direto, sem depender do npm.
node src\server.js
