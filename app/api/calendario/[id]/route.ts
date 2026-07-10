import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eventos_calendario } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(eventos_calendario).where(eq(eventos_calendario.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { titulo, tipo, descripcion } = body;
  const updateData: Partial<typeof eventos_calendario.$inferInsert> = {};
  if (titulo !== undefined) updateData.titulo = titulo;
  if (tipo !== undefined) updateData.tipo = tipo;
  if (descripcion !== undefined) updateData.descripcion = descripcion || null;
  const [updated] = await db.update(eventos_calendario).set(updateData)
    .where(eq(eventos_calendario.id, Number(id))).returning();
  return NextResponse.json(updated);
}
