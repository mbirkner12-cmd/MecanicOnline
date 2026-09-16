import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import path from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const repuestosJson = formData.get('repuestos_json') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG o WEBP.' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const ext = path.extname(file.name.toLowerCase()) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const uniqueName = `facturas/${Date.now()}-${crypto.randomUUID()}${ext}`;
    const blob = await put(uniqueName, file, { access: 'public' });

    // Read file as base64 for Claude
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Build repuestos string for prompt
    let repuestosStr = '[]';
    try {
      if (repuestosJson) {
        const parsed = JSON.parse(repuestosJson) as Array<{ key: string; nombre: string; sku?: string }>;
        repuestosStr = JSON.stringify(parsed, null, 2);
      }
    } catch {
      repuestosStr = repuestosJson ?? '[]';
    }

    const prompt = `Analiza esta factura de compra chilena y devuelve SOLO un JSON sin texto adicional.

Repuestos de la OT a los que puedes asignar ítems (usa el "key" si hay coincidencia de nombre):
${repuestosStr}

Instrucciones:
- En "items" incluye SOLO repuestos físicos/materiales, NO mano de obra ni servicios
- Para "match_key": usa la "key" del repuesto más similar por nombre, o null si no hay coincidencia clara
- "precio_unitario" y "total" deben ser en pesos chilenos sin IVA (neto)
- Si no puedes extraer algún campo, usa null o 0

Estructura exacta del JSON:
{
  "numero": "folio o número de factura",
  "proveedor_nombre": "nombre del proveedor",
  "proveedor_rut": "RUT del proveedor o null",
  "fecha_emision": "YYYY-MM-DD",
  "total_neto": 0,
  "total_iva": 0,
  "total": 0,
  "items": [
    {
      "nombre": "descripción clara del ítem",
      "cantidad": 1,
      "precio_unitario": 0,
      "total": 0,
      "match_key": null
    }
  ]
}`;

    // Build message content depending on file type
    type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const fileContent: Anthropic.Messages.MessageParam['content'] =
      file.type === 'application/pdf'
        ? [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            { type: 'text', text: prompt },
          ]
        : [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.type as ImageMediaType,
                data: base64Data,
              },
            },
            { type: 'text', text: prompt },
          ];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: fileContent }],
    });

    const rawText = message.content
      .filter((c): c is Anthropic.Messages.TextBlock => c.type === 'text')
      .map(c => c.text)
      .join('');

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No se pudo extraer datos de la factura' }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ extracted, pdf_url: blob.url });
  } catch (error) {
    console.error('POST /api/facturas-compra/parse error:', error);
    return NextResponse.json({ error: 'Error al procesar la factura' }, { status: 500 });
  }
}
