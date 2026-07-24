import type { Metadata } from 'next';
import CroquisPublicoClient from './CroquisPublicoClient';

/**
 * Server component wrapper que expone Open Graph + Twitter Card meta tags
 * cuando el link se comparte en WhatsApp, Facebook, Twitter/X, iMessage,
 * Slack, etc. Los bots de esos servicios no ejecutan JS — por eso los
 * meta tags tienen que venir server-rendered (no bastaría un useEffect
 * setteando document.title).
 *
 * La página en sí (con interactividad, click en pins, panel de detalle)
 * vive en CroquisPublicoClient — este archivo solo hace fetch para el
 * metadata y despacha al client.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Regenera la metadata cada 5 minutos. Balance razonable entre reflejar
// cambios (portada nueva, apagar público) y evitar hits al backend cada
// vez que un bot inspecciona el link.
export const revalidate = 300;

interface CroquisMeta {
  empresa_nombre:       string;
  proyecto_nombre:      string;
  proyecto_ubicacion:   string | null;
  proyecto_portada_url: string | null;
  imagen_url:           string;
  lotes:                Array<unknown>;
}

async function fetchMeta(token: string): Promise<CroquisMeta | null> {
  try {
    const res = await fetch(`${API_URL}/api/publico/croquis/${encodeURIComponent(token)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json?.success) return null;
    return json.data as CroquisMeta;
  } catch {
    return null;
  }
}

/** Convierte un URL relativo del backend en absoluto para OG image. */
function absolutizarImagen(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchMeta(token);

  if (!data) {
    return {
      title:       'Croquis no disponible',
      description: 'Este link ya no está activo.',
      robots:      { index: false, follow: false },
    };
  }

  // Portada del proyecto si existe, fallback al plano del croquis. Siempre
  // absoluta — WhatsApp/Facebook no siguen relative URLs.
  const ogImage = absolutizarImagen(data.proyecto_portada_url ?? data.imagen_url);
  const title   = `Croquis · ${data.proyecto_nombre}`;
  const desc    = `${data.empresa_nombre} — ${data.lotes.length} lote${data.lotes.length === 1 ? '' : 's'}${data.proyecto_ubicacion ? ` · ${data.proyecto_ubicacion}` : ''}. Consulta disponibilidad y precios.`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type:        'website',
      siteName:    data.empresa_nombre,
      images:      ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
      images:      ogImage ? [ogImage] : undefined,
    },
    // Los croquis públicos son one-off compartidos por link — no queremos
    // que Google los indexe (el dueño puede regenerar el token en cualquier
    // momento y desactivarlos).
    robots: { index: false, follow: false },
  };
}

export default async function CroquisPublicoPage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return <CroquisPublicoClient token={token} />;
}
