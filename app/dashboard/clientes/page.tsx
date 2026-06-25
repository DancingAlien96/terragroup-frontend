'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { Eye, X, TableProperties, RefreshCw, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { isReadOnly } from '@/lib/auth';
import { useDialog } from '@/lib/useDialog';
import { LIMITS } from '@/lib/schemaLimits';
import { uploadFile, resolveFileUrl } from '@/lib/uploadFile';

/* ── Types ─────────────────────────────────────────────────── */
type Entidad = 'Banrural' | 'Industrial' | 'GT' | 'BAC';

interface Cliente {
  id: number;
  nombre_comprador: string;
  nit: string | null;
  email: string | null;
  telefono: string | null;
  descripcion_lote: string | null;
  precio_neto: number;
  enganche: number;
  tasa_anual: number;
  num_cuotas: number;
  valor_cuota: number;
  cuota_inicio: number;
  fecha_deposito: string;
  num_transferencia: string | null;
  metodo_pago: string | null;
  entidad_bancaria: Entidad | null;
  comprobante_enganche_url: string | null;
  activo: boolean;
}

/** PMT estándar (idéntico al backend). Devuelve cuota mensual referencial. */
function pmtMensual(montoFinanciado: number, tasaAnual: number, numCuotas: number): number {
  if (montoFinanciado <= 0 || numCuotas <= 0) return 0;
  if (tasaAnual === 0) return montoFinanciado / numCuotas;
  const años = numCuotas / 12;
  const cuotaAnual = (montoFinanciado * tasaAnual) / (1 - Math.pow(1 + tasaAnual, -años));
  return cuotaAnual / 12;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n);

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── PlanModal: tabla de amortización ───────────────────────── */
function PlanModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const [loading, setLoading] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [plan, setPlan] = useState<any[]>([]);
  const [resumen, setResumen] = useState<{ totalAbonosExtra: number; cuotasCubiertas: number }>({ totalAbonosExtra: 0, cuotasCubiertas: 0 });
  const [liquidando, setLiquidando] = useState(false);
  const [showLiquidar, setShowLiquidar] = useState(false);
  const [liqMetodo, setLiqMetodo] = useState('Transferencia');
  const [liqReferencia, setLiqReferencia] = useState('');
  const [liqDescripcion, setLiqDescripcion] = useState('Liquidación anticipada');
  const [liqComprobanteUrl, setLiqComprobanteUrl] = useState<string | null>(null);
  const [liqUploading, setLiqUploading] = useState(false);
  const { showAlert, showConfirm, DialogJSX: PlanDialogJSX } = useDialog();

  async function subirComprobanteLiq(file: File) {
    setLiqUploading(true);
    try {
      const { url } = await uploadFile(file);
      setLiqComprobanteUrl(url);
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al subir el comprobante');
    } finally {
      setLiqUploading(false);
    }
  }

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.amortizacion.getPlan(cliente.id);
      setPlan(data.plan ?? []);
      setResumen(data.resumen ?? { totalAbonosExtra: 0, cuotasCubiertas: 0 });
    } catch (e: any) {
      showAlert(e.message ?? 'Error al cargar el plan');
      setPlan([]);
      setResumen({ totalAbonosExtra: 0, cuotasCubiertas: 0 });
    } finally {
      setLoading(false);
    }
  }, [cliente.id, showAlert]);

  useEffect(() => { cargar(); }, [cargar]);

  // Cuotas que aún no tienen pago y no están cubiertas por abonos
  const cuotasPendientes = plan.filter(c => !c.pago && !c.estaCubierta);
  const saldoPorLiquidar = cuotasPendientes.reduce((s, c) => s + Number(c.cuotaReferencial), 0);

  async function handleLiquidar() {
    setLiquidando(true);
    try {
      const res = await api.amortizacion.liquidar(cliente.id, {
        metodo_pago:     liqMetodo,
        referencia:      liqReferencia || null,
        descripcion:     liqDescripcion || 'Liquidación anticipada',
        comprobante_url: liqComprobanteUrl,
      });
      showAlert(`${res.creados} cuotas liquidadas por ${fmt(Number(res.totalLiquidado))}`, 'success');
      setShowLiquidar(false);
      setLiqComprobanteUrl(null);
      await cargar();
    } catch (e: any) {
      showAlert(e.message ?? 'Error al liquidar');
    } finally {
      setLiquidando(false);
    }
  }

  async function handleRegenerar() {
    if (!await showConfirm('¿Regenerar el plan?', {
      description: 'Se recalcularán todas las cuotas con los términos actuales. Los pagos registrados no se modifican.',
      confirmLabel: 'Regenerar',
    })) return;
    setRegenerando(true);
    try {
      await api.amortizacion.regenerar(cliente.id);
      await cargar();
    } catch (e: any) {
      showAlert(e.message ?? 'Error al regenerar');
    } finally {
      setRegenerando(false);
    }
  }

  const totales = plan.reduce(
    (acc, c) => ({
      cuota:   acc.cuota   + Number(c.cuotaReferencial),
      capital: acc.capital + Number(c.capitalReferencial),
      interes: acc.interes + Number(c.interesReferencial),
    }),
    { cuota: 0, capital: 0, interes: 0 },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[95vw] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Plan de pagos</h2>
            <p className="text-xs text-gray-500 mt-0.5">{cliente.nombre_comprador} · {cliente.descripcion_lote ?? '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 py-4 bg-amber-50/40 border-b border-gray-100 text-xs">
          <div><p className="text-gray-500">Precio</p><p className="font-mono font-semibold text-gray-900">{fmt(cliente.precio_neto)}</p></div>
          <div><p className="text-gray-500">Enganche</p><p className="font-mono font-semibold text-gray-900">{fmt(cliente.enganche)}</p></div>
          <div><p className="text-gray-500">Tasa anual</p><p className="font-mono font-semibold text-gray-900">{(Number(cliente.tasa_anual) * 100).toFixed(2)}%</p></div>
          <div><p className="text-gray-500">Plazo</p><p className="font-mono font-semibold text-gray-900">{cliente.num_cuotas} meses</p></div>
          <div><p className="text-gray-500">Cuota mensual</p><p className="font-mono font-semibold text-[#b8922e]">{fmt(cliente.valor_cuota)}</p></div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Cargando plan...</p>
          ) : plan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <TableProperties size={32} className="text-gray-300" />
              <p className="text-sm text-gray-500">Este cliente aún no tiene plan de cuotas generado</p>
              {!readOnly && (
                <button onClick={handleRegenerar} disabled={regenerando}
                  className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-60">
                  <RefreshCw size={14} className={regenerando ? 'animate-spin' : ''} />
                  {regenerando ? 'Generando...' : 'Generar plan'}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500 uppercase tracking-wide sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-2 font-medium">Mes</th>
                  <th className="text-left  py-2 px-2 font-medium">Vence</th>
                  <th className="text-left  py-2 px-2 font-medium">Fecha pago</th>
                  <th className="text-left  py-2 px-2 font-medium">Descripción</th>
                  <th className="text-left  py-2 px-2 font-medium">F. Pago</th>
                  <th className="text-right py-2 px-2 font-medium">Cuota Mensual</th>
                  <th className="text-right py-2 px-2 font-medium">Capital</th>
                  <th className="text-right py-2 px-2 font-medium">Intereses</th>
                  <th className="text-right py-2 px-2 font-medium">Extra</th>
                  <th className="text-right py-2 px-2 font-medium">Saldo</th>
                  <th className="text-center py-2 px-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((c) => {
                  const estado    = c.pago?.estado ?? null;
                  const formaPago = c.pago?.metodoPago ?? '';
                  const descPago  = c.pago?.descripcion ?? '';
                  const fechaPago = c.pago?.fechaPago ?? null;

                  // Calcular días de atraso (mora) comparando fechaPago vs fechaVencimiento.
                  // Si aún no se paga y ya pasó la fecha → atraso = días desde vencimiento hasta hoy.
                  const venceMs = new Date(c.fechaVencimiento).getTime();
                  const refMs   = fechaPago ? new Date(fechaPago).getTime() : Date.now();
                  const diasAtraso = Math.max(0, Math.floor((refMs - venceMs) / (1000 * 60 * 60 * 24)));
                  const pagadoTarde = fechaPago != null && diasAtraso > 0;
                  const vencidoSinPago = fechaPago == null && diasAtraso > 0;

                  let label = estado ?? 'sin pago';
                  let colorEstado = 'bg-gray-50 text-gray-400';
                  if (c.estaCubierta) {
                    label = 'cubierta por abono';
                    colorEstado = 'bg-blue-50 text-blue-700';
                  } else if (fechaPago) {
                    if (pagadoTarde) {
                      label = `pagado · ${diasAtraso}d tarde`;
                      colorEstado = 'bg-yellow-50 text-yellow-800';
                    } else {
                      label = 'pagado a tiempo';
                      colorEstado = 'bg-emerald-50 text-emerald-700';
                    }
                  } else if (vencidoSinPago) {
                    label = `vencido · ${diasAtraso}d`;
                    colorEstado = 'bg-red-50 text-red-700';
                  } else if (estado === 'pendiente') {
                    label = 'pendiente';
                    colorEstado = 'bg-amber-50 text-amber-700';
                  }

                  const extra        = Number(c.abonoExtra ?? 0);
                  const saldoMostrar = Number(c.saldoAjustado ?? c.saldoReferencial);
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-1.5 px-2 text-gray-600">{c.numCuota}</td>
                      <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">{fmtDate(c.fechaVencimiento)}</td>
                      <td className="py-1.5 px-2 text-gray-700 whitespace-nowrap">{fechaPago ? fmtDate(fechaPago) : '—'}</td>
                      <td className="py-1.5 px-2 text-gray-500">{descPago || '—'}</td>
                      <td className="py-1.5 px-2 text-gray-700">{formaPago || '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-800">{fmt(Number(c.cuotaReferencial))}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-600">{fmt(Number(c.capitalReferencial))}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-600">{fmt(Number(c.interesReferencial))}</td>
                      <td className={`py-1.5 px-2 text-right font-mono ${extra > 0 ? 'text-blue-600 font-semibold' : 'text-gray-300'}`}>{extra > 0 ? fmt(extra) : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-gray-500">{fmt(saldoMostrar)}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${colorEstado}`}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-gray-800 border-t-2 border-gray-300">
                  <td colSpan={5} className="py-2 px-2">Totales</td>
                  <td className="py-2 px-2 text-right font-mono">{fmt(totales.cuota)}</td>
                  <td className="py-2 px-2 text-right font-mono">{fmt(totales.capital)}</td>
                  <td className="py-2 px-2 text-right font-mono">{fmt(totales.interes)}</td>
                  <td className="py-2 px-2 text-right font-mono text-blue-600">{resumen.totalAbonosExtra > 0 ? fmt(resumen.totalAbonosExtra) : '—'}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {plan.length} cuotas · {cuotasPendientes.length} pendiente{cuotasPendientes.length === 1 ? '' : 's'}
            {cuotasPendientes.length > 0 && ` · saldo ${fmt(saldoPorLiquidar)}`}
          </p>
          <div className="flex gap-2">
            {cuotasPendientes.length > 0 && !readOnly && (
              <button onClick={() => setShowLiquidar(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2 rounded-xl transition-colors">
                <CheckCircle2 size={13} />
                Liquidar saldo
              </button>
            )}
            {plan.length > 0 && !readOnly && (
              <button onClick={handleRegenerar} disabled={regenerando}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-60">
                <RefreshCw size={13} className={regenerando ? 'animate-spin' : ''} />
                {regenerando ? 'Regenerando...' : 'Regenerar'}
              </button>
            )}
            <button onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs px-4 py-2 rounded-xl transition-colors">
              Cerrar
            </button>
          </div>
        </div>

        {/* Sub-modal: liquidación */}
        {showLiquidar && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Liquidar saldo del terreno</h3>
                <button onClick={() => setShowLiquidar(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-4 text-sm">
                <p className="text-gray-700">
                  Se cancelarán <span className="font-bold">{cuotasPendientes.length}</span> cuotas pendientes
                  por un total de <span className="font-bold text-emerald-700">{fmt(saldoPorLiquidar)}</span>.
                </p>
                <p className="text-xs text-gray-500 mt-1">Todas las cuotas restantes se marcarán como pagadas con la descripción que indiques.</p>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Método de Pago</label>
                  <select value={liqMetodo} onChange={e => setLiqMetodo(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option>Transferencia</option>
                    <option>Efectivo</option>
                    <option>Depósito</option>
                    <option>Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Referencia / N° comprobante</label>
                  <input type="text" value={liqReferencia} onChange={e => setLiqReferencia(e.target.value)} placeholder="Opcional"
                    maxLength={LIMITS.pago.referencia}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <input type="text" value={liqDescripcion} onChange={e => setLiqDescripcion(e.target.value)}
                    maxLength={LIMITS.pago.descripcion}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Comprobante de pago</label>
                  {liqComprobanteUrl ? (
                    <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2.5">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <a href={resolveFileUrl(liqComprobanteUrl)} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-emerald-700 font-medium underline truncate flex-1">
                        Ver comprobante
                      </a>
                      <button type="button" onClick={() => setLiqComprobanteUrl(null)}
                        className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-500 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors">
                      {liqUploading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Subir imagen o PDF
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await subirComprobanteLiq(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Imagen o PDF · máx. 8 MB</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button type="button" onClick={() => setShowLiquidar(false)} disabled={liquidando || liqUploading}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={handleLiquidar} disabled={liquidando || liqUploading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60">
                  {liquidando ? 'Liquidando...' : 'Confirmar liquidación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {PlanDialogJSX}
      </div>
    </div>
  );
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
  // Saldo del financiamiento = (cuotas × valor cuota) - cuotas ya pagadas.
  // Si hay intereses, valorCuota los incluye, por eso no usamos precio_neto.
  const saldoPendiente = Math.max(0, (cliente.num_cuotas * cliente.valor_cuota) - totalPagado);

  async function marcarPagado(p: any, datos: { monto: number; fecha_pago: string; metodo_pago: string; referencia: string; comprobante_url: string | null }) {
    setSaving(true);
    try {
      await api.pagos.update(p.id, {
        monto:           datos.monto,
        fecha_pago:      datos.fecha_pago,
        metodo_pago:     datos.metodo_pago,
        referencia:      datos.referencia || null,
        comprobante_url: datos.comprobante_url,
        estado:          'pagado',
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
                      <th className="px-3 py-2"></th>
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
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {/* Si está pagado y tiene comprobante → ver/descargar */}
                            {p.estado === 'pagado' && p.comprobante_url && (
                              <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer"
                                title="Ver comprobante"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Comprobante
                              </a>
                            )}
                            {p.estado === 'pagado' && !p.comprobante_url && (
                              <span className="text-[10px] text-gray-300 italic">sin comprobante</span>
                            )}
                            {!readOnly && p.estado !== 'pagado' && (
                              <button
                                onClick={() => setPagoEditando(p)}
                                className="text-xs text-[#b8922e] font-semibold hover:underline"
                              >
                                Pagar
                              </button>
                            )}
                          </td>
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
  onConfirm: (p: any, datos: { monto: number; fecha_pago: string; metodo_pago: string; referencia: string; comprobante_url: string | null }) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [monto, setMonto]       = useState(String(pago.monto));
  const [fecha, setFecha]       = useState(pago.fecha_vencimiento?.slice(0, 10) ?? today);
  const [metodo, setMetodo]     = useState('Transferencia');
  const [referencia, setRef]    = useState('');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(pago.comprobante_url ?? null);
  const [uploading, setUploading] = useState(false);
  const { showAlert: showAlertCuota, DialogJSX: PagarDialogJSX } = useDialog();

  async function subirComprobanteCuota(file: File) {
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      setComprobanteUrl(url);
    } catch (e: any) {
      showAlertCuota(e?.message ?? 'Error al subir el archivo. Verifica que sea imagen o PDF.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">
            Registrar pago — Cuota #{pago.num_cuota}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto (Q) *</label>
              <input type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} onWheel={e => e.currentTarget.blur()} required
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
                maxLength={LIMITS.pago.referencia}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comprobante de pago</label>
              {comprobanteUrl ? (
                <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <a href={resolveFileUrl(comprobanteUrl)} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-green-700 font-medium underline truncate flex-1">
                    Ver comprobante
                  </a>
                  <button type="button" onClick={() => setComprobanteUrl(null)}
                    className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-500 cursor-pointer hover:border-[#d4a843] hover:bg-amber-50 transition-colors">
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Subir imagen o PDF
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await subirComprobanteCuota(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-gray-400 mt-1">Opcional · imagen o PDF · máx. 8 MB</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose} disabled={saving || uploading}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" disabled={saving || uploading || !monto || !fecha}
            onClick={() => onConfirm(pago, { monto: Number(monto), fecha_pago: fecha, metodo_pago: metodo, referencia, comprobante_url: comprobanteUrl })}
            className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {saving ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
        {PagarDialogJSX}
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
  const [nit, setNit] = useState(cliente?.nit ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [descLote, setDescLote] = useState(cliente?.descripcion_lote ?? '');
  const [precioNeto, setPrecioNeto] = useState(String(cliente?.precio_neto ?? ''));
  const [enganche, setEnganche] = useState(String(cliente?.enganche ?? ''));
  const [tasaAnualPct, setTasaAnualPct] = useState(() => {
    const t = cliente?.tasa_anual;
    if (t == null) return '';
    // Redondea a 4 decimales para evitar drift de coma flotante (0.1 * 100 = 10.0000…02)
    const pct = Number((Number(t) * 100).toFixed(4));
    return String(pct);
  });
  // Plazo en años: lo que el admin teclea. Cuotas = años × 12 (derivado).
  const [plazoAnios, setPlazoAnios] = useState(() => {
    const n = cliente?.num_cuotas;
    if (!n) return '';
    // Si los datos heredados no son múltiplo de 12, redondea al alza
    return String(Math.ceil(n / 12));
  });
  const cuotasNum  = Number(plazoAnios) * 12;
  const [valorCuota, setValorCuota] = useState(String(cliente?.valor_cuota ?? ''));

  // Auto-calcular cuota cuando hay tasa anual definida (campos requeridos).
  const tasaNum    = Number(tasaAnualPct) / 100;
  const precioNum  = Number(precioNeto);
  const engancheNum = Number(enganche);
  const cuotaAuto  = tasaNum > 0 && precioNum > 0 && cuotasNum > 0
    ? pmtMensual(precioNum - engancheNum, tasaNum, cuotasNum)
    : null;
  useEffect(() => {
    if (cuotaAuto != null) setValorCuota(cuotaAuto.toFixed(2));
  }, [cuotaAuto]);
  const [cuotaInicio, setCuotaInicio] = useState(String(cliente?.cuota_inicio ?? 1));
  const [fechaDeposito, setFechaDeposito] = useState(
    (cliente?.fecha_deposito ?? today).slice(0, 10)
  );
  // Normaliza método (la BD a veces tiene "transferencia" en lowercase, el form usa "Transferencia")
  const metodoOptions = ['Transferencia', 'Efectivo', 'Depósito', 'Cheque'];
  const normMetodo = (raw: string | null | undefined) =>
    metodoOptions.find(o => o.toLowerCase() === (raw ?? '').toLowerCase()) ?? 'Transferencia';
  const [metodo, setMetodo] = useState(normMetodo(cliente?.metodo_pago));
  const [numTransferencia, setNumTransferencia] = useState(cliente?.num_transferencia ?? '');
  const [entidad, setEntidad] = useState<Entidad | ''>(cliente?.entidad_bancaria ?? '');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(cliente?.comprobante_enganche_url ?? null);
  const [uploadingCompro, setUploadingCompro] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert, DialogJSX: ClienteDialogJSX } = useDialog();

  const tieneEnganche = engancheNum > 0;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCompro(true);
    try {
      const { url } = await uploadFile(file);
      setComprobanteUrl(url);
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al subir el archivo. Verifica que sea PDF o imagen.');
    } finally {
      setUploadingCompro(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        nombre_comprador: nombre,
        nit: nit.trim() || null,
        email: email || null,
        telefono: telefono || null,
        descripcion_lote: descLote || null,
        precio_neto: Number(precioNeto),
        enganche: enganche === '' ? 0 : Number(enganche),
        tasa_anual: tasaAnualPct ? Number(tasaAnualPct) / 100 : 0,
        num_cuotas: cuotasNum,
        valor_cuota: Number(valorCuota),
        cuota_inicio: Number(cuotaInicio) || 1,
        fecha_deposito: fechaDeposito,
        // Solo enviar campos de pago del enganche si hay enganche
        comprobante_enganche_url: tieneEnganche ? (comprobanteUrl ?? null) : null,
        num_transferencia: tieneEnganche ? (numTransferencia || null) : null,
        metodo_pago: tieneEnganche ? (metodo || null) : null,
        entidad_bancaria: tieneEnganche ? (entidad || null) : null,
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
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required maxLength={100} placeholder="Ej. Juan Pérez"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Email + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={150} placeholder="cliente@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              <p className="text-xs text-gray-400 mt-1">Recibirá confirmaciones de pago</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono *</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} maxLength={20} placeholder="Ej. 5555-1234" required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
          </div>

          {/* NIT (opcional) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIT (opcional)</label>
            <input type="text" value={nit} onChange={e => setNit(e.target.value)} maxLength={20} placeholder="Ej. 1234567-8 o CF"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del Lote *</label>
            <input type="text" value={descLote} onChange={e => setDescLote(e.target.value)} maxLength={255} placeholder="Ej. Manzana A, Lote 12 — 120m²" required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Precio + Enganche */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio Neto (Q) *</label>
              <input type="number" step="0.01" min="0" value={precioNeto} onChange={e => setPrecioNeto(e.target.value)} onWheel={e => e.currentTarget.blur()} required placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Enganche (Q)</label>
              <input type="number" step="0.01" min="0" value={enganche} onChange={e => setEnganche(e.target.value)} onWheel={e => e.currentTarget.blur()} placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              <p className="text-xs text-gray-400 mt-1">Dejar vacío o 0 si no hay enganche</p>
            </div>
          </div>

          {/* Tasa anual + Plazo en años */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tasa Anual de Interés (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={tasaAnualPct} onChange={e => setTasaAnualPct(e.target.value)} onWheel={e => e.currentTarget.blur()} placeholder="Ej. 10"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              <p className="text-xs text-gray-400 mt-1">Dejar vacío o 0 para venta sin intereses</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plazo (años) *</label>
              <input type="number" min="1" step="1" value={plazoAnios} onChange={e => setPlazoAnios(e.target.value)} onWheel={e => e.currentTarget.blur()} required placeholder="Ej. 5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
              <p className="text-xs text-gray-400 mt-1">
                {cuotasNum > 0 ? `= ${cuotasNum} cuotas mensuales` : 'El sistema calculará las cuotas mensuales'}
              </p>
            </div>
          </div>

          {/* Valor cuota */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Valor por Cuota (Q) *
              {cuotaAuto != null && <span className="ml-2 text-[#b8922e] font-normal">(calculado automáticamente)</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorCuota}
              onChange={e => setValorCuota(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              required
              placeholder="0.00"
              readOnly={cuotaAuto != null}
              className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] ${cuotaAuto != null ? 'bg-gray-50 text-gray-600' : ''}`}
            />
          </div>

          {/* Cuota inicio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuota de inicio</label>
            <input type="number" min="1" value={cuotaInicio} onChange={e => setCuotaInicio(e.target.value)} onWheel={e => e.currentTarget.blur()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
            <p className="text-xs text-gray-400 mt-1">Si el cliente ya tenía cuotas antes del sistema, indica desde cuál número empieza. Por defecto: 1</p>
          </div>

          {/* Fecha depósito / Fecha de inicio */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {tieneEnganche ? 'Fecha de Depósito *' : 'Fecha de inicio del contrato *'}
            </label>
            <input type="date" value={fechaDeposito} onChange={e => setFechaDeposito(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
          </div>

          {/* Datos del pago del enganche — solo si hay enganche */}
          {tieneEnganche && (
            <>
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
                    <option value="Banrural">Banrural</option>
                    <option value="Industrial">Industrial</option>
                    <option value="GT">G&T</option>
                    <option value="BAC">BAC</option>
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
                    maxLength={LIMITS.venta.numTransferencia}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]" />
                </div>
              )}

              {/* Comprobante del enganche */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Comprobante del enganche</label>
                {comprobanteUrl ? (
                  <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-xl px-3 py-2.5">
                    <FileText size={14} className="text-green-600 shrink-0" />
                    <a href={resolveFileUrl(comprobanteUrl)} target="_blank" rel="noopener noreferrer"
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
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cliente-comprobante-input"
                    />
                    <label htmlFor="cliente-comprobante-input"
                      className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-500 cursor-pointer hover:border-[#d4a843] hover:bg-amber-50 transition-colors">
                      {uploadingCompro ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          Subir imagen o PDF
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-400 mt-1">Imagen o PDF · máx. 8 MB</p>
                  </>
                )}
              </div>
            </>
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
  const [planCliente, setPlanCliente] = useState<Cliente | null>(null);
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
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Cuotas</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Valor/Cuota</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[160px]">Avance de pago</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                  {busqueda ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados'}
                </td></tr>
              ) : filtrados.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre_comprador}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{c.descripcion_lote ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{c.num_cuotas}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(c.valor_cuota)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const cuotasPagadas = pagosMap[c.id] ?? 0;
                      const totalAbonado  = c.enganche + cuotasPagadas;
                      const totalContrato = c.enganche + (c.num_cuotas * c.valor_cuota);
                      const saldo         = Math.max(0, totalContrato - totalAbonado);
                      const pct           = Math.min(100, totalContrato > 0 ? (totalAbonado / totalContrato) * 100 : 0);
                      return (
                        <div className="flex flex-col gap-1 min-w-[150px]">
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 font-medium">{fmt(totalAbonado)}</span>
                            <span className="text-gray-400">{fmt(totalContrato)}</span>
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
                      <button onClick={() => setPlanCliente(c)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-[#b8922e] hover:bg-amber-50 transition-colors" title="Plan de pagos">
                        <TableProperties size={14} />
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
                  <button onClick={() => setPlanCliente(c)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-[#b8922e] hover:bg-amber-50" title="Plan de pagos">
                    <TableProperties size={14} />
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
                const totalContrato = c.enganche + (c.num_cuotas * c.valor_cuota);
                const saldo         = Math.max(0, totalContrato - totalAbonado);
                const pct           = Math.min(100, totalContrato > 0 ? (totalAbonado / totalContrato) * 100 : 0);
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
      {planCliente && (
        <PlanModal
          cliente={planCliente}
          onClose={() => setPlanCliente(null)}
        />
      )}
      {DialogJSX}
    </div>
  );
}
