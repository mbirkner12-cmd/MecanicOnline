import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { puestos } from '@/lib/db/schema';
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
    const { nombre, tipo, activo } = body;

    if (!nombre || !tipo) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const [updated] = await db
      .update(puestos)
      .set({ nombre, tipo, activo: activo ?? true })
      .where(eq(puestos.id, numId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/puestos/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar puesto' }, { status: 500 });
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
      .delete(puestos)
      .where(eq(puestos.id, numId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/puestos/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar puesto' }, { status: 500 });
  }
}
