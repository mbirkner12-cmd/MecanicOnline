import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { configuracion } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const [config] = await db
      .select()
      .from(configuracion)
      .where(eq(configuracion.clave, 'valor_hora'));

    return NextResponse.json({
      valor_hora: config?.valor ?? '0',
    });
  } catch (error) {
    console.error('GET /api/configuracion error:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { valor_hora } = body;

    if (valor_hora === undefined || valor_hora === null) {
      return NextResponse.json({ error: 'valor_hora es requerido' }, { status: 400 });
    }

    const numVal = parseFloat(valor_hora);
    if (isNaN(numVal) || numVal < 0) {
      return NextResponse.json({ error: 'valor_hora debe ser un número positivo' }, { status: 400 });
    }

    // Upsert: try to update, if not exists insert
    const existing = await db
      .select()
      .from(configuracion)
      .where(eq(configuracion.clave, 'valor_hora'));

    if (existing.length > 0) {
      await db
        .update(configuracion)
        .set({ valor: String(numVal), updated_at: new Date().toISOString() })
        .where(eq(configuracion.clave, 'valor_hora'));
    } else {
      await db.insert(configuracion).values({ clave: 'valor_hora', valor: String(numVal) });
    }

    return NextResponse.json({ valor_hora: String(numVal) });
  } catch (error) {
    console.error('PUT /api/configuracion error:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
