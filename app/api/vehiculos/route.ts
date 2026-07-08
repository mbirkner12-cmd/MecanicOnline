import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehiculos, clientes, recepciones } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patente = searchParams.get('patente');

    if (!patente) {
      const result = await db
        .select({
          id: vehiculos.id,
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          anio: vehiculos.anio,
          kilometraje_actual: vehiculos.kilometraje_actual,
          cliente_id: vehiculos.cliente_id,
          created_at: vehiculos.created_at,
          cliente_nombre: clientes.nombre,
          cliente_rut: clientes.rut,
          cliente_telefono: clientes.telefono,
          num_visitas: sql<number>`COUNT(DISTINCT ${recepciones.id})`,
          ultima_visita: sql<string | null>`MAX(${recepciones.fecha_hora_ingreso})`,
        })
        .from(vehiculos)
        .leftJoin(clientes, eq(vehiculos.cliente_id, clientes.id))
        .leftJoin(recepciones, eq(recepciones.vehiculo_id, vehiculos.id))
        .groupBy(vehiculos.id)
        .orderBy(desc(sql`MAX(${recepciones.fecha_hora_ingreso})`));
      return NextResponse.json(result);
    }

    // Búsqueda exacta por patente con JOIN al cliente
    const result = await db
      .select({
        id: vehiculos.id,
        patente: vehiculos.patente,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        anio: vehiculos.anio,
        kilometraje_actual: vehiculos.kilometraje_actual,
        cliente_id: vehiculos.cliente_id,
        revision_tecnica_url: vehiculos.revision_tecnica_url,
        revision_tecnica_vencimiento: vehiculos.revision_tecnica_vencimiento,
        permiso_circulacion_url: vehiculos.permiso_circulacion_url,
        permiso_circulacion_vencimiento: vehiculos.permiso_circulacion_vencimiento,
        created_at: vehiculos.created_at,
        cliente: {
          id: clientes.id,
          rut: clientes.rut,
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          correo: clientes.correo,
          direccion: clientes.direccion,
          whatsapp: clientes.whatsapp,
        },
      })
      .from(vehiculos)
      .leftJoin(clientes, eq(vehiculos.cliente_id, clientes.id))
      .where(eq(vehiculos.patente, patente.toUpperCase()))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('GET /api/vehiculos error:', error);
    return NextResponse.json({ error: 'Error al obtener vehículos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patente,
      marca,
      modelo,
      anio,
      kilometraje_actual,
      cliente_id,
      revision_tecnica_url,
      revision_tecnica_vencimiento,
      permiso_circulacion_url,
      permiso_circulacion_vencimiento,
    } = body;

    if (!patente || !marca || !modelo || !anio || kilometraje_actual === undefined || !cliente_id) {
      return NextResponse.json(
        { error: 'Patente, marca, modelo, año, kilometraje y cliente son requeridos' },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(vehiculos)
      .values({
        patente: patente.toUpperCase(),
        marca,
        modelo,
        anio: Number(anio),
        kilometraje_actual: Number(kilometraje_actual),
        cliente_id: Number(cliente_id),
        revision_tecnica_url: revision_tecnica_url || null,
        revision_tecnica_vencimiento: revision_tecnica_vencimiento || null,
        permiso_circulacion_url: permiso_circulacion_url || null,
        permiso_circulacion_vencimiento: permiso_circulacion_vencimiento || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/vehiculos error:', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un vehículo con esa patente' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear vehículo' }, { status: 500 });
  }
}
