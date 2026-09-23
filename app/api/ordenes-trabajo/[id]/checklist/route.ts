import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ot_checklist } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET /api/ordenes-trabajo/[id]/checklist
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const otId = parseInt(id);
    if (isNaN(otId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const rows = await db
      .select()
      .from(ot_checklist)
      .where(eq(ot_checklist.ot_id, otId));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /checklist error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// PUT /api/ordenes-trabajo/[id]/checklist
// body: { item_key: string, checked?: boolean, foto_url?: string | null }
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const otId = parseInt(id);
    if (isNaN(otId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await req.json() as { item_key: string; checked?: boolean; foto_url?: string | null };
    const { item_key, checked, foto_url } = body;

    if (!item_key) return NextResponse.json({ error: 'item_key requerido' }, { status: 400 });

    const now = new Date().toISOString();

    const existing = await db
      .select({ id: ot_checklist.id })
      .from(ot_checklist)
      .where(and(eq(ot_checklist.ot_id, otId), eq(ot_checklist.item_key, item_key)))
      .limit(1);

    if (existing.length > 0) {
      const updates: Record<string, unknown> = { updated_at: now };
      if (checked !== undefined) updates.checked = checked;
      if (foto_url !== undefined) updates.foto_url = foto_url;

      await db
        .update(ot_checklist)
        .set(updates)
        .where(and(eq(ot_checklist.ot_id, otId), eq(ot_checklist.item_key, item_key)));
    } else {
      await db.insert(ot_checklist).values({
        ot_id: otId,
        item_key,
        checked: checked ?? false,
        foto_url: foto_url ?? null,
        updated_at: now,
      });
    }

    const [row] = await db
      .select()
      .from(ot_checklist)
      .where(and(eq(ot_checklist.ot_id, otId), eq(ot_checklist.item_key, item_key)))
      .limit(1);

    return NextResponse.json(row ?? { ot_id: otId, item_key, checked: checked ?? false, foto_url: foto_url ?? null });
  } catch (error) {
    console.error('PUT /checklist error:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
