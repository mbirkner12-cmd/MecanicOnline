import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recepciones, vehiculos, clientes, mecanicos, puestos, cotizaciones } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db
      .select({
        id: recepciones.id,
        vehiculo_id: recepciones.vehiculo_id,
        cliente_id: recepciones.cliente_id,
        fecha_hora_ingreso: recepciones.fecha_hora_ingreso,
        kilometraje: recepciones.kilometraje,
        nivel_bencina: recepciones.nivel_bencina,
        foto_tablero_url: recepciones.foto_tablero_url,
        fotos_urls: recepciones.fotos_urls,
        mecanico_id: recepciones.mecanico_id,
        puesto_id: recepciones.puesto_id,
        estado: recepciones.estado,
        diagnostico_mecanico: recepciones.diagnostico_mecanico,
        motivo_ingreso: recepciones.motivo_ingreso,
        created_at: recepciones.created_at,
        updated_at: recepciones.updated_at,
        vehiculo: {
          id: vehiculos.id,
          patente: vehiculos.patente,
          marca: vehiculos.marca,
          modelo: vehiculos.modelo,
          anio: vehiculos.anio,
          kilometraje_actual: vehiculos.kilometraje_actual,
          revision_tecnica_vencimiento: vehiculos.revision_tecnica_vencimiento,
          permiso_circulacion_vencimiento: vehiculos.permiso_circulacion_vencimiento,
        },
        cliente: {
          id: clientes.id,
          rut: clientes.rut,
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          correo: clientes.correo,
          direccion: clientes.direccion,
          whatsapp: clientes.whatsapp,
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
      })
      .from(recepciones)
      .leftJoin(vehiculos, eq(recepciones.vehiculo_id, vehiculos.id))
      .leftJoin(clientes, eq(recepciones.cliente_id, clientes.id))
      .leftJoin(mecanicos, eq(recepciones.mecanico_id, mecanicos.id))
      .leftJoin(puestos, eq(recepciones.puesto_id, puestos.id))
      .orderBy(recepciones.created_at);

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/recepciones error:', error);
    return NextResponse.json({ error: 'Error al obtener recepciones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patente,
      marca,
      modelo,
      anio,
      kilometraje,
      nivel_bencina,
      foto_tablero_url,
      fotos_urls,
      rut_cliente,
      nombre_cliente,
      telefono_cliente,
      direccion_cliente,
      mecanico_id,
      puesto_id,
      vehiculo_id: bodyVehiculoId,
      cliente_id: bodyClienteId,
      revision_tecnica_url,
      revision_tecnica_vencimiento,
      permiso_circulacion_url,
      permiso_circulacion_vencimiento,
      motivo_ingreso,
      cotizacion_id,
    } = body;

    if (!patente || !marca || !modelo || !anio || kilometraje === undefined) {
      return NextResponse.json(
        { error: 'Patente, marca, modelo, año y kilometraje son requeridos' },
        { status: 400 }
      );
    }

    if (!nombre_cliente) {
      return NextResponse.json(
        { error: 'El nombre del cliente es requerido' },
        { status: 400 }
      );
    }

    let clienteId: number = bodyClienteId;
    let vehiculoId: number = bodyVehiculoId;

    // 1. Resolver cliente
    if (!clienteId) {
      const existingCliente = rut_cliente
        ? await db.select().from(clientes).where(eq(clientes.rut, rut_cliente)).limit(1)
        : [];

      if (existingCliente.length > 0) {
        // Actualizar datos del cliente existente
        const [updatedCliente] = await db
          .update(clientes)
          .set({
            nombre: nombre_cliente,
            telefono: telefono_cliente || null,
            direccion: direccion_cliente || null,
            whatsapp: telefono_cliente || null,
          })
          .where(eq(clientes.id, existingCliente[0].id))
          .returning();
        clienteId = updatedCliente.id;
      } else {
        // Crear nuevo cliente
        const [newCliente] = await db
          .insert(clientes)
          .values({
            rut: rut_cliente || null,
            nombre: nombre_cliente,
            telefono: telefono_cliente || null,
            direccion: direccion_cliente || null,
            whatsapp: telefono_cliente || null,
          })
          .returning();
        clienteId = newCliente.id;
      }
    }

    // 2. Resolver vehículo
    if (!vehiculoId) {
      const existingVehiculo = await db
        .select()
        .from(vehiculos)
        .where(eq(vehiculos.patente, patente.toUpperCase()))
        .limit(1);

      if (existingVehiculo.length > 0) {
        vehiculoId = existingVehiculo[0].id;
        // 3. Si el vehículo tiene cliente distinto, actualizar
        if (existingVehiculo[0].cliente_id !== clienteId) {
          await db
            .update(vehiculos)
            .set({
              cliente_id: clienteId,
              kilometraje_actual: Number(kilometraje),
              revision_tecnica_url: revision_tecnica_url || null,
              revision_tecnica_vencimiento: revision_tecnica_vencimiento || null,
              permiso_circulacion_url: permiso_circulacion_url || null,
              permiso_circulacion_vencimiento: permiso_circulacion_vencimiento || null,
            })
            .where(eq(vehiculos.id, vehiculoId));
        } else {
          // Actualizar kilometraje si es mayor + documentos
          const updateSet: Record<string, unknown> = {
            revision_tecnica_url: revision_tecnica_url || null,
            revision_tecnica_vencimiento: revision_tecnica_vencimiento || null,
            permiso_circulacion_url: permiso_circulacion_url || null,
            permiso_circulacion_vencimiento: permiso_circulacion_vencimiento || null,
          };
          if (Number(kilometraje) > existingVehiculo[0].kilometraje_actual) {
            updateSet.kilometraje_actual = Number(kilometraje);
          }
          await db
            .update(vehiculos)
            .set(updateSet)
            .where(eq(vehiculos.id, vehiculoId));
        }
      } else {
        // Crear nuevo vehículo
        const [newVehiculo] = await db
          .insert(vehiculos)
          .values({
            patente: patente.toUpperCase(),
            marca,
            modelo,
            anio: Number(anio),
            kilometraje_actual: Number(kilometraje),
            cliente_id: clienteId,
            revision_tecnica_url: revision_tecnica_url || null,
            revision_tecnica_vencimiento: revision_tecnica_vencimiento || null,
            permiso_circulacion_url: permiso_circulacion_url || null,
            permiso_circulacion_vencimiento: permiso_circulacion_vencimiento || null,
          })
          .returning();
        vehiculoId = newVehiculo.id;
      }
    }

    // 4. Crear recepción
    const fotosArray = Array.isArray(fotos_urls) ? fotos_urls : [];
    const estadoInicial = cotizacion_id ? 'con_ot_activa' : 'en_diagnostico';
    const [recepcion] = await db
      .insert(recepciones)
      .values({
        vehiculo_id: vehiculoId,
        cliente_id: clienteId,
        fecha_hora_ingreso: new Date().toISOString(),
        kilometraje: Number(kilometraje),
        nivel_bencina: nivel_bencina || null,
        foto_tablero_url: foto_tablero_url || null,
        fotos_urls: JSON.stringify(fotosArray),
        mecanico_id: mecanico_id ? Number(mecanico_id) : null,
        puesto_id: puesto_id ? Number(puesto_id) : null,
        motivo_ingreso: motivo_ingreso || null,
        estado: estadoInicial,
      })
      .returning();

    // 5. Si se vincula a una cotización existente, actualizar su recepcion_id
    if (cotizacion_id) {
      await db
        .update(cotizaciones)
        .set({ recepcion_id: recepcion.id })
        .where(eq(cotizaciones.id, Number(cotizacion_id)));
    }

    return NextResponse.json(recepcion, { status: 201 });
  } catch (error) {
    console.error('POST /api/recepciones error:', error);
    return NextResponse.json({ error: 'Error al crear recepción' }, { status: 500 });
  }
}
