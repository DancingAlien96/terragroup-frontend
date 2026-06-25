/**
 * Sentry — runtime de Edge (middleware.ts si lo tuviéramos).
 * Igual config que server.config — Edge runtime tiene capacidades limitadas
 * pero el init es el mismo.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn:              process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:      process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  initialScope: { tags: { source: 'frontend-edge' } },
});
