import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehiculos } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marca = searchParams.get("marca");

  const marcasRows = await db
    .selectDistinct({ value: vehiculos.marca })
    .from(vehiculos);

  const marcas = marcasRows
    .map((r) => r.value)
    .filter(Boolean)
    .sort();

  let modelosRows;
  if (marca) {
    modelosRows = await db
      .selectDistinct({ value: vehiculos.modelo })
      .from(vehiculos)
      .where(sql`lower(${vehiculos.marca}) = lower(${marca})`);
  } else {
    modelosRows = await db
      .selectDistinct({ value: vehiculos.modelo })
      .from(vehiculos);
  }

  const modelos = modelosRows
    .map((r) => r.value)
    .filter(Boolean)
    .sort();

  return NextResponse.json({ marcas, modelos });
}
