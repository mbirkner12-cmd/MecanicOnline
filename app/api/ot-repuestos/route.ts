import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ot_repuestos, repuestos } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const otId = req.nextUrl.searchParams.get('ot_id');
  if (!otId) return NextResponse.json({ error: 'ot_id requerido' }, { status: 400 });

  const rows = await db
    .select({
      id: ot_repuestos.id,
      ot_id: ot_repuestos.ot_id,
      repuesto_id: ot_repuestos.repuesto_id,
      cantidad: ot_repuestos.cantidad,
      precio_costo_snapshot: ot_repuestos.precio_costo_snapshot,
      precio_venta_snapshot: ot_repuestos.precio_venta_snapshot,
      created_at: ot_repuestos.created_at,
      sku: repuestos.sku,
      nombre: repuestos.nombre,
      unidad: repuestos.unidad,
    })
    .from(ot_repuestos)
    .innerJoin(repuestos, eq(ot_repuestos.repuesto_id, repuestos.id))
    .where(eq(ot_repuestos.ot_id, parseInt(otId)));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { ot_id, repuesto_id, cantidad } = await req.json();

  if (!ot_id || !repuesto_id || !cantidad || cantidad < 1) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Verificar stock disponible
  const [rep] = await db.select().from(repuestos).where(eq(repuestos.id, repuesto_id)).limit(1);
  if (!rep) return NextResponse.json({ error: 'Repuesto no encontrado' }, { status: 404 });
  if ((rep.stock_actual ?? 0) < cantidad) {
    return NextResponse.json(
      { error: `Stock insuficiente. Disponible: ${rep.stock_actual} ${rep.unidad}` },
      { status: 409 }
    );
  }

  // Agregar a OT y descontar stock
  const [row] = await db.insert(ot_repuestos).values({
    ot_id,
    repuesto_id,
    cantidad,
    precio_costo_snapshot: rep.precio_costo,
    precio_venta_snapshot: rep.precio_venta,
  }).returning();

  await db.update(repuestos).set({
    stock_actual: (rep.stock_actual ?? 0) - cantidad,
    updated_at: sql`(datetime('now'))`,
  }).where(eq(repuestos.id, repuesto_id));

  return NextResponse.json({ ...row, sku: rep.sku, nombre: rep.nombre, unidad: rep.unidad }, { status: 201 });
}
