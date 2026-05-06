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

// ── Usuarios ────────────────────────────────────────────────
export const api = {
  usuarios: {
    list: () => request<any[]>('/api/usuarios'),
    get:  (id: number) => request<any>(`/api/usuarios/${id}`),
    create: (body: unknown) => request<any>('/api/usuarios', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/usuarios/${id}`, { method: 'DELETE' }),
  },

  lotes: {
    list: () => request<any[]>('/api/lotes'),
    get:  (id: number) => request<any>(`/api/lotes/${id}`),
    create: (body: unknown) => request<any>('/api/lotes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/lotes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/lotes/${id}`, { method: 'DELETE' }),
  },

  propietarios: {
    list: () => request<any[]>('/api/propietarios'),
    get:  (id: number) => request<any>(`/api/propietarios/${id}`),
    create: (body: unknown) => request<any>('/api/propietarios', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/propietarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/propietarios/${id}`, { method: 'DELETE' }),
  },

  contratos: {
    list: () => request<any[]>('/api/contratos'),
    get:  (id: number) => request<any>(`/api/contratos/${id}`),
    create: (body: unknown) => request<any>('/api/contratos', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/contratos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/contratos/${id}`, { method: 'DELETE' }),
  },

  pagos: {
    list: () => request<any[]>('/api/pagos'),
    get:  (id: number) => request<any>(`/api/pagos/${id}`),
    create: (body: unknown) => request<any>('/api/pagos', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/pagos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/pagos/${id}`, { method: 'DELETE' }),
  },

  vendedores: {
    list: () => request<any[]>('/api/vendedores'),
    create: (body: unknown) => request<any>('/api/vendedores', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/vendedores/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/api/vendedores/${id}`, { method: 'DELETE' }),
    comisiones: {
      list: (vendedorId: number) => request<any[]>(`/api/vendedores/${vendedorId}/comisiones`),
      create: (vendedorId: number, body: unknown) => request<any>(`/api/vendedores/${vendedorId}/comisiones`, { method: 'POST', body: JSON.stringify(body) }),
      delete: (vendedorId: number, comisionId: number) => request<void>(`/api/vendedores/${vendedorId}/comisiones/${comisionId}`, { method: 'DELETE' }),
    },
  },

  notificaciones: {
    list: () => request<any[]>('/api/notificaciones'),
    create: (body: unknown) => request<any>('/api/notificaciones', { method: 'POST', body: JSON.stringify(body) }),
    leer: (id: number) => request<any>(`/api/notificaciones/${id}/leer`, { method: 'PATCH' }),
    delete: (id: number) => request<any>(`/api/notificaciones/${id}`, { method: 'DELETE' }),
  },

  cartera: {
    list: () => request<any[]>('/api/cartera'),
  },

  clientes: {
    list: () => request<any[]>('/api/clientes'),
    get:  (id: number) => request<any>(`/api/clientes/${id}`),
    create: (body: unknown) => request<any>('/api/clientes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<any>(`/api/clientes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<any>(`/api/clientes/${id}`, { method: 'DELETE' }),
  },

  empresas: {
    register: (body: unknown) => request<any>('/api/empresas/register', { method: 'POST', body: JSON.stringify(body) }),
    list: () => request<any[]>('/api/empresas'),
    stats: () => request<any>('/api/empresas/stats'),
    get: (id: number) => request<any>(`/api/empresas/${id}`),
    update: (id: number, body: unknown) => request<any>(`/api/empresas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    toggle: (id: number) => request<any>(`/api/empresas/${id}/toggle`, { method: 'PATCH' }),
    changePlan: (id: number, plan_id: number) => request<any>(`/api/empresas/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ plan_id }) }),
  },

  planes: {
    list: () => request<any[]>('/api/planes'),
  },

  stats: {
    dashboard: () => request<any>('/api/stats/dashboard'),
    reportes:  () => request<any>('/api/stats/reportes'),
  },
};
