import { describe, expect, it } from "vitest";
import { coberturaTokens, decidirMatch, diceCoeficiente, extrairTamanho, pontuarCandidatos } from "../src/lib/matching-score";
import type { ProdutoEncontrado } from "../src/lib/mercados/types";

function produto(nome: string, preco = 10): ProdutoEncontrado {
  return { nome, preco, disponivel: true };
}

describe("extrairTamanho", () => {
  it("canoniza kg/g pra gramas", () => {
    expect(extrairTamanho("Arroz Camil 5kg")).toBe("5000g");
    expect(extrairTamanho("Sabonete 90g")).toBe("90g");
  });

  it("canoniza l/ml pra mililitros", () => {
    expect(extrairTamanho("Leite Integral 1L")).toBe("1000ml");
    expect(extrairTamanho("Detergente 500ml")).toBe("500ml");
  });

  it("aceita decimal com virgula", () => {
    expect(extrairTamanho("Vinho 1,5 l")).toBe("1500ml");
  });

  it("null quando não tem tamanho no texto", () => {
    expect(extrairTamanho("Sabonete Dove")).toBeNull();
  });
});

describe("diceCoeficiente", () => {
  it("1.0 pra strings idênticas", () => {
    expect(diceCoeficiente("arroz integral", "arroz integral")).toBe(1);
  });

  it("alto mas não perfeito pra erro de digitação de uma letra", () => {
    // mesmo caso que a IA tratava explicitamente no prompt antigo
    const score = diceCoeficiente("madioquinha", "mandioquinha");
    expect(score).toBeGreaterThan(0.75);
    expect(score).toBeLessThan(1);
  });

  it("baixo pra palavras sem relação", () => {
    expect(diceCoeficiente("sabonete", "desengordurante")).toBeLessThan(0.3);
  });
});

describe("coberturaTokens", () => {
  it("1.0 quando todos os tokens do termo aparecem", () => {
    expect(coberturaTokens(["arroz", "integral"], ["arroz", "integral", "camil"])).toBe(1);
  });

  it("parcial quando só alguns aparecem", () => {
    expect(coberturaTokens(["musculo", "bovino"], ["desengordurante", "mr", "musculo", "cozinha"])).toBe(0.5);
  });
});

// Teste negativo do limiar de 0.7 (SIMILARIDADE_MINIMA_TOKEN): a tolerância a
// erro de digitação não pode virar tolerância a PALAVRA DIFERENTE. "carne" e
// "carro" têm Dice = 0.5 (abaixo do limiar) — parecidas na grafia, mas são
// produtos completamente diferentes; isso NUNCA pode contar como cobertura.
// Do outro lado do limiar, "leite"/"peite" (Dice = 0.75, mesmo formato de erro
// de digitação de uma letra do teste de diceCoeficiente acima) TEM que contar.
// Roda antes do resto pra validar que o limiar calibrado não é permissivo
// demais antes de construir o cache de preferência e a troca do fluxo em cima dele.
describe("coberturaTokens — limiar de 0.7 (negativo/positivo)", () => {
  it("NÃO conta como cobertura abaixo do limiar — palavra diferente, não erro de digitação", () => {
    expect(diceCoeficiente("carne", "carro")).toBeLessThan(0.7);
    expect(coberturaTokens(["carne"], ["carro"])).toBe(0);
  });

  it("conta como cobertura acima do limiar — erro de digitação de fato", () => {
    expect(diceCoeficiente("leite", "peite")).toBeGreaterThanOrEqual(0.7);
    expect(coberturaTokens(["leite"], ["peite"])).toBe(1);
  });
});

describe("pontuarCandidatos — filtro de tamanho", () => {
  it("descarta candidato com tamanho divergente antes de pontuar", () => {
    const candidatos = [produto("Leite em Pó Integral Ninho 380g"), produto("Leite Integral Piracanjuba 1L")];
    const pontuados = pontuarCandidatos("Leite 1L", candidatos);
    expect(pontuados).toHaveLength(1);
    expect(pontuados[0].indice).toBe(1);
  });

  it("não descarta quando um dos dois não tem tamanho identificável", () => {
    const candidatos = [produto("Leite Integral Genérico")];
    expect(pontuarCandidatos("Leite 1L", candidatos)).toHaveLength(1);
  });
});

