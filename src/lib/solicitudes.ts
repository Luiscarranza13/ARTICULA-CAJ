import { supabase, supabaseAdmin } from './supabase';
import { sendPublicSolicitudConfirmationEmail, sendPublicSolicitudEmail } from './gmail';

const db = supabaseAdmin ?? supabase;

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

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const sendGmailApiKey = import.meta.env.VITE_SEND_GMAIL_API_KEY as string | undefined;

export async function submitSolicitudAndNotify(payload: SolicitudPayload, notifyTo: string) {
  const safePayload = normalizeSolicitudPayload(payload);
  validateSolicitudPayload(safePayload);

  // Intento principal: edge function maneja DB + correos
  const edgeResult = await submitSolicitudViaEdge(safePayload, notifyTo);
  if (edgeResult.ok) return;

  // Fallback resiliente: cualquier canal que funcione = éxito
  const [saveResult, adminEmailResult, confirmEmailResult] = await Promise.allSettled([
    saveToSupabase(safePayload),
    sendPublicSolicitudEmail({ ...safePayload, to: notifyTo }),
    sendPublicSolicitudConfirmationEmail({ ...safePayload, to: notifyTo }),
  ]);

  const anySuccess =
    saveResult.status === 'fulfilled' ||
    adminEmailResult.status === 'fulfilled' ||
    confirmEmailResult.status === 'fulfilled';

  if (anySuccess) {
    if (saveResult.status === 'rejected') {
      console.warn('Solicitud enviada por correo pero no guardada en DB:', saveResult.reason);
    }
    return;
  }

  // Todo falló
  const firstError =
    (adminEmailResult.status === 'rejected' ? adminEmailResult.reason : null) ??
    (saveResult.status === 'rejected' ? saveResult.reason : null);
  throw firstError instanceof Error
    ? firstError
    : new Error('No se pudo enviar la solicitud. Verifica tu conexión e intenta nuevamente.');
}

async function saveToSupabase(payload: SolicitudPayload) {
  const record = {
    tipo: 'oportunidad',
    titulo: `SOLICITUD:${payload.tipo}:${payload.nombre}`,
    contenido: JSON.stringify(payload),
    estado: 'pendiente',
    fijada: false,
  };
  const { error } = await db.from('publicaciones').insert(record);
  if (error) throw error;
}

// Mantener export para compatibilidad
export async function submitSolicitud(payload: SolicitudPayload) {
  return saveToSupabase(normalizeSolicitudPayload(payload));
}

function normalizeSolicitudPayload(payload: SolicitudPayload): SolicitudPayload {
  return {
    ...payload,
    nombre: payload.nombre.trim(),
    email: payload.email.trim().toLowerCase(),
    dni: payload.dni?.trim(),
    telefono: payload.telefono?.trim(),
    organizacion: payload.organizacion?.trim(),
    rubro: payload.rubro?.trim(),
    empresa: payload.empresa?.trim(),
    producto: payload.producto?.trim(),
    cadena: payload.cadena?.trim(),
    cantidad: payload.cantidad?.trim(),
    presupuesto: payload.presupuesto?.trim(),
    mensaje: payload.mensaje.trim(),
  };
}

function validateSolicitudPayload(payload: SolicitudPayload) {
  if (!payload.nombre || payload.nombre.length < 3) {
    throw new Error('Ingresa tu nombre completo.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('Ingresa un correo electrónico válido.');
  }
  if (!payload.mensaje || payload.mensaje.length < 10) {
    throw new Error('Escribe un mensaje con más detalle (mínimo 10 caracteres).');
  }
  if (payload.tipo === 'adquisicion' && (!payload.cadena || !payload.cantidad)) {
    throw new Error('Completa la cadena productiva y la cantidad requerida.');
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
      console.warn('Edge function error:', data?.error ?? `HTTP ${response.status}`);
      return { ok: false }; // No lanzar — dejar que el fallback maneje
    }

    return { ok: true };
  } catch {
    return { ok: false }; // Cualquier error de red → fallback
  }
}

export async function fetchSolicitudes(): Promise<SolicitudWeb[]> {
  const { data, error } = await db
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
  const { error } = await db.from('publicaciones').update({ estado }).eq('id', id);
  if (error) throw error;
}

export async function deleteSolicitud(id: string) {
  const { error } = await db.from('publicaciones').delete().eq('id', id);
  if (error) throw error;
}

function parseSolicitud(value: string): Partial<SolicitudPayload> {
  try {
    return JSON.parse(value) as Partial<SolicitudPayload>;
  } catch {
    return { tipo: 'contacto', mensaje: value };
  }
}
