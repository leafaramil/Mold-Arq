# Cotação de Mercado

App do Rafael e da Letícia pra comparar a lista de compras da semana nos
mercados antes de sair de casa. Não é comércio eletrônico — não faz pedido
nem finaliza compra em lugar nenhum, é só uma ferramenta de comparação de
preço de uso pessoal/doméstico. Ver o briefing completo fornecido pelo
usuário para todo o contexto e as regras de negócio.

Mesma estrutura/arquitetura do projeto `caderno` (mesmo repositório):
login simples por nome + trava biométrica local (WebAuthn), sincronização
da lista entre os dois aparelhos via fila otimista + polling em
`/api/state` e `/api/actions` (sem WebSocket — o "tempo real" é: grava
local na hora, envia pro servidor em background, e todo mundo busca o
estado mais recente ao focar a tela ou voltar a ficar online).

## Stack

- Next.js (App Router) + React
- Postgres via a integração Neon da Vercel (`@neondatabase/serverless`) —
  schema em `sql/schema.sql`
- PWA (manifest + service worker), instalável e funcional offline pra
  adicionar itens (a cotação em si sempre precisa de rede)
- API da Anthropic pra casar a descrição livre de cada item com os produtos
  reais encontrados em cada mercado — chamada só do servidor, a chave nunca
  chega ao cliente (`src/lib/anthropic-server.ts`, `src/lib/matching.ts`)

## O que o app faz

1. Rafael e Letícia vão adicionando itens na lista de compras compartilhada
   ao longo da semana (`src/components/Lista.tsx`), descrição livre.
2. No dia de ir ao mercado, um aperta **Cotar**. O servidor
   (`POST /api/cotar` → `src/app/api/cotar/route.ts`) busca cada item nos 3
   mercados configurados e usa IA pra decidir, por mercado, qual produto
   encontrado (se algum) é de fato o item pedido.
3. A tela de resultado mostra, por mercado: o total estimado da lista
   inteira, os itens não encontrados lá, e destaca o mercado mais barato.

## Mercados

Três mercados de Mogi das Cruzes/SP, cada um com uma integração própria em
`src/lib/mercados/`:

- **Shibata** (`shibata.ts`) — plataforma VipCommerce. Precisa de um token
  de sessão que expira periodicamente e é capturado manualmente via
  DevTools do navegador (não foi encontrada a chamada que o gera
  automaticamente) — colado em **Ajustes** quando expira. A API devolve
  `403` nesse caso; o app diferencia isso de "produto não encontrado" e
  avisa sem derrubar a cotação dos outros mercados.
- **Semar** (`semar.ts`) — plataforma Osuper, sem autenticação.
- **Alabarce** (`alabarce.ts`) — plataforma Bluesoft. O site não libera
  CORS pra chamadas de *frontend*, mas essa busca roda inteira no servidor
  do próprio app (a rota `/api/cotar`), então CORS não se aplica — não
  depende mais do proxy serverless avulso mencionado no briefing.

Outros mercados cogitados (Nagumo, Atacadão, Extra Mercado) não foram
mapeados e ficam fora do escopo desta v1 — não têm endpoint conhecido.

### Ponto de atenção de custo

Cada cotação faz até 3 buscas de rede por item (uma por mercado) mais 1
chamada de IA por item pra decidir os matches (ver
`src/lib/matching.ts`) — pra uma lista de 20-30 itens, isso é bastante
chamada de rede + de IA. Sem cache nem otimização prematura nessa v1 além
de rodar os itens com uma concorrência limitada
(`src/lib/concorrencia.ts`), só pra não travar a tela por muito tempo nem
disparar tudo de uma vez.

## Banco de dados

Schema mínimo — só o que precisa sincronizar entre os dois aparelhos
(a lista de itens) e a configuração do token do Shibata. O resultado de
uma cotação nunca é persistido: é sempre recalculado na hora, a pedido.

### Configurar

1. No painel da Vercel, dentro do projeto, crie um banco em **Storage → Postgres**
   e conecte ao projeto (isso popula `POSTGRES_URL` automaticamente nas env vars).
2. Localmente, copie `.env.example` para `.env.local` e preencha `POSTGRES_URL`
   (pegue em Vercel → Storage → seu banco → `.env.local` tab, ou via `vercel env pull`).
3. `npm install`
4. `npm run db:migrate` — cria as tabelas

## Rodando localmente

```
npm install
npm run dev
```

## Testes

```
npm test
```

Cobre a extração do termo de busca, o parsing de preço em formato
brasileiro do Alabarce, o atalho de `escolherMatches` quando nenhum
mercado devolve candidato (não deveria gastar uma chamada de IA), e o
utilitário de concorrência limitada.
