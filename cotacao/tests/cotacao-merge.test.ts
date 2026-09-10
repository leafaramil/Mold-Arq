import { describe, expect, it } from "vitest";
import { mesclarResultadoParcial } from "../src/lib/cotacao-merge";
import type { ItemNoMercado, ResultadoCotacao } from "../src/lib/types";

function item(itemId: string, opts: Partial<ItemNoMercado> = {}): ItemNoMercado {
  return { itemId, itemTexto: itemId, candidatos: [], escolhaIndex: null, ...opts };
}

function baseCom(itens1: ItemNoMercado[], itens2: ItemNoMercado[]): ResultadoCotacao {
  return {
    geradoEm: "2026-01-01T00:00:00Z",
    itensPendentes: itens1.filter((i) => i.erro === "sem tempo").map((i) => i.itemId),
    mercados: [
      { mercadoId: "shibata", mercadoNome: "Shibata", itens: itens1 },
      { mercadoId: "semar", mercadoNome: "Semar", itens: itens2 },
    ],
  };
}

describe("mesclarResultadoParcial", () => {
  it("substitui só os itens que vieram na chamada de continuação, mantendo os demais", () => {
    const base = baseCom(
      [item("a", { escolhaIndex: 0, candidatos: [{ nome: "Feijão", preco: 5, disponivel: true }] }), item("b", { erro: "sem tempo" })],
      [item("a", { escolhaIndex: 1, candidatos: [{ nome: "Arroz", preco: 8, disponivel: true }] }), item("b", { erro: "sem tempo" })],
    );

    const parcial: ResultadoCotacao = {
      geradoEm: "2026-01-01T00:00:10Z",
      mercados: [
        { mercadoId: "shibata", mercadoNome: "Shibata", itens: [item("b", { escolhaIndex: 2 })] },
        { mercadoId: "semar", mercadoNome: "Semar", itens: [item("b", { escolhaIndex: 3 })] },
      ],
    };

    const mesclado = mesclarResultadoParcial(base, parcial);

    expect(mesclado.itensPendentes).toBeUndefined();
    expect(mesclado.mercados[0].itens).toEqual([item("a", { escolhaIndex: 0, candidatos: [{ nome: "Feijão", preco: 5, disponivel: true }] }), item("b", { escolhaIndex: 2 })]);
    expect(mesclado.mercados[1].itens).toEqual([item("a", { escolhaIndex: 1, candidatos: [{ nome: "Arroz", preco: 8, disponivel: true }] }), item("b", { escolhaIndex: 3 })]);
  });

  it("preserva itensPendentes quando a continuação ainda não terminou tudo (várias rodadas)", () => {
    const base = baseCom([item("a", { erro: "sem tempo" }), item("b", { erro: "sem tempo" })], [item("a", { erro: "sem tempo" }), item("b", { erro: "sem tempo" })]);

    const parcial: ResultadoCotacao = {
      geradoEm: "2026-01-01T00:00:10Z",
      itensPendentes: ["b"],
      mercados: [
        { mercadoId: "shibata", mercadoNome: "Shibata", itens: [item("a", { escolhaIndex: 0 }), item("b", { erro: "sem tempo" })] },
        { mercadoId: "semar", mercadoNome: "Semar", itens: [item("a", { escolhaIndex: 1 }), item("b", { erro: "sem tempo" })] },
      ],
    };

    const mesclado = mesclarResultadoParcial(base, parcial);

    expect(mesclado.itensPendentes).toEqual(["b"]);
    expect(mesclado.mercados[0].itens.find((i) => i.itemId === "a")?.escolhaIndex).toBe(0);
    expect(mesclado.mercados[0].itens.find((i) => i.itemId === "b")?.erro).toBe("sem tempo");
  });

  it("recalcula o erro de nível de mercado com base nos itens já mesclados, não herda de nenhum dos dois lados", () => {
    // Mercado shibata: item "a" já veio certo antes, "b" só se resolve agora
    // — mesmo que a resposta PARCIAL tenha só o item "b" (sem erro), o
    // mercado como um todo não pode ficar marcado como erro só porque a
    // resposta base tinha erro num item que já foi substituído.
    const base = baseCom([item("a", { erro: "falhou" }), item("b", { erro: "falhou" })], [item("a", { erro: "falhou" }), item("b", { erro: "falhou" })]);

    const parcial: ResultadoCotacao = {
      geradoEm: "2026-01-01T00:00:10Z",
      mercados: [
        { mercadoId: "shibata", mercadoNome: "Shibata", itens: [item("a", { escolhaIndex: 0 }), item("b", { escolhaIndex: 1 })] },
        { mercadoId: "semar", mercadoNome: "Semar", itens: [item("a", { erro: "ainda falhou" }), item("b", { erro: "ainda falhou" })] },
      ],
    };

    const mesclado = mesclarResultadoParcial(base, parcial);

    expect(mesclado.mercados[0].erro).toBeUndefined();
    expect(mesclado.mercados[1].erro).toBe("ainda falhou");
  });
});
