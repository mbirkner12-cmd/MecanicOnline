import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cotizaciones } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db
      .select({ mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle })
      .from(cotizaciones)
      .where(isNotNull(cotizaciones.mano_de_obra_detalle));

    const seen = new Set<string>();
    const sugerencias: string[] = [];

    for (const row of rows) {
      try {
        const items = JSON.parse(row.mano_de_obra_detalle ?? '[]') as { detalle: string }[];
        for (const item of items) {
          const d = item.detalle?.trim();
          if (d && !seen.has(d.toLowerCase())) {
            seen.add(d.toLowerCase());
            sugerencias.push(d);
          }
        }
      } catch { /* skip malformed rows */ }
    }

    sugerencias.sort((a, b) => a.localeCompare(b, 'es'));
    return NextResponse.json(sugerencias);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
