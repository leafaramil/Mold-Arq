import { describe, expect, it } from "vitest";
import { casamentoDeterministico, escolherMatches, extrairTermoBusca, termoFallback } from "../src/lib/matching";
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

describe("casamentoDeterministico", () => {
  it("acha o único candidato que contém todas as palavras de conteúdo do item", () => {
    const candidatos = [produto("Arroz Branco Camil 5kg"), produto("Arroz Integral Tio João 1kg")];
    expect(casamentoDeterministico("arroz integral", candidatos)).toBe(1);
  });

  it("ignora acento na comparação", () => {
    const candidatos = [produto("Acucar Cristal Uniao 1kg")];
    expect(casamentoDeterministico("açúcar", candidatos)).toBe(0);
  });

  it("não decide quando dois candidatos batem com as mesmas palavras", () => {
    const candidatos = [produto("Leite Integral Piracanjuba 1L"), produto("Leite Integral Italac 1L")];
    expect(casamentoDeterministico("leite integral", candidatos)).toBeNull();
  });

  it("não decide quando nenhum candidato bate", () => {
    const candidatos = [produto("Suco de Uva Natural One 1L")];
    expect(casamentoDeterministico("leite integral", candidatos)).toBeNull();
  });

  it("não decide quando o item não tem nenhuma palavra de conteúdo", () => {
    expect(casamentoDeterministico("2un", [produto("Ovo Branco Grande 2un")])).toBeNull();
  });
});

describe("escolherMatches", () => {
  it("não chama a IA e devolve tudo nulo quando não há nenhum candidato", async () => {
    const { escolha, tokensEntrada, tokensSaida } = await escolherMatches("item sem resultado em lugar nenhum", {
      shibata: [],
      semar: [],
      alabarce: [],
      atacadao: [],
      nagumo: [],
    });
    expect(escolha).toEqual({ shibata: null, semar: null, alabarce: null, atacadao: null, nagumo: null });
    expect(tokensEntrada).toBe(0);
    expect(tokensSaida).toBe(0);
  });

  // O ponto central do híbrido: quando o casamento por texto já resolve
  // todos os mercados que têm candidato, a IA nem precisa ser chamada — daí
  // tokensEntrada/tokensSaida ficarem em 0 mesmo com candidatos presentes
  // (diferente do teste acima, que testa a lista vazia).
  it("resolve por texto sem chamar IA quando o match é óbvio em todos os mercados com candidato", async () => {
    const { escolha, tokensEntrada, tokensSaida, erro } = await escolherMatches("arroz integral", {
      shibata: [produto("Arroz Integral Camil 1kg")],
      semar: [],
      alabarce: [produto("Arroz Branco Camil 5kg"), produto("Arroz Integral Tio João 1kg")],
      atacadao: [],
      nagumo: [],
    });
    expect(escolha).toEqual({ shibata: 0, semar: null, alabarce: 1, atacadao: null, nagumo: null });
    expect(tokensEntrada).toBe(0);
    expect(tokensSaida).toBe(0);
    expect(erro).toBeUndefined();
  });
});
