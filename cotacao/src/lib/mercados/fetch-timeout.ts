// Nenhuma busca de mercado tinha limite de tempo próprio — se um site
// externo travasse ou demorasse muito, a chamada ficava presa esperando
// indefinidamente, consumindo o orçamento de 60s da função inteira
// (/api/cotar) sozinha. Confirmado em produção: mesmo depois de limitar a
// paginação do Shibata, uma cotação real continuou dando timeout.
//
// `fetchComTimeout` aborta a requisição depois de `timeoutMs` e propaga
// isso como um erro normal (mesmo formato de qualquer outra falha de rede),
// pra quem chama tratar do jeito que já trata: aquele mercado/página falhou,
// segue com o que já tem.
export async function fetchComTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`sem resposta em ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Descoberto investigando "falha na busca" sem log nenhum (Alabarce/Shibata,
// itens diferentes a cada cotação): com CONCORRENCIA=6 itens em paralelo,
// cada um disparando pro mesmo mercado ao mesmo tempo, um timeout ou status
// transitório (429/5xx) isolado — não uma falha real do mercado — bastava
// pra sumir com o item. Uma segunda tentativa, depois de uma pausa curta pra
// não bater exatamente na mesma instabilidade, resolve a maioria desses
// casos sem custar muito tempo (o timeout de cada mercado já é curto e
// /api/cotar tem sua própria rede de segurança de prazo).
function pausa(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const STATUS_TRANSITORIO = new Set([429, 500, 502, 503, 504]);

export async function fetchComRetry(url: string, init: RequestInit, timeoutMs: number, tentativas = 2): Promise<Response> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetchComTimeout(url, init, timeoutMs);
      if (resp.ok || i === tentativas - 1 || !STATUS_TRANSITORIO.has(resp.status)) return resp;
      ultimoErro = new Error(`status ${resp.status}`);
    } catch (e) {
      ultimoErro = e;
      if (i === tentativas - 1) throw e;
    }
    await pausa(300);
  }
  throw ultimoErro;
}
