'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Eye, X } from 'lucide-react';
import { isReadOnly } from '@/lib/auth';
import { useDialog } from '@/lib/useDialog';

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
  cuota_inicio: number;
  fecha_deposito: string;
  num_transferencia: string | null;
  metodo_pago: string | null;
  entidad_bancaria: Entidad | null;
  activo: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n);

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── DetalleModal ───────────────────────────────────────────── */
function DetalleModal({ cliente, onClose, onPagoActualizado }: {
  cliente: Cliente;
  onClose: () => void;
  onPagoActualizado: () => void;
}) {
  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagoEditando, setPagoEditando] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const { showAlert, DialogJSX: DetalleDialogJSX } = useDialog();

  const cargarPagos = useCallback(async () => {
    setLoading(true);
    try {
      const all: any[] = await api.pagos.list();
      setPagos(all.filter((p: any) => p.cliente_id === cliente.id));
    } catch { setPagos([]); }
    finally { setLoading(false); }
  }, [cliente.id]);

  useEffect(() => { cargarPagos(); }, [cargarPagos]);

  const pagados   = pagos.filter((p: any) => p.estado === 'pagado');
  const totalPagado   = pagados.reduce((s: number, p: any) => s + Number(p.monto), 0);
  const saldoPendiente = Math.max(0, (cliente.precio_neto - cliente.enganche) - totalPagado);

  async function marcarPagado(p: any, datos: { monto: number; fecha_pago: string; metodo_pago: string; referencia: string }) {
    setSaving(true);
    try {
      await api.pagos.update(p.id, {
        monto:        datos.monto,
        fecha_pago:   datos.fecha_pago,
        metodo_pago:  datos.metodo_pago,
        referencia:   datos.referencia || null,
        estado:       'pagado',
        fecha_vencimiento: p.fecha_vencimiento,
      });
      setPagoEditando(null);
      await cargarPagos();
      onPagoActualizado();
    } catch (e: any) { showAlert(e.message ?? 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{cliente.nombre_comprador}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{cliente.descripcion_lote ?? '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-5">
          {/* Resumen financiero */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Total pagado</p>
              <p className="font-bold text-green-700 text-sm">{fmt(totalPagado)}</p>
              <p className="text-xs text-gray-400">{pagados.length} de {cliente.num_cuotas - (cliente.cuota_inicio - 1)} cuotas</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Saldo pendiente</p>
              <p className="font-bold text-amber-700 text-sm">{fmt(saldoPendiente)}</p>
              <p className="text-xs text-gray-400">{pagos.filter((p:any)=>p.estado==='pendiente').length} cuotas por pagar</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Precio neto</p>
              <p className="font-bold text-gray-700 text-sm">{fmt(cliente.precio_neto)}</p>
              <p className="text-xs text-gray-400">Enganche: {fmt(cliente.enganche)}</p>
            </div>
          </div>

          {/* Info cliente */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Fecha depósito</span>
              <span className="font-medium text-gray-700">{fmtDate(cliente.fecha_deposito)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Entidad bancaria</span>
              <span className="font-medium text-gray-700">{cliente.entidad_bancaria ?? '—'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">N° transferencia</span>
              <span className="font-medium text-gray-700">{cliente.num_transferencia ?? '—'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Valor por cuota</span>
              <span className="font-medium text-gray-700">{fmt(cliente.valor_cuota)}</span>
            </div>
          </div>

          {/* Calendario de cuotas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Calendario de cuotas</h3>
            {loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Cargando...</p>
            ) : pagos.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin cuotas generadas</p>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs">Cuota</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 text-xs">Vencimiento</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 text-xs">Monto</th>
                      <th className="text-center px-3 py-2 font-semibold text-gray-600 text-xs">Estado</th>
                      {!readOnly && <th className="px-3 py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...pagos]
                      .sort((a: any, b: any) => (a.num_cuota ?? 0) - (b.num_cuota ?? 0))
                      .map((p: any) => (
                        <tr key={p.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-3 py-2 text-gray-700 font-medium">#{p.num_cuota ?? '—'}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{fmtDate(p.fecha_pago ?? p.fecha_vencimiento)}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(Number(p.monto))}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.estado === 'pagado'   ? 'bg-green-100 text-green-700' :
                              p.estado === 'vencido'  ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {p.estado}
                            </span>
                          </td>
                          {!readOnly && (
                            <td className="px-3 py-2 text-center">
                              {p.estado !== 'pagado' && (
                                <button
                                  onClick={() => setPagoEditando(p)}
                                  className="text-xs text-[#b8922e] font-semibold hover:underline"
                                >
                                  Pagar
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini-modal para registrar pago */}
      {pagoEditando && (
        <PagarCuotaModal
          pago={pagoEditando}
          saving={saving}
          onClose={() => setPagoEditando(null)}
          onConfirm={marcarPagado}
        />
      )}
      {DetalleDialogJSX}
    </div>
  );
}

/* ── PagarCuotaModal ────────────────────────────────────────── */
function PagarCuotaModal({ pago, saving, onClose, onConfirm }: {
  pago: any;
  saving: boolean;
  onClose: () => void;
  onConfirm: (p: any, datos: { monto: number; fecha_pago: string; metodo_pago: string; referencia: string }) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [monto, setMonto]       = useState(String(pago.monto));
  const [fecha, setFecha]       = useState(pago.fecha_vencimiento?.slice(0, 10) ?? today);
  const [metodo, setMetodo]     = useState('Transferencia');
  const [referencia, setRef]    = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          Registrar pago — Cuota #{pago.num_cuota}
        </h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monto (Q) *</label>
            <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago *</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} max={today}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
              <option>Transferencia</option>
              <option>Efectivo</option>
              <option>Depósito</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
            <input type="text" value={referencia} onChange={e => setRef(e.target.value)} placeholder="Opcional"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" disabled={saving || !monto || !fecha}
            onClick={() => onConfirm(pago, { monto: Number(monto), fecha_pago: fecha, metodo_pago: metodo, referencia })}
            className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [cuotaInicio, setCuotaInicio] = useState(String(cliente?.cuota_inicio ?? 1));
  const [fechaDeposito, setFechaDeposito] = useState(
    (cliente?.fecha_deposito ?? today).slice(0, 10)
  );
  const [metodo, setMetodo] = useState(cliente?.metodo_pago ?? 'Transferencia');
  const [numTransferencia, setNumTransferencia] = useState(cliente?.num_transferencia ?? '');
  const [entidad, setEntidad] = useState<Entidad | ''>(cliente?.entidad_bancaria ?? '');
  const [saving, setSaving] = useState(false);
  const { showAlert, DialogJSX: ClienteDialogJSX } = useDialog();

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
        cuota_inicio: Number(cuotaInicio) || 1,
        fecha_deposito: fechaDeposito,
        num_transferencia: numTransferencia || null,
        metodo_pago: metodo || null,
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
      showAlert(e.message ?? 'Error al guardar');
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono *</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej. 5555-1234" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del Lote *</label>
            <input type="text" value={descLote} onChange={e => setDescLote(e.target.value)} placeholder="Ej. Manzana A, Lote 12 — 120m²" required
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

          {/* Cuota inicio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuota de inicio</label>
            <input type="number" min="1" value={cuotaInicio} onChange={e => setCuotaInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            <p className="text-xs text-gray-400 mt-1">Si el cliente ya tenía cuotas antes del sistema, indica desde cuál número empieza. Por defecto: 1</p>
          </div>

          {/* Fecha depósito */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Depósito *</label>
            <input type="date" value={fechaDeposito} onChange={e => setFechaDeposito(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Método de Pago */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entidad Bancaria *</label>
              <select value={entidad} onChange={e => setEntidad(e.target.value as Entidad | '')} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
                <option value="">— Seleccionar —</option>
                <option>Banrural</option>
                <option>Industrial</option>
                <option>G&T</option>
                <option>BAC</option>
              </select>
            </div>
          </div>

          {/* Referencia dinámica según método */}
          {metodo !== 'Efectivo' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {metodo === 'Cheque' ? 'Número de Referencia' : metodo === 'Depósito' ? 'Número de Boleta' : 'N° de Transferencia'}
              </label>
              <input type="text" value={numTransferencia} onChange={e => setNumTransferencia(e.target.value)}
                placeholder={metodo === 'Cheque' ? 'Ej. CHQ-001234' : metodo === 'Depósito' ? 'Ej. BOL-567890' : 'Ej. 00123456'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          )}

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
      {ClienteDialogJSX}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagosMap, setPagosMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [detalleCliente, setDetalleCliente] = useState<Cliente | null>(null);
  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const { showAlert, showConfirm, DialogJSX } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, pagos] = await Promise.all([api.clientes.list(), api.pagos.list()]);
      setClientes(data);
      const map: Record<number, number> = {};
      for (const p of pagos) {
        if (p.estado === 'pagado') {
          map[p.cliente_id] = (map[p.cliente_id] ?? 0) + Number(p.monto);
        }
      }
      setPagosMap(map);
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
    if (!await showConfirm('¿Eliminar este cliente?', { description: 'Se eliminarán también todos sus pagos registrados.', danger: true, confirmLabel: 'Eliminar' })) return;
    try {
      await api.clientes.delete(id);
      load();
    } catch (e: any) {
      showAlert(e.message ?? 'Error al eliminar');
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
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
          style={{ display: readOnly ? 'none' : undefined }}
        >
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
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[160px]">Avance de pago</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">
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
                    {(() => {
                      const cuotasPagadas = pagosMap[c.id] ?? 0;
                      const totalAbonado  = c.enganche + cuotasPagadas;
                      const saldo         = Math.max(0, c.precio_neto - totalAbonado);
                      const pct           = Math.min(100, c.precio_neto > 0 ? (totalAbonado / c.precio_neto) * 100 : 0);
                      return (
                        <div className="flex flex-col gap-1 min-w-[150px]">
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 font-medium">{fmt(totalAbonado)}</span>
                            <span className="text-gray-400">{fmt(c.precio_neto)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-red-500 font-medium">Debe: {fmt(saldo)}</p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setDetalleCliente(c)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Ver detalle">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#d4a843] hover:bg-amber-50 transition-colors"
                        style={{ display: readOnly ? 'none' : undefined }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                        style={{ display: readOnly ? 'none' : undefined }}
                      >
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

        {/* Mobile cards */}
        <div className="md:hidden">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              {busqueda ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}
            </div>
          ) : filtrados.map(c => (
            <div key={c.id} className="border-b border-gray-100 last:border-0 px-4 py-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{c.nombre_comprador}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.descripcion_lote ?? '—'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setDetalleCliente(c)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50" title="Ver detalle">
                    <Eye size={14} />
                  </button>
                  {!readOnly && (
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#d4a843] hover:bg-amber-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  {!readOnly && (
                    <button onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-gray-400">Precio neto: </span><span className="font-mono font-medium text-gray-800">{fmt(c.precio_neto)}</span></div>
                <div><span className="text-gray-400">Enganche: </span><span className="font-mono font-medium text-gray-800">{fmt(c.enganche)}</span></div>
                <div><span className="text-gray-400">Cuotas: </span><span className="font-medium text-gray-800">{c.num_cuotas} × {fmt(c.valor_cuota)}</span></div>
                <div><span className="text-gray-400">Entidad: </span><span className="text-gray-700">{c.entidad_bancaria ?? '—'}</span></div>
              </div>
              {/* Barra de avance */}
              {(() => {
                const cuotasPagadas = pagosMap[c.id] ?? 0;
                const totalAbonado  = c.enganche + cuotasPagadas;
                const saldo         = Math.max(0, c.precio_neto - totalAbonado);
                const pct           = Math.min(100, c.precio_neto > 0 ? (totalAbonado / c.precio_neto) * 100 : 0);
                return (
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600 font-medium">Pagado: {fmt(totalAbonado)}</span>
                      <span className="text-red-500 font-medium">Debe: {fmt(saldo)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 text-right">{Math.round(pct)}% completado</p>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <ClienteModal
          cliente={editCliente}
          onClose={() => setModal(false)}
          onSaved={load}
        />
      )}
      {detalleCliente && (
        <DetalleModal
          cliente={detalleCliente}
          onClose={() => setDetalleCliente(null)}
          onPagoActualizado={load}
        />
      )}
      {DialogJSX}
    </div>
  );
}
