import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = "https://sense.osuper.com.br/336/1703/search";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function tentativa(nome: string, url: string) {
  try {
    const resp = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
    const bruto = await resp.text();
    let hitsCount: number | string = "parse-fail";
    let nomes: string[] = [];
    try {
      const json = JSON.parse(bruto);
      hitsCount = Array.isArray(json.hits) ? json.hits.length : `no-hits (keys: ${Object.keys(json).join(",")})`;
      nomes = Array.isArray(json.hits) ? json.hits.slice(0, 15).map((h: { name?: string }) => h.name) : [];
    } catch {
      // fica com parse-fail
    }
    return { nome, status: resp.status, hitsCount, nomes };
  } catch (e) {
    return { nome, erro: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const termo = "alho";

  const casos: [string, URLSearchParams][] = [
    ["so search", new URLSearchParams({ search: termo })],
    ["search+size20", new URLSearchParams({ search: termo, size: "20" })],
    ["search+size50", new URLSearchParams({ search: termo, size: "50" })],
    ["search+from0", new URLSearchParams({ search: termo, from: "0" })],
    ["search+page1", new URLSearchParams({ search: termo, page: "1" })],
    ["search+size50+from0", new URLSearchParams({ search: termo, size: "50", from: "0" })],
    ["search+sortField", new URLSearchParams({ search: termo, sortField: "_score" })],
  ];

  const resultados = await Promise.all(casos.map(([nome, params]) => tentativa(nome, `${BASE}?${params.toString()}`)));

  return NextResponse.json({ resultados });
}
