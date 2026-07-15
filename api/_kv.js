// Helper mínimo para falar com o banco de dados (Vercel KV, que por baixo dos
// panos usa a Upstash). A Vercel injeta essas duas variáveis automaticamente
// quando você conecta um banco "KV" ao projeto (ver README-DEPLOY.md).
//
// Usamos o formato de comando via corpo da requisição (POST com um array
// tipo ["SET", "chave", "valor"]) em vez de colocar o valor na URL — isso
// evita quebrar silenciosamente quando o valor é grande (como uma conversa
// inteira, com acentuação em português, que pode passar do limite de
// tamanho de uma URL).

const BASE_URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

function assertConfigured() {
  if (!BASE_URL || !TOKEN) {
    throw new Error(
      'Banco de dados não configurado (faltam KV_REST_API_URL / KV_REST_API_TOKEN). Veja o README-DEPLOY.md, seção "Banco de dados".'
    );
  }
}

async function kvCommand(command) {
  assertConfigured();
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Erro no banco de dados (status ${res.status})`);
  }
  return res.json();
}

export async function kvSet(key, value) {
  const data = await kvCommand(['SET', key, JSON.stringify(value)]);
  return data.result;
}

export async function kvGet(key) {
  const data = await kvCommand(['GET', key]);
  if (data.result === null || data.result === undefined) return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return data.result;
  }
}

export async function kvDel(key) {
  const data = await kvCommand(['DEL', key]);
  return data.result;
}

// Lista todas as chaves que combinam com um padrão, ex: "client:*"
export async function kvKeys(pattern) {
  const data = await kvCommand(['KEYS', pattern]);
  return data.result || [];
}
