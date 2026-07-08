import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { herramientas } from '@/lib/db/schema';

export async function GET() {
  try {
    const result = await db.select().from(herramientas).orderBy(herramientas.nombre);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/herramientas error:', error);
    return NextResponse.json({ error: 'Error al obtener herramientas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, marca, cantidad } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }
    if (cantidad === undefined || cantidad === null || cantidad < 0) {
      return NextResponse.json({ error: 'La cantidad debe ser un número mayor o igual a 0' }, { status: 400 });
    }

    const [created] = await db
      .insert(herramientas)
      .values({
        nombre,
        descripcion: descripcion || null,
        marca: marca || null,
        cantidad: parseInt(cantidad, 10),
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/herramientas error:', error);
    return NextResponse.json({ error: 'Error al crear herramienta' }, { status: 500 });
  }
}
