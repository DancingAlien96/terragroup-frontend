/**
 * Sentry — runtime del browser (errores que ocurren en el navegador).
 * El DSN es público por diseño (no es un secreto). NEXT_PUBLIC_* lo expone
 * al bundle del cliente.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:              process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:      process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Tag para distinguir del backend cuando ambos manden al mismo proyecto.
  initialScope: { tags: { source: 'frontend' } },
});
