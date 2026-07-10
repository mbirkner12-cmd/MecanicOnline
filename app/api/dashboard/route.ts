import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recepciones,
  ordenes_trabajo,
  cotizaciones,
  puestos,
  vehiculos,
  clientes,
  mecanicos,
} from '@/lib/db/schema';
import { count, eq, ne, isNull, isNotNull, inArray, and, like } from 'drizzle-orm';

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // ── Stats (parallel) ──────────────────────────────────────────────────────
    const [
      enTallerResult,
      enDiagnosticoResult,
      cotizacionesPendientesResult,
      enReparacionResult,
      listosParaEntregarResult,
      entregadosHoyResult,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(recepciones)
        .where(ne(recepciones.estado, 'entregado')),
      db
        .select({ count: count() })
        .from(recepciones)
        .where(eq(recepciones.estado, 'en_diagnostico')),
      db
        .select({ count: count() })
        .from(cotizaciones)
        .where(eq(cotizaciones.estado, 'pendiente')),
      db
        .select({ count: count() })
        .from(ordenes_trabajo)
        .where(eq(ordenes_trabajo.estado, 'en_reparacion')),
      db
        .select({ count: count() })
        .from(ordenes_trabajo)
        .where(eq(ordenes_trabajo.estado, 'listo_para_entregar')),
      db
        .select({ count: count() })
        .from(recepciones)
        .where(
          and(
            eq(recepciones.estado, 'entregado'),
            like(recepciones.updated_at, `${today}%`)
          )
        ),
    ]);

    const stats = {
      enTaller: enTallerResult[0].count,
      enDiagnostico: enDiagnosticoResult[0].count,
      cotizacionesPendientes: cotizacionesPendientesResult[0].count,
      enReparacion: enReparacionResult[0].count,
      listosParaEntregar: listosParaEntregarResult[0].count,
      entregadosHoy: entregadosHoyResult[0].count,
    };

    // ── Puestos con vehículo ──────────────────────────────────────────────────
    const [activePuestos, activeOTs, activeRecepciones] = await Promise.all([
      db
        .select()
        .from(puestos)
        .where(eq(puestos.activo, true))
        .orderBy(puestos.nombre),

      db
        .select({
          ot_id: ordenes_trabajo.id,
          ot_numero: ordenes_trabajo.numero,
          ot_estado: ordenes_trabajo.estado,
          puesto_id: ordenes_trabajo.puesto_id,
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          cliente_nombre: clientes.nombre,
          mecanico_nombre: mecanicos.nombre,
        })
        .from(ordenes_trabajo)
        .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
        .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
        .leftJoin(mecanicos, eq(ordenes_trabajo.mecanico_id, mecanicos.id))
        .where(
          and(
            ne(ordenes_trabajo.estado, 'entregado'),
            isNotNull(ordenes_trabajo.puesto_id)
          )
        ),

      db
        .select({
          rec_id: recepciones.id,
          rec_estado: recepciones.estado,
          puesto_id: recepciones.puesto_id,
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          cliente_nombre: clientes.nombre,
          mecanico_nombre: mecanicos.nombre,
        })
        .from(recepciones)
        .leftJoin(vehiculos, eq(recepciones.vehiculo_id, vehiculos.id))
        .leftJoin(clientes, eq(recepciones.cliente_id, clientes.id))
        .leftJoin(mecanicos, eq(recepciones.mecanico_id, mecanicos.id))
        .where(
          and(
            inArray(recepciones.estado, [
              'en_diagnostico',
              'cotizacion_pendiente',
              'cotizacion_rechazada',
            ]),
            isNotNull(recepciones.puesto_id)
          )
        ),
    ]);

    const puestosData = activePuestos.map((puesto) => {
      const ot = activeOTs.find((o) => o.puesto_id === puesto.id);
      if (ot) {
        return {
          puesto: { id: puesto.id, nombre: puesto.nombre, tipo: puesto.tipo },
          vehiculo: ot.patente
            ? { patente: ot.patente, marca: ot.marca ?? '', modelo: ot.modelo ?? '' }
            : null,
          cliente: ot.cliente_nombre ?? null,
          mecanico: ot.mecanico_nombre ?? null,
          estado: ot.ot_estado,
          link: '/ordenes-trabajo',
        };
      }
      const rec = activeRecepciones.find((r) => r.puesto_id === puesto.id);
      if (rec) {
        return {
          puesto: { id: puesto.id, nombre: puesto.nombre, tipo: puesto.tipo },
          vehiculo: rec.patente
            ? { patente: rec.patente, marca: rec.marca ?? '', modelo: rec.modelo ?? '' }
            : null,
          cliente: rec.cliente_nombre ?? null,
          mecanico: rec.mecanico_nombre ?? null,
          estado: rec.rec_estado,
          link: `/recepcion/${rec.rec_id}`,
        };
      }
      return {
        puesto: { id: puesto.id, nombre: puesto.nombre, tipo: puesto.tipo },
        vehiculo: null,
        cliente: null,
        mecanico: null,
        estado: null,
        link: null,
      };
    });

    // ── Pendientes ────────────────────────────────────────────────────────────
    const [cotizacionesSinRespuesta, recepcionesSinCotizacion, otsSinMecanico] =
      await Promise.all([
        db
          .select({
            id: cotizaciones.id,
            numero: cotizaciones.numero,
            cliente_nombre: clientes.nombre,
            patente: vehiculos.patente,
            created_at: cotizaciones.created_at,
          })
          .from(cotizaciones)
          .leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
          .leftJoin(vehiculos, eq(cotizaciones.vehiculo_id, vehiculos.id))
          .where(eq(cotizaciones.estado, 'pendiente'))
          .orderBy(cotizaciones.created_at)
          .limit(5),

        db
          .select({
            id: recepciones.id,
            patente: vehiculos.patente,
            marca: vehiculos.marca,
            modelo: vehiculos.modelo,
            cliente_nombre: clientes.nombre,
            created_at: recepciones.created_at,
          })
          .from(recepciones)
          .leftJoin(vehiculos, eq(recepciones.vehiculo_id, vehiculos.id))
          .leftJoin(clientes, eq(recepciones.cliente_id, clientes.id))
          .where(eq(recepciones.estado, 'en_diagnostico'))
          .orderBy(recepciones.created_at)
          .limit(5),

        db
          .select({
            id: ordenes_trabajo.id,
            numero: ordenes_trabajo.numero,
            patente: vehiculos.patente,
            estado: ordenes_trabajo.estado,
            created_at: ordenes_trabajo.created_at,
          })
          .from(ordenes_trabajo)
          .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
          .where(
            and(
              isNull(ordenes_trabajo.mecanico_id),
              ne(ordenes_trabajo.estado, 'entregado')
            )
          )
          .orderBy(ordenes_trabajo.created_at)
          .limit(5),
      ]);

    return NextResponse.json({
      stats,
      puestos: puestosData,
      pendientes: {
        cotizacionesSinRespuesta,
        recepcionesSinCotizacion,
        otsSinMecanico,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    );
  }
}
