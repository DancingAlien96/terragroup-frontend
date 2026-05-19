'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, XCircle, Clock, FileText, Check, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

type TabView = 'historial' | 'plantillas';

interface Notificacion {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

interface Plantilla {
  id: number;
  nombre: string;
  tipo: string;
  activa: boolean;
}

const PLANTILLAS: Plantilla[] = [
  { id: 1, nombre: 'Recordatorio de pago',  tipo: 'Cobranza',     activa: true },
  { id: 2, nombre: 'Aviso de mora',         tipo: 'Mora',         activa: true },
  { id: 3, nombre: 'Aviso de vencimiento',  tipo: 'Vencimiento',  activa: true },
  { id: 4, nombre: 'Confirmación de pago',  tipo: 'Confirmación', activa: false },
];

export default function NotificacionesPage() {
  const [tab, setTab] = useState<TabView>('historial');
  const [showModal, setShowModal] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ usuario_id: '', titulo: '', mensaje: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotificaciones(await api.notificaciones.list()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const leidas   = notificaciones.filter(n => n.leida).length;
  const plantActivas = PLANTILLAS.filter(p => p.activa).length;

  const handleEnviar = async () => {
    setSaving(true);
    try {
      await api.notificaciones.create({
        usuario_id: Number(form.usuario_id),
        titulo: form.titulo,
        mensaje: form.mensaje,
      });
      setShowModal(false);
      setForm({ usuario_id: '', titulo: '', mensaje: '' });
      load();
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleLeer = async (id: number) => {
    try { await api.notificaciones.leer(id); load(); }
    catch { /* silencioso */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta notificación?')) return;
    try { await api.notificaciones.delete(id); load(); }
    catch (e: unknown) { alert((e as Error).message); }
  };

  return (
    <div className="p-4 sm:p-6 bg-[#f9fafb] min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1a1a1a]">Notificaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona el envío de notificaciones a usuarios</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm w-full sm:w-auto"
        >
          <Send size={15} />
          Nueva Notificación
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fdf3d9] flex items-center justify-center">
            <Send size={18} className="text-[#d4a843]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold text-[#1a1a1a]">{notificaciones.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">No leídas</p>
            <p className="text-2xl font-bold text-[#1a1a1a]">{noLeidas}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
            <Clock size={18} className="text-green-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Leídas</p>
            <p className="text-2xl font-bold text-[#1a1a1a]">{leidas}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Plantillas activas</p>
            <p className="text-2xl font-bold text-[#1a1a1a]">{plantActivas}</p>
          </div>
        </div>
      </div>

      {/* Tabs + Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 px-5 pt-4 gap-1">
          {([['historial', 'Historial'], ['plantillas', 'Plantillas']] as [TabView, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                tab === id ? 'border-[#d4a843] text-[#92700a]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'historial' && (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensaje</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</td></tr>
              ) : notificaciones.map(n => (
                <tr key={n.id} className={`hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-[#fdf3d9]/20' : ''}`}>
                  <td className="px-5 py-3 font-medium text-[#1a1a1a]">{n.usuario_nombre ?? `#${n.usuario_id}`}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{n.titulo}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{n.mensaje}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      n.leida
                        ? 'bg-gray-100 text-gray-500 border border-gray-200'
                        : 'bg-[#fdf3d9] text-[#92700a] border border-[#d4a843]/30'
                    }`}>
                      {n.leida ? 'Leída' : 'No leída'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!n.leida && (
                        <button onClick={() => handleLeer(n.id)}
                          className="p-1 text-green-500 hover:text-green-700 transition-colors" title="Marcar como leída">
                          <Check size={15} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {tab === 'plantillas' && (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PLANTILLAS.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-[#1a1a1a]">{p.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{p.tipo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.activa
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {p.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {tab === 'historial'
            ? `${notificaciones.length} notificaciones en el historial`
            : `${PLANTILLAS.length} plantillas configuradas`}
        </div>
      </div>

      {/* Modal Nueva Notificación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#1a1a1a]">Nueva Notificación</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">ID de Usuario</label>
                <input type="number" placeholder="ID del usuario destinatario"
                  value={form.usuario_id}
                  onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Título</label>
                <input type="text" placeholder="Ej. Recordatorio de pago"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Mensaje</label>
                <textarea rows={3} placeholder="Escribe el mensaje..."
                  value={form.mensaje}
                  onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleEnviar} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                {saving ? (
                  <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Enviando...</>
                ) : (
                  <><Send size={14} /> Enviar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
