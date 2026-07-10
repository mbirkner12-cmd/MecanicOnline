import { config } from 'dotenv';
// Carga .env.production.local si existe (credenciales de producción), sino .env.local
const envFile = process.argv.includes('--production') ? '.env.production.local' : '.env.local';
config({ path: envFile });

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

  console.log('\n¡Migraciones completadas!');
  await client.close();
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
