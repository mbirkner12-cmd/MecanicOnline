import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import path from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se aceptan imágenes JPG, PNG o WEBP' }, { status: 400 });
    }

    const ext = path.extname(file.name.toLowerCase()) || '.jpg';
    const uniqueName = `gastos/${Date.now()}-${crypto.randomUUID()}${ext}`;

    const arrayBuffer = await file.arrayBuffer();

    const [blob, base64Data] = await Promise.all([
      put(uniqueName, file, { access: 'public' }),
      Promise.resolve(Buffer.from(arrayBuffer).toString('base64')),
    ]);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64Data },
          },
          {
            type: 'text',
            text: `Analiza esta boleta o factura y devuelve SOLO un JSON sin texto adicional.

{
  "descripcion": "descripción breve de lo comprado",
  "monto": 0
}

- "descripcion": resume qué se compró en máximo 80 caracteres (ej: "Aceite motor 5W30 x3L", "Filtro de aceite + filtro de aire"). Si hay varios ítems, lista los principales separados por coma.
- "monto": monto total en pesos chilenos. Usa el total con IVA si está incluido, si no usa el neto.
- Si no podés leer algún campo, usa null o 0.`,
          },
        ],
      }],
    });

    const rawText = message.content
      .filter((c): c is Anthropic.Messages.TextBlock => c.type === 'text')
      .map(c => c.text)
      .join('');

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : { descripcion: null, monto: 0 };

    return NextResponse.json({
      foto_url: blob.url,
      descripcion: extracted.descripcion ?? null,
      monto: Number(extracted.monto) || 0,
    });
  } catch (error) {
    console.error('POST /api/ot-gastos/parse error:', error);
    return NextResponse.json({ error: 'Error al analizar la boleta' }, { status: 500 });
  }
}
