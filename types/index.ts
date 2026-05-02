export type Plan = 'basico' | 'profesional' | 'empresarial';
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
}

export interface NavItem {
  label: string;
  href: string;
  minPlan: Plan;
  icon: React.ReactNode;
}
