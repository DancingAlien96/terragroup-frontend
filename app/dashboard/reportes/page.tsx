'use client';

import React, { useState, useEffect } from 'react';
import { BarChart2, Clock, Users, UserCheck, Download, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

type TipoReporte = 'cobranza' | 'cartera' | 'clientes' | 'vendedores' | 'comisiones_mes';
type FormatoExport = 'PDF' | 'Excel' | 'CSV';

const TIPOS_REPORTE = [
  { id: 'cobranza'      as TipoReporte, label: 'Cobranza General',           icon: BarChart2 },
  { id: 'cartera'       as TipoReporte, label: 'Clientes con Pago Pendiente', icon: Clock },
  { id: 'clientes'      as TipoReporte, label: 'Reporte de Clientes',        icon: Users },
  { id: 'vendedores'    as TipoReporte, label: 'Vendedores y Comisiones',    icon: UserCheck },
  { id: 'comisiones_mes' as TipoReporte, label: 'Comisiones por Mes',        icon: TrendingUp },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(n);

function fmtDate(s: string) {
  if (!s) return '—';
  return new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
}

function toExcelHTML(headers: string[], rows: (string | number)[][]): string {
  const th = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

export default function ReportesPage() {
  const [tipo, setTipo] = useState<TipoReporte>('cobranza');
  const [formato, setFormato] = useState<FormatoExport>('PDF');
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [comisionesMes, setComisionesMes] = useState<{ mes: string; mes_key: string; vendedor: string; total: number; cantidad: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats.reportes().catch(() => null),
      api.clientes.list().catch(() => []),
      api.pagos.list().catch(() => []),
      api.vendedores.list().catch(() => []),
    ]).then(async ([rep, cli, pag, ven]) => {
      setReportData(rep);
      setClientes(cli ?? []);
      setPagos(pag ?? []);
      setVendedores(ven ?? []);
      // Cargar comisiones de cada vendedor y agrupar por mes
      const allComisiones: any[] = [];
      await Promise.all((ven ?? []).map(async (v: any) => {
        try {
          const data = await api.vendedores.comisiones.list(v.id);
          (data ?? []).forEach((c: any) => allComisiones.push({ ...c, vendedor_nombre: v.nombre }));
        } catch { /* skip */ }
      }));
      // Agrupar por mes y vendedor
      const mapa: Record<string, { mes: string; mes_key: string; vendedor: string; total: number; cantidad: number }> = {};
      for (const c of allComisiones) {
        const raw = c.fecha_venta instanceof Date ? c.fecha_venta : new Date(c.fecha_venta);
        const mes_key = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}`;
        const mes = raw.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' });
        const key = `${mes_key}__${c.vendedor_nombre}`;
        if (!mapa[key]) mapa[key] = { mes, mes_key, vendedor: c.vendedor_nombre, total: 0, cantidad: 0 };
        mapa[key].total += Number(c.monto_comision);
        mapa[key].cantidad += 1;
      }
      setComisionesMes(Object.values(mapa).sort((a, b) => b.mes_key.localeCompare(a.mes_key)));
    }).finally(() => setLoading(false));
  }, []);

  const monthly: any[] = reportData?.monthly ?? [];

  // Cartera: clientes con cuotas mensuales vencidas (misma logica que /dashboard/cartera)
  function calcularMoraReporte(c: any, pagosCount: number, today: Date) {
    const deposito = new Date(c.fecha_deposito);
    const numCuotas = Number(c.num_cuotas);
    const fechasVencidas: Date[] = [];
    for (let i = 1; i <= numCuotas; i++) {
      const due = new Date(deposito);
      due.setMonth(due.getMonth() + i);
      if (due <= today) fechasVencidas.push(due); else break;
    }
    const cuotasVencidas = fechasVencidas.length - pagosCount;
    if (cuotasVencidas <= 0) return null;
    const oldestUnpaid = fechasVencidas[pagosCount];
    const diasMora = Math.floor((today.getTime() - oldestUnpaid.getTime()) / (1000 * 60 * 60 * 24));
    return { ...c, cuotas_vencidas: cuotasVencidas, monto_vencido: cuotasVencidas * Number(c.valor_cuota), dias_mora: diasMora };
  }
  const today = new Date(); today.setHours(23, 59, 59, 0);
  const carteraItems = clientes
    .map((c: any) => calcularMoraReporte(c, pagos.filter((p: any) => p.cliente_id === c.id).length, today))
    .filter(Boolean) as any[];
  const totalCobrado   = monthly.reduce((s: number, d: any) => s + Number(d.cobrado), 0);
  const totalPendiente = monthly.reduce((s: number, d: any) => s + Number(d.pendiente), 0);
  const totalPagos     = totalCobrado + totalPendiente + monthly.reduce((s: number, d: any) => s + Number(d.vencido ?? 0), 0);
  const tasa = totalPagos > 0 ? ((totalCobrado / totalPagos) * 100).toFixed(1) : '0.0';
  const maxBar = Math.max(...monthly.map((d: any) => Number(d.cobrado) + Number(d.pendiente)), 1);

  function getExportData(): { headers: string[]; rows: (string | number)[][]; title: string } {
    if (tipo === 'cobranza') {
      return {
        title: 'Cobranza General',
        headers: ['Mes', 'Cobrado (Q)', 'Pendiente (Q)'],
        rows: monthly.map((d: any) => [d.mes, Number(d.cobrado), Number(d.pendiente)]),
      };
    }
    if (tipo === 'cartera') {
      return {
        title: 'Clientes con Pago Pendiente',
        headers: ['Cliente', 'Lote', 'Cuotas Vencidas', 'Monto Vencido (Q)', 'Dias en Mora'],
        rows: carteraItems.map((c: any) => [c.nombre_comprador, c.descripcion_lote ?? '—', c.cuotas_vencidas, c.monto_vencido, c.dias_mora]),
      };
    }
    if (tipo === 'clientes') {
      return {
        title: 'Reporte de Clientes',
        headers: ['Nombre', 'Lote', 'Precio Neto (Q)', 'Enganche (Q)', 'Cuotas', 'Valor Cuota (Q)', 'Fecha Deposito'],
        rows: clientes.map((c: any) => [c.nombre_comprador, c.descripcion_lote ?? '—', Number(c.precio_neto), Number(c.enganche), Number(c.num_cuotas), Number(c.valor_cuota), fmtDate(c.fecha_deposito)]),
      };
    }
    if (tipo === 'comisiones_mes') {
      return {
        title: 'Comisiones por Mes',
        headers: ['Mes', 'Vendedor', 'Cantidad Ventas', 'Total Comisiones (Q)'],
        rows: comisionesMes.map(r => [r.mes, r.vendedor, r.cantidad, r.total]),
      };
    }
    return {
      title: 'Vendedores y Comisiones',
      headers: ['Nombre', 'Telefono', 'Email', 'N Ventas', 'Total Comisiones (Q)'],
      rows: vendedores.map((v: any) => [v.nombre, v.telefono ?? '—', v.email ?? '—', Number(v.total_ventas ?? 0), Number(v.total_comisiones ?? 0)]),
    };
  }

  function handleGenerar() {
    setGenerando(true);
    setGenerado(false);
    setTimeout(() => {
      const { headers, rows, title } = getExportData();
      if (formato === 'CSV') {
        const csv = '\uFEFF' + toCSV(headers, rows);
        downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${title}.csv`);
      } else if (formato === 'Excel') {
        const html = `<html><head><meta charset="UTF-8"></head><body><h2>${title}</h2>${toExcelHTML(headers, rows)}</body></html>`;
        downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel' }), `${title}.xls`);
      } else {
        const thRow = headers.map(h => `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;text-align:left">${h}</th>`).join('');
        const tableRows = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ccc;padding:6px 10px">${c}</td>`).join('')}</tr>`).join('');
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
            <style>body{font-family:sans-serif;padding:24px;color:#1a1a1a}h2{margin-bottom:4px}p{color:#888;font-size:12px;margin-bottom:16px}table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style>
            </head><body>
            <h2>${title}</h2>
            <p>Generado: ${new Date().toLocaleDateString('es-GT')}</p>
            <table><thead><tr>${thRow}</tr></thead><tbody>${tableRows}</tbody></table>
            <br><button onclick="window.print()" style="margin-top:16px;padding:8px 20px;background:#d4a843;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir / Guardar PDF</button>
            </body></html>`);
          win.document.close();
        }
      }
      setGenerando(false);
      setGenerado(true);
    }, 800);
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
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Formato de Exportacion</p>
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
            {generando
              ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Generando...</>
              : generado
              ? <><CheckCircle2 size={16} />Descargado</>
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
          {tipo === 'cobranza' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-[#1a1a1a] mb-1">Tendencia de Cobranza</h3>
              <p className="text-xs text-gray-400 mb-4">Ultimos 6 meses — datos reales</p>
              {loading ? <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
              : monthly.length === 0 ? <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Sin datos de pagos aun</div>
              : (
                <div className="flex items-end gap-4 h-32">
                  {monthly.map((d: any) => {
                    const cobrado = Number(d.cobrado), pendiente = Number(d.pendiente);
                    const cobradoPx   = Math.round((cobrado   / maxBar) * 120);
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
          )}

          {/* Desglose mensual */}
          {tipo === 'cobranza' && monthly.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a1a]">Desglose Mensual</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="px-5 py-3 text-left font-medium">Mes</th>
                    <th className="px-5 py-3 text-right font-medium">Cobrado</th>
                    <th className="px-5 py-3 text-right font-medium">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{d.mes}</td>
                      <td className="px-5 py-3 text-right text-green-600 font-semibold">{fmt(Number(d.cobrado))}</td>
                      <td className="px-5 py-3 text-right text-orange-500">{fmt(Number(d.pendiente))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cartera Vencida table */}
          {tipo === 'cartera' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a1a]">Clientes con Cuotas Vencidas</h3>
                <p className="text-xs text-gray-400 mt-0.5">{loading ? '…' : `${carteraItems.length} cliente(s) con cuotas vencidas`}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="px-5 py-3 text-left font-medium">Cliente</th>
                      <th className="px-5 py-3 text-left font-medium">Lote</th>
                      <th className="px-5 py-3 text-right font-medium">Cuotas Vencidas</th>
                      <th className="px-5 py-3 text-right font-medium">Monto Vencido</th>
                      <th className="px-5 py-3 text-right font-medium">Días en Mora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
                    ) : carteraItems.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Sin clientes con cuotas vencidas</td></tr>
                    ) : carteraItems.map((c: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-[#1a1a1a]">{c.nombre_comprador}</td>
                        <td className="px-5 py-3 text-gray-500">{c.descripcion_lote ?? '—'}</td>
                        <td className="px-5 py-3 text-right font-semibold">{c.cuotas_vencidas}</td>
                        <td className="px-5 py-3 text-right text-red-500 font-semibold">{fmt(c.monto_vencido)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-bold ${c.dias_mora > 90 ? 'text-red-500' : c.dias_mora > 30 ? 'text-orange-500' : 'text-[#d4a843]'}`}>{c.dias_mora}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clientes table */}
          {tipo === 'clientes' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a1a]">Listado de Clientes</h3>
                <p className="text-xs text-gray-400 mt-0.5">{clientes.length} registro(s)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="px-5 py-3 text-left font-medium">Cliente</th>
                      <th className="px-5 py-3 text-left font-medium">Lote</th>
                      <th className="px-5 py-3 text-right font-medium">Precio Neto</th>
                      <th className="px-5 py-3 text-right font-medium">Enganche</th>
                      <th className="px-5 py-3 text-right font-medium">Cuotas</th>
                      <th className="px-5 py-3 text-right font-medium">Valor Cuota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
                    ) : clientes.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Sin clientes registrados</td></tr>
                    ) : clientes.map((c: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-[#1a1a1a]">{c.nombre_comprador}</td>
                        <td className="px-5 py-3 text-gray-500">{c.descripcion_lote ?? '—'}</td>
                        <td className="px-5 py-3 text-right font-semibold">{fmt(Number(c.precio_neto))}</td>
                        <td className="px-5 py-3 text-right text-green-600">{fmt(Number(c.enganche))}</td>
                        <td className="px-5 py-3 text-right">{c.num_cuotas}</td>
                        <td className="px-5 py-3 text-right">{fmt(Number(c.valor_cuota))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comisiones por Mes */}
          {tipo === 'comisiones_mes' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a1a]">Comisiones por Mes</h3>
                <p className="text-xs text-gray-400 mt-0.5">{loading ? '…' : `${comisionesMes.length} registro(s)`}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="px-5 py-3 text-left font-medium">Mes</th>
                      <th className="px-5 py-3 text-left font-medium">Vendedor</th>
                      <th className="px-5 py-3 text-right font-medium">Ventas</th>
                      <th className="px-5 py-3 text-right font-medium">Total Comisiones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
                    ) : comisionesMes.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Sin comisiones registradas</td></tr>
                    ) : (() => {
                      // Totales por mes para subtotales
                      const meses = [...new Set(comisionesMes.map(r => r.mes_key))];
                      return meses.map(mk => {
                        const filas = comisionesMes.filter(r => r.mes_key === mk);
                        const totalMes = filas.reduce((s, r) => s + r.total, 0);
                        return (
                          <React.Fragment key={mk}>
                            {filas.map((r, i) => (
                              <tr key={`${mk}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="px-5 py-3 text-gray-500">{i === 0 ? r.mes : ''}</td>
                                <td className="px-5 py-3 font-medium text-[#1a1a1a]">{r.vendedor}</td>
                                <td className="px-5 py-3 text-right">{r.cantidad}</td>
                                <td className="px-5 py-3 text-right font-semibold text-[#d4a843]">{fmt(r.total)}</td>
                              </tr>
                            ))}
                            <tr key={`${mk}-sub`} className="bg-amber-50 border-b border-amber-100">
                              <td className="px-5 py-2 text-xs font-semibold text-amber-700" colSpan={3}>Subtotal {filas[0].mes}</td>
                              <td className="px-5 py-2 text-right text-sm font-bold text-amber-700">{fmt(totalMes)}</td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vendedores table */}
          {tipo === 'vendedores' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-[#1a1a1a]">Vendedores y Comisiones</h3>
                <p className="text-xs text-gray-400 mt-0.5">{vendedores.length} vendedor(es)</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="px-5 py-3 text-left font-medium">Nombre</th>
                    <th className="px-5 py-3 text-left font-medium">Telefono</th>
                    <th className="px-5 py-3 text-left font-medium">Email</th>
                    <th className="px-5 py-3 text-right font-medium">N Ventas</th>
                    <th className="px-5 py-3 text-right font-medium">Total Comisiones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Cargando...</td></tr>
                  ) : vendedores.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Sin vendedores registrados</td></tr>
                  ) : vendedores.map((v: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-[#1a1a1a]">{v.nombre}</td>
                      <td className="px-5 py-3 text-gray-500">{v.telefono ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{v.email ?? '—'}</td>
                      <td className="px-5 py-3 text-right">{Number(v.total_ventas ?? 0)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-[#d4a843]">{fmt(Number(v.total_comisiones ?? 0))}</td>
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
