import { kvIncrWithExpiry } from './_kv.js';

// Limite de tentativas por IP dentro de uma janela de tempo. Isso existe
// para impedir que alguém tente senhas em sequência automaticamente (força
// bruta) — sem isso, o único obstáculo era um atraso de 400ms por
// requisição, que não impede nada se as tentativas forem feitas em
// paralelo.
const WINDOW_SECONDS = 10 * 60; // 10 minutos
const MAX_ATTEMPTS = 5; // por IP, por "bucket" (login de cliente ou admin), a cada janela

// Verifica se o IP já estourou o limite de tentativas para um determinado
// "bucket" (ex: 'login-cliente', 'login-admin'). Retorna true se deve ser
// bloqueado agora.
export async function isRateLimited(req, bucket) {
  const ip = getClientIp(req);
  const key = `ratelimit:${bucket}:${ip}`;
  try {
    const count = await kvIncrWithExpiry(key, WINDOW_SECONDS);
    return count > MAX_ATTEMPTS;
  } catch (err) {
    // Se o banco de dados falhar, não travamos o login por causa disso —
    // melhor deixar a tentativa passar do que derrubar o login de todo
    // mundo por um problema à parte no KV.
    console.error(`Erro ao checar rate limit (bucket "${bucket}"):`, err);
    return false;
  }
}

function getClientIp(req) {
  // A Vercel expõe o IP real do visitante neste header, mesmo com o
  // tráfego passando pela CDN/proxy deles.
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'ip-desconhecido';
}
