'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Shield } from 'lucide-react';
import { api } from '@/lib/api';

type Rol = 'admin' | 'supervisor' | 'vendedor';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  username: string;
  rol: Rol;
  activo: boolean;
  updated_at: string;
}

const ROL_LABEL: Record<Rol, string> = {
  admin:      'Administrador',
  supervisor: 'Supervisor',
  vendedor:   'Vendedor',
};

const ROL_STYLES: Record<Rol, string> = {
  admin:      'bg-[#1a1a1a] text-[#d4a843]',
  supervisor: 'bg-[#fdf3d9] text-[#92700a]',
  vendedor:   'bg-blue-50 text-blue-600',
};

const ROL_PERMISOS: Record<Rol, string[]> = {
  admin:      ['Ver dashboard', 'Gestionar pagos', 'Ver reportes', 'Gestionar usuarios', 'Ver expedientes', 'Ver cartera vencida', 'Ver notificaciones', 'Ver vendedores'],
  supervisor: ['Ver dashboard', 'Gestionar pagos', 'Ver reportes', 'Ver expedientes', 'Ver cartera vencida', 'Ver notificaciones'],
  vendedor:   ['Ver dashboard', 'Registrar pagos', 'Ver reportes básicos'],
};

type ModalMode = 'crear' | 'editar';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('crear');
  const [editId, setEditId] = useState<number | null>(null);
  const [rolDetalle, setRolDetalle] = useState<Rol | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail]   = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('vendedor');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setUsuarios(await api.usuarios.list()); }
    catch (e: any) { setError(e.message ?? 'Error al cargar usuarios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCrear() {
    setModalMode('crear'); setEditId(null);
    setNombre(''); setEmail(''); setUsername(''); setPassword(''); setRol('vendedor');
    setShowModal(true);
  }

  function openEditar(u: Usuario) {
    setModalMode('editar'); setEditId(u.id);
    setNombre(u.nombre); setEmail(u.email); setUsername(u.username);
    setPassword(''); setRol(u.rol);
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
    if (!confirm('¿Eliminar este usuario?')) return;
    try { await api.usuarios.delete(id); await load(); }
    catch (e: any) { alert(e.message ?? 'Error al eliminar'); }
  }

  async function toggleActivo(u: Usuario) {
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Usuarios y Roles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de acceso y permisos del equipo</p>
        </div>
        <button
          onClick={openCrear}
          className="flex items-center gap-2 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus size={15} />
          Nuevo Usuario
        </button>
      </div>

      {/* Resumen de roles */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['admin', 'supervisor', 'vendedor'] as Rol[]).map(r => {
          const count = usuarios.filter(u => u.rol === r).length;
          return (
            <button
              key={r}
              onClick={() => setRolDetalle(rolDetalle === r ? null : r)}
              className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-all hover:shadow-md ${rolDetalle === r ? 'border-[#d4a843]' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[#fdf3d9] flex items-center justify-center">
                  <Shield size={16} className="text-[#d4a843]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{ROL_LABEL[r]}</p>
                  <p className="text-xl font-bold text-[#1a1a1a]">{count}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">{ROL_PERMISOS[r].length} permisos</p>
            </button>
          );
        })}
      </div>

      {/* Detalle permisos */}
      {rolDetalle && (
        <div className="bg-[#fdf3d9] border border-[#d4a843]/30 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[#92700a]">Permisos del rol: {ROL_LABEL[rolDetalle]}</p>
            <button onClick={() => setRolDetalle(null)} className="text-[#92700a] hover:text-[#1a1a1a]"><X size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROL_PERMISOS[rolDetalle].map(p => (
              <span key={p} className="bg-white border border-[#d4a843]/40 text-[#92700a] text-xs px-2.5 py-1 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Cargando usuarios...</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-500">{error}</div>
        ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actualizado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
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
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ROL_STYLES[u.rol]}`}>
                    {ROL_LABEL[u.rol]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.updated_at).toLocaleDateString('es-MX')}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActivo(u.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${u.activo ? 'bg-[#d4a843]' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${u.activo ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEditar(u)} className="p-1.5 text-gray-400 hover:text-[#d4a843] hover:bg-[#fdf3d9] rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No hay usuarios registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
        )}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {usuarios.filter(u => u.activo).length} usuarios activos de {usuarios.length} totales
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#1a1a1a]">{modalMode === 'crear' ? 'Nuevo Usuario' : 'Editar Usuario'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Nombre completo</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. María López"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="usuario_nombre"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
                  Contraseña {modalMode === 'editar' && <span className="text-gray-400 normal-case">(dejar vacío para no cambiar)</span>}
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Rol</label>
                <select value={rol} onChange={e => setRol(e.target.value as Rol)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#d4a843] focus:border-transparent">
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="vendedor">Vendedor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button onClick={() => setShowModal(false)} disabled={saving}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={saving}
                className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60">
                {saving ? 'Guardando...' : modalMode === 'crear' ? 'Crear Usuario' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
