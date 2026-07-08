import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rut, nombre, telefono, correo, direccion, whatsapp } = body;

    const updateData: Partial<typeof clientes.$inferInsert> = {};
    if (rut !== undefined) updateData.rut = rut;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono || null;
    if (correo !== undefined) updateData.correo = correo || null;
    if (direccion !== undefined) updateData.direccion = direccion || null;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;

    const [updated] = await db
      .update(clientes)
      .set(updateData)
      .where(eq(clientes.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('PUT /api/clientes/[id] error:', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un cliente con ese RUT' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}
