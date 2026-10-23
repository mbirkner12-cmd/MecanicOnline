'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MecanicoSidebar } from '@/components/layout/MecanicoSidebar';
import { useSession } from '@/lib/hooks/useSession';
import { Wrench, Menu } from 'lucide-react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session } = useSession();

  const noSidebar = pathname === '/login';
  const isMecanico = session?.rol === 'mecanico';

  if (noSidebar) return <>{children}</>;

  // Mecánico en sus rutas propias: sin wrapper (el layout /mecanico ya lo tiene)
  if (pathname.startsWith('/mecanico')) return <>{children}</>;

  // Mecánico en rutas del admin (tiene permisos): mostrar MecanicoSidebar
  if (isMecanico) {
    return (
      <div className="flex">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <MecanicoSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 md:ml-56 min-h-screen flex flex-col">
          <header className="md:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-zinc-800" />
              <span className="font-bold text-zinc-900 tracking-tight">MecanicOnline</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    );
  }

  // Admin: layout normal
  return (
    <div className="flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <header className="md:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-zinc-800" />
            <span className="font-bold text-zinc-900 tracking-tight">MecanicOnline</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
