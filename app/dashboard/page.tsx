'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import type { AuthUser } from '@/types';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

const ESTADO_COLORS: Record<string, string> = {
  pagado:    'bg-green-50 text-green-700',
  liquidado: 'bg-green-50 text-green-700',
  pendiente: 'bg-orange-50 text-orange-700',
  vencido:   'bg-red-50 text-red-700',
  activo:    'bg-blue-50 text-blue-700',
  cancelado: 'bg-gray-100 text-gray-600',
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ESTADO_COLORS[estado?.toLowerCase()] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Sin datos</div>;
  const r = 60, cx = 80, cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {segments.map((seg) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const rotate = (offset / total) * 360 - 90;
        offset += seg.value;
        return (
          <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="22"
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotate} ${cx} ${cy})`} />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1a1a1a">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#9ca3af">Contratos</text>
    </svg>
  );
}

const DONUT_COLORS: Record<string, string> = {
  activo:    '#22c55e',
  pendiente: '#f59e0b',
  vencido:   '#ef4444',
  liquidado: '#6366f1',
  cancelado: '#9ca3af',
};

/* ── Page ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    api.stats.dashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const kpi = data?.kpi;
  const bar: any[] = data?.bar ?? [];
  const donut: any[] = data?.donut ?? [];
  const activity: any[] = data?.activity ?? [];
  const deudores: any[] = data?.deudores ?? [];
  const maxBar = Math.max(...bar.map((d: any) => Number(d.cobrado) + Number(d.pendiente)), 1);
  const donutSegments = donut.map((d: any) => ({
    label: d.estado,
    value: Number(d.total),
    color: DONUT_COLORS[d.estado] ?? '#9ca3af',
  }));
  const month = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const KPI_CARDS = [
    { label: 'Total Cobrado',      value: kpi ? fmt(kpi.total_cobrado)   : '—', iconBg: 'bg-[#fdf3d9] text-[#d4a843]', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
    { label: 'Pendiente de Cobro', value: kpi ? fmt(kpi.total_pendiente) : '—', iconBg: 'bg-orange-50 text-orange-500', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { label: 'Cartera Vencida',    value: kpi ? fmt(kpi.total_vencido)   : '—', iconBg: 'bg-red-50 text-red-500',       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: 'Tasa de Cobranza',   value: kpi ? `${kpi.tasa_cobranza}%` : '—', iconBg: 'bg-blue-50 text-blue-500',     icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  ];

  return (
    <div className="space-y-6 max-w-screen-xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Bienvenido, {user?.nombre.split(' ')[0] ?? 'Administrador'}</h2>
        <p className="text-sm text-gray-500">Resumen general del sistema de cobranza · {month}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-extrabold text-gray-900 ${loading ? 'animate-pulse' : ''}`}>{k.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg}`}>{k.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div><h3 className="font-bold text-gray-900">Cobranza Mensual</h3><p className="text-xs text-gray-400">Últimos 6 meses</p></div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#d4a843]" /> Cobrado</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200" /> Pendiente</span>
            </div>
          </div>
          {loading ? <div className="h-44 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
          : bar.length === 0 ? <div className="h-44 flex items-center justify-center text-gray-400 text-sm">Sin datos de pagos aún</div>
          : (
            <div className="flex items-end gap-3 h-44">
              {bar.map((d: any) => {
                const cobrado = Number(d.cobrado), pendiente = Number(d.pendiente);
                const cobradoPx = Math.round((cobrado / maxBar) * 160);
                const pendientePx = Math.round((pendiente / maxBar) * 160);
                return (
                  <div key={d.mes_key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: '160px', justifyContent: 'flex-end' }}>
                      {pendientePx > 0 && <div className="w-full bg-gray-200 rounded-t-sm" style={{ height: `${pendientePx}px` }} />}
                      {cobradoPx > 0  && <div className="w-full bg-[#d4a843] rounded-t-sm"  style={{ height: `${cobradoPx}px` }} />}
                    </div>
                    <span className="text-xs text-gray-400 text-center leading-tight">{d.mes}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">Distribución de Contratos</h3>
          <p className="text-xs text-gray-400 mb-4">Por estado de cuenta</p>
          {loading ? <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
          : (
            <div className="flex flex-col items-center gap-4">
              <DonutChart segments={donutSegments} />
              <ul className="w-full space-y-2">
                {donutSegments.map((seg) => (
                  <li key={seg.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-gray-600 capitalize">{seg.label}</span>
                    </span>
                    <span className="font-semibold text-gray-900">{seg.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-bold text-gray-900">Actividad Reciente</h3><p className="text-xs text-gray-400">Últimos movimientos de pago</p></div>
          </div>
          {loading ? <div className="py-8 text-center text-gray-400 text-sm">Cargando...</div>
          : activity.length === 0 ? <div className="py-8 text-center text-gray-400 text-sm">Sin movimientos registrados</div>
          : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 text-left font-medium">Propietario</th>
                <th className="pb-2 text-left font-medium">Lote</th>
                <th className="pb-2 text-right font-medium">Monto</th>
                <th className="pb-2 text-right font-medium">Estado</th>
              </tr></thead>
              <tbody>
                {activity.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900 truncate max-w-[120px]">{row.propietario}</td>
                    <td className="py-2.5 text-gray-500">{row.lote}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(Number(row.monto))}</td>
                    <td className="py-2.5 text-right"><EstadoBadge estado={row.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Mayores Deudores</h3>
            <p className="text-xs text-gray-400">Propietarios con mayor saldo vencido</p>
          </div>
          {loading ? <div className="py-8 text-center text-gray-400 text-sm">Cargando...</div>
          : deudores.length === 0 ? <div className="py-8 text-center text-gray-400 text-sm">Sin deudores vencidos</div>
          : (
            <ul className="space-y-3">
              {deudores.map((d: any, i: number) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#d4a843]/40 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                    {d.nombre?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.nombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">{fmt(Number(d.saldo))}</p>
                    <EstadoBadge estado="vencido" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}