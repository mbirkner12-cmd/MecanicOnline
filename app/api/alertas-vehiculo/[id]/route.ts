import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { alertas_vehiculo } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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

    const body = await request.json() as {
      tipo?: string;
      descripcion?: string | null;
      fecha_vencimiento?: string | null;
      dias_anticipacion?: number;
      activo?: boolean;
    };

    const updateFields: Record<string, unknown> = {
      updated_at: sql`(datetime('now'))`,
    };
    if (body.tipo !== undefined) updateFields.tipo = body.tipo;
    if (body.descripcion !== undefined) updateFields.descripcion = body.descripcion;
    if (body.fecha_vencimiento !== undefined) updateFields.fecha_vencimiento = body.fecha_vencimiento;
    if (body.dias_anticipacion !== undefined) updateFields.dias_anticipacion = Number(body.dias_anticipacion);
    if (body.activo !== undefined) updateFields.activo = body.activo;

    const [updated] = await db
      .update(alertas_vehiculo)
      .set(updateFields)
      .where(eq(alertas_vehiculo.id, numId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/alertas-vehiculo/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar alerta' }, { status: 500 });
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

    await db.delete(alertas_vehiculo).where(eq(alertas_vehiculo.id, numId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/alertas-vehiculo/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar alerta' }, { status: 500 });
  }
}
