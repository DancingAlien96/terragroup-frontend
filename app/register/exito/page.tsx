'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function ExitoContent() {
  const params = useSearchParams();
  const empresaId = params.get('empresa');

  // 'verifying' mientras se espera el webhook; 'active' cuando ya se activó;
  // 'timeout' si tras 60s seguimos sin confirmación (el webhook puede tardar
  // o la red estar lenta; el cliente puede intentar login igualmente).
  const [estado, setEstado] = useState<'verifying' | 'active' | 'timeout'>('verifying');

  useEffect(() => {
    if (!empresaId) {
      setEstado('timeout');
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/api/empresas/${empresaId}/estado`);
        const json = await res.json();
        if (json?.data?.activo) {
          if (!cancelled) setEstado('active');
          return;
        }
      } catch { /* ignorar y reintentar */ }

      if (Date.now() - startedAt > 60_000) {
        if (!cancelled) setEstado('timeout');
        return;
      }
      setTimeout(poll, 3_000);
    }
    poll();

    return () => { cancelled = true; };
  }, [empresaId]);

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8 text-center">
        {estado === 'verifying' && (
          <>
            <Loader2 size={48} className="mx-auto text-[#d4a843] animate-spin mb-4" />
            <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Confirmando tu pago…</h1>
            <p className="text-sm text-gray-500">
              Estamos verificando con Recurrente que el pago se completó. Esto suele tardar unos segundos.
            </p>
          </>
        )}

        {estado === 'active' && (
          <>
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">¡Cuenta activada!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tu pago fue confirmado y tu empresa está lista para usar TerraGroup.
            </p>
            <Link href="/login"
              className="inline-block bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm">
              Iniciar sesión
            </Link>
          </>
        )}

        {estado === 'timeout' && (
          <>
            <Loader2 size={48} className="mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Pago en proceso</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tu pago fue recibido pero la confirmación está tardando más de lo normal.
              Tu cuenta se activará en cuanto la confirmación llegue (puede demorar unos minutos).
              Intenta iniciar sesión en unos minutos.
            </p>
            <Link href="/login"
              className="inline-block bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm">
              Ir al inicio de sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ExitoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f9fafb]" />}>
      <ExitoContent />
    </Suspense>
  );
}
