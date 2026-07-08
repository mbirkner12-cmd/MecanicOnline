import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'mecaniconline.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

const db = drizzle(sqlite, { schema });

async function seed() {
  console.log('Seeding database...');

  // Clientes (skip if already exist)
  const existingClientes = await db.select().from(schema.clientes);
  let carlosCliente = existingClientes.find((c) => c.rut === '12.345.678-9');
  let anaCliente = existingClientes.find((c) => c.rut === '98.765.432-1');
  let luisCliente = existingClientes.find((c) => c.rut === '11.111.111-1');

  if (!carlosCliente || !anaCliente || !luisCliente) {
    const toInsert = [];
    if (!carlosCliente) toInsert.push({ rut: '12.345.678-9', nombre: 'Carlos Muñoz', telefono: '912345678' });
    if (!anaCliente) toInsert.push({ rut: '98.765.432-1', nombre: 'Ana Pérez', telefono: '987654321' });
    if (!luisCliente) toInsert.push({ rut: '11.111.111-1', nombre: 'Luis Soto', telefono: '911111111' });
    if (toInsert.length > 0) await db.insert(schema.clientes).values(toInsert);
    const allClientes = await db.select().from(schema.clientes);
    carlosCliente = allClientes.find((c) => c.rut === '12.345.678-9')!;
    anaCliente = allClientes.find((c) => c.rut === '98.765.432-1')!;
    luisCliente = allClientes.find((c) => c.rut === '11.111.111-1')!;
  }
  const allClientes = await db.select().from(schema.clientes);
  console.log('Clientes en DB:', allClientes.length);

  // Vehículos (skip if already exist)
  const existingVehiculos = await db.select().from(schema.vehiculos);
  let bcdf12 = existingVehiculos.find((v) => v.patente === 'BCDF12');
  if (!bcdf12) {
    const toInsert = [];
    if (!existingVehiculos.find((v) => v.patente === 'BCDF12')) {
      toInsert.push({ patente: 'BCDF12', marca: 'Toyota', modelo: 'Corolla', anio: 2018, kilometraje_actual: 85000, cliente_id: carlosCliente!.id });
    }
    if (!existingVehiculos.find((v) => v.patente === 'GHIJ34')) {
      toInsert.push({ patente: 'GHIJ34', marca: 'Chevrolet', modelo: 'Spark', anio: 2020, kilometraje_actual: 42000, cliente_id: anaCliente!.id });
    }
    if (!existingVehiculos.find((v) => v.patente === 'KLMN56')) {
      toInsert.push({ patente: 'KLMN56', marca: 'Ford', modelo: 'Ranger', anio: 2019, kilometraje_actual: 120000, cliente_id: luisCliente!.id });
    }
    if (toInsert.length > 0) await db.insert(schema.vehiculos).values(toInsert);
    const allVeh = await db.select().from(schema.vehiculos);
    bcdf12 = allVeh.find((v) => v.patente === 'BCDF12')!;
  }
  const allVehiculos = await db.select().from(schema.vehiculos);
  console.log('Vehículos en DB:', allVehiculos.length);

  // Mecánicos (skip if already exist)
  const existingMecanicos = await db.select().from(schema.mecanicos);
  if (!existingMecanicos.find((m) => m.rut === '15.555.555-5')) {
    await db.insert(schema.mecanicos).values([{ rut: '15.555.555-5', nombre: 'Pedro González' }]);
  }
  if (!existingMecanicos.find((m) => m.rut === '16.666.666-6')) {
    await db.insert(schema.mecanicos).values([{ rut: '16.666.666-6', nombre: 'Mario Díaz' }]);
  }
  const allMecanicos = await db.select().from(schema.mecanicos);
  const pedro = allMecanicos.find((m) => m.rut === '15.555.555-5')!;
  console.log('Mecánicos en DB:', allMecanicos.length);

  // Puestos (skip if already exist)
  const existingPuestos = await db.select().from(schema.puestos);
  if (!existingPuestos.find((p) => p.nombre === 'Fosa 1')) {
    await db.insert(schema.puestos).values([{ nombre: 'Fosa 1', tipo: 'Con elevador' }]);
  }
  if (!existingPuestos.find((p) => p.nombre === 'Bahía 2')) {
    await db.insert(schema.puestos).values([{ nombre: 'Bahía 2', tipo: 'Sin elevador' }]);
  }
  const allPuestos = await db.select().from(schema.puestos);
  const fosa1 = allPuestos.find((p) => p.nombre === 'Fosa 1')!;
  console.log('Puestos en DB:', allPuestos.length);

  // Herramientas (skip if already exist)
  const existingHerramientas = await db.select().from(schema.herramientas);
  if (!existingHerramientas.find((h) => h.nombre === 'Llave de torque')) {
    await db.insert(schema.herramientas).values([{ nombre: 'Llave de torque', marca: 'Snap-on', cantidad: 2 }]);
  }
  console.log('Herramientas en DB:', existingHerramientas.length || 1);

  // Configuración (skip if already exist)
  const existingConfig = await db.select().from(schema.configuracion);
  if (!existingConfig.find((c) => c.clave === 'valor_hora')) {
    await db.insert(schema.configuracion).values([{ clave: 'valor_hora', valor: '15000' }]);
  }
  console.log('Configuración en DB');

  // Recepción (skip if already exist)
  const existingRecepciones = await db.select().from(schema.recepciones);
  if (existingRecepciones.length === 0) {
    await db.insert(schema.recepciones).values([
      {
        vehiculo_id: bcdf12!.id,
        cliente_id: carlosCliente!.id,
        fecha_hora_ingreso: new Date().toISOString(),
        kilometraje: 85200,
        nivel_bencina: '3/4',
        mecanico_id: pedro.id,
        puesto_id: fosa1.id,
        estado: 'en_diagnostico',
        fotos_urls: '[]',
      },
    ]);
    console.log('Recepción creada');
  } else {
    console.log('Recepciones ya existen, omitiendo.');
  }

  // Solo insertar usuarios si no existen
  const existingUsers = sqlite.prepare('SELECT COUNT(*) as count FROM usuarios').get() as { count: number };
  if (existingUsers.count === 0) {
    const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);

    const mecanicosInDb = await db.select().from(schema.mecanicos);
    const pedroInDb = mecanicosInDb.find((m) => m.rut === '15.555.555-5');
    const marioInDb = mecanicosInDb.find((m) => m.rut === '16.666.666-6');

    sqlite.prepare(`INSERT INTO usuarios (nombre, username, password_hash, rol, mecanico_id) VALUES (?, ?, ?, ?, ?)`).run(
      'Jefe de Taller', 'jefe', hash('admin123'), 'jefe', null
    );

    if (pedroInDb) {
      sqlite.prepare(`INSERT INTO usuarios (nombre, username, password_hash, rol, mecanico_id) VALUES (?, ?, ?, ?, ?)`).run(
        'Pedro González', 'pedro', hash('mecanico123'), 'mecanico', pedroInDb.id
      );
    }

    if (marioInDb) {
      sqlite.prepare(`INSERT INTO usuarios (nombre, username, password_hash, rol, mecanico_id) VALUES (?, ?, ?, ?, ?)`).run(
        'Mario Díaz', 'mario', hash('mecanico123'), 'mecanico', marioInDb.id
      );
    }

    console.log('Usuarios creados: jefe/admin123, pedro/mecanico123, mario/mecanico123');
  } else {
    console.log('Usuarios ya existen, omitiendo inserción.');
  }

  console.log('Seed completado exitosamente!');
  sqlite.close();
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
