import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ot_gastos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const otId = req.nextUrl.searchParams.get('ot_id');
  if (!otId) return NextResponse.json({ error: 'ot_id requerido' }, { status: 400 });

  const rows = await db
    .select()
    .from(ot_gastos)
    .where(eq(ot_gastos.ot_id, parseInt(otId)))
    .orderBy(ot_gastos.created_at);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const { ot_id, descripcion, monto, foto_boleta_url } = await req.json() as {
      ot_id: number;
      descripcion: string;
      monto: number;
      foto_boleta_url?: string | null;
    };

    if (!ot_id || !descripcion?.trim()) {
      return NextResponse.json({ error: 'ot_id y descripcion son requeridos' }, { status: 400 });
    }

    const [row] = await db.insert(ot_gastos).values({
      ot_id,
      descripcion: descripcion.trim(),
      monto: monto ?? 0,
      foto_boleta_url: foto_boleta_url ?? null,
      cobrar_cliente: false,
    }).returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('POST /api/ot-gastos error:', error);
    return NextResponse.json({ error: 'Error al guardar gasto' }, { status: 500 });
  }
}
