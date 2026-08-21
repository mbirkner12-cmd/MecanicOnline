import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { repuestos, repuesto_modelo } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id);
  const body = await req.json();
  const { nombre, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, unidad, modelo_ids } = body;

  const [row] = await db.update(repuestos).set({
    nombre: (() => { const n = (nombre ?? '').trim().toLowerCase(); return n.charAt(0).toUpperCase() + n.slice(1); })(),
    descripcion: descripcion?.trim() || null,
    precio_costo: precio_costo ?? 0,
    precio_venta: precio_venta ?? 0,
    stock_actual: stock_actual ?? 0,
    stock_minimo: stock_minimo ?? 1,
    unidad: unidad ?? 'unidad',
    updated_at: sql`(datetime('now'))`,
  }).where(eq(repuestos.id, numId)).returning();

  if (!row) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // Actualizar modelos si se enviaron
  if (Array.isArray(modelo_ids)) {
    await db.delete(repuesto_modelo).where(eq(repuesto_modelo.repuesto_id, numId));
    if (modelo_ids.length > 0) {
      await db.insert(repuesto_modelo).values(
        modelo_ids.map((mid: number) => ({ repuesto_id: numId, modelo_id: mid }))
      );
    }
  }

  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(repuestos).where(eq(repuestos.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
