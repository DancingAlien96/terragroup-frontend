'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function CanceladoPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8 text-center">
        <XCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Pago cancelado</h1>
        <p className="text-sm text-gray-500 mb-6">
          No se completó el pago. Puedes intentarlo de nuevo cuando quieras —
          tus datos quedaron guardados.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register"
            className="bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm">
            Volver a intentar
          </Link>
          <Link href="/"
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-full transition-colors text-sm">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
