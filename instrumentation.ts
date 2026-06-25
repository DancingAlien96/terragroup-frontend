/**
 * Hook de Next.js que se ejecuta al iniciar la app — usado por Sentry para
 * inicializar el runtime correcto (Node SSR o Edge) según el contexto.
 * Ver: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
