import { describe, expect, it } from "vitest";
import { escolherMatches, extrairTermoBusca, termoFallback } from "../src/lib/matching";
import type { ProdutoEncontrado } from "../src/lib/mercados/types";

function produto(nome: string, preco = 10): ProdutoEncontrado {
  return { nome, preco, disponivel: true };
}

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

  // Regressão: a versão antiga só removia "5kg" colado e números soltos, então
  // a unidade separada sobrava como se fosse o nome do produto — a busca ia
  // pro mercado como "feijão kg" e voltava ZERO resultado. Era essa a causa do
  // "não encontrado" que aparecia em mercado de busca estrita (Alabarce).
  it("remove unidade escrita separada do número", () => {
    expect(extrairTermoBusca("feijão 1 kg")).toBe("feijão");
    expect(extrairTermoBusca("arroz 5 kg")).toBe("arroz");
    expect(extrairTermoBusca("detergente 500 ml")).toBe("detergente");
  });

  // Regressão: quantidade escrita na frente empurrava as palavras de conteúdo
  // pra fora do corte de duas palavras — "2 kg de feijão" virava a busca "kg de".
  it("ignora quantidade escrita antes do produto", () => {
    expect(extrairTermoBusca("2 kg de feijão")).toBe("feijão");
    expect(extrairTermoBusca("1 pacote de bolacha")).toBe("bolacha");
    expect(extrairTermoBusca("12 unidades de ovo")).toBe("ovo");
  });

  // Regressão: preposição contava como palavra e comia a vaga do produto —
  // "óleo de soja" virava "óleo de", "sabão em pó omo" virava "sabão em".
  it("não gasta o orçamento de palavras com preposição, e a mantém no meio", () => {
    expect(extrairTermoBusca("óleo de soja")).toBe("óleo de soja");
    expect(extrairTermoBusca("creme de leite")).toBe("creme de leite");
    expect(extrairTermoBusca("sabão em pó omo")).toBe("sabão em pó");
    expect(extrairTermoBusca("leite em pó ninho")).toBe("leite em pó");
  });

  it("continua cortando na segunda palavra de conteúdo", () => {
    expect(extrairTermoBusca("papel higiênico folha dupla")).toBe("papel higiênico");
    expect(extrairTermoBusca("feijão preto tipo 1")).toBe("feijão preto");
  });
});

describe("termoFallback", () => {
  it("encurta pro primeiro termo de conteúdo", () => {
    expect(termoFallback("feijão carioca")).toBe("feijão");
    expect(termoFallback("creme de leite")).toBe("creme");
  });

  it("devolve null quando já não dá pra encurtar", () => {
    expect(termoFallback("feijão")).toBeNull();
    expect(termoFallback("")).toBeNull();
  });
});

describe("escolherMatches", () => {
  const semEscolha = { indice: null, ambiguo: false };

  it("devolve tudo nulo quando não há nenhum candidato", () => {
    const { escolha } = escolherMatches("item sem resultado em lugar nenhum", {
      shibata: [],
      semar: [],
      alabarce: [],
      atacadao: [],
      nagumo: [],
    });
    expect(escolha).toEqual({ shibata: semEscolha, semar: semEscolha, alabarce: semEscolha, atacadao: semEscolha, nagumo: semEscolha });
  });

  // Sem IA: o score (matching-score.ts) resolve o caso óbvio direto — ver
  // tests/matching-score.test.ts pros testes de calibração do score em si.
  it("resolve pelo score quando o match é óbvio em todos os mercados com candidato", () => {
    const { escolha } = escolherMatches("arroz integral", {
      shibata: [produto("Arroz Integral Camil 1kg")],
      semar: [],
      alabarce: [produto("Arroz Branco Camil 5kg"), produto("Arroz Integral Tio João 1kg")],
      atacadao: [],
      nagumo: [],
    });
    expect(escolha.shibata).toEqual({ indice: 0, ambiguo: false });
    expect(escolha.semar).toEqual(semEscolha);
    expect(escolha.alabarce).toEqual({ indice: 1, ambiguo: false });
    expect(escolha.atacadao).toEqual(semEscolha);
    expect(escolha.nagumo).toEqual(semEscolha);
  });

  it("usa o cache de preferência quando o nome bate, sem precisar do score", () => {
    const candidatos = [produto("Coisa Rara Sem Nenhuma Palavra Em Comum 1kg")];
    const preferencias = new Map([["item generico|shibata", "coisa rara sem nenhuma palavra em comum 1kg"]]);
    const { escolha } = escolherMatches(
      "item generico",
      { shibata: candidatos, semar: [], alabarce: [], atacadao: [], nagumo: [] },
      preferencias,
    );
    expect(escolha.shibata).toEqual({ indice: 0, ambiguo: false });
  });

  it("ignora preferência que não bate em nenhum candidato da busca ao vivo (produto saiu de linha) e cai pro score", () => {
    const preferencias = new Map([["arroz integral|shibata", "arroz integral marca que nao existe mais 1kg"]]);
    const { escolha } = escolherMatches(
      "arroz integral",
      { shibata: [produto("Arroz Integral Camil 1kg")], semar: [], alabarce: [], atacadao: [], nagumo: [] },
      preferencias,
    );
    expect(escolha.shibata).toEqual({ indice: 0, ambiguo: false });
  });
});
