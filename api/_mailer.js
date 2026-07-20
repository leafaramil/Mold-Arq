// Helper compartilhado para enviar e-mail. Suporta dois modos:
//
// 1) SMTP genérico (recomendado, funciona com Zoho, Outlook, etc.) — defina
//    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD nas variáveis de ambiente.
// 2) Gmail (modo antigo, mantido por compatibilidade) — defina GMAIL_USER e
//    GMAIL_APP_PASSWORD. Só é usado se as variáveis SMTP_* acima não existirem.
async function getTransporter() {
  const nodemailer = await import('nodemailer');
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
    const port = Number(SMTP_PORT) || 465;
    return {
      transporter: nodemailer.default.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465, // 465 = SSL direto; 587 = STARTTLS
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      }),
      fromAddress: SMTP_USER,
    };
  }
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return {
      transporter: nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      }),
      fromAddress: GMAIL_USER,
    };
  }
  return null;
}
// Envia um e-mail. Retorna true se enviou, lança erro se falhar.
export async function sendEmail({ to, subject, text, attachments }) {
  const config = await getTransporter();
  if (!config) {
    console.error('E-mail não configurado (faltam SMTP_HOST/SMTP_USER/SMTP_PASSWORD ou GMAIL_USER/GMAIL_APP_PASSWORD).');
    throw new Error('E-mail não configurado no servidor.');
  }
  const { transporter, fromAddress } = config;
  // Prioridade do destinatário: (1) "to" explícito passado pelo chamador —
  // é o caso do chat.js, que sempre informa o e-mail da Mold Arq; (2) a
  // variável de ambiente ARCHITECT_EMAIL, como respaldo geral; (3) por
  // último, o próprio remetente, só para nunca falhar silenciosamente sem
  // destinatário nenhum. ANTES, o parâmetro "to" era recebido mas nunca
  // usado — o e-mail sempre ia para ARCHITECT_EMAIL (ou para o próprio
  // remetente, se essa variável não estivesse configurada), ignorando
  // qualquer destinatário que o chamador tentasse especificar.
  const recipient = to || process.env.ARCHITECT_EMAIL || fromAddress;
  await transporter.sendMail({
    from: fromAddress,
    to: recipient,
    subject,
    text,
    attachments: attachments || [],
  });
}
