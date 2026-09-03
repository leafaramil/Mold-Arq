import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://sense.osuper.com.br/336/1703/search";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function tentativa(nome: string, url: string, headers: Record<string, string>) {
  try {
    const resp = await fetch(url, { headers });
    const bruto = await resp.text();
    let hitsCount: number | string = "parse-fail";
    let primeiro: unknown = null;
    try {
      const json = JSON.parse(bruto);
      hitsCount = Array.isArray(json.hits) ? json.hits.length : `no-hits-field (keys: ${Object.keys(json).join(",")})`;
      primeiro = Array.isArray(json.hits) ? json.hits[0]?.name : null;
    } catch {
      // fica com parse-fail
    }
    return { nome, status: resp.status, hitsCount, primeiro, amostraBruta: bruto.slice(0, 300) };
  } catch (e) {
    return { nome, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const termo = "azeite";

  const paramsPadrao = new URLSearchParams({
    brands: "",
    categories: "",
    tags: "",
    size: "200",
    from: "0",
    search: termo,
    sortField: "_score",
    sortOrder: "desc",
  });

  const paramsSemVazios = new URLSearchParams({
    size: "200",
    from: "0",
    search: termo,
    sortField: "_score",
    sortOrder: "desc",
  });

  const paramsMinimo = new URLSearchParams({ search: termo });

  const resultados = await Promise.all([
    tentativa("padrao (sem UA)", `${BASE}?${paramsPadrao.toString()}`, { Accept: "application/json" }),
    tentativa("padrao (com UA)", `${BASE}?${paramsPadrao.toString()}`, { Accept: "application/json", "User-Agent": UA }),
    tentativa("sem params vazios (com UA)", `${BASE}?${paramsSemVazios.toString()}`, { Accept: "application/json", "User-Agent": UA }),
    tentativa("minimo so search (com UA)", `${BASE}?${paramsMinimo.toString()}`, { Accept: "application/json", "User-Agent": UA }),
    tentativa("maiusculo Azeite (com UA)", `${BASE}?${new URLSearchParams({ ...Object.fromEntries(paramsPadrao), search: "Azeite" }).toString()}`, { Accept: "application/json", "User-Agent": UA }),
  ]);

  return NextResponse.json({ resultados });
}
