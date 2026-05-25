'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { isReadOnly } from '@/lib/auth';
import { useUploadThing } from '@/lib/uploadthing';
import { useDialog } from '@/lib/useDialog';

/* ── Types ─────────────────────────────────────────────────── */
interface Cliente {
  id: number;
  nombre_comprador: string;
  descripcion_lote: string | null;
  num_cuotas: number;
  valor_cuota: number;
}

interface Pago {
  id: number;
  cliente_id: number | null;
  cliente_nombre_comprador: string | null;
  cliente_descripcion_lote: string | null;
  cliente_num_cuotas: number | null;
  num_cuota: number | null;
  propietario_nombre: string;
  lote_clave: string;
  monto: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  metodo_pago: string | null;
  referencia: string | null;
  descripcion: string | null;
  comprobante_url: string | null;
  contrato_id: number | null;
  propietario_id: number | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n);

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guatemala' }).format(d);
};

/* ── ClienteSelector ────────────────────────────────────────── */
function ClienteSelector({
  clientes,
  selected,
  onChange,
}: {
  clientes: Cliente[];
  selected: Cliente | null;
  onChange: (c: Cliente | null) => void;
}) {
  const [query, setQuery] = useState(selected?.nombre_comprador ?? '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = clientes.filter(c =>
    c.nombre_comprador.toLowerCase().includes(query.toLowerCase()) ||
    (c.descripcion_lote ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  function select(c: Cliente) {
    setQuery(c.nombre_comprador);
    onChange(c);
    setOpen(false);
  }

  function clear() {
    setQuery('');
    onChange(null);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente por nombre o lote..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
        />
        {selected && (
          <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(c => (
            <li key={c.id}>
              <button type="button" onClick={() => select(c)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 transition-colors">
                <p className="font-medium text-gray-900">{c.nombre_comprador}</p>
                {c.descripcion_lote && <p className="text-xs text-gray-500 truncate">{c.descripcion_lote}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-sm text-gray-400">
          Sin resultados
        </div>
      )}
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────── */
function PagoModal({
  pago,
  onClose,
  onSaved,
}: {
  pago: Pago | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [monto, setMonto] = useState(String(pago?.monto ?? ''));
  const [metodo, setMetodo] = useState(pago?.metodo_pago ?? 'Transferencia');
  const [referencia, setReferencia] = useState(pago?.referencia ?? '');
  const [descripcion, setDescripcion] = useState(pago?.descripcion ?? '');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(pago?.comprobante_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert, DialogJSX: PagoDialogJSX } = useDialog();

  const { startUpload } = useUploadThing('comprobantePago', {
    onUploadBegin: () => setUploading(true),
    onClientUploadComplete: (res) => {
      setUploading(false);
      if (res?.[0]) setComprobanteUrl(res[0].ufsUrl);
    },
    onUploadError: () => {
      setUploading(false);
      showAlert('Error al subir el archivo');
    },
  });
  const [fechaPago, setFechaPago] = useState(
    pago?.fecha_pago ?? new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.clientes.list().then((data: any[]) => {
      setClientes(data);
      if (pago?.cliente_id) {
        const found = data.find((c: any) => c.id === pago.cliente_id) ?? null;
        setClienteSel(found);
      }
    }).catch(() => {});
  }, [pago?.cliente_id]);

  useEffect(() => {
    if (clienteSel && !pago) {
      setMonto(String(clienteSel.valor_cuota));
    }
  }, [clienteSel, pago]);

  // Saldo pendiente del cliente seleccionado (consultado al plan de amortización)
  const [saldoPendiente, setSaldoPendiente] = useState<{ total: number; cuotas: number } | null>(null);
  useEffect(() => {
    if (!clienteSel || pago) { setSaldoPendiente(null); return; }
    let cancelled = false;
    api.amortizacion.getPlan(clienteSel.id)
      .then((data) => {
        if (cancelled) return;
        const pendientes = (data.plan ?? []).filter((c: any) => !c.pago && !c.estaCubierta);
        const total = pendientes.reduce((s: number, c: any) => s + Number(c.cuotaReferencial), 0);
        setSaldoPendiente({ total, cuotas: pendientes.length });
      })
      .catch(() => setSaldoPendiente(null));
    return () => { cancelled = true; };
  }, [clienteSel, pago]);

  // Detección: si monto >= saldo pendiente total → ofrecer liquidar
  const montoNum = Number(monto);
  const sugerirLiquidar = !pago && saldoPendiente != null && saldoPendiente.cuotas > 1
    && montoNum > 0 && montoNum >= saldoPendiente.total;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Si el monto cubre el saldo total y hay > 1 cuota pendiente, ejecutar liquidación
      if (sugerirLiquidar && clienteSel) {
        await api.amortizacion.liquidar(clienteSel.id, {
          metodo_pago:     metodo,
          referencia:      referencia || null,
          descripcion:     descripcion || 'Liquidación anticipada',
          comprobante_url: comprobanteUrl ?? null,
          fecha_pago:      fechaPago,
        });
      } else {
        const body = {
          cliente_id: clienteSel?.id ?? null,
          contrato_id: pago?.contrato_id ?? null,
          propietario_id: pago?.propietario_id ?? null,
          monto: Number(monto),
          fecha_vencimiento: fechaPago,
          fecha_pago: fechaPago,
          metodo_pago: metodo,
          referencia: referencia || null,
          descripcion: descripcion || null,
          comprobante_url: comprobanteUrl ?? null,
          estado: 'pagado',
        };
        if (pago) {
          await api.pagos.update(pago.id, body);
        } else {
          await api.pagos.create(body);
        }
      }
      onSaved();
      onClose();
    } catch (err: any) {
      showAlert(err.message ?? 'Error al guardar');
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
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <ClienteSelector clientes={clientes} selected={clienteSel} onChange={setClienteSel} />
          </div>

          {clienteSel && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 space-y-0.5">
              {clienteSel.descripcion_lote && (
                <p><span className="font-semibold">Lote:</span> {clienteSel.descripcion_lote}</p>
              )}
              <p>
                <span className="font-semibold">Cuotas totales:</span> {clienteSel.num_cuotas}
                {' · '}
                <span className="font-semibold">Valor c/u:</span> {fmt(clienteSel.valor_cuota)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago *</label>
            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} required
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            {fechaPago < new Date().toISOString().split('T')[0] && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Estás registrando un pago con fecha retroactiva</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto (Q) *</label>
              <input type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} onWheel={e => e.currentTarget.blur()} placeholder="0.00" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              {clienteSel && saldoPendiente && saldoPendiente.cuotas > 0 && !pago && (
                <p className="text-xs text-gray-400 mt-1">
                  Saldo pendiente: <span className="font-mono text-gray-700">{fmt(saldoPendiente.total)}</span> · {saldoPendiente.cuotas} cuota{saldoPendiente.cuotas === 1 ? '' : 's'}
                </p>
              )}
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

          {(metodo === 'Cheque' || metodo === 'Depósito') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {metodo === 'Cheque' ? 'Número de Referencia' : 'Número de Boleta'}
              </label>
              <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                placeholder={metodo === 'Cheque' ? 'Ej. CHQ-001234' : 'Ej. BOL-567890'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej. Pago de cuota 3 — abono extra"
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Comprobante de pago */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Comprobante de pago</label>
            {comprobanteUrl ? (
              <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-xl px-3 py-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-green-700 font-medium underline truncate flex-1">
                  Ver comprobante
                </a>
                <button type="button" onClick={() => setComprobanteUrl(null)}
                  className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const { compressImageIfLarge } = await import('@/lib/compressImage');
                      const toUpload = await compressImageIfLarge(file);
                      await startUpload([toUpload]);
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#d4a843] hover:bg-amber-50 text-gray-500 hover:text-[#b8922e] rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Subir imagen o PDF
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-1">Imagen o PDF · máx. 8 MB</p>
              </>
            )}
          </div>

          {sugerirLiquidar && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-900">
              <p className="font-semibold">Se detectó liquidación anticipada</p>
              <p className="text-xs text-emerald-700 mt-1">
                El monto cubre las {saldoPendiente?.cuotas} cuotas pendientes ({fmt(saldoPendiente?.total ?? 0)}).
                Al guardar, todas las cuotas restantes se marcarán como pagadas.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                sugerirLiquidar ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#d4a843] hover:bg-[#b8922e]'
              }`}>
              {saving ? 'Guardando...' : (sugerirLiquidar ? 'Liquidar terreno' : 'Guardar Pago')}
            </button>
          </div>
        </form>
      </div>
      {PagoDialogJSX}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function GestionPagosPage() {
  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [editPago, setEditPago] = useState<Pago | null>(null);
  const { showAlert, showConfirm, DialogJSX } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try { setPagos(await api.pagos.list()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!await showConfirm('¿Eliminar este pago?', { description: 'Esta acción no se puede deshacer.', danger: true, confirmLabel: 'Eliminar' })) return;
    try { await api.pagos.delete(id); await load(); }
    catch (err: any) { showAlert(err.message ?? 'Error'); }
  }

  const pagosFiltrados = pagos.filter((p) => {
    const q = busqueda.toLowerCase();
    return q === '' ||
      (p.cliente_nombre_comprador ?? '').toLowerCase().includes(q) ||
      (p.cliente_descripcion_lote ?? '').toLowerCase().includes(q) ||
      p.propietario_nombre.toLowerCase().includes(q);
  });

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Pagos</h1>
            <p className="text-sm text-gray-500">Registro y seguimiento de pagos por cliente</p>
          </div>
          <button
            onClick={() => { setEditPago(null); setModal(true); }}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
            style={{ display: readOnly ? 'none' : undefined }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Registrar Pago
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Buscar cliente o lote..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843] w-full sm:w-64" />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Cargando pagos...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3 text-left font-medium">ID</th>
                    <th className="px-5 py-3 text-left font-medium">Cliente</th>
                    <th className="px-5 py-3 text-left font-medium">Lote</th>
                    <th className="px-5 py-3 text-center font-medium">Cuota N°</th>
                    <th className="px-5 py-3 text-right font-medium">Monto</th>
                    <th className="px-5 py-3 text-left font-medium">Fecha</th>
                    <th className="px-5 py-3 text-left font-medium">Método</th>
                    <th className="px-5 py-3 text-center font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                        {busqueda ? 'Sin resultados para la búsqueda' : 'No hay pagos registrados'}
                      </td>
                    </tr>
                  ) : pagosFiltrados.map((pago) => (
                    <tr key={pago.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0">
                      <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">PAG-{String(pago.id).padStart(3, '0')}</td>

                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {pago.cliente_nombre_comprador ?? pago.propietario_nombre}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[160px] truncate">
                        {pago.cliente_descripcion_lote ?? pago.lote_clave}
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-700 font-mono text-xs">
                        {pago.num_cuota != null
                          ? `${pago.num_cuota}${pago.cliente_num_cuotas ? ' / ' + pago.cliente_num_cuotas : ''}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmt(pago.monto)}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{fmtDate(pago.fecha_pago ?? pago.fecha_vencimiento)}</td>
                      <td className="px-5 py-3.5 text-gray-500">{pago.metodo_pago ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          {!readOnly && (
                          <button onClick={() => { setEditPago(pago); setModal(true); }} title="Editar"
                            className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          )}
                          {!readOnly && (
                          <button onClick={() => handleDelete(pago.id)} title="Eliminar"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Cargando pagos...</div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {busqueda ? 'Sin resultados para la búsqueda' : 'No hay pagos registrados'}
              </div>
            ) : pagosFiltrados.map(pago => (
              <div key={pago.id} className="border-b border-gray-100 last:border-0 px-4 py-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{pago.cliente_nombre_comprador ?? pago.propietario_nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pago.cliente_descripcion_lote ?? pago.lote_clave ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!readOnly && (
                    <button onClick={() => { setEditPago(pago); setModal(true); }} title="Editar"
                      className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    )}
                    {!readOnly && (
                    <button onClick={() => handleDelete(pago.id)} title="Eliminar"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-gray-400">Monto: </span><span className="font-bold text-gray-900">{fmt(pago.monto)}</span></div>
                  <div><span className="text-gray-400">Cuota: </span><span className="font-mono text-gray-700">{pago.num_cuota != null ? `${pago.num_cuota}${pago.cliente_num_cuotas ? ' / ' + pago.cliente_num_cuotas : ''}` : '—'}</span></div>
                  <div><span className="text-gray-400">Fecha: </span><span className="text-gray-700">{fmtDate(pago.fecha_pago ?? pago.fecha_vencimiento)}</span></div>
                  <div><span className="text-gray-400">Método: </span><span className="text-gray-700">{pago.metodo_pago ?? '—'}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Mostrando {pagosFiltrados.length} de {pagos.length} registros</span>
          </div>
        </div>
      </div>
      {DialogJSX}
    </>
  );
}
