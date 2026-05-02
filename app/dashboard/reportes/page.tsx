'use client';

import { useState } from 'react';
import {
  BarChart2,
  Clock,
  User,
  Building2,
  Download,
  CheckCircle2,
} from 'lucide-react';

type TipoReporte = 'cobranza' | 'cartera' | 'propietarios' | 'bancaria';
type FormatoExport = 'PDF' | 'Excel' | 'CSV';

const TIPOS_REPORTE = [
  { id: 'cobranza' as TipoReporte, label: 'Cobranza General', icon: BarChart2 },
  { id: 'cartera' as TipoReporte, label: 'Cartera Vencida', icon: Clock },
  { id: 'propietarios' as TipoReporte, label: 'Estado de Propietarios', icon: User },
  { id: 'bancaria' as TipoReporte, label: 'Conciliación Bancaria', icon: Building2 },
];

const PERIODOS = [
  'Mensual (Mayo 2026)',
  'Mensual (Abril 2026)',
  'Mensual (Marzo 2026)',
  'Trimestral (Ene–Mar 2026)',
  'Semestral (Jul–Dic 2025)',
  'Anual (2025)',
];

const CHART_DATA = [
  { mes: 'Nov', valor: 42000 },
  { mes: 'Dic', valor: 39000 },
  { mes: 'Ene', valor: 45000 },
  { mes: 'Feb', valor: 41000 },
  { mes: 'Mar', valor: 49000 },
  { mes: 'Abr', valor: 52000 },
];

const PROPIETARIOS_DATA = [
  { nombre: 'Carlos Mendoza López',   lote: 'A-12', pagado: 18000, saldo: 4500,  estado: 'Al día' },
  { nombre: 'María Elena Ruiz',       lote: 'B-07', pagado: 12000, saldo: 9000,  estado: 'Moroso' },
  { nombre: 'Jorge Hernández Vega',   lote: 'C-03', pagado: 22000, saldo: 0,     estado: 'Liquidado' },
  { nombre: 'Ana Patricia Flores',    lote: 'A-21', pagado: 8500,  saldo: 15000, estado: 'Vencido' },
  { nombre: 'Roberto Castillo Mora',  lote: 'D-09', pagado: 16000, saldo: 6000,  estado: 'Al día' },
];

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    'Al día':    'text-green-600',
    'Moroso':    'text-[#d4a843]',
    'Vencido':   'text-red-500',
    'Liquidado': 'text-gray-500',
  };
  return map[estado] ?? 'text-gray-600';
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-MX');
}

export default function ReportesPage() {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoReporte>('cobranza');
  const [periodo, setPeriodo] = useState(PERIODOS[0]);
  const [formato, setFormato] = useState<FormatoExport>('PDF');
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState(false);

  const maxValor = Math.max(...CHART_DATA.map((d) => d.valor));

  function handleGenerar() {
    setGenerando(true);
    setGenerado(false);
    setTimeout(() => {
      setGenerando(false);
      setGenerado(true);
    }, 1200);
  }

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Genera y exporta reportes financieros del sistema
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Panel Izquierdo — Configurar Reporte */}
        <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-4">Configurar Reporte</h2>

          {/* Tipo de Reporte */}
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Tipo de Reporte
            </p>
            <div className="flex flex-col gap-2">
              {TIPOS_REPORTE.map(({ id, label, icon: Icon }) => {
                const active = tipoSeleccionado === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setTipoSeleccionado(id); setGenerado(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      active
                        ? 'bg-[#fdf3d9] border-[#d4a843] text-[#92700a]'
                        : 'border-gray-200 text-gray-700 hover:border-[#d4a843] hover:bg-[#fdf3d9]/40'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-[#d4a843]' : 'text-gray-400'} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Período */}
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Período
            </p>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent"
            >
              {PERIODOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Formato de Exportación */}
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Formato de Exportación
            </p>
            <div className="flex gap-2">
              {(['PDF', 'Excel', 'CSV'] as FormatoExport[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormato(f)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formato === f
                      ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Botón Generar */}
          <button
            onClick={handleGenerar}
            disabled={generando}
            className="w-full flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {generando ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generando...
              </>
            ) : generado ? (
              <>
                <CheckCircle2 size={16} />
                Descargado
              </>
            ) : (
              <>
                <Download size={16} />
                Generar Reporte
              </>
            )}
          </button>
        </div>

        {/* Panel Derecho — Vista Previa */}
        <div className="flex-1 flex flex-col gap-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Total Cobrado</p>
              <p className="text-2xl font-bold text-[#d4a843]">$187.400</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Pendiente</p>
              <p className="text-2xl font-bold text-orange-500">$76.200</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Tasa Cobranza</p>
              <p className="text-2xl font-bold text-blue-600">71.2%</p>
            </div>
          </div>

          {/* Gráfica de Barras */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">
              Vista Previa — Cobranza por Mes
            </h3>
            <div className="flex items-end gap-3 h-44 px-2">
              {CHART_DATA.map(({ mes, valor }) => {
                const heightPct = (valor / maxValor) * 100;
                return (
                  <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-medium">
                      ${Math.round(valor / 1000)}k
                    </span>
                    <div
                      className="w-full rounded-t-md bg-[#d4a843] transition-all"
                      style={{ height: `${heightPct * 0.68}%`, minHeight: '8px' }}
                    />
                    <span className="text-[11px] text-gray-500">{mes}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabla Vista Previa */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#1a1a1a]">
                Vista Previa — Propietarios
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Propietario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lote</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Pagado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PROPIETARIOS_DATA.map((row) => (
                  <tr key={row.lote} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-[#1a1a1a]">{row.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{row.lote}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(row.pagado)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.saldo === 0 ? 'text-gray-400' : 'text-red-500'}`}>
                      {row.saldo === 0 ? '—' : fmt(row.saldo)}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${estadoBadge(row.estado)}`}>{row.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              Mostrando {PROPIETARIOS_DATA.length} registros del período seleccionado
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
