'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────── */
interface Vendedor {
  id: number;
  nombre: string;
  edad: number | null;
  telefono: string | null;
  email: string | null;
  dpi: string | null;
  direccion: string | null;
  activo: boolean;
  total_ventas: number;
  total_comisiones: number;
}

interface Comision {
  id: number;
  vendedor_id: number;
  vendedor_nombre: string;
  descripcion_lote: string;
  valor_lote: number;
  porcentaje: number;
  monto_comision: number;
  fecha_venta: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n);

const fmtDate = (s: string | Date) => {
  const d = new Date(typeof s === 'string' ? s.includes('T') ? s : s + 'T12:00:00' : String(s));
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ── VendedorModal ──────────────────────────────────────────── */
function VendedorModal({
  vendedor,
  onClose,
  onSaved,
}: {
  vendedor: Vendedor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre:    vendedor?.nombre    ?? '',
    edad:      String(vendedor?.edad ?? ''),
    telefono:  vendedor?.telefono  ?? '',
    email:     vendedor?.email     ?? '',
    dpi:       vendedor?.dpi       ?? '',
    direccion: vendedor?.direccion ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        nombre:    form.nombre,
        edad:      form.edad ? Number(form.edad) : null,
        telefono:  form.telefono  || null,
        email:     form.email     || null,
        dpi:       form.dpi       || null,
        direccion: form.direccion || null,
      };
      if (vendedor) await api.vendedores.update(vendedor.id, body);
      else          await api.vendedores.create(body);
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {vendedor ? 'Editar Vendedor' : 'Registrar Vendedor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Edad</label>
            <input type="number" value={form.edad} onChange={e => set('edad', e.target.value)} placeholder="Ej. 28"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Ej. 5555-1234"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">DPI / Identidad</label>
            <input value={form.dpi} onChange={e => set('dpi', e.target.value)} placeholder="Ej. 1234 56789 0101"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div className="col-span-2 flex gap-3 mt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── ComisionModal ──────────────────────────────────────────── */
function ComisionModal({
  vendedor,
  onClose,
}: {
  vendedor: Vendedor;
  onClose: () => void;
}) {
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const emptyForm = { descripcion_lote: '', valor_lote: '', porcentaje: '', fecha_venta: today };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const montoCalculado =
    form.valor_lote && form.porcentaje
      ? parseFloat(form.valor_lote) * parseFloat(form.porcentaje) / 100
      : null;

  const load = useCallback(async () => {
    setLoading(true);
    try { setComisiones(await api.vendedores.comisiones.list(vendedor.id)); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [vendedor.id]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Comision) {
    setEditingId(c.id);
    setForm({
      descripcion_lote: c.descripcion_lote,
      valor_lote:       String(c.valor_lote),
      porcentaje:       String(c.porcentaje),
      fecha_venta:      typeof c.fecha_venta === 'string' && !c.fecha_venta.includes('T')
        ? c.fecha_venta
        : new Date(c.fecha_venta).toISOString().split('T')[0],
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!montoCalculado) return;
    setSaving(true);
    const body = {
      descripcion_lote: form.descripcion_lote,
      valor_lote:       Number(form.valor_lote),
      porcentaje:       Number(form.porcentaje),
      fecha_venta:      form.fecha_venta,
    };
    try {
      if (editingId !== null) {
        await api.vendedores.comisiones.update(vendedor.id, editingId, body);
      } else {
        await api.vendedores.comisiones.create(vendedor.id, body);
      }
      cancelForm();
      load();
    } catch (err: any) {
      alert(err.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar esta venta?')) return;
    try { await api.vendedores.comisiones.delete(vendedor.id, id); load(); }
    catch (err: any) { alert(err.message ?? 'Error'); }
  }

  const totalComision = comisiones.reduce((s, c) => s + Number(c.monto_comision), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ventas de {vendedor.nombre}</h2>
            <p className="text-xs text-gray-500">Lotes vendidos y comisiones generadas</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {showForm ? (
          <form className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 shrink-0" onSubmit={handleSubmit}>
            <p className="text-xs font-semibold text-amber-800 mb-3">
              {editingId !== null ? 'Editar venta' : 'Registrar nueva venta'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del lote *</label>
                <input value={form.descripcion_lote} onChange={e => set('descripcion_lote', e.target.value)} required
                  placeholder="Ej. Lote 502 Manzana B"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor del lote (Q) *</label>
                <input type="number" step="0.01" min="0" value={form.valor_lote} onChange={e => set('valor_lote', e.target.value)} required
                  placeholder="Ej. 250000.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Porcentaje de comisión (%) *</label>
                <input type="number" step="0.01" min="0" max="100" value={form.porcentaje} onChange={e => set('porcentaje', e.target.value)} required
                  placeholder="Ej. 5.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              </div>
              <div className="col-span-2 bg-white border border-amber-300 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Comisión calculada:</span>
                <span className="text-base font-bold text-[#d4a843]">
                  {montoCalculado !== null ? fmt(montoCalculado) : <span className="text-gray-300 font-normal text-sm">— ingresa valor y porcentaje</span>}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de venta *</label>
                <input type="date" value={form.fecha_venta} onChange={e => set('fecha_venta', e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={cancelForm}
                className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg">
                Cancelar
              </button>
              <button type="submit" disabled={saving || montoCalculado === null}
                className="text-sm bg-[#d4a843] text-white px-4 py-1.5 rounded-lg hover:bg-[#b8922e] disabled:opacity-60 font-medium">
                {saving ? 'Guardando...' : editingId !== null ? 'Actualizar venta' : 'Guardar venta'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between mb-3 shrink-0">
            <p className="text-xs text-gray-500">
              {comisiones.length} {comisiones.length === 1 ? 'venta' : 'ventas'} &middot; Total:{' '}
              <span className="font-semibold text-[#d4a843]">{fmt(totalComision)}</span>
            </p>
            <button onClick={openNew}
              className="flex items-center gap-1.5 text-sm bg-[#d4a843] text-white px-3 py-1.5 rounded-lg hover:bg-[#b8922e] font-medium">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Agregar venta
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          ) : comisiones.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin ventas registradas aún</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 text-left font-medium">Lote</th>
                  <th className="py-2 text-right font-medium">Valor lote</th>
                  <th className="py-2 text-center font-medium w-14">%</th>
                  <th className="py-2 text-right font-medium">Comisión</th>
                  <th className="py-2 text-left font-medium px-3">Fecha</th>
                  <th className="py-2 text-center font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {comisiones.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-gray-700 font-medium max-w-[160px] truncate">{c.descripcion_lote}</td>
                    <td className="py-3 text-right text-gray-500 text-xs">{fmt(Number(c.valor_lote))}</td>
                    <td className="py-3 text-center text-gray-500">{Number(c.porcentaje).toFixed(2)}%</td>
                    <td className="py-3 text-right font-bold text-[#d4a843]">{fmt(Number(c.monto_comision))}</td>
                    <td className="py-3 text-gray-400 text-xs px-3">{fmtDate(c.fecha_venta)}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(c)} title="Editar"
                          className="p-1 text-gray-300 hover:text-[#d4a843] transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)} title="Eliminar"
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function VendedoresPage() {
  const [vendedores, setVendedores]           = useState<Vendedor[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [busqueda, setBusqueda]               = useState('');
  const [modalVendedor, setModalVendedor]     = useState(false);
  const [editVendedor, setEditVendedor]       = useState<Vendedor | null>(null);
  const [comisionVendedor, setComisionVendedor] = useState<Vendedor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setVendedores(await api.vendedores.list()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este vendedor? También se eliminarán sus ventas registradas.')) return;
    try { await api.vendedores.delete(id); load(); }
    catch (err: any) { alert(err.message ?? 'Error'); }
  }

  const filtrados = vendedores.filter(v =>
    busqueda === '' || v.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const totalComisiones = vendedores.reduce((s, v) => s + Number(v.total_comisiones), 0);
  const totalVentas     = vendedores.reduce((s, v) => s + Number(v.total_ventas), 0);

  return (
    <>
      {modalVendedor && (
        <VendedorModal
          vendedor={editVendedor}
          onClose={() => { setModalVendedor(false); setEditVendedor(null); }}
          onSaved={load}
        />
      )}
      {comisionVendedor && (
        <ComisionModal
          vendedor={comisionVendedor}
          onClose={() => { setComisionVendedor(null); load(); }}
        />
      )}

      <div className="space-y-5 max-w-screen-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Vendedores y Comisiones</h1>
            <p className="text-sm text-gray-500">Equipo de ventas y registro de comisiones por lote</p>
          </div>
          <button
            onClick={() => { setEditVendedor(null); setModalVendedor(true); }}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar Vendedor
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vendedores</p>
              <p className="text-xl font-bold text-gray-900">{vendedores.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total ventas</p>
              <p className="text-xl font-bold text-gray-900">{totalVentas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total comisiones</p>
              <p className="text-xl font-bold text-[#d4a843]">{fmt(totalComisiones)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Vendedores registrados</p>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843] w-52" />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Cargando...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3 text-left font-medium">Vendedor</th>
                    <th className="px-5 py-3 text-left font-medium">Contacto</th>
                    <th className="px-5 py-3 text-center font-medium">Edad</th>
                    <th className="px-5 py-3 text-left font-medium">DPI</th>
                    <th className="px-5 py-3 text-center font-medium">Ventas</th>
                    <th className="px-5 py-3 text-right font-medium">Total comisiones</th>
                    <th className="px-5 py-3 text-center font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                        {busqueda ? 'Sin resultados' : 'No hay vendedores registrados'}
                      </td>
                    </tr>
                  ) : filtrados.map(v => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                            {v.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <p className="font-medium text-gray-900">{v.nombre}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        <p>{v.telefono ?? '—'}</p>
                        <p className="text-gray-400">{v.email ?? ''}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-600">{v.edad ?? '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{v.dpi ?? '—'}</td>
                      <td className="px-5 py-3.5 text-center font-semibold text-gray-900">{v.total_ventas}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#d4a843]">{fmt(Number(v.total_comisiones))}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setComisionVendedor(v)} title="Ver ventas"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                              <polyline points="16 7 22 7 22 13"/>
                            </svg>
                          </button>
                          <button onClick={() => { setEditVendedor(v); setModalVendedor(true); }} title="Editar"
                            className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(v.id)} title="Eliminar"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Mostrando {filtrados.length} de {vendedores.length} vendedores
          </div>
        </div>
      </div>
    </>
  );
}
