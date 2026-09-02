import { describe, expect, it } from "vitest";
import { sugerirUnidade } from "../src/lib/unidades";

describe("sugerirUnidade", () => {
  it("sugere kg pra carnes e hortifruti", () => {
    expect(sugerirUnidade("carne moída")).toBe("kg");
    expect(sugerirUnidade("Tomate")).toBe("kg");
    expect(sugerirUnidade("alho")).toBe("kg");
  });

  it("sugere dúzia pra ovos", () => {
    expect(sugerirUnidade("ovos")).toBe("dz");
  });

  it("cai pra unidade quando não bate com nada do dicionário", () => {
    expect(sugerirUnidade("sabonete dove")).toBe("un");
  });

  it("sugere unidade (não litro) pra líquidos vendidos em embalagem fechada", () => {
    // leite, óleo, água, refrigerante e suco são vendidos por garrafa/caixa
    // com preço fixo por embalagem, não a granel — "un" é o padrão correto
    // (quantidade = quantas embalagens comprar, não o volume de uma delas).
    expect(sugerirUnidade("leite integral")).toBe("un");
    expect(sugerirUnidade("azeite de oliva")).toBe("un");
    expect(sugerirUnidade("óleo de soja")).toBe("un");
  });

  it("ignora acentuação ao comparar", () => {
    expect(sugerirUnidade("limão")).toBe("kg");
  });
});
