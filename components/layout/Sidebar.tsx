'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Users,
  MapPin,
  Hammer,
  Settings,
  Car,
  FileText,
  ClipboardList,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const operativaItems: NavItem[] = [
  { label: 'Recepción', href: '/recepcion', icon: Car },
  { label: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
  { label: 'Órdenes de trabajo', href: '/ordenes-trabajo', icon: ClipboardList },
];

const registrosItems: NavItem[] = [
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Vehículos', href: '/vehiculos', icon: Car },
];

const configuracionItems: NavItem[] = [
  { label: 'Mecánicos', href: '/configuracion/mecanicos', icon: Users },
  { label: 'Puestos', href: '/configuracion/puestos', icon: MapPin },
  { label: 'Herramientas', href: '/configuracion/herramientas', icon: Hammer },
  { label: 'Usuarios', href: '/configuracion/usuarios', icon: UserCircle },
  { label: 'General', href: '/configuracion/general', icon: Settings },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

  if (item.disabled) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 cursor-default"
        title="Disponible próximamente"
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span>{item.label}</span>
      </div>
    );
  }

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

export function Sidebar() {
  const router = useRouter();
  const { session } = useSession();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-zinc-200 flex flex-col fixed left-0 top-0">
      {/* Logo / Brand */}
      <div className="p-5 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-zinc-800" />
          <span className="font-bold text-zinc-900 text-lg tracking-tight">MecanicOnline</span>
        </div>
        {session && (
          <p className="text-xs text-zinc-500 mt-1.5 truncate">
            {session.nombre}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Operativa */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-3">
            Operativa
          </p>
          <div className="space-y-1">
            {operativaItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Registros */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-3">
            Registros
          </p>
          <div className="space-y-1">
            {registrosItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Configuración */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-3">
            Configuración
          </p>
          <div className="space-y-1">
            {configuracionItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
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
