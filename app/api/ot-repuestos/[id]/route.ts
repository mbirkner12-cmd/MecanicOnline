import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ot_repuestos, repuestos } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const otRepId = parseInt(id);

  // Traer el registro antes de borrar para restaurar stock
  const [existing] = await db.select().from(ot_repuestos).where(eq(ot_repuestos.id, otRepId)).limit(1);
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  // Restaurar stock
  const [rep] = await db.select().from(repuestos).where(eq(repuestos.id, existing.repuesto_id)).limit(1);
  if (rep) {
    await db.update(repuestos).set({
      stock_actual: (rep.stock_actual ?? 0) + existing.cantidad,
      updated_at: sql`(datetime('now'))`,
    }).where(eq(repuestos.id, existing.repuesto_id));
  }

  await db.delete(ot_repuestos).where(eq(ot_repuestos.id, otRepId));
  return NextResponse.json({ ok: true });
}
