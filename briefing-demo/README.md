# Briefing Arquitetônico — demo local

Demo de uma ferramenta de briefing conversacional para escritórios de arquitetura corporativa.
A IA conduz uma entrevista curta (6 perguntas) sobre a empresa do cliente e, ao final,
gera um PDF com o resumo estruturado e recomendações iniciais.

Roda inteiramente em `localhost`: sem banco de dados, sem e-mail, sem deploy.

---

## Como rodar — jeito fácil (sem terminal)

1. Instale o Node.js uma única vez: <https://nodejs.org> (versão LTS, é só avançar até o fim).
2. Dê dois cliques no atalho, dentro da pasta `briefing-demo`:
   - **Mac:** `iniciar-mac.command`
   - **Windows:** `iniciar-windows.bat`

O atalho pede a chave da Anthropic na primeira vez, guarda em `.env.local`, instala o que
falta e abre o navegador sozinho. Nas próximas vezes é só clicar de novo — ele não pergunta
mais nada. Para desligar, feche a janela preta.

No Mac, se aparecer um aviso de "desenvolvedor não identificado", clique no arquivo com o
botão direito e escolha **Abrir**. Isso só acontece na primeira vez.

## Como rodar — pelo terminal

Pré-requisito: Node.js 18 ou superior.

```bash
cd briefing-demo
npm install
cp .env.example .env.local     # e cole sua chave da Anthropic dentro
npm run dev
```

Abra <http://localhost:3000>.

### Onde colocar a chave de API

No arquivo `.env.local`, na raiz de `briefing-demo/`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

O `.env.local` está no `.gitignore` e nunca é versionado.
A chave é lida apenas no servidor — o navegador nunca a recebe.

### Modo demonstração (sem chave)

Sem `ANTHROPIC_API_KEY`, o app continua rodando com um roteiro fixo de perguntas e um
resumo montado diretamente a partir das respostas, sem interpretação. A tela mostra um selo
"modo demonstração" e o PDF sai com um aviso no rodapé. Serve para testar a interface e a
geração do PDF, e como rede de segurança caso a apresentação aconteça sem internet — mas
**não** demonstra a qualidade real da entrevista conduzida pela IA.

---

## O fluxo

1. **Tela inicial** — nome da empresa e nome de quem responde.
2. **Conversa** — a IA faz uma pergunta por vez, com indicador de progresso
   ("Pergunta 3 de 8"). Ela pode fazer um follow-up curto se a resposta ficar vaga, e a
   conversa inteira é limitada a 12 mensagens da IA.
3. **Prévia do resumo** — perfil da empresa, necessidades identificadas e recomendações
   iniciais, na tela, antes de gerar o documento.
4. **PDF** — o botão "Baixar PDF" faz o download na hora e, no mesmo instante, salva uma
   cópia em `output/`.

Temas cobertos pelo roteiro padrão: atuação/segmento, cultura e identidade (perguntada de
forma indireta — cenas do dia a dia, nunca "qual é a sua cultura"), rotina e regime de
trabalho (indireta), problema com o espaço atual, encontros e reuniões (indireta), sensação
desejada, referências admiradas, prioridade/prazo/orçamento. As perguntas indiretas existem
para que a IA infira o abstrato (cultura, necessidade real de salas) a partir de respostas
concretas que a pessoa realmente sabe dar — ver `src/lib/briefingScripts.js`.

---

## Estrutura

```
briefing-demo/
├── iniciar-mac.command         # atalho de clique duplo (Mac)
├── iniciar-windows.bat         # atalho de clique duplo (Windows)
├── api/index.js                # ponto de entrada quando publicado na nuvem
├── vercel.json                 # manda todas as rotas para a aplicação
├── src/
│   ├── app.js                  # aplicação Express (sem listen), usada nos dois modos
│   ├── server.js               # servidor local: só chama listen
│   ├── config.js               # variáveis de ambiente e padrões
│   ├── routes/briefing.js      # rotas HTTP do briefing
│   └── lib/
│       ├── anthropic.js        # chamadas ao Claude (structured outputs)
│       ├── prompts.js          # system prompts e schemas de saída
│       ├── briefingScripts.js  # roteiros de perguntas
│       ├── offlineFallback.js  # roteiro fixo do modo demonstração
│       ├── limiteDeUso.js      # freio de briefings por dia
│       └── pdf.js              # diagramação do PDF (pdf-lib)
├── public/                     # interface (HTML/CSS/JS, sem build)
└── output/                     # PDFs gerados
```

