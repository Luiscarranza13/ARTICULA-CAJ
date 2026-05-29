import { createClient } from '@supabase/supabase-js';

const sendGmailApiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined;
const appUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || window.location.origin;

export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabaseUrl || !serviceKey || !sendGmailApiKey) {
    await requestSupabasePasswordReset(email);
    return;
  }

  // 1. Generar el link de recuperación usando el Admin API
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl.replace(/\/$/, '')}/reset-password` },
  });

  if (error || !data?.properties?.action_link) {
    // No revelar si el correo existe o no (seguridad)
    return;
  }

  const resetUrl = data.properties.action_link;

  // 2. Enviar vía send-gmail (ya desplegado y funcionando)
  const { subject, text, html } = buildPasswordResetEmail(email, resetUrl);
  const response = await fetch(`${supabaseUrl}/functions/v1/send-gmail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': sendGmailApiKey,
    },
    body: JSON.stringify({ to: email, subject, text, html }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error || 'No se pudo enviar el correo de recuperación.');
  }
}

async function requestSupabasePasswordReset(email: string) {
  const { createClient: create } = await import('@supabase/supabase-js');
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const client = create(url, key);
  const redirectTo = `${appUrl.replace(/\/$/, '')}/reset-password`;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildPasswordResetEmail(email: string, resetUrl: string) {
  const safeEmail = escapeHtml(email);
  const safeUrl = escapeHtml(resetUrl);
  const subject = 'Restablece tu contraseña — ARTICULA CAJ';

  const text = [
    'Recibimos una solicitud para cambiar tu contraseña en ARTICULA CAJ.',
    '',
    `Correo: ${email}`,
    `Enlace seguro: ${resetUrl}`,
    '',
    'Si no solicitaste este cambio, ignora este mensaje. Tu cuenta sigue protegida.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#eef6f2;font-family:Segoe UI,Arial,sans-serif;color:#102033;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef6f2;width:100%;">
    <tr><td align="center" style="padding:34px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dbe7e1;border-radius:24px;overflow:hidden;">
        <tr><td style="background:#064e3b;background-image:linear-gradient(135deg,#052e24,#047857,#16a34a);padding:30px;color:#fff;">
          <div style="font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#bbf7d0;">ARTICULA CAJ</div>
          <h1 style="margin:8px 0 10px;font-size:26px;font-weight:900;color:#fff;">Restablece tu contraseña</h1>
          <p style="margin:0;color:#ecfdf5;font-size:15px;line-height:1.6;">Recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;color:#334155;font-size:15px;line-height:1.7;">
            Usa el siguiente botón para crear una nueva contraseña para <strong style="color:#0f172a;">${safeEmail}</strong>. Este enlace es de un solo uso y expira en 24 horas.
          </div>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;">
            <tr><td bgcolor="#059669" style="border-radius:14px;">
              <a href="${safeUrl}" style="display:inline-block;padding:15px 28px;color:#fff;text-decoration:none;font-size:15px;font-weight:900;border-radius:14px;">Cambiar contraseña</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:#64748b;font-size:13px;line-height:1.6;">Si el botón no abre, copia este enlace en tu navegador:<br><a href="${safeUrl}" style="color:#047857;text-decoration:none;word-break:break-all;">${safeUrl}</a></p>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta seguirá protegida.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
