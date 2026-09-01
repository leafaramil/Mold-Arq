import { describe, expect, it } from "vitest";
import { montarUrlAtacadao } from "../src/lib/mercados/atacadao";

describe("montarUrlAtacadao", () => {
  it("inclui o operationName e o termo de busca codificado", () => {
    const url = montarUrlAtacadao("arroz integral");
    expect(url).toContain("operationName=ProductsQuery");
    const variaveis = decodeURIComponent(new URL(url).searchParams.get("variables")!);
    const obj = JSON.parse(variaveis);
    expect(obj.term).toBe("arroz integral");
    expect(obj.first).toBe(20);
  });

  it("usa o seller e regionId fixos da loja de Mogi das Cruzes", () => {
    const url = montarUrlAtacadao("feijão");
    const variaveis = JSON.parse(decodeURIComponent(new URL(url).searchParams.get("variables")!));
    const facetChannel = variaveis.selectedFacets.find((f: { key: string }) => f.key === "channel");
    const channel = JSON.parse(facetChannel.value);
    expect(channel.seller).toBe("atacadaobr940");
    expect(channel.regionId).toBe("U1cjYXRhY2FkYW9icjkOMA==");
  });
});
