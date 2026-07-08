'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Wrench, Car, ClipboardList, LogOut } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Mis vehículos', href: '/mecanico', icon: Car, exact: true },
  { label: 'Mis órdenes', href: '/mecanico/ordenes-trabajo', icon: ClipboardList },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-zinc-100 text-zinc-900 font-medium'
          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function MecanicoSidebar() {
  const router = useRouter();
  const { session } = useSession();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-zinc-200 flex flex-col fixed left-0 top-0">
      {/* Brand */}
      <div className="p-5 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-zinc-800" />
          <span className="font-bold text-zinc-900 text-base tracking-tight">MecanicOnline</span>
        </div>
        {session && (
          <p className="text-xs text-zinc-500 mt-1.5 truncate font-medium">
            {session.nombre}
          </p>
        )}
        <p className="text-xs text-zinc-400 mt-0.5">Mecánico</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-zinc-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
