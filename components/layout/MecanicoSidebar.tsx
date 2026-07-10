'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
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

interface MecanicoSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function MecanicoSidebar({ open, onClose }: MecanicoSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();

  useEffect(() => {
    onClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside
      className={cn(
        'w-56 min-h-screen bg-white border-r border-zinc-200 flex flex-col fixed left-0 top-0 z-30 transition-transform duration-200 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      <div className="p-5 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-zinc-800" />
          <span className="font-bold text-zinc-900 text-base tracking-tight">MecanicOnline</span>
        </div>
        {session && (
          <p className="text-xs text-zinc-500 mt-1.5 truncate font-medium">{session.nombre}</p>
        )}
        <p className="text-xs text-zinc-400 mt-0.5">Mecánico</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onClose} />
        ))}
      </nav>

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
