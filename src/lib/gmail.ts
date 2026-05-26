export type CredentialEmailPayload = {
  to: string;
  nombre: string;
  email: string;
  password: string;
  loginUrl: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportAddress?: string;
};

const sendGmailApiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string | undefined;
const supabaseFunctionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gmail`;
const configuredLogoUrl = import.meta.env.VITE_EMAIL_LOGO_URL as string | undefined;
const defaultSupportEmail = 'info@articulacaj.pe';
const defaultSupportPhone = '+51 076 365 000';
const defaultSupportAddress = 'Cajamarca, Peru';

export async function sendCredentialEmail(payload: CredentialEmailPayload): Promise<void> {
  if (!sendGmailApiKey) {
    throw new Error('Falta VITE_SEND_GMAIL_API_KEY para invocar send-gmail.');
  }

  const email = buildCredentialEmailContent(payload);
  const response = await fetch(supabaseFunctionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': sendGmailApiKey,
    },
    body: JSON.stringify({
      to: payload.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      replyTo: email.supportEmail,
    }),
  });

  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `No se pudo enviar el correo con Gmail API. HTTP ${response.status}`);
  }
}

export function buildCredentialEmailContent(payload: CredentialEmailPayload) {
  const logoUrl = payload.logoUrl || configuredLogoUrl || safeAbsoluteUrl('/favicon.svg');
  const supportEmail = payload.supportEmail || defaultSupportEmail;
  const supportPhone = payload.supportPhone || defaultSupportPhone;
  const supportAddress = payload.supportAddress || defaultSupportAddress;
  const subject = 'Bienvenido a ARTICULA CAJ - tus credenciales de acceso';
  const name = escapeHtml(payload.nombre);
  const email = escapeHtml(payload.email);
  const password = escapeHtml(payload.password);
  const loginUrl = escapeHtml(payload.loginUrl);

  const text = [
    `Hola ${payload.nombre}, bienvenido a ARTICULA CAJ.`,
    '',
    'Tu solicitud fue aprobada y tu cuenta ya esta lista.',
    '',
    `Correo: ${payload.email}`,
    `Contrasena: ${payload.password}`,
    `Ingreso: ${payload.loginUrl}`,
    '',
    'Por seguridad, cambia tu contrasena despues del primer ingreso.',
    '',
    `Contacto: ${supportEmail} | ${supportPhone} | ${supportAddress}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef6f2;font-family:Segoe UI,Arial,sans-serif;color:#102033;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">Bienvenido a ARTICULA CAJ. Tu cuenta fue aprobada y tus credenciales ya estan listas.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background-color:#eef6f2;">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:700px;background-color:#ffffff;border:1px solid #dbe7e1;border-radius:26px;overflow:hidden;">
            <tr>
              <td style="background-color:#064e3b;background-image:linear-gradient(135deg,#052e24 0%,#047857 54%,#16a34a 100%);padding:28px 30px 34px;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="width:58px;height:58px;background:#ffffff;border-radius:18px;">
                            <span style="display:inline-block;width:38px;height:38px;border-radius:14px;background-color:#059669;background-image:linear-gradient(135deg,#34d399,#047857);color:#ffffff;font-size:20px;line-height:38px;font-weight:900;text-align:center;">A</span>
                          </td>
                          <td style="padding-left:14px;">
                            <div style="font-size:19px;font-weight:900;line-height:1;letter-spacing:.02em;">ARTICULA CAJ</div>
                            <div style="font-size:13px;line-height:1.4;color:#d1fae5;margin-top:6px;">Cadenas productivas conectadas</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      <span style="display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:8px 12px;color:#ecfdf5;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;">Cuenta aprobada</span>
                    </td>
                  </tr>
                </table>
                <div style="height:28px;line-height:28px;">&nbsp;</div>
                <div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#bbf7d0;">Bienvenida oficial</div>
                <h1 style="margin:8px 0 10px;font-size:32px;line-height:1.16;font-weight:900;color:#ffffff;">Hola, ${name}</h1>
                <p style="margin:0;max-width:590px;font-size:16px;line-height:1.65;color:#ecfdf5;">Tu solicitud fue aprobada. Desde ahora puedes ingresar a la plataforma para conectar con productores, compradores e instituciones de Cajamarca.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 30px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;">
                  <tr>
                    <td style="padding:22px;">
                      <div style="font-size:13px;font-weight:900;color:#047857;text-transform:uppercase;letter-spacing:.08em;">Acceso a la plataforma</div>
                      <p style="margin:8px 0 0;color:#475569;font-size:15px;line-height:1.65;">Guarda estas credenciales en un lugar seguro. Te recomendamos cambiar tu contrasena despues de iniciar sesion por primera vez.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 30px 4px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:0 0 14px;">
                      <div style="font-size:12px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Correo de ingreso</div>
                      <div style="margin-top:7px;padding:15px 16px;background:#ffffff;border:1px solid #dbe7e1;border-radius:15px;color:#0f172a;font-size:16px;font-weight:800;word-break:break-all;">${email}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 18px;">
                      <div style="font-size:12px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Contrasena temporal</div>
                      <div style="margin-top:7px;padding:16px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:15px;color:#065f46;font-size:20px;font-weight:900;letter-spacing:.02em;word-break:break-all;">${password}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td bgcolor="#059669" style="border-radius:14px;">
                      <a href="${loginUrl}" style="display:inline-block;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;border-radius:14px;">Ingresar ahora</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:#64748b;font-size:13px;line-height:1.6;">Si el boton no abre, copia este enlace en tu navegador:<br><a href="${loginUrl}" style="color:#047857;text-decoration:none;word-break:break-all;">${loginUrl}</a></p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 30px 8px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="33.33%" style="padding:0 6px 12px 0;">
                      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#ffffff;">
                        <div style="font-size:20px;font-weight:900;color:#059669;">1</div>
                        <div style="font-size:13px;color:#334155;font-weight:800;margin-top:5px;">Inicia sesion</div>
                      </div>
                    </td>
                    <td width="33.33%" style="padding:0 6px 12px;">
                      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#ffffff;">
                        <div style="font-size:20px;font-weight:900;color:#059669;">2</div>
                        <div style="font-size:13px;color:#334155;font-weight:800;margin-top:5px;">Actualiza tu perfil</div>
                      </div>
                    </td>
                    <td width="33.33%" style="padding:0 0 12px 6px;">
                      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#ffffff;">
                        <div style="font-size:20px;font-weight:900;color:#059669;">3</div>
                        <div style="font-size:13px;color:#334155;font-weight:800;margin-top:5px;">Conecta oportunidades</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 30px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;">
                  <tr>
                    <td style="padding-top:20px;font-size:14px;line-height:1.7;color:#475569;">
                      <strong style="display:block;color:#0f172a;font-size:15px;margin-bottom:4px;">Soporte ARTICULA CAJ</strong>
                      Correo: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#047857;text-decoration:none;font-weight:700;">${escapeHtml(supportEmail)}</a><br>
                      Telefono: ${escapeHtml(supportPhone)}<br>
                      Direccion: ${escapeHtml(supportAddress)}
                      <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">Este mensaje fue enviado automaticamente porque tu solicitud de acceso fue aprobada por administracion. No compartas tus credenciales con terceros.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html, logoUrl, supportEmail, supportPhone, supportAddress };
}

function safeAbsoluteUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
