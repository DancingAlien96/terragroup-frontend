import type { AuthUser, Plan } from '@/types';

// Ranking usado por planAllows para el gate por sección del sidebar.
// business y profesional (legacy) son equivalentes en jerarquía.
const PLAN_RANK: Record<Plan, number> = {
  basico:      1,
  business:    2,
  profesional: 2,  // legacy, mismo rango que business
  empresarial: 3,
};

export function planAllows(userPlan: Plan, minPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[minPlan];
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tg_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('tg_token', token);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('tg_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_user');
  // Clear the cookie used by middleware
  document.cookie = 'tg_token=; path=/; max-age=0; SameSite=Lax';
}

/** Devuelve true si el usuario actual solo tiene permiso de lectura (rol vendedor/supervisor) */
export function isReadOnly(): boolean {
  if (typeof window === 'undefined') return true;
  const u = getStoredUser();
  return u?.rol !== 'admin' && u?.rol !== 'superadmin';
}
