import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, extrairProdutosDoHtml } from "../src/lib/mercados/nagumo";

describe("decodeHtmlEntities", () => {
  it("decodifica entidades nomeadas comuns em português", () => {
    expect(decodeHtmlEntities("Arroz Integral &atilde; Cora&ccedil;&atilde;o")).toBe("Arroz Integral ã Coração");
  });

  it("decodifica aspas escapadas (comum em atributo HTML com JSON dentro)", () => {
    expect(decodeHtmlEntities("&quot;preco&quot;")).toBe('"preco"');
  });

  it("decodifica entidades numéricas", () => {
    expect(decodeHtmlEntities("caf&#233;")).toBe("café");
  });

  it("mantém texto sem entidades intacto", () => {
    expect(decodeHtmlEntities("arroz camil 5kg")).toBe("arroz camil 5kg");
  });
});

describe("extrairProdutosDoHtml", () => {
  it("extrai e decodifica o JSON embutido no elemento search-card-grid", () => {
    const produtosJson = JSON.stringify([{ productName: "Arroz Camil 5Kg", brand: "CAMIL", price: { sales: { value: 21.49 } }, available: true }]).replace(
      /"/g,
      "&quot;",
    );
    const html = `<html><body><search-card-grid class="x" products="${produtosJson}"></search-card-grid></body></html>`;
    const produtos = extrairProdutosDoHtml(html);
    expect(produtos).toEqual([{ productName: "Arroz Camil 5Kg", brand: "CAMIL", price: { sales: { value: 21.49 } }, available: true }]);
  });

  it("devolve null quando o elemento não aparece (sem resultado, não é erro)", () => {
    expect(extrairProdutosDoHtml("<html><body>nenhum resultado</body></html>")).toBeNull();
  });

  it("propaga erro quando o atributo existe mas o JSON está malformado", () => {
    const html = `<search-card-grid products="{isso nao e json valido">`;
    expect(() => extrairProdutosDoHtml(html)).toThrow();
  });
});
