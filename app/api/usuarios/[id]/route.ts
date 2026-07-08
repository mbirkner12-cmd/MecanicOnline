import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      nombre?: string;
      username?: string;
      password?: string;
      rol?: 'jefe' | 'mecanico';
      mecanico_id?: number | null;
      activo?: boolean;
    };

    const updateData: Record<string, unknown> = {};

    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.username !== undefined) updateData.username = body.username;
    if (body.rol !== undefined) updateData.rol = body.rol;
    if (body.mecanico_id !== undefined) updateData.mecanico_id = body.mecanico_id ?? null;
    if (body.activo !== undefined) updateData.activo = body.activo;
    if (body.password) {
      updateData.password_hash = bcrypt.hashSync(body.password, 10);
    }

    const [updated] = await db
      .update(usuarios)
      .set(updateData)
      .where(eq(usuarios.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { password_hash: _, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (error) {
    console.error('PUT /api/usuarios/[id] error:', error);
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(usuarios)
      .where(eq(usuarios.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/usuarios/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
