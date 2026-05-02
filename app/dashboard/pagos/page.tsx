'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────── */
type EstadoPago = 'pagado' | 'pendiente' | 'vencido';

interface Pago {
  id: number;
  propietario_nombre: string;
  lote_clave: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  estado: EstadoPago;
  contrato_id: number;
  propietario_id: number;
}

/* ── Badge ──────────────────────────────────────────────────── */
const BADGE: Record<EstadoPago, string> = {
  pagado:    'bg-green-50 text-green-700 border border-green-200',
  pendiente: 'bg-gray-100 text-gray-600 border border-gray-200',
  vencido:   'bg-red-50 text-red-600 border border-red-200',
};

const ESTADO_LABEL: Record<EstadoPago, string> = {
  pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido',
};

/* ── Modal Registrar / Editar Pago ──────────────────────────── */
function PagoModal({
  pago,
  onClose,
  onSaved,
}: {
  pago: Pago | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [contratoId, setContratoId] = useState(String(pago?.contrato_id ?? ''));
  const [propietarioId, setPropietarioId] = useState(String(pago?.propietario_id ?? ''));
  const [monto, setMonto] = useState(String(pago?.monto ?? ''));
  const [fechaVencimiento, setFechaVencimiento] = useState(pago?.fecha_vencimiento ?? '');
  const [fechaPago, setFechaPago] = useState(pago?.fecha_pago ?? '');
  const [metodo, setMetodo] = useState(pago?.metodo_pago ?? 'Transferencia');
  const [estado, setEstado] = useState<EstadoPago>(pago?.estado ?? 'pendiente');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        contrato_id: Number(contratoId),
        propietario_id: Number(propietarioId),
        monto: Number(monto),
        fecha_vencimiento: fechaVencimiento,
        fecha_pago: fechaPago || undefined,
        metodo_pago: metodo,
        estado,
      };
      if (pago) {
        await api.pagos.update(pago.id, body);
      } else {
        await api.pagos.create(body);
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{pago ? 'Editar Pago' : 'Registrar Pago'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ID Contrato</label>
              <input type="number" value={contratoId} onChange={e => setContratoId(e.target.value)} placeholder="1" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ID Propietario</label>
              <input type="number" value={propietarioId} onChange={e => setPropietarioId(e.target.value)} placeholder="1" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
              <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pago</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
                <option>Transferencia</option>
                <option>Efectivo</option>
                <option>Depósito</option>
                <option>Cheque</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Pago</label>
              <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Vencimiento</label>
              <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as EstadoPago)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function GestionPagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'Todos' | EstadoPago>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [editPago, setEditPago] = useState<Pago | null>(null);

  const TABS: Array<'Todos' | EstadoPago> = ['Todos', 'pagado', 'pendiente', 'vencido'];

  const load = useCallback(async () => {
    setLoading(true);
    try { setPagos(await api.pagos.list()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar este pago?')) return;
    try { await api.pagos.delete(id); await load(); }
    catch (e: any) { alert(e.message ?? 'Error'); }
  }

  const pagosFiltrados = pagos.filter((p) => {
    const matchFiltro = filtro === 'Todos' || p.estado === filtro;
    const matchBusqueda =
      busqueda === '' ||
      p.propietario_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.lote_clave.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusqueda;
  });

  const iniciales = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <>
      {modal && (
        <PagoModal
          pago={editPago}
          onClose={() => { setModal(false); setEditPago(null); }}
          onSaved={load}
        />
      )}

      <div className="space-y-5 max-w-screen-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Pagos</h1>
            <p className="text-sm text-gray-500">Registro y seguimiento de pagos de propietarios</p>
          </div>
          <button
            onClick={() => { setEditPago(null); setModal(true); }}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Registrar Pago
          </button>
        </div>

        {/* Filters + Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFiltro(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filtro === tab
                      ? 'bg-[#fdf3d9] text-[#92700a] font-semibold'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar propietario o lote..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Cargando pagos...</div>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium">ID</th>
                  <th className="px-5 py-3 text-left font-medium">Propietario</th>
                  <th className="px-5 py-3 text-left font-medium">Lote</th>
                  <th className="px-5 py-3 text-right font-medium">Monto</th>
                  <th className="px-5 py-3 text-left font-medium">Vencimiento</th>
                  <th className="px-5 py-3 text-left font-medium">Fecha Pago</th>
                  <th className="px-5 py-3 text-left font-medium">Método</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((pago) => (
                  <tr key={pago.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0">
                    <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">PAG-{String(pago.id).padStart(3, '0')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-[10px] font-bold shrink-0">
                          {iniciales(pago.propietario_nombre)}
                        </div>
                        <span className="font-medium text-gray-900 whitespace-nowrap">{pago.propietario_nombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{pago.lote_clave}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">${Number(pago.monto).toLocaleString('es-MX')}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{pago.fecha_vencimiento}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{pago.fecha_pago ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{pago.metodo_pago ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE[pago.estado]}`}>
                        {ESTADO_LABEL[pago.estado]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setEditPago(pago); setModal(true); }}
                          title="Editar" className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(pago.id)}
                          title="Eliminar" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {pagosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                      No se encontraron pagos con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Mostrando {pagosFiltrados.length} de {pagos.length} registros</span>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">← Anterior</button>
              <button className="px-3 py-1.5 rounded-lg bg-[#fdf3d9] text-[#92700a] font-semibold">1</button>
              <button className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Siguiente →</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
