'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Clock, User, Building2, Download, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

type TipoReporte = 'cobranza' | 'cartera' | 'propietarios' | 'bancaria';
type FormatoExport = 'PDF' | 'Excel' | 'CSV';

const TIPOS_REPORTE = [
  { id: 'cobranza'    as TipoReporte, label: 'Cobranza General',       icon: BarChart2 },
  { id: 'cartera'     as TipoReporte, label: 'Cartera Vencida',        icon: Clock },
  { id: 'propietarios' as TipoReporte, label: 'Estado de Propietarios', icon: User },
  { id: 'bancaria'    as TipoReporte, label: 'Conciliación Bancaria',  icon: Building2 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

export default function ReportesPage() {
  const [tipo, setTipo] = useState<TipoReporte>('cobranza');
  const [formato, setFormato] = useState<FormatoExport>('PDF');
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats.reportes()
      .then(setReportData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const monthly: any[] = reportData?.monthly ?? [];
  const propietarios: any[] = reportData?.propietarios ?? [];

  const totalCobrado  = monthly.reduce((s: number, d: any) => s + Number(d.cobrado), 0);
  const totalPendiente = monthly.reduce((s: number, d: any) => s + Number(d.pendiente), 0);
  const totalPagos    = totalCobrado + totalPendiente + monthly.reduce((s: number, d: any) => s + Number(d.vencido), 0);
  const tasa = totalPagos > 0 ? ((totalCobrado / totalPagos) * 100).toFixed(1) : '0.0';
  const maxBar = Math.max(...monthly.map((d: any) => Number(d.cobrado) + Number(d.pendiente)), 1);

  function handleGenerar() {
    setGenerando(true);
    setGenerado(false);
    setTimeout(() => { setGenerando(false); setGenerado(true); }, 1200);
  }

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Genera y exporta reportes financieros del sistema</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar config */}
        <div className="w-full lg:w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-4">Configurar Reporte</h2>

          <div className="mb-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tipo de Reporte</p>
            <div className="flex flex-col gap-2">
              {TIPOS_REPORTE.map(({ id, label, icon: Icon }) => {
                const active = tipo === id;
                return (
                  <button key={id} onClick={() => { setTipo(id); setGenerado(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${active ? 'bg-[#fdf3d9] border-[#d4a843] text-[#92700a]' : 'border-gray-200 text-gray-700 hover:border-[#d4a843]'}`}>
                    <Icon size={16} className={active ? 'text-[#d4a843]' : 'text-gray-400'} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Formato de Exportación</p>
            <div className="flex gap-2">
              {(['PDF', 'Excel', 'CSV'] as FormatoExport[]).map((f) => (
                <button key={f} onClick={() => setFormato(f)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${formato === f ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerar} disabled={generando}
            className="w-full flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            {generando ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Generando...</>
             : generado ? <><CheckCircle2 size={16} />Descargado</>
             : <><Download size={16} />Generar Reporte</>}
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Total Cobrado</p>
              <p className={`text-2xl font-bold text-[#d4a843] ${loading ? 'animate-pulse' : ''}`}>{loading ? '—' : fmt(totalCobrado)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Pendiente</p>
              <p className={`text-2xl font-bold text-orange-500 ${loading ? 'animate-pulse' : ''}`}>{loading ? '—' : fmt(totalPendiente)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
              <p className="text-xs text-gray-500 mb-1">Tasa Cobranza</p>
              <p className={`text-2xl font-bold text-blue-600 ${loading ? 'animate-pulse' : ''}`}>{loading ? '—' : `${tasa}%`}</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-[#1a1a1a] mb-1">Tendencia de Cobranza</h3>
            <p className="text-xs text-gray-400 mb-4">Últimos 6 meses — datos reales</p>
            {loading ? <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
            : monthly.length === 0 ? <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Sin datos de pagos aún</div>
            : (
              <div className="flex items-end gap-4 h-32">
                {monthly.map((d: any) => {
                  const cobrado = Number(d.cobrado), pendiente = Number(d.pendiente);
                  const cobradoPx  = Math.round((cobrado  / maxBar) * 120);
                  const pendientePx = Math.round((pendiente / maxBar) * 120);
                  return (
                    <div key={d.mes_key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col gap-0.5" style={{ height: '120px', justifyContent: 'flex-end' }}>
                        {pendientePx > 0 && <div className="w-full bg-orange-200 rounded-t-sm" style={{ height: `${pendientePx}px` }} />}
                        {cobradoPx  > 0 && <div className="w-full bg-[#d4a843] rounded-t-sm"  style={{ height: `${cobradoPx}px` }} />}
                      </div>
                      <span className="text-xs text-gray-400">{d.mes}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Propietarios table */}
          {(tipo === 'propietarios' || tipo === 'cartera') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a1a]">
                  {tipo === 'cartera' ? 'Propietarios con Saldo Vencido' : 'Estado de Propietarios'}
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="px-5 py-3 text-left font-medium">Propietario</th>
                    <th className="px-5 py-3 text-left font-medium">Lote</th>
                    <th className="px-5 py-3 text-right font-medium">Pagado</th>
                    <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
                  ) : propietarios.filter((p: any) => tipo === 'cartera' ? Number(p.saldo) > 0 : true).length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Sin datos</td></tr>
                  ) : propietarios
                      .filter((p: any) => tipo === 'cartera' ? Number(p.saldo) > 0 : true)
                      .map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-[#1a1a1a]">{p.nombre}</td>
                      <td className="px-5 py-3 text-gray-500">{p.lote}</td>
                      <td className="px-5 py-3 text-right text-green-600 font-semibold">{fmt(Number(p.pagado))}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${Number(p.saldo) > 0 ? 'text-red-500' : 'text-gray-400'}`}>{fmt(Number(p.saldo))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}