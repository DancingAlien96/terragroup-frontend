'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, X, MessageCircle, Mail, Info, Loader2 } from 'lucide-react';
import { resolveFileUrl } from '@/lib/uploadFile';

/**
 * Vista pública del croquis — link tipo /publico/croquis/:token que el dueño
 * comparte con posibles clientes. Sin auth, sin datos privados. Muestra los
 * pins con el color de su estado y un panel de detalle al hacer click; si
 * el dueño configuró contacto WhatsApp/email, aparece un botón "Consultar".
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type EstadoLote = 'disponible' | 'vendido' | 'reservado';

interface LotePublico {
  id:             number;
  clave:          string;
  manzana:        string | null;
  numero:         string | null;
  superficie:     number | null;
  precio_venta:   number | null;
  estado:         EstadoLote;
  punto_x:        number | null;
  punto_y:        number | null;
  notas_publicas: string | null;
}

interface CroquisPublico {
  empresa_nombre:       string;
  proyecto_nombre:      string;
  proyecto_ubicacion:   string | null;
  proyecto_portada_url: string | null;
  imagen_url:           string;
  imagen_ancho:         number | null;
  imagen_alto:          number | null;
  contacto_whatsapp:    string | null;
  contacto_email:       string | null;
  lotes:                LotePublico[];
}

const ESTADO_COLOR: Record<EstadoLote, string> = {
  disponible: '#22c55e',
  reservado:  '#f59e0b',
  vendido:    '#ef4444',
};
const ESTADO_LABEL: Record<EstadoLote, string> = {
  disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido',
};

function loteEtiqueta(l: LotePublico): string {
  if (l.manzana && l.numero) return `${l.manzana}-${l.numero}`;
  if (l.numero)              return l.numero;
  return l.clave;
}

export default function CroquisPublicoClient({ token }: { token: string }) {
  const [data,    setData]    = useState<CroquisPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [selLote, setSelLote] = useState<LotePublico | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/publico/croquis/${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(json?.message ?? 'Este croquis no está disponible');
        return;
      }
      setData(json.data as CroquisPublico);
    } catch (e: any) {
      setError('No se pudo cargar el croquis');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={24} className="animate-spin"/>
          <p className="text-sm">Cargando croquis…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <X size={24} className="text-red-500"/>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Croquis no disponible</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {error || 'Este link ya no está activo. Pídele uno nuevo al vendedor.'}
          </p>
        </div>
      </div>
    );
  }

  const aspect = data.imagen_ancho && data.imagen_alto
    ? data.imagen_ancho / data.imagen_alto
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4a843]">
              {data.empresa_nombre}
            </p>
            <h1 className="text-lg font-extrabold text-gray-900 truncate">
              Croquis · {data.proyecto_nombre}
            </h1>
            {data.proyecto_ubicacion && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={11}/> {data.proyecto_ubicacion}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <LegendDot color={ESTADO_COLOR.disponible} label="Disponible"/>
            <LegendDot color={ESTADO_COLOR.reservado}  label="Reservado"/>
            <LegendDot color={ESTADO_COLOR.vendido}    label="Vendido"/>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Info size={12}/>
          Toca un pin para ver los detalles del lote. Los precios pueden variar; confirma con el vendedor.
        </p>

        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="relative w-full bg-gray-50" style={{ aspectRatio: aspect }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveFileUrl(data.imagen_url)}
              alt={`Croquis de ${data.proyecto_nombre}`}
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />
            {data.lotes.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelLote(l)}
                className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110 z-20"
                style={{ left: `${(l.punto_x ?? 0) * 100}%`, top: `${(l.punto_y ?? 0) * 100}%` }}
                title={`Lote ${loteEtiqueta(l)}`}
              >
                <svg width="28" height="34" viewBox="0 0 28 34" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
                  <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 20 14 20s14-9.5 14-20C28 6.27 21.73 0 14 0z"
                        fill={ESTADO_COLOR[l.estado]}/>
                  <circle cx="14" cy="14" r="9" fill="white"/>
                  <text x="14" y="18" textAnchor="middle" fontSize="10" fontWeight="700" fill={ESTADO_COLOR[l.estado]}>
                    {(l.numero ?? l.clave ?? '').slice(0, 3)}
                  </text>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-center text-xs text-gray-400">
        Croquis interactivo por <span className="font-semibold">TerraGroup</span>
      </footer>

      {/* Panel del lote seleccionado */}
      {selLote && (
        <DetalleLote
          lote={selLote}
          contactoWhatsapp={data.contacto_whatsapp}
          contactoEmail={data.contacto_email}
          proyectoNombre={data.proyecto_nombre}
          onClose={() => setSelLote(null)}
        />
      )}
    </div>
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

function DetalleLote({
  lote, contactoWhatsapp, contactoEmail, proyectoNombre, onClose,
}: {
  lote: LotePublico;
  contactoWhatsapp: string | null;
  contactoEmail:    string | null;
  proyectoNombre:   string;
  onClose: () => void;
}) {
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

  // Precio: null si el dueño decidió no exponerlo para este lote
  const precioTxt = lote.precio_venta != null
    ? `Q${lote.precio_venta.toLocaleString('es-GT')}`
    : null;

  const mensaje = encodeURIComponent(
    `Hola, me interesa el lote ${loteEtiqueta(lote)} del proyecto ${proyectoNombre}. ¿Podrían darme más información?`,
  );
  const waNumber = (contactoWhatsapp ?? '').replace(/\D/g, '');
  const waHref   = waNumber ? `https://wa.me/${waNumber}?text=${mensaje}` : null;
  const mailHref = contactoEmail
    ? `mailto:${contactoEmail}?subject=${encodeURIComponent(`Consulta lote ${loteEtiqueta(lote)}`)}&body=${mensaje}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
         onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Lote</p>
            <h2 className="text-xl font-extrabold text-gray-900">{loteEtiqueta(lote)}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18}/></button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <span
            className="self-start text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: `${ESTADO_COLOR[lote.estado]}20`,
              color:      ESTADO_COLOR[lote.estado],
            }}
          >
            {ESTADO_LABEL[lote.estado]}
          </span>

          <div className="grid grid-cols-2 gap-3">
            {lote.superficie != null && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Superficie</p>
                <p className="text-base font-bold text-gray-900">{lote.superficie} m²</p>
              </div>
            )}
            {precioTxt && (
              <div className="bg-[#fdf3d9]/50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-[#8a6910] uppercase tracking-wide">Precio</p>
                <p className="text-base font-bold text-[#8a6910]">{precioTxt}</p>
              </div>
            )}
          </div>

          {lote.notas_publicas && (
            <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 leading-relaxed">
              {lote.notas_publicas}
            </div>
          )}

          {(waHref || mailHref) && lote.estado !== 'vendido' && (
            <div className="flex flex-col gap-2 pt-2">
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-3 rounded-xl">
                  <MessageCircle size={15}/> Consultar por WhatsApp
                </a>
              )}
              {mailHref && (
                <a href={mailHref}
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#d4a843] text-gray-800 font-semibold text-sm px-4 py-3 rounded-xl">
                  <Mail size={14}/> Enviar correo
                </a>
              )}
            </div>
          )}

          {lote.estado === 'vendido' && (
            <p className="text-center text-xs text-gray-500 pt-2">
              Este lote ya fue vendido. Consulta al vendedor por otros lotes disponibles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
