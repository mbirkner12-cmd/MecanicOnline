import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ordenes_trabajo,
  vehiculos,
  clientes,
  mecanicos,
  puestos,
  cotizaciones,
  recepciones,
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
}

// ── Shared: get OT by id with all joins ─────────────────────────────────────
async function getOTById(id: number) {
  const result = await db
    .select({
      id: ordenes_trabajo.id,
      numero: ordenes_trabajo.numero,
      cotizacion_id: ordenes_trabajo.cotizacion_id,
      recepcion_id: ordenes_trabajo.recepcion_id,
      vehiculo_id: ordenes_trabajo.vehiculo_id,
      cliente_id: ordenes_trabajo.cliente_id,
      mecanico_id: ordenes_trabajo.mecanico_id,
      puesto_id: ordenes_trabajo.puesto_id,
      insumos: ordenes_trabajo.insumos,
      tareas_completadas: ordenes_trabajo.tareas_completadas,
      diagnostico: ordenes_trabajo.diagnostico,
      fecha_estimada_inicio: ordenes_trabajo.fecha_estimada_inicio,
      fecha_estimada_fin: ordenes_trabajo.fecha_estimada_fin,
      fecha_hora_inicio: ordenes_trabajo.fecha_hora_inicio,
      fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
      estado: ordenes_trabajo.estado,
      created_at: ordenes_trabajo.created_at,
      updated_at: ordenes_trabajo.updated_at,
      vehiculo: {
        id: vehiculos.id,
        patente: vehiculos.patente,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        anio: vehiculos.anio,
        kilometraje_actual: vehiculos.kilometraje_actual,
      },
      cliente: {
        id: clientes.id,
        rut: clientes.rut,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
        correo: clientes.correo,
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
      cotizacion: {
        id: cotizaciones.id,
        numero: cotizaciones.numero,
        total: cotizaciones.total,
        mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
        mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
        repuestos: cotizaciones.repuestos,
        retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
        estado: cotizaciones.estado,
      },
      recepcion: {
        id: recepciones.id,
        estado: recepciones.estado,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        diagnostico_mecanico: recepciones.diagnostico_mecanico,
        motivo_ingreso: recepciones.motivo_ingreso,
      },
    })
    .from(ordenes_trabajo)
    .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
    .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
    .leftJoin(mecanicos, eq(ordenes_trabajo.mecanico_id, mecanicos.id))
    .leftJoin(puestos, eq(ordenes_trabajo.puesto_id, puestos.id))
    .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
    .leftJoin(recepciones, eq(ordenes_trabajo.recepcion_id, recepciones.id))
    .where(eq(ordenes_trabajo.id, id))
    .limit(1);

  return result[0] ?? null;
}

// ── GET /api/ordenes-trabajo/[id] ────────────────────────────────────────────
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

    const ot = await getOTById(numId);
    if (!ot) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    return NextResponse.json(ot);
  } catch (error) {
    console.error('GET /api/ordenes-trabajo/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener orden de trabajo' }, { status: 500 });
  }
}

// ── PUT /api/ordenes-trabajo/[id] ────────────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await getOTById(numId);
    if (!existing) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    const body = await request.json() as {
      diagnostico?: string | null;
      mecanico_id?: number | null;
      puesto_id?: number | null;
      insumos?: InsumoItem[];
      tareas_completadas?: boolean[];
      fecha_estimada_inicio?: string | null;
      fecha_estimada_fin?: string | null;
      fecha_hora_inicio?: string | null;
      fecha_hora_fin?: string | null;
      estado?: 'creada' | 'en_reparacion' | 'listo_para_entregar' | 'entregado';
    };

    // Build update fields
    const updateFields: Record<string, unknown> = {
      updated_at: sql`(datetime('now'))`,
    };
    if (body.diagnostico !== undefined) {
      updateFields.diagnostico = body.diagnostico;
    }
    if (body.mecanico_id !== undefined) {
      updateFields.mecanico_id = body.mecanico_id;
    }
    if (body.puesto_id !== undefined) {
      updateFields.puesto_id = body.puesto_id;
    }
    if (body.insumos !== undefined) {
      updateFields.insumos = JSON.stringify(body.insumos);
    }
    if (body.tareas_completadas !== undefined) {
      updateFields.tareas_completadas = JSON.stringify(body.tareas_completadas);
    }
    if (body.fecha_estimada_inicio !== undefined) {
      updateFields.fecha_estimada_inicio = body.fecha_estimada_inicio;
    }
    if (body.fecha_estimada_fin !== undefined) {
      updateFields.fecha_estimada_fin = body.fecha_estimada_fin;
    }
    if (body.fecha_hora_inicio !== undefined) {
      updateFields.fecha_hora_inicio = body.fecha_hora_inicio;
    }
    if (body.fecha_hora_fin !== undefined) {
      updateFields.fecha_hora_fin = body.fecha_hora_fin;
    }
    if (body.estado !== undefined) {
      updateFields.estado = body.estado;
      // Auto-set start date when transitioning to en_reparacion
      if (body.estado === 'en_reparacion' && !body.fecha_hora_inicio) {
        updateFields.fecha_hora_inicio = new Date().toISOString();
      }
      // Auto-set end date when transitioning to listo_para_entregar
      if (body.estado === 'listo_para_entregar' && !body.fecha_hora_fin) {
        updateFields.fecha_hora_fin = new Date().toISOString();
      }
    }

    await db
      .update(ordenes_trabajo)
      .set(updateFields)
      .where(eq(ordenes_trabajo.id, numId));

    // Si estado cambia a 'entregado': actualizar recepcion.estado a 'entregado'
    if (body.estado === 'entregado') {
      await db
        .update(recepciones)
        .set({ estado: 'entregado', updated_at: sql`(datetime('now'))` })
        .where(eq(recepciones.id, existing.recepcion_id));
    }

    const updated = await getOTById(numId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/ordenes-trabajo/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar orden de trabajo' }, { status: 500 });
  }
}

// ── DELETE /api/ordenes-trabajo/[id] ─────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await getOTById(numId);
    if (!existing) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    await db.delete(ordenes_trabajo).where(eq(ordenes_trabajo.id, numId));

    // Revertir recepción a 'con_ot_activa' (cotización sigue aceptada)
    await db
      .update(recepciones)
      .set({ estado: 'con_ot_activa', updated_at: sql`(datetime('now'))` })
      .where(eq(recepciones.id, existing.recepcion_id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/ordenes-trabajo/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar orden de trabajo' }, { status: 500 });
  }
}
