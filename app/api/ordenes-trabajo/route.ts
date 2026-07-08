import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  ordenes_trabajo,
  vehiculos,
  clientes,
  mecanicos,
  puestos,
  cotizaciones,
  recepciones,
} from '@/lib/db/schema';
import { eq, desc, max } from 'drizzle-orm';

interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
}

// ── Shared: build joined query ───────────────────────────────────────────────
async function getOrdenesConJoins() {
  return db
    .select({
      id: ordenes_trabajo.id,
      numero: ordenes_trabajo.numero,
      cotizacion_id: ordenes_trabajo.cotizacion_id,
      recepcion_id: ordenes_trabajo.recepcion_id,
      vehiculo_id: ordenes_trabajo.vehiculo_id,
      cliente_id: ordenes_trabajo.cliente_id,
      mecanico_id: ordenes_trabajo.mecanico_id,
      puesto_id: ordenes_trabajo.puesto_id,
      insumos: ordenes_trabajo.insumos,
      diagnostico: ordenes_trabajo.diagnostico,
      fecha_estimada_inicio: ordenes_trabajo.fecha_estimada_inicio,
      fecha_estimada_fin: ordenes_trabajo.fecha_estimada_fin,
      fecha_hora_inicio: ordenes_trabajo.fecha_hora_inicio,
      fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
      estado: ordenes_trabajo.estado,
      created_at: ordenes_trabajo.created_at,
      updated_at: ordenes_trabajo.updated_at,
      vehiculo: {
        id: vehiculos.id,
        patente: vehiculos.patente,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        anio: vehiculos.anio,
        kilometraje_actual: vehiculos.kilometraje_actual,
      },
      cliente: {
        id: clientes.id,
        rut: clientes.rut,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
        correo: clientes.correo,
      },
      mecanico: {
        id: mecanicos.id,
        nombre: mecanicos.nombre,
        rut: mecanicos.rut,
      },
      puesto: {
        id: puestos.id,
        nombre: puestos.nombre,
        tipo: puestos.tipo,
      },
      cotizacion: {
        id: cotizaciones.id,
        numero: cotizaciones.numero,
        total: cotizaciones.total,
        mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
        mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
        repuestos: cotizaciones.repuestos,
        retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
        estado: cotizaciones.estado,
      },
      recepcion: {
        id: recepciones.id,
        estado: recepciones.estado,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
      },
    })
    .from(ordenes_trabajo)
    .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
    .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
    .leftJoin(mecanicos, eq(ordenes_trabajo.mecanico_id, mecanicos.id))
    .leftJoin(puestos, eq(ordenes_trabajo.puesto_id, puestos.id))
    .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
    .leftJoin(recepciones, eq(ordenes_trabajo.recepcion_id, recepciones.id))
    .orderBy(desc(ordenes_trabajo.created_at));
}

// ── GET /api/ordenes-trabajo ─────────────────────────────────────────────────
export async function GET() {
  try {
    const result = await getOrdenesConJoins();
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/ordenes-trabajo error:', error);
    return NextResponse.json({ error: 'Error al obtener órdenes de trabajo' }, { status: 500 });
  }
}

