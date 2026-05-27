import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { sendPublicSolicitudConfirmationEmail } from './gmail';

export type SolicitudWeb = {
  id: string;
  tipo: 'contacto' | 'adquisicion';
  nombre: string;
  email: string;
  dni?: string;
  telefono?: string;
  organizacion?: string;
  rubro?: string;
  empresa?: string;
  producto?: string;
  cadena?: string;
  cantidad?: string;
  presupuesto?: string;
  mensaje: string;
  estado: string;
  createdAt: string;
};

type SolicitudPayload = Omit<SolicitudWeb, 'id' | 'estado' | 'createdAt'>;

const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined;
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const sendGmailApiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string | undefined;

const adminClient = serviceKey && url
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export async function submitSolicitud(payload: SolicitudPayload) {
  const record = {
    tipo: 'oportunidad',
    titulo: `SOLICITUD:${payload.tipo}:${payload.nombre}`,
    contenido: JSON.stringify(payload),
    estado: 'pendiente',
    fijada: false,
  };

  const { error } = await supabase.from('publicaciones').insert(record);
  if (!error) return;

  if (error.code === '42501' && adminClient) {
    const fallback = await adminClient.from('publicaciones').insert(record);
    if (!fallback.error) return;
    throw fallback.error;
  }

  throw error;
}

export async function submitSolicitudAndNotify(payload: SolicitudPayload, notifyTo: string) {
  const edgeResult = await submitSolicitudViaEdge(payload, notifyTo);
  if (edgeResult.ok) return;

  const [saveResult, confirmationEmailResult] = await Promise.allSettled([
    submitSolicitud(payload),
    sendPublicSolicitudConfirmationEmail({
      ...payload,
      to: notifyTo,
    }),
  ]);

  if (saveResult.status === 'rejected') {
    console.error('No se pudo guardar la solicitud en Supabase', saveResult.reason);
  }

  if (confirmationEmailResult.status === 'rejected') {
    throw confirmationEmailResult.reason;
  }
}

async function submitSolicitudViaEdge(payload: SolicitudPayload, notifyTo: string) {
  if (!url || !sendGmailApiKey) return { ok: false };

  try {
    const response = await fetch(`${url}/functions/v1/submit-solicitud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sendGmailApiKey,
      },
      body: JSON.stringify({ ...payload, notifyTo }),
    });

    if (response.status === 404) return { ok: false };

    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok || data?.error) {
      throw new Error(data?.error || `No se pudo enviar la solicitud. HTTP ${response.status}`);
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof TypeError) return { ok: false };
    throw error;
  }
}

export async function fetchSolicitudes(): Promise<SolicitudWeb[]> {
  const client = adminClient ?? supabase;
  const { data, error } = await client
    .from('publicaciones')
    .select('id,titulo,contenido,estado,created_at')
    .like('titulo', 'SOLICITUD:%')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const parsed = parseSolicitud(row.contenido ?? '{}');
    return {
      id: row.id,
      tipo: parsed.tipo ?? 'contacto',
      nombre: parsed.nombre ?? '',
      email: parsed.email ?? '',
      dni: parsed.dni,
      telefono: parsed.telefono,
      organizacion: parsed.organizacion,
      rubro: parsed.rubro,
      empresa: parsed.empresa,
      producto: parsed.producto,
      cadena: parsed.cadena,
      cantidad: parsed.cantidad,
      presupuesto: parsed.presupuesto,
      mensaje: parsed.mensaje ?? row.contenido ?? '',
      estado: row.estado ?? 'pendiente',
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  });
}

export async function updateSolicitudEstado(id: string, estado: string) {
  const client = adminClient ?? supabase;
  const { error } = await client.from('publicaciones').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function deleteSolicitud(id: string) {
  const client = adminClient ?? supabase;
  const { error } = await client.from('publicaciones').delete().eq('id', id);
  if (error) throw error;
}

function parseSolicitud(value: string): Partial<SolicitudPayload> {
  try {
    return JSON.parse(value) as Partial<SolicitudPayload>;
  } catch {
    return { tipo: 'contacto', mensaje: value };
  }
}
