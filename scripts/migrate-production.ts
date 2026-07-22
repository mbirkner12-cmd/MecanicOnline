import { config } from 'dotenv';
// Carga credenciales de producción desde .env.turso (archivo local, no subido a git)
config({ path: '.env.turso' });

import { createClient } from '@libsql/client';

const migrations = [
  {
    name: '0010_rut_nullable_clientes',
    statements: [
      `PRAGMA foreign_keys=OFF`,
      `CREATE TABLE IF NOT EXISTS \`clientes_new\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`rut\` text,
        \`nombre\` text NOT NULL,
        \`telefono\` text,
        \`correo\` text,
        \`direccion\` text,
        \`whatsapp\` text,
        \`created_at\` text NOT NULL DEFAULT (datetime('now'))
      )`,
      `INSERT OR IGNORE INTO \`clientes_new\` SELECT * FROM \`clientes\``,
      `DROP TABLE IF EXISTS \`clientes_new\``,
    ],
    full: true,
  },
  {
    name: '0010_rut_nullable_clientes (full recreate)',
    full: true,
    statements: [],
    sql: `
PRAGMA foreign_keys=OFF;
CREATE TABLE \`clientes_new\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`rut\` text,
  \`nombre\` text NOT NULL,
  \`telefono\` text,
  \`correo\` text,
  \`direccion\` text,
  \`whatsapp\` text,
  \`created_at\` text NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO \`clientes_new\` SELECT \`id\`, \`rut\`, \`nombre\`, \`telefono\`, \`correo\`, \`direccion\`, \`whatsapp\`, \`created_at\` FROM \`clientes\`;
DROP TABLE \`clientes\`;
ALTER TABLE \`clientes_new\` RENAME TO \`clientes\`;
CREATE UNIQUE INDEX IF NOT EXISTS \`clientes_rut_unique\` ON \`clientes\` (\`rut\`) WHERE \`rut\` IS NOT NULL;
PRAGMA foreign_keys=ON;
`,
  },
  {
    name: '0011_vin_vehiculos',
    sql: `ALTER TABLE \`vehiculos\` ADD COLUMN \`vin\` text;`,
  },
  {
    name: '0012_calendario',
    sql: `
CREATE TABLE IF NOT EXISTS \`eventos_calendario\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`fecha\` text NOT NULL,
  \`titulo\` text NOT NULL,
  \`tipo\` text NOT NULL DEFAULT 'otro',
  \`descripcion\` text,
  \`created_at\` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS \`idx_eventos_fecha\` ON \`eventos_calendario\` (\`fecha\`);
`,
  },
];

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('Conectando a Turso:', process.env.TURSO_DATABASE_URL);

  // Check existing columns in vehiculos
  const vehiculosInfo = await client.execute(`PRAGMA table_info(vehiculos)`);
  const vehiculosColumns = vehiculosInfo.rows.map((r) => r[1] as string);
  const hasVin = vehiculosColumns.includes('vin');
  console.log('Columnas vehiculos:', vehiculosColumns.join(', '));
  console.log('¿Tiene vin?', hasVin);

  // Check clientes rut unique index
  const clientesInfo = await client.execute(`PRAGMA table_info(clientes)`);
  const clientesColumns = clientesInfo.rows.map((r) => ({
    name: r[1] as string,
    notnull: r[3] as number,
  }));
  const rutCol = clientesColumns.find((c) => c.name === 'rut');
  const rutIsNotNull = rutCol?.notnull === 1;
  console.log('¿RUT not null en clientes?', rutIsNotNull);

  // Check if eventos_calendario exists
  const tables = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='eventos_calendario'`
  );
  const hasCalendario = tables.rows.length > 0;
  console.log('¿Tiene eventos_calendario?', hasCalendario);

  // Check if ordenes_trabajo.recepcion_id is nullable
  const otInfo = await client.execute(`PRAGMA table_info(ordenes_trabajo)`);
  const recepcionIdCol = otInfo.rows.find((r) => r[1] === 'recepcion_id');
  const otRecepcionNotNull = recepcionIdCol ? (recepcionIdCol[3] as number) === 1 : false;
  console.log('¿OT recepcion_id NOT NULL?', otRecepcionNotNull);

  // --- Migration 0010: make rut nullable ---
  if (rutIsNotNull) {
    console.log('\nAplicando 0010: rut nullable en clientes...');
    await client.execute(`PRAGMA foreign_keys=OFF`);
    await client.execute(`
      CREATE TABLE \`clientes_new\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`rut\` text,
        \`nombre\` text NOT NULL,
        \`telefono\` text,
        \`correo\` text,
        \`direccion\` text,
        \`whatsapp\` text,
        \`created_at\` text NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await client.execute(`INSERT INTO \`clientes_new\` SELECT \`id\`, \`rut\`, \`nombre\`, \`telefono\`, \`correo\`, \`direccion\`, \`whatsapp\`, \`created_at\` FROM \`clientes\``);
    await client.execute(`DROP TABLE \`clientes\``);
    await client.execute(`ALTER TABLE \`clientes_new\` RENAME TO \`clientes\``);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS \`clientes_rut_unique\` ON \`clientes\` (\`rut\`) WHERE \`rut\` IS NOT NULL`);
    await client.execute(`PRAGMA foreign_keys=ON`);
    console.log('✓ 0010 aplicado');
  } else {
    console.log('✓ 0010 ya aplicado (rut ya es nullable)');
  }

  // --- Migration 0011: add vin to vehiculos ---
  if (!hasVin) {
    console.log('\nAplicando 0011: columna vin en vehiculos...');
    await client.execute(`ALTER TABLE \`vehiculos\` ADD COLUMN \`vin\` text`);
    console.log('✓ 0011 aplicado');
  } else {
    console.log('✓ 0011 ya aplicado (vin ya existe)');
  }

  // --- Migration 0012: eventos_calendario ---
  if (!hasCalendario) {
    console.log('\nAplicando 0012: tabla eventos_calendario...');
    await client.execute(`
      CREATE TABLE \`eventos_calendario\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`fecha\` text NOT NULL,
        \`titulo\` text NOT NULL,
        \`tipo\` text NOT NULL DEFAULT 'otro',
        \`descripcion\` text,
        \`created_at\` text NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await client.execute(`CREATE INDEX IF NOT EXISTS \`idx_eventos_fecha\` ON \`eventos_calendario\` (\`fecha\`)`);
    console.log('✓ 0012 aplicado');
  } else {
    console.log('✓ 0012 ya aplicado (eventos_calendario ya existe)');
  }

  // --- Migration 0013: make recepcion_id nullable in ordenes_trabajo ---
  if (otRecepcionNotNull) {
    console.log('\nAplicando 0013: recepcion_id nullable en ordenes_trabajo...');
    await client.execute(`PRAGMA foreign_keys=OFF`);
    await client.execute(`
      CREATE TABLE \`ordenes_trabajo_new\` (
        \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        \`numero\` text NOT NULL,
        \`cotizacion_id\` integer NOT NULL REFERENCES \`cotizaciones\`(\`id\`),
        \`recepcion_id\` integer REFERENCES \`recepciones\`(\`id\`),
        \`vehiculo_id\` integer NOT NULL REFERENCES \`vehiculos\`(\`id\`),
        \`cliente_id\` integer NOT NULL REFERENCES \`clientes\`(\`id\`),
        \`mecanico_id\` integer REFERENCES \`mecanicos\`(\`id\`),
        \`puesto_id\` integer REFERENCES \`puestos\`(\`id\`),
        \`insumos\` text NOT NULL DEFAULT '[]',
        \`diagnostico\` text,
        \`fecha_estimada_inicio\` text,
        \`fecha_estimada_fin\` text,
        \`fecha_hora_inicio\` text,
        \`fecha_hora_fin\` text,
        \`tareas_completadas\` text NOT NULL DEFAULT '[]',
        \`estado\` text NOT NULL DEFAULT 'creada',
        \`created_at\` text NOT NULL DEFAULT (datetime('now')),
        \`updated_at\` text NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await client.execute(`INSERT INTO \`ordenes_trabajo_new\` SELECT * FROM \`ordenes_trabajo\``);
    await client.execute(`DROP TABLE \`ordenes_trabajo\``);
    await client.execute(`ALTER TABLE \`ordenes_trabajo_new\` RENAME TO \`ordenes_trabajo\``);
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS \`ordenes_trabajo_numero_unique\` ON \`ordenes_trabajo\` (\`numero\`)`);
    await client.execute(`PRAGMA foreign_keys=ON`);
    console.log('✓ 0013 aplicado');
  } else {
    console.log('✓ 0013 ya aplicado (recepcion_id ya es nullable)');
  }

  // --- Migration 0014: add observaciones to ordenes_trabajo ---
  const hasObservaciones = otInfo.rows.some((r) => r[1] === 'observaciones');
  console.log('¿Tiene observaciones en OT?', hasObservaciones);
  if (!hasObservaciones) {
    console.log('\nAplicando 0014: columna observaciones en ordenes_trabajo...');
    await client.execute(`ALTER TABLE \`ordenes_trabajo\` ADD COLUMN \`observaciones\` text NOT NULL DEFAULT '[]'`);
    console.log('✓ 0014 aplicado');
  } else {
    console.log('✓ 0014 ya aplicado (observaciones ya existe)');
  }

  console.log('\n¡Migraciones completadas!');
  await client.close();
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
