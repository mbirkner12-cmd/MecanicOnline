import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ordenes_trabajo, cotizaciones, ot_repuestos, configuracion, vehiculos, clientes } from '@/lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Valor hora desde configuración
    const cfg = await db.select().from(configuracion);
    const valorHora = parseInt(cfg.find(c => c.clave === 'valor_hora')?.valor ?? '0') || 0;

    // OTs terminadas o listas
    const ots = await db
      .select({
        id: ordenes_trabajo.id,
        numero: ordenes_trabajo.numero,
        estado: ordenes_trabajo.estado,
        fecha_hora_inicio: ordenes_trabajo.fecha_hora_inicio,
        fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
        horas_trabajadas: ordenes_trabajo.horas_trabajadas,
        costo_mo_override: ordenes_trabajo.costo_mo_override,
        updated_at: ordenes_trabajo.updated_at,
        vehiculo_patente: vehiculos.patente,
        vehiculo_marca: vehiculos.marca,
        vehiculo_modelo: vehiculos.modelo,
        cliente_nombre: clientes.nombre,
        cot_total: cotizaciones.total,
        cot_mo: cotizaciones.mano_de_obra_monto,
        cot_retiro: cotizaciones.retiro_entrega_monto,
        cot_repuestos: cotizaciones.repuestos,
      })
      .from(ordenes_trabajo)
      .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
      .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
      .where(inArray(ordenes_trabajo.estado, ['listo_para_entregar', 'entregado']));

    if (ots.length === 0) {
      return NextResponse.json({ ots: [], valorHora, costoRepuestosPorOT: {} });
    }

    // Costos de repuestos de inventario agrupados por OT
    const otIds = ots.map(o => o.id);
    const repRows = await db
      .select({
        ot_id: ot_repuestos.ot_id,
        costo: sql<number>`SUM(${ot_repuestos.cantidad} * ${ot_repuestos.precio_costo_snapshot})`,
        venta: sql<number>`SUM(${ot_repuestos.cantidad} * ${ot_repuestos.precio_venta_snapshot})`,
      })
      .from(ot_repuestos)
      .where(inArray(ot_repuestos.ot_id, otIds))
      .groupBy(ot_repuestos.ot_id);

    const costoRepuestosPorOT: Record<number, { costo: number; venta: number }> = {};
    for (const r of repRows) {
      costoRepuestosPorOT[r.ot_id] = { costo: r.costo ?? 0, venta: r.venta ?? 0 };
    }

    return NextResponse.json({ ots, valorHora, costoRepuestosPorOT });
  } catch (error) {
    console.error('GET /api/rentabilidad error:', error);
    return NextResponse.json({ error: 'Error al obtener datos de rentabilidad' }, { status: 500 });
  }
}
