import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios, mecanicos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const result = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        username: usuarios.username,
        rol: usuarios.rol,
        mecanico_id: usuarios.mecanico_id,
        activo: usuarios.activo,
        created_at: usuarios.created_at,
        mecanico: {
          id: mecanicos.id,
          nombre: mecanicos.nombre,
          rut: mecanicos.rut,
        },
      })
      .from(usuarios)
      .leftJoin(mecanicos, eq(usuarios.mecanico_id, mecanicos.id))
      .orderBy(usuarios.created_at);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/usuarios error:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      nombre: string;
      username: string;
      password: string;
      rol: 'jefe' | 'mecanico';
      mecanico_id?: number | null;
    };

    const { nombre, username, password, rol, mecanico_id } = body;

    if (!nombre || !username || !password || !rol) {
      return NextResponse.json(
        { error: 'nombre, username, password y rol son requeridos' },
        { status: 400 }
      );
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const [created] = await db
      .insert(usuarios)
      .values({
        nombre,
        username,
        password_hash,
        rol,
        mecanico_id: mecanico_id ?? null,
        activo: true,
      })
      .returning();

    // Return without password_hash
    const { password_hash: _, ...safe } = created;
    return NextResponse.json(safe, { status: 201 });
  } catch (error) {
    console.error('POST /api/usuarios error:', error);
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
