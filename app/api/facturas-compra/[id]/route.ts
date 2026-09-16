import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas_compra } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await db.delete(facturas_compra).where(eq(facturas_compra.id, numId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/facturas-compra/[id] error:', error);
    return NextResponse.json({ error: 'Error al eliminar la factura' }, { status: 500 });
  }
}
