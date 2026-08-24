import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cotizaciones, ordenes_trabajo, vehiculos, clientes } from '@/lib/db/schema';
import { eq, max, sql } from 'drizzle-orm';

// POST /api/ordenes-trabajo/rapida
// Crea una cotización vacía + OT en un solo paso (para uso del mecánico)
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      vehiculo_id: number;
      cliente_id: number;
      mecanico_id?: number | null;
      motivo?: string | null;
    };

    const { vehiculo_id, cliente_id, mecanico_id, motivo } = body;

    if (!vehiculo_id || !cliente_id) {
      return NextResponse.json({ error: 'vehiculo_id y cliente_id son requeridos' }, { status: 400 });
    }

    // Número correlativo cotización
    const maxCot = await db.select({ m: max(cotizaciones.numero) }).from(cotizaciones);
    let nextCotNum = 1;
    const currentMaxCot = maxCot[0]?.m;
    if (currentMaxCot) {
      const match = currentMaxCot.match(/COT-(\d+)$/);
      if (match) nextCotNum = parseInt(match[1], 10) + 1;
    }
    const numeroCot = `COT-${String(nextCotNum).padStart(4, '0')}`;

    // Crear cotización en blanco con estado 'aceptada'
    const [cot] = await db.insert(cotizaciones).values({
      numero: numeroCot,
      vehiculo_id,
      cliente_id,
      mano_de_obra_detalle: motivo ? JSON.stringify([{ detalle: motivo, monto: 0 }]) : '[]',
      mano_de_obra_monto: 0,
      repuestos: '[]',
      recomendaciones: '[]',
      retiro_entrega_monto: 0,
      total: 0,
      estado: 'aceptada',
    }).returning();

    // Número correlativo OT
    const maxOT = await db.select({ m: max(ordenes_trabajo.numero) }).from(ordenes_trabajo);
    let nextOTNum = 1;
    const currentMaxOT = maxOT[0]?.m;
    if (currentMaxOT) {
      const match = currentMaxOT.match(/OT-(\d+)$/);
      if (match) nextOTNum = parseInt(match[1], 10) + 1;
    }
    const numeroOT = `OT-${String(nextOTNum).padStart(4, '0')}`;

    // Crear OT en estado 'creada'
    const [ot] = await db.insert(ordenes_trabajo).values({
      numero: numeroOT,
      cotizacion_id: cot.id,
      vehiculo_id,
      cliente_id,
      mecanico_id: mecanico_id ?? null,
      estado: 'creada',
      insumos: '[]',
      tareas_completadas: '[]',
      observaciones: '[]',
    }).returning();

    return NextResponse.json({ ot_id: ot.id, numero: ot.numero }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ordenes-trabajo/rapida error:', error);
    return NextResponse.json({ error: 'Error al crear orden de trabajo' }, { status: 500 });
  }
}
