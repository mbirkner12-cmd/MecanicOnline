import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gastos_estructura } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    if (isNaN(numId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await req.json() as { nombre?: string; monto_mensual?: number; tipo?: 'fijo' | 'gav'; activo?: boolean };
    const updates: Record<string, unknown> = {};
    if (body.nombre !== undefined) updates.nombre = body.nombre.trim();
    if (body.monto_mensual !== undefined) updates.monto_mensual = body.monto_mensual;
    if (body.tipo !== undefined) updates.tipo = body.tipo;
    if (body.activo !== undefined) updates.activo = body.activo;

    await db.update(gastos_estructura).set(updates).where(eq(gastos_estructura.id, numId));
    const [row] = await db.select().from(gastos_estructura).where(eq(gastos_estructura.id, numId)).limit(1);
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/gastos-estructura/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const numId = parseInt(id);
    if (isNaN(numId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    await db.delete(gastos_estructura).where(eq(gastos_estructura.id, numId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/gastos-estructura/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
