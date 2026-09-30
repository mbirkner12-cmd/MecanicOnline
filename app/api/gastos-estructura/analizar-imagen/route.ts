import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type GastoImportado = {
  nombre: string;
  monto_mensual: number;
  tipo: 'fijo' | 'gav';
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json() as {
      imageBase64: string;
      mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    };

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `Esta imagen muestra una planilla o tabla con gastos de una empresa (costos fijos y GAV).
Extrae todos los ítems que veas. Para cada uno identifica:
- nombre: nombre o descripción del gasto
- monto_mensual: el monto mensual en pesos chilenos (número entero, sin símbolos)
- tipo: "fijo" (arriendo, sueldos, servicios básicos) o "gav" (marketing, comisiones, gastos comerciales)

Si el monto aparece anual, divídelo por 12.
Si no puedes determinar el tipo, usa "fijo".

Responde SOLO con un JSON array válido. Sin markdown. Ejemplo:
[{"nombre":"Arriendo","monto_mensual":500000,"tipo":"fijo"},{"nombre":"Marketing","monto_mensual":100000,"tipo":"gav"}]`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const items = JSON.parse(cleaned) as GastoImportado[];
    return NextResponse.json(items);
  } catch (error) {
    console.error('POST /api/gastos-estructura/analizar-imagen error:', error);
    return NextResponse.json({ error: 'Error al analizar imagen' }, { status: 500 });
  }
}
