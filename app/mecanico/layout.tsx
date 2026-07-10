'use client';

import { useState } from 'react';
import { MecanicoSidebar } from '@/components/layout/MecanicoSidebar';
import { Wrench, Menu } from 'lucide-react';

export default function MecanicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <MecanicoSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-56 min-h-screen flex flex-col">
        {/* Mobile top bar */}
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

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
