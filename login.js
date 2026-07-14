import crypto from 'crypto';

// Quanto tempo a sessão do cliente fica válida depois do login (em horas)
const SESSION_HOURS = 6;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { CLIENT_PASSWORD, SESSION_SECRET } = process.env;
  if (!CLIENT_PASSWORD || !SESSION_SECRET) {
    console.error('Faltam variáveis de ambiente: CLIENT_PASSWORD / SESSION_SECRET');
    return res.status(500).json({ error: 'O servidor não está configurado corretamente. Fale com o administrador do site.' });
  }

  const { password } = req.body || {};

  if (!password || password !== CLIENT_PASSWORD) {
    // Pequeno atraso proposital para dificultar tentativas automatizadas de adivinhar a senha
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${expires}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64');

  return res.status(200).json({ token });
}
