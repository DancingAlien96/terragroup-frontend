'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ImageUp, MapPin, X, Trash2, Copy, Eye, EyeOff,
  RotateCw, Check, Save, Phone, Mail, MousePointerClick, Lock, Plus,
  Share2, Download, MessageCircle,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { api } from '@/lib/api';
import { uploadFile, resolveFileUrl } from '@/lib/uploadFile';
import { isReadOnly } from '@/lib/auth';
import { useDialog } from '@/lib/useDialog';

type EstadoLote = 'disponible' | 'vendido' | 'reservado';

interface LoteCroquis {
  id:                     number;
  clave:                  string;
  manzana:                string | null;
  numero:                 string | null;
  superficie:             number | null;
  precio_venta:           number | null;
  estado:                 EstadoLote;
  punto_x:                number | null;
  punto_y:                number | null;
  mostrar_precio_publico: boolean;
  notas_publicas:         string | null;
}

interface Croquis {
  id:                number;
  proyecto_id:       number;
  imagen_url:        string;
  imagen_ancho:      number | null;
  imagen_alto:       number | null;
  publico_activo:    boolean;
  publico_token:     string | null;
  contacto_whatsapp: string | null;
  contacto_email:    string | null;
}

interface Proyecto {
  id: number; nombre: string; ubicacion: string | null;
}

const ESTADO_COLOR: Record<EstadoLote, string> = {
  disponible: '#22c55e',
  reservado:  '#f59e0b',
  vendido:    '#ef4444',
};
const ESTADO_LABEL: Record<EstadoLote, string> = {
  disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido',
};

function loteEtiqueta(l: LoteCroquis): string {
  if (l.manzana && l.numero) return `${l.manzana}-${l.numero}`;
  if (l.numero)              return l.numero;
  return l.clave;
}

