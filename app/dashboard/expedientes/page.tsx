'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Upload, Trash2, ExternalLink, FolderOpen, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { isReadOnly } from '@/lib/auth';
import { LIMITS } from '@/lib/schemaLimits';
import { fmtDate } from '@/lib/fmtDate';
import { uploadFile, resolveFileUrl } from '@/lib/uploadFile';
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


/* â”€â”€ UploadPanel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const MAX_DOCS_POR_CLIENTE = 3;

function UploadPanel({ clienteId, docsCount, onUploaded }: { clienteId: number; docsCount: number; onUploaded: () => void }) {
  const readOnly = isReadOnly();
  const [nombre, setNombre]       = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [fileReady, setFileReady] = useState<File | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const { showAlert, DialogJSX }  = useDialog();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileReady(file);
    if (file && !nombre) setNombre(file.name.replace(/\.pdf$/i, ''));
  }

  async function handleUpload() {
    if (!fileReady || uploading || saving) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(fileReady);
      setUploading(false);
      setSaving(true);
      try {
        await api.expedientes.create({
          cliente_id:  clienteId,
          nombre:      nombre.trim() || (fileReady?.name ?? 'Documento'),
          archivo_url: url,
        });
        setNombre('');
        setFileReady(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onUploaded();
      } catch (err: any) {
        showAlert(err?.message ?? 'Error al guardar el expediente');
      } finally {
        setSaving(false);
      }
    } catch (err: any) {
      setUploading(false);
      showAlert(err?.message ?? 'Error al subir el archivo. Verifica que sea PDF y menor a 4 MB.');
    }
  }

  if (readOnly) return null;

  const busy = uploading || saving;
  const limiteAlcanzado = docsCount >= MAX_DOCS_POR_CLIENTE;
  const labelBoton = uploading
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
          maxLength={LIMITS.expediente.nombre}
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
          href={resolveFileUrl(doc.archivoUrl)}
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

/* ── ExpedientesModal ───────────────────────────────────────── */
function ExpedientesModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const { showConfirm, showAlert, DialogJSX } = useDialog();
  const [docs, setDocs]       = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.expedientes.list(cliente.id);
      setDocs(data);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }, [cliente.id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleDelete(id: number) {
    if (!await showConfirm('¿Eliminar este documento?', {
      description: 'El archivo será eliminado del expediente. Esta acción no se puede deshacer.',
      danger: true,
      confirmLabel: 'Eliminar',
    })) return;
    try {
      await api.expedientes.delete(id);
      cargar();
    } catch (e: any) {
      showAlert(e.message ?? 'Error al eliminar');
    }
  }

  const readOnly = isReadOnly();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 py-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{cliente.nombre_comprador}</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {cliente.descripcion_lote ?? 'Sin lote especificado'}
              {!loading && <> · {docs.length}/{MAX_DOCS_POR_CLIENTE} documentos</>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body — scroll interno */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <UploadPanel
            clienteId={cliente.id}
            docsCount={docs.length}
            onUploaded={cargar}
          />

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Cargando documentos...</p>
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

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm px-4 py-2 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
        {DialogJSX}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function ExpedientesPage() {
  const [clientes, setClientes]               = useState<Cliente[]>([]);
  const [busqueda, setBusqueda]               = useState('');
  const [clienteSel, setClienteSel]           = useState<Cliente | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    api.clientes.list()
      .then((data: any[]) => setClientes(data))
      .catch(() => {})
      .finally(() => setLoadingClientes(false));
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nombre_comprador.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion_lote ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-0">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expedientes de clientes</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Documentación legal por cliente. Click en el ícono para ver sus expedientes.</p>
      </div>

      {/* Buscador */}
      <div className="relative mb-4 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o lote..."
          className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista de clientes */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loadingClientes ? (
          <p className="text-sm text-gray-400 text-center py-12">Cargando clientes...</p>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-2">
            <FolderOpen size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">
              {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay clientes registrados'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {clientesFiltrados.map(c => (
              <li key={c.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                  {c.nombre_comprador.split(' ').slice(0, 2).map(n => n[0]).join('')}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.nombre_comprador}</p>
                  <p className="text-xs text-gray-400 truncate">{c.descripcion_lote ?? 'Sin lote especificado'}</p>
                </div>
                {/* Botón documentos */}
                <button
                  onClick={() => setClienteSel(c)}
                  title="Ver expediente"
                  className="flex items-center gap-2 bg-[#fdf3d9] hover:bg-[#fae8b2] text-[#92700a] text-xs font-semibold px-3 py-2 rounded-xl transition-colors shrink-0"
                >
                  <FileText size={14} />
                  <span className="hidden sm:inline">Expediente</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {clientesFiltrados.length > 0 && !loadingClientes && (
          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50 text-xs text-gray-400">
            {clientesFiltrados.length} cliente{clientesFiltrados.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Modal */}
      {clienteSel && (
        <ExpedientesModal
          cliente={clienteSel}
          onClose={() => setClienteSel(null)}
        />
      )}
    </div>
  );
}

