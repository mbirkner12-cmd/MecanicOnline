import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'mecaniconline-secret-key-2024');

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

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

    // Mecánico intentando acceder a rutas del jefe
    const jefeOnlyPaths = ['/cotizaciones', '/configuracion', '/clientes'];
    if (rol === 'mecanico' && jefeOnlyPaths.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/mecanico', req.url));
    }

    // Jefe intentando acceder a rutas del mecánico
    if (rol === 'jefe' && pathname.startsWith('/mecanico')) {
      return NextResponse.redirect(new URL('/recepcion', req.url));
    }

    // Mecánico en raíz o recepción → redirigir a su dashboard
    if (rol === 'mecanico' && (pathname === '/' || pathname === '/recepcion')) {
      return NextResponse.redirect(new URL('/mecanico', req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
