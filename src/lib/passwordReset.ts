import { supabase } from './supabase';

const sendGmailApiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined;
const appUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || window.location.origin;
const passwordResetFunctionUrl = `${supabaseUrl}/functions/v1/send-password-reset`;
const sendGmailFunctionUrl = `${supabaseUrl}/functions/v1/send-gmail`;

export async function requestPasswordReset(email: string) {
  if (!sendGmailApiKey) {
    await requestSupabasePasswordReset(email);
    return;
  }

  let response: Response;
  try {
    response = await fetch(passwordResetFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sendGmailApiKey,
      },
      body: JSON.stringify({ email }),
    });
  } catch {
    await requestCustomPasswordResetEmail(email);
    return;
  }

  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (response.status === 404) {
    await requestCustomPasswordResetEmail(email);
    return;
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `No se pudo enviar recuperacion. HTTP ${response.status}`);
  }
}

async function requestCustomPasswordResetEmail(email: string) {
  if (!supabaseUrl || !supabaseServiceKey || !sendGmailApiKey) {
    await requestSupabasePasswordReset(email);
    return;
  }

  try {
    const resetUrl = await generateRecoveryLink(email);
    const emailContent = buildPasswordResetEmail(email, resetUrl);
    const response = await fetch(sendGmailFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sendGmailApiKey,
      },
      body: JSON.stringify({
        to: email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        replyTo: 'info@articulacaj.pe',
      }),
    });

    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok || data?.error) {
      throw new Error(data?.error || `No se pudo enviar recuperacion. HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('No se pudo enviar recuperacion personalizada', error);
    await requestSupabasePasswordReset(email);
  }
}

async function generateRecoveryLink(email: string) {
  const redirectTo = `${appUrl.replace(/\/$/, '')}/reset-password`;
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceKey!,
      Authorization: `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'recovery',
      email,
      redirect_to: redirectTo,
    }),
  });

  const data = await response.json().catch(() => null) as { action_link?: string; properties?: { action_link?: string }; msg?: string; message?: string } | null;
  const actionLink = data?.action_link || data?.properties?.action_link;
  if (!response.ok || !actionLink) {
    throw new Error(data?.msg || data?.message || 'Supabase no devolvio enlace de recuperacion');
  }

  return actionLink;
}

async function requestSupabasePasswordReset(email: string) {
  const redirectTo = `${appUrl.replace(/\/$/, '')}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    throw new Error(error.message);
  }
}

function buildPasswordResetEmail(email: string, resetUrl: string) {
  const safeEmail = escapeHtml(email);
  const safeResetUrl = escapeHtml(resetUrl);
  const subject = 'Restablece tu contrasena - ARTICULA CAJ';
  const text = [
    'Hola,',
    '',
    'Recibimos una solicitud para restablecer tu contrasena en ARTICULA CAJ.',
    `Correo: ${email}`,
    `Enlace seguro: ${resetUrl}`,
    '',
    'Si no solicitaste este cambio, puedes ignorar este correo.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef6f2;font-family:Segoe UI,Arial,sans-serif;color:#102033;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">Restablece tu contrasena de ARTICULA CAJ.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef6f2;width:100%;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #dbe7e1;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.10);">
            <tr>
              <td style="background:#064e3b;background-image:linear-gradient(135deg,#052e24 0%,#047857 58%,#16a34a 100%);padding:30px;color:#ffffff;">
                <div style="font-size:13px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#bbf7d0;">ARTICULA CAJ</div>
                <h1 style="margin:10px 0 10px;font-size:30px;line-height:1.16;font-weight:900;color:#ffffff;">Restablece tu contrasena</h1>
                <p style="margin:0;color:#ecfdf5;font-size:15px;line-height:1.65;">Recibimos una solicitud para recuperar el acceso de tu cuenta.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px 20px;color:#334155;font-size:15px;line-height:1.7;">
                  Usa el boton para crear una nueva contrasena para <strong style="color:#0f172a;">${safeEmail}</strong>. Por seguridad, este enlace es temporal.
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;">
                  <tr>
                    <td bgcolor="#059669" style="border-radius:14px;">
                      <a href="${safeResetUrl}" style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;border-radius:14px;">Cambiar contrasena</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0;color:#64748b;font-size:13px;line-height:1.6;">Si el boton no abre, copia este enlace:<br><a href="${safeResetUrl}" style="color:#047857;text-decoration:none;word-break:break-all;">${safeResetUrl}</a></p>
                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Si no solicitaste este cambio, ignora este correo. Tu cuenta seguira protegida.</p>
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
