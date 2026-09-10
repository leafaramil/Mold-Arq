import { describe, expect, it } from "vitest";
import { buscarComFallback } from "../src/lib/mercados/fallback";
import type { BuscaMercado } from "../src/lib/mercados/types";

const PRODUTO = { nome: "FEIJAO CARIOCA 1KG", preco: 8.9, disponivel: true };

/** Mercado falso que registra os termos buscados e responde por termo. */
function mercado(respostas: Record<string, BuscaMercado>) {
  const termos: string[] = [];
  const buscar = async (t: string) => {
    termos.push(t);
    return respostas[t] ?? { produtos: [] };
  };
  return { termos, buscar };
}

describe("buscarComFallback", () => {
  it("não tenta de novo quando a primeira busca já achou algo", async () => {
    const m = mercado({ "feijão carioca": { produtos: [PRODUTO] } });
    const r = await buscarComFallback("feijão carioca", m.buscar);
    expect(r.produtos).toHaveLength(1);
    expect(m.termos).toEqual(["feijão carioca"]);
  });

  // O caso que motivou tudo: mercado de busca estrita não acha "feijão
  // carioca", mas acha "feijão". Sem o fallback isso virava "não encontrado".
  it("tenta o termo curto quando a busca completa volta vazia", async () => {
    const m = mercado({ "feijão carioca": { produtos: [] }, "feijão": { produtos: [PRODUTO] } });
    const r = await buscarComFallback("feijão carioca", m.buscar);
    expect(r.produtos).toEqual([PRODUTO]);
    expect(m.termos).toEqual(["feijão carioca", "feijão"]);
  });

  it("não repete a busca quando não há termo mais curto", async () => {
    const m = mercado({ "feijão": { produtos: [] } });
    await buscarComFallback("feijão", m.buscar);
    expect(m.termos).toEqual(["feijão"]);
  });

  it("preserva erro de rede em vez de tentar de novo", async () => {
    const m = mercado({ "feijão carioca": { produtos: [], erro: "fetch failed" } });
    const r = await buscarComFallback("feijão carioca", m.buscar);
    expect(r.erro).toBe("fetch failed");
    expect(m.termos).toEqual(["feijão carioca"]);
  });

  it("preserva token expirado em vez de tentar de novo", async () => {
    const m = mercado({ "feijão carioca": { produtos: [], tokenExpirado: true } });
    const r = await buscarComFallback("feijão carioca", m.buscar);
    expect(r.tokenExpirado).toBe(true);
    expect(m.termos).toEqual(["feijão carioca"]);
  });

  it("um erro só na segunda tentativa não vira erro do mercado", async () => {
    const m = mercado({ "feijão carioca": { produtos: [] }, "feijão": { produtos: [], erro: "500" } });
    const r = await buscarComFallback("feijão carioca", m.buscar);
    expect(r.erro).toBeUndefined();
    expect(r.produtos).toEqual([]);
  });

  // O caso real que motivou isso: "pasta de dente" busca vazia no Alabarce
  // porque lá o produto é cadastrado como "creme dental" — sem o sinônimo,
  // a busca só chegava no fallback de termo curto ("pasta"), que traz pasta
  // de amendoim/pasta de dente errado em vez do produto certo.
  it("tenta o sinônimo conhecido antes do termo curto, quando o termo bate no dicionário", async () => {
    const m = mercado({ "pasta de dente": { produtos: [] }, "creme dental": { produtos: [PRODUTO] } });
    const r = await buscarComFallback("pasta de dente", m.buscar);
    expect(r.produtos).toEqual([PRODUTO]);
    expect(m.termos).toEqual(["pasta de dente", "creme dental"]);
  });

  it("cai pro termo curto quando o sinônimo também vem vazio", async () => {
    const m = mercado({ "pasta de dente": { produtos: [] }, "creme dental": { produtos: [] }, "pasta": { produtos: [PRODUTO] } });
    const r = await buscarComFallback("pasta de dente", m.buscar);
    expect(r.produtos).toEqual([PRODUTO]);
    expect(m.termos).toEqual(["pasta de dente", "creme dental", "pasta"]);
  });

  it("não tenta sinônimo quando o termo não está no dicionário", async () => {
    const m = mercado({ "arroz integral": { produtos: [] }, "arroz": { produtos: [PRODUTO] } });
    const r = await buscarComFallback("arroz integral", m.buscar);
    expect(r.produtos).toEqual([PRODUTO]);
    expect(m.termos).toEqual(["arroz integral", "arroz"]);
  });
});
