import { describe, expect, it } from "vitest";
import { mapComConcorrencia } from "../src/lib/concorrencia";

describe("mapComConcorrencia", () => {
  it("preserva a ordem dos resultados mesmo com processamento concorrente", async () => {
    const itens = [30, 10, 20, 5, 15];
    const resultado = await mapComConcorrencia(itens, 2, async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 2;
    });
    expect(resultado).toEqual([60, 20, 40, 10, 30]);
  });

  it("processa todos os itens mesmo com limite maior que a lista", async () => {
    const resultado = await mapComConcorrencia([1, 2, 3], 10, async (n) => n + 1);
    expect(resultado).toEqual([2, 3, 4]);
  });
});
