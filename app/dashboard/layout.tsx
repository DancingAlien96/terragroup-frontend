'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getStoredUser, getStoredToken, logout, planAllows } from '@/lib/auth';
import TrialBanner from '@/components/dashboard/TrialBanner';
import type { AuthUser, Plan } from '@/types';

/* ── Nav items with plan restriction ─────────────────────────── */
const NAV_ITEMS = [
  {
    label: 'Panel de Control',
    href: '/dashboard',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Proyectos',
    href: '/dashboard/proyectos',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M3 7v14M21 7v14M6 21V11h4v10M14 21V11h4v10M3 7l9-4 9 4" />
      </svg>
    ),
  },
  {
    label: 'Clientes',
    href: '/dashboard/clientes',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Gestión de Pagos',
    href: '/dashboard/pagos',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    label: 'Cartera Vencida',
    href: '/dashboard/cartera',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  // Notificaciones deshabilitado por decisión de producto — la ruta redirige
  // a /dashboard si alguien intenta ir directo. Item removido del sidebar
  // para todos los roles (superadmin ya no pasa por este layout).
  // {
  //   label: 'Notificaciones',
  //   href: '/dashboard/notificaciones',
  //   minPlan: 'profesional' as Plan,
  //   icon: (
  //     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  //       <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
  //     </svg>
  //   ),
  // },
  {
    label: 'Expediente de Clientes',
    href: '/dashboard/expedientes',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: 'Usuarios y Roles',
    href: '/dashboard/usuarios',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Vendedores y Comisiones',
    href: '/dashboard/vendedores',
    minPlan: 'basico' as Plan,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 10-16 0" />
        <path d="M16 11l2 2 4-4" />
      </svg>
    ),
  },
];

const PLAN_LABEL: Record<Plan, string> = {
  basico:      'Básico',
  business:    'Business',
  profesional: 'Profesional',   // legacy
  empresarial: 'Empresarial',
};

const PLAN_COLOR: Record<Plan, string> = {
  basico:      'bg-gray-100 text-gray-600',
  business:    'bg-[#fdf3d9] text-[#92700a]',
  profesional: 'bg-[#fdf3d9] text-[#92700a]',   // legacy — mismo look que business
  empresarial: 'bg-[#1a1a1a] text-[#d4a843]',
};

/* ── Component ────────────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }
    if (storedUser.rol === 'superadmin') {
      window.location.href = '/admin/panel';
      return;
    }
    setUser(storedUser);
  }, [router]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (!user) return null;

  const initials = user.nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f9fafb]">
      {/* ── Mobile backdrop ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0
          ${ collapsed ? 'w-16' : 'w-60' }
          ${ mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0' }
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
          <Image src="/logo.png" alt="TerraGroup" width={36} height={36} className="shrink-0" />
          {!collapsed && (
            <div>
              <p className="font-bold text-sm text-gray-900 leading-tight">
                <span>Terra</span><span className="text-[#d4a843]">Group</span>
              </p>
              <p className="text-[10px] text-gray-400 leading-tight">Sistema de Cobranza</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
          {(() => {
            // Filtrado adicional por permisos específicos del usuario (definidos por el admin).
            // Si secciones_permitidas es null/vacío, no filtra (muestra todo lo del plan).
            const seccionesArr = (user.secciones_permitidas ?? '').split(',').map(s => s.trim()).filter(Boolean);
            const visibleItems = seccionesArr.length === 0
              ? NAV_ITEMS
              : NAV_ITEMS.filter(i => seccionesArr.includes(i.href));
            return visibleItems;
          })().map((item) => {
            const allowed = planAllows(user.plan, item.minPlan);
            const active = pathname === item.href;

            if (!allowed) {
              return (
                <div
                  key={item.href}
                  title={`Requiere plan ${PLAN_LABEL[item.minPlan]}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-35 cursor-not-allowed ${
                    collapsed ? 'justify-center' : ''
                  }`}
                >
                  <span className="text-gray-400 shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <span className="text-sm text-gray-400 flex-1">{item.label}</span>
                  )}
                  {!collapsed && (
                    <span className="text-[9px] font-bold uppercase bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                      {PLAN_LABEL[item.minPlan]}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-[#fdf3d9] text-[#92700a] font-semibold border-l-4 border-[#d4a843]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`shrink-0 ${active ? 'text-[#d4a843]' : ''}`}>{item.icon}</span>
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Plan badge + logout + collapse */}
        <div className="p-3 border-t border-gray-100 flex flex-col gap-2">
          {!collapsed && (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg text-center ${PLAN_COLOR[user.plan]}`}>
              Plan {PLAN_LABEL[user.plan]}
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />}
            </svg>
            {!collapsed && 'Colapsar menú'}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors mr-1"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* User */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-[#d4a843] flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-gray-900 leading-tight">{user.nombre}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{user.email}</p>
            </div>
          </div>
        </header>

        {/* Trial / suscripción banner */}
        <TrialBanner />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
