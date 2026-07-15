import crypto from 'crypto';

const SESSION_HOURS = 6;

// Cria um token de sessão para um cliente específico (identificado pelo slug)
export function createToken(clientSlug) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${expires}|${clientSlug}`;
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}::${signature}`).toString('base64');
}

// Confere se um token é válido e ainda não expirou.
// Retorna { clientSlug } se válido, ou null se inválido/expirado.
export function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const sepIndex = decoded.lastIndexOf('::');
    if (sepIndex === -1) return null;

    const payload = decoded.slice(0, sepIndex);
    const signature = decoded.slice(sepIndex + 2);
    const [expiresStr, clientSlug] = payload.split('|');
    const expires = Number(expiresStr);
    if (!expires || Number.isNaN(expires) || Date.now() > expires || !clientSlug) return null;

    const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('hex');
    const validSignature =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    return validSignature ? { clientSlug } : null;
  } catch {
    return null;
  }
}
