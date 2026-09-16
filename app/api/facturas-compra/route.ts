import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas_compra, ot_repuestos, ordenes_trabajo } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface FacturaItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  match_key: string | null;
}

interface PostBody {
  ot_id: number;
  numero: string;
  proveedor_nombre: string;
  proveedor_rut?: string | null;
  fecha_emision: string;
  total_neto: number;
  total_iva: number;
  total: number;
  pdf_url?: string | null;
  items: FacturaItem[];
}

// ── GET /api/facturas-compra?ot_id=X ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const otId = req.nextUrl.searchParams.get('ot_id');
  if (!otId) return NextResponse.json([]);

  const rows = await db
    .select({
      id: facturas_compra.id,
      numero: facturas_compra.numero,
      proveedor_nombre: facturas_compra.proveedor_nombre,
      proveedor_rut: facturas_compra.proveedor_rut,
      fecha_emision: facturas_compra.fecha_emision,
      total_neto: facturas_compra.total_neto,
      total_iva: facturas_compra.total_iva,
      total: facturas_compra.total,
      pdf_url: facturas_compra.pdf_url,
      ot_id: facturas_compra.ot_id,
      created_at: facturas_compra.created_at,
    })
    .from(facturas_compra)
    .where(eq(facturas_compra.ot_id, parseInt(otId)));

  return NextResponse.json(rows);
}

// ── POST /api/facturas-compra ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PostBody;

    const { ot_id, numero, proveedor_nombre, proveedor_rut, fecha_emision, total_neto, total_iva, total, pdf_url, items } = body;

    if (!ot_id || !numero || !proveedor_nombre || !fecha_emision) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Insert factura
    const [factura] = await db.insert(facturas_compra).values({
      ot_id,
      numero,
      proveedor_nombre,
      proveedor_rut: proveedor_rut ?? null,
      fecha_emision,
      total_neto: total_neto ?? 0,
      total_iva: total_iva ?? 0,
      total: total ?? 0,
      pdf_url: pdf_url ?? null,
      items: JSON.stringify(items ?? []),
    }).returning();

    // 2. Apply cost mappings
    const cotItems: Array<{ idx: number; precio_unitario: number }> = [];

    for (const item of items ?? []) {
      if (!item.match_key) continue;

      if (item.match_key.startsWith('inv_')) {
        // Update ot_repuestos.precio_costo_snapshot
        const id = parseInt(item.match_key.replace('inv_', ''));
        if (!isNaN(id) && item.precio_unitario >= 0) {
          await db.update(ot_repuestos)
            .set({ precio_costo_snapshot: item.precio_unitario })
            .where(eq(ot_repuestos.id, id));
        }
      } else if (item.match_key.startsWith('cot_')) {
        // Collect cot updates
        const idx = parseInt(item.match_key.replace('cot_', ''));
        if (!isNaN(idx) && item.precio_unitario >= 0) {
          cotItems.push({ idx, precio_unitario: item.precio_unitario });
        }
      }
    }

    // 3. Apply cot updates if any
    if (cotItems.length > 0) {
      const [ot] = await db
        .select({ costo_repuestos_cot: ordenes_trabajo.costo_repuestos_cot })
        .from(ordenes_trabajo)
        .where(eq(ordenes_trabajo.id, ot_id))
        .limit(1);

      let costosCot: (number | null)[] = [];
      try {
        costosCot = JSON.parse(ot?.costo_repuestos_cot ?? 'null') as (number | null)[] ?? [];
      } catch {
        costosCot = [];
      }

      for (const { idx, precio_unitario } of cotItems) {
        // Extend array if needed
        while (costosCot.length <= idx) costosCot.push(null);
        costosCot[idx] = precio_unitario;
      }

      await db.update(ordenes_trabajo)
        .set({ costo_repuestos_cot: JSON.stringify(costosCot) })
        .where(eq(ordenes_trabajo.id, ot_id));
    }

    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    console.error('POST /api/facturas-compra error:', error);
    return NextResponse.json({ error: 'Error al guardar la factura' }, { status: 500 });
  }
}
