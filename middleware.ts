import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'mecaniconline-secret-key-2024');

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/historial', '/api/public/'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Rutas de API: solo verificar token, no redirigir
  if (pathname.startsWith('/api/')) {
    const token = req.cookies.get('mc_session')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }
  }

  const token = req.cookies.get('mc_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const rol = payload.rol as string;

    // Jefe intentando acceder a rutas del mecánico
    if (rol === 'jefe' && pathname.startsWith('/mecanico')) {
      return NextResponse.redirect(new URL('/recepcion', req.url));
    }

    if (rol === 'mecanico') {
      // Rutas siempre bloqueadas para mecánicos (sin importar permisos)
      const ALWAYS_BLOCKED = ['/configuracion'];
      if (ALWAYS_BLOCKED.some(p => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL('/mecanico', req.url));
      }

      // Rutas del admin que se pueden habilitar con permisos
      const ADMIN_PATHS = [
        '/dashboard', '/recepcion', '/ordenes-trabajo', '/cotizaciones',
        '/cobros', '/inventario', '/clientes', '/vehiculos', '/calendario', '/rentabilidad',
      ];
      const adminPath = ADMIN_PATHS.find(p => pathname.startsWith(p));
      if (adminPath) {
        const permisos = (payload.permisos as string[]) ?? [];
        const key = adminPath.replace('/', '');
        if (!permisos.includes(key)) {
          return NextResponse.redirect(new URL('/mecanico', req.url));
        }
      }

      // Redirigir raíz
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/mecanico', req.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
