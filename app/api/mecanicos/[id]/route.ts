import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mecanicos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { rut, nombre, contrato_url, activo } = body;

    if (!rut || !nombre) {
      return NextResponse.json({ error: 'RUT y nombre son requeridos' }, { status: 400 });
    }

    const [updated] = await db
      .update(mecanicos)
      .set({ rut, nombre, contrato_url: contrato_url || null, activo: activo ?? true })
      .where(eq(mecanicos.id, numId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('PUT /api/mecanicos/[id] error:', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un mecánico con ese RUT' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al actualizar mecánico' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(mecanicos)
      .where(eq(mecanicos.id, numId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/mecanicos/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar mecánico' }, { status: 500 });
  }
}
