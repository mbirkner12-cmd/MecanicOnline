import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ordenes_trabajo, vehiculos, clientes, cotizaciones } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db
      .select({
        id: ordenes_trabajo.id,
        numero: ordenes_trabajo.numero,
        estado: ordenes_trabajo.estado,
        metodo_pago: ordenes_trabajo.metodo_pago,
        pagado: ordenes_trabajo.pagado,
        fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
        updated_at: ordenes_trabajo.updated_at,
        vehiculo: {
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          anio: vehiculos.anio,
        },
        cliente: {
          nombre: clientes.nombre,
          telefono: clientes.telefono,
        },
        cotizacion: {
          total: cotizaciones.total,
          mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
          retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
        },
      })
      .from(ordenes_trabajo)
      .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
      .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
      .where(inArray(ordenes_trabajo.estado, ['listo_para_entregar', 'entregado']))
      .orderBy(desc(ordenes_trabajo.updated_at));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/cobros error:', error);
    return NextResponse.json({ error: 'Error al obtener cobros' }, { status: 500 });
  }
}
