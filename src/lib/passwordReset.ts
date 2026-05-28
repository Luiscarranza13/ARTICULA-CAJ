import { supabase } from './supabase';

const sendGmailApiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const appUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || window.location.origin;
const passwordResetFunctionUrl = `${supabaseUrl}/functions/v1/send-password-reset`;

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
    await requestSupabasePasswordReset(email);
    return;
  }

  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (response.status === 404) {
    await requestSupabasePasswordReset(email);
    return;
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `No se pudo enviar recuperacion. HTTP ${response.status}`);
  }
}

async function requestSupabasePasswordReset(email: string) {
  const redirectTo = `${appUrl.replace(/\/$/, '')}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    throw new Error(error.message);
  }
}
