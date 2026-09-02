// Casamento de produto por IA (ver briefing): cada item da lista de compras
// (texto livre, ex: "arroz 5kg", "sabonete dove") precisa ser comparado
// contra os resultados de busca de cada mercado pro mesmo termo. Um único
// item pode ter candidatos vindos de até 3 mercados ao mesmo tempo — em vez
// de 1 chamada de IA por (item, mercado), que triplicaria o custo, este
// módulo faz 1 chamada por item, passando os candidatos dos 3 mercados
// juntos e pedindo pro modelo escolher (ou recusar) um match em cada um.
//
// Ponto de atenção de custo (ver briefing): pra uma lista de 20-30 itens,
// isso ainda é uma chamada de IA por item — nada de cache/otimização
// prematura nessa v1, mas o custo existe e cresce linear com o tamanho da
// lista.
import { chamarAnthropicComFerramenta, type AnthropicTool } from "./anthropic-server";
import type { ProdutoEncontrado } from "./mercados/types";

export type MercadoId = "shibata" | "semar" | "alabarce" | "atacadao" | "nagumo";

const SEM_MATCH = -1;

const UNIDADES = /^\d+([.,]\d+)?\s*(kg|g|gr|ml|l|un|und|unidades?|pct|pacote|cx|caixa|dz|dúzia)$/i;

/**
 * Simplifica o texto livre do item para um termo de busca — ex: "arroz 5kg
 * integral" → "arroz integral" (remove tokens de quantidade/unidade, que os
 * mecanismos de busca dos mercados não interpretam bem misturados ao nome).
 * Heurística determinística de propósito (sem chamada de IA extra): mantém
 * as duas primeiras palavras "com conteúdo" do texto.
 */
export function extrairTermoBusca(textoItem: string): string {
  const palavras = textoItem
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !UNIDADES.test(p) && !/^\d+$/.test(p));
  const termo = (palavras.length > 0 ? palavras : textoItem.trim().split(/\s+/)).slice(0, 2).join(" ");
  return termo || textoItem.trim();
}

interface CandidatosPorMercado {
  shibata: ProdutoEncontrado[];
  semar: ProdutoEncontrado[];
  alabarce: ProdutoEncontrado[];
  atacadao: ProdutoEncontrado[];
  nagumo: ProdutoEncontrado[];
}

export interface MatchEscolhido {
  shibata: number | null; // índice em candidatos.shibata, ou null
  semar: number | null;
  alabarce: number | null;
  atacadao: number | null;
  nagumo: number | null;
}

const TOOL: AnthropicTool = {
  name: "escolher_matches",
  description:
    "Escolhe, para cada mercado, qual candidato da lista (se algum) é realmente o mesmo produto que o item da lista de compras descreve. " +
    "Nomes e marcas variam entre mercados e entre como a pessoa descreveu o item — use bom senso (sinônimos, abreviações, marca vs. genérico). " +
    `Se nenhum candidato daquele mercado for um match razoável, responda ${SEM_MATCH} pra esse mercado — nunca escolha o candidato só por ser o mais parecido se ele não for realmente o mesmo produto.`,
  input_schema: {
    type: "object",
    properties: {
      shibata: { type: "integer", description: `Índice (a partir de 0) do candidato do Shibata, ou ${SEM_MATCH} se nenhum servir.` },
      semar: { type: "integer", description: `Índice (a partir de 0) do candidato do Semar, ou ${SEM_MATCH} se nenhum servir.` },
      alabarce: { type: "integer", description: `Índice (a partir de 0) do candidato do Alabarce, ou ${SEM_MATCH} se nenhum servir.` },
      atacadao: { type: "integer", description: `Índice (a partir de 0) do candidato do Atacadão, ou ${SEM_MATCH} se nenhum servir.` },
      nagumo: { type: "integer", description: `Índice (a partir de 0) do candidato do Nagumo, ou ${SEM_MATCH} se nenhum servir.` },
    },
    required: ["shibata", "semar", "alabarce", "atacadao", "nagumo"],
  },
};

function listarCandidatos(nome: string, produtos: ProdutoEncontrado[]): string {
  if (produtos.length === 0) return `${nome}: (sem resultados de busca)`;
  const linhas = produtos.map((p, i) => `  [${i}] ${p.nome} — R$ ${p.preco.toFixed(2)}${p.disponivel ? "" : " (indisponível)"}`);
  return `${nome}:\n${linhas.join("\n")}`;
}

function indiceValido(i: number | undefined, tamanho: number): number | null {
  if (i == null || i === SEM_MATCH || i < 0 || i >= tamanho) return null;
  return i;
}

/** Sem candidato nenhum nos 3 mercados, nem vale a pena chamar a IA. */
function semCandidatos(c: CandidatosPorMercado): boolean {
  return c.shibata.length === 0 && c.semar.length === 0 && c.alabarce.length === 0 && c.atacadao.length === 0 && c.nagumo.length === 0;
}

export async function escolherMatches(itemTexto: string, candidatos: CandidatosPorMercado): Promise<{ escolha: MatchEscolhido; tokensEntrada: number; tokensSaida: number }> {
  const vazio: MatchEscolhido = { shibata: null, semar: null, alabarce: null, atacadao: null, nagumo: null };
  if (semCandidatos(candidatos)) {
    return { escolha: vazio, tokensEntrada: 0, tokensSaida: 0 };
  }

  const system =
    "Você ajuda a comparar preços de mercado. Recebe o item que a pessoa quer comprar (descrito livremente) e os resultados de busca " +
    "de até 3 mercados diferentes para esse item. Sua única tarefa é indicar qual resultado (se algum) de cada mercado é de fato o mesmo " +
    "produto — nunca invente um match forçado.";

  const mensagem = [
    `Item da lista de compras: "${itemTexto}"`,
    "",
    "Candidatos encontrados em cada mercado:",
    listarCandidatos("Shibata", candidatos.shibata),
    listarCandidatos("Semar", candidatos.semar),
    listarCandidatos("Alabarce", candidatos.alabarce),
    listarCandidatos("Atacadão", candidatos.atacadao),
    listarCandidatos("Nagumo", candidatos.nagumo),
  ].join("\n");

  const resposta = await chamarAnthropicComFerramenta(system, mensagem, TOOL);
  const input = resposta.ferramenta?.input ?? {};

  const escolha: MatchEscolhido = {
    shibata: indiceValido(input.shibata as number | undefined, candidatos.shibata.length),
    semar: indiceValido(input.semar as number | undefined, candidatos.semar.length),
    alabarce: indiceValido(input.alabarce as number | undefined, candidatos.alabarce.length),
    atacadao: indiceValido(input.atacadao as number | undefined, candidatos.atacadao.length),
    nagumo: indiceValido(input.nagumo as number | undefined, candidatos.nagumo.length),
  };

  return { escolha, tokensEntrada: resposta.tokensEntrada, tokensSaida: resposta.tokensSaida };
}
