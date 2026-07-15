// Helper mínimo para falar com o banco de dados (Vercel KV, que por baixo dos
// panos usa a Upstash). A Vercel injeta essas duas variáveis automaticamente
// quando você conecta um banco "KV" ao projeto (ver README-DEPLOY.md).

const BASE_URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

function assertConfigured() {
  if (!BASE_URL || !TOKEN) {
    throw new Error(
      'Banco de dados não configurado (faltam KV_REST_API_URL / KV_REST_API_TOKEN). Veja o README-DEPLOY.md, seção "Banco de dados".'
    );
  }
}

async function kvFetch(path) {
  assertConfigured();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Erro no banco de dados (status ${res.status})`);
  }
  return res.json();
}

export async function kvSet(key, value) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  const data = await kvFetch(`/set/${encodeURIComponent(key)}/${encoded}`);
  return data.result;
}

export async function kvGet(key) {
  const data = await kvFetch(`/get/${encodeURIComponent(key)}`);
  if (data.result === null || data.result === undefined) return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return data.result;
  }
}

export async function kvDel(key) {
  const data = await kvFetch(`/del/${encodeURIComponent(key)}`);
  return data.result;
}

// Lista todas as chaves que combinam com um padrão, ex: "client:*"
export async function kvKeys(pattern) {
  const data = await kvFetch(`/keys/${encodeURIComponent(pattern)}`);
  return data.result || [];
}
