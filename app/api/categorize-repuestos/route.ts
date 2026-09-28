import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { nombres } = await req.json() as { nombres: string[] };
    if (!nombres || nombres.length === 0) return NextResponse.json({});

    const prompt = `Eres un experto en repuestos automotrices de un taller mecánico chileno.
Te daré una lista de nombres de repuestos. Debes asignar a cada uno una categoría genérica muy corta (1-3 palabras), siguiendo estas reglas estrictas:

REGLAS:
1. Ignora completamente: marcas (Castrol, Bosch, NGK, Monroe, Gates, Brembo, KYB, Valvoline, Mobil, ACDelco, etc.), modelos de auto, patentes, viscosidades (5W30, 10W40, 0W20, etc.), especificaciones técnicas, números de parte y año.
2. Agrupa por función, no por variante. Distintas viscosidades de aceite = misma categoría "Aceite Motor".
3. Usa siempre la misma categoría para el mismo tipo de pieza aunque los nombres difieran ligeramente.

Categorías estándar a usar (usa estas cuando apliquen):
- "Aceite Motor" → cualquier aceite de motor (todos los 5W30, 10W40, sintéticos, etc.)
- "Aceite Caja" → aceite de transmisión manual o diferencial
- "Aceite Transmisión" → aceite ATF, transmisión automática
- "Filtro Aceite" → filtros de aceite de motor
- "Filtro Aire" → filtros de aire del motor
- "Filtro Polen" → filtros de habitáculo/cabina/polen
- "Filtro Combustible" → filtros de bencina/diesel/petróleo
- "Pastillas Freno" → pastillas o zapatas de freno
- "Disco Freno" → discos o rotores de freno
- "Bujías" → bujías de encendido
- "Distribución" → correa, kit o tensor de distribución
- "Amortiguadores" → amortiguadores o suspensión
- "Refrigerante" → líquido refrigerante, anticongelante
- "Líquido Frenos" → líquido de frenos DOT
- "Dirección" → aceite o bomba de dirección
- "Embrague" → kit, disco o plato embrague

Responde SOLO con un JSON objeto válido. Sin markdown, sin explicaciones. Clave: nombre exacto tal como aparece en la lista. Valor: categoría genérica.

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
