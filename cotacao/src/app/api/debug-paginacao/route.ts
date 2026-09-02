// Rota de diagnóstico TEMPORÁRIA — não faz parte do produto. Existe só pra
// investigar, contra os sites reais, se a paginação do Atacadão (cursor
// `after`) e do Nagumo (`Search-UpdateGrid`) funciona como o adendo supõe,
// antes de implementar de verdade. Remover depois de confirmar.
import { NextResponse } from "next/server";

async function tenta(url: string, headers: Record<string, string> = {}) {
  try {
    const resp = await fetch(url, { headers });
    const texto = await resp.text();
    return { url, status: resp.status, ok: resp.ok, tamanho: texto.length, corpo: texto.slice(0, 4000) };
  } catch (e) {
    return { url, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const CHANNEL = JSON.stringify({ salesChannel: "1", seller: "atacadaobr940", regionId: "U1cjYXRhY2FkYW9icjkOMA==" });

  function urlAtacadao(after: string, first = 20) {
    const variables = {
      first,
      after,
      sort: "score_desc",
      term: "arroz",
      selectedFacets: [
        { key: "channel", value: CHANNEL },
        { key: "locale", value: "pt-BR" },
      ],
    };
    const params = new URLSearchParams({ operationName: "ProductsQuery", variables: JSON.stringify(variables) });
    return `https://www.atacadao.com.br/api/graphql?${params.toString()}`;
  }

  const atacadaoPagina1 = await tenta(urlAtacadao("0"), { Accept: "application/json" });
  const atacadaoPagina2Numerica = await tenta(urlAtacadao("20"), { Accept: "application/json" });

  const uaBrowser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const nagumoCandidatos = [
    "https://www.nagumo.com.br/on/demandware.store/Sites-Nagumo-Site/pt_BR/Search-UpdateGrid?q=arroz&start=20&sz=20",
    "https://www.nagumo.com.br/busca?q=arroz&start=20&sz=20&search-button=&lang=null",
  ];
  const nagumoResultados = [];
  for (const url of nagumoCandidatos) {
    nagumoResultados.push(await tenta(url, { Accept: "text/html", "User-Agent": uaBrowser }));
  }

  return NextResponse.json({ atacadaoPagina1, atacadaoPagina2Numerica, nagumoResultados });
}
