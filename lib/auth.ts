import type { AuthUser, Plan } from '@/types';

const PLAN_RANK: Record<Plan, number> = {
  basico: 1,
  profesional: 2,
  empresarial: 3,
};

export function planAllows(userPlan: Plan, minPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[minPlan];
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tg_token');
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
}
