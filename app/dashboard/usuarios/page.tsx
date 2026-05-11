'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser, isReadOnly } from '@/lib/auth';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  username: string;
  rol: 'admin' | 'vendedor' | 'supervisor';
  activo: boolean;
  updated_at: string;
}

type ModalMode = 'crear' | 'editar';

/* ── Helpers ─────────────────────────────────────────────────── */
function sugerirUsername(nombre: string): string {
  // "María López García" → "maria_lopez"
  const normalized = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')       // keep only letters, numbers, spaces
    .trim()
    .split(/\s+/);
  const first  = normalized[0] ?? '';
  const second = normalized[1] ?? '';
  return second ? `${first}_${second}` : first;
}

/* ── UsuarioModal ─────────────────────────────────────────────── */
function UsuarioModal({
  mode, editId, meId,
  nombre, setNombre,
  email, setEmail,
  username, setUsername,
  usernameTouched, setUsernameTouched,
  password, setPassword,
  rol, setRol,
  saving, onClose, onGuardar,
}: {
  mode: ModalMode; editId: number | null; meId: number | null;
  nombre: string; setNombre: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  usernameTouched: boolean; setUsernameTouched: (v: boolean) => void;
  password: string; setPassword: (v: string) => void;
  rol: string; setRol: (v: string) => void;
  saving: boolean; onClose: () => void; onGuardar: () => void;
}) {
  // Auto-suggest username from name while user hasn't manually edited it
  useEffect(() => {
    if (mode === 'crear' && !usernameTouched && nombre) {
      setUsername(sugerirUsername(nombre));
    }
  }, [nombre, mode, usernameTouched, setUsername]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-[#1a1a1a]">{mode === 'crear' ? 'Nuevo Usuario' : 'Editar Usuario'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {/* autocomplete="off" prevents browser autofill on the form */}
        <form autoComplete="off" onSubmit={e => { e.preventDefault(); onGuardar(); }}>
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Nombre */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Nombre completo</label>
              <input
                type="text" autoComplete="off" value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. María López"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent"
              />
            </div>
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
              <input
                type="email" autoComplete="off" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent"
              />
            </div>
            {/* Username */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                Username
                {mode === 'crear' && !usernameTouched && username && (
                  <span className="ml-2 text-[#d4a843] font-normal normal-case text-xs">sugerencia automática</span>
                )}
              </label>
              <input
                type="text" autoComplete="off" value={username}
                onChange={e => { setUsernameTouched(true); setUsername(e.target.value); }}
                placeholder="usuario_nombre"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent"
              />
              {mode === 'crear' && !usernameTouched && username && (
                <p className="text-xs text-gray-400 mt-1">Puedes modificarlo libremente</p>
              )}
            </div>
            {/* Contraseña */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                Contraseña {mode === 'editar' && <span className="text-gray-400 normal-case">(dejar vacío para no cambiar)</span>}
              </label>
              <input
                type="password" autoComplete="new-password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent"
              />
            </div>
            {/* Rol */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Rol</label>
              <select value={rol} onChange={e => setRol(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent">
                <option value="admin">Administrador — acceso completo</option>
                <option value="vendedor">Solo lectura — no puede modificar</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 px-6 pb-5">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60">
              {saving ? 'Guardando...' : mode === 'crear' ? 'Crear Usuario' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const meId = typeof window !== 'undefined' ? (getStoredUser()?.id ?? null) : null;
  const readOnly = typeof window !== 'undefined' ? isReadOnly() : false;
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('crear');
  const [editId, setEditId] = useState<number | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail]   = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('admin');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUsuarios(await api.usuarios.list()); }
    catch (e: any) { setError(e.message ?? 'Error al cargar usuarios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCrear() {
    setModalMode('crear'); setEditId(null);
    setNombre(''); setEmail(''); setUsername(''); setUsernameTouched(false); setPassword(''); setRol('admin');
    setShowModal(true);
  }

  function openEditar(u: Usuario) {
    setModalMode('editar'); setEditId(u.id);
    setNombre(u.nombre); setEmail(u.email); setUsername(u.username);
    setUsernameTouched(true);
    setPassword('');
    setRol(u.rol);
    setShowModal(true);
  }

  async function handleGuardar() {
    if (!nombre || !email || !username) return;
    if (modalMode === 'crear' && !password) return;
    setSaving(true);
    try {
      if (modalMode === 'crear') {
        await api.usuarios.create({ nombre, email, username, password, rol });
      } else if (editId !== null) {
        const body: any = { nombre, email, username, rol };
        if (password) body.password = password;
        await api.usuarios.update(editId, body);
      }
      setShowModal(false);
      await load();
    } catch (e: any) { alert(e.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (id === meId) { alert('No puedes eliminar tu propia cuenta.'); return; }
    if (!confirm('¿Eliminar este usuario?')) return;
    try { await api.usuarios.delete(id); await load(); }
    catch (e: any) { alert(e.message ?? 'Error al eliminar'); }
  }

  async function toggleActivo(u: Usuario) {
    if (u.id === meId) return; // no self-deactivate
    try {
      await api.usuarios.update(u.id, { activo: !u.activo });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x));
    } catch (e: any) { alert(e.message ?? 'Error al actualizar'); }
  }

  return (
    <div className="p-6 bg-[#f9fafb] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Administradores con acceso al sistema</p>
        </div>
        {!readOnly && (
          <button
            onClick={openCrear}
            className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Plus size={15} />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Cargando usuarios...</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-500">{error}</div>
        ) : (
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              {!readOnly && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                      {u.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-[#1a1a1a]">{u.nombre}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs font-mono">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.rol === 'admin' ? 'bg-[#fdf3d9] text-[#b8922e]' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {u.rol === 'admin' ? 'Administrador' : 'Solo lectura'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.updated_at).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActivo(u)}
                    disabled={u.id === meId || readOnly}
                    title={u.id === meId ? 'No puedes desactivarte a ti mismo' : u.activo ? 'Desactivar' : 'Activar'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${u.activo ? 'bg-[#d4a843]' : 'bg-gray-200'} ${(u.id === meId || readOnly) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${u.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  {!readOnly && (
                  <div className="flex gap-1">
                    <button onClick={() => openEditar(u)} className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={u.id === meId}
                      title={u.id === meId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
                      className={`p-1.5 rounded-lg transition-colors ${u.id === meId ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="px-5 py-12 text-center text-sm text-gray-400">No hay usuarios registrados.</td>
              </tr>
            )}
          </tbody>
        </table></div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {usuarios.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No hay usuarios registrados.</div>
          ) : usuarios.map(u => (
            <div key={u.id} className="border-b border-gray-100 last:border-0 px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                    {u.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{u.nombre}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleActivo(u)}
                    disabled={u.id === meId || readOnly}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${u.activo ? 'bg-[#d4a843]' : 'bg-gray-200'} ${(u.id === meId || readOnly) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${u.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                  {!readOnly && (
                    <>
                      <button onClick={() => openEditar(u)} className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(u.id)} disabled={u.id === meId}
                        className={`p-1.5 rounded-lg transition-colors ${u.id === meId ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs pl-[2.75rem]">
                <span className="font-mono text-gray-500">@{u.username}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  u.rol === 'admin' ? 'bg-[#fdf3d9] text-[#b8922e]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {u.rol === 'admin' ? 'Administrador' : 'Solo lectura'}
                </span>
              </div>
            </div>
          ))}
        </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {usuarios.filter(u => u.activo).length} usuarios activos de {usuarios.length} totales
        </div>
      </div>

      {/* Modal Crear / Editar */}
        {showModal && (
          <UsuarioModal
            mode={modalMode}
            editId={editId}
            meId={meId}
            nombre={nombre} setNombre={setNombre}
            email={email} setEmail={setEmail}
            username={username} setUsername={setUsername}
            usernameTouched={usernameTouched} setUsernameTouched={setUsernameTouched}
            password={password} setPassword={setPassword}
            rol={rol} setRol={setRol}
            saving={saving}
            onClose={() => setShowModal(false)}
            onGuardar={handleGuardar}
          />
        )}
    </div>
  );
}
