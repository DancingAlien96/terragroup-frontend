'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingDown, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface CarteraItem {
  id: number;
  nombre_comprador: string;
  descripcion_lote: string;
  valor_cuota: number;
  num_cuotas: number;
  fecha_deposito: string;
  cuotas_vencidas: number;
  monto_vencido: number;
  dias_mora: number;
  estado_mora: 'temprana' | 'media' | 'grave';
}

const ESTADO_LABEL: Record<CarteraItem['estado_mora'], string> = {
  temprana: 'Mora temprana',
  media:    'Mora media',
  grave:    'Mora grave',
};

const ESTADO_STYLES: Record<CarteraItem['estado_mora'], string> = {
  temprana: 'bg-[#fdf3d9] text-[#92700a] border border-[#d4a843]/30',
  media:    'bg-orange-50 text-orange-600 border border-orange-200',
  grave:    'bg-red-50 text-red-600 border border-red-200',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(n);

/** Calcula las cuotas vencidas de un cliente.
 *  - El enganche se paga en fecha_deposito (no cuenta como cuota).
 *  - Cuota 1 vence 1 mes despues de fecha_deposito, cuota 2 a los 2 meses, etc.
 *  - Un pago registrado = una cuota cubierta (FIFO).
 *  - Si hoy >= fecha_vencimiento de cuota N y solo hay < N pagos => mora.
 */
function calcularMora(cliente: any, pagosCliente: number, today: Date): CarteraItem | null {
  const deposito = new Date(cliente.fecha_deposito);
  const numCuotas = Number(cliente.num_cuotas);
  const valorCuota = Number(cliente.valor_cuota);

  // Generar fechas de vencimiento de cada cuota
  const fechasVencidas: Date[] = [];
  for (let i = 1; i <= numCuotas; i++) {
    const due = new Date(deposito);
    due.setMonth(due.getMonth() + i);
    if (due <= today) {
      fechasVencidas.push(due);
    } else {
      break;
    }
  }

  const cuotasPrevias = Math.max(0, Number(cliente.cuota_inicio ?? 1) - 1);
  const cuotasVencidas = fechasVencidas.length - pagosCliente - cuotasPrevias;
  if (cuotasVencidas <= 0) return null;

  // Fecha mas antigua sin pagar
  const oldestUnpaid = fechasVencidas[pagosCliente + cuotasPrevias];
  const diasMora = Math.floor((today.getTime() - oldestUnpaid.getTime()) / (1000 * 60 * 60 * 24));

  let estado_mora: CarteraItem['estado_mora'] = 'temprana';
  if (diasMora > 90) estado_mora = 'grave';
  else if (diasMora > 30) estado_mora = 'media';

  return {
    id: cliente.id,
    nombre_comprador: cliente.nombre_comprador,
    descripcion_lote: cliente.descripcion_lote ?? '—',
    valor_cuota: valorCuota,
    num_cuotas: numCuotas,
    fecha_deposito: cliente.fecha_deposito,
    cuotas_vencidas: cuotasVencidas,
    monto_vencido: cuotasVencidas * valorCuota,
    dias_mora: diasMora,
    estado_mora,
  };
}

export default function CarteraVencidaPage() {
  const [items, setItems] = useState<CarteraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | CarteraItem['estado_mora']>('todos');
  const [busqueda, setBusqueda] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientes, pagos] = await Promise.all([
        api.clientes.list(),
        api.pagos.list(),
      ]);
      const today = new Date();
      today.setHours(23, 59, 59, 0); // fin del dia de hoy

      const resultado: CarteraItem[] = [];
      for (const c of clientes) {
        const pagosCount = pagos.filter((p: any) => p.cliente_id === c.id && p.estado === 'pagado').length;
        const item = calcularMora(c, pagosCount, today);
        if (item) resultado.push(item);
      }
      resultado.sort((a, b) => b.dias_mora - a.dias_mora);
      setItems(resultado);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalCartera  = items.reduce((s, d) => s + d.monto_vencido, 0);
  const enMoraGrave   = items.filter(d => d.estado_mora === 'grave').length;
  const promedioDias  = items.length
    ? Math.round(items.reduce((s, d) => s + d.dias_mora, 0) / items.length)
    : 0;

  const filtrados = items.filter(d => {
    const matchEstado = filtroEstado === 'todos' || d.estado_mora === filtroEstado;
    const matchBusq   = d.nombre_comprador.toLowerCase().includes(busqueda.toLowerCase()) ||
                        d.descripcion_lote.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusq;
  });

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Cartera Vencida</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clientes con cuotas mensuales pendientes de pago</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Cartera Vencida</p>
            <p className="text-xl font-bold text-red-500">{loading ? '—' : fmt(totalCartera)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center">
            <AlertCircle size={18} className="text-[#d4a843]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Clientes en mora</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{loading ? '—' : items.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Mora grave</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{loading ? '—' : enMoraGrave}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
            <Clock size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Promedio días mora</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{loading ? '—' : `${promedioDias} días`}</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
          <div className="flex gap-1">
            {(['todos', 'temprana', 'media', 'grave'] as const).map(f => (
              <button key={f} onClick={() => setFiltroEstado(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroEstado === f ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Buscar cliente o lote..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent w-60" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lote</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuotas Vencidas</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto Vencido</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Días en Mora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                  {items.length === 0 ? 'No hay clientes con cuotas vencidas' : 'Sin resultados para el filtro aplicado'}
                </td></tr>
              ) : filtrados.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1a1a1a]">{d.nombre_comprador}</td>
                  <td className="px-4 py-3 text-gray-600">{d.descripcion_lote}</td>
                  <td className="px-4 py-3 text-right font-semibold">{d.cuotas_vencidas}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-500">{fmt(d.monto_vencido)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${d.dias_mora > 90 ? 'text-red-500' : d.dias_mora > 30 ? 'text-orange-500' : 'text-[#d4a843]'}`}>
                      {d.dias_mora}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_STYLES[d.estado_mora]}`}>
                      {ESTADO_LABEL[d.estado_mora]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtrados.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            {filtrados.length} cliente(s) — Monto total: <span className="font-semibold text-red-500">{fmt(filtrados.reduce((s, d) => s + d.monto_vencido, 0))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
