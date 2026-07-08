import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { alertas_vehiculo, vehiculos, clientes } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { enviarWhatsApp, enviarEmail, type DatosAlerta } from '@/lib/mensajes';
import { sql } from 'drizzle-orm';

// Protegido con CRON_SECRET para llamadas externas.
// Llamar con: GET /api/cron/alertas
// Header requerido: Authorization: Bearer <CRON_SECRET>
// En Vercel, usar la integración nativa de Vercel Cron y agregar en vercel.json:
// { "crons": [{ "path": "/api/cron/alertas", "schedule": "0 10 * * *" }] }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  try {
    // Obtener todas las alertas activas con fecha de vencimiento
    const alertasActivas = await db
      .select({
        id: alertas_vehiculo.id,
        vehiculo_id: alertas_vehiculo.vehiculo_id,
        tipo: alertas_vehiculo.tipo,
        descripcion: alertas_vehiculo.descripcion,
        fecha_vencimiento: alertas_vehiculo.fecha_vencimiento,
        dias_anticipacion: alertas_vehiculo.dias_anticipacion,
        ultimo_envio: alertas_vehiculo.ultimo_envio,
        patente: vehiculos.patente,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        cliente_nombre: clientes.nombre,
        cliente_correo: clientes.correo,
        cliente_whatsapp: clientes.whatsapp,
      })
      .from(alertas_vehiculo)
      .leftJoin(vehiculos, eq(alertas_vehiculo.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(vehiculos.cliente_id, clientes.id))
      .where(
        and(
          eq(alertas_vehiculo.activo, true),
          isNotNull(alertas_vehiculo.fecha_vencimiento)
        )
      );

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const resultados: { id: number; tipo: string; patente: string; enviado: boolean; razon?: string }[] = [];

    for (const alerta of alertasActivas) {
      if (!alerta.fecha_vencimiento || !alerta.patente) continue;

      const venc = new Date(alerta.fecha_vencimiento);
      venc.setHours(0, 0, 0, 0);
      const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      // Solo si vence dentro del rango y no ha vencido
      if (diffDias < 0 || diffDias > alerta.dias_anticipacion) {
        continue;
      }

      // Evitar re-enviar si ya se envió en los últimos 7 días
      if (alerta.ultimo_envio) {
        const ultimoEnvio = new Date(alerta.ultimo_envio);
        const diasDesdeEnvio = Math.ceil((hoy.getTime() - ultimoEnvio.getTime()) / (1000 * 60 * 60 * 24));
        if (diasDesdeEnvio < 7) {
          resultados.push({ id: alerta.id, tipo: alerta.tipo, patente: alerta.patente, enviado: false, razon: 'enviado_reciente' });
          continue;
        }
      }

      const datos: DatosAlerta = {
        clienteNombre: alerta.cliente_nombre ?? 'Cliente',
        clienteCorreo: alerta.cliente_correo ?? null,
        clienteWhatsapp: alerta.cliente_whatsapp ?? null,
        patente: alerta.patente,
        marca: alerta.marca ?? '',
        modelo: alerta.modelo ?? '',
        tipo: alerta.tipo,
        descripcion: alerta.descripcion,
        fechaVencimiento: alerta.fecha_vencimiento,
      };

      const [waOk, emailOk] = await Promise.all([
        enviarWhatsApp(datos),
        enviarEmail(datos),
      ]);

      const enviado = waOk || emailOk;

      if (enviado) {
        await db
          .update(alertas_vehiculo)
          .set({ ultimo_envio: new Date().toISOString(), updated_at: sql`(datetime('now'))` })
          .where(eq(alertas_vehiculo.id, alerta.id));
      }

      resultados.push({ id: alerta.id, tipo: alerta.tipo, patente: alerta.patente, enviado });
    }

    const enviados = resultados.filter((r) => r.enviado).length;
    return NextResponse.json({
      procesadas: alertasActivas.length,
      enviadas: enviados,
      resultados,
    });
  } catch (error) {
    console.error('GET /api/cron/alertas error:', error);
    return NextResponse.json({ error: 'Error procesando alertas' }, { status: 500 });
  }
}
