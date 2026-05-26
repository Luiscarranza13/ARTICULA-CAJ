# send-gmail

Supabase Edge Function para enviar correos HTML con Gmail API.

## Secrets requeridos

```bash
supabase secrets set GOOGLE_CLIENT_ID="..."
supabase secrets set GOOGLE_CLIENT_SECRET="..."
supabase secrets set GOOGLE_REFRESH_TOKEN="..."
supabase secrets set GMAIL_SENDER="ARTICULA CAJ <tu-correo@gmail.com>"
supabase secrets set SEND_GMAIL_API_KEY="una-clave-larga-aleatoria"
```

El frontend debe tener:

```env
VITE_SEND_GMAIL_API_KEY=una-clave-larga-aleatoria
```

## Deploy

```bash
supabase functions deploy send-gmail
```
