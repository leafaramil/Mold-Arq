import { kvGet, kvDel, kvIncrWithExpiry } from './_kv.js';

// Limite de tentativas por IP dentro de uma janela de tempo. Isso existe
// para impedir que alguém tente senhas em sequência automaticamente (força
// bruta) — sem isso, o único obstáculo era um atraso de 400ms por
// requisição, que não impede nada se as tentativas forem feitas em
// paralelo.
const WINDOW_SECONDS = 10 * 60; // 10 minutos
const MAX_ATTEMPTS = 5; // tentativas ERRADAS por IP, por "bucket", a cada janela

// Só CONSULTA se o IP já estourou o limite — não incrementa nada. Precisa
// ser chamado antes de verificar a senha, pra barrar de cara quem já está
// bloqueado, sem gastar tempo comparando senha à toa.
export async function isRateLimited(req, bucket) {
  const key = rateLimitKey(req, bucket);
  try {
    const count = await kvGet(key);
    return Number(count || 0) >= MAX_ATTEMPTS;
  } catch (err) {
    // Se o banco de dados falhar, não travamos o login por causa disso —
    // melhor deixar a tentativa passar do que derrubar o login de todo
    // mundo por um problema à parte no KV.
    console.error(`Erro ao checar rate limit (bucket "${bucket}"):`, err);
    return false;
  }
}

// Chamar SÓ quando a senha enviada estiver errada. Uma tentativa com senha
// certa nunca deve chegar aqui — é isso que evita que o próprio dono
// (digitando certo, ou só atualizando a tela várias vezes) se auto-bloqueie
// por uso normal.
export async function registerFailedAttempt(req, bucket) {
  const key = rateLimitKey(req, bucket);
  try {
    await kvIncrWithExpiry(key, WINDOW_SECONDS);
  } catch (err) {
    console.error(`Erro ao registrar tentativa falha (bucket "${bucket}"):`, err);
  }
}

// Chamar quando a senha certa for enviada, pra limpar o contador — assim
// alguém que errou 2 vezes e acertou na 3ª não fica com "2 tentativas" soltas
// pendentes até a janela expirar sozinha.
export async function clearRateLimit(req, bucket) {
  const key = rateLimitKey(req, bucket);
  try {
    await kvDel(key);
  } catch (err) {
    console.error(`Erro ao limpar rate limit (bucket "${bucket}"):`, err);
  }
}

function rateLimitKey(req, bucket) {
  return `ratelimit:${bucket}:${getClientIp(req)}`;
}

function getClientIp(req) {
  // A Vercel expõe o IP real do visitante neste header, mesmo com o
  // tráfego passando pela CDN/proxy deles.
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'ip-desconhecido';
}
