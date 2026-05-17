'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

type AlertType = 'error' | 'info' | 'success';

interface AlertState {
  message: string;
  type: AlertType;
}

interface ConfirmState {
  message: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

function AlertModal({ message, type, onClose }: AlertState & { onClose: () => void }) {
  const styles: Record<AlertType, { icon: React.ReactNode; ring: string; btn: string }> = {
    error:   { icon: <AlertTriangle size={20} className="text-red-500" />,   ring: 'ring-red-100',   btn: 'bg-red-500 hover:bg-red-600' },
    info:    { icon: <Info size={20} className="text-blue-500" />,           ring: 'ring-blue-100',  btn: 'bg-blue-500 hover:bg-blue-600' },
    success: { icon: <CheckCircle size={20} className="text-green-500" />,   ring: 'ring-green-100', btn: 'bg-green-500 hover:bg-green-600' },
  };
  const s = styles[type];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 ring-1 ${s.ring}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 mt-0.5">{s.icon}</div>
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          <button onClick={onClose} className="shrink-0 ml-auto text-gray-300 hover:text-gray-500">
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose}
            className={`${s.btn} text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors`}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, description, confirmLabel, danger, onConfirm, onCancel }: {
  message: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 ring-1 ring-gray-100">
        <div className="flex items-start gap-3 mb-1">
          <div className="shrink-0 mt-0.5">
            <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{message}</p>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`flex-1 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#d4a843] hover:bg-[#b8922e]'
            }`}>
            {confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useDialog() {
  const [alertState, setAlertState]     = useState<AlertState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  function showAlert(message: string, type: AlertType = 'error') {
    setAlertState({ message, type });
  }

  function showConfirm(
    message: string,
    opts?: { description?: string; confirmLabel?: string; danger?: boolean },
  ): Promise<boolean> {
    return new Promise(resolve => {
      setConfirmState({ message, resolve, ...opts });
    });
  }

  const DialogJSX = (
    <>
      {alertState && (
        <AlertModal {...alertState} onClose={() => setAlertState(null)} />
      )}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={() => { confirmState.resolve(true);  setConfirmState(null); }}
          onCancel={() =>  { confirmState.resolve(false); setConfirmState(null); }}
        />
      )}
    </>
  );

  return { showAlert, showConfirm, DialogJSX };
}
