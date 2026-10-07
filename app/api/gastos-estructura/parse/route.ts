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

    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se aceptan PDF, JPG, PNG o WEBP' }, { status: 400 });
    }

    const ext = path.extname(file.name.toLowerCase()) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const uniqueName = `gastos-estructura/${Date.now()}-${crypto.randomUUID()}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const [blob] = await Promise.all([
      put(uniqueName, file, { access: 'public' }),
    ]);

    type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

    const fileContent: Anthropic.Messages.MessageParam['content'] =
      file.type === 'application/pdf'
        ? [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
            { type: 'text', text: buildPrompt() },
          ]
        : [
            { type: 'image', source: { type: 'base64', media_type: file.type as ImageMediaType, data: base64Data } },
            { type: 'text', text: buildPrompt() },
          ];

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: fileContent }],
    });

    const rawText = message.content
      .filter((c): c is Anthropic.Messages.TextBlock => c.type === 'text')
      .map(c => c.text)
      .join('');

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : { nombre: null, monto: 0 };

    return NextResponse.json({
      factura_url: blob.url,
      nombre: extracted.nombre ?? null,
      monto: Number(extracted.monto) || 0,
    });
  } catch (error) {
    console.error('POST /api/gastos-estructura/parse error:', error);
    return NextResponse.json({ error: 'Error al analizar la factura' }, { status: 500 });
  }
}

function buildPrompt(): string {
  return `Analiza esta boleta, factura o documento de gasto y devuelve SOLO un JSON sin texto adicional.

{
  "nombre": "descripción corta del gasto",
  "monto": 0
}

- "nombre": qué tipo de gasto es, máximo 60 caracteres (ej: "Arriendo local comercial", "Factura electricidad", "Servicio internet")
- "monto": monto total en pesos chilenos. Usa el total con IVA si está incluido, si no el neto.
- Si no podés leer algún campo, usa null o 0.`;
}
