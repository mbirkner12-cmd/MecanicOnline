import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cotizacion_repuestos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rowId = parseInt(id);

  const [existing] = await db
    .select()
    .from(cotizacion_repuestos)
    .where(eq(cotizacion_repuestos.id, rowId))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await db.delete(cotizacion_repuestos).where(eq(cotizacion_repuestos.id, rowId));
  return NextResponse.json({ ok: true });
}
