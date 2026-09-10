import type { ItemNoMercado, ResultadoCotacao, ResultadoMercado } from "./types";

/**
 * Mescla o resultado de uma chamada de CONTINUAÇÃO (só os itens que
 * sobraram por falta de tempo, ver `itensPendentes` em /api/cotar) de volta
 * no resultado acumulado até agora. Pro usuário, isso é transparente: ele
 * só vê a cotação indo demorar um pouco mais, nunca um "erro" no meio do
 * caminho — o cliente (`page.tsx`) chama /api/cotar de novo automaticamente
 * enquanto sobrar `itensPendentes`, e cada resposta parcial entra aqui.
 */
export function mesclarResultadoParcial(base: ResultadoCotacao, parcial: ResultadoCotacao): ResultadoCotacao {
  return {
    geradoEm: parcial.geradoEm,
    ...(parcial.itensPendentes && parcial.itensPendentes.length > 0 ? { itensPendentes: parcial.itensPendentes } : {}),
    mercados: base.mercados.map((mercadoBase) => mesclarMercado(mercadoBase, parcial.mercados.find((m) => m.mercadoId === mercadoBase.mercadoId))),
  };
}

function mesclarMercado(base: ResultadoMercado, parcial: ResultadoMercado | undefined): ResultadoMercado {
  if (!parcial) return base;

  const porItemId = new Map<string, ItemNoMercado>(parcial.itens.map((i) => [i.itemId, i]));
  const itens = base.itens.map((item) => porItemId.get(item.itemId) ?? item);

  // Mesma regra de /api/cotar: erro no nível do mercado só quando TODOS os
  // itens (já mesclados) falharam — recalcula em vez de herdar de qualquer
  // um dos dois lados, que só viram uma fração da lista cada.
  const todosFalharam = itens.length > 0 && itens.every((i) => i.erro);

  return {
    mercadoId: base.mercadoId,
    mercadoNome: base.mercadoNome,
    itens,
    ...(base.tokenExpirado || parcial.tokenExpirado ? { tokenExpirado: true } : {}),
    ...(todosFalharam ? { erro: itens[0].erro } : {}),
  };
}
