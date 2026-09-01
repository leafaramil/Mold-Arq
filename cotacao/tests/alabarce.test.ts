import { describe, expect, it } from "vitest";
import { parsePrecoBR } from "../src/lib/mercados/alabarce";

describe("parsePrecoBR", () => {
  it("converte preço simples em formato brasileiro", () => {
    expect(parsePrecoBR("5,90")).toBeCloseTo(5.9);
  });

  it("remove separador de milhar", () => {
    expect(parsePrecoBR("1.234,56")).toBeCloseTo(1234.56);
  });

  it("lida com preço sem casas decimais", () => {
    expect(parsePrecoBR("10,00")).toBeCloseTo(10);
  });
});
