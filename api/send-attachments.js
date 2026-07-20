import { verifyToken } from './_verifyToken.js';
import { kvGet } from './_kv.js';
import { sendEmail } from './_mailer.js';

// Mesmo endereço fixo usado no chat.js — repetido aqui (em vez de
// importado) porque chat.js é um handler de rota, não um módulo de
// configuração compartilhada; duplicar essa constante em cada arquivo que
// precisa dela é mais simples e seguro do que criar um import cruzado
// entre handlers só por causa disso.
const EMAIL_MOLD_ARQ = 'atendimento@moldarq.com.br';

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
  const { attachments } = req.body || {};
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return res.status(200).json({ ok: true, skipped: true });
  }
  let clientRecord = null;
  try {
    clientRecord = await kvGet(`client:${session.clientSlug}`);
  } catch (err) {
    console.error('Erro ao buscar dados do cliente:', err);
  }
  const clientName = clientRecord?.name || session.clientSlug;
  try {
    const mailAttachments = attachments
      .filter((a) => a && a.base64 && a.filename)
      .map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.base64, 'base64'),
        contentType: a.mediaType || 'application/octet-stream',
      }));
    await sendEmail({
      to: EMAIL_MOLD_ARQ,
      subject: `Arquivos do cliente — ${clientName}`,
      text: `Segue(m) em anexo o(s) arquivo(s) enviados por ${clientName} durante a entrevista de briefing.`,
      attachments: mailAttachments,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao enviar e-mail de anexos:', err);
    return res.status(500).json({ error: 'Não consegui enviar os arquivos por e-mail.' });
  }
}
