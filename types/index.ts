// 'profesional' se conserva por retro-compat con datos legacy en BD.
// El plan comercial actual es 'business'. 'empresarial' es interno/legacy.
export type Plan = 'basico' | 'business' | 'profesional' | 'empresarial';
export type Rol = 'superadmin' | 'admin' | 'vendedor' | 'supervisor';

export interface AuthUser {
  id: number;
  empresa_id: number;
  nombre: string;
  email: string;
  username: string;
  rol: Rol;
  empresa_nombre: string;
  plan: Plan;
  /** CSV de paths permitidos en el sidebar. null = todas las del plan. */
  secciones_permitidas: string | null;
}

export interface NavItem {
  label: string;
  href: string;
  minPlan: Plan;
  icon: React.ReactNode;
}
