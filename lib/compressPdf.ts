/**
 * compressPdf.ts — Compresión client-side de PDFs.
 *
 * Convierte cada página del PDF a JPEG comprimido y arma un PDF nuevo.
 * Solo recomendado para PDFs grandes (escaneados). Para PDFs basados en texto
 * esto degrada calidad y elimina la búsqueda — la lógica de cuándo usarlo
 * vive en el caller.
 *
 * Las dependencias (pdfjs-dist + pdf-lib) se importan dinámicamente para no
 * inflar el bundle hasta que realmente se necesite comprimir.
 */

const MAX_DIMENSION = 1500;  // Máx ancho/alto por página en píxeles
const JPEG_QUALITY  = 0.7;

export interface CompressOptions {
  onProgress?: (pct: number) => void;
  maxDimension?: number;
  jpegQuality?: number;
}

export async function compressPdf(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxDimension = opts.maxDimension ?? MAX_DIMENSION;
  const jpegQuality  = opts.jpegQuality  ?? JPEG_QUALITY;

  // Imports dinámicos para code-splitting
  const [pdfjs, pdfLib] = await Promise.all([
    import('pdfjs-dist'),
    import('pdf-lib'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const newPdf = await pdfLib.PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      maxDimension / baseViewport.width,
      maxDimension / baseViewport.height,
      2,
    );
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width  = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear contexto de canvas');

    // pdf.js v4+: canvas se pasa como `canvas`, no `canvasContext`
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob falló'))),
        'image/jpeg',
        jpegQuality,
      ),
    );
    const arrayBuffer = await blob.arrayBuffer();
    const image = await newPdf.embedJpg(new Uint8Array(arrayBuffer));

    const newPage = newPdf.addPage([image.width, image.height]);
    newPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

    opts.onProgress?.((i / pdf.numPages) * 100);
  }

  const bytes = await newPdf.save();
  return new File([new Uint8Array(bytes)], file.name, { type: 'application/pdf' });
}
