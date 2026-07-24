import type { MetadataRoute } from 'next';

/**
 * PWA manifest — se sirve como /manifest.webmanifest.
 * Next.js 15 App Router lo genera nativamente desde este archivo.
 *
 * `display: 'standalone'` hace que la app se abra sin barra del navegador
 * cuando el usuario la instala (Add to Home Screen). El color de tema y
 * de fondo se usan para el splash screen y la barra de status en móvil.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'TerraGroup — Gestión de Lotificaciones',
    short_name:       'TerraGroup',
    description:      'Cobros, ventas y croquis para lotificaciones. Multi-proyecto, multi-empresa.',
    start_url:        '/dashboard',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait',
    background_color: '#f9fafb',
    theme_color:      '#1a1a1a',
    lang:             'es-GT',
    icons: [
      { src: '/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['business', 'finance', 'productivity'],
  };
}
