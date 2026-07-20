import { kvGet, kvDel } from '../_kv.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  if (!process.env.ADMIN_SECRET) {
    console.error('Falta a variável de ambiente ADMIN_SECRET');
    return res.status(500).json({ error: 'O servidor não está configurado corretamente.' });
  }
  const { adminPassword, slug } = req.body || {};
  if (adminPassword !== process.env.ADMIN_SECRET) {
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Senha de administrador incorreta.' });
  }
  if (!slug) {
    return res.status(400).json({ error: 'Faltou informar qual cliente excluir.' });
  }
  try {
    const record = await kvGet(`client:${slug}`);
    if (!record) {
      return res.status(404).json({ error: 'Esse cliente não existe (talvez já tenha sido excluído).' });
    }
    await kvDel(`client:${slug}`);
    if (record.password) {
      await kvDel(`password:${record.password}`);
    }
    // As conversas são salvas com uma chave por etapa (não existe uma chave
    // única "conversation:{slug}" sem sufixo) — por isso apagamos as duas
    // explicitamente. Sem isso, as conversas antigas ficavam órfãs no banco
    // e, se um cliente novo fosse criado depois com o mesmo nome (mesmo
    // slug), herdava esse histórico órfão — inclusive o estado "concluído".
    await kvDel(`conversation:${slug}:identity`);
    await kvDel(`conversation:${slug}:technical`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    return res.status(500).json({ error: err.message || 'Erro ao excluir o cliente. Tente novamente.' });
  }
}
