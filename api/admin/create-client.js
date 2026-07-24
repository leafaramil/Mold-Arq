import crypto from 'crypto';
import { kvGet, kvSet } from '../_kv.js';
import { isValidAdminPassword } from '../_verifyAdmin.js';
import { isRateLimited } from '../_rateLimit.js';

function checkAdmin(req) {
  const { adminPassword } = req.body || {};
  return isValidAdminPassword(adminPassword);
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

function generatePassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O, evita confusão
  const digits = '23456789'; // sem 0 e 1, evita confusão
  const pick = (chars, n) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join('');
  // 4 letras + 4 dígitos (antes era 3+3): ainda fácil de ditar por telefone
  // ou WhatsApp, mas com um espaço de combinações bem maior — dificulta
  // tentativa de força bruta mesmo que o rate limit falhe por algum motivo.
  return pick(letters, 4) + pick(digits, 4);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (!process.env.ADMIN_SECRET) {
    console.error('Falta a variável de ambiente ADMIN_SECRET');
    return res.status(500).json({ error: 'O servidor não está configurado corretamente.' });
  }

  if (await isRateLimited(req, 'login-admin')) {
    return res.status(429).json({ error: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.' });
  }

  if (!checkAdmin(req)) {
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Senha de administrador incorreta.' });
  }

  const { clientName } = req.body || {};
  if (!clientName || !clientName.trim()) {
    return res.status(400).json({ error: 'Digite o nome do cliente/empresa.' });
  }

  try {
    const baseSlug = slugify(clientName) || 'cliente';
    let slug = baseSlug;
    let suffix = 1;
    // garante que o slug (identificador interno) seja único
    while (await kvGet(`client:${slug}`)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    let password;
    let attempts = 0;
    // garante que a senha gerada não colida com nenhuma já existente
    do {
      password = generatePassword();
      attempts += 1;
    } while ((await kvGet(`password:${password}`)) && attempts < 10);

    const record = { name: clientName.trim(), password, createdAt: new Date().toISOString() };
    await kvSet(`client:${slug}`, record);
    await kvSet(`password:${password}`, slug);

    return res.status(200).json({ slug, password, name: record.name });
  } catch (err) {
    console.error('Erro ao criar cliente:', err);
    return res.status(500).json({ error: err.message || 'Erro ao gerar a senha. Tente novamente.' });
  }
}
