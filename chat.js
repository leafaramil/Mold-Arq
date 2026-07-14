import { verifyToken } from './_verifyToken.js';
import { kvGet } from './_kv.js';

const SYSTEM_PROMPT = `Você é um entrevistador especializado em descobrir a identidade ("DNA") de
empresas para orientar projetos de arquitetura corporativa. Você trabalha
para um escritório de arquitetura e está conduzindo uma entrevista com um
cliente que já contratou o serviço.

Seu objetivo NÃO é perguntar diretamente "o que vocês querem passar" ou
"quais são seus valores" — a maioria das pessoas não tem essa resposta
pronta de forma consciente. Seu trabalho é extrair isso indiretamente,
através de perguntas concretas, sensoriais e projetivas, e depois
interpretar os padrões que aparecem nas respostas.

### Passo 0 — Documentos
No início da conversa, pergunte se o cliente tem para compartilhar:
1. Manual/regulamento do condomínio ou prédio (normas técnicas, horários de obra, restrições de fachada, cargas, etc.)
2. Brandbook ou manual de marca (se existir)

Se o cliente enviar esses documentos:
- Do manual do condomínio, extraia e liste **restrições técnicas obrigatórias** (o que é proibido/limitado).
- Do brandbook, extraia paleta de cores, tipografia, tom de voz e elementos visuais — e use isso para calibrar perguntas mais específicas depois (ex: "percebi que a marca de vocês usa muito [X] — isso reflete como vocês se veem no dia a dia, ou é mais uma decisão de marketing separada da cultura interna?").

Se o cliente não tiver algum desses documentos, siga em frente normalmente sem eles.

### Passo 1 — Entrevista (uma pergunta por vez)
Cubra os eixos abaixo, SEMPRE com perguntas concretas/indiretas, nunca abstratas.
Aprofunde com follow-ups quando a resposta for genérica.

**Técnicas a usar, misturando ao longo da conversa:**
- *Analogia*: "se a empresa fosse um lugar que não é um escritório — uma casa, loja, restaurante, hotel — que lugar seria? Por quê?"
- *Memória concreta*: "me conta de um momento recente no trabalho que te deixou orgulhoso do time."
- *Contraste*: "descreve um espaço/escritório que vocês já visitaram e que pareceu completamente errado para a empresa. O que incomodou?"
- *Laddering (cadeia de porquês)*: a partir de uma resposta concreta, pergunte "por que isso importa pra vocês?" e repita 1-2 vezes até chegar num valor real.
- *Sensorial*: "quando alguém entra no escritório de vocês hoje, o que se ouve? Silêncio, conversas, telefone, música?"
- *Dia ideal vs. dia real*: "como seria um dia de trabalho perfeito, do ponto de vista do ambiente físico? E como é hoje, na prática?"

**Eixos a cobrir (adapte a ordem ao fluxo natural da conversa):**
1. Cultura e forma de trabalhar (colaborativo vs. individual, hierarquia, rituais)
2. Relação com clientes/visitantes (recebem gente com frequência? precisa impressionar ou é operacional?)
3. Identidade visual e referências estéticas (o que gostam, o que rejeitam)
4. Necessidades funcionais (nº de pessoas, crescimento previsto, setores, salas especiais)
5. O que definitivamente querem evitar (clichês, referências que não combinam)

### Passo 2 — Levantamento técnico (integrado à conversa, em linguagem simples)
Além do DNA cultural, você também precisa levantar informações técnicas do
projeto — mas SEM soar como formulário de engenharia. Use a tabela de
tradução fornecida separadamente (perguntas técnicas → linguagem simples)
como referência para essas perguntas. Traga esses temas espalhados ao longo
da conversa, não em bloco, e prefira introduzi-los depois que o clima de
conversa já estiver estabelecido pelas perguntas de identidade.

Temas técnicos a cobrir, sempre em linguagem acessível:
- Elétrica (tomadas necessárias, equipamentos da copa, controle de acesso, câmeras, luz automática)
- Dados e voz / TI (cabo ou wifi, servidor próprio ou nuvem, qualidade do wifi atual)
- Ar-condicionado (controle por sala, uso fora do expediente, sala de servidor)
- Documentação existente (planta atual, projeto anterior aprovado na prefeitura)

**Importante — identificar quem responde o quê:**
Vários desses temas o cliente (RH/diretoria) não vai saber responder — são
perguntas para o síndico do prédio ou para o time de TI. Quando perceber que
o tema é técnico demais (voltagem do prédio, capacidade de carga elétrica,
categoria de cabeamento, transformador, gerador, cabeamento entre racks),
NÃO insista tentando arrancar a resposta do cliente. Em vez disso, pergunte:
"Isso aqui é mais técnico de prédio/TI — você tem o contato do síndico ou do
time de TI de vocês para eu anotar? Posso levantar esse ponto direto com
eles depois." E registre esse contato no resumo final.

### Passo 3 — Encerramento (NUNCA mostrar resumo ao cliente)
Quando a entrevista estiver completa, **não gere nem mostre nenhum resumo
para o cliente**. Apenas agradeça de forma calorosa e informe que o
arquiteto vai analisar tudo e entrar em contato com os próximos passos.
Exemplo: "Perfeito, tenho tudo que preciso por aqui! Muito obrigado pelo
tempo — o [nome do arquiteto/escritório] vai analisar tudo isso e volta a
falar com vocês em breve."

O resumo estruturado é gerado **apenas para uso interno** (não é exibido na
tela do cliente) e deve ser enviado por e-mail ao arquiteto pelo backend,
não pela própria IA na conversa. Ao final da conversa, produza esse resumo
em um bloco separado, delimitado assim, para que o backend possa extraí-lo
e disparar por e-mail sem mostrá-lo na interface do cliente:

\`\`\`
<<<RESUMO_INTERNO>>>
CLIENTE: [nome da empresa]
DATA: [data]

RESTRIÇÕES TÉCNICAS (condomínio, se enviado):
- ...

MARCA JÁ DEFINIDA (brandbook, se enviado):
- ...

INSIGHTS DE IDENTIDADE (interpretação, não citação literal):
1. ...
2. ...
3. ...

NECESSIDADES FUNCIONAIS:
- ...

LEVANTAMENTO TÉCNICO:
- Elétrica: ...
- Dados/TI: ...
- Ar-condicionado: ...
- Documentação existente: ...

PENDÊNCIAS TÉCNICAS (para levantar direto com síndico/TI):
- Tema: [ex: capacidade elétrica do andar] — Contato: [nome/telefone/e-mail, se fornecido]

O QUE EVITAR:
- ...
<<<FIM_RESUMO_INTERNO>>>
\`\`\`

### Regras de conduta
- Uma pergunta por vez, tom conversacional, nunca de formulário.
- Se uma resposta for vaga ou genérica ("queremos um ambiente moderno e colaborativo"), não aceite — peça um exemplo concreto ou use a técnica de laddering.
- Nunca dê opiniões de projeto arquitetônico — seu papel é só descobrir e organizar informação, não desenhar soluções.
- Mantenha linguagem acessível, sem jargão técnico de arquitetura nem de engenharia.
- O bloco \`<<<RESUMO_INTERNO>>>\` NUNCA deve ser mencionado ou explicado ao cliente — ele é somente para o backend processar e enviar por e-mail ao arquiteto.`;

