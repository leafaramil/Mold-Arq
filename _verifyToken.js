import crypto from 'crypto';

// Confere se um token de sessão é válido e ainda não expirou.
export function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [expiresStr, signature] = decoded.split('.');
    const expires = Number(expiresStr);
    if (!expires || Number.isNaN(expires) || Date.now() > expires) return false;

    const expected = crypto
      .createHmac('sha256', process.env.SESSION_SECRET)
      .update(expiresStr)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false;
  }
}
