'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────── */
type Entidad = 'Banrural' | 'Industrial' | 'G&T' | 'BAC';

interface Cliente {
  id: number;
  nombre_comprador: string;
  email: string | null;
  telefono: string | null;
  descripcion_lote: string | null;
  precio_neto: number;
  enganche: number;
  num_cuotas: number;
  valor_cuota: number;
  fecha_deposito: string;
  num_transferencia: string | null;
  entidad_bancaria: Entidad | null;
  activo: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n);

/* ── Modal ──────────────────────────────────────────────────── */
function ClienteModal({
  cliente,
  onClose,
  onSaved,
}: {
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  const [nombre, setNombre] = useState(cliente?.nombre_comprador ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [descLote, setDescLote] = useState(cliente?.descripcion_lote ?? '');
  const [precioNeto, setPrecioNeto] = useState(String(cliente?.precio_neto ?? ''));
  const [enganche, setEnganche] = useState(String(cliente?.enganche ?? ''));
  const [numCuotas, setNumCuotas] = useState(String(cliente?.num_cuotas ?? ''));
  const [valorCuota, setValorCuota] = useState(String(cliente?.valor_cuota ?? ''));
  const [fechaDeposito, setFechaDeposito] = useState(cliente?.fecha_deposito ?? today);
  const [numTransferencia, setNumTransferencia] = useState(cliente?.num_transferencia ?? '');
  const [entidad, setEntidad] = useState<Entidad | ''>(cliente?.entidad_bancaria ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        nombre_comprador: nombre,
        email: email || null,
        telefono: telefono || null,
        descripcion_lote: descLote || null,
        precio_neto: Number(precioNeto),
        enganche: Number(enganche),
        num_cuotas: Number(numCuotas),
        valor_cuota: Number(valorCuota),
        fecha_deposito: fechaDeposito,
        num_transferencia: numTransferencia || null,
        entidad_bancaria: entidad || null,
      };
      if (cliente) {
        await api.clientes.update(cliente.id, body);
      } else {
        await api.clientes.create(body);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {cliente ? 'Editar Cliente' : 'Registrar Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del Comprador *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej. Juan Pérez"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Email + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              <p className="text-xs text-gray-400 mt-1">Recibirá confirmaciones de pago</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. 5555-1234"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del Lote</label>
            <input type="text" value={descLote} onChange={e => setDescLote(e.target.value)} placeholder="Ej. Manzana A, Lote 12 — 120m²"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Precio + Enganche */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio Neto (Q) *</label>
              <input type="number" step="0.01" value={precioNeto} onChange={e => setPrecioNeto(e.target.value)} required placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enganche (Q) *</label>
              <input type="number" step="0.01" value={enganche} onChange={e => setEnganche(e.target.value)} required placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>

          {/* Cuotas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Número de Cuotas *</label>
              <input type="number" min="1" value={numCuotas} onChange={e => setNumCuotas(e.target.value)} required placeholder="Ej. 96"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor por Cuota (Q) *</label>
              <input type="number" step="0.01" value={valorCuota} onChange={e => setValorCuota(e.target.value)} required placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>

          {/* Fecha depósito */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Depósito *</label>
            <input type="date" value={fechaDeposito} onChange={e => setFechaDeposito(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Transferencia + Entidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° de Transferencia</label>
              <input type="text" value={numTransferencia} onChange={e => setNumTransferencia(e.target.value)} placeholder="Ej. 00123456"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entidad Bancaria</label>
              <select value={entidad} onChange={e => setEntidad(e.target.value as Entidad | '')}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
                <option value="">— Seleccionar —</option>
                <option>Banrural</option>
                <option>Industrial</option>
                <option>G&T</option>
                <option>BAC</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.clientes.list();
      setClientes(data);
    } catch {
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = clientes.filter(c =>
    c.nombre_comprador.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion_lote ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );

  function openNew() { setEditCliente(null); setModal(true); }
  function openEdit(c: Cliente) { setEditCliente(c); setModal(true); }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.clientes.delete(id);
      load();
    } catch (e: any) {
      alert(e.message ?? 'Error al eliminar');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de compradores y sus lotes</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o descripción de lote..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Comprador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Lote</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Precio Neto</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Enganche</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Cuotas</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Valor/Cuota</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Entidad</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">
                  {busqueda ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}
                </td></tr>
              ) : filtrados.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre_comprador}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{c.descripcion_lote ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(c.precio_neto)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(c.enganche)}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{c.num_cuotas}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(c.valor_cuota)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.entidad_bancaria ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#d4a843] hover:bg-amber-50 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ClienteModal
          cliente={editCliente}
          onClose={() => setModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
