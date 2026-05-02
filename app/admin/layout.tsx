'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.rol !== 'superadmin') {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Top bar */}
      <header className="bg-[#1a1a1a] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight">
            Terra<span className="text-[#d4a843]">Group</span>
          </span>
          <span className="text-xs bg-[#d4a843]/20 text-[#d4a843] border border-[#d4a843]/30 px-2 py-0.5 rounded-full font-semibold">
            Super Admin
          </span>
        </div>
        <a href="/login" className="text-xs text-gray-400 hover:text-white transition-colors">Cerrar sesión</a>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
