# Caderno

App de finanças pessoais do Rafael e da Letícia — substitui o caderno de papel.
Ver a especificação completa fornecida pelo usuário para todas as regras de negócio.

Projeto separado do site institucional da Mold Arq que vive na raiz deste
repositório — sem relação de identidade visual ou deploy entre os dois.

## Stack

- Next.js (App Router) + React
- Postgres via a integração Neon da Vercel (`@neondatabase/serverless`) —
  schema normalizado em `sql/schema.sql`
- PWA (manifest + service worker), instalável e funcional offline
- API Routes próprias intermediando a API da Anthropic (Aristides) — a
  chave nunca chega ao cliente

## Banco de dados

O modelo de dados da especificação (seção 3) é armazenado de forma normalizada
em vez de um blob JSON único. Motivo: a seção 2 exige que "escritas
concorrentes não percam dados" com Rafael e Letícia usando o app ao mesmo
tempo em aparelhos diferentes. Com tabelas por entidade:

- Eventos (gastos parciais, movimentações de caixinha ZUL, histórico dos
  potes, avisos dispensados) são sempre `INSERT` — nunca há conflito.
- Saldos que atravessam meses (caixinhas ZUL, potes de poupança) nunca são
  uma coluna incrementada por request: são sempre a soma do histórico.
- Estados por mês (`separado`, `pago`, `recebido`, `devolvido`) são um
  `UPDATE`/`UPSERT` num único registro por `(mes, item)` — dois devices
  editando itens diferentes nunca colidem.

Ver `sql/schema.sql` para o schema completo e comentários.

### Configurar

1. No painel da Vercel, dentro do projeto, crie um banco em **Storage → Postgres**
   e conecte ao projeto (isso popula `POSTGRES_URL` automaticamente nas env vars).
2. Localmente, copie `.env.example` para `.env.local` e preencha `POSTGRES_URL`
   (pegue em Vercel → Storage → seu banco → `.env.local` tab, ou via `vercel env pull`).
3. `npm install`
4. `npm run db:migrate` — cria as tabelas
5. `npm run db:seed` — carrega os dados iniciais da seção 7 da especificação

## Aristides (voz + consultor)

Precisa de uma chave da API da Anthropic (console.anthropic.com — produto
separado da assinatura Claude.ai, cobrança por uso), configurada **só** como
variável de ambiente no servidor (`ANTHROPIC_API_KEY`, em `.env.local` local
ou nas Environment Variables do projeto na Vercel). Nunca vai para o bundle
do cliente — todas as chamadas passam por `/api/aristides/*`.

- Comando de voz e resposta falada usam a Web Speech API do navegador (sem
  custo). Sem internet, o app avisa e pede para anotar manualmente — não
  tenta nenhuma interpretação alternativa.
- O consumo de tokens é convertido em reais e mostrado em Ajustes (mês
  atual, previsão e acumulado).
- Aristides é um agente de verdade: qualquer pedido (falado ou digitado)
  passa pela mesma conversa, e ele decide se é só uma pergunta ou se deve
  propor uma ação usando *tool use* da API da Anthropic — o app expõe quase
  todas as mutações do modelo (`src/lib/aristides-tools.ts`) como
  ferramentas. Ele **nunca** executa nada sozinho: sempre mostra e fala o
  que entendeu, esperando confirmação antes de gravar qualquer coisa
  (seção 6.1). Ficam de fora só duas ações que não fazem sentido como
  pedido em conversa: dispensar aviso e o registro interno de consumo de IA.

## Rodando localmente

```
npm install
npm run dev
```

## Testes

```
npm test
```

Cobre as funções puras de cálculo (`src/lib/calc.ts`) — todos os 9 cenários
obrigatórios da seção 8, mais os casos extras da seção 8.1. Rodar antes de
qualquer mudança na lógica de negócio.
