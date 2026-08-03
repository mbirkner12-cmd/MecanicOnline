import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ordenes_trabajo, vehiculos, mecanicos, recepciones } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patente = searchParams.get('patente')?.trim().toUpperCase().replace(/[\s\-]/g, '');

  if (!patente || patente.length < 4) {
    return NextResponse.json({ error: 'Patente inválida' }, { status: 400 });
  }

  const vehiculo = await db
    .select({ id: vehiculos.id, patente: vehiculos.patente, marca: vehiculos.marca, modelo: vehiculos.modelo, anio: vehiculos.anio })
    .from(vehiculos)
    .where(eq(vehiculos.patente, patente))
    .limit(1);

  if (!vehiculo.length) {
    return NextResponse.json({ error: 'No se encontró ningún vehículo con esa patente' }, { status: 404 });
  }

  const v = vehiculo[0];

  const ots = await db
    .select({
      id: ordenes_trabajo.id,
      numero: ordenes_trabajo.numero,
      estado: ordenes_trabajo.estado,
      diagnostico: ordenes_trabajo.diagnostico,
      insumos: ordenes_trabajo.insumos,
      fecha_hora_inicio: ordenes_trabajo.fecha_hora_inicio,
      fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
      mecanico_nombre: mecanicos.nombre,
      recepcion_fecha: recepciones.fecha_hora_ingreso,
      recepcion_motivo: recepciones.motivo_ingreso,
    })
    .from(ordenes_trabajo)
    .leftJoin(mecanicos, eq(ordenes_trabajo.mecanico_id, mecanicos.id))
    .leftJoin(recepciones, eq(ordenes_trabajo.recepcion_id, recepciones.id))
    .where(eq(ordenes_trabajo.vehiculo_id, v.id))
    .orderBy(desc(ordenes_trabajo.created_at));

  return NextResponse.json({
    vehiculo: { patente: v.patente, marca: v.marca, modelo: v.modelo, anio: v.anio },
    trabajos: ots.map((ot) => ({
      numero: ot.numero,
      estado: ot.estado,
      diagnostico: ot.diagnostico,
      insumos: (() => {
        try { return JSON.parse(ot.insumos ?? '[]'); } catch { return []; }
      })(),
      fecha_ingreso: ot.recepcion_fecha ?? ot.fecha_hora_inicio,
      fecha_entrega: ot.fecha_hora_fin,
      motivo_ingreso: ot.recepcion_motivo,
    })),
  });
}
