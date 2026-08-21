import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas_compra, repuestos, repuesto_modelo } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

interface ItemFactura {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  repuesto_id?: number | null;   // si el jefe eligió fusionarlo con uno existente
  modelo_ids: number[];          // modelos compatibles seleccionados
}

async function nextSku(): Promise<string> {
  const last = await db.select({ sku: repuestos.sku }).from(repuestos).orderBy(desc(repuestos.id)).limit(1);
  let nextNum = 1;
  if (last.length > 0) {
    const match = last[0].sku.match(/REP-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  return `REP-${String(nextNum).padStart(4, '0')}`;
}

async function saveModelos(repuestoId: number, modeloIds: number[]) {
  // Eliminar compatibilidades previas y guardar las nuevas
  await db.delete(repuesto_modelo).where(eq(repuesto_modelo.repuesto_id, repuestoId));
  if (modeloIds.length > 0) {
    await db.insert(repuesto_modelo).values(
      modeloIds.map(mid => ({ repuesto_id: repuestoId, modelo_id: mid }))
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { factura, items } = body as {
    factura: {
      numero: string;
      proveedor_nombre: string;
      proveedor_rut?: string;
      fecha_emision: string;
      total_neto: number;
      total_iva: number;
      total: number;
      pdf_url?: string;
    };
    items: ItemFactura[];
  };

  if (!factura || !items?.length) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const [facturaRow] = await db.insert(facturas_compra).values({
    numero: factura.numero,
    proveedor_nombre: factura.proveedor_nombre,
    proveedor_rut: factura.proveedor_rut ?? null,
    fecha_emision: factura.fecha_emision,
    total_neto: factura.total_neto,
    total_iva: factura.total_iva,
    total: factura.total,
    pdf_url: factura.pdf_url ?? null,
    items: JSON.stringify(items),
  }).returning();

  for (const item of items) {
    if (item.repuesto_id) {
      // Fusionar con repuesto existente: sumar stock y actualizar costo
      const existing = await db.select().from(repuestos).where(eq(repuestos.id, item.repuesto_id)).limit(1);
      if (existing.length > 0) {
        await db.update(repuestos).set({
          stock_actual: (existing[0].stock_actual ?? 0) + item.cantidad,
          precio_costo: item.precio_unitario,
          updated_at: sql`(datetime('now'))`,
        }).where(eq(repuestos.id, item.repuesto_id));
        await saveModelos(item.repuesto_id, item.modelo_ids ?? []);
      }
    } else {
      // Crear nuevo repuesto
      const sku = await nextSku();
      const [nuevo] = await db.insert(repuestos).values({
        sku,
        nombre: (() => { const n = item.nombre.trim().toLowerCase(); return n.charAt(0).toUpperCase() + n.slice(1); })(),
        precio_costo: item.precio_unitario,
        precio_venta: Math.round(item.precio_unitario * 1.3),
        stock_actual: item.cantidad,
        stock_minimo: 1,
        unidad: 'unidad',
      }).returning();
      await saveModelos(nuevo.id, item.modelo_ids ?? []);
    }
  }

  return NextResponse.json({ ok: true, factura_id: facturaRow.id }, { status: 201 });
}
