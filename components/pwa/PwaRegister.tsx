'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker en el mount inicial. Client-side only para
 * evitar SSR + evita competir por network en la primera pintada (uso
 * requestIdleCallback si está disponible, sino defer con setTimeout).
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Solo prod — evita cachear en dev y sorprender con estados viejos.
    if (process.env.NODE_ENV !== 'production') return;

    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* silencioso — no bloqueamos la app si el SW falla */
      });
    };

    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(registrar);
    } else {
      setTimeout(registrar, 1500);
    }
  }, []);

  return null;
}
