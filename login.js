import { createToken } from './_verifyToken.js';
import { kvGet } from './_kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { SESSION_SECRET } = process.env;
  if (!SESSION_SECRET) {
    console.error('Falta a variável de ambiente SESSION_SECRET');
    return res.status(500).json({ error: 'O servidor não está configurado corretamente. Fale com o administrador do site.' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(401).json({ error: 'Digite a senha que você recebeu.' });
  }

  let clientSlug = null;
  try {
    clientSlug = await kvGet(`password:${password.trim()}`);
  } catch (err) {
    console.error('Erro ao consultar o banco de dados no login:', err);
    return res.status(500).json({ error: 'O servidor não está configurado corretamente. Fale com o administrador do site.' });
  }

  if (!clientSlug) {
    // Pequeno atraso proposital para dificultar tentativas automatizadas de adivinhar a senha
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Senha incorreta. Confira o que você recebeu ou fale com a gente no WhatsApp.' });
  }

  const token = createToken(clientSlug);
  return res.status(200).json({ token });
}
