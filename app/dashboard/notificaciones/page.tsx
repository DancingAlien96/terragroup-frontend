'use client';

/**
 * Página de notificaciones — deshabilitada por decisión de producto.
 *
 * Se conserva el archivo del componente original con toda la lógica en el
 * historial de git (git log app/dashboard/notificaciones/page.tsx). Este
 * stub redirige a /dashboard para que cualquier link viejo o URL escrita
 * a mano no muestre una pantalla en blanco.
 *
 * Para re-habilitar:
 *   1. Restaurar la versión anterior desde git (git show <commit>:...).
 *   2. Descomentar el item 'Notificaciones' en app/dashboard/layout.tsx.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificacionesPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return null;
}
