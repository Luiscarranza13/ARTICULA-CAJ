const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SolicitudPayload = {
  tipo: 'contacto' | 'adquisicion';
  notifyTo: string;
  nombre: string;
  email: string;
  dni?: string;
  telefono?: string;
  organizacion?: string;
  rubro?: string;
  mensaje: string;
  empresa?: string;
  producto?: string;
  cadena?: string;
  cantidad?: string;
  presupuesto?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true }, 200);
  if (request.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405);

  try {
    assertApiKey(request);
    const payload = await request.json() as Partial<SolicitudPayload>;
    validatePayload(payload);

    await saveSolicitud(payload as SolicitudPayload);
    const email = buildPublicSolicitudConfirmationEmailContent(payload as SolicitudPayload);
    await sendGmail({
      to: payload.email!,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo: payload.notifyTo!,
    });

    return json({ ok: true }, 200);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'No se pudo enviar la solicitud';
    return json({ ok: false, error: message }, status);
  }
});

function assertApiKey(request: Request) {
  const expected = Deno.env.get('SEND_GMAIL_API_KEY');
  if (!expected) throw httpError(500, 'Falta configurar SEND_GMAIL_API_KEY en Supabase Secrets');

  const received = request.headers.get('x-api-key');
  if (!received || received !== expected) throw httpError(401, 'x-api-key invalida');
}

function validatePayload(payload: Partial<SolicitudPayload>) {
  if (payload.tipo !== 'contacto' && payload.tipo !== 'adquisicion') throw httpError(400, 'Tipo de solicitud invalido');
  if (!payload.notifyTo || !isEmail(payload.notifyTo)) throw httpError(400, 'Destinatario de notificacion invalido');
  if (!payload.nombre?.trim()) throw httpError(400, 'Falta nombre');
  if (!payload.email || !isEmail(payload.email)) throw httpError(400, 'Correo invalido');
  if (!payload.mensaje?.trim()) throw httpError(400, 'Falta mensaje');
  if (payload.tipo === 'adquisicion') {
    if (!payload.cadena?.trim()) throw httpError(400, 'Falta cadena productiva');
    if (!payload.cantidad?.trim()) throw httpError(400, 'Falta cantidad requerida');
  }
}

async function saveSolicitud(payload: SolicitudPayload) {
  const supabaseUrl = requiredSecret('SUPABASE_URL');
  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const record = {
    tipo: 'oportunidad',
    titulo: `SOLICITUD:${payload.tipo}:${payload.nombre}`,
    contenido: JSON.stringify(withoutNotifyTo(payload)),
    estado: 'pendiente',
    fijada: false,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/publicaciones`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw httpError(502, `Supabase no pudo guardar la solicitud: ${detail}`);
  }
}

function withoutNotifyTo(payload: SolicitudPayload) {
  return {
    tipo: payload.tipo,
    nombre: payload.nombre,
    email: payload.email,
    dni: payload.dni,
    telefono: payload.telefono,
    organizacion: payload.organizacion,
    rubro: payload.rubro,
    mensaje: payload.mensaje,
    empresa: payload.empresa,
    producto: payload.producto,
    cadena: payload.cadena,
    cantidad: payload.cantidad,
    presupuesto: payload.presupuesto,
  };
}

async function sendGmail(input: { to: string; subject: string; text: string; html: string; replyTo: string }) {
  const accessToken = await getGoogleAccessToken();
  const raw = buildMimeMessage({
    from: requiredSecret('GMAIL_SENDER'),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
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

function buildMimeMessage(input: { from: string; to: string; subject: string; text: string; html: string; replyTo?: string }) {
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

function buildPublicSolicitudConfirmationEmailContent(payload: SolicitudPayload) {
  const isAdquisicion = payload.tipo === 'adquisicion';
  const title = isAdquisicion ? 'Recibimos tu solicitud de adquisicion' : 'Recibimos tu mensaje';
  const subject = `${title} - ARTICULA CAJ`;
  const fields = [
    ['Tipo', isAdquisicion ? 'Solicitud de adquisicion' : 'Contacto general'],
    ['Nombre', payload.nombre],
    ['Producto', payload.producto],
    ['Cadena productiva', payload.cadena],
  ].filter(([, value]) => Boolean(value));

  const text = [
    `Hola ${payload.nombre},`,
    '',
    'Recibimos tu mensaje en ARTICULA CAJ.',
    'Nuestro equipo revisara la informacion y se contactara contigo pronto.',
    '',
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');

  const rows = fields.map(([label, value]) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(label ?? '')}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:15px;font-weight:700;text-align:right;word-break:break-word;">${escapeHtml(value ?? '')}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef6f2;font-family:Segoe UI,Arial,sans-serif;color:#102033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef6f2;width:100%;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:700px;background:#ffffff;border:1px solid #dbe7e1;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#064e3b;background-image:linear-gradient(135deg,#052e24 0%,#047857 58%,#16a34a 100%);padding:30px;color:#ffffff;">
                <div style="font-size:13px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#bbf7d0;">ARTICULA CAJ</div>
                <h1 style="margin:8px 0 8px;font-size:30px;line-height:1.16;font-weight:900;color:#ffffff;">${escapeHtml(title)}</h1>
                <p style="margin:0;color:#ecfdf5;font-size:15px;line-height:1.65;">Hola, ${escapeHtml(payload.nombre)}. Nuestro equipo revisara tu informacion y se contactara contigo pronto.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 30px 30px;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px 20px;color:#334155;font-size:15px;line-height:1.7;">Gracias por escribirnos. No necesitas responder este correo; nos contactaremos pronto por este medio.</div>
                <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Este correo confirma que tu formulario fue enviado correctamente desde ARTICULA CAJ.</p>
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
