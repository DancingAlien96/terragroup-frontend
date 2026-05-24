/**
 * compressImage.ts — Compresión client-side de imágenes para comprobantes.
 *
 * Usa `browser-image-compression` (lightweight, WebWorker) para reducir el peso
 * sin sacrificar mucha calidad visual. Solo se ejecuta si el archivo es imagen
 * y supera el umbral.
 *
 * Import dinámico para evitar inflar el bundle hasta que se use.
 */

const THRESHOLD_BYTES = 1.5 * 1024 * 1024;  // No comprimir si ya pesa < 1.5 MB
const TARGET_MB       = 1;                  // Tamaño objetivo después de comprimir
const MAX_DIMENSION   = 2000;               // Ancho/alto máximo en px

export async function compressImageIfLarge(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= THRESHOLD_BYTES)    return file;

  const { default: imageCompression } = await import('browser-image-compression');
  const compressed = await imageCompression(file, {
    maxSizeMB:           TARGET_MB,
    maxWidthOrHeight:    MAX_DIMENSION,
    useWebWorker:        true,
    initialQuality:      0.8,
    alwaysKeepResolution: false,
  });
  // browser-image-compression devuelve Blob — lo envolvemos en File para conservar el nombre
  return new File([compressed], file.name, { type: compressed.type || file.type });
}
