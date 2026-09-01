import { describe, expect, it } from "vitest";
import { escolherMatches, extrairTermoBusca } from "../src/lib/matching";

describe("extrairTermoBusca", () => {
  it("remove tokens de quantidade/unidade", () => {
    expect(extrairTermoBusca("arroz 5kg")).toBe("arroz");
  });

  it("mantém as duas primeiras palavras com conteúdo", () => {
    expect(extrairTermoBusca("sabonete dove")).toBe("sabonete dove");
  });

  it("remove unidade mesmo no meio da frase", () => {
    expect(extrairTermoBusca("arroz 5kg integral")).toBe("arroz integral");
  });

  it("nunca devolve string vazia", () => {
    expect(extrairTermoBusca("2un")).not.toBe("");
  });
});

describe("escolherMatches", () => {
  it("não chama a IA e devolve tudo nulo quando não há nenhum candidato", async () => {
    const { escolha, tokensEntrada, tokensSaida } = await escolherMatches("item sem resultado em lugar nenhum", {
      shibata: [],
      semar: [],
      alabarce: [],
    });
    expect(escolha).toEqual({ shibata: null, semar: null, alabarce: null });
    expect(tokensEntrada).toBe(0);
    expect(tokensSaida).toBe(0);
  });
});