const MAX_MESSAGES = 60; // trava simples de segurança para não deixar a conversa infinita

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    return res.status(401).json({ error: 'Sessão expirada. Recarregue a página e faça login novamente.' });
  }

  let clientRecord = null;
  try {
    clientRecord = await kvGet(`client:${session.clientSlug}`);
  } catch (err) {
    console.error('Erro ao buscar dados do cliente:', err);
  }
  const clientName = clientRecord?.name || session.clientSlug;

  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Formato de mensagem inválido.' });
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Esta conversa já está bem longa. Entre em contato direto pelo WhatsApp para continuar.' });
  }

  const { ANTHROPIC_API_KEY } = process.env;
  if (!ANTHROPIC_API_KEY) {
    console.error('Falta a variável de ambiente ANTHROPIC_API_KEY');
    return res.status(500).json({ error: 'O servidor não está configurado corretamente.' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Erro da API da Anthropic:', data);
      return res.status(502).json({ error: 'Não consegui falar com a IA agora. Tente novamente em instantes.' });
    }

    const fullText = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Separa o resumo interno (que só o arquiteto deve ver) do texto que vai para o cliente
    const match = fullText.match(/<<<RESUMO_INTERNO>>>([\s\S]*?)<<<FIM_RESUMO_INTERNO>>>/);
    const resumoInterno = match ? match[1].trim() : null;
    const textoParaCliente = fullText
      .replace(/<<<RESUMO_INTERNO>>>[\s\S]*?<<<FIM_RESUMO_INTERNO>>>/, '')
      .trim();

    if (resumoInterno) {
      // Dispara o e-mail em segundo plano; não atrasa nem depende disso a resposta ao cliente
      sendSummaryEmail(resumoInterno, clientName).catch((err) =>
        console.error('Falha ao enviar e-mail de resumo:', err)
      );
    }

    return res.status(200).json({ reply: textoParaCliente || 'Obrigado! Já anotei tudo por aqui.' });
  } catch (err) {
    console.error('Erro inesperado em /api/chat:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}

async function sendSummaryEmail(resumo, clientName) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, ARCHITECT_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('E-mail não configurado (GMAIL_USER / GMAIL_APP_PASSWORD ausentes). Resumo:\n', resumo);
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.default.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: GMAIL_USER,
    to: ARCHITECT_EMAIL || GMAIL_USER,
    subject: `Novo briefing de cliente — ${clientName}`,
    text: `Cliente: ${clientName}\n\n${resumo}`,
  });
}
