import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recepciones, vehiculos, clientes, mecanicos, puestos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .select({
        id: recepciones.id,
        vehiculo_id: recepciones.vehiculo_id,
        cliente_id: recepciones.cliente_id,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        kilometraje: recepciones.kilometraje,
        nivel_bencina: recepciones.nivel_bencina,
        foto_tablero_url: recepciones.foto_tablero_url,
        fotos_urls: recepciones.fotos_urls,
        mecanico_id: recepciones.mecanico_id,
        puesto_id: recepciones.puesto_id,
        estado: recepciones.estado,
        diagnostico_mecanico: recepciones.diagnostico_mecanico,
        motivo_ingreso: recepciones.motivo_ingreso,
        created_at: recepciones.created_at,
        updated_at: recepciones.updated_at,
        vehiculo: {
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
        },
        cliente: {
          id: clientes.id,
          rut: clientes.rut,
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          correo: clientes.correo,
          direccion: clientes.direccion,
          whatsapp: clientes.whatsapp,
        },
        mecanico: {
          id: mecanicos.id,
          nombre: mecanicos.nombre,
          rut: mecanicos.rut,
        },
        puesto: {
          id: puestos.id,
          nombre: puestos.nombre,
          tipo: puestos.tipo,
        },
      })
      .from(recepciones)
      .leftJoin(vehiculos, eq(recepciones.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(recepciones.cliente_id, clientes.id))
      .leftJoin(mecanicos, eq(recepciones.mecanico_id, mecanicos.id))
      .leftJoin(puestos, eq(recepciones.puesto_id, puestos.id))
      .where(eq(recepciones.id, Number(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('GET /api/recepciones/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener recepción' }, { status: 500 });
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
      vehiculo_id,
      cliente_id,
      fecha_hora_ingreso,
      kilometraje,
      nivel_bencina,
      foto_tablero_url,
      fotos_urls,
      mecanico_id,
      puesto_id,
      estado,
      diagnostico_mecanico,
      motivo_ingreso,
    } = body;

    const updateData: Partial<typeof recepciones.$inferInsert> = {
      updated_at: new Date().toISOString(),
    };

    if (vehiculo_id !== undefined) updateData.vehiculo_id = Number(vehiculo_id);
    if (cliente_id !== undefined) updateData.cliente_id = Number(cliente_id);
    if (fecha_hora_ingreso !== undefined) updateData.fecha_hora_ingreso = fecha_hora_ingreso;
    if (kilometraje !== undefined) updateData.kilometraje = Number(kilometraje);
    if (nivel_bencina !== undefined) updateData.nivel_bencina = nivel_bencina || null;
    if (foto_tablero_url !== undefined) updateData.foto_tablero_url = foto_tablero_url || null;
    if (fotos_urls !== undefined) {
      updateData.fotos_urls = Array.isArray(fotos_urls)
        ? JSON.stringify(fotos_urls)
        : fotos_urls;
    }
    if (mecanico_id !== undefined) updateData.mecanico_id = mecanico_id ? Number(mecanico_id) : null;
    if (puesto_id !== undefined) updateData.puesto_id = puesto_id ? Number(puesto_id) : null;
    if (estado !== undefined) updateData.estado = estado;
    if (diagnostico_mecanico !== undefined) updateData.diagnostico_mecanico = diagnostico_mecanico || null;
    if (motivo_ingreso !== undefined) updateData.motivo_ingreso = motivo_ingreso || null;

    const [updated] = await db
      .update(recepciones)
      .set(updateData)
      .where(eq(recepciones.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/recepciones/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar recepción' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(recepciones)
      .where(eq(recepciones.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/recepciones/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar recepción' }, { status: 500 });
  }
}
