import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  cotizaciones,
  vehiculos,
  clientes,
  recepciones,
} from '@/lib/db/schema';
import { eq, desc, max, sql } from 'drizzle-orm';

// ── GET /api/cotizaciones ────────────────────────────────────────────────────
export async function GET() {
  try {
    const result = await db
      .select({
        id: cotizaciones.id,
        numero: cotizaciones.numero,
        recepcion_id: cotizaciones.recepcion_id,
        vehiculo_id: cotizaciones.vehiculo_id,
        cliente_id: cotizaciones.cliente_id,
        mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
        mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
        repuestos: cotizaciones.repuestos,
        recomendaciones: cotizaciones.recomendaciones,
        retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
        total: cotizaciones.total,
        estado: cotizaciones.estado,
        created_at: cotizaciones.created_at,
        updated_at: cotizaciones.updated_at,
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
        recepcion: {
          id: recepciones.id,
          estado: recepciones.estado,
          kilometraje: recepciones.kilometraje,
          fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
          diagnostico_mecanico: recepciones.diagnostico_mecanico,
        },
      })
      .from(cotizaciones)
      .leftJoin(vehiculos, eq(cotizaciones.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
      .leftJoin(recepciones, eq(cotizaciones.recepcion_id, recepciones.id))
      .orderBy(desc(cotizaciones.created_at));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/cotizaciones error:', error);
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 });
  }
}

// ── POST /api/cotizaciones ───────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      recepcion_id?: number | null;
      vehiculo_id?: number;
      cliente_id?: number;
      // campos para creación sin recepción
      patente?: string;
      marca?: string;
      modelo?: string;
      anio?: number;
      rut_cliente?: string;
      nombre_cliente?: string;
      telefono_cliente?: string;
      mano_de_obra_detalle?: string;
      mano_de_obra_monto: number;
      repuestos: unknown[];
      recomendaciones?: unknown[];
      retiro_entrega_monto: number;
      total: number;
    };

    const {
      recepcion_id,
      mano_de_obra_detalle,
      mano_de_obra_monto,
      repuestos,
      recomendaciones,
      retiro_entrega_monto,
      total,
    } = body;

    let vehiculo_id = body.vehiculo_id;
    let cliente_id = body.cliente_id;

    if (recepcion_id) {
      // Caso con recepción: vehiculo_id y cliente_id son requeridos
      if (!vehiculo_id || !cliente_id) {
        return NextResponse.json(
          { error: 'vehiculo_id y cliente_id son requeridos cuando se provee recepcion_id' },
          { status: 400 }
        );
      }
    } else {
      // Caso sin recepción: resolver cliente y vehículo desde los campos del body
      const { patente, marca, modelo, anio, rut_cliente, nombre_cliente, telefono_cliente } = body;

      if (!cliente_id) {
        if (!nombre_cliente) {
          return NextResponse.json(
            { error: 'nombre_cliente es requerido cuando no se provee cliente_id' },
            { status: 400 }
          );
        }
        const existingCliente = rut_cliente
          ? await db.select().from(clientes).where(eq(clientes.rut, rut_cliente)).limit(1)
          : [];

        if (existingCliente.length > 0) {
          const [updatedCliente] = await db
            .update(clientes)
            .set({ nombre: nombre_cliente, telefono: telefono_cliente || null })
            .where(eq(clientes.id, existingCliente[0].id))
            .returning();
          cliente_id = updatedCliente.id;
        } else {
          const [newCliente] = await db
            .insert(clientes)
            .values({ rut: rut_cliente || null, nombre: nombre_cliente, telefono: telefono_cliente || null })
            .returning();
          cliente_id = newCliente.id;
        }
      }

      if (!vehiculo_id) {
        if (!patente || !marca || !modelo || !anio) {
          return NextResponse.json(
            { error: 'patente, marca, modelo y anio son requeridos cuando no se provee vehiculo_id' },
            { status: 400 }
          );
        }
        const existingVehiculo = await db
          .select({ id: vehiculos.id })
          .from(vehiculos)
          .where(eq(vehiculos.patente, patente.toUpperCase()))
          .limit(1);

        if (existingVehiculo.length > 0) {
          vehiculo_id = existingVehiculo[0].id;
        } else {
          const [newVehiculo] = await db
            .insert(vehiculos)
            .values({
              patente: patente.toUpperCase(),
              marca,
              modelo,
              anio: Number(anio),
              kilometraje_actual: 0,
              cliente_id: cliente_id!,
            })
            .returning();
          vehiculo_id = newVehiculo.id;
        }
      }
    }

    // Generar número correlativo COT-XXXX
    const maxResult = await db
      .select({ maxNumero: max(cotizaciones.numero) })
      .from(cotizaciones);

    let nextNum = 1;
    const currentMax = maxResult[0]?.maxNumero;
    if (currentMax) {
      // Extract the number from "COT-0001" format
      const match = currentMax.match(/COT-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const numero = `COT-${String(nextNum).padStart(4, '0')}`;

    // Insertar cotización
    const [cotizacion] = await db
      .insert(cotizaciones)
      .values({
        numero,
        recepcion_id: recepcion_id ?? null,
        vehiculo_id: vehiculo_id!,
        cliente_id: cliente_id!,
        mano_de_obra_detalle: mano_de_obra_detalle ?? null,
        mano_de_obra_monto: mano_de_obra_monto ?? 0,
        repuestos: JSON.stringify(repuestos ?? []),
        recomendaciones: JSON.stringify(recomendaciones ?? []),
        retiro_entrega_monto: retiro_entrega_monto ?? 0,
        total,
        estado: 'pendiente',
      })
      .returning();

    // Actualizar estado de la recepción a 'cotizacion_pendiente' (sólo si hay recepción)
    if (recepcion_id) {
      await db
        .update(recepciones)
        .set({
          estado: 'cotizacion_pendiente',
          updated_at: sql`(datetime('now'))`,
        })
        .where(eq(recepciones.id, recepcion_id));
    }

    // Devolver cotización con joins
    const result = await db
      .select({
        id: cotizaciones.id,
        numero: cotizaciones.numero,
        recepcion_id: cotizaciones.recepcion_id,
        vehiculo_id: cotizaciones.vehiculo_id,
        cliente_id: cotizaciones.cliente_id,
        mano_de_obra_detalle: cotizaciones.mano_de_obra_detalle,
        mano_de_obra_monto: cotizaciones.mano_de_obra_monto,
        repuestos: cotizaciones.repuestos,
        recomendaciones: cotizaciones.recomendaciones,
        retiro_entrega_monto: cotizaciones.retiro_entrega_monto,
        total: cotizaciones.total,
        estado: cotizaciones.estado,
        created_at: cotizaciones.created_at,
        updated_at: cotizaciones.updated_at,
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
        recepcion: {
          id: recepciones.id,
          estado: recepciones.estado,
          kilometraje: recepciones.kilometraje,
          fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
          diagnostico_mecanico: recepciones.diagnostico_mecanico,
        },
      })
      .from(cotizaciones)
      .leftJoin(vehiculos, eq(cotizaciones.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(cotizaciones.cliente_id, clientes.id))
      .leftJoin(recepciones, eq(cotizaciones.recepcion_id, recepciones.id))
      .where(eq(cotizaciones.id, cotizacion.id))
      .limit(1);

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/cotizaciones error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Error al crear cotización: ${msg}` }, { status: 500 });
  }
}
