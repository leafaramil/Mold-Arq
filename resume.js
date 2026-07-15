import { verifyToken } from './_verifyToken.js';
import { kvGet } from './_kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    return res.status(401).json({ error: 'Sessão expirada.' });
  }

  try {
    const stored = await kvGet(`conversation:${session.clientSlug}`);
    return res.status(200).json({ messages: stored?.messages || [] });
  } catch (err) {
    console.error('Erro ao buscar conversa salva:', err);
    // Não trava o login por causa disso — só começa uma conversa nova
    return res.status(200).json({ messages: [] });
  }
}
