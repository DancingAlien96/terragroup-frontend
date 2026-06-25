/**
 * Sentry — runtime de Node.js (errores que ocurren en SSR / API Routes de Next).
 * Usa la SENTRY_DSN privada (sin el prefijo NEXT_PUBLIC_) — aunque para Sentry
 * técnicamente el DSN no es secreto, evitamos exponerlo al bundle si se puede.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:              process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:      process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  initialScope: { tags: { source: 'frontend-ssr' } },
});
