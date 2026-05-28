'use client';

import React, { useState, useEffect } from 'react';
import { BarChart2, Clock, Users, UserCheck, Download, CheckCircle2, TrendingUp, FileBarChart, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

/** Hoja "documento" para previsualizar cómo quedará el PDF. */
function DocumentPaper({
  label, title, subtitle, fecha, children,
}: {
  label: string; title: string; subtitle?: string | null;
  fecha?: Date | string; children: React.ReactNode;
}) {
  const f = fecha ? new Date(fecha) : new Date();
  return (
    <>
      <p className="text-xs text-gray-400 -mb-2 px-1">Vista previa del documento que se generará al descargar.</p>
      <div className="sm:bg-gray-100 sm:rounded-xl sm:p-4 flex justify-center">
        <div className="bg-white sm:shadow-md sm:ring-1 sm:ring-gray-200 sm:rounded w-full max-w-2xl p-4 sm:p-5 text-xs sm:text-[10px] leading-snug text-gray-700 flex flex-col gap-4 sm:gap-3">
          <div className="border-b border-gray-200 pb-3 sm:pb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-[8px] uppercase tracking-wider text-[#b8922e] font-bold">{label}</p>
              <p className="text-base sm:text-[13px] font-bold text-[#1a1a1a] leading-tight">{title}</p>
              {subtitle && <p className="text-[11px] sm:text-[9px] text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            <p className="text-[10px] sm:text-[8px] text-gray-400 whitespace-nowrap">
              {f.toLocaleDateString('es-GT', { dateStyle: 'medium' })}
            </p>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

type TipoReporte = 'general' | 'cobranza' | 'cartera' | 'clientes' | 'vendedores' | 'comisiones_mes';
type FormatoExport = 'PDF' | 'Excel' | 'CSV';

const TIPOS_REPORTE = [
  { id: 'general'        as TipoReporte, label: 'Resumen Ejecutivo',           icon: FileBarChart },
  { id: 'cobranza'       as TipoReporte, label: 'Cobranza General',            icon: BarChart2 },
  { id: 'cartera'        as TipoReporte, label: 'Clientes con Pago Pendiente', icon: Clock },
  { id: 'clientes'       as TipoReporte, label: 'Reporte de Clientes',         icon: Users },
  { id: 'vendedores'     as TipoReporte, label: 'Vendedores y Comisiones',     icon: UserCheck },
  { id: 'comisiones_mes' as TipoReporte, label: 'Comisiones por Mes',          icon: TrendingUp },
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
  const empresaNombre = typeof window !== 'undefined' ? (getStoredUser()?.empresa_nombre ?? '—') : '—';
  const [tipo, setTipo] = useState<TipoReporte>('cobranza');
  const [formato, setFormato] = useState<FormatoExport>('PDF');
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [comisionesMes, setComisionesMes] = useState<{ mes: string; mes_key: string; vendedor: string; total: number; cantidad: number }[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats.reportes().catch(() => null),
      api.clientes.list().catch(() => []),
      api.pagos.list().catch(() => []),
      api.vendedores.list().catch(() => []),
      api.stats.resumenEjecutivo().catch(() => null),
    ]).then(async ([rep, cli, pag, ven, res]) => {
      setReportData(rep);
      setClientes(cli ?? []);
      setPagos(pag ?? []);
      setVendedores(ven ?? []);
      setResumen(res);
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

  // Cartera: clientes con cuotas mensuales vencidas (misma logica que /dashboard/cartera).
  // Solo cuenta los pagos con estado='pagado' — los pendientes/vencidos NO restan.
  function calcularMoraReporte(c: any, pagadosCount: number, today: Date) {
    const deposito = new Date(c.fecha_deposito);
    const numCuotas = Number(c.num_cuotas);
    const fechasVencidas: Date[] = [];
    for (let i = 1; i <= numCuotas; i++) {
      const due = new Date(deposito);
      due.setMonth(due.getMonth() + i);
      if (due <= today) fechasVencidas.push(due); else break;
    }
    const cuotasVencidas = fechasVencidas.length - pagadosCount;
    if (cuotasVencidas <= 0) return null;
    const oldestUnpaid = fechasVencidas[pagadosCount];
    const diasMora = Math.floor((today.getTime() - oldestUnpaid.getTime()) / (1000 * 60 * 60 * 24));
    return { ...c, cuotas_vencidas: cuotasVencidas, monto_vencido: cuotasVencidas * Number(c.valor_cuota), dias_mora: diasMora };
  }
  const today = new Date(); today.setHours(23, 59, 59, 0);
  const carteraItems = clientes
    .map((c: any) => calcularMoraReporte(
      c,
      pagos.filter((p: any) => p.cliente_id === c.id && p.estado === 'pagado').length,
      today,
    ))
    .filter(Boolean) as any[];
  const totalCobrado   = monthly.reduce((s: number, d: any) => s + Number(d.cobrado), 0);
  const totalPendiente = monthly.reduce((s: number, d: any) => s + Number(d.pendiente), 0);
  const totalPagos     = totalCobrado + totalPendiente + monthly.reduce((s: number, d: any) => s + Number(d.vencido ?? 0), 0);
  const tasa = totalPagos > 0 ? ((totalCobrado / totalPagos) * 100).toFixed(1) : '0.0';
  const maxBar = Math.max(...monthly.map((d: any) => Number(d.cobrado) + Number(d.pendiente)), 1);

  function getExportData(): { headers: string[]; rows: (string | number)[][]; title: string } {
    if (tipo === 'general') {
      const r = resumen;
      const rows: (string | number)[][] = [];
      if (r) {
        rows.push(['EMPRESA', r.empresa?.nombre ?? '—', '', '', '']);
        rows.push(['Plan', r.empresa?.plan ?? '—', '', '', '']);
        rows.push(['', '', '', '', '']);
        rows.push(['── KPIs FINANCIEROS ──', '', '', '', '']);
        rows.push(['Total Cobrado',   fmt(r.kpi.total_cobrado),   '', '', '']);
        rows.push(['Total Pendiente', fmt(r.kpi.total_pendiente), '', '', '']);
        rows.push(['Total Vencido',   fmt(r.kpi.total_vencido),   '', '', '']);
        rows.push(['Tasa de Cobranza', `${r.kpi.tasa_cobranza}%`, '', '', '']);
        rows.push(['', '', '', '', '']);
        rows.push(['── CARTERA ──', '', '', '', '']);
        rows.push(['Clientes totales',    r.cartera.clientes_totales, '', '', '']);
        rows.push(['Clientes en mora',    r.cartera.clientes_en_mora, '', '', '']);
        rows.push(['Mora grave (>90d)',   r.cartera.mora_grave,       '', '', '']);
        rows.push(['Mora media (31-90d)', r.cartera.mora_media,       '', '', '']);
        rows.push(['Mora temprana (<30d)', r.cartera.mora_temprana,   '', '', '']);
        rows.push(['', '', '', '', '']);
        rows.push(['── LOTES ──', '', '', '', '']);
        rows.push(['Total',      r.lotes.total,      '', '', '']);
        rows.push(['Disponible', r.lotes.disponible, '', '', '']);
        rows.push(['Vendido',    r.lotes.vendido,    '', '', '']);
        rows.push(['Reservado',  r.lotes.reservado,  '', '', '']);
        rows.push(['', '', '', '', '']);
        rows.push(['── TOP 5 DEUDORES ──', 'Lote', 'Cuotas', 'Monto vencido', 'Días mora']);
        for (const d of (r.top_deudores ?? [])) {
          rows.push([d.nombre, d.lote, d.cuotas_vencidas, fmt(d.monto_vencido), d.dias_mora]);
        }
        rows.push(['', '', '', '', '']);
        rows.push(['── TOP 5 VENDEDORES ──', 'Ventas', 'Comisiones', '', '']);
        for (const v of (r.top_vendedores ?? [])) {
          rows.push([v.nombre, v.ventas, fmt(v.total_comisiones), '', '']);
        }
      }
      return {
        title: 'Resumen Ejecutivo',
        headers: ['Concepto', 'Valor', 'Detalle', 'Extra', 'Extra 2'],
        rows,
      };
    }
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

  function buildResumenHTML(r: any): string {
    const trDeudores = (r.top_deudores ?? []).length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:8px">Sin deudores</td></tr>`
      : r.top_deudores.map((d: any) => {
          const colorDias = d.dias_mora > 90 ? '#dc2626' : d.dias_mora > 30 ? '#b8922e' : '#d4a843';
          return `<tr>
            <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6">${d.nombre}</td>
            <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;color:#6b7280">${d.lote}</td>
            <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${d.cuotas_vencidas}</td>
            <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:#dc2626">${fmt(d.monto_vencido)}</td>
            <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:${colorDias}">${d.dias_mora}</td>
          </tr>`;
        }).join('');

    const trVendedores = (r.top_vendedores ?? []).length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:8px">Sin comisiones</td></tr>`
      : r.top_vendedores.map((v: any) => `<tr>
          <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6">${v.nombre}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${v.ventas}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:#d4a843">${fmt(v.total_comisiones)}</td>
        </tr>`).join('');

    const tendenciaHTML = !r.tendencia || r.tendencia.length === 0 ? '' : (() => {
      const max = Math.max(...r.tendencia.map((t: any) => Number(t.cobrado)), 1);
      const bars = r.tendencia.map((t: any) => {
        const px = Math.round((Number(t.cobrado) / max) * 60);
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="font-size:8px;font-weight:600;color:#6b7280">${fmt(Number(t.cobrado))}</div>
          <div style="width:100%;background:#d4a843;border-radius:2px 2px 0 0;height:${px}px"></div>
          <span style="font-size:8px;color:#9ca3af">${t.mes}</span>
        </div>`;
      }).join('');
      return `<div style="margin-top:14px">
        <h4 style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a1a;margin:0 0 6px">Tendencia de Cobranza \u00B7 \u00FAltimos ${r.tendencia.length} mes(es)</h4>
        <div style="display:flex;align-items:flex-end;gap:6px;height:80px">${bars}</div>
      </div>`;
    })();

    return `
      <div style="max-width:760px;margin:0 auto;background:white;padding:28px;color:#374151;font-size:11px;line-height:1.45;font-family:-apple-system,Segoe UI,Roboto,sans-serif">

        <!-- Header -->
        <div style="border-bottom:1px solid #e5e7eb;padding-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div>
            <p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#b8922e;font-weight:700;margin:0">Resumen Ejecutivo</p>
            <p style="font-size:18px;font-weight:700;color:#1a1a1a;margin:2px 0 0">${r.empresa?.nombre ?? '\u2014'}</p>
            <p style="font-size:10px;color:#9ca3af;margin:2px 0 0;text-transform:capitalize">
              Plan ${r.empresa?.plan ?? '\u2014'}${r.empresa?.fecha_vence ? ' \u00B7 vence ' + fmtDate(r.empresa.fecha_vence) : ''}
            </p>
          </div>
          <p style="font-size:9px;color:#9ca3af;margin:0;white-space:nowrap">
            ${new Date(r.generado_en).toLocaleDateString('es-GT', { dateStyle: 'medium' })}
          </p>
        </div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
          <div style="border:1px solid #e5e7eb;border-radius:4px;padding:6px 8px">
            <p style="font-size:9px;text-transform:uppercase;color:#6b7280;margin:0">Cobrado</p>
            <p style="font-size:13px;font-weight:700;color:#b8922e;margin:2px 0 0">${fmt(r.kpi.total_cobrado)}</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:4px;padding:6px 8px">
            <p style="font-size:9px;text-transform:uppercase;color:#6b7280;margin:0">Pendiente</p>
            <p style="font-size:13px;font-weight:700;color:#374151;margin:2px 0 0">${fmt(r.kpi.total_pendiente)}</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:4px;padding:6px 8px">
            <p style="font-size:9px;text-transform:uppercase;color:#6b7280;margin:0">Vencido</p>
            <p style="font-size:13px;font-weight:700;color:#dc2626;margin:2px 0 0">${fmt(r.kpi.total_vencido)}</p>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:4px;padding:6px 8px">
            <p style="font-size:9px;text-transform:uppercase;color:#6b7280;margin:0">Tasa</p>
            <p style="font-size:13px;font-weight:700;color:#b8922e;margin:2px 0 0">${r.kpi.tasa_cobranza}%</p>
          </div>
        </div>

        <!-- Cartera -->
        <div style="margin-bottom:14px">
          <h4 style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a1a;margin:0 0 6px">Cartera</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
            <div style="background:#f9fafb;border-radius:4px;padding:6px 8px">
              <p style="font-size:9px;color:#6b7280;margin:0">Clientes</p>
              <p style="font-size:13px;font-weight:700;color:#1a1a1a;margin:2px 0 0">${r.cartera.clientes_totales}</p>
            </div>
            <div style="background:#f9fafb;border-radius:4px;padding:6px 8px">
              <p style="font-size:9px;color:#6b7280;margin:0">En mora</p>
              <p style="font-size:13px;font-weight:700;color:#dc2626;margin:2px 0 0">${r.cartera.clientes_en_mora}</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;text-align:center">
            <div style="background:#f9fafb;border-radius:4px;padding:4px"><p style="font-size:12px;font-weight:700;color:#dc2626;margin:0">${r.cartera.mora_grave}</p><p style="font-size:8px;color:#6b7280;text-transform:uppercase;margin:0">Grave</p></div>
            <div style="background:#f9fafb;border-radius:4px;padding:4px"><p style="font-size:12px;font-weight:700;color:#b8922e;margin:0">${r.cartera.mora_media}</p><p style="font-size:8px;color:#6b7280;text-transform:uppercase;margin:0">Media</p></div>
            <div style="background:#f9fafb;border-radius:4px;padding:4px"><p style="font-size:12px;font-weight:700;color:#d4a843;margin:0">${r.cartera.mora_temprana}</p><p style="font-size:8px;color:#6b7280;text-transform:uppercase;margin:0">Temprana</p></div>
          </div>
          <p style="font-size:9px;color:#6b7280;text-align:center;margin:6px 0 0">Total vencido: <strong style="color:#dc2626">${fmt(r.cartera.total_vencido)}</strong></p>
        </div>

        <!-- Top deudores -->
        <h4 style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a1a;margin:0 0 6px">Top 5 Deudores</h4>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;font-size:9px;color:#6b7280;text-transform:uppercase">
              <th style="text-align:left;padding:4px 6px;font-weight:500">Cliente</th>
              <th style="text-align:left;padding:4px 6px;font-weight:500">Lote</th>
              <th style="text-align:right;padding:4px 6px;font-weight:500">Cuotas</th>
              <th style="text-align:right;padding:4px 6px;font-weight:500">Vencido</th>
              <th style="text-align:right;padding:4px 6px;font-weight:500">D\u00EDas</th>
            </tr>
          </thead>
          <tbody>${trDeudores}</tbody>
        </table>

        <!-- Top vendedores -->
        <h4 style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#1a1a1a;margin:0 0 6px">Top 5 Vendedores</h4>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;font-size:9px;color:#6b7280;text-transform:uppercase">
              <th style="text-align:left;padding:4px 6px;font-weight:500">Vendedor</th>
              <th style="text-align:right;padding:4px 6px;font-weight:500">Ventas</th>
              <th style="text-align:right;padding:4px 6px;font-weight:500">Comisiones</th>
            </tr>
          </thead>
          <tbody>${trVendedores}</tbody>
        </table>

        ${tendenciaHTML}

        <p style="font-size:8px;color:#9ca3af;text-align:center;margin-top:18px;padding-top:8px;border-top:1px solid #f3f4f6">
          Generado el ${new Date(r.generado_en).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </div>
    `;
  }

  // HTML para PDFs estilo documento (cobranza, cartera, clientes, vendedores, comisiones_mes)
  function buildSimpleReportHTML(label: string, headers: string[], rows: (string | number)[][]): string {
    const trHead = headers.map((h, i) => {
      const align = i === 0 ? 'left' : (typeof rows[0]?.[i] === 'number' ? 'right' : 'left');
      return `<th style="text-align:${align};padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:9px;font-weight:500;color:#6b7280;text-transform:uppercase">${h}</th>`;
    }).join('');
    const trBody = rows.length === 0
      ? `<tr><td colspan="${headers.length}" style="text-align:center;color:#9ca3af;padding:12px;font-size:10px">Sin datos</td></tr>`
      : rows.map((r) => `<tr>${r.map((c, i) => {
          const align = i === 0 ? 'left' : (typeof c === 'number' ? 'right' : 'left');
          const v = typeof c === 'number' ? fmt(c) : c;
          return `<td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:${align};color:#374151;font-size:10px">${v}</td>`;
        }).join('')}</tr>`).join('');
    const fechaStr = new Date().toLocaleDateString('es-GT', { dateStyle: 'medium' });
    return `
      <div style="max-width:760px;margin:0 auto;background:white;padding:28px;color:#374151;font-size:11px;line-height:1.45;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
        <div style="border-bottom:1px solid #e5e7eb;padding-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div>
            <p style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#b8922e;font-weight:700;margin:0">${label}</p>
            <p style="font-size:18px;font-weight:700;color:#1a1a1a;margin:2px 0 0">${empresaNombre}</p>
            <p style="font-size:10px;color:#9ca3af;margin:2px 0 0">${rows.length} registro${rows.length === 1 ? '' : 's'}</p>
          </div>
          <p style="font-size:9px;color:#9ca3af;margin:0;white-space:nowrap">${fechaStr}</p>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>${trHead}</tr></thead>
          <tbody>${trBody}</tbody>
        </table>
        <p style="font-size:8px;color:#9ca3af;text-align:center;margin-top:18px;padding-top:8px;border-top:1px solid #f3f4f6">
          Generado el ${new Date().toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </div>
    `;
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
        // PDF: cada tipo usa su layout estilo documento (matchea la miniatura)
        const win = window.open('', '_blank');
        if (win) {
          let bodyHTML: string;
          if (tipo === 'general' && resumen) {
            bodyHTML = buildResumenHTML(resumen);
          } else {
            bodyHTML = buildSimpleReportHTML(title, headers, rows);
          }
          win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
            <style>
              /* Forzar colores exactos al imprimir/guardar PDF — sin esto Chrome/Edge omiten fondos y atenúan */
              *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
              body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;background:#f3f4f6;margin:0}
              @page{margin:14mm}
              @media print{
                body{background:white;padding:0}
                button{display:none}
              }
            </style>
            </head><body>
            ${bodyHTML}
            <div style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:10px 24px;background:#d4a843;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">Imprimir / Guardar PDF</button></div>
            </body></html>`);
          win.document.close();
        }
      }
      setGenerando(false);
      setGenerado(true);
    }, 800);
  }

  return (
    <div className="p-4 sm:p-6 bg-[#f9fafb] min-h-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">Reportes</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Genera y exporta reportes financieros del sistema</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
        {/* Sidebar config */}
        <div className="w-full lg:w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-3 sm:mb-4">Configurar Reporte</h2>

          <div className="mb-4 sm:mb-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tipo de Reporte</p>
            {/* En lg+ se muestra como lista vertical. En mobile, lista compacta scrollable horizontalmente. */}
            <div className="hidden lg:flex flex-col gap-2">
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
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {TIPOS_REPORTE.map(({ id, label, icon: Icon }) => {
                const active = tipo === id;
                return (
                  <button key={id} onClick={() => { setTipo(id); setGenerado(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${active ? 'bg-[#fdf3d9] border-[#d4a843] text-[#92700a]' : 'border-gray-200 text-gray-700'}`}>
                    <Icon size={14} className={active ? 'text-[#d4a843]' : 'text-gray-400'} />
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
          {/* KPI Cards — ya no se muestran arriba; cada tipo los integra en su preview */}
          {false && tipo !== 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          )}

          {/* ─── Resumen Ejecutivo (General) — vista previa del documento ─── */}
          {tipo === 'general' && (
            loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 shadow-sm text-center text-gray-400">Cargando vista previa...</div>
            ) : !resumen ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 shadow-sm text-center text-gray-400">Sin datos disponibles</div>
            ) : (
              <>
                <p className="text-xs text-gray-400 -mb-2 px-1 hidden sm:block">Vista previa del documento que se generará al descargar.</p>
                <p className="text-xs text-gray-400 px-1 sm:hidden">Resumen del documento que se generará al descargar.</p>
                <div className="sm:bg-gray-100 sm:rounded-xl sm:p-4 flex justify-center">
                  {/* "Hoja" del documento — solo emula A4 en desktop */}
                  <div className="bg-white sm:shadow-md sm:ring-1 sm:ring-gray-200 sm:rounded w-full max-w-2xl p-4 sm:p-5 text-xs sm:text-[10px] leading-snug text-gray-700 flex flex-col gap-4 sm:gap-3">
                    {/* Encabezado del documento */}
                    <div className="border-b border-gray-200 pb-3 sm:pb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] sm:text-[8px] uppercase tracking-wider text-[#b8922e] font-bold">Resumen Ejecutivo</p>
                        <p className="text-base sm:text-[13px] font-bold text-[#1a1a1a] leading-tight">{resumen.empresa.nombre}</p>
                        <p className="text-[11px] sm:text-[9px] text-gray-400 mt-0.5 capitalize">
                          Plan {resumen.empresa.plan}
                          {resumen.empresa.fecha_vence && ` · vence ${fmtDate(resumen.empresa.fecha_vence)}`}
                        </p>
                      </div>
                      <p className="text-[10px] sm:text-[8px] text-gray-400 whitespace-nowrap">
                        {new Date(resumen.generado_en).toLocaleDateString('es-GT', { dateStyle: 'medium' })}
                      </p>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="border border-gray-200 rounded p-2 sm:p-1.5">
                        <p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Cobrado</p>
                        <p className="text-sm sm:text-[11px] font-bold text-[#b8922e] truncate">{fmt(resumen.kpi.total_cobrado)}</p>
                      </div>
                      <div className="border border-gray-200 rounded p-2 sm:p-1.5">
                        <p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Pendiente</p>
                        <p className="text-sm sm:text-[11px] font-bold text-gray-700 truncate">{fmt(resumen.kpi.total_pendiente)}</p>
                      </div>
                      <div className="border border-gray-200 rounded p-2 sm:p-1.5">
                        <p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Vencido</p>
                        <p className="text-sm sm:text-[11px] font-bold text-red-600 truncate">{fmt(resumen.kpi.total_vencido)}</p>
                      </div>
                      <div className="border border-gray-200 rounded p-2 sm:p-1.5">
                        <p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Tasa</p>
                        <p className="text-sm sm:text-[11px] font-bold text-[#b8922e]">{resumen.kpi.tasa_cobranza}%</p>
                      </div>
                    </div>

                    {/* Cartera y Lotes */}
                    {/* Cartera (sin inventario de lotes — no aplica al modelo informal) */}
                    <div>
                      <div className="flex items-center gap-1 mb-2 sm:mb-1">
                        <AlertTriangle size={12} className="text-[#b8922e] sm:hidden" />
                        <AlertTriangle size={10} className="text-[#b8922e] hidden sm:inline" />
                        <h4 className="font-semibold text-[11px] sm:text-[9px] uppercase text-[#1a1a1a]">Cartera</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-1.5 mb-2 sm:mb-1.5">
                        <div className="bg-gray-50 rounded px-2 py-1.5 sm:px-1.5 sm:py-1">
                          <p className="text-[10px] sm:text-[8px] text-gray-500">Clientes</p>
                          <p className="text-sm sm:text-[12px] font-bold text-[#1a1a1a]">{resumen.cartera.clientes_totales}</p>
                        </div>
                        <div className="bg-gray-50 rounded px-2 py-1.5 sm:px-1.5 sm:py-1">
                          <p className="text-[10px] sm:text-[8px] text-gray-500">En mora</p>
                          <p className="text-sm sm:text-[12px] font-bold text-red-600">{resumen.cartera.clientes_en_mora}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="bg-gray-50 rounded p-1 sm:p-0.5"><p className="text-xs sm:text-[10px] font-bold text-red-600">{resumen.cartera.mora_grave}</p><p className="text-[9px] sm:text-[7px] uppercase text-gray-500">Grave</p></div>
                        <div className="bg-gray-50 rounded p-1 sm:p-0.5"><p className="text-xs sm:text-[10px] font-bold text-[#b8922e]">{resumen.cartera.mora_media}</p><p className="text-[9px] sm:text-[7px] uppercase text-gray-500">Media</p></div>
                        <div className="bg-gray-50 rounded p-1 sm:p-0.5"><p className="text-xs sm:text-[10px] font-bold text-[#d4a843]">{resumen.cartera.mora_temprana}</p><p className="text-[9px] sm:text-[7px] uppercase text-gray-500">Temp.</p></div>
                      </div>
                      <p className="text-[10px] sm:text-[8px] text-gray-500 mt-1 text-center">Total vencido: <span className="font-bold text-red-600">{fmt(resumen.cartera.total_vencido)}</span></p>
                    </div>

                    {/* Top 5 deudores */}
                    <div>
                      <h4 className="font-semibold text-[11px] sm:text-[9px] uppercase text-[#1a1a1a] mb-2 sm:mb-1">Top 5 Deudores</h4>
                      <div className="overflow-x-auto -mx-1 sm:mx-0">
                        <table className="w-full min-w-[440px] sm:min-w-0">
                          <thead>
                            <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                              <th className="text-left py-1 px-1 font-medium">Cliente</th>
                              <th className="text-left py-1 px-1 font-medium">Lote</th>
                              <th className="text-right py-1 px-1 font-medium">Cuotas</th>
                              <th className="text-right py-1 px-1 font-medium">Vencido</th>
                              <th className="text-right py-1 px-1 font-medium">Días</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.top_deudores.length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-2 text-gray-400 text-[11px] sm:text-[9px]">Sin deudores</td></tr>
                            ) : resumen.top_deudores.map((d: any, i: number) => (
                              <tr key={i} className="border-b border-gray-100 last:border-0 text-[11px] sm:text-[9px]">
                                <td className="py-1 px-1 truncate max-w-[120px] sm:max-w-[100px]">{d.nombre}</td>
                                <td className="py-1 px-1 text-gray-500 truncate max-w-[90px] sm:max-w-[80px]">{d.lote}</td>
                                <td className="py-1 px-1 text-right">{d.cuotas_vencidas}</td>
                                <td className="py-1 px-1 text-right font-bold text-red-600 whitespace-nowrap">{fmt(d.monto_vencido)}</td>
                                <td className={`py-1 px-1 text-right font-bold ${d.dias_mora > 90 ? 'text-red-600' : d.dias_mora > 30 ? 'text-[#b8922e]' : 'text-[#d4a843]'}`}>{d.dias_mora}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top vendedores */}
                    <div>
                      <h4 className="font-semibold text-[11px] sm:text-[9px] uppercase text-[#1a1a1a] mb-2 sm:mb-1">Top 5 Vendedores</h4>
                      <div className="overflow-x-auto -mx-1 sm:mx-0">
                        <table className="w-full min-w-[320px] sm:min-w-0">
                          <thead>
                            <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                              <th className="text-left py-1 px-1 font-medium">Vendedor</th>
                              <th className="text-right py-1 px-1 font-medium">Ventas</th>
                              <th className="text-right py-1 px-1 font-medium">Comisiones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.top_vendedores.length === 0 ? (
                              <tr><td colSpan={3} className="text-center py-2 text-gray-400 text-[11px] sm:text-[9px]">Sin comisiones</td></tr>
                            ) : resumen.top_vendedores.map((v: any, i: number) => (
                              <tr key={i} className="border-b border-gray-100 last:border-0 text-[11px] sm:text-[9px]">
                                <td className="py-1 px-1 truncate max-w-[160px] sm:max-w-[140px]">{v.nombre}</td>
                                <td className="py-1 px-1 text-right">{v.ventas}</td>
                                <td className="py-1 px-1 text-right font-bold text-[#d4a843] whitespace-nowrap">{fmt(v.total_comisiones)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tendencia mini */}
                    {resumen.tendencia && resumen.tendencia.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[11px] sm:text-[9px] uppercase text-[#1a1a1a] mb-2 sm:mb-1">Tendencia de Cobranza · últimos {resumen.tendencia.length} mes(es)</h4>
                        <div className="flex items-end gap-1 h-20 sm:h-14">
                          {(() => {
                            const max = Math.max(...resumen.tendencia.map((t: any) => Number(t.cobrado)), 1);
                            return resumen.tendencia.map((t: any) => {
                              const px = Math.round((Number(t.cobrado) / max) * 60);
                              return (
                                <div key={t.mes_key} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                                  <div className="text-[9px] sm:text-[7px] font-semibold text-gray-500 truncate w-full text-center">{fmt(Number(t.cobrado))}</div>
                                  <div className="w-full bg-[#d4a843] rounded-t-sm" style={{ height: `${px}px` }} />
                                  <span className="text-[9px] sm:text-[7px] text-gray-400">{t.mes}</span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] sm:text-[7px] text-gray-400 text-center pt-2 border-t border-gray-100">
                      Generado el {new Date(resumen.generado_en).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              </>
            )
          )}

          {/* ─── Cobranza ──────────────────────────────────────── */}
          {tipo === 'cobranza' && (
            <DocumentPaper label="Cobranza General" title={empresaNombre} subtitle="Tendencia de pagos de los últimos 6 meses">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-gray-200 rounded p-2 sm:p-1.5"><p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Cobrado</p><p className="text-sm sm:text-[11px] font-bold text-[#b8922e] truncate">{loading ? '—' : fmt(totalCobrado)}</p></div>
                <div className="border border-gray-200 rounded p-2 sm:p-1.5"><p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Pendiente</p><p className="text-sm sm:text-[11px] font-bold text-gray-700 truncate">{loading ? '—' : fmt(totalPendiente)}</p></div>
                <div className="border border-gray-200 rounded p-2 sm:p-1.5"><p className="text-[10px] sm:text-[8px] text-gray-500 uppercase">Tasa</p><p className="text-sm sm:text-[11px] font-bold text-[#b8922e]">{loading ? '—' : `${tasa}%`}</p></div>
              </div>

              {/* Mini chart */}
              <div>
                <h4 className="font-semibold text-[11px] sm:text-[9px] uppercase text-[#1a1a1a] mb-2 sm:mb-1">Tendencia mensual</h4>
                {loading ? <div className="h-20 flex items-center justify-center text-gray-400 text-xs">Cargando...</div>
                : monthly.length === 0 ? <div className="h-20 flex items-center justify-center text-gray-400 text-xs">Sin datos</div>
                : (
                  <div className="flex items-end gap-1 h-20 sm:h-14">
                    {monthly.map((d: any) => {
                      const cobrado = Number(d.cobrado), pendiente = Number(d.pendiente);
                      const cobradoPx   = Math.round((cobrado   / maxBar) * 60);
                      const pendientePx = Math.round((pendiente / maxBar) * 60);
                      return (
                        <div key={d.mes_key} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                          <div className="text-[9px] sm:text-[7px] font-semibold text-gray-500 truncate w-full text-center">{fmt(cobrado)}</div>
                          <div className="w-full flex flex-col gap-0.5" style={{ height: '60px', justifyContent: 'flex-end' }}>
                            {pendientePx > 0 && <div className="w-full bg-gray-200 rounded-t-sm" style={{ height: `${pendientePx}px` }} />}
                            {cobradoPx > 0   && <div className="w-full bg-[#d4a843] rounded-t-sm" style={{ height: `${cobradoPx}px` }} />}
                          </div>
                          <span className="text-[9px] sm:text-[7px] text-gray-400">{d.mes}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desglose */}
              {monthly.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[11px] sm:text-[9px] uppercase text-[#1a1a1a] mb-2 sm:mb-1">Desglose mensual</h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                        <th className="text-left py-1 px-1 font-medium">Mes</th>
                        <th className="text-right py-1 px-1 font-medium">Cobrado</th>
                        <th className="text-right py-1 px-1 font-medium">Pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((d: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0 text-[11px] sm:text-[9px]">
                          <td className="py-1 px-1">{d.mes}</td>
                          <td className="py-1 px-1 text-right font-bold text-[#b8922e]">{fmt(Number(d.cobrado))}</td>
                          <td className="py-1 px-1 text-right text-gray-700">{fmt(Number(d.pendiente))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DocumentPaper>
          )}

          {/* ─── Cartera ───────────────────────────────────────── */}
          {tipo === 'cartera' && (
            <DocumentPaper
              label="Cartera Vencida"
              title={empresaNombre}
              subtitle={loading ? 'Cargando…' : `${carteraItems.length} cliente(s) con cuotas vencidas`}
            >
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[460px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                      <th className="text-left py-1 px-1 font-medium">Cliente</th>
                      <th className="text-left py-1 px-1 font-medium">Lote</th>
                      <th className="text-right py-1 px-1 font-medium">Cuotas</th>
                      <th className="text-right py-1 px-1 font-medium">Vencido</th>
                      <th className="text-right py-1 px-1 font-medium">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Cargando...</td></tr>
                    ) : carteraItems.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Sin clientes con cuotas vencidas</td></tr>
                    ) : carteraItems.map((c: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 text-[11px] sm:text-[9px]">
                        <td className="py-1 px-1 truncate max-w-[140px]">{c.nombre_comprador}</td>
                        <td className="py-1 px-1 text-gray-500 truncate max-w-[110px]">{c.descripcion_lote ?? '—'}</td>
                        <td className="py-1 px-1 text-right">{c.cuotas_vencidas}</td>
                        <td className="py-1 px-1 text-right font-bold text-red-600 whitespace-nowrap">{fmt(c.monto_vencido)}</td>
                        <td className={`py-1 px-1 text-right font-bold ${c.dias_mora > 90 ? 'text-red-600' : c.dias_mora > 30 ? 'text-[#b8922e]' : 'text-[#d4a843]'}`}>{c.dias_mora}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocumentPaper>
          )}

          {/* ─── Reporte de Clientes ───────────────────────────── */}
          {tipo === 'clientes' && (
            <DocumentPaper
              label="Reporte de Clientes"
              title={empresaNombre}
              subtitle={loading ? 'Cargando…' : `${clientes.length} cliente(s) registrado(s)`}
            >
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[500px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                      <th className="text-left py-1 px-1 font-medium">Cliente</th>
                      <th className="text-left py-1 px-1 font-medium">Lote</th>
                      <th className="text-right py-1 px-1 font-medium">Precio</th>
                      <th className="text-right py-1 px-1 font-medium">Enganche</th>
                      <th className="text-right py-1 px-1 font-medium">Cuotas</th>
                      <th className="text-right py-1 px-1 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Cargando...</td></tr>
                    ) : clientes.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Sin clientes registrados</td></tr>
                    ) : clientes.map((c: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 text-[11px] sm:text-[9px]">
                        <td className="py-1 px-1 truncate max-w-[120px]">{c.nombre_comprador}</td>
                        <td className="py-1 px-1 text-gray-500 truncate max-w-[100px]">{c.descripcion_lote ?? '—'}</td>
                        <td className="py-1 px-1 text-right font-bold text-[#1a1a1a] whitespace-nowrap">{fmt(Number(c.precio_neto))}</td>
                        <td className="py-1 px-1 text-right text-[#b8922e] whitespace-nowrap">{fmt(Number(c.enganche))}</td>
                        <td className="py-1 px-1 text-right">{c.num_cuotas}</td>
                        <td className="py-1 px-1 text-right whitespace-nowrap">{fmt(Number(c.valor_cuota))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocumentPaper>
          )}

          {/* ─── Comisiones por Mes ────────────────────────────── */}
          {tipo === 'comisiones_mes' && (
            <DocumentPaper
              label="Comisiones por Mes"
              title={empresaNombre}
              subtitle={loading ? 'Cargando…' : `${comisionesMes.length} registro(s)`}
            >
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[420px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                      <th className="text-left py-1 px-1 font-medium">Mes</th>
                      <th className="text-left py-1 px-1 font-medium">Vendedor</th>
                      <th className="text-right py-1 px-1 font-medium">Ventas</th>
                      <th className="text-right py-1 px-1 font-medium">Comisiones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Cargando...</td></tr>
                    ) : comisionesMes.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Sin comisiones registradas</td></tr>
                    ) : (() => {
                      const meses = [...new Set(comisionesMes.map(r => r.mes_key))];
                      return meses.map(mk => {
                        const filas = comisionesMes.filter(r => r.mes_key === mk);
                        const totalMes = filas.reduce((s, r) => s + r.total, 0);
                        return (
                          <React.Fragment key={mk}>
                            {filas.map((r, i) => (
                              <tr key={`${mk}-${i}`} className="border-b border-gray-100 text-[11px] sm:text-[9px]">
                                <td className="py-1 px-1 text-gray-500">{i === 0 ? r.mes : ''}</td>
                                <td className="py-1 px-1 truncate max-w-[160px]">{r.vendedor}</td>
                                <td className="py-1 px-1 text-right">{r.cantidad}</td>
                                <td className="py-1 px-1 text-right font-bold text-[#d4a843] whitespace-nowrap">{fmt(r.total)}</td>
                              </tr>
                            ))}
                            <tr key={`${mk}-sub`} className="bg-amber-50 border-b border-amber-100 text-[11px] sm:text-[9px]">
                              <td className="py-1 px-1 font-semibold text-amber-700" colSpan={3}>Subtotal {filas[0].mes}</td>
                              <td className="py-1 px-1 text-right font-bold text-amber-700">{fmt(totalMes)}</td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </DocumentPaper>
          )}

          {/* ─── Vendedores ────────────────────────────────────── */}
          {tipo === 'vendedores' && (
            <DocumentPaper
              label="Vendedores y Comisiones"
              title={empresaNombre}
              subtitle={loading ? 'Cargando…' : `${vendedores.length} vendedor(es)`}
            >
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <table className="w-full min-w-[460px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] sm:text-[8px] uppercase text-gray-400">
                      <th className="text-left py-1 px-1 font-medium">Nombre</th>
                      <th className="text-left py-1 px-1 font-medium">Teléfono</th>
                      <th className="text-left py-1 px-1 font-medium">Email</th>
                      <th className="text-right py-1 px-1 font-medium">Ventas</th>
                      <th className="text-right py-1 px-1 font-medium">Comisiones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Cargando...</td></tr>
                    ) : vendedores.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-3 text-gray-400 text-[11px] sm:text-[9px]">Sin vendedores registrados</td></tr>
                    ) : vendedores.map((v: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 text-[11px] sm:text-[9px]">
                        <td className="py-1 px-1 truncate max-w-[120px]">{v.nombre}</td>
                        <td className="py-1 px-1 text-gray-500 truncate max-w-[90px]">{v.telefono ?? '—'}</td>
                        <td className="py-1 px-1 text-gray-500 truncate max-w-[150px]">{v.email ?? '—'}</td>
                        <td className="py-1 px-1 text-right">{Number(v.total_ventas ?? 0)}</td>
                        <td className="py-1 px-1 text-right font-bold text-[#d4a843] whitespace-nowrap">{fmt(Number(v.total_comisiones ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocumentPaper>
          )}
        </div>
      </div>
    </div>
  );
}
