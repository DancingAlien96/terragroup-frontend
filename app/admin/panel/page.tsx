'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStoredUser, logout } from '@/lib/auth';

interface EmpresaRow {
  id: number;
  nombre: string;
  email: string | null;
  plan_nombre: string;
  plan_id: number;
  activo: boolean;
  total_usuarios: number;
  total_lotes: number;
  total_contratos: number;
}

interface Stats {
  empresas_activas: number;
  empresas_total: number;
  usuarios_total: number;
  contratos_total: number;
  ingresos_total: number;
  pagos_vencidos: number;
}

interface Plan {
  id: number;
  nombre: string;
  precio: number;
}

const STAT_CARDS = [
  { key: 'empresas_activas', label: 'Empresas activas', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'empresas_total',   label: 'Total empresas',   color: 'text-blue-600',    bg: 'bg-blue-50' },
  { key: 'usuarios_total',   label: 'Usuarios totales', color: 'text-purple-600',  bg: 'bg-purple-50' },
  { key: 'ingresos_total',   label: 'Ingresos totales', color: 'text-[#d4a843]',   bg: 'bg-amber-50', money: true },
];

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

  // Auth guard
  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.rol !== 'superadmin') {
      router.replace('/admin');
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e, p] = await Promise.all([api.empresas.stats(), api.empresas.list(), api.planes.list()]);
      setStats(s);
      setEmpresas(e);
      setPlanes(p);
    } catch {
      /* handle silently */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
          email: editEmail || undefined,
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

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const planBadge: Record<string, string> = {
    basico:      'bg-gray-100 text-gray-600',
    profesional: 'bg-amber-100 text-amber-700',
    empresarial: 'bg-slate-800 text-white',
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Top bar */}
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
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#1a1a1a] text-white px-5 py-3 rounded-xl shadow-xl text-sm">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Panel de administración</h1>
        <p className="text-sm text-gray-500 mt-1">Vista global de todas las empresas en la plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(card => (
          <div key={card.key} className={`${card.bg} rounded-2xl p-5 border border-gray-100`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>
              {loading ? '—' : card.money
                ? formatMoney(stats?.[card.key as keyof Stats] as number ?? 0)
                : (stats?.[card.key as keyof Stats] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Empresas table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-[#1a1a1a]">Empresas registradas</h2>
          <span className="text-sm text-gray-400">{empresas.length} registros</span>
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
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">Cargando...</td></tr>
              ) : empresas.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">Sin empresas registradas</td></tr>
              ) : empresas.map(emp => (
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
                  <td className="px-4 py-3 text-center text-gray-700">{emp.total_contratos}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(emp)}
                      className="text-xs text-[#d4a843] font-semibold hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
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
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
