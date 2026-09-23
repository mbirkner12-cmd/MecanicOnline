import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { configuracion } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_CHECKLIST = [
  { key: 'trabajos_ot', label: 'Trabajos de la OT / cotización completados' },
  { key: 'presion_neumaticos', label: 'Presión de neumáticos revisada' },
  { key: 'apriete_ruedas', label: 'Apriete de ruedas verificado' },
  { key: 'nivel_aceite', label: 'Nivel de aceite correcto' },
  { key: 'nivel_limpiaparabrisas', label: 'Nivel de limpiaparabrisas correcto' },
  { key: 'nivel_coolant', label: 'Nivel de coolant correcto' },
  { key: 'luces', label: 'Revisión de luces del auto' },
];

export async function GET() {
  try {
    const rows = await db.select().from(configuracion);

    const valorHora = rows.find(r => r.clave === 'valor_hora')?.valor ?? '0';
    let checklistItems = DEFAULT_CHECKLIST;
    const checklistRaw = rows.find(r => r.clave === 'checklist_items')?.valor;
    if (checklistRaw) {
      try { checklistItems = JSON.parse(checklistRaw) as typeof DEFAULT_CHECKLIST; } catch { /* keep default */ }
    }

    return NextResponse.json({ valor_hora: valorHora, checklist_items: checklistItems });
  } catch (error) {
    console.error('GET /api/configuracion error:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

async function upsertConfig(clave: string, valor: string) {
  const existing = await db.select({ id: configuracion.id }).from(configuracion).where(eq(configuracion.clave, clave));
  if (existing.length > 0) {
    await db.update(configuracion).set({ valor, updated_at: new Date().toISOString() }).where(eq(configuracion.clave, clave));
  } else {
    await db.insert(configuracion).values({ clave, valor });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { valor_hora?: string; checklist_items?: Array<{ key: string; label: string }> };
    const { valor_hora, checklist_items } = body;

    if (valor_hora !== undefined) {
      const numVal = parseFloat(valor_hora);
      if (isNaN(numVal) || numVal < 0) {
        return NextResponse.json({ error: 'valor_hora debe ser un número positivo' }, { status: 400 });
      }
      await upsertConfig('valor_hora', String(numVal));
    }

    if (checklist_items !== undefined) {
      if (!Array.isArray(checklist_items)) {
        return NextResponse.json({ error: 'checklist_items debe ser un array' }, { status: 400 });
      }
      await upsertConfig('checklist_items', JSON.stringify(checklist_items));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/configuracion error:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
