import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mecanicos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.select().from(mecanicos).orderBy(mecanicos.nombre);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/mecanicos error:', error);
    return NextResponse.json({ error: 'Error al obtener mecánicos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rut, nombre, contrato_url } = body;

    if (!rut || !nombre) {
      return NextResponse.json({ error: 'RUT y nombre son requeridos' }, { status: 400 });
    }

    const [created] = await db
      .insert(mecanicos)
      .values({ rut, nombre, contrato_url: contrato_url || null })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/mecanicos error:', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un mecánico con ese RUT' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear mecánico' }, { status: 500 });
  }
}