### API

O servidor não guarda estado: o navegador mantém a conversa e a reenvia a cada
passo. Isso é o que permite publicar o mesmo código na nuvem, onde cada requisição
pode cair numa instância diferente. Todo corpo de requisição é validado — papéis
fora de `user`/`assistant` são descartados, e tamanhos têm teto.

| Rota | Descrição |
| --- | --- |
| `GET /api/config` | título do app, roteiro ativo, se está em modo demonstração |
| `POST /api/briefing/inicio` | primeira pergunta da entrevista |
| `POST /api/briefing/mensagem` | envia a resposta do cliente, recebe a próxima fala |
| `POST /api/briefing/resumo` | gera o resumo estruturado a partir da conversa |
| `POST /api/briefing/pdf` | renderiza o PDF (e salva em `output/` quando roda local) |

---

## Como isso foi feito para crescer depois

O código já está separado nos pontos em que as próximas features vão entrar. Nenhuma delas
está implementada — a estrutura só evita reescrita quando forem.

- **Envio de e-mail** — hoje a única saída é o PDF. O ponto de entrada é a rota
  `GET /api/briefing/:id/pdf` em `src/routes/briefing.js`: ela já produz os bytes do PDF e
  o resumo estruturado; anexar e enviar é um passo a mais ali, sem tocar na interface.
- **Persistência em banco** — hoje nada é gravado: a conversa vive no navegador e some ao
  fechar a aba. Para guardar histórico, o ponto é `src/routes/briefing.js`, onde a conversa
  chega inteira a cada passo — basta escrever ali, sem mudar a interface.
- **Múltiplos roteiros de briefing** — `src/lib/briefingScripts.js` guarda os roteiros num
  mapa por id. Basta registrar outro objeto com sua lista de temas e apontar
  `BRIEFING_SCRIPT` no `.env.local`. Os prompts e o indicador de progresso se ajustam
  sozinhos ao número de temas.
- **Customização visual (logo/cores)** — o PDF é diagramado só em `src/lib/pdf.js`
  (paleta e fontes concentradas nas constantes `COLOR` e `PAGE`); a interface usa variáveis
  CSS no `:root` de `public/styles.css`. O título é `APP_TITLE`, um placeholder trocável.

## Publicar na internet (Vercel)

O projeto já vem preparado: `api/index.js` entrega a mesma aplicação Express, e o
`vercel.json` manda todas as rotas para ela.

1. Na Vercel, crie um projeto novo apontando para este repositório.
2. Em **Root Directory**, escolha `briefing-demo`.
3. Em **Environment Variables**, adicione `ANTHROPIC_API_KEY`.
4. Deploy.

Na nuvem o disco é somente leitura, então a cópia automática em `output/` é pulada — o
PDF continua sendo baixado normalmente pelo navegador.

## Configuração opcional

Todas as variáveis abaixo têm padrão e são opcionais (ver `.env.example`):

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `ANTHROPIC_MODEL` | `claude-opus-5` | modelo usado na conversa e no resumo |
| `PORT` | `3000` | porta do servidor local |
| `APP_TITLE` | `Briefing Arquitetônico` | título na tela e no PDF |
| `BRIEFING_SCRIPT` | `corporativo-basico` | roteiro de perguntas ativo |
| `MAX_AI_TURNS` | `10` | teto de mensagens da IA na conversa |
| `OUTPUT_DIR` | `output` | pasta onde os PDFs são salvos (ignorado na nuvem) |
| `MAX_BRIEFINGS_POR_DIA` | `40` | freio contra uso inesperado da chave; `0` desliga |

## Notas técnicas

- A conversa e o resumo usam **structured outputs** do Claude: o servidor recebe um objeto
  validado contra um schema (mensagem + tema atual + sinal de encerramento; perfil +
  necessidades + recomendações), em vez de texto livre para parsear.
- Quando a conversa chega ao teto de mensagens, o servidor injeta uma mensagem de sistema
  no meio do diálogo pedindo o encerramento. Esse canal não pode ser forjado por quem está
  respondendo — texto digitado no chat nunca vira instrução.
- O PDF é gerado com `pdf-lib` e fontes padrão (Helvetica), que cobrem a acentuação do
  português; caracteres fora dessa tabela são normalizados antes de desenhar.
- O limite diário de briefings é contado na memória do processo. Local, isso cobre bem;
  na nuvem cada instância conta a sua parte, então o teto real pode ser maior que o
  configurado. É um freio contra acidente e link vazado, não um cadeado.
