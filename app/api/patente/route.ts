import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehiculos, modelos_vehiculo } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

function normalizePatente(p: string) {
  return p.trim().toUpperCase().replace(/[\s\-]/g, '');
}

export async function GET(req: NextRequest) {
  const patente = normalizePatente(req.nextUrl.searchParams.get('patente') ?? '');
  if (!patente || patente.length < 4) {
    return NextResponse.json({ error: 'Patente inválida' }, { status: 400 });
  }

  // 1. Buscar primero en nuestra propia base de datos
  const existente = await db
    .select()
    .from(vehiculos)
    .where(sql`upper(replace(${vehiculos.patente}, '-', '')) = ${patente}`)
    .limit(1);

  if (existente.length > 0) {
    const v = existente[0];
    return NextResponse.json({
      source: 'local',
      patente: v.patente,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      motor: null,
      tipo: null,
      combustible: null,
      kilometros: v.kilometraje_actual,
      vehiculo_id: v.id,
    });
  }

  // 2. Consultar Boostr
  const key = process.env.BOOSTR_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.boostr.cl/vehicle/${patente}.json`, {
      headers: { 'X-API-KEY': key },
      next: { revalidate: 0 },
    });
    const json = await res.json();

    if (json.status !== 'success' || !json.data) {
      return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
    }

    const d = json.data;

    // Crear o encontrar el modelo en nuestra tabla
    const marcaNorm = d.make ?? '';
    const modeloNorm = d.model ?? '';
    const anioNorm = d.year ?? 0;

    let modeloId: number | null = null;
    if (marcaNorm && modeloNorm && anioNorm) {
      const existingModelo = await db
        .select()
        .from(modelos_vehiculo)
        .where(
          sql`lower(${modelos_vehiculo.marca}) = lower(${marcaNorm})
            AND lower(${modelos_vehiculo.modelo}) = lower(${modeloNorm})
            AND ${modelos_vehiculo.anio} = ${anioNorm}`
        )
        .limit(1);

      if (existingModelo.length > 0) {
        modeloId = existingModelo[0].id;
      } else {
        const [created] = await db.insert(modelos_vehiculo).values({
          marca: marcaNorm,
          modelo: modeloNorm,
          anio: anioNorm,
          motor: d.gas_type ?? null,
        }).returning();
        modeloId = created.id;
      }
    }

    return NextResponse.json({
      source: 'boostr',
      patente,
      marca: marcaNorm,
      modelo: modeloNorm,
      anio: anioNorm,
      motor: d.engine ?? null,
      tipo: d.type ?? null,
      combustible: d.gas_type ?? null,
      kilometros: d.kilometers ?? null,
      modelo_id: modeloId,
    });
  } catch {
    return NextResponse.json({ error: 'Error al consultar la API' }, { status: 500 });
  }
}
