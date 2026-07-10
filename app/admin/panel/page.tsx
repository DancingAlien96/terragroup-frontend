'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStoredUser, logout } from '@/lib/auth';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  DollarSign, Building2, TrendingUp, Activity, Search, ArrowUp, ArrowDown,
  Wallet, AlertTriangle, Trophy, Users,
} from 'lucide-react';
import UsuariosEmpresaModal from '@/components/admin/UsuariosEmpresaModal';

interface EmpresaRow {
  id: number;
  nombre: string;
  email: string | null;
  plan_nombre: string;
  plan_id: number;
  activo: boolean;
  pago_suscripcion_id: string | null;
  total_usuarios: number;
  total_lotes: number;
  total_ventas: number;
}

interface Stats {
  empresas_activas: number;
  empresas_total: number;
  usuarios_total: number;
  contratos_total: number;
  empresas_pagadas: number;
  registros_mes: number;
  ingresos_total: number;
  ingresos_delta_mes: number;
  tasa_activacion: number;
  pagos_vencidos: number;
  distribucion_planes: { plan: string; count: number }[];
  ingresos_por_mes:    { mes: string; monto: number }[];
  gmv_gestionado:      number;
  cobranza_salud:      { pagados: number; pendientes: number; vencidos: number };
  conversion_funnel:   { registros: number; pagaron: number; conversion_pct: number };
  crecimiento_mensual: { mes: string; registros: number; activaciones: number }[];
}

interface Plan {
  id: number;
  nombre: string;
  precio: number;
}

const PLAN_COLORS: Record<string, string> = {
  basico:      '#94a3b8',
  profesional: '#d4a843',
  empresarial: '#1e293b',
};
const PIE_FALLBACK = ['#94a3b8', '#d4a843', '#1e293b', '#10b981', '#3b82f6'];

const MES_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const formatMesShort = (mesIso: string) => {
  const [, m] = mesIso.split('-').map(Number);
  return MES_LABELS[m - 1] ?? mesIso;
};

