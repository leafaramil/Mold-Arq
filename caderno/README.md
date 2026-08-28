# Caderno

App de finanças pessoais do Rafael e da Letícia — substitui o caderno de papel.
Ver a especificação completa fornecida pelo usuário para todas as regras de negócio.

Projeto separado do site institucional da Mold Arq que vive na raiz deste
repositório — sem relação de identidade visual ou deploy entre os dois.

## Stack

- Next.js (App Router) + React
- Vercel Postgres (`@vercel/postgres`) — schema normalizado em `sql/schema.sql`
- PWA (manifest + service worker) — fase 5
- API Route própria intermediando a API da Anthropic (Aristides) — fase 6

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
