import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  cotizaciones,
  vehiculos,
  clientes,
  recepciones,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
// @ts-ignore — @react-pdf/renderer renderToBuffer type issue
import { renderToBuffer } from '@react-pdf/renderer';
import { CotizacionDocument, type RepuestoItem } from '@/lib/pdf/cotizacion';
import React from 'react';

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

    // Fetch cotizacion with joins
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
        },
      })
      .from(cotizaciones)
      .leftJoin(vehiculos, eq(cotizaciones.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
      .leftJoin(recepciones, eq(cotizaciones.recepcion_id, recepciones.id))
      .where(eq(cotizaciones.id, numId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });
    }

    const row = result[0];

    // Parse JSON fields
    let repuestos: RepuestoItem[] = [];
    try { repuestos = JSON.parse(row.repuestos) as RepuestoItem[]; } catch { repuestos = []; }

    let recomendaciones: RepuestoItem[] = [];
    try { recomendaciones = JSON.parse(row.recomendaciones ?? '[]') as RepuestoItem[]; } catch { recomendaciones = []; }

    // Build PDF data
    const pdfData = {
      id: row.id,
      numero: row.numero,
      created_at: row.created_at,
      mano_de_obra_detalle: row.mano_de_obra_detalle,
      mano_de_obra_monto: row.mano_de_obra_monto,
      repuestos,
      recomendaciones,
      retiro_entrega_monto: row.retiro_entrega_monto,
      total: row.total,
      estado: row.estado,
      vehiculo: row.vehiculo,
      cliente: row.cliente,
    };

    // Generate PDF buffer
    // @ts-ignore — renderToBuffer accepts our component element
    const pdfBuffer = await renderToBuffer(
      // @ts-ignore — React.createElement typing mismatch with @react-pdf/renderer
      React.createElement(CotizacionDocument, { data: pdfData })
    ) as Buffer;

    // Convert to ArrayBuffer for NextResponse compatibility
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${row.numero}.pdf"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('GET /api/cotizaciones/[id]/pdf error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
