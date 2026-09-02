import { describe, expect, it } from "vitest";
import { extrairPesoEmKg, precoPorKg } from "../src/lib/peso";

describe("extrairPesoEmKg", () => {
  it("extrai peso em gramas e converte pra kg", () => {
    expect(extrairPesoEmKg("Alho Nacional 100g")).toBeCloseTo(0.1);
    expect(extrairPesoEmKg("Queijo Mussarela Fatiado 150 G")).toBeCloseTo(0.15);
  });

  it("extrai peso já em kg, com vírgula ou ponto decimal", () => {
    expect(extrairPesoEmKg("Batata 1kg")).toBeCloseTo(1);
    expect(extrairPesoEmKg("Arroz Camil Tipo 1 5kg")).toBeCloseTo(5);
    expect(extrairPesoEmKg("Cenoura 1,5 Kg")).toBeCloseTo(1.5);
  });

  it("trata 'Kg' solto (sem número) como vendido a peso variável — preço já é por kg", () => {
    expect(extrairPesoEmKg("Picanha Bovina Kg")).toBe(1);
    expect(extrairPesoEmKg("Tomate Kg")).toBe(1);
  });

  it("devolve null quando não identifica peso nenhum", () => {
    expect(extrairPesoEmKg("Alho Roxo Premium")).toBeNull();
    expect(extrairPesoEmKg("Sabonete Dove")).toBeNull();
  });
});

describe("precoPorKg", () => {
  it("normaliza corretamente o exemplo do alho: R$3 em 100g vira R$30/kg", () => {
    expect(precoPorKg(3, "Alho Nacional 100g")).toBeCloseTo(30);
  });

  it("não muda o preço quando o produto já é vendido por kg", () => {
    expect(precoPorKg(15, "Alho Kg")).toBeCloseTo(15);
  });

  it("devolve null quando não dá pra identificar o peso", () => {
    expect(precoPorKg(10, "Alho Roxo Premium")).toBeNull();
  });
});
