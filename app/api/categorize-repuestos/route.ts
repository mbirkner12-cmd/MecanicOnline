import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { nombres } = await req.json() as { nombres: string[] };
    if (!nombres || nombres.length === 0) return NextResponse.json({});

    const prompt = `Eres un experto en repuestos automotrices de un taller mecánico chileno.
Te daré una lista de nombres de repuestos. Asigna a cada uno UNA de las siguientes categorías amplias. Sé muy agresivo agrupando: ignora marcas, viscosidades, subtipos y especificaciones.

CATEGORÍAS (úsalas exactamente como están escritas):
- "Aceites" → TODO tipo de aceite: motor (5W30, 10W40, sintético, semi, etc.), caja, diferencial, dirección, hidráulico, ATF
- "Filtros" → TODO tipo de filtro: aceite, aire, polen, habitáculo, combustible, diesel, bencina, gasolina, petróleo, kit de filtros
- "Frenos" → pastillas, zapatas, discos, rotores, líquido de frenos, cilindros de freno
- "Suspensión" → amortiguadores, muelles, resortes, bieletas, rótulas, silent block, brazos
- "Bujías" → bujías de encendido (cualquier tipo o marca)
- "Distribución" → correa, cadena, kit o tensor de distribución
- "Embrague" → disco, plato, kit de embrague
- "Refrigeración" → refrigerante, anticongelante, termostato, mangueras de agua
- "Neumáticos" → neumáticos, cubiertas, llantas
- "Baterías" → baterías de auto (cualquier marca o amperaje)
- "Eléctrico" → alternador, motor arranque, sensores, cables, fusibles, focos
- "Dirección" → cremallera, bomba dirección, flexible, terminales de dirección
- "Otros" → cualquier repuesto que no encaje en las categorías anteriores

Responde SOLO con un JSON objeto válido. Sin markdown, sin explicaciones. Clave: nombre exacto tal como aparece en la lista. Valor: una de las categorías de arriba.

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
