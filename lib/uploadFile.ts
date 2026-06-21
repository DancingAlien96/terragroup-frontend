/**
 * uploadFile.ts — Sube un archivo al backend de TerraGroup.
 *
 * POST {API_URL}/api/uploads (multipart, field "file") con el JWT del usuario.
 * El backend optimiza imágenes a WebP y devuelve un URL relativo tipo
 * "/uploads/<uuid>.webp" o "/uploads/<uuid>.pdf".
 *
 * Para usar el URL en <img> o <a href>, prefija el origen del API (lo hace
 * la función `resolveFileUrl`). Si el URL ya es absoluto (UploadThing legacy
 * con https://utfs.io/...), se devuelve tal cual.
 */

import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface UploadedFile {
  url:  string;
  mime: string;
  size: number;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const token = getStoredToken();
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(`${API_URL}/api/uploads`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? `Error al subir archivo (HTTP ${res.status})`);
  }
  return json.data as UploadedFile;
}

/** Convierte un URL relativo "/uploads/..." al absoluto del backend.
 *  Si ya es absoluto (UploadThing legacy), lo devuelve tal cual. */
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;        // legacy externo
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
