import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { puestos } from '@/lib/db/schema';

export async function GET() {
  try {
    const result = await db.select().from(puestos).orderBy(puestos.nombre);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/puestos error:', error);
    return NextResponse.json({ error: 'Error al obtener puestos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, tipo } = body;

    if (!nombre || !tipo) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const [created] = await db
      .insert(puestos)
      .values({ nombre, tipo })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/puestos error:', error);
    return NextResponse.json({ error: 'Error al crear puesto' }, { status: 500 });
  }
}
