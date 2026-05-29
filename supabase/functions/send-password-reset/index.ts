const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PasswordResetPayload = {
  email: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true }, 200);
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    assertApiKey(request);
    const payload = await request.json() as Partial<PasswordResetPayload>;
    if (!payload.email || !isEmail(payload.email)) throw httpError(400, 'Correo inválido');

    const resetUrl = await generateRecoveryLink(payload.email);
    const emailContent = buildPasswordResetEmail(payload.email, resetUrl);
    await sendGmail({
      to: payload.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return json({ ok: true }, 200);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'No se pudo enviar la recuperación';
    return json({ ok: false, error: message }, status);
  }
});

function assertApiKey(request: Request) {
  const expected = Deno.env.get('SEND_GMAIL_API_KEY');
  if (!expected) throw httpError(500, 'Falta configurar SEND_GMAIL_API_KEY en Supabase Secrets');
  const received = request.headers.get('x-api-key');
  if (!received || received !== expected) throw httpError(401, 'x-api-key inválida');
}

async function generateRecoveryLink(email: string) {
  const supabaseUrl = requiredSecret('SUPABASE_URL');
  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://articulacaj.novatec.ink';

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'recovery',
      email,
      options: {
        redirect_to: `${siteUrl.replace(/\/$/, '')}/reset-password`,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw httpError(502, `Supabase no pudo generar el enlace: ${detail}`);
  }

  const data = await response.json() as { properties?: { action_link?: string } };
  const link = data.properties?.action_link;
  if (!link) throw httpError(502, 'Supabase no devolvió el enlace de recuperación');
  return link;
}

async function sendGmail(input: { to: string; subject: string; text: string; html: string }) {
  const accessToken = await getGoogleAccessToken();
  const raw = buildMimeMessage({
    from: requiredSecret('GMAIL_SENDER'),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw httpError(502, `Gmail API rechazo el envio: ${detail}`);
  }
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

function buildPasswordResetEmail(email: string, resetUrl: string) {
  const safeEmail = escapeHtml(email);
  const safeResetUrl = escapeHtml(resetUrl);
  const subject = 'Restablece tu contraseña — ARTICULA CAJ';
  const text = [
    'Recibimos una solicitud para cambiar tu contraseña en ARTICULA CAJ.',
    '',
    `Correo: ${email}`,
    `Enlace seguro: ${resetUrl}`,
    '',
    'Si no solicitaste este cambio, ignora este mensaje.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef6f2;font-family:Segoe UI,Arial,sans-serif;color:#102033;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">Restablece tu contraseña de ARTICULA CAJ.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef6f2;width:100%;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #dbe7e1;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#064e3b;background-image:linear-gradient(135deg,#052e24 0%,#047857 58%,#16a34a 100%);padding:30px;color:#ffffff;">
                <div style="font-size:13px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#bbf7d0;">ARTICULA CAJ</div>
                <h1 style="margin:8px 0 10px;font-size:30px;line-height:1.16;font-weight:900;color:#ffffff;">Restablece tu contraseña</h1>
                <p style="margin:0;color:#ecfdf5;font-size:15px;line-height:1.65;">Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px 20px;color:#334155;font-size:15px;line-height:1.7;">
                  Usa el siguiente botón para crear una nueva contraseña para <strong style="color:#0f172a;">${safeEmail}</strong>. Por seguridad, este enlace es temporal.
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;">
                  <tr>
                    <td bgcolor="#059669" style="border-radius:14px;">
                      <a href="${safeResetUrl}" style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;border-radius:14px;">Cambiar contraseña</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;color:#64748b;font-size:13px;line-height:1.6;">Si el botón no abre, copia este enlace:<br><a href="${safeResetUrl}" style="color:#047857;text-decoration:none;word-break:break-all;">${safeResetUrl}</a></p>
                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta seguirá protegida.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function buildMimeMessage(input: { from: string; to: string; subject: string; text: string; html: string }) {
  const boundary = `articula_${crypto.randomUUID()}`;
  const lines = [
    `From: ${formatAddress(input.from)}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