describe("decidirMatch — casos de controle (deveria resolver sozinho)", () => {
  it("match óbvio de marca+variante", () => {
    const r = decidirMatch("arroz integral", [produto("Arroz Branco Camil 5kg"), produto("Arroz Integral Camil 1kg")]);
    expect(r.ambiguo).toBe(false);
    expect(r.indice).toBe(1);
  });

  it("tolera erro de digitação de uma letra (mesmo caso do prompt de IA antigo)", () => {
    const r = decidirMatch("madioquinha", [produto("Mandioquinha Congelada 500g"), produto("Suco de Uva 1L")]);
    expect(r.ambiguo).toBe(false);
    expect(r.indice).toBe(0);
  });
});

// Casos reais capturados em produção (logs desta sessão) onde a IA rejeitou
// TODOS os candidatos — ou seja, "nenhum serve" era a decisão certa. O score
// precisa chegar na mesma conclusão (ambíguo/sem match), senão está mais
// permissivo que a IA e vai forçar match errado.
describe("decidirMatch — casos reais que a IA rejeitou (regressão)", () => {
  it('"Melancia baby" contra produtos só com sabor/aroma de melancia — nenhum é a fruta', () => {
    const r = decidirMatch("Melancia baby", [
      produto("Melancia 8,2kg"),
      produto("Gelo Coko Melancia 185g"),
      produto("Coquetel Corote Melancia 500ml"),
      produto("Semente Feltrin Melancia Redonda"),
      produto("Gel Dental Carmed Melancia 70g"),
      produto("Energético Baly Melancia 2L"),
    ]);
    expect(r.ambiguo).toBe(true);
  });

  it('"Tilápia aurora" contra produtos "Aurora" que não são tilápia — marca certa, produto errado', () => {
    const r = decidirMatch("Tilápia aurora", [
      produto("Leite Longa Vida Aurora Semi Desnatado Caixa - 1L"),
      produto("Vinho Tinto Aurora Varietal 750ml Pinot Noir"),
      produto("Hambúrguer de Carne Bovina Aurora Pacote - 90g"),
      produto("Mortadela Tradicional Aurora Tubular - 400g"),
    ]);
    expect(r.ambiguo).toBe(true);
  });

  it('"Leite em pó sem lactose" contra leites em pó comuns — nenhum diz "sem lactose"', () => {
    const r = decidirMatch("Leite em pó sem lactose", [
      produto("Leite Em Pó Integral Instantaneo Ninho Lata 380g"),
      produto("Leite em Pó Itambé Integral 200g"),
      produto("Leite em Pó Integral Aurora 400g"),
      produto("Leite em Pó Integral Italac 400g"),
    ]);
    expect(r.ambiguo).toBe(true);
  });

  it('"Polvilho azedo" contra biscoitos de polvilho salgado — sabor errado', () => {
    const r = decidirMatch("Polvilho azedo", [
      produto("Biscoito de Polvilho Cassini Salgado 100g"),
      produto("Polvilho Doce Pinduca 1kg"),
      produto("Biscoito de Polvilho Natural Life Tradicional 90g"),
    ]);
    expect(r.ambiguo).toBe(true);
  });

  it('"Músculo bovino" contra desengordurante de cozinha — caso mais perigoso: produto de limpeza tem "musculo" no nome', () => {
    const r = decidirMatch("Músculo bovino", [
      produto("Desengordurante Mr. Músculo Cozinha 400ml"),
      produto("Hambúrguer Bovino Friboi Congelado 400g"),
      produto("Carne Bovina Moída Friboi Congelada 500g"),
    ]);
    // nenhum candidato é realmente "músculo" (o corte bovino) — tem que ficar ambíguo,
    // e sobretudo NUNCA escolher o produto de limpeza só por ele conter a palavra "músculo"
    expect(r.ambiguo).toBe(true);
  });
});

// Caso onde o comportamento MUDA de propósito em relação ao antigo
// casamento por substring (removido — resolvia "sabonete" com várias
// marcas batendo pro preço mediano, sem checar se era ambiguidade real).
// Com score, dois candidatos fortes e quase empatados são ambiguidade de
// verdade — cai pra confirmação manual em vez de adivinhar.
describe("decidirMatch — mudança de comportamento intencional (item genérico sem marca)", () => {
  it('"leite integral" com dois candidatos igualmente bons fica ambíguo (não escolhe sozinho)', () => {
    const r = decidirMatch("leite integral", [produto("Leite Integral Piracanjuba 1L", 5.0), produto("Leite Integral Italac 1L", 6.0)]);
    expect(r.ambiguo).toBe(true);
  });
});
