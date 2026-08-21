import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { repuestos, repuesto_modelo, modelos_vehiculo } from '@/lib/db/schema';
import { desc, eq, inArray, like, or, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q');
  const modeloId = searchParams.get('modelo_id') ? parseInt(searchParams.get('modelo_id')!) : null;

  let query = db.select().from(repuestos).$dynamic();

  const conditions = [];

  if (q) {
    conditions.push(
      or(
        like(repuestos.nombre, `%${q}%`),
        like(repuestos.sku, `%${q}%`),
        like(repuestos.descripcion, `%${q}%`)
      )
    );
  }

  // Filtrar por compatibilidad: repuestos asignados a ese modelo O repuestos sin modelo asignado (genéricos)
  if (modeloId) {
    conditions.push(
      sql`(
        EXISTS (SELECT 1 FROM repuesto_modelo WHERE repuesto_id = ${repuestos.id} AND modelo_id = ${modeloId})
        OR NOT EXISTS (SELECT 1 FROM repuesto_modelo WHERE repuesto_id = ${repuestos.id})
      )`
    );
  }

  if (conditions.length === 1) {
    query = query.where(conditions[0]!);
  } else if (conditions.length > 1) {
    query = query.where(sql`(${conditions[0]}) AND (${conditions[1]})`);
  }

  const rows = await query.orderBy(desc(repuestos.created_at));

  if (rows.length === 0) return NextResponse.json([]);

  // Obtener modelos asociados a cada repuesto
  const ids = rows.map(r => r.id);
  const modelosRows = await db
    .select({
      repuesto_id: repuesto_modelo.repuesto_id,
      modelo_id: modelos_vehiculo.id,
      marca: modelos_vehiculo.marca,
      modelo: modelos_vehiculo.modelo,
      anio: modelos_vehiculo.anio,
    })
    .from(repuesto_modelo)
    .innerJoin(modelos_vehiculo, eq(repuesto_modelo.modelo_id, modelos_vehiculo.id))
    .where(inArray(repuesto_modelo.repuesto_id, ids));

  const modelosByRep: Record<number, { modelo_id: number; marca: string; modelo: string; anio: number }[]> = {};
  for (const m of modelosRows) {
    if (!modelosByRep[m.repuesto_id]) modelosByRep[m.repuesto_id] = [];
    modelosByRep[m.repuesto_id].push({ modelo_id: m.modelo_id, marca: m.marca, modelo: m.modelo, anio: m.anio });
  }

  const result = rows.map(r => ({ ...r, modelos: modelosByRep[r.id] ?? [] }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, descripcion, precio_costo, precio_venta, stock_actual, stock_minimo, unidad } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }

  // Generate next SKU
  const last = await db.select({ sku: repuestos.sku }).from(repuestos).orderBy(desc(repuestos.id)).limit(1);
  let nextNum = 1;
  if (last.length > 0) {
    const match = last[0].sku.match(/REP-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const sku = `REP-${String(nextNum).padStart(4, '0')}`;

  const [row] = await db.insert(repuestos).values({
    sku,
    nombre: (() => { const n = nombre.trim().toLowerCase(); return n.charAt(0).toUpperCase() + n.slice(1); })(),
    descripcion: descripcion?.trim() || null,
    precio_costo: precio_costo ?? 0,
    precio_venta: precio_venta ?? 0,
    stock_actual: stock_actual ?? 0,
    stock_minimo: stock_minimo ?? 1,
    unidad: unidad ?? 'unidad',
  }).returning();

  return NextResponse.json(row, { status: 201 });
}
