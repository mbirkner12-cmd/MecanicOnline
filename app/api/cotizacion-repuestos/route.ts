import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cotizacion_repuestos, repuestos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const cotizacionId = req.nextUrl.searchParams.get('cotizacion_id');
  if (!cotizacionId) return NextResponse.json({ error: 'cotizacion_id requerido' }, { status: 400 });

  const rows = await db
    .select({
      id: cotizacion_repuestos.id,
      cotizacion_id: cotizacion_repuestos.cotizacion_id,
      repuesto_id: cotizacion_repuestos.repuesto_id,
      cantidad: cotizacion_repuestos.cantidad,
      precio_venta_snapshot: cotizacion_repuestos.precio_venta_snapshot,
      created_at: cotizacion_repuestos.created_at,
      sku: repuestos.sku,
      nombre: repuestos.nombre,
      unidad: repuestos.unidad,
    })
    .from(cotizacion_repuestos)
    .innerJoin(repuestos, eq(cotizacion_repuestos.repuesto_id, repuestos.id))
    .where(eq(cotizacion_repuestos.cotizacion_id, parseInt(cotizacionId)));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { cotizacion_id, repuesto_id, cantidad } = await req.json();

  if (!cotizacion_id || !repuesto_id || !cantidad || cantidad < 1) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const [rep] = await db.select().from(repuestos).where(eq(repuestos.id, repuesto_id)).limit(1);
  if (!rep) return NextResponse.json({ error: 'Repuesto no encontrado' }, { status: 404 });

  const [row] = await db.insert(cotizacion_repuestos).values({
    cotizacion_id,
    repuesto_id,
    cantidad,
    precio_venta_snapshot: rep.precio_venta,
  }).returning();

  return NextResponse.json({ ...row, sku: rep.sku, nombre: rep.nombre, unidad: rep.unidad }, { status: 201 });
}
