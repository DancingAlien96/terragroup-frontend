'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingDown, Clock, DollarSign, Eye } from 'lucide-react';
import { api } from '@/lib/api';

interface DeudorCartera {
  propietario_id: number;
  propietario_nombre: string;
  lote_clave: string;
  monto_vencido: number;
  dias_mora: number;
  pagos_vencidos: number;
  estado_mora: 'temprana' | 'media' | 'grave';
}

const ESTADO_LABEL: Record<DeudorCartera['estado_mora'], string> = {
  temprana: 'Mora temprana',
  media:    'Mora media',
  grave:    'Mora grave',
};

const ESTADO_STYLES: Record<DeudorCartera['estado_mora'], string> = {
  temprana: 'bg-[#fdf3d9] text-[#92700a] border border-[#d4a843]/30',
  media:    'bg-orange-50 text-orange-600 border border-orange-200',
  grave:    'bg-red-50 text-red-600 border border-red-200',
};

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('es-MX');
}

export default function CarteraVencidaPage() {
  const [deudores, setDeudores] = useState<DeudorCartera[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | DeudorCartera['estado_mora']>('todos');
  const [busqueda, setBusqueda] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setDeudores(await api.cartera.list()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalCartera = deudores.reduce((s, d) => s + Number(d.monto_vencido), 0);
  const enMoraGrave  = deudores.filter(d => d.estado_mora === 'grave').length;
  const promedioDias = deudores.length
    ? Math.round(deudores.reduce((s, d) => s + Number(d.dias_mora), 0) / deudores.length)
    : 0;

  const filtrados = deudores.filter(d => {
    const matchEstado = filtroEstado === 'todos' || d.estado_mora === filtroEstado;
    const matchBusq   = (d.propietario_nombre ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
                        (d.lote_clave ?? '').toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusq;
  });

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Cartera Vencida</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clientes con pagos atrasados y clasificación de mora</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Cartera Vencida</p>
            <p className="text-xl font-bold text-red-500">{fmt(totalCartera)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center">
            <AlertCircle size={18} className="text-[#d4a843]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Clientes en mora</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{deudores.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Mora grave</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{enMoraGrave}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
            <Clock size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Promedio días mora</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{promedioDias} días</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Controles */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
          <div className="flex gap-1">
            {(['todos', 'temprana', 'media', 'grave'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroEstado(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === f
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar propietario o lote..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent w-60"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Propietario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lote</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto Vencido</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Días en Mora</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagos Vencidos</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
            ) : filtrados.map(d => (
              <tr key={d.propietario_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-[#1a1a1a]">{d.propietario_nombre}</td>
                <td className="px-4 py-3 text-gray-600">{d.lote_clave}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(Number(d.monto_vencido))}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${Number(d.dias_mora) >= 60 ? 'text-red-500' : Number(d.dias_mora) >= 30 ? 'text-orange-500' : 'text-[#d4a843]'}`}>
                    {d.dias_mora}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{d.pagos_vencidos}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_STYLES[d.estado_mora]}`}>
                    {ESTADO_LABEL[d.estado_mora]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {filtrados.length} de {deudores.length} registros
        </div>
      </div>
    </div>
  );
}
