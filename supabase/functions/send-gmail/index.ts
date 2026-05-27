const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SendGmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true }, 200);
  if (request.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405);

  try {
    assertApiKey(request);

    const payload = await request.json() as Partial<SendGmailPayload>;
    validatePayload(payload);

    const accessToken = await getGoogleAccessToken();
    const raw = buildMimeMessage({
      from: requiredSecret('GMAIL_SENDER'),
      to: payload.to!,
      subject: payload.subject!,
      text: payload.text!,
      html: payload.html!,
      replyTo: payload.replyTo,
    });

    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!gmailResponse.ok) {
      const detail = await gmailResponse.text();
      throw httpError(502, `Gmail API rechazo el envio: ${detail}`);
    }

    const data = await gmailResponse.json();
    return json({ ok: true, id: data.id }, 200);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'No se pudo enviar el correo';
    return json({ ok: false, error: message }, status);
  }
});

function assertApiKey(request: Request) {
  const expected = Deno.env.get('SEND_GMAIL_API_KEY');
  if (!expected) throw httpError(500, 'Falta configurar SEND_GMAIL_API_KEY en Supabase Secrets');

  const received = request.headers.get('x-api-key');
  if (!received || received !== expected) throw httpError(401, 'x-api-key invalida');
}

function validatePayload(payload: Partial<SendGmailPayload>) {
  if (!payload.to || !isEmail(payload.to)) throw httpError(400, 'Destinatario invalido');
  if (!payload.subject?.trim()) throw httpError(400, 'Falta subject');
  if (!payload.text?.trim()) throw httpError(400, 'Falta text');
  if (!payload.html?.trim()) throw httpError(400, 'Falta html');
}

async function getGoogleAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requiredSecret('GOOGLE_CLIENT_ID'),
      client_secret: requiredSecret('GOOGLE_CLIENT_SECRET'),
      refresh_token: requiredSecret('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw httpError(502, `Google OAuth rechazo el refresh token: ${detail}`);
  }

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw httpError(502, 'Google OAuth no devolvio access_token');
  return data.access_token;
}

function buildMimeMessage(input: SendGmailPayload & { from: string }) {
  const boundary = `articula_${crypto.randomUUID()}`;
  const lines = [
    `From: ${formatAddress(input.from)}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.html,
    '',
    `--${boundary}--`,
  ];

  return base64UrlEncode(lines.join('\r\n'));
}

function formatAddress(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*)<(.+)>$/);
  if (!match) return trimmed;
  return `${encodeHeader(match[1].trim())} <${match[2].trim()}>`;
}

function encodeHeader(value: string) {
  if (isAscii(value)) return value;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

function isAscii(value: string) {
  return Array.from(value).every((char) => char.charCodeAt(0) <= 0x7f);
}

function base64UrlEncode(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw httpError(500, `Falta configurar ${name} en Supabase Secrets`);
  return value;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function httpError(status: number, message: string) {
  return new AppError(status, message);
}

class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
