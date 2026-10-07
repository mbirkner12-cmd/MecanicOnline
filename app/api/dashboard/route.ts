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
  ot_repuestos,
  configuracion,
} from '@/lib/db/schema';
import { count, eq, ne, isNull, isNotNull, inArray, and, like, gte, lt, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // ── Date ranges for metrics ───────────────────────────────────────────────
    const now = new Date();
    const dow = now.getDay();
    const daysToMonday = dow === 0 ? 6 : dow - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysToMonday);
    const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
    const startOfLastWeekStr = new Date(startOfWeek.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mesAnteriorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, '0')}`;

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

    // ── Pendientes + valorHora ────────────────────────────────────────────────
    const [[cotizacionesSinRespuesta, recepcionesSinCotizacion, otsSinMecanico], cfgRows] =
      await Promise.all([Promise.all([
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
      ]), db.select().from(configuracion)]);

    const valorHora = parseInt(cfgRows.find(c => c.clave === 'valor_hora')?.valor ?? '0') || 0;

    // ── Métricas ──────────────────────────────────────────────────────────────
    const [
      vehSemana, vehSemanaAnt, vehMes, vehMesAnt,
      otsSemana, otsSemanaAnt,
      otsMes, otsMesAnt,
      tiempoTaller, tiempoCotOT,
      costoRepMes, costoRepMesAnt,
      costoMOMes, costoMOMesAnt,
    ] = await Promise.all([
      db.select({ c: count() }).from(recepciones).where(gte(recepciones.created_at, startOfWeekStr)),
      db.select({ c: count() }).from(recepciones).where(and(gte(recepciones.created_at, startOfLastWeekStr), lt(recepciones.created_at, startOfWeekStr))),
      db.select({ c: count() }).from(recepciones).where(like(recepciones.created_at, `${mesActual}%`)),
      db.select({ c: count() }).from(recepciones).where(like(recepciones.created_at, `${mesAnterior}%`)),

      db.select({ c: count() }).from(ordenes_trabajo).where(and(eq(ordenes_trabajo.estado, 'entregado'), gte(ordenes_trabajo.updated_at, startOfWeekStr))),
      db.select({ c: count() }).from(ordenes_trabajo).where(and(eq(ordenes_trabajo.estado, 'entregado'), gte(ordenes_trabajo.updated_at, startOfLastWeekStr), lt(ordenes_trabajo.updated_at, startOfWeekStr))),

      db.select({ c: count(), ingreso: sql<number>`COALESCE(SUM(${cotizaciones.total}), 0)` })
        .from(ordenes_trabajo)
        .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesActual}%`))),

      db.select({ c: count(), ingreso: sql<number>`COALESCE(SUM(${cotizaciones.total}), 0)` })
        .from(ordenes_trabajo)
        .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesAnterior}%`))),

      // Días desde recepción hasta entrega (OTs con recepcion_id)
      db.select({ avg: sql<number>`AVG(julianday(${ordenes_trabajo.updated_at}) - julianday(${recepciones.created_at}))` })
        .from(ordenes_trabajo)
        .leftJoin(recepciones, eq(ordenes_trabajo.recepcion_id, recepciones.id))
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesActual}%`), isNotNull(ordenes_trabajo.recepcion_id))),

      // Días desde cotización creada hasta OT entregada
      db.select({ avg: sql<number>`AVG(julianday(${ordenes_trabajo.updated_at}) - julianday(${cotizaciones.created_at}))` })
        .from(ordenes_trabajo)
        .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesActual}%`))),

      // Costo repuestos OTs este mes
      db.select({ total: sql<number>`COALESCE(SUM(${ot_repuestos.cantidad} * ${ot_repuestos.precio_costo_snapshot}), 0)` })
        .from(ot_repuestos)
        .innerJoin(ordenes_trabajo, eq(ot_repuestos.ot_id, ordenes_trabajo.id))
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesActual}%`))),

      // Costo repuestos OTs mes anterior
      db.select({ total: sql<number>`COALESCE(SUM(${ot_repuestos.cantidad} * ${ot_repuestos.precio_costo_snapshot}), 0)` })
        .from(ot_repuestos)
        .innerJoin(ordenes_trabajo, eq(ot_repuestos.ot_id, ordenes_trabajo.id))
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesAnterior}%`))),

      // Costo mano de obra OTs este mes
      db.select({ total: sql<number>`COALESCE(SUM(COALESCE(${ordenes_trabajo.costo_mo_override}, COALESCE(${ordenes_trabajo.horas_trabajadas}, 0) * ${valorHora})), 0)` })
        .from(ordenes_trabajo)
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesActual}%`))),

      // Costo mano de obra OTs mes anterior
      db.select({ total: sql<number>`COALESCE(SUM(COALESCE(${ordenes_trabajo.costo_mo_override}, COALESCE(${ordenes_trabajo.horas_trabajadas}, 0) * ${valorHora})), 0)` })
        .from(ordenes_trabajo)
        .where(and(eq(ordenes_trabajo.estado, 'entregado'), like(ordenes_trabajo.updated_at, `${mesAnterior}%`))),
    ]);

    const metricas = {
      vehiculosEstaSemana: vehSemana[0].c,
      vehiculosSemanaAnterior: vehSemanaAnt[0].c,
      vehiculosEsteMes: vehMes[0].c,
      vehiculosMesAnterior: vehMesAnt[0].c,
      otsEntregadasEstaSemana: otsSemana[0].c,
      otsEntregadasSemanaAnterior: otsSemanaAnt[0].c,
      otsEntregadasEsteMes: otsMes[0].c,
      otsEntregadasMesAnterior: otsMesAnt[0].c,
      ingresoEsteMes: Number(otsMes[0].ingreso) || 0,
      ingresoMesAnterior: Number(otsMesAnt[0].ingreso) || 0,
      diasPromedioEnTaller: tiempoTaller[0].avg ?? 0,
      diasPromedioCotAOT: tiempoCotOT[0].avg ?? 0,
      costoPromedioPorOT: otsMes[0].c > 0
        ? (Number(costoRepMes[0].total) + Number(costoMOMes[0].total)) / otsMes[0].c
        : 0,
      costoPromedioPorOTMesAnterior: otsMesAnt[0].c > 0
        ? (Number(costoRepMesAnt[0].total) + Number(costoMOMesAnt[0].total)) / otsMesAnt[0].c
        : 0,
    };

    return NextResponse.json({
      stats,
      puestos: puestosData,
      pendientes: {
        cotizacionesSinRespuesta,
        recepcionesSinCotizacion,
        otsSinMecanico,
      },
      metricas,
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    );
  }
}
