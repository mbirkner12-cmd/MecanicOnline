import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { nombres } = await req.json() as { nombres: string[] };
    if (!nombres || nombres.length === 0) return NextResponse.json({});

    const prompt = `Eres un experto en repuestos automotrices de un taller mecánico.
Te daré una lista de nombres de repuestos. Agrúpalos en categorías genéricas cortas (2-3 palabras), ignorando marca, modelo de auto y número de parte.

Ejemplos:
- "Castrol Edge 5W30", "Aceite Valvoline 5W30 C2", "Mobil 1 0W40" → "Aceite Motor"
- "Filtro aceite Bosch Subaru 0001", "Filtro de aceite Toyota OEM" → "Filtro Aceite"
- "Filtro de aire K&N Toyota", "Filtro aire ACDelco Colorado 2.8" → "Filtro Aire"
- "Filtro de diesel ACDelco 0001", "Filtro diesel Kia original" → "Filtro Combustible"
- "Filtro de polen KF Subaru", "Filtro habitáculo Bosch" → "Filtro Polen"
- "Pastillas de freno Brembo", "Pastillas freno delanteras Toyota Fortuner" → "Pastillas Freno"
- "Disco de freno delantero Brembo", "Rotor freno trasero KIA" → "Disco Freno"
- "Bujía NGK iridium", "Bujía Bosch platino" → "Bujías"
- "Correa de distribución Gates", "Kit distribución Toyota" → "Distribución"
- "Amortiguador Monroe delantero", "Amortiguador trasero KYB" → "Amortiguadores"

Responde SOLO con un JSON objeto. Clave: nombre exacto (tal como te lo di). Valor: categoría genérica en español.

Repuestos:
${nombres.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const map = JSON.parse(cleaned) as Record<string, string>;
    return NextResponse.json(map);
  } catch (error) {
    console.error('POST /api/categorize-repuestos error:', error);
    return NextResponse.json({});
  }
}
