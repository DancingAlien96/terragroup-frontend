'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import TerminosContent from './contents/TerminosContent';
import PrivacidadContent from './contents/PrivacidadContent';
import AvisoIAContent from './contents/AvisoIAContent';

export type LegalTipo = 'terminos' | 'privacidad' | 'aviso-ia';

interface Props {
  tipo:    LegalTipo | null;
  onClose: () => void;
}

const TITULOS: Record<LegalTipo, string> = {
  'terminos':   'Términos y Condiciones de Uso',
  'privacidad': 'Política de Privacidad',
  'aviso-ia':   'Aviso sobre el uso de Inteligencia Artificial',
};

export default function LegalModal({ tipo, onClose }: Props) {
  // Cerrar con tecla Escape; bloquear scroll del body mientras está abierto.
  useEffect(() => {
    if (!tipo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [tipo, onClose]);

  if (!tipo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-bold text-[#1a1a1a] text-base sm:text-lg pr-4 truncate">
            {TITULOS[tipo]}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <article
          className="overflow-y-auto px-6 py-5 text-sm
            [&_h2]:text-[#1a1a1a] [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg
            [&_h3]:text-[#1a1a1a] [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base
            [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:my-2.5
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-gray-700 [&_ul]:my-2.5
            [&_li]:my-1
            [&_strong]:text-[#1a1a1a]
            [&_a]:text-[#d4a843] [&_a:hover]:underline"
        >
          {tipo === 'terminos'   && <TerminosContent />}
          {tipo === 'privacidad' && <PrivacidadContent />}
          {tipo === 'aviso-ia'   && <AvisoIAContent />}
        </article>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
