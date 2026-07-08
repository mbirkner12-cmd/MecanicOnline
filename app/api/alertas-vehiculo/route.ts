import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { alertas_vehiculo } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehiculoId = searchParams.get('vehiculo_id');

    if (!vehiculoId) {
      return NextResponse.json({ error: 'vehiculo_id es requerido' }, { status: 400 });
    }

    const result = await db
      .select()
      .from(alertas_vehiculo)
      .where(eq(alertas_vehiculo.vehiculo_id, parseInt(vehiculoId, 10)))
      .orderBy(asc(alertas_vehiculo.fecha_vencimiento));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/alertas-vehiculo error:', error);
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      vehiculo_id: number;
      tipo: string;
      descripcion?: string | null;
      fecha_vencimiento?: string | null;
      dias_anticipacion?: number;
    };

    const { vehiculo_id, tipo, descripcion, fecha_vencimiento, dias_anticipacion } = body;

    if (!vehiculo_id || !tipo) {
      return NextResponse.json({ error: 'vehiculo_id y tipo son requeridos' }, { status: 400 });
    }

    const [created] = await db
      .insert(alertas_vehiculo)
      .values({
        vehiculo_id: Number(vehiculo_id),
        tipo: tipo as typeof alertas_vehiculo.$inferInsert['tipo'],
        descripcion: descripcion ?? null,
        fecha_vencimiento: fecha_vencimiento ?? null,
        dias_anticipacion: dias_anticipacion ? Number(dias_anticipacion) : 30,
        activo: true,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/alertas-vehiculo error:', error);
    return NextResponse.json({ error: 'Error al crear alerta' }, { status: 500 });
  }
}
