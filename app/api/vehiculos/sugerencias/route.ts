import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehiculos } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marca = searchParams.get("marca");

  const marcas = db
    .select({ value: sql<string>`DISTINCT ${vehiculos.marca}` })
    .from(vehiculos)
    .all()
    .map((r) => r.value)
    .filter(Boolean)
    .sort();

  let modelos: string[];
  if (marca) {
    modelos = db
      .select({ value: sql<string>`DISTINCT ${vehiculos.modelo}` })
      .from(vehiculos)
      .where(sql`lower(${vehiculos.marca}) = lower(${marca})`)
      .all()
      .map((r) => r.value)
      .filter(Boolean)
      .sort();
  } else {
    modelos = db
      .select({ value: sql<string>`DISTINCT ${vehiculos.modelo}` })
      .from(vehiculos)
      .all()
      .map((r) => r.value)
      .filter(Boolean)
      .sort();
  }

  return NextResponse.json({ marcas, modelos });
}
