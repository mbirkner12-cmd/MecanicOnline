import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cotizaciones } from '@/lib/db/schema';
import { isNotNull, desc } from 'drizzle-orm';

export interface MOSugerencia {
  detalle: string;
  monto: number;
}

export async function GET() {
  try {
    const rows = await db
      .select({ mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle })
      .from(cotizaciones)
      .where(isNotNull(cotizaciones.mano_de_obra_detalle))
      .orderBy(desc(cotizaciones.id));

    // Most-recent value wins for each unique description (case-insensitive)
    const seen = new Map<string, MOSugerencia>();

    for (const row of rows) {
      try {
        const items = JSON.parse(row.mano_de_obra_detalle ?? '[]') as { detalle: string; monto: number }[];
        for (const item of items) {
          // Strip legacy "M/O" prefix some old records have
          const raw = item.detalle?.trim() ?? '';
          const d = raw.replace(/^m\/o\s*/i, '').trim();
          if (!d) continue;
          const key = d.toLowerCase();
          if (!seen.has(key)) {
            seen.set(key, { detalle: d, monto: item.monto ?? 0 });
          }
        }
      } catch { /* skip malformed rows */ }
    }

    const sugerencias = [...seen.values()].sort((a, b) =>
      a.detalle.localeCompare(b.detalle, 'es')
    );
    return NextResponse.json(sugerencias);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
