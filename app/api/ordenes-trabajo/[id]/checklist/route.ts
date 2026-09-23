import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ot_checklist } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

function parseFotos(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    if (typeof parsed === 'string') return [parsed];
  } catch {
    if (raw.startsWith('http')) return [raw];
  }
  return [];
}

// GET /api/ordenes-trabajo/[id]/checklist
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const otId = parseInt(id);
    if (isNaN(otId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const rows = await db.select().from(ot_checklist).where(eq(ot_checklist.ot_id, otId));

    // Normalize foto_url → fotos_urls array
    const normalized = rows.map(r => ({ ...r, fotos_urls: parseFotos(r.foto_url) }));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error('GET /checklist error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// PUT /api/ordenes-trabajo/[id]/checklist
// body: { item_key, checked? } | { item_key, add_foto: url } | { item_key, remove_foto: url }
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const otId = parseInt(id);
    if (isNaN(otId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await req.json() as {
      item_key: string;
      checked?: boolean;
      add_foto?: string;
      remove_foto?: string;
    };
    const { item_key, checked, add_foto, remove_foto } = body;
    if (!item_key) return NextResponse.json({ error: 'item_key requerido' }, { status: 400 });

    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(ot_checklist)
      .where(and(eq(ot_checklist.ot_id, otId), eq(ot_checklist.item_key, item_key)))
      .limit(1);

    let newFotos = parseFotos(existing[0]?.foto_url ?? null);

    if (add_foto) newFotos = [...newFotos, add_foto];
    if (remove_foto) newFotos = newFotos.filter(u => u !== remove_foto);

    const updates: Record<string, unknown> = { updated_at: now };
    if (checked !== undefined) updates.checked = checked;
    if (add_foto || remove_foto) updates.foto_url = JSON.stringify(newFotos);

    if (existing.length > 0) {
      await db.update(ot_checklist).set(updates)
        .where(and(eq(ot_checklist.ot_id, otId), eq(ot_checklist.item_key, item_key)));
    } else {
      await db.insert(ot_checklist).values({
        ot_id: otId,
        item_key,
        checked: checked ?? false,
        foto_url: updates.foto_url as string ?? null,
        updated_at: now,
      });
    }

    const [row] = await db.select().from(ot_checklist)
      .where(and(eq(ot_checklist.ot_id, otId), eq(ot_checklist.item_key, item_key)))
      .limit(1);

    return NextResponse.json({ ...row, fotos_urls: parseFotos(row?.foto_url ?? null) });
  } catch (error) {
    console.error('PUT /checklist error:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
