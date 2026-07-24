'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layers, Plus, MapPin, MoreVertical, Edit2, Trash2, Power, X, AlertCircle, MapPinned, ImageUp, Sparkles, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser, isReadOnly } from '@/lib/auth';
import { useDialog } from '@/lib/useDialog';
import { LIMITS } from '@/lib/schemaLimits';
import { fmtDate } from '@/lib/fmtDate';
import { uploadFile, resolveFileUrl } from '@/lib/uploadFile';

interface Proyecto {
  id:           number;
  empresa_id:   number;
  nombre:       string;
  descripcion:  string | null;
  ubicacion:    string | null;
  portada_url:  string | null;
  activo:       boolean;
  total_lotes:  number;
  created_at:   string;
  updated_at:   string;
}

interface Limites {
  actuales:    number;
  permitidos:  number;
  puede_crear: boolean;
}

export default function ProyectosPage() {
  const readOnly    = typeof window !== 'undefined' ? isReadOnly() : false;
  const tieneCroquis = typeof window !== 'undefined' ? !!getStoredUser()?.tiene_croquis : false;
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [proyectos, setProyectos]     = useState<Proyecto[]>([]);
  const [limites,   setLimites]       = useState<Limites | null>(null);
  const [loading,   setLoading]       = useState(true);
  const [modal,     setModal]         = useState(false);
  const [editing,   setEditing]       = useState<Proyecto | null>(null);
  const [menuOpen,  setMenuOpen]      = useState<number | null>(null);
  const [comprando, setComprando]     = useState(false);
  // Estado del banner post-checkout: mensaje + tipo (esperando / exito / error).
  const [postCheckout, setPostCheckout] = useState<null | {
    tipo: 'confirmando' | 'exito' | 'cancelado';
    permitidosAlInicio: number;
  }>(null);
  const { showAlert, showConfirm, DialogJSX } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, lim] = await Promise.all([
        api.proyectos.list(),
        api.proyectos.limites(),
      ]);
      setProyectos(list as Proyecto[]);
      setLimites(lim as Limites);
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { load(); }, [load]);

  /* ── Post-checkout: llegada desde Recurrente con ?extra=exito ────────
     El webhook puede tardar unos segundos; hacemos polling silencioso
     del contador de límites hasta que el `permitidos` aumente, o rendimos
     después de 30s con instrucción de refrescar. */
  useEffect(() => {
    const q = searchParams.get('extra');
    if (!q) return;
    if (q === 'cancelado') {
      setPostCheckout({ tipo: 'cancelado', permitidosAlInicio: limites?.permitidos ?? 0 });
      router.replace('/dashboard/proyectos');
      return;
    }
    if (q === 'exito' && limites) {
      setPostCheckout({ tipo: 'confirmando', permitidosAlInicio: limites.permitidos });
      router.replace('/dashboard/proyectos');
    }
  }, [searchParams, limites, router]);

  // Polling: cuando estamos confirmando, chequeamos límites cada 3s hasta
  // que suba (o rendimos a los 30s).
  useEffect(() => {
    if (postCheckout?.tipo !== 'confirmando') return;
    let intentos = 0;
    const int = setInterval(async () => {
      intentos++;
      try {
        const lim = await api.proyectos.limites();
        setLimites(lim as Limites);
        if ((lim as Limites).permitidos > postCheckout.permitidosAlInicio) {
          setPostCheckout({ tipo: 'exito', permitidosAlInicio: postCheckout.permitidosAlInicio });
          clearInterval(int);
        } else if (intentos >= 10) {
          clearInterval(int);
        }
      } catch { /* silencioso */ }
    }, 3000);
    return () => clearInterval(int);
  }, [postCheckout]);

  async function handleComprarProyectoExtra() {
    if (readOnly) return;
    if (!await showConfirm('¿Comprar un proyecto extra?', {
      description: 'Se agregará $50 USD/mes al cobro recurrente de tu suscripción. Podrás crear un proyecto más de inmediato.',
      confirmLabel: 'Continuar al pago',
    })) return;
    setComprando(true);
    try {
      const res = await api.empresas.comprarProyectoExtra();
      window.location.href = res.checkout_url;
    } catch (e: any) {
      showAlert(e?.message ?? 'No se pudo iniciar el pago');
      setComprando(false);
    }
  }

  // Cierra el menú de acciones al hacer click afuera
  useEffect(() => {
    if (menuOpen === null) return;
    const onDoc = () => setMenuOpen(null);
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [menuOpen]);

  function openNew() { setEditing(null); setModal(true); }
  function openEdit(p: Proyecto) { setEditing(p); setModal(true); setMenuOpen(null); }

  async function handleToggleActivo(p: Proyecto) {
    setMenuOpen(null);
    if (!await showConfirm(
      p.activo ? `¿Desactivar "${p.nombre}"?` : `¿Reactivar "${p.nombre}"?`,
      {
        description: p.activo
          ? 'Los lotes existentes siguen visibles pero no podrás agregar nuevos hasta reactivarlo.'
          : 'El proyecto volverá a estar disponible para nuevos lotes.',
        confirmLabel: p.activo ? 'Desactivar' : 'Reactivar',
      },
    )) return;
    try {
      await api.proyectos.update(p.id, { activo: !p.activo });
      load();
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al actualizar');
    }
  }

  async function handleDelete(p: Proyecto) {
    setMenuOpen(null);
    if (!await showConfirm(`¿Eliminar "${p.nombre}"?`, {
      description: p.total_lotes > 0
        ? `Este proyecto tiene ${p.total_lotes} lote(s). Debes eliminarlos antes o desactivarlo en vez de borrarlo.`
        : 'Esta acción no se puede deshacer.',
      danger: true, confirmLabel: 'Eliminar',
    })) return;
    try {
      await api.proyectos.delete(p.id);
      load();
    } catch (e: any) {
      showAlert(e?.message ?? 'No se pudo eliminar');
    }
  }

  const usadoPct = limites && limites.permitidos > 0
    ? Math.round((limites.actuales / limites.permitidos) * 100)
    : 0;

  return (
    <>
      {modal && (
        <ProyectoModal
          proyecto={editing}
          onClose={() => { setModal(false); setEditing(null); }}
          onSaved={() => { setModal(false); setEditing(null); load(); }}
        />
      )}

      <div className="space-y-6 max-w-screen-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Proyectos</h1>
            <p className="text-sm text-gray-500">Terrenos divididos en lotes que gestiona tu empresa</p>
          </div>
          {!readOnly && (
            <button
              onClick={openNew}
              disabled={loading || (limites !== null && !limites.puede_crear)}
              title={limites && !limites.puede_crear ? 'Alcanzaste el límite de tu plan' : ''}
              className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nuevo proyecto
            </button>
          )}
        </div>

        {/* Banner post-checkout de Recurrente */}
        {postCheckout?.tipo === 'confirmando' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-full border-2 border-blue-700 border-t-transparent animate-spin"/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-blue-900">Confirmando tu pago…</p>
              <p className="text-xs text-blue-700">Estamos esperando la confirmación de Recurrente. Tu proyecto extra aparecerá en unos segundos.</p>
            </div>
          </div>
        )}
        {postCheckout?.tipo === 'exito' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <Check size={18} strokeWidth={3}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-green-900">¡Proyecto extra activado!</p>
              <p className="text-xs text-green-700">Ya puedes crear un proyecto más. Se cobrará $50 USD/mes junto con tu suscripción.</p>
            </div>
            <button onClick={() => setPostCheckout(null)} className="text-green-700 hover:text-green-900">
              <X size={16}/>
            </button>
          </div>
        )}
        {postCheckout?.tipo === 'cancelado' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle size={18}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900">Pago cancelado</p>
              <p className="text-xs text-amber-700">No se realizó ningún cobro. Puedes intentarlo nuevamente cuando quieras.</p>
            </div>
            <button onClick={() => setPostCheckout(null)} className="text-amber-700 hover:text-amber-900">
              <X size={16}/>
            </button>
          </div>
        )}

        {/* Contador de límites del plan */}
        {limites && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Uso del plan</p>
                <p className="text-2xl font-bold text-[#1a1a1a] mt-1">
                  {limites.actuales}
                  <span className="text-base font-medium text-gray-400 ml-1">/ {limites.permitidos} proyectos</span>
                </p>
              </div>
              {!limites.puede_crear && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg text-xs font-semibold">
                  <AlertCircle size={14} />
                  Límite alcanzado
                </div>
              )}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${usadoPct >= 100 ? 'bg-red-500' : usadoPct >= 80 ? 'bg-amber-500' : 'bg-[#d4a843]'}`}
                style={{ width: `${Math.min(100, usadoPct)}%` }}
              />
            </div>
            {!limites.puede_crear && !readOnly && (
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap bg-[#fdf3d9]/40 border border-[#d4a843]/20 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles size={14} className="text-[#8a6910] shrink-0 mt-0.5"/>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#8a6910]">¿Necesitas un proyecto más?</p>
                    <p className="text-[11px] text-gray-600">Agrega un slot por $50 USD/mes al cobro recurrente.</p>
                  </div>
                </div>
                <button
                  onClick={handleComprarProyectoExtra}
                  disabled={comprando}
                  className="bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={12} strokeWidth={3}/>
                  {comprando ? 'Abriendo pago…' : 'Comprar proyecto extra'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grid de proyectos */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
            Cargando proyectos…
          </div>
        ) : proyectos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[#fdf3d9] flex items-center justify-center mx-auto mb-3">
              <Layers size={26} className="text-[#d4a843]" />
            </div>
            <p className="text-sm font-semibold text-gray-900">No tienes proyectos todavía</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              Un proyecto agrupa los lotes de un terreno. Crea el primero para empezar a registrar clientes.
            </p>
            {!readOnly && (
              <button
                onClick={openNew}
                disabled={limites !== null && !limites.puede_crear}
                className="mt-5 inline-flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold text-sm px-4 py-2 rounded-lg"
              >
                <Plus size={14} strokeWidth={2.5} />
                Crear proyecto
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {proyectos.map((p) => (
              <div
                key={p.id}
                className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  p.activo ? 'border-gray-100' : 'border-gray-200 opacity-70'
                }`}
              >
                {/* Portada (hero) — imagen si existe, gradient placeholder si no */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-[#fdf3d9] via-[#f8e4a8] to-[#d4a843]/40 overflow-hidden">
                  {p.portada_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveFileUrl(p.portada_url)}
                      alt={`Portada de ${p.nombre}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Layers size={40} className="text-[#d4a843]/60"/>
                    </div>
                  )}

                  {/* Lápiz editar — sobre la portada, siempre visible para el dueño */}
                  {!readOnly && (
                    <button
                      onClick={() => openEdit(p)}
                      title="Editar proyecto y portada"
                      className="absolute top-3 right-3 z-10 bg-white/95 hover:bg-white shadow-md text-gray-700 hover:text-[#d4a843] w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Edit2 size={14}/>
                    </button>
                  )}

                  {/* Menú extra (desactivar / eliminar) */}
                  {!readOnly && (
                    <div className="absolute top-3 right-14 z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }}
                        className="bg-white/95 hover:bg-white shadow-md text-gray-500 hover:text-gray-800 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menuOpen === p.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-20"
                        >
                          <button onClick={() => handleToggleActivo(p)}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Power size={12} /> {p.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                          <button onClick={() => handleDelete(p)}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 mt-1 pt-2">
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!p.activo && (
                    <span className="absolute top-3 left-3 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/95 text-white shadow-md">Inactivo</span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-[#1a1a1a] text-base">{p.nombre}</h3>

                  {p.ubicacion && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                      <MapPin size={11} />
                      {p.ubicacion}
                    </p>
                  )}

                  {p.descripcion && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{p.descripcion}</p>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1a1a1a] text-base">{p.total_lotes}</span>
                    <span className="text-gray-500 ml-1">lote{p.total_lotes === 1 ? '' : 's'}</span>
                  </div>
                  <span className="text-gray-400">Creado {fmtDate(p.created_at)}</span>
                </div>

                {tieneCroquis && (
                  <Link
                    href={`/dashboard/proyectos/${p.id}/croquis`}
                    className="block px-5 py-2.5 border-t border-gray-100 text-xs font-semibold text-[#8a6910] hover:bg-[#fdf3d9]/50 transition-colors flex items-center gap-1.5"
                  >
                    <MapPinned size={12}/>
                    Croquis del proyecto
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {DialogJSX}
    </>
  );
}

/* ── Modal Crear/Editar ─────────────────────────────────────── */

function ProyectoModal({
  proyecto, onClose, onSaved,
}: {
  proyecto: Proyecto | null;
  onClose:  () => void;
  onSaved:  () => void;
}) {
  const [form, setForm] = useState({
    nombre:      proyecto?.nombre       ?? '',
    ubicacion:   proyecto?.ubicacion    ?? '',
    descripcion: proyecto?.descripcion  ?? '',
  });
  const [portadaUrl, setPortadaUrl] = useState<string | null>(proyecto?.portada_url ?? null);
  const [uploading,  setUploading]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handlePortada(file: File) {
    setUploading(true); setError('');
    try {
      const up = await uploadFile(file);
      setPortadaUrl(up.url);
    } catch (e: any) {
      setError(e?.message ?? 'Error al subir la portada');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    setSaving(true);
    const body = {
      nombre:      form.nombre.trim(),
      ubicacion:   form.ubicacion.trim() || null,
      descripcion: form.descripcion.trim() || null,
      portada_url: portadaUrl,
    };
    try {
      if (proyecto) await api.proyectos.update(proyecto.id, body);
      else          await api.proyectos.create(body);
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Un proyecto agrupa lotes de un mismo terreno</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Portada */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Portada del proyecto
            </label>
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-gray-200 bg-gradient-to-br from-[#fdf3d9] via-[#f8e4a8] to-[#d4a843]/40">
              {portadaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveFileUrl(portadaUrl)} alt="Portada" className="absolute inset-0 w-full h-full object-cover"/>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers size={32} className="text-[#d4a843]/60"/>
                </div>
              )}
              <label className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs font-semibold py-2 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-black/70 transition-colors">
                <ImageUp size={12}/>
                {uploading ? 'Subiendo…' : portadaUrl ? 'Cambiar portada' : 'Subir portada'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && handlePortada(e.target.files[0])}/>
              </label>
              {portadaUrl && !uploading && (
                <button type="button" onClick={() => setPortadaUrl(null)}
                  title="Quitar portada"
                  className="absolute top-2 right-2 bg-white/95 hover:bg-white text-gray-700 hover:text-red-600 w-7 h-7 rounded-lg flex items-center justify-center shadow">
                  <X size={13}/>
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">JPG, PNG o WebP. Se muestra en el card del proyecto.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Nombre del proyecto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              maxLength={LIMITS.proyecto.nombre}
              placeholder="Ej. Lotificación El Mirador"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Ubicación</label>
            <input
              type="text"
              value={form.ubicacion}
              onChange={(e) => set('ubicacion', e.target.value)}
              maxLength={LIMITS.proyecto.ubicacion}
              placeholder="Ej. Km 25 Carretera al Salvador"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              maxLength={LIMITS.proyecto.descripcion}
              placeholder="Notas o características del proyecto"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl">
              {saving ? 'Guardando…' : proyecto ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
