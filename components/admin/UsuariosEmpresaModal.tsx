'use client';

import { useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, KeyRound, User, X, ArrowLeft, IdCard, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { useDialog } from '@/lib/useDialog';

interface UsuarioRow {
  id:       number;
  nombre:   string;
  email:    string;
  username: string;
  rol:      string;
  activo:   boolean;
}

interface Props {
  empresaId:      number;
  empresaNombre:  string;
  onClose:        () => void;
}

/**
 * Modal super-admin: lista los usuarios de una empresa y permite cambiar
 * username y/o contraseña. Uso: soporte cuando un cliente olvida credenciales.
 */
export default function UsuariosEmpresaModal({ empresaId, empresaNombre, onClose }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<UsuarioRow | null>(null);
  const { showAlert, DialogJSX } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsuarios(await api.empresas.listUsuarios(empresaId)); }
    catch (e: any) { showAlert(e?.message ?? 'Error al cargar usuarios'); }
    finally { setLoading(false); }
  }, [empresaId, showAlert]);

  useEffect(() => { load(); }, [load]);

  // Escape para cerrar; bloquea scroll del body.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editing) onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [editing, onClose]);

  const rolBadge: Record<string, string> = {
    admin:      'bg-slate-800 text-white',
    supervisor: 'bg-blue-100 text-blue-700',
    vendedor:   'bg-amber-100 text-amber-700',
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
            <div>
              <h2 className="font-bold text-[#1a1a1a] text-lg">Usuarios de la empresa</h2>
              <p className="text-xs text-gray-500 mt-0.5">{empresaNombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 shrink-0" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {/* Contenido — lista o form */}
          <div className="flex-1 overflow-y-auto">
            {editing ? (
              <EditarCredencialesForm
                empresaId={empresaId}
                usuario={editing}
                onBack={() => setEditing(null)}
                onSaved={() => { setEditing(null); load(); }}
              />
            ) : (
              <div className="divide-y divide-gray-50">
                {loading ? (
                  <div className="text-gray-400 text-sm text-center py-10">Cargando…</div>
                ) : usuarios.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-10">Esta empresa no tiene usuarios.</div>
                ) : usuarios.map((u) => (
                  <div key={u.id} className={`px-6 py-4 flex items-center gap-3 ${!u.activo ? 'opacity-50' : ''}`}>
                    <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
                      {u.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-[#1a1a1a] truncate">{u.nombre}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${rolBadge[u.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                          {u.rol}
                        </span>
                        {!u.activo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactivo</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        <span className="font-mono">{u.username}</span> · {u.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditing(u)}
                      className="text-xs bg-[#fdf3d9] text-[#8a6910] hover:bg-[#f5e2a4] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0"
                    >
                      <KeyRound size={13} />
                      Cambiar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {DialogJSX}
    </>
  );
}

/* ── Form de edición de credenciales ─────────────────────────────── */

function EditarCredencialesForm({
  empresaId, usuario, onBack, onSaved,
}: {
  empresaId: number;
  usuario:   UsuarioRow;
  onBack:    () => void;
  onSaved:   () => void;
}) {
  const [nombre,   setNombre]   = useState(usuario.nombre);
  const [emailV,   setEmailV]   = useState(usuario.email);
  const [username, setUsername] = useState(usuario.username);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const { showAlert, DialogJSX } = useDialog();

  const nombreChanged   = nombre.trim() !== usuario.nombre;
  const emailChanged    = emailV.trim().toLowerCase() !== usuario.email.toLowerCase();
  const usernameChanged = username.trim() !== usuario.username;
  const passwordSet     = password.length > 0;

  const nombreValido   = !nombreChanged   || nombre.trim().length >= 2;
  const emailValido    = !emailChanged    || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailV.trim());
  const usernameValido = !usernameChanged || username.trim().length >= 3;
  const passwordValido = !passwordSet     || password.length >= 6;

  const algunCambio = nombreChanged || emailChanged || usernameChanged || passwordSet;
  const puedeGuardar = algunCambio && nombreValido && emailValido && usernameValido && passwordValido;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const body: { username?: string; password?: string; nombre?: string; email?: string } = {};
      if (nombreChanged)   body.nombre   = nombre.trim();
      if (emailChanged)    body.email    = emailV.trim();
      if (usernameChanged) body.username = username.trim();
      if (passwordSet)     body.password = password;
      await api.empresas.updateCredenciales(empresaId, usuario.id, body);
      showAlert('Datos actualizados correctamente', 'success');
      setTimeout(onSaved, 800);
    } catch (e: any) {
      setError(e?.message ?? 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
      <button type="button" onClick={onBack}
        className="self-start flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1a1a1a] font-medium">
        <ArrowLeft size={13} />
        Volver a la lista
      </button>

      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold shrink-0">
          {usuario.nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[#1a1a1a] truncate">{usuario.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Nombre completo</label>
        <div className="relative">
          <IdCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={100}
            placeholder="Ej. Carlos Fernando Heredia"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
          />
        </div>
        {nombreChanged && nombre.trim().length < 2 && (
          <p className="text-xs text-red-500 mt-1">Mínimo 2 caracteres</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={emailV}
            onChange={(e) => setEmailV(e.target.value)}
            maxLength={150}
            placeholder="usuario@empresa.com"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
          />
        </div>
        {emailChanged && !emailValido && (
          <p className="text-xs text-red-500 mt-1">Email inválido</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Username</label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={80}
            placeholder="usuario_admin"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a843] font-mono"
          />
        </div>
        {usernameChanged && username.trim().length < 3 && (
          <p className="text-xs text-red-500 mt-1">Mínimo 3 caracteres</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Nueva contraseña
          <span className="ml-2 text-gray-400 normal-case font-normal">(dejar vacío para no cambiar)</span>
        </label>
        <div className="relative">
          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full pl-9 pr-11 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4a843]"
          />
          <button type="button" onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {passwordSet && password.length < 6 && (
          <p className="text-xs text-red-500 mt-1">Mínimo 6 caracteres</p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
        <strong>Importante:</strong> el cambio invalida sesiones activas del usuario. Comparte
        las nuevas credenciales por un canal seguro — nunca por correo.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={saving}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={!puedeGuardar || saving}
          className="flex-1 bg-[#d4a843] hover:bg-[#b8922e] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
      {DialogJSX}
    </form>
  );
}
