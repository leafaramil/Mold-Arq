/**
 * Roda `fn` para cada item de `itens`, no máximo `limite` de cada vez, na
 * ORDEM original. Usado em /api/cotar pra buscar+casar vários itens da
 * lista sem serializar tudo (uma lista de 20-30 itens, um por um, levaria
 * bem mais que "alguns segundos") nem disparar dezenas de requisições
 * simultâneas contra os mercados de uma vez.
 */
export async function mapComConcorrencia<T, R>(itens: T[], limite: number, fn: (item: T, indice: number) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function worker() {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i], i);
    }
  }

  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, () => worker());
  await Promise.all(trabalhadores);
  return resultados;
}
