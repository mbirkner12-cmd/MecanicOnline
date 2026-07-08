import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientes, vehiculos, recepciones } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { normalizeRut } from '@/lib/format';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rut = searchParams.get('rut');

    if (!rut) {
      const result = await db
        .select({
          id: clientes.id,
          rut: clientes.rut,
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          correo: clientes.correo,
          direccion: clientes.direccion,
          whatsapp: clientes.whatsapp,
          created_at: clientes.created_at,
          num_vehiculos: sql<number>`COUNT(DISTINCT ${vehiculos.id})`,
          num_visitas: sql<number>`COUNT(DISTINCT ${recepciones.id})`,
          ultima_visita: sql<string | null>`MAX(${recepciones.fecha_hora_ingreso})`,
        })
        .from(clientes)
        .leftJoin(vehiculos, eq(vehiculos.cliente_id, clientes.id))
        .leftJoin(recepciones, eq(recepciones.cliente_id, clientes.id))
        .groupBy(clientes.id)
        .orderBy(desc(sql`MAX(${recepciones.fecha_hora_ingreso})`));
      return NextResponse.json(result);
    }

    // Búsqueda por RUT normalizando puntos para soportar ambos formatos
    const rutNorm = normalizeRut(rut);
    const result = await db
      .select()
      .from(clientes)
      .where(sql`REPLACE(${clientes.rut}, '.', '') = ${rutNorm}`)
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('GET /api/clientes error:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rut, nombre, telefono, correo, direccion, whatsapp } = body;

    if (!rut || !nombre) {
      return NextResponse.json({ error: 'RUT y nombre son requeridos' }, { status: 400 });
    }

    const [created] = await db
      .insert(clientes)
      .values({
        rut,
        nombre,
        telefono: telefono || null,
        correo: correo || null,
        direccion: direccion || null,
        whatsapp: whatsapp || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/clientes error:', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un cliente con ese RUT' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