export default function CroquisEditorPage() {
  const params = useParams<{ id: string }>();
  const proyectoId = Number(params.id);

  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const { showAlert, showConfirm, DialogJSX } = useDialog();

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [croquis,  setCroquis]  = useState<Croquis  | null>(null);
  const [lotes,    setLotes]    = useState<LoteCroquis[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading,setUploading]= useState(false);
  const [addonInactivo, setAddonInactivo] = useState(false);

  // Interacción del canvas
  const [modo,        setModo]        = useState<'ver' | 'colocando' | 'creando'>('ver');
  const [loteAColocar,setLoteAColocar]= useState<LoteCroquis | null>(null);
  const [selPin,      setSelPin]      = useState<number | null>(null);
  const [modalLote,   setModalLote]   = useState<LoteCroquis | null>(null);
  const [contactoOpen,setContactoOpen]= useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);
  // Coordenadas capturadas del click cuando se está creando un nuevo lote —
  // el modal las usa para dejar el pin colocado al terminar.
  const [modalNuevo,  setModalNuevo]  = useState<{ x: number; y: number } | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);

  // Toast auto-dismiss — evita acumular timeouts si el usuario dispara varios
  // guardados seguidos.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);
  const notifyOk  = useCallback((msg: string) => setToast({ msg, kind: 'ok'  }), []);
  const notifyErr = useCallback((msg: string) => setToast({ msg, kind: 'err' }), []);

  const load = useCallback(async () => {
    if (!Number.isFinite(proyectoId)) return;
    setLoading(true);
    try {
      const proy = await api.proyectos.get(proyectoId);
      setProyecto(proy as Proyecto);
      try {
        const data = await api.croquis.getPorProyecto(proyectoId);
        setCroquis((data.croquis ?? null) as Croquis | null);
        setLotes((data.lotes ?? []) as LoteCroquis[]);
        setAddonInactivo(false);
      } catch (e: any) {
        // 402 = add-on croquis no activo para esta empresa. No lo tratamos como
        // error genérico — mostramos pantalla informativa.
        if (typeof e?.message === 'string' && /croquis no está activa|no activo/i.test(e.message)) {
          setAddonInactivo(true);
        } else {
          throw e;
        }
      }
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al cargar el croquis');
    } finally {
      setLoading(false);
    }
  }, [proyectoId, showAlert]);

  useEffect(() => { load(); }, [load]);

  /* ── Subir imagen del croquis ─────────────────────────────── */
  async function handleUploadImagen(file: File) {
    setUploading(true);
    try {
      // Mide dimensiones reales antes de subir — se guardan junto al croquis
      // para que la vista pública pueda dimensionar el contenedor sin flicker.
      const { ancho, alto } = await medirImagen(file);
      const up = await uploadFile(file);
      const c  = await api.croquis.upsert(proyectoId, {
        imagen_url:   up.url,
        imagen_ancho: ancho,
        imagen_alto:  alto,
      });
      setCroquis(c as Croquis);
      notifyOk('Plano guardado');
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  /* ── Colocar / mover pin ─────────────────────────────────── */
  async function handleClickCanvas(e: React.MouseEvent<HTMLDivElement>) {
    if (readOnly) return;
    if (modo === 'ver') return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top)  / box.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    // Modo "creando": abre modal de nuevo lote con las coords capturadas —
    // el pin se coloca cuando el modal termina de crear el lote.
    if (modo === 'creando') {
      setModalNuevo({ x, y });
      setModo('ver');
      return;
    }

    // Modo "colocando": mueve el pin del lote seleccionado.
    if (!loteAColocar) return;
    try {
      const upd = await api.croquis.setPin(loteAColocar.id, { punto_x: x, punto_y: y });
      setLotes(prev => prev.map(l => l.id === upd.id ? { ...l, punto_x: upd.punto_x, punto_y: upd.punto_y } : l));
      setModo('ver'); setLoteAColocar(null);
      notifyOk(`Pin colocado en ${loteEtiqueta(loteAColocar)}`);
    } catch (err: any) {
      showAlert(err?.message ?? 'Error al colocar pin');
    }
  }

  async function handleQuitarPin(lote: LoteCroquis) {
    if (!await showConfirm(`¿Quitar el pin del lote ${loteEtiqueta(lote)}?`, {
      description: 'El lote se conserva pero deja de aparecer en el croquis.',
      danger: false, confirmLabel: 'Quitar pin',
    })) return;
    try {
      const upd = await api.croquis.quitarPin(lote.id);
      setLotes(prev => prev.map(l => l.id === upd.id ? { ...l, punto_x: null, punto_y: null } : l));
      setSelPin(null);
      notifyOk('Pin eliminado');
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al quitar pin');
    }
  }

  /* ── Público on/off ──────────────────────────────────────── */
  async function togglePublico() {
    if (!croquis) return;
    try {
      const c = croquis.publico_activo
        ? await api.croquis.desactivarPublico(croquis.id)
        : await api.croquis.activarPublico(croquis.id);
      setCroquis(c as Croquis);
      notifyOk(c.publico_activo ? 'Vista pública activada' : 'Vista pública desactivada');
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al cambiar visibilidad');
    }
  }

  async function regenerarLink() {
    if (!croquis) return;
    if (!await showConfirm('¿Regenerar el link público?', {
      description: 'El link anterior dejará de funcionar y tendrás que compartir uno nuevo.',
      confirmLabel: 'Regenerar', danger: true,
    })) return;
    try {
      const c = await api.croquis.regenerarToken(croquis.id);
      setCroquis(c as Croquis);
      notifyOk('Link regenerado');
    } catch (e: any) {
      showAlert(e?.message ?? 'Error al regenerar');
    }
  }

  /* ── Render ──────────────────────────────────────────────── */
  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando croquis…</div>;
  }

  if (addonInactivo) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <Link href="/dashboard/proyectos"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#d4a843] mb-4">
          <ArrowLeft size={12}/> Volver a proyectos
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#fdf3d9] flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-[#8a6910]"/>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Croquis no está activo</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            El add-on de croquis interactivo aún no está habilitado para tu cuenta.
            Escríbenos y lo activamos.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
            <a href="mailto:soporte@piums.io?subject=Quiero activar el croquis"
              className="inline-flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-4 py-2.5 rounded-xl">
              <Mail size={14}/> Contactar soporte
            </a>
            <Link href="/dashboard/proyectos"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2.5 rounded-xl">
              Volver
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lotesConPin  = lotes.filter(l => l.punto_x !== null && l.punto_y !== null);
  const lotesSinPin  = lotes.filter(l => l.punto_x === null || l.punto_y === null);

  return (
    <>
      {DialogJSX}

      {modalLote && (
        <LoteEditModal
          lote={modalLote}
          onClose={() => setModalLote(null)}
          onSaved={(l) => {
            setLotes(prev => prev.map(x => x.id === l.id ? l : x));
            setModalLote(null);
            notifyOk(`Cambios guardados en ${loteEtiqueta(l)}`);
          }}
        />
      )}

      {contactoOpen && croquis && (
        <ContactoModal
          croquis={croquis}
          onClose={() => setContactoOpen(false)}
          onSaved={(c) => { setCroquis(c); setContactoOpen(false); notifyOk('Contacto actualizado'); }}
        />
      )}

      {modalNuevo && (
        <NuevoLoteModal
          coords={modalNuevo}
          proyectoId={proyectoId}
          existentes={lotes}
          onClose={() => setModalNuevo(null)}
          onCreated={(nuevo) => {
            setLotes(prev => [...prev, nuevo]);
            setModalNuevo(null);
            notifyOk(`Lote ${loteEtiqueta(nuevo)} creado`);
          }}
        />
      )}

      {shareOpen && croquis?.publico_token && (
        <ShareCroquisModal
          token={croquis.publico_token}
          proyectoNombre={proyecto?.nombre ?? 'Proyecto'}
          onClose={() => setShareOpen(false)}
          onRegenerar={async () => {
            await regenerarLink();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] pointer-events-none">
          <div
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg border animate-[fadeIn_.18s_ease-out] ${
              toast.kind === 'ok'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.kind === 'ok' ? <Check size={14} strokeWidth={3}/> : <X size={14} strokeWidth={3}/>}
            {toast.msg}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/dashboard/proyectos"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#d4a843] mb-2">
              <ArrowLeft size={12} /> Volver a proyectos
            </Link>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Croquis · <span className="text-[#d4a843]">{proyecto?.nombre ?? '—'}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Marca dónde queda cada lote sobre el plano y compártelo con posibles compradores.
            </p>
          </div>

          {croquis && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setContactoOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold border border-gray-200 hover:border-gray-300 text-gray-700 px-3 py-2 rounded-lg"
              >
                <Phone size={14} /> Contacto
              </button>
              <button
                onClick={togglePublico}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                  croquis.publico_activo
                    ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {croquis.publico_activo ? <Eye size={14}/> : <EyeOff size={14}/>}
                {croquis.publico_activo ? 'Público activo' : 'Activar público'}
              </button>
              {croquis.publico_activo && croquis.publico_token && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#d4a843] hover:bg-[#b8922e] text-white px-3 py-2 rounded-lg"
                >
                  <Share2 size={14}/> Compartir
                </button>
              )}
            </div>
          )}
        </div>

        {/* Área principal: sin croquis → uploader; con croquis → canvas + sidebar */}
        {!croquis ? (
          <UploaderVacio uploading={uploading} onUpload={handleUploadImagen} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-4">
            {/* Canvas */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {modo === 'colocando' && loteAColocar && (
                <div className="bg-[#fdf3d9] border-b border-[#d4a843]/30 px-4 py-2.5 flex items-center gap-2 text-sm">
                  <MousePointerClick size={14} className="text-[#8a6910]"/>
                  <span className="text-[#8a6910] font-semibold">
                    Coloca el pin del lote <b>{loteEtiqueta(loteAColocar)}</b> haciendo click sobre el plano
                  </span>
                  <button onClick={() => { setModo('ver'); setLoteAColocar(null); }}
                    className="ml-auto text-xs text-[#8a6910] hover:underline">
                    Cancelar
                  </button>
                </div>
              )}
              {modo === 'creando' && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm">
                  <Plus size={14} className="text-blue-700"/>
                  <span className="text-blue-700 font-semibold">
                    Haz click sobre el plano donde quieres crear el nuevo lote
                  </span>
                  <button onClick={() => setModo('ver')}
                    className="ml-auto text-xs text-blue-700 hover:underline">
                    Cancelar
                  </button>
                </div>
              )}

              <CanvasCroquis
                imagenUrl={croquis.imagen_url}
                imagenAncho={croquis.imagen_ancho}
                imagenAlto={croquis.imagen_alto}
                lotes={lotesConPin}
                modo={modo}
                selPin={selPin}
                onClick={handleClickCanvas}
                onPinClick={(id) => { setSelPin(id); const l = lotes.find(x => x.id === id); if (l) setModalLote(l); }}
              />

              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span><b className="text-gray-800">{lotesConPin.length}</b> con pin</span>
                  <span><b className="text-gray-800">{lotesSinPin.length}</b> sin pin</span>
                  <span className="text-gray-300">·</span>
                  <LegendDot color={ESTADO_COLOR.disponible} label="Disponible" />
                  <LegendDot color={ESTADO_COLOR.reservado}  label="Reservado" />
                  <LegendDot color={ESTADO_COLOR.vendido}    label="Vendido" />
                </div>
                {!readOnly && (
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#d4a843] cursor-pointer">
                    <ImageUp size={12}/> Cambiar imagen
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUploadImagen(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>

            {/* Sidebar de lotes */}
            <SidebarLotes
              lotes={lotes}
              readOnly={readOnly}
              modo={modo}
              onSelectPin={(id) => { setSelPin(id); const l = lotes.find(x => x.id === id); if (l) setModalLote(l); }}
              onColocar={(l) => { setLoteAColocar(l); setModo('colocando'); }}
              onQuitarPin={handleQuitarPin}
              onNuevoLote={() => setModo('creando')}
            />
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Uploader vacío                                              */

function UploaderVacio({ uploading, onUpload }: { uploading: boolean; onUpload: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onUpload(f);
      }}
      className={`bg-white rounded-2xl border-2 border-dashed p-16 text-center transition-colors ${
        drag ? 'border-[#d4a843] bg-[#fdf3d9]/30' : 'border-gray-200'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#fdf3d9] flex items-center justify-center mx-auto mb-4">
        <ImageUp size={28} className="text-[#d4a843]"/>
      </div>
      <h3 className="text-lg font-bold text-gray-900">Sube el plano del proyecto</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mt-1.5">
        Una imagen del croquis o mapa de tu lotificación (JPG, PNG o WebP hasta 12 MB).
        Después vas a colocar un pin sobre cada lote.
      </p>
      <label className="inline-flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-xl mt-5 cursor-pointer">
        <ImageUp size={14}/>
        {uploading ? 'Subiendo…' : 'Seleccionar imagen'}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Canvas: imagen + pins                                        */

function CanvasCroquis({
  imagenUrl, imagenAncho, imagenAlto, lotes, modo, selPin, onClick, onPinClick,
}: {
  imagenUrl: string;
  imagenAncho: number | null;
  imagenAlto:  number | null;
  lotes: LoteCroquis[];
  modo: 'ver' | 'colocando' | 'creando';
  selPin: number | null;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPinClick: (id: number) => void;
}) {
  const aspect = imagenAncho && imagenAlto ? imagenAncho / imagenAlto : undefined;
  const clickeable = modo === 'colocando' || modo === 'creando';

  return (
    <div
      className={`relative w-full bg-gray-50 select-none ${clickeable ? 'cursor-crosshair' : ''}`}
      style={{ aspectRatio: aspect }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveFileUrl(imagenUrl)}
        alt="Croquis del proyecto"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {lotes.map((l) => (
        <PinLote
          key={l.id}
          lote={l}
          selected={selPin === l.id}
          onClick={(e) => { e.stopPropagation(); onPinClick(l.id); }}
        />
      ))}
    </div>
  );
}

function PinLote({ lote, selected, onClick }: {
  lote: LoteCroquis; selected: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  const color = ESTADO_COLOR[lote.estado];
  return (
    <button
      onClick={onClick}
      className={`absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110 ${selected ? 'z-30 scale-110' : 'z-20'}`}
      style={{ left: `${(lote.punto_x ?? 0) * 100}%`, top: `${(lote.punto_y ?? 0) * 100}%` }}
      title={`Lote ${loteEtiqueta(lote)} · ${ESTADO_LABEL[lote.estado]}`}
    >
      <svg width="28" height="34" viewBox="0 0 28 34" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
        <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 20 14 20s14-9.5 14-20C28 6.27 21.73 0 14 0z" fill={color}/>
        <circle cx="14" cy="14" r="9" fill="white"/>
        <text x="14" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
          {(lote.numero ?? lote.clave ?? '').slice(0, 3)}
        </text>
      </svg>
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ background: color }}/>
      <span>{label}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Sidebar de lotes                                             */

function SidebarLotes({
  lotes, readOnly, modo, onSelectPin, onColocar, onQuitarPin, onNuevoLote,
}: {
  lotes: LoteCroquis[];
  readOnly: boolean;
  modo: 'ver' | 'colocando' | 'creando';
  onSelectPin: (id: number) => void;
  onColocar: (l: LoteCroquis) => void;
  onQuitarPin: (l: LoteCroquis) => void;
  onNuevoLote: () => void;
}) {
  const [tab, setTab] = useState<'sin' | 'con'>('sin');
  const conPin = lotes.filter(l => l.punto_x !== null && l.punto_y !== null);
  const sinPin = lotes.filter(l => l.punto_x === null || l.punto_y === null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[70vh]">
      {!readOnly && (
        <button
          onClick={onNuevoLote}
          disabled={modo !== 'ver'}
          className="w-full bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5}/>
          Nuevo lote con pin
        </button>
      )}
      <div className="border-b border-gray-100 flex">
        <button onClick={() => setTab('sin')}
          className={`flex-1 text-sm font-semibold py-3 transition-colors ${
            tab === 'sin' ? 'text-[#d4a843] border-b-2 border-[#d4a843]' : 'text-gray-500 hover:text-gray-700'
          }`}>
          Sin pin ({sinPin.length})
        </button>
        <button onClick={() => setTab('con')}
          className={`flex-1 text-sm font-semibold py-3 transition-colors ${
            tab === 'con' ? 'text-[#d4a843] border-b-2 border-[#d4a843]' : 'text-gray-500 hover:text-gray-700'
          }`}>
          Con pin ({conPin.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'sin' && (
          sinPin.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              Todos los lotes están marcados en el croquis 🎉
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sinPin.map(l => (
                <li key={l.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-gray-400"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">Lote {loteEtiqueta(l)}</p>
                    <p className="text-[11px] text-gray-500">{ESTADO_LABEL[l.estado]}{l.superficie ? ` · ${l.superficie} m²` : ''}</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => onColocar(l)}
                      disabled={modo === 'colocando'}
                      className="text-[11px] font-bold bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white px-2.5 py-1.5 rounded-lg"
                    >
                      Colocar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
        {tab === 'con' && (
          conPin.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">Ningún lote está marcado todavía.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {conPin.map(l => (
                <li key={l.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                       style={{ background: `${ESTADO_COLOR[l.estado]}20`, color: ESTADO_COLOR[l.estado] }}>
                    <MapPin size={14}/>
                  </div>
                  <button onClick={() => onSelectPin(l.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-gray-800 truncate">Lote {loteEtiqueta(l)}</p>
                    <p className="text-[11px] text-gray-500">{ESTADO_LABEL[l.estado]}{l.superficie ? ` · ${l.superficie} m²` : ''}</p>
                  </button>
                  {!readOnly && (
                    <button onClick={() => onQuitarPin(l)}
                      title="Quitar pin"
                      className="text-gray-400 hover:text-red-600 p-1">
                      <Trash2 size={13}/>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Modal: edición de lote (visibilidad pública + notas)         */

function LoteEditModal({
  lote, onClose, onSaved,
}: {
  lote: LoteCroquis;
  onClose: () => void;
  onSaved: (l: LoteCroquis) => void;
}) {
  const [mostrarPrecio, setMostrarPrecio] = useState(lote.mostrar_precio_publico);
  const [notas,         setNotas]         = useState(lote.notas_publicas ?? '');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const upd = await api.croquis.updateVisibilidadLote(lote.id, {
        mostrar_precio_publico: mostrarPrecio,
        notas_publicas: notas.trim() || null,
      });
      onSaved({ ...lote, ...upd });
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Lote {loteEtiqueta(lote)}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {ESTADO_LABEL[lote.estado]}
              {lote.superficie ? ` · ${lote.superficie} m²` : ''}
              {lote.precio_venta ? ` · Q${lote.precio_venta.toLocaleString('es-GT')}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
            <input type="checkbox" checked={mostrarPrecio}
              onChange={(e) => setMostrarPrecio(e.target.checked)}
              className="mt-0.5 accent-[#d4a843]"/>
            <div className="text-sm">
              <p className="font-semibold text-gray-800">Mostrar precio en el croquis público</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Si lo apagas, el precio no aparecerá cuando alguien vea el link público de este croquis.
              </p>
            </div>
          </label>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Notas públicas
            </label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              rows={3} maxLength={500}
              placeholder="Ej. Vista al lago, esquinero, financiamiento a 60 meses…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] resize-none"/>
            <p className="text-[10px] text-gray-400 mt-1">Se ve en el pop-up del croquis público.</p>
          </div>

          <p className="text-xs text-gray-500">
            Para cambiar nombre, superficie, precio o estado del lote, ve a
            <Link href="/dashboard/lotes" className="text-[#d4a843] font-semibold ml-1 hover:underline">gestión de lotes</Link>.
          </p>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5">
            <Save size={13}/> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Modal: contacto (WhatsApp / email)                           */

function ContactoModal({
  croquis, onClose, onSaved,
}: {
  croquis: Croquis;
  onClose: () => void;
  onSaved: (c: Croquis) => void;
}) {
  const [whatsapp, setWhatsapp] = useState(croquis.contacto_whatsapp ?? '');
  const [email,    setEmail]    = useState(croquis.contacto_email    ?? '');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const c = await api.croquis.updateContacto(croquis.id, {
        contacto_whatsapp: whatsapp.trim() || null,
        contacto_email:    email.trim()    || null,
      });
      onSaved(c as Croquis);
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Contacto público</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aparece en el croquis público cuando alguien quiere consultar un lote.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Phone size={11}/> WhatsApp
            </label>
            <input type="tel" value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+502 5555 5555"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Mail size={11}/> Email
            </label>
            <input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ventas@lotificacion.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} disabled={saving}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl">
            {saving ? 'Guardando…' : 'Guardar contacto'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Modal: compartir croquis público (QR + link + WhatsApp/email)*/

function ShareCroquisModal({
  token, proyectoNombre, onClose, onRegenerar,
}: {
  token: string;
  proyectoNombre: string;
  onClose: () => void;
  onRegenerar: () => Promise<void>;
}) {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/publico/croquis/${token}` : '';
  const mensaje = `Mira el croquis del proyecto ${proyectoNombre}: ${url}`;
  const [copiado,     setCopiado]     = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function copiar() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  // Descarga el QR como PNG. Uso el canvas oculto del <QRCodeCanvas> — Safari
  // móvil no soporta bien blob URLs, así que uso dataURL (más pesado en RAM
  // pero universalmente compatible).
  function descargarQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `croquis-${proyectoNombre.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Web Share API: si el device lo soporta (móvil), abre el share sheet
  // nativo — mucho mejor UX que abrir wa.me/mailto uno a uno.
  async function shareNativo() {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({
        title: `Croquis ${proyectoNombre}`,
        text:  mensaje,
        url,
      });
    } catch {
      // Cancelado por el usuario — silencioso.
    }
  }

  async function regenerar() {
    setRegenerando(true);
    try { await onRegenerar(); }
    finally { setRegenerando(false); }
  }

  const puedeShareNativo = typeof navigator !== 'undefined' && !!navigator.share;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  const mailHref     = `mailto:?subject=${encodeURIComponent(`Croquis del proyecto ${proyectoNombre}`)}&body=${encodeURIComponent(mensaje)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Compartir croquis</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cualquiera con este link o QR puede ver el mapa público.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* QR */}
          <div className="flex flex-col items-center gap-3">
            {/* Canvas para descarga, SVG para render crisp */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <QRCodeSVG value={url} size={200} level="M" bgColor="#ffffff" fgColor="#1a1a1a"/>
            </div>
            <div ref={qrRef} className="hidden">
              <QRCodeCanvas value={url} size={512} level="M" bgColor="#ffffff" fgColor="#1a1a1a" marginSize={2}/>
            </div>
            <button onClick={descargarQR}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#d4a843]">
              <Download size={12}/> Descargar QR
            </button>
          </div>

          {/* Link + copiar */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Link público</label>
            <div className="flex items-stretch gap-2">
              <input readOnly value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
              <button onClick={copiar}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#d4a843] hover:bg-[#b8922e] text-white px-3 py-2 rounded-lg shrink-0">
                {copiado ? <><Check size={12}/> Copiado</> : <><Copy size={12}/> Copiar</>}
              </button>
            </div>
          </div>

          {/* Botones directos */}
          <div className="flex flex-col gap-2">
            {puedeShareNativo && (
              <button onClick={shareNativo}
                className="inline-flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-black text-white font-semibold text-sm px-4 py-2.5 rounded-xl">
                <Share2 size={14}/> Compartir con app…
              </button>
            )}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl">
              <MessageCircle size={14}/> Enviar por WhatsApp
            </a>
            <a href={mailHref}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-[#d4a843] text-gray-800 font-semibold text-sm px-4 py-2.5 rounded-xl">
              <Mail size={14}/> Enviar por correo
            </a>
          </div>

          {/* Regenerar (invalidar link viejo) */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-700">Regenerar link</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Invalida el link y QR anteriores. Útil si ya no querés que quien lo tenga siga entrando.
              </p>
            </div>
            <button onClick={regenerar} disabled={regenerando}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-2 rounded-lg disabled:opacity-50 shrink-0">
              <RotateCw size={12} className={regenerando ? 'animate-spin' : ''}/>
              {regenerando ? 'Regenerando…' : 'Regenerar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Modal: crear nuevo lote con pin ya colocado                  */

function NuevoLoteModal({
  coords, proyectoId, existentes, onClose, onCreated,
}: {
  coords: { x: number; y: number };
  proyectoId: number;
  existentes: LoteCroquis[];
  onClose: () => void;
  onCreated: (lote: LoteCroquis) => void;
}) {
  // Sugiere una clave única: L-N donde N = mayor "L-<n>" existente + 1, o
  // total + 1 si no hay ninguna. El usuario puede sobrescribirla.
  const claveSugerida = (() => {
    const nums = existentes
      .map(l => /^L-(\d+)$/.exec(l.clave))
      .map(m => m ? Number(m[1]) : 0);
    const max = nums.length ? Math.max(...nums) : 0;
    return `L-${Math.max(max, existentes.length) + 1}`;
  })();

  const [clave,      setClave]      = useState(claveSugerida);
  const [manzana,    setManzana]    = useState('');
  const [numero,     setNumero]     = useState('');
  const [superficie, setSuperficie] = useState('');
  const [precio,     setPrecio]     = useState('');
  const [estado,     setEstado]     = useState<EstadoLote>('disponible');
  const [notas,      setNotas]      = useState('');
  const [mostrarPrecio, setMostrarPrecio] = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (clave.trim().length < 1) {
      setError('La clave del lote es requerida');
      return;
    }
    setSaving(true);
    try {
      // 1) Crear el lote en el proyecto
      const nuevoLote = await api.lotes.create({
        proyecto_id:  proyectoId,
        clave:        clave.trim(),
        manzana:      manzana.trim() || undefined,
        numero:       numero.trim()  || undefined,
        superficie:   superficie ? Number(superficie) : undefined,
        precio_venta: precio     ? Number(precio)     : undefined,
        estado,
      });
      // 2) Colocar el pin en las coords capturadas y setear visibilidad pública
      const [conPin] = await Promise.all([
        api.croquis.setPin(nuevoLote.id, { punto_x: coords.x, punto_y: coords.y }),
        (mostrarPrecio !== true || notas.trim())
          ? api.croquis.updateVisibilidadLote(nuevoLote.id, {
              mostrar_precio_publico: mostrarPrecio,
              notas_publicas:         notas.trim() || null,
            })
          : Promise.resolve(null),
      ]);
      // Nota: si updateVisibilidadLote corrió, `conPin` puede estar desactualizado
      // en esos dos campos — pero setPin devuelve el lote completo del backend,
      // y la próxima recarga lo resincroniza. Para la UI inmediata usamos los
      // valores locales.
      onCreated({
        ...conPin,
        mostrar_precio_publico: mostrarPrecio,
        notas_publicas:         notas.trim() || null,
      });
    } catch (e: any) {
      // P2002 → clave duplicada. El mensaje del backend ya es amistoso.
      setError(e?.message ?? 'Error al crear el lote');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nuevo lote</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Se creará como <b>disponible</b> con el pin colocado donde hiciste click.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Clave <span className="text-red-500">*</span>
              </label>
              <input type="text" value={clave} onChange={(e) => setClave(e.target.value)}
                maxLength={50} required
                placeholder="L-1, A-01, Lote 143…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
              <p className="text-[10px] text-gray-400 mt-1">Identificador único del lote dentro de la empresa.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Manzana</label>
              <input type="text" value={manzana} onChange={(e) => setManzana(e.target.value)}
                maxLength={20} placeholder="A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Número</label>
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)}
                maxLength={20} placeholder="01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Superficie (m²)</label>
              <input type="number" min="0" step="0.01" value={superficie} onChange={(e) => setSuperficie(e.target.value)}
                placeholder="120.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Precio venta (Q)</label>
              <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)}
                placeholder="180000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"/>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoLote)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]">
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vista pública</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={mostrarPrecio}
                onChange={(e) => setMostrarPrecio(e.target.checked)}
                className="mt-0.5 accent-[#d4a843]"/>
              <div className="text-sm">
                <p className="font-semibold text-gray-800">Mostrar precio en el croquis público</p>
                <p className="text-xs text-gray-500">Si lo apagas, el precio no aparece en el link compartido.</p>
              </div>
            </label>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Notas públicas</label>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                rows={2} maxLength={500}
                placeholder="Ej. Vista al lago, esquinero, financiamiento a 60 meses…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] resize-none"/>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">{error}</div>}
        </form>

        <div className="px-6 py-3 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5">
            <Plus size={13}/> {saving ? 'Creando…' : 'Crear lote'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* Utilidades                                                    */

function medirImagen(file: File): Promise<{ ancho: number; alto: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}
