'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, TrendingUp, DollarSign, Users, Percent } from 'lucide-react';
import { api } from '@/lib/api';

interface Vendedor {
  id: number;
  nombre: string;
  email: string;
  username: string;
  lotes_asignados: number;
  lotes_vendidos: number;
  comision_porcentaje: number;
  total_comisiones: number;
  comisiones_pendientes: number;
  ultima_venta: string | null;
  activo: boolean;
}

interface Comision {
  id: number;
  vendedor_nombre: string;
  propietario_nombre: string;
  lote_clave: string;
  monto_pago: number;
  porcentaje: number;
  monto: number;
  created_at: string;
  pagada: boolean;
}

type TabView = 'vendedores' | 'comisiones';

function fmt(n: number) { return '$' + Number(n).toLocaleString('es-MX'); }

export default function VendedoresPage() {
  const [tab, setTab] = useState<TabView>('vendedores');
  const [showModal, setShowModal] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', email: '', username: '', password: '', comision_porcentaje: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, c] = await Promise.all([api.vendedores.list(), api.vendedores.comisiones.list()]);
      setVendedores(v); setComisiones(c);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalComisiones  = vendedores.reduce((s, v) => s + Number(v.total_comisiones), 0);
  const pendientePago    = comisiones.filter(c => !c.pagada).reduce((s, c) => s + Number(c.monto), 0);
  const vendedoresActivos = vendedores.filter(v => v.activo).length;

  const handleAgregar = async () => {
    try {
      await api.usuarios.create({
        nombre: form.nombre, email: form.email, username: form.username,
        password: form.password, rol: 'vendedor', activo: true,
        comision_porcentaje: parseFloat(form.comision_porcentaje) || 0,
      });
      setShowModal(false);
      setForm({ nombre: '', email: '', username: '', password: '', comision_porcentaje: '' });
      load();
    } catch (e: unknown) { alert((e as Error).message); }
  };

  const toggleComision = async (id: number) => {
    try { await api.vendedores.comisiones.toggle(id); load(); }
    catch (e: unknown) { alert((e as Error).message); }
  };

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Vendedores y Comisiones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Supervisión del equipo de ventas y control de comisiones</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus size={15} />
          Agregar Vendedor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center shrink-0">
            <Users size={18} className="text-[#d4a843]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Vendedores activos</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{vendedoresActivos}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Lotes vendidos</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{vendedores.reduce((s, v) => s + Number(v.lotes_vendidos), 0)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-[#d4a843]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total comisiones</p>
            <p className="text-xl font-bold text-[#d4a843]">{fmt(totalComisiones)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <Percent size={18} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pendiente de pago</p>
            <p className="text-xl font-bold text-orange-500">{fmt(pendientePago)}</p>
          </div>
        </div>
      </div>

      {/* Tabs + Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 px-5 pt-4 gap-1">
          {([['vendedores', 'Vendedores'], ['comisiones', 'Historial de Comisiones']] as [TabView, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                tab === id ? 'border-[#d4a843] text-[#92700a]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'vendedores' && (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Asignados</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendidos</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Comisión %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Comisiones</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Última Venta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : vendedores.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                        {(v.nombre ?? '').split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{v.nombre}</p>
                        <p className="text-xs text-gray-400">{v.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{v.lotes_asignados}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-600">{v.lotes_vendidos}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{v.comision_porcentaje}%</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#d4a843]">{fmt(Number(v.total_comisiones))}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.ultima_venta ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      v.activo ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}>
                      {v.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {tab === 'comisiones' && (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendedor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Propietario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lote</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Venta</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Comisión</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : comisiones.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1a1a1a]">{c.vendedor_nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.propietario_nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{c.lote_clave}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmt(Number(c.monto_pago))}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.porcentaje}%</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#d4a843]">{fmt(Number(c.monto))}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX') : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleComision(c.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                        c.pagada
                          ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                          : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                      }`}>
                      {c.pagada ? 'Pagada' : 'Pendiente'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {tab === 'vendedores' ? `${vendedores.length} vendedores registrados` : `${comisiones.length} comisiones en el historial`}
        </div>
      </div>

      {/* Modal Agregar Vendedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#1a1a1a]">Agregar Vendedor</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {([
                { key: 'nombre', label: 'Nombre completo', placeholder: 'Ej. Carlos López', type: 'text' },
                { key: 'email', label: 'Email', placeholder: 'email@empresa.com', type: 'email' },
                { key: 'username', label: 'Usuario', placeholder: 'carlos.lopez', type: 'text' },
                { key: 'password', label: 'Contraseña', placeholder: '••••••••', type: 'password' },
                { key: 'comision_porcentaje', label: 'Comisión %', placeholder: 'Ej. 3', type: 'number' },
              ] as { key: keyof typeof form; label: string; placeholder: string; type: string }[]).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleAgregar}
                className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
