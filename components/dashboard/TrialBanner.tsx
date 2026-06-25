'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Clock, CreditCard, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useDialog } from '@/lib/useDialog';

type Estado = 'pendiente' | 'trial' | 'pagada' | 'pago_fallido' | 'cancelada';

interface SuscripcionInfo {
  estado:         Estado;
  trial_fin:      string | null;
  dias_restantes: number | null;
  puede_cancelar: boolean;
}

/**
 * Banner que muestra el estado de la suscripción del dueño de la empresa.
 *  - Trial corriendo: cuenta regresiva + botón "Cancelar suscripción".
 *  - Pago fallido: aviso para regularizar tarjeta.
 *  - Pagada: silencio (no estorbamos al usuario que ya pagó).
 *
 * Se carga vía /api/empresas/mi-suscripcion en el primer render.
 */
export default function TrialBanner() {
  const [info, setInfo] = useState<SuscripcionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const { showConfirm, showAlert, DialogJSX } = useDialog();

  useEffect(() => {
    api.empresas.miSuscripcion()
      .then((d) => setInfo(d as SuscripcionInfo))
      .catch(() => { /* silencio: si no carga, no estorbamos */ });
  }, []);

  async function handleCancelar() {
    if (!await showConfirm('¿Cancelar tu suscripción?', {
      description: 'Perderás acceso al sistema inmediatamente. No se te cobrará nada (estás dentro del trial).',
      danger: true, confirmLabel: 'Sí, cancelar',
    })) return;
    setCanceling(true);
    try {
      await api.empresas.cancelarMiSuscripcion();
      showAlert('Suscripción cancelada. Serás redirigido al login.', 'success');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al cancelar', 'error');
      setCanceling(false);
    }
  }

  if (!info || dismissed) return null;
  if (info.estado === 'pagada' || info.estado === 'pendiente') return null;

  if (info.estado === 'trial') {
    const dias = info.dias_restantes ?? 0;
    const urgente = dias <= 2;
    return (
      <>
        <div className={`flex items-center gap-3 px-4 py-2.5 border-b text-sm ${
          urgente ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <Clock size={16} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold">
              Trial: {dias === 0 ? 'vence hoy' : dias === 1 ? 'vence mañana' : `${dias} días restantes`}
            </span>
            <span className="ml-2 text-xs opacity-80">
              Al finalizar se cobrará $2,000 USD a tu tarjeta.
            </span>
          </div>
          <button onClick={handleCancelar} disabled={canceling}
            className="text-xs font-semibold underline hover:no-underline opacity-80 hover:opacity-100 disabled:opacity-50">
            {canceling ? 'Cancelando…' : 'Cancelar'}
          </button>
          <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 shrink-0">
            <X size={14} />
          </button>
        </div>
        {DialogJSX}
      </>
    );
  }

  if (info.estado === 'pago_fallido') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-red-50 border-red-200 text-red-900 text-sm">
        <CreditCard size={16} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold">Tu pago falló.</span>
          <span className="ml-2 text-xs">
            Recurrente está reintentando. Actualiza tu tarjeta antes que perdamos acceso. Contáctanos a soporte@piums.io.
          </span>
        </div>
      </div>
    );
  }

  if (info.estado === 'cancelada') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-gray-100 border-gray-200 text-gray-700 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        <span>Tu suscripción está cancelada. Acceso limitado.</span>
      </div>
    );
  }

  return null;
}
