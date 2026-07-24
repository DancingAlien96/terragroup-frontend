'use client';

import { useEffect } from 'react';
import { Check, X, Sparkles, Layers, MapPinned } from 'lucide-react';
import type { Plan } from '@/types';

/**
 * Features del plan que se muestran en el pop-up al hacer click en la etiqueta
 * del plan del sidebar. Match con lo que la landing y la Fase A del schema
 * definen (basico = 1 proyecto $250/mes, business = 2 proyectos $350/mes,
 * empresarial = interno).
 */
interface PlanDef {
  nombre:     string;
  precio:     number | null;
  proyectos:  string;
  features:   string[];
  bullet?:    string;
}

const PLAN_INFO: Record<Plan, PlanDef> = {
  basico: {
    nombre:    'Básico',
    precio:    250,
    proyectos: '1 proyecto (lotificación)',
    features: [
      'Gestión completa de clientes y ventas',
      'Cobranza automática por WhatsApp y correo',
      'Reportes financieros y de cartera',
      'Vendedores, comisiones y expedientes',
      'Croquis con pins interactivos (add-on)',
    ],
    bullet: 'Puedes agregar proyectos extra por $50 USD/mes cada uno.',
  },
  business: {
    nombre:    'Business',
    precio:    350,
    proyectos: '2 proyectos (lotificaciones)',
    features: [
      'Todas las funciones del plan Básico',
      'Filtro por proyecto en clientes y reportes',
      'Manejo simultáneo de 2 lotificaciones',
      'Croquis con pins interactivos (add-on)',
      'Prioridad en soporte',
    ],
    bullet: 'Puedes agregar proyectos extra por $50 USD/mes cada uno.',
  },
  // Legacy: mismo shape que business para no romper accounts viejas
  profesional: {
    nombre:    'Profesional',
    precio:    350,
    proyectos: '2 proyectos (lotificaciones)',
    features: [
      'Todas las funciones del plan Básico',
      'Filtro por proyecto en clientes y reportes',
      'Manejo simultáneo de 2 lotificaciones',
      'Croquis con pins interactivos (add-on)',
      'Prioridad en soporte',
    ],
  },
  empresarial: {
    nombre:    'Empresarial',
    precio:    null,
    proyectos: 'Proyectos ilimitados',
    features: [
      'Todas las funciones del sistema',
      'Proyectos ilimitados (sin cargos extra)',
      'Sin límite de tiempo — acceso perpetuo',
      'Soporte prioritario dedicado',
      'Cuenta interna sin suscripción mensual',
    ],
    bullet: 'Plan asignado manualmente por soporte. No aparece en checkout.',
  },
};

interface Props {
  abierto: boolean;
  plan:    Plan;
  onClose: () => void;
}

export default function PlanInfoModal({ abierto, plan, onClose }: Props) {
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, onClose]);

  if (!abierto) return null;

  const info = PLAN_INFO[plan];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#2a2a2a] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-[#d4a843]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4a843]">Tu plan actual</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">{info.nombre}</h2>
          <p className="text-sm text-white/60 mt-1">
            {info.precio !== null
              ? <>${info.precio} USD/mes · Renovación mensual</>
              : <>Cuenta interna · Sin cargos</>}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Proyectos */}
          <div className="flex items-center gap-3 bg-[#fdf3d9]/40 border border-[#d4a843]/20 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-[#d4a843]/20 text-[#8a6910] flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Proyectos incluidos</p>
              <p className="text-sm font-bold text-[#1a1a1a]">{info.proyectos}</p>
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Qué incluye</p>
            <ul className="flex flex-col gap-2">
              {info.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check size={13} className="text-[#d4a843] mt-1 shrink-0" strokeWidth={3} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bullet informativo */}
          {info.bullet && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <MapPinned size={13} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800 leading-relaxed">{info.bullet}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
