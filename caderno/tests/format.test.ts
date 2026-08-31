import { describe, expect, it } from "vitest";
import { parseValorBR } from "../src/lib/format";

describe("parseValorBR", () => {
  it("número simples sem separador", () => {
    expect(parseValorBR("4500")).toBe(4500);
  });

  it("vírgula decimal (formato brasileiro)", () => {
    expect(parseValorBR("4500,5")).toBe(4500.5);
    expect(parseValorBR("399,50")).toBe(399.5);
  });

  it("ponto de milhar + vírgula decimal (formato brasileiro completo)", () => {
    expect(parseValorBR("4.500,00")).toBe(4500);
    expect(parseValorBR("1.234.567,89")).toBe(1234567.89);
  });

  it("ponto decimal (formato de String(number), usado nos valores sugeridos)", () => {
    expect(parseValorBR("4500.5")).toBe(4500.5);
    expect(parseValorBR("0.5")).toBe(0.5);
  });

  it("ponto isolado com 3 dígitos depois — trata como milhar, não decimal", () => {
    expect(parseValorBR("4.500")).toBe(4500);
  });

  it("vazio ou só espaço vira 0, nunca NaN", () => {
    expect(parseValorBR("")).toBe(0);
    expect(parseValorBR("   ")).toBe(0);
  });

  it("texto não numérico vira 0", () => {
    expect(parseValorBR("abc")).toBe(0);
  });

  it("negativo", () => {
    expect(parseValorBR("-500")).toBe(-500);
    expect(parseValorBR("-1.500,50")).toBe(-1500.5);
  });
});
