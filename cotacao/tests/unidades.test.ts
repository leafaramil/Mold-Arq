import { describe, expect, it } from "vitest";
import { sugerirUnidade } from "../src/lib/unidades";

describe("sugerirUnidade", () => {
  it("sugere kg pra carnes e hortifruti", () => {
    expect(sugerirUnidade("carne moída")).toBe("kg");
    expect(sugerirUnidade("Tomate")).toBe("kg");
  });

  it("sugere dúzia pra ovos", () => {
    expect(sugerirUnidade("ovos")).toBe("dz");
  });

  it("sugere litro pra leite", () => {
    expect(sugerirUnidade("leite integral")).toBe("l");
  });

  it("cai pra unidade quando não bate com nada do dicionário", () => {
    expect(sugerirUnidade("sabonete dove")).toBe("un");
  });

  it("ignora acentuação ao comparar", () => {
    expect(sugerirUnidade("limão")).toBe("kg");
  });
});
