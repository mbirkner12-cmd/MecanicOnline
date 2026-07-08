import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recepciones, vehiculos, clientes, mecanicos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
// @ts-ignore — @react-pdf/renderer renderToBuffer type issue
import { renderToBuffer } from '@react-pdf/renderer';
import { DiagnosticoDocument } from '@/lib/pdf/diagnostico';
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

    const result = await db
      .select({
        id: recepciones.id,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        kilometraje: recepciones.kilometraje,
        motivo_ingreso: recepciones.motivo_ingreso,
        diagnostico_mecanico: recepciones.diagnostico_mecanico,
        vehiculo: {
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          anio: vehiculos.anio,
          kilometraje_actual: vehiculos.kilometraje_actual,
        },
        cliente: {
          nombre: clientes.nombre,
          rut: clientes.rut,
          telefono: clientes.telefono,
          correo: clientes.correo,
        },
        mecanico: {
          nombre: mecanicos.nombre,
        },
      })
      .from(recepciones)
      .leftJoin(vehiculos, eq(recepciones.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(recepciones.cliente_id, clientes.id))
      .leftJoin(mecanicos, eq(recepciones.mecanico_id, mecanicos.id))
      .where(eq(recepciones.id, numId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: 'Recepción no encontrada' }, { status: 404 });
    }

    // @ts-ignore — React.createElement typing mismatch with @react-pdf/renderer
    const pdfBuffer = await renderToBuffer(
      // @ts-ignore
      React.createElement(DiagnosticoDocument, { data: result[0] })
    ) as Buffer;

    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    const filename = `diagnostico-recepcion-${numId}.pdf`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('GET /api/recepciones/[id]/pdf error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
