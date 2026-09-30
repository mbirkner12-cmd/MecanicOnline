import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gastos_estructura } from '@/lib/db/schema';

export async function GET() {
  try {
    const rows = await db.select().from(gastos_estructura).orderBy(gastos_estructura.tipo, gastos_estructura.nombre);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/gastos-estructura error:', error);
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { nombre: string; monto_mensual: number; tipo: 'fijo' | 'gav' | 'puntual'; mes?: string };
    if (!body.nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    if (body.monto_mensual < 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    if (body.tipo === 'puntual' && !body.mes) return NextResponse.json({ error: 'Mes requerido para gasto puntual' }, { status: 400 });

    const [row] = await db.insert(gastos_estructura).values({
      nombre: body.nombre.trim(),
      monto_mensual: body.monto_mensual,
      tipo: body.tipo ?? 'fijo',
      mes: body.tipo === 'puntual' ? (body.mes ?? null) : null,
    }).returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('POST /api/gastos-estructura error:', error);
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 });
  }
}
