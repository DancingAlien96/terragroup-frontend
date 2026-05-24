'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Upload, Trash2, ExternalLink, FolderOpen, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { isReadOnly } from '@/lib/auth';
import { useUploadThing } from '@/lib/uploadthing';
import { useDialog } from '@/lib/useDialog';

/* â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Cliente {
  id: number;
  nombre_comprador: string;
  descripcion_lote: string | null;
}

interface Expediente {
  id: number;
  ventaId: number;
  nombre: string;
  archivoUrl: string;
  createdAt: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/* â”€â”€ UploadPanel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const MAX_DOCS_POR_CLIENTE = 3;
const MAX_PDF_BYTES        = 4 * 1024 * 1024;       // Límite final de UploadThing
const COMPRESS_THRESHOLD   = 4 * 1024 * 1024;       // Si el archivo pasa esto, intentar comprimir

function UploadPanel({ clienteId, docsCount, onUploaded }: { clienteId: number; docsCount: number; onUploaded: () => void }) {
  const readOnly = isReadOnly();
  const [nombre, setNombre]       = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressPct, setCompressPct] = useState(0);
  const [fileReady, setFileReady] = useState<File | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const { showAlert, DialogJSX }  = useDialog();

  const { startUpload } = useUploadThing('expedienteDoc', {
    onUploadBegin: () => setUploading(true),
    onClientUploadComplete: async (res) => {
      setUploading(false);
      if (!res?.[0]) return;
      setSaving(true);
      try {
        await api.expedientes.create({
          cliente_id:  clienteId,
          nombre:      nombre.trim() || (fileReady?.name ?? 'Documento'),
          archivo_url: res[0].ufsUrl,
        });
        setNombre('');
        setFileReady(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onUploaded();
      } catch (e: any) {
        showAlert(e.message ?? 'Error al guardar el expediente');
      } finally {
        setSaving(false);
      }
    },
    onUploadError: () => {
      setUploading(false);
      showAlert('Error al subir el archivo. Verifica que sea PDF y menor a 16 MB.');
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileReady(file);
    if (file && !nombre) setNombre(file.name.replace(/\.pdf$/i, ''));
  }

  async function handleUpload() {
    if (!fileReady || uploading || saving || compressing) return;
    let toUpload = fileReady;
    // Si pesa más de 4 MB, comprimir antes
    if (toUpload.size > COMPRESS_THRESHOLD) {
      setCompressing(true);
      setCompressPct(0);
      try {
        const { compressPdf } = await import('@/lib/compressPdf');
        const compressed = await compressPdf(toUpload, { onProgress: setCompressPct });
        if (compressed.size > MAX_PDF_BYTES) {
          showAlert(`El PDF sigue pesando ${(compressed.size / 1024 / 1024).toFixed(1)} MB después de comprimir. Reduce calidad o número de páginas.`);
          return;
        }
        toUpload = compressed;
      } catch (e: any) {
        showAlert(`Error al comprimir el PDF: ${e.message ?? e}`);
        return;
      } finally {
        setCompressing(false);
      }
    }
    await startUpload([toUpload]);
  }

  if (readOnly) return null;

  const busy = uploading || saving || compressing;
  const limiteAlcanzado = docsCount >= MAX_DOCS_POR_CLIENTE;
  const labelBoton = compressing
    ? `Comprimiendo… ${Math.round(compressPct)}%`
    : uploading
      ? 'Subiendo...'
      : saving
        ? 'Guardando...'
        : 'Subir';

  if (limiteAlcanzado) {
    return (
      <div className="border border-dashed border-gray-200 rounded-2xl bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          Este cliente ya tiene el máximo de <span className="font-semibold">{MAX_DOCS_POR_CLIENTE} documentos</span>.
          Elimina alguno si necesitas subir uno nuevo.
        </p>
        {DialogJSX}
      </div>
    );
  }

  return (
    <div className="border border-dashed border-[#d4a843]/60 rounded-2xl bg-amber-50/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subir documento</p>
        <p className="text-[10px] text-gray-400">{docsCount}/{MAX_DOCS_POR_CLIENTE} usados · PDF máx. 4 MB</p>
      </div>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre del documento (ej. Contrato de compraventa)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
        />
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="exp-file-input"
            />
            <label
              htmlFor="exp-file-input"
              className="flex items-center gap-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500 cursor-pointer hover:border-[#d4a843] hover:bg-amber-50 transition-colors"
            >
              <FileText size={14} className="shrink-0 text-gray-400" />
              <span className="truncate">{fileReady ? fileReady.name : 'Seleccionar PDF...'}</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!fileReady || busy}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 shrink-0"
          >
            {busy ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <Upload size={14} />
            )}
            {labelBoton}
          </button>
        </div>
      </div>
      {DialogJSX}
    </div>
  );
}

/* â”€â”€ DocCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DocCard({ doc, onDelete, readOnly }: { doc: Expediente; onDelete: (id: number) => void; readOnly: boolean }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 hover:shadow-sm transition-all group">
      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <FileText size={18} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(doc.createdAt)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={doc.archivoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          title="Ver PDF"
        >
          <ExternalLink size={14} />
        </a>
        {!readOnly && (
          <button
            onClick={() => onDelete(doc.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ExpedientesPage() {
  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const { showConfirm, showAlert, DialogJSX } = useDialog();

  const [clientes, setClientes]               = useState<Cliente[]>([]);
  const [busqueda, setBusqueda]               = useState('');
  const [clienteSel, setClienteSel]           = useState<Cliente | null>(null);
  const [docs, setDocs]                       = useState<Expediente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingDocs, setLoadingDocs]         = useState(false);

  useEffect(() => {
    api.clientes.list()
      .then((data: any[]) => setClientes(data))
      .catch(() => {})
      .finally(() => setLoadingClientes(false));
  }, []);

  const cargarDocs = useCallback(async (clienteId: number) => {
    setLoadingDocs(true);
    try {
      const data = await api.expedientes.list(clienteId);
      setDocs(data);
    } catch { setDocs([]); }
    finally { setLoadingDocs(false); }
  }, []);

  useEffect(() => {
    if (clienteSel) cargarDocs(clienteSel.id);
    else setDocs([]);
  }, [clienteSel, cargarDocs]);

  async function handleDelete(id: number) {
    if (!await showConfirm('¿Eliminar este documento?', {
      description: 'El archivo será eliminado del expediente. Esta acción no se puede deshacer.',
      danger: true,
      confirmLabel: 'Eliminar',
    })) return;
    try {
      await api.expedientes.delete(id);
      if (clienteSel) cargarDocs(clienteSel.id);
    } catch (e: any) {
      showAlert(e.message ?? 'Error al eliminar');
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre_comprador.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion_lote ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Expedientes de clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Documentación legal por cliente</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:h-[calc(100vh-180px)]">
        {/* ── Panel izquierdo: lista de clientes ── */}
        <div className="w-full md:w-72 md:shrink-0 flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden max-h-64 md:max-h-none">
          <div className="px-3 pt-3 pb-2 border-b border-gray-50">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingClientes ? (
              <p className="text-xs text-gray-400 text-center py-8">Cargando...</p>
            ) : clientesFiltrados.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                {busqueda ? 'Sin resultados' : 'No hay clientes'}
              </p>
            ) : clientesFiltrados.map(c => (
              <button
                key={c.id}
                onClick={() => setClienteSel(c)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 transition-colors ${
                  clienteSel?.id === c.id
                    ? 'bg-amber-50 border-l-2 border-l-[#d4a843]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-medium truncate ${clienteSel?.id === c.id ? 'text-[#b8922e]' : 'text-gray-900'}`}>
                  {c.nombre_comprador}
                </p>
                {c.descripcion_lote && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.descripcion_lote}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Panel derecho: documentos ── */}
        <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[400px] md:min-h-0">
          {!clienteSel ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                <FolderOpen size={28} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-400">Selecciona un cliente</p>
                <p className="text-xs text-gray-300 mt-1">para ver o subir su documentación</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{clienteSel.nombre_comprador}</h2>
                  {clienteSel.descripcion_lote && (
                    <p className="text-xs text-gray-400 mt-0.5">{clienteSel.descripcion_lote}</p>
                  )}
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                  {docs.length} {docs.length === 1 ? 'documento' : 'documentos'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <UploadPanel
                  clienteId={clienteSel.id}
                  docsCount={docs.length}
                  onUploaded={() => cargarDocs(clienteSel.id)}
                />

                {loadingDocs ? (
                  <p className="text-sm text-gray-400 text-center py-4">Cargando documentos...</p>
                ) : docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <FileText size={32} className="text-gray-200" />
                    <p className="text-sm text-gray-400">Este cliente no tiene documentos aún</p>
                    <p className="text-xs text-gray-300">Sube el primer PDF usando el panel de arriba</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {docs.map(doc => (
                      <DocCard
                        key={doc.id}
                        doc={doc}
                        onDelete={handleDelete}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {DialogJSX}
    </div>
  );
}
