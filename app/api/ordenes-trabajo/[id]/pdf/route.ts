import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ordenes_trabajo,
  vehiculos,
  clientes,
  mecanicos,
  cotizaciones,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
// @ts-ignore — @react-pdf/renderer renderToBuffer type issue
import { renderToBuffer } from '@react-pdf/renderer';
import { OTDocument, type OTDocumentData } from '@/lib/pdf/orden-trabajo';
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
        id: ordenes_trabajo.id,
        numero: ordenes_trabajo.numero,
        created_at: ordenes_trabajo.created_at,
        fecha_hora_inicio: ordenes_trabajo.fecha_hora_inicio,
        fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
        insumos: ordenes_trabajo.insumos,
        observaciones: ordenes_trabajo.observaciones,
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
        },
        mecanico: {
          nombre: mecanicos.nombre,
        },
        cotizacion: {
          mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
          mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
          repuestos: cotizaciones.repuestos,
          retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
          total: cotizaciones.total,
        },
      })
      .from(ordenes_trabajo)
      .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
      .leftJoin(mecanicos, eq(ordenes_trabajo.mecanico_id, mecanicos.id))
      .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
      .where(eq(ordenes_trabajo.id, numId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 });
    }

    const row = result[0];

    const v = row.vehiculo;
    const c = row.cliente;
    const m = row.mecanico;
    const cot = row.cotizacion;

    const data: OTDocumentData = {
      numero: row.numero,
      created_at: row.created_at,
      fecha_hora_inicio: row.fecha_hora_inicio,
      fecha_hora_fin: row.fecha_hora_fin,
      vehiculo: v && v.patente
        ? { patente: v.patente, marca: v.marca ?? '', modelo: v.modelo ?? '', anio: v.anio ?? 0, kilometraje_actual: v.kilometraje_actual ?? 0 }
        : null,
      cliente: c && c.nombre
        ? { nombre: c.nombre, rut: c.rut ?? '', telefono: c.telefono ?? null }
        : null,
      mecanico: m && m.nombre ? { nombre: m.nombre } : null,
      cotizacion: cot && cot.total !== null
        ? {
            mano_de_obra_detalle: cot.mano_de_obra_detalle,
            mano_de_obra_monto: cot.mano_de_obra_monto ?? 0,
            repuestos: cot.repuestos ?? '[]',
            retiro_entrega_monto: cot.retiro_entrega_monto ?? 0,
            total: cot.total,
          }
        : null,
      insumos: row.insumos ?? '[]',
      observaciones: row.observaciones ?? '[]',
    };

    // @ts-ignore — renderToBuffer accepts our component element
    const pdfBuffer = await renderToBuffer(
      // @ts-ignore — React.createElement typing mismatch with @react-pdf/renderer
      React.createElement(OTDocument, { data })
    ) as Buffer;

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
    console.error('GET /api/ordenes-trabajo/[id]/pdf error:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}
