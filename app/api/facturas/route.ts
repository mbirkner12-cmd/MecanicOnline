import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { facturas_compra, repuestos } from '@/lib/db/schema';
import { desc, like, or } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const rows = await db.select().from(facturas_compra).orderBy(desc(facturas_compra.created_at));
  return NextResponse.json(rows.map(r => ({ ...r, items: JSON.parse(r.items) })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pdf_base64, pdf_url } = body;

  if (!pdf_base64) {
    return NextResponse.json({ error: 'PDF requerido' }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 },
          },
          {
            type: 'text',
            text: `Extrae la información de esta factura y devuelve SOLO un JSON con esta estructura exacta, sin texto adicional.

IMPORTANTE: En el array "items" incluí ÚNICAMENTE repuestos físicos, piezas, partes o insumos materiales (filtros, aceites, correas, pastillas, etc.). NO incluyas: mano de obra, servicios, fletes, descuentos, cargos adicionales, ni conceptos intangibles.

{
  "numero": "número de factura",
  "proveedor_nombre": "nombre del proveedor",
  "proveedor_rut": "RUT del proveedor",
  "fecha_emision": "YYYY-MM-DD",
  "total_neto": 0,
  "total_iva": 0,
  "total": 0,
  "items": [
    {
      "nombre": "descripción del repuesto en español, clara y concisa",
      "cantidad": 1,
      "precio_unitario": 0,
      "total": 0
    }
  ]
}`,
          },
        ],
      },
    ],
  });

  let extracted: {
    numero: string;
    proveedor_nombre: string;
    proveedor_rut?: string;
    fecha_emision: string;
    total_neto: number;
    total_iva: number;
    total: number;
    items: Array<{ nombre: string; cantidad: number; precio_unitario: number; total: number }>;
  };

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    extracted = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return NextResponse.json({ error: 'No se pudo extraer la información del PDF' }, { status: 422 });
  }

  // Buscar repuestos existentes similares para cada ítem (deduplicación)
  const itemsConMatch = await Promise.all(
    extracted.items.map(async (item) => {
      const palabras = item.nombre.split(' ').filter(p => p.length > 3);
      let match = null;
      for (const palabra of palabras) {
        const encontrados = await db
          .select()
          .from(repuestos)
          .where(like(repuestos.nombre, `%${palabra}%`))
          .limit(1);
        if (encontrados.length > 0) {
          match = encontrados[0];
          break;
        }
      }
      return { ...item, match_existente: match };
    })
  );

  return NextResponse.json({ extracted: { ...extracted, items: itemsConMatch }, pdf_url: pdf_url ?? null });
}
