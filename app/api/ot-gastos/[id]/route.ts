import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ot_gastos } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    cobrar_cliente?: boolean;
    descripcion?: string;
    monto?: number;
  };

  const fields: Record<string, unknown> = {};
  if (body.cobrar_cliente !== undefined) fields.cobrar_cliente = body.cobrar_cliente;
  if (body.descripcion !== undefined) fields.descripcion = body.descripcion.trim();
  if (body.monto !== undefined) fields.monto = body.monto;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Sin campos a actualizar' }, { status: 400 });
  }

  await db.update(ot_gastos).set(fields).where(eq(ot_gastos.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(ot_gastos).where(eq(ot_gastos.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
