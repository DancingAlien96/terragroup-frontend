import { getStoredToken } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
  return json.data ?? json;
}

// ── CRUD genérico para reusar ──────────────────────────────
function crud(base: string) {
  return {
    list:   () => request<any[]>(base),
    get:    (id: number) => request<any>(`${base}/${id}`),
    create: (body: unknown) => request<any>(base, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`${base}/${id}`, { method: 'DELETE' }),
  };
}

// ── API ────────────────────────────────────────────────────
// Nota arquitectónica: el backend usa `ventas` (modelo normalizado).
// Mantenemos `api.clientes` como alias para no romper páginas que
// conceptualmente hablan de "clientes" (en UX el comprador = cliente).
const ventas = crud('/api/ventas');

export const api = {
  usuarios:      crud('/api/usuarios'),
  lotes:         crud('/api/lotes'),
  proyectos: {
    ...crud('/api/proyectos'),
    limites: () => request<any>('/api/proyectos/limites'),
  },
  propietarios:  crud('/api/propietarios'),
  pagos:         crud('/api/pagos'),

  // Ventas = clientes (alias). Misma fuente, dos nombres.
  ventas: {
    ...ventas,
    sinLote:      (proyectoId: number) => request<any[]>(`/api/ventas/sin-lote?proyecto_id=${proyectoId}`),
    vincularLote: (ventaId: number, loteId: number) => request<any>(`/api/ventas/${ventaId}/lote`, { method: 'PATCH', body: JSON.stringify({ lote_id: loteId }) }),
  },
  clientes: ventas,

  vendedores: {
    list:   () => request<any[]>('/api/vendedores'),
    create: (body: unknown) => request<any>('/api/vendedores', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/vendedores/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/api/vendedores/${id}`, { method: 'DELETE' }),
    comisiones: {
      list:   (vendedorId: number) => request<any[]>(`/api/vendedores/${vendedorId}/comisiones`),
      create: (vendedorId: number, body: unknown) => request<any>(`/api/vendedores/${vendedorId}/comisiones`, { method: 'POST', body: JSON.stringify(body) }),
      update: (vendedorId: number, comisionId: number, body: unknown) => request<any>(`/api/vendedores/${vendedorId}/comisiones/${comisionId}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (vendedorId: number, comisionId: number) => request<void>(`/api/vendedores/${vendedorId}/comisiones/${comisionId}`, { method: 'DELETE' }),
    },
  },

  notificaciones: {
    list:   () => request<any[]>('/api/notificaciones'),
    create: (body: unknown) => request<any>('/api/notificaciones', { method: 'POST', body: JSON.stringify(body) }),
    leer:   (id: number) => request<any>(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }),
    delete: (id: number) => request<any>(`/api/notificaciones/${id}`, { method: 'DELETE' }),
  },

  cartera: {
    list: () => request<any[]>('/api/cartera'),
  },

  // Expedientes: el backend ahora usa venta_id (mismo concepto).
  // Mantenemos `cliente_id` en el query para compat — el backend acepta ambos.
  expedientes: {
    list:   (ventaId: number) => request<any[]>(`/api/expedientes?venta_id=${ventaId}`),
    create: (body: unknown) => request<any>('/api/expedientes', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/expedientes/${id}`, { method: 'DELETE' }),
  },

  empresas: {
    register:                (body: unknown) => request<any>('/api/empresas/register', { method: 'POST', body: JSON.stringify(body) }),
    list:                    () => request<any[]>('/api/empresas'),
    stats:                   () => request<any>('/api/empresas/stats'),
    get:                     (id: number) => request<any>(`/api/empresas/${id}`),
    update:                  (id: number, body: unknown) => request<any>(`/api/empresas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    toggle:                  (id: number) => request<any>(`/api/empresas/${id}/toggle`, { method: 'PATCH' }),
    changePlan:              (id: number, plan_id: number) => request<any>(`/api/empresas/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan_id }) }),
    toggleCroquis:           (id: number, activo: boolean) => request<any>(`/api/empresas/${id}/croquis`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
    miSuscripcion:           () => request<any>('/api/empresas/mi-suscripcion'),
    cancelarMiSuscripcion:   () => request<any>('/api/empresas/mi-suscripcion/cancelar', { method: 'POST' }),
    comprarProyectoExtra:    () => request<{ checkout_url: string }>('/api/empresas/mi-suscripcion/proyecto-extra', { method: 'POST' }),
    listUsuarios:            (empresaId: number) =>
      request<any[]>(`/api/empresas/${empresaId}/usuarios`),
    updateCredenciales:      (empresaId: number, usuarioId: number, body: { username?: string; password?: string }) =>
      request<any>(`/api/empresas/${empresaId}/usuarios/${usuarioId}/credenciales`,
        { method: 'PATCH', body: JSON.stringify(body) }),
  },

  planes: {
    list: () => request<any[]>('/api/planes'),
  },

  stats: {
    dashboard:        () => request<any>('/api/stats/dashboard'),
    reportes:         () => request<any>('/api/stats/reportes'),
    resumenEjecutivo: () => request<any>('/api/stats/resumen-ejecutivo'),
  },

  amortizacion: {
    simular:   (body: unknown) => request<any[]>('/api/amortizacion/simular', { method: 'POST', body: JSON.stringify(body) }),
    getPlan:   (ventaId: number) => request<any>(`/api/amortizacion/venta/${ventaId}`),
    regenerar: (ventaId: number) => request<any>(`/api/amortizacion/venta/${ventaId}/regenerar`, { method: 'POST' }),
    liquidar:  (ventaId: number, body: unknown) => request<any>(`/api/amortizacion/venta/${ventaId}/liquidar`, { method: 'POST', body: JSON.stringify(body) }),
  },

  croquis: {
    getPorProyecto:  (proyectoId: number) => request<any>(`/api/croquis/proyecto/${proyectoId}`),
    upsert:          (proyectoId: number, body: unknown) => request<any>(`/api/croquis/proyecto/${proyectoId}`, { method: 'POST', body: JSON.stringify(body) }),
    updateContacto:  (id: number, body: unknown) => request<any>(`/api/croquis/${id}/contacto`, { method: 'PATCH', body: JSON.stringify(body) }),
    activarPublico:  (id: number) => request<any>(`/api/croquis/${id}/publico/activar`, { method: 'POST' }),
    desactivarPublico:(id: number) => request<any>(`/api/croquis/${id}/publico/desactivar`, { method: 'POST' }),
    regenerarToken:  (id: number) => request<any>(`/api/croquis/${id}/publico/regenerar`, { method: 'POST' }),
    delete:          (id: number) => request<void>(`/api/croquis/${id}`, { method: 'DELETE' }),
    setPin:          (loteId: number, body: { punto_x: number; punto_y: number }) =>
      request<any>(`/api/croquis/lotes/${loteId}/pin`, { method: 'PATCH', body: JSON.stringify(body) }),
    quitarPin:       (loteId: number) => request<any>(`/api/croquis/lotes/${loteId}/pin`, { method: 'DELETE' }),
    updateVisibilidadLote: (loteId: number, body: { mostrar_precio_publico?: boolean; notas_publicas?: string | null }) =>
      request<any>(`/api/croquis/lotes/${loteId}/publico`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
};
