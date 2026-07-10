import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehiculos, clientes, alertas_vehiculo, recepciones } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const [vehiculo] = await db
      .select({
        id: vehiculos.id,
        patente: vehiculos.patente,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        anio: vehiculos.anio,
        kilometraje_actual: vehiculos.kilometraje_actual,
        revision_tecnica_url: vehiculos.revision_tecnica_url,
        revision_tecnica_vencimiento: vehiculos.revision_tecnica_vencimiento,
        permiso_circulacion_url: vehiculos.permiso_circulacion_url,
        permiso_circulacion_vencimiento: vehiculos.permiso_circulacion_vencimiento,
        created_at: vehiculos.created_at,
        cliente_id: vehiculos.cliente_id,
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
      .where(eq(vehiculos.id, numId))
      .limit(1);

    if (!vehiculo) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const alertas = await db
      .select()
      .from(alertas_vehiculo)
      .where(eq(alertas_vehiculo.vehiculo_id, numId))
      .orderBy(alertas_vehiculo.fecha_vencimiento);

    const visitas = await db
      .select({
        id: recepciones.id,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        kilometraje: recepciones.kilometraje,
        estado: recepciones.estado,
        motivo_ingreso: recepciones.motivo_ingreso,
        diagnostico_mecanico: recepciones.diagnostico_mecanico,
      })
      .from(recepciones)
      .where(eq(recepciones.vehiculo_id, numId))
      .orderBy(desc(recepciones.fecha_hora_ingreso))
      .limit(20);

    return NextResponse.json({ ...vehiculo, alertas, visitas });
  } catch (error) {
    console.error('GET /api/vehiculos/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener vehículo' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      patente,
      marca,
      modelo,
      anio,
      vin,
      kilometraje_actual,
      cliente_id,
      revision_tecnica_url,
      revision_tecnica_vencimiento,
      permiso_circulacion_url,
      permiso_circulacion_vencimiento,
    } = body;

    const updateData: Partial<typeof vehiculos.$inferInsert> = {};
    if (patente !== undefined) updateData.patente = patente.toUpperCase();
    if (marca !== undefined) updateData.marca = marca;
    if (modelo !== undefined) updateData.modelo = modelo;
    if (anio !== undefined) updateData.anio = Number(anio);
    if (vin !== undefined) updateData.vin = vin || null;
    if (kilometraje_actual !== undefined) updateData.kilometraje_actual = Number(kilometraje_actual);
    if (cliente_id !== undefined) updateData.cliente_id = Number(cliente_id);
    if (revision_tecnica_url !== undefined) updateData.revision_tecnica_url = revision_tecnica_url || null;
    if (revision_tecnica_vencimiento !== undefined) updateData.revision_tecnica_vencimiento = revision_tecnica_vencimiento || null;
    if (permiso_circulacion_url !== undefined) updateData.permiso_circulacion_url = permiso_circulacion_url || null;
    if (permiso_circulacion_vencimiento !== undefined) updateData.permiso_circulacion_vencimiento = permiso_circulacion_vencimiento || null;

    const [updated] = await db
      .update(vehiculos)
      .set(updateData)
      .where(eq(vehiculos.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('PUT /api/vehiculos/[id] error:', error);
    if (error instanceof Error && error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un vehículo con esa patente' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al actualizar vehículo' }, { status: 500 });
  }
}
