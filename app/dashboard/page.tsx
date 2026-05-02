'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '@/lib/auth';
import type { AuthUser } from '@/types';

/* ── Mock data ──────────────────────────────────────────────── */
const KPI_DATA = [
  {
    label: 'Total Cobrado',
    value: '$187,400',
    delta: '+8.4% vs mes anterior',
    positive: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    iconBg: 'bg-[#fdf3d9] text-[#d4a843]',
  },
  {
    label: 'Pendiente de Cobro',
    value: '$76,200',
    delta: '-3.2% vs mes anterior',
    positive: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    iconBg: 'bg-orange-50 text-orange-500',
  },
  {
    label: 'Cartera Vencida',
    value: '$43,800',
    delta: '-1.1% vs mes anterior',
    positive: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    iconBg: 'bg-red-50 text-red-500',
  },
  {
    label: 'Tasa de Cobranza',
    value: '71.2%',
    delta: '+2.3% vs mes anterior',
    positive: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    iconBg: 'bg-blue-50 text-blue-500',
  },
];

const BAR_DATA = [
  { mes: 'Nov', cobrado: 72, pendiente: 28 },
  { mes: 'Dic', cobrado: 68, pendiente: 32 },
  { mes: 'Ene', cobrado: 75, pendiente: 25 },
  { mes: 'Feb', cobrado: 65, pendiente: 35 },
  { mes: 'Mar', cobrado: 80, pendiente: 20 },
  { mes: 'Abr', cobrado: 71, pendiente: 29 },
];

const DONUT_DATA = [
  { label: 'Al día',    value: 42, color: '#22c55e' },
  { label: 'Moroso',   value: 28, color: '#f59e0b' },
  { label: 'Vencido',  value: 18, color: '#ef4444' },
  { label: 'Liquidado',value: 12, color: '#6366f1' },
];

const ACTIVITY = [
  { propietario: 'Carlos Martínez',  lote: 'MZ-12 Lt-04', monto: '$4,500', fecha: '01 May 2026', estado: 'Pagado' },
  { propietario: 'Ana López',        lote: 'MZ-05 Lt-11', monto: '$3,200', fecha: '30 Abr 2026', estado: 'Pendiente' },
  { propietario: 'José Ramírez',     lote: 'MZ-08 Lt-02', monto: '$5,800', fecha: '29 Abr 2026', estado: 'Vencido' },
  { propietario: 'María Hernández',  lote: 'MZ-03 Lt-07', monto: '$4,100', fecha: '28 Abr 2026', estado: 'Pagado' },
];

const TOP_DEUDORES = [
  { nombre: 'Roberto Sánchez',  saldo: '$18,400', lotes: 3, estado: 'Vencido' },
  { nombre: 'Elena Castillo',   saldo: '$12,700', lotes: 2, estado: 'Moroso' },
  { nombre: 'Fernando Torres',  saldo: '$9,300',  lotes: 1, estado: 'Moroso' },
];

/* ── Donut SVG ──────────────────────────────────────────────── */
function DonutChart() {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {DONUT_DATA.map((seg) => {
        const dash = (seg.value / 100) * circumference;
        const gap = circumference - dash;
        const rotate = (offset / 100) * 360 - 90;
        offset += seg.value;
        return (
          <circle
            key={seg.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="22"
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotate} ${cx} ${cy})`}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1a1a1a">100</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="#9ca3af">Total</text>
    </svg>
  );
}

/* ── Estado badge ───────────────────────────────────────────── */
function EstadoBadge({ estado }: { estado: string }) {
  const cls: Record<string, string> = {
    Pagado:    'bg-green-50 text-green-700',
    Pendiente: 'bg-orange-50 text-orange-700',
    Vencido:   'bg-red-50 text-red-700',
    Moroso:    'bg-yellow-50 text-yellow-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const month = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Panel de Control</h1>
        <p className="text-sm text-gray-500">Resumen general del sistema de cobranza</p>
      </div>

      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Bienvenido, {user?.nombre.split(' ')[0] ?? 'Administrador'}
        </h2>
        <p className="text-sm text-gray-500">
          Resumen general del sistema de cobranza · {month}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-gray-900">{kpi.value}</p>
              <p className={`text-xs mt-1 font-medium ${kpi.positive ? 'text-green-600' : 'text-red-500'}`}>
                {kpi.positive ? '↑' : '↓'} {kpi.delta}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Cobranza Mensual</h3>
              <p className="text-xs text-gray-400">Últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#d4a843]" /> Cobrado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gray-200" /> Pendiente
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-44">
            {BAR_DATA.map((d) => (
              <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5" style={{ height: '160px', justifyContent: 'flex-end' }}>
                  <div
                    className="w-full bg-gray-200 rounded-t-sm"
                    style={{ height: `${d.pendiente * 1.6}px` }}
                  />
                  <div
                    className="w-full bg-[#d4a843] rounded-t-sm"
                    style={{ height: `${d.cobrado * 1.6}px` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{d.mes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">Distribución de Propietarios</h3>
          <p className="text-xs text-gray-400 mb-4">Por estado de cuenta</p>
          <div className="flex flex-col items-center gap-4">
            <DonutChart />
            <ul className="w-full space-y-2">
              {DONUT_DATA.map((seg) => (
                <li key={seg.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-gray-600">{seg.label}</span>
                  </span>
                  <span className="font-semibold text-gray-900">{seg.value} <span className="text-gray-400 font-normal">{seg.value}%</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Actividad reciente */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Actividad Reciente</h3>
              <p className="text-xs text-gray-400">Últimos movimientos de pago</p>
            </div>
            <button className="text-xs font-semibold text-[#d4a843] hover:underline">Ver todos</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 text-left font-medium">Propietario</th>
                <th className="pb-2 text-left font-medium">Lote</th>
                <th className="pb-2 text-right font-medium">Monto</th>
                <th className="pb-2 text-right font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 font-medium text-gray-900">{row.propietario}</td>
                  <td className="py-2.5 text-gray-500">{row.lote}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-900">{row.monto}</td>
                  <td className="py-2.5 text-right"><EstadoBadge estado={row.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mayores deudores */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Mayores Deudores</h3>
            <p className="text-xs text-gray-400">Propietarios con mayor saldo pendiente</p>
          </div>
          <ul className="space-y-3">
            {TOP_DEUDORES.map((d, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#d4a843]/40 transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                  {d.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{d.nombre}</p>
                  <p className="text-xs text-gray-400">{d.lotes} lote{d.lotes > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{d.saldo}</p>
                  <EstadoBadge estado={d.estado} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
