# Levantamento Técnico — demo local

> Publicado em produção via Vercel, conectado a este repositório (pasta `briefing-tecnico-demo`, branch `main`), com `ANTHROPIC_API_KEY` configurada.

Demo de uma ferramenta de levantamento técnico de infraestrutura conversacional, para a
etapa de engenharia de projetos de arquitetura corporativa (elétrica, rede, segurança,
ar-condicionado, servidores). A IA conduz uma entrevista de 19 temas — traduzindo perguntas
tipicamente técnicas (kVA, categoria de cabeamento, specs de rack) para uma linguagem que
qualquer pessoa da empresa consegue responder, mesmo sem ser da área — e ao final gera um
PDF com o resumo estruturado, recomendações iniciais e pendências técnicas a confirmar.

Roda inteiramente em `localhost`: sem banco de dados, sem e-mail, sem deploy.

---

## Como rodar — jeito fácil (sem terminal)

1. Instale o Node.js uma única vez: <https://nodejs.org> (versão LTS, é só avançar até o fim).
2. Dê dois cliques no atalho, dentro da pasta `briefing-tecnico-demo`:
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
cd briefing-tecnico-demo
npm install
cp .env.example .env.local     # e cole sua chave da Anthropic dentro
npm run dev
```

Abra <http://localhost:3000>.

### Onde colocar a chave de API

No arquivo `.env.local`, na raiz de `briefing-tecnico-demo/`:

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
**não** demonstra a qualidade real da entrevista conduzida pela IA (o roteiro fixo não
aplica a regra do imóvel, a mecânica de pendência/contato técnico nem os follow-ups
condicionais).

---

## O fluxo

1. **Tela inicial** — nome da empresa, nome, cargo e contato de quem responde.
2. **Aviso de abertura** — a primeira mensagem da IA avisa que as perguntas ficam técnicas,
   que o ideal é ter alguém de TI por perto, que ela reformula se algo não ficar claro, e que
   o que não for respondido vira pendência para completar depois.
3. **Conversa** — a IA faz uma pergunta por vez, com indicador de progresso
   ("Pergunta 3 de 19"). Muitas perguntas vêm com botões de resposta rápida (opções
   clicáveis, sempre com um campo de "outro" ao lado); duas delas (plantas do espaço e norma
   interna de instalação) mostram também um botão de anexar arquivo — nesta demo, o arquivo
   não sai do navegador, só o nome entra na conversa e no resumo.
4. **Pendências técnicas** — sempre que a pessoa não souber responder algo, a IA pergunta
   quem no time saberia e o contato; da segunda pendência em diante, primeiro pergunta se o
   mesmo contato já indicado serve, só pedindo um nome novo se a resposta for não.
5. **Prévia do resumo** — perfil, necessidades identificadas, recomendações iniciais,
   pendências técnicas (com responsável e contato) e arquivos anexados, na tela, antes de
   gerar o documento.
6. **PDF** — o botão "Baixar PDF" faz o download na hora e, no mesmo instante, salva uma
   cópia em `output/`.

Temas cobertos pelo roteiro padrão: situação do projeto e plantas, tomadas por tipo de mesa,
norma interna de elétrica, iluminação, infraestrutura elétrica do prédio, segurança e
acesso, energia crítica, salas de reunião e videoconferência, internet e rede, cabeamento de
dados, servidores, telefonia, conexões externas, ligação entre andares, ar-condicionado e
conforto térmico, armazenamento, reaproveitamento de mobiliário, mesa fixa ou compartilhada,
e complementos.

---

## Estrutura

```
briefing-tecnico-demo/
├── iniciar-mac.command         # atalho de clique duplo (Mac)
├── iniciar-windows.bat         # atalho de clique duplo (Windows)
├── api/index.js                # ponto de entrada quando publicado na nuvem
├── vercel.json                 # manda todas as rotas para a aplicação
├── src/
│   ├── app.js                  # aplicação Express (sem listen), usada nos dois modos
│   ├── server.js                # servidor local: só chama listen
│   ├── config.js                # variáveis de ambiente e padrões
│   ├── routes/briefing.js       # rotas HTTP do levantamento
│   └── lib/
│       ├── anthropic.js         # chamadas ao Claude (structured outputs)
│       ├── prompts.js           # system prompts e schemas de saída
│       ├── briefingScripts.js   # roteiro de 19 temas
│       ├── offlineFallback.js   # roteiro fixo do modo demonstração
│       ├── limiteDeUso.js       # freio de levantamentos por dia
│       └── pdf.js               # diagramação do PDF (pdf-lib)
├── public/                      # interface (HTML/CSS/JS, sem build)
└── output/                      # PDFs gerados
```

### API

O servidor não guarda estado: o navegador mantém a conversa e a reenvia a cada
passo. Isso é o que permite publicar o mesmo código na nuvem, onde cada requisição
pode cair numa instância diferente. Todo corpo de requisição é validado — papéis
fora de `user`/`assistant` são descartados, e tamanhos têm teto.

| Rota | Descrição |
| --- | --- |
| `GET /api/config` | título do app, roteiro ativo, se está em modo demonstração |
| `POST /api/briefing/inicio` | primeira mensagem (aviso de abertura + primeira pergunta) |
| `POST /api/briefing/mensagem` | envia a resposta do cliente, recebe a próxima fala |
| `POST /api/briefing/resumo` | gera o resumo estruturado a partir da conversa |
| `POST /api/briefing/pdf` | renderiza o PDF (e salva em `output/` quando roda local) |

As opções de resposta rápida e o botão de anexo são só apoio visual do lado do navegador:
ao clicar, o texto final ainda é enviado pela mesma rota `/api/briefing/mensagem`, como uma
resposta comum — nenhuma rota nova foi necessária para isso.

---

## Publicar na internet (Vercel)

O projeto já vem preparado: `api/index.js` entrega a mesma aplicação Express, e o
`vercel.json` manda todas as rotas para ela.

1. Na Vercel, crie um projeto novo apontando para este repositório.
2. Em **Root Directory**, escolha `briefing-tecnico-demo`.
3. Em **Environment Variables**, adicione `ANTHROPIC_API_KEY`.
4. Deploy.

Na nuvem o disco é somente leitura, então a cópia automática em `output/` é pulada — o
PDF continua sendo baixado normalmente pelo navegador. O botão de anexo também continua
funcionando (é só um nome de arquivo entrando na conversa), mas nenhum arquivo é guardado em
lugar nenhum — nem local, nem na nuvem.

## Configuração opcional

Todas as variáveis abaixo têm padrão e são opcionais (ver `.env.example`):

| Variável | Padrão | O que faz |
| --- | --- | --- |
| `ANTHROPIC_MODEL` | `claude-opus-5` | modelo usado na conversa e no resumo |
| `PORT` | `3000` | porta do servidor local |
| `APP_TITLE` | `Levantamento Técnico` | título na tela e no PDF |
| `BRIEFING_SCRIPT` | `tecnico-basico` | roteiro de perguntas ativo |
| `MAX_AI_TURNS` | `50` | teto de mensagens da IA na conversa |
| `OUTPUT_DIR` | `output` | pasta onde os PDFs são salvos (ignorado na nuvem) |
| `MAX_BRIEFINGS_POR_DIA` | `40` | freio contra uso inesperado da chave; `0` desliga |
| `ANTHROPIC_TIMEOUT_MS` | `20000` | tempo máximo esperando a API por tentativa |

## Notas técnicas

- A conversa e o resumo usam **structured outputs** do Claude: o servidor recebe um objeto
  validado contra um schema (mensagem + tema atual + opções de resposta rápida + sinal de
  encerramento; perfil + necessidades + recomendações + pendências + anexos), em vez de
  texto livre para parsear.
- Claude Opus 5 pensa por padrão em cada chamada, o que soma segundos reais a cada turno de
  chat sem necessidade aqui — desligado explicitamente (`thinking: { type: 'disabled' }`) nas
  perguntas do roteiro, já que são turnos curtos e roteirizados, não raciocínio aberto.
  Tanto a chamada à API quanto o `fetch` do navegador têm timeout, para nunca deixar a tela
  "digitando…" travada para sempre numa instabilidade de rede.
- Quando a conversa chega ao teto de mensagens, o servidor injeta uma mensagem de sistema
  no meio do diálogo pedindo o encerramento. Esse canal não pode ser forjado por quem está
  respondendo — texto digitado no chat nunca vira instrução.
- O PDF é gerado com `pdf-lib` e fontes padrão (Helvetica), que cobrem a acentuação do
  português; caracteres fora dessa tabela são normalizados antes de desenhar.
- O limite diário de levantamentos é contado na memória do processo. Local, isso cobre bem;
  na nuvem cada instância conta a sua parte, então o teto real pode ser maior que o
  configurado. É um freio contra acidente e link vazado, não um cadeado.