const formatUSD = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
const formatGTQ = (val: number) => `Q ${new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(val)}`;
const formatGTQCompact = (val: number) => {
  if (val >= 1_000_000) return `Q ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000)     return `Q ${(val / 1_000).toFixed(0)}k`;
  return formatGTQ(val);
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<EmpresaRow | null>(null);
  const [editPlanId, setEditPlanId] = useState<number>(1);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [usuariosModal, setUsuariosModal] = useState<EmpresaRow | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.rol !== 'superadmin') router.replace('/admin');
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e, p] = await Promise.all([api.empresas.stats(), api.empresas.list(), api.planes.list()]);
      setStats(s);
      setEmpresas(e);
      setPlanes(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const empresasFiltradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter((e) =>
      e.nombre.toLowerCase().includes(q) ||
      (e.email ?? '').toLowerCase().includes(q),
    );
  }, [empresas, query]);

  // Top 5 empresas por uso (ventas + lotes como score compuesto).
  const topEmpresas = useMemo(() =>
    [...empresas]
      .filter((e) => e.activo)
      .sort((a, b) => (b.total_ventas + b.total_lotes) - (a.total_ventas + a.total_lotes))
      .slice(0, 5),
    [empresas]);

  // Empresas dormidas: activas + pagaron pero sin actividad (0 lotes, 0 ventas).
  const empresasDormidas = useMemo(() =>
    empresas
      .filter((e) => e.activo && e.pago_suscripcion_id && e.total_lotes === 0 && e.total_ventas === 0)
      .slice(0, 5),
    [empresas]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleToggle(id: number) {
    try {
      await api.empresas.toggle(id);
      showToast('Estado actualizado');
      loadData();
    } catch {
      showToast('Error al actualizar');
    }
  }

  function openEdit(row: EmpresaRow) {
    setEditModal(row);
    setEditPlanId(row.plan_id);
    setEditNombre(row.nombre);
    setEditEmail(row.email ?? '');
  }

  async function handleSaveEdit() {
    if (!editModal) return;
    setSaving(true);
    try {
      await Promise.all([
        api.empresas.update(editModal.id, {
          nombre: editNombre,
          email:  editEmail || undefined,
        }),
        editPlanId !== editModal.plan_id ? api.empresas.changePlan(editModal.id, editPlanId) : Promise.resolve(),
      ]);
      showToast('Empresa actualizada');
      setEditModal(null);
      loadData();
    } catch {
      showToast('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const planBadge: Record<string, string> = {
    basico:      'bg-gray-100 text-gray-600',
    profesional: 'bg-amber-100 text-amber-700',
    empresarial: 'bg-slate-800 text-white',
  };

  const ingresosChart = (stats?.ingresos_por_mes ?? []).map((r) => ({
    mes:   formatMesShort(r.mes),
    monto: r.monto,
  }));

  const planesChart = (stats?.distribucion_planes ?? []).map((d, i) => ({
    name:  d.plan,
    value: d.count,
    color: PLAN_COLORS[d.plan] ?? PIE_FALLBACK[i % PIE_FALLBACK.length],
  }));

  const crecimientoChart = (stats?.crecimiento_mensual ?? []).map((r) => ({
    mes:          formatMesShort(r.mes),
    registros:    r.registros,
    activaciones: r.activaciones,
  }));

  const deltaPositivo = (stats?.ingresos_delta_mes ?? 0) >= 0;
  const cobranzaTotal = stats
    ? stats.cobranza_salud.pagados + stats.cobranza_salud.pendientes + stats.cobranza_salud.vencidos
    : 0;
  const cobranzaPct = (val: number) => cobranzaTotal > 0 ? Math.round((val / cobranzaTotal) * 100) : 0;
  const funnelPagaronPct = stats?.conversion_funnel.registros
    ? (stats.conversion_funnel.pagaron / stats.conversion_funnel.registros) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="bg-[#1a1a1a] text-white px-6 py-3 flex items-center justify-between shadow sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight">
            Terra<span className="text-[#d4a843]">Group</span>
          </span>
          <span className="text-xs bg-[#d4a843]/20 text-[#d4a843] border border-[#d4a843]/30 px-2 py-0.5 rounded-full font-semibold">
            Super Admin
          </span>
        </div>
        <button
          onClick={() => { logout(); window.location.href = '/admin'; }}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-[#1a1a1a] text-white px-5 py-3 rounded-xl shadow-xl text-sm">
            {toast}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Panel de administración</h1>
          <p className="text-sm text-gray-500 mt-1">Vista global de todas las empresas en la plataforma</p>
        </div>

        {/* HERO — GMV gestionado */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#2a2a2a] p-6 shadow-lg flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-[#d4a843]" />
              <span className="text-xs font-bold text-[#d4a843] uppercase tracking-widest">GMV gestionado</span>
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-white">
              {loading ? '—' : formatGTQ(stats?.gmv_gestionado ?? 0)}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Volumen total en cartera de las {stats?.empresas_activas ?? 0} empresas activas
            </p>
          </div>
          <Wallet size={120} className="text-white/5 absolute -right-6 top-1/2 -translate-y-1/2" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#d4a843] flex items-center justify-center">
                <DollarSign size={20} />
              </div>
              {stats && (
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  deltaPositivo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {deltaPositivo ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {formatUSD(Math.abs(stats.ingresos_delta_mes))}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingresos SaaS</p>
            <p className="text-3xl font-bold text-[#1a1a1a]">
              {loading ? '—' : formatUSD(stats?.ingresos_total ?? 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">vs mes anterior</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Building2 size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Empresas activas</p>
            <p className="text-3xl font-bold text-[#1a1a1a]">
              {loading ? '—' : stats?.empresas_activas ?? 0}
              <span className="text-base font-medium text-gray-400 ml-1">/ {stats?.empresas_total ?? 0}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{stats?.usuarios_total ?? 0} usuarios totales</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <TrendingUp size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nuevas este mes</p>
            <p className="text-3xl font-bold text-[#1a1a1a]">
              {loading ? '—' : stats?.registros_mes ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">registros nuevos</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Activity size={20} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tasa de activación</p>
            <p className="text-3xl font-bold text-[#1a1a1a]">
              {loading ? '—' : `${stats?.tasa_activacion ?? 0}%`}
            </p>
            <p className="text-xs text-gray-400 mt-1">% que paga tras registro</p>
          </div>
        </div>

        {/* Crecimiento MoM + Distribución planes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
            <div className="mb-4">
              <h3 className="font-bold text-[#1a1a1a]">Crecimiento mensual</h3>
              <p className="text-xs text-gray-400">Registros vs activaciones, últimos 12 meses</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={crecimientoChart} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="registros" name="Registros" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="activaciones" name="Activaciones" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-[#1a1a1a]">Distribución por plan</h3>
              <p className="text-xs text-gray-400">Solo empresas activas</p>
            </div>
            <div className="h-64">
              {planesChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planesChart} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={48} outerRadius={80} paddingAngle={2}>
                      {planesChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                      formatter={(v) => [`${Number(v) || 0} empresas`, '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Embudo conversión + Cobranza salud + Ingresos por mes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Funnel */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-[#1a1a1a]">Embudo de conversión</h3>
              <p className="text-xs text-gray-400">Registros → pagaron</p>
            </div>
            {loading ? (
              <div className="text-gray-400 text-sm">—</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-600">Registros</span>
                    <span className="font-bold text-[#1a1a1a]">{stats?.conversion_funnel.registros ?? 0}</span>
                  </div>
                  <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-600">Pagaron</span>
                    <span className="font-bold text-[#1a1a1a]">{stats?.conversion_funnel.pagaron ?? 0}</span>
                  </div>
                  <div className="w-full h-3 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${funnelPagaronPct}%` }} />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Conversión total</p>
                  <p className="text-2xl font-bold text-[#1a1a1a]">{stats?.conversion_funnel.conversion_pct ?? 0}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Cobranza salud */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-[#1a1a1a]">Salud de cobranza</h3>
              <p className="text-xs text-gray-400">Cuotas en todas las empresas</p>
            </div>
            {loading || cobranzaTotal === 0 ? (
              <div className="text-gray-400 text-sm py-8 text-center">Sin cuotas registradas</div>
            ) : stats && (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">Pagadas</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {stats.cobranza_salud.pagados} <span className="text-xs font-medium opacity-70">({cobranzaPct(stats.cobranza_salud.pagados)}%)</span>
                  </span>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700">Pendientes</span>
                  <span className="text-sm font-bold text-amber-700">
                    {stats.cobranza_salud.pendientes} <span className="text-xs font-medium opacity-70">({cobranzaPct(stats.cobranza_salud.pendientes)}%)</span>
                  </span>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-700">Vencidas</span>
                  <span className="text-sm font-bold text-red-700">
                    {stats.cobranza_salud.vencidos} <span className="text-xs font-medium opacity-70">({cobranzaPct(stats.cobranza_salud.vencidos)}%)</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ingresos por mes (mini bar chart) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-[#1a1a1a]">Ingresos SaaS / mes</h3>
              <p className="text-xs text-gray-400">USD, últimos 6 meses</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ingresosChart} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip
                    cursor={{ fill: '#fef3c7', opacity: 0.3 }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v) => [formatUSD(Number(v) || 0), 'Ingresos']}
                  />
                  <Bar dataKey="monto" fill="#d4a843" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top empresas + Empresas dormidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-[#d4a843]" />
              <h3 className="font-bold text-[#1a1a1a]">Top 5 empresas por uso</h3>
            </div>
            {loading ? <div className="text-gray-400 text-sm">—</div> :
             topEmpresas.length === 0 ? <div className="text-gray-400 text-sm py-4 text-center">Sin datos aún</div> :
             <div className="divide-y divide-gray-50">
               {topEmpresas.map((emp, i) => (
                 <div key={emp.id} className="flex items-center justify-between py-2.5">
                   <div className="flex items-center gap-3 min-w-0">
                     <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                       i === 0 ? 'bg-amber-100 text-[#d4a843]' :
                       i === 1 ? 'bg-gray-100 text-gray-500'  :
                       i === 2 ? 'bg-orange-50 text-orange-500' :
                                 'bg-gray-50 text-gray-400'
                     }`}>{i + 1}</span>
                     <div className="min-w-0">
                       <div className="font-semibold text-sm text-[#1a1a1a] truncate">{emp.nombre}</div>
                       <div className="text-xs text-gray-400 truncate">{emp.email ?? '—'}</div>
                     </div>
                   </div>
                   <div className="text-right shrink-0 ml-2">
                     <div className="text-sm font-bold text-[#1a1a1a]">{emp.total_ventas} ventas</div>
                     <div className="text-xs text-gray-400">{emp.total_lotes} lotes</div>
                   </div>
                 </div>
               ))}
             </div>}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-bold text-[#1a1a1a]">Empresas en riesgo</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Pagaron pero no han cargado ni un lote o venta</p>
            {loading ? <div className="text-gray-400 text-sm">—</div> :
             empresasDormidas.length === 0 ? (
               <div className="rounded-xl bg-emerald-50 px-4 py-6 text-center">
                 <p className="text-sm font-semibold text-emerald-700">🎉 Todas las empresas pagas están activas</p>
                 <p className="text-xs text-emerald-600 mt-1">Buen onboarding</p>
               </div>
             ) :
             <div className="divide-y divide-gray-50">
               {empresasDormidas.map((emp) => (
                 <div key={emp.id} className="flex items-center justify-between py-2.5">
                   <div className="min-w-0">
                     <div className="font-semibold text-sm text-[#1a1a1a] truncate">{emp.nombre}</div>
                     <div className="text-xs text-gray-400 truncate">{emp.email ?? 'Sin email'}</div>
                   </div>
                   <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600 shrink-0 ml-2">
                     Sin actividad
                   </span>
                 </div>
               ))}
             </div>}
          </div>
        </div>

        {/* Empresas table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-[#1a1a1a]">Empresas registradas</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {empresasFiltradas.length} {empresasFiltradas.length === 1 ? 'registro' : 'registros'}
                {query && ` (de ${empresas.length})`}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Empresa', 'Plan', 'Estado', 'Usuarios', 'Lotes', 'Contratos', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">Cargando…</td></tr>
                ) : empresasFiltradas.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">
                    {query ? 'Sin coincidencias' : 'Sin empresas registradas'}
                  </td></tr>
                ) : empresasFiltradas.map(emp => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{emp.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1a1a1a]">{emp.nombre}</div>
                      {emp.email && <div className="text-xs text-gray-400">{emp.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${planBadge[emp.plan_nombre] ?? 'bg-gray-100 text-gray-600'}`}>
                        {emp.plan_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(emp.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                          emp.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}>
                        {emp.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{emp.total_usuarios}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{emp.total_lotes}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{emp.total_ventas}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setUsuariosModal(emp)}
                          className="text-xs text-gray-500 hover:text-[#1a1a1a] font-semibold flex items-center gap-1"
                          title="Ver / gestionar usuarios">
                          <Users size={13} />
                          Usuarios
                        </button>
                        <button onClick={() => openEdit(emp)}
                          className="text-xs text-[#d4a843] font-semibold hover:underline">
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {usuariosModal && (
          <UsuariosEmpresaModal
            empresaId={usuariosModal.id}
            empresaNombre={usuariosModal.nombre}
            onClose={() => setUsuariosModal(null)}
          />
        )}

        {editModal && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-[#1a1a1a] text-lg">Editar empresa</h3>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Nombre</label>
                <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Plan</label>
                <select value={editPlanId} onChange={e => setEditPlanId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
                  {planes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — ${p.precio}/mes</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