// ── POST /api/ordenes-trabajo ────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      cotizacion_id: number;
      recepcion_id: number;
      vehiculo_id: number;
      cliente_id: number;
      mecanico_id?: number | null;
      puesto_id?: number | null;
      insumos?: InsumoItem[];
      diagnostico?: string | null;
      fecha_estimada_inicio?: string | null;
      fecha_estimada_fin?: string | null;
    };

    const { cotizacion_id, recepcion_id, vehiculo_id, cliente_id, mecanico_id, puesto_id, insumos, diagnostico, fecha_estimada_inicio, fecha_estimada_fin } = body;

    if (!cotizacion_id || !recepcion_id || !vehiculo_id || !cliente_id) {
      return NextResponse.json(
        { error: 'cotizacion_id, recepcion_id, vehiculo_id y cliente_id son requeridos' },
        { status: 400 }
      );
    }

    // Generar número correlativo OT-XXXX
    const maxResult = await db
      .select({ maxNumero: max(ordenes_trabajo.numero) })
      .from(ordenes_trabajo);

    let nextNum = 1;
    const currentMax = maxResult[0]?.maxNumero;
    if (currentMax) {
      const match = currentMax.match(/OT-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const numero = `OT-${String(nextNum).padStart(4, '0')}`;

    // Insertar OT con estado 'creada', fechas null
    const [ot] = await db
      .insert(ordenes_trabajo)
      .values({
        numero,
        cotizacion_id,
        recepcion_id,
        vehiculo_id,
        cliente_id,
        mecanico_id: mecanico_id ?? null,
        puesto_id: puesto_id ?? null,
        insumos: JSON.stringify(insumos ?? []),
        tareas_completadas: '[]',
        diagnostico: diagnostico ?? null,
        fecha_estimada_inicio: fecha_estimada_inicio ?? null,
        fecha_estimada_fin: fecha_estimada_fin ?? null,
        fecha_hora_inicio: null,
        fecha_hora_fin: null,
        estado: 'creada',
      })
      .returning();

    // Devolver OT con todos los joins
    const result = await db
      .select({
        id: ordenes_trabajo.id,
        numero: ordenes_trabajo.numero,
        cotizacion_id: ordenes_trabajo.cotizacion_id,
        recepcion_id: ordenes_trabajo.recepcion_id,
        vehiculo_id: ordenes_trabajo.vehiculo_id,
        cliente_id: ordenes_trabajo.cliente_id,
        mecanico_id: ordenes_trabajo.mecanico_id,
        puesto_id: ordenes_trabajo.puesto_id,
        insumos: ordenes_trabajo.insumos,
        diagnostico: ordenes_trabajo.diagnostico,
        fecha_hora_inicio: ordenes_trabajo.fecha_hora_inicio,
        fecha_hora_fin: ordenes_trabajo.fecha_hora_fin,
        estado: ordenes_trabajo.estado,
        created_at: ordenes_trabajo.created_at,
        updated_at: ordenes_trabajo.updated_at,
        vehiculo: {
          id: vehiculos.id,
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          anio: vehiculos.anio,
          kilometraje_actual: vehiculos.kilometraje_actual,
        },
        cliente: {
          id: clientes.id,
          rut: clientes.rut,
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          correo: clientes.correo,
        },
        mecanico: {
          id: mecanicos.id,
          nombre: mecanicos.nombre,
          rut: mecanicos.rut,
        },
        puesto: {
          id: puestos.id,
          nombre: puestos.nombre,
          tipo: puestos.tipo,
        },
        cotizacion: {
          id: cotizaciones.id,
          numero: cotizaciones.numero,
          total: cotizaciones.total,
          mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
          mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
          repuestos: cotizaciones.repuestos,
          retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
          estado: cotizaciones.estado,
        },
        recepcion: {
          id: recepciones.id,
          estado: recepciones.estado,
          fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        },
      })
      .from(ordenes_trabajo)
      .leftJoin(vehiculos, eq(ordenes_trabajo.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(ordenes_trabajo.cliente_id, clientes.id))
      .leftJoin(mecanicos, eq(ordenes_trabajo.mecanico_id, mecanicos.id))
      .leftJoin(puestos, eq(ordenes_trabajo.puesto_id, puestos.id))
      .leftJoin(cotizaciones, eq(ordenes_trabajo.cotizacion_id, cotizaciones.id))
      .leftJoin(recepciones, eq(ordenes_trabajo.recepcion_id, recepciones.id))
      .where(eq(ordenes_trabajo.id, ot.id))
      .limit(1);

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/ordenes-trabajo error:', error);
    return NextResponse.json({ error: 'Error al crear orden de trabajo' }, { status: 500 });
  }
}
