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
  // A Search-UpdateGrid respondeu 200 com JSON, mas só productIds (sem
  // nome/preço) nos primeiros ~4000 caracteres — investiga se o resto do
  // corpo (89KB) tem os dados completos em algum outro campo, procurando
  // por "search-card-grid" (o mesmo formato embutido da página normal) ou
  // por "productName"/"price" soltos.
  const urlUpdateGrid = "https://www.nagumo.com.br/on/demandware.store/Sites-Nagumo-Site/pt_BR/Search-UpdateGrid?q=arroz&start=20&sz=20";
  let updateGridInspecao: Record<string, unknown> = { url: urlUpdateGrid };
  try {
    const resp = await fetch(urlUpdateGrid, { headers: { Accept: "application/json", "User-Agent": uaBrowser } });
    const texto = await resp.text();
    const idxGrid = texto.indexOf("search-card-grid");
    const idxProductName = texto.indexOf("productName");
    const idxPrice = texto.search(/"price"|"sales"/);
    updateGridInspecao = {
      url: urlUpdateGrid,
      status: resp.status,
      tamanhoTotal: texto.length,
      contemSearchCardGrid: idxGrid !== -1,
      trechoSearchCardGrid: idxGrid !== -1 ? texto.slice(idxGrid, idxGrid + 3000) : null,
      contemProductName: idxProductName !== -1,
      trechoProductName: idxProductName !== -1 ? texto.slice(Math.max(0, idxProductName - 200), idxProductName + 2000) : null,
      contemPrice: idxPrice !== -1,
      trechoPrice: idxPrice !== -1 ? texto.slice(Math.max(0, idxPrice - 200), idxPrice + 2000) : null,
      fimDoCorpo: texto.slice(-3000),
    };
  } catch (e) {
    updateGridInspecao = { url: urlUpdateGrid, erro: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ atacadaoPagina1, atacadaoPagina2Numerica, updateGridInspecao });
}
