import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  cotizaciones,
  vehiculos,
  clientes,
  recepciones,
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// ── Shared: build joined query ───────────────────────────────────────────────
async function getCotizacionById(id: number) {
  const result = await db
    .select({
      id: cotizaciones.id,
      numero: cotizaciones.numero,
      recepcion_id: cotizaciones.recepcion_id,
      vehiculo_id: cotizaciones.vehiculo_id,
      cliente_id: cotizaciones.cliente_id,
      mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
      mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
      repuestos: cotizaciones.repuestos,
      recomendaciones: cotizaciones.recomendaciones,
      retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
      total: cotizaciones.total,
      estado: cotizaciones.estado,
      created_at: cotizaciones.created_at,
      updated_at: cotizaciones.updated_at,
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
      recepcion: {
        id: recepciones.id,
        estado: recepciones.estado,
        kilometraje: recepciones.kilometraje,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        diagnostico_mecanico: recepciones.diagnostico_mecanico,
      },
    })
    .from(cotizaciones)
    .leftJoin(vehiculos, eq(cotizaciones.vehiculo_id, vehiculos.id))
    .leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
    .leftJoin(recepciones, eq(cotizaciones.recepcion_id, recepciones.id))
    .where(eq(cotizaciones.id, id))
    .limit(1);

  return result[0] ?? null;
}

// ── GET /api/cotizaciones/[id] ───────────────────────────────────────────────
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

    const cotizacion = await getCotizacionById(numId);
    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(cotizacion);
  } catch (error) {
    console.error('GET /api/cotizaciones/[id] error:', error);
    return NextResponse.json({ error: 'Error al obtener cotización' }, { status: 500 });
  }
}

// ── PUT /api/cotizaciones/[id] ───────────────────────────────────────────────
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

    const existing = await getCotizacionById(numId);
    if (!existing) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    const body = await request.json() as {
      mano_de_obra_detalle?: string;
      mano_de_obra_monto?: number;
      repuestos?: unknown[];
      recomendaciones?: unknown[];
      retiro_entrega_monto?: number;
      total?: number;
      estado?: 'pendiente' | 'aceptada' | 'rechazada';
      recepcion_id?: number | null;
    };

    // Build update fields
    const updateFields: Record<string, unknown> = {
      updated_at: sql`(datetime('now'))`,
    };
    if (body.mano_de_obra_detalle !== undefined) {
      updateFields.mano_de_obra_detalle = body.mano_de_obra_detalle;
    }
    if (body.mano_de_obra_monto !== undefined) {
      updateFields.mano_de_obra_monto = body.mano_de_obra_monto;
    }
    if (body.repuestos !== undefined) {
      updateFields.repuestos = JSON.stringify(body.repuestos);
    }
    if (body.recomendaciones !== undefined) {
      updateFields.recomendaciones = JSON.stringify(body.recomendaciones);
    }
    if (body.retiro_entrega_monto !== undefined) {
      updateFields.retiro_entrega_monto = body.retiro_entrega_monto;
    }
    if (body.total !== undefined) {
      updateFields.total = body.total;
    }
    if (body.estado !== undefined) {
      updateFields.estado = body.estado;
    }
    if (body.recepcion_id !== undefined) {
      updateFields.recepcion_id = body.recepcion_id;
    }

    await db
      .update(cotizaciones)
      .set(updateFields)
      .where(eq(cotizaciones.id, numId));

    // Update recepcion state based on cotizacion state change (skip if no recepcion linked)
    if (body.estado === 'rechazada' && existing.recepcion_id != null) {
      await db
        .update(recepciones)
        .set({ estado: 'cotizacion_rechazada', updated_at: sql`(datetime('now'))` })
        .where(eq(recepciones.id, existing.recepcion_id));
    }
    if (body.estado === 'aceptada' && existing.recepcion_id != null) {
      await db.update(recepciones)
        .set({ estado: 'con_ot_activa', updated_at: sql`(datetime('now'))` })
        .where(eq(recepciones.id, existing.recepcion_id));
    }

    const updated = await getCotizacionById(numId);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/cotizaciones/[id] error:', error);
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 });
  }
}

// ── DELETE /api/cotizaciones/[id] ────────────────────────────────────────────
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

    const existing = await getCotizacionById(numId);
    if (!existing) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    // Delete cotizacion
    await db.delete(cotizaciones).where(eq(cotizaciones.id, numId));

    // Revert recepcion state to 'en_diagnostico' (only if linked)
    if (existing.recepcion_id != null) {
      await db
        .update(recepciones)
        .set({ estado: 'en_diagnostico', updated_at: sql`(datetime('now'))` })
        .where(eq(recepciones.id, existing.recepcion_id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/cotizaciones/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 });
  }
}
