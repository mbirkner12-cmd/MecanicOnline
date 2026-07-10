import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eventos_calendario } from '@/lib/db/schema';
import { like, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mes = searchParams.get('mes'); // 'YYYY-MM'
  if (!mes) return NextResponse.json({ error: 'mes requerido' }, { status: 400 });
  const eventos = await db.select().from(eventos_calendario)
    .where(like(eventos_calendario.fecha, `${mes}%`))
    .orderBy(asc(eventos_calendario.fecha), asc(eventos_calendario.created_at));
  return NextResponse.json(eventos);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { fecha, titulo, tipo, descripcion } = body;
  if (!fecha || !titulo) return NextResponse.json({ error: 'fecha y titulo son requeridos' }, { status: 400 });
  const [nuevo] = await db.insert(eventos_calendario).values({
    fecha, titulo, tipo: tipo ?? 'otro', descripcion: descripcion || null,
  }).returning();
  return NextResponse.json(nuevo, { status: 201 });
}
