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
