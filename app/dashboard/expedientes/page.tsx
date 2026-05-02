'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, X, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface Cliente {
  id: number;
  propietario_nombre: string;
  propietario_telefono: string | null;
  propietario_email: string | null;
  propietario_estado_cuenta: string;
  lote_clave: string;
  precio_total: number;
  total_pagado: number;
  total_pendiente: number;
  fecha_inicio: string;
  estado: string;
}

const ESTADO_STYLES: Record<string, string> = {
  'al_dia':    'bg-green-50 text-green-600 border border-green-200',
  'moroso':    'bg-[#fdf3d9] text-[#92700a] border border-[#d4a843]/30',
  'vencido':   'bg-red-50 text-red-600 border border-red-200',
  'liquidado': 'bg-gray-100 text-gray-500 border border-gray-200',
  'activo':    'bg-blue-50 text-blue-600 border border-blue-200',
  'cancelado': 'bg-red-50 text-red-600 border border-red-200',
};

const ESTADO_LABEL: Record<string, string> = {
  al_dia: 'Al día', moroso: 'Moroso', vencido: 'Vencido',
  liquidado: 'Liquidado', activo: 'Activo', cancelado: 'Cancelado',
};

function fmt(n: number) { return '$' + n.toLocaleString('es-MX'); }
function pct(pagado: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((pagado / total) * 100));
}

export default function ExpedientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setClientes(await api.contratos.list()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = clientes.filter(c =>
    (c.propietario_nombre ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.lote_clave ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Expediente de Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Historial completo y documentos por propietario</p>
      </div>

      <div className="flex gap-5">
        {/* Lista */}
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${seleccionado ? 'w-80 shrink-0' : 'flex-1'}`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar cliente o lote..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Cargando expedientes...</p>
            ) : filtrados.map(c => (
              <button
                key={c.id}
                onClick={() => setSeleccionado(c)}
                className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between ${seleccionado?.id === c.id ? 'bg-[#fdf3d9]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                    {(c.propietario_nombre ?? '').split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${seleccionado?.id === c.id ? 'text-[#92700a]' : 'text-[#1a1a1a]'}`}>{c.propietario_nombre}</p>
                    <p className="text-xs text-gray-400">Lote {c.lote_clave} · {ESTADO_LABEL[c.propietario_estado_cuenta] ?? c.propietario_estado_cuenta}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Detalle */}
        {seleccionado && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-lg font-bold">
                    {(seleccionado.propietario_nombre ?? '').split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1a1a1a]">{seleccionado.propietario_nombre}</h2>
                    <p className="text-sm text-gray-500">Contrato #{seleccionado.id}</p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_STYLES[seleccionado.propietario_estado_cuenta] ?? 'bg-gray-100 text-gray-500'}`}>
                      {ESTADO_LABEL[seleccionado.propietario_estado_cuenta] ?? seleccionado.propietario_estado_cuenta}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSeleccionado(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div><p className="text-xs text-gray-400 uppercase tracking-wide">Teléfono</p><p className="font-medium text-[#1a1a1a]">{seleccionado.propietario_telefono ?? '—'}</p></div>
                <div><p className="text-xs text-gray-400 uppercase tracking-wide">Email</p><p className="font-medium text-[#1a1a1a]">{seleccionado.propietario_email ?? '—'}</p></div>
                <div><p className="text-xs text-gray-400 uppercase tracking-wide">Lote</p><p className="font-medium text-[#1a1a1a]">{seleccionado.lote_clave}</p></div>
                <div><p className="text-xs text-gray-400 uppercase tracking-wide">Fecha Contrato</p><p className="font-medium text-[#1a1a1a]">{seleccionado.fecha_inicio}</p></div>
              </div>

              {/* Barra de progreso de pago */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Pagado: <span className="font-semibold text-green-600">{fmt(Number(seleccionado.total_pagado))}</span></span>
                  <span>Pendiente: <span className="font-semibold text-red-500">{Number(seleccionado.total_pendiente) > 0 ? fmt(Number(seleccionado.total_pendiente)) : '—'}</span></span>
                  <span>Total: <span className="font-semibold text-[#1a1a1a]">{fmt(Number(seleccionado.precio_total))}</span></span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-[#d4a843] h-2.5 rounded-full transition-all"
                    style={{ width: `${pct(Number(seleccionado.total_pagado), Number(seleccionado.precio_total))}%` }}
                  />
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">{pct(Number(seleccionado.total_pagado), Number(seleccionado.precio_total))}% completado</p>
              </div>
            </div>

            {/* Documentos (placeholder) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-3">Documentos del expediente</h3>
              <div className="flex flex-col gap-2">
                {['DPI copia', 'Contrato firmado', 'Comprobante enganche'].map(doc => (
                  <div key={doc} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-[#d4a843]/40 hover:bg-[#fdf3d9]/40 transition-colors">
                    <FileText size={16} className="text-[#d4a843] shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{doc}</span>
                    <span className="text-xs text-green-500 font-medium">Cargado</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!seleccionado && (
          <div className="flex-1 bg-white rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
            Selecciona un cliente para ver su expediente
          </div>
        )}
      </div>
    </div>
  );
}
