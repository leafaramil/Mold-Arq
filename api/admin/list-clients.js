import { kvGet, kvKeys } from '../_kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.ADMIN_SECRET) {
    console.error('Falta a variável de ambiente ADMIN_SECRET');
    return res.status(500).json({ error: 'O servidor não está configurado corretamente.' });
  }

  const { adminPassword } = req.body || {};
  if (adminPassword !== process.env.ADMIN_SECRET) {
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Senha de administrador incorreta.' });
  }

  try {
    const keys = await kvKeys('client:*');
    const clients = [];
    for (const key of keys) {
      const record = await kvGet(key);
      if (record) clients.push(record);
    }
    clients.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.status(200).json({ clients });
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    return res.status(500).json({ error: err.message || 'Erro ao buscar a lista de clientes.' });
  }
}
