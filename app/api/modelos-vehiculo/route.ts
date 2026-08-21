import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { modelos_vehiculo, vehiculos } from '@/lib/db/schema';
import { asc, sql } from 'drizzle-orm';

export async function GET() {
  // Sincronizar modelos desde vehículos existentes que aún no tienen modelo registrado
  const vehiculosSinModelo = await db
    .select({ marca: vehiculos.marca, modelo: vehiculos.modelo, anio: vehiculos.anio })
    .from(vehiculos)
    .where(sql`${vehiculos.modelo_id} IS NULL`);

  for (const v of vehiculosSinModelo) {
    // Buscar si ya existe ese modelo
    const existing = await db
      .select()
      .from(modelos_vehiculo)
      .where(
        sql`lower(${modelos_vehiculo.marca}) = lower(${v.marca})
          AND lower(${modelos_vehiculo.modelo}) = lower(${v.modelo})
          AND ${modelos_vehiculo.anio} = ${v.anio}`
      )
      .limit(1);

    let modeloId: number;
    if (existing.length === 0) {
      const [created] = await db.insert(modelos_vehiculo).values({
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
      }).returning();
      modeloId = created.id;
    } else {
      modeloId = existing[0].id;
    }

    // Vincular vehículo al modelo
    await db
      .update(vehiculos)
      .set({ modelo_id: modeloId })
      .where(
        sql`lower(${vehiculos.marca}) = lower(${v.marca})
          AND lower(${vehiculos.modelo}) = lower(${v.modelo})
          AND ${vehiculos.anio} = ${v.anio}
          AND ${vehiculos.modelo_id} IS NULL`
      );
  }

  const rows = await db
    .select()
    .from(modelos_vehiculo)
    .orderBy(asc(modelos_vehiculo.marca), asc(modelos_vehiculo.modelo), asc(modelos_vehiculo.anio));

  return NextResponse.json(rows);
}
