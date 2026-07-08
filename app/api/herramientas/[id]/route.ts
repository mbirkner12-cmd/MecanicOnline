import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { herramientas } from '@/lib/db/schema';
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
    const { nombre, descripcion, marca, cantidad } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }
    if (cantidad === undefined || cantidad === null || cantidad < 0) {
      return NextResponse.json({ error: 'La cantidad debe ser un número mayor o igual a 0' }, { status: 400 });
    }

    const [updated] = await db
      .update(herramientas)
      .set({
        nombre,
        descripcion: descripcion || null,
        marca: marca || null,
        cantidad: parseInt(cantidad, 10),
      })
      .where(eq(herramientas.id, numId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/herramientas/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar herramienta' }, { status: 500 });
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
      .delete(herramientas)
      .where(eq(herramientas.id, numId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/herramientas/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar herramienta' }, { status: 500 });
  }
}
