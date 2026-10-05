import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas_compra } from '@/lib/db/schema';
import { and, like, gte, lte } from 'drizzle-orm';

// ── Categorías ────────────────────────────────────────────────────────────────
const CATS: Array<{ cat: string; re: RegExp; unidad: string }> = [
  { cat: 'Aceites', re: /\baceite|lubricante|5w|10w|0w|15w|atf|dexron\b/i, unidad: 'L' },
  { cat: 'Filtros', re: /\bfiltro|filter\b/i, unidad: 'uds.' },
  { cat: 'Frenos', re: /\bpastilla|zapata|disco\s*(freno|brake)|rotor|l[ií]quido\s*freno\b/i, unidad: 'uds.' },
  { cat: 'Suspensión', re: /\bamortiguador|muelle|resorte|bieleta|r[oó]tula|silent\s*block\b/i, unidad: 'uds.' },
  { cat: 'Bujías', re: /\bbuj[íi]a\b/i, unidad: 'uds.' },
  { cat: 'Distribución', re: /\bdistribuci[oó]n|timing\b/i, unidad: 'uds.' },
  { cat: 'Embrague', re: /\bembrague|clutch\b/i, unidad: 'uds.' },
  { cat: 'Refrigeración', re: /\brefrigerante|anticongelante|coolant|termostato\b/i, unidad: 'L' },
  { cat: 'Neumáticos', re: /\bneumático|neumatico|cubierta|llanta|tire\b/i, unidad: 'uds.' },
  { cat: 'Baterías', re: /\bbater[íi]a|battery\b/i, unidad: 'uds.' },
  { cat: 'Eléctrico', re: /\balternador|arranque|starter|sensor|cable|fusible|foco|ampoll[ae]\b/i, unidad: 'uds.' },
  { cat: 'Dirección', re: /\bdirecci[oó]n|cremallera|terminal\b/i, unidad: 'uds.' },
];

function categorize(nombre: string): { cat: string; unidad: string } {
  for (const c of CATS) if (c.re.test(nombre)) return { cat: c.cat, unidad: c.unidad };
  return { cat: 'Otros', unidad: 'uds.' };
}

const LITROS_RE = /(\d+(?:[.,]\d+)?)\s*(?:L|lts?|litros?)\b/i;
const ML_RE = /(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/i;

function calcLitros(nombre: string, cantidad: number): number {
  const mL = LITROS_RE.exec(nombre);
  if (mL) return parseFloat(mL[1].replace(',', '.')) * cantidad;
  const mML = ML_RE.exec(nombre);
  if (mML) return (parseFloat(mML[1].replace(',', '.')) / 1000) * cantidad;
  return cantidad;
}

export interface InsumoStats {
  cat: string;
  unidad: string;
  totalCantidad: number;
  totalGasto: number;
  precioPromedio: number;
  nItems: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const mes = searchParams.get('mes');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    // Build where clause depending on params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [];
    if (mes) {
      conditions.push(like(facturas_compra.fecha_emision, `${mes}%`));
    } else {
      if (desde) conditions.push(gte(facturas_compra.fecha_emision, desde));
      if (hasta) conditions.push(lte(facturas_compra.fecha_emision, hasta));
    }

    const rows = await db
      .select({ items: facturas_compra.items })
      .from(facturas_compra)
      .$dynamic()
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const map: Record<string, { cat: string; unidad: string; totalCantidad: number; totalGasto: number; nItems: number }> = {};

    for (const row of rows) {
      let items: Array<{ nombre: string; cantidad: number; precio_unitario: number; total: number }> = [];
      try { items = JSON.parse(row.items ?? '[]'); } catch { continue; }

      for (const item of items) {
        if (!item.nombre || item.cantidad <= 0) continue;
        const { cat, unidad } = categorize(item.nombre);
        const gasto = (item.total > 0 ? item.total : item.cantidad * item.precio_unitario) || 0;
        const qty = unidad === 'L' ? calcLitros(item.nombre, item.cantidad) : item.cantidad;

        if (!map[cat]) map[cat] = { cat, unidad, totalCantidad: 0, totalGasto: 0, nItems: 0 };
        map[cat].totalCantidad += qty;
        map[cat].totalGasto += gasto;
        map[cat].nItems += 1;
      }
    }

    const result: InsumoStats[] = Object.values(map)
      .filter(v => v.totalGasto > 0 || v.totalCantidad > 0)
      .map(v => ({ ...v, precioPromedio: v.totalCantidad > 0 ? v.totalGasto / v.totalCantidad : 0 }))
      .sort((a, b) => b.totalGasto - a.totalGasto);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/insumos error:', error);
    return NextResponse.json({ error: 'Error al obtener insumos' }, { status: 500 });
  }
}
