import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const USERNAME = 'admin';
const PASSWORD = 'mecanico2024';
const NOMBRE = 'Administrador';

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const hash = await bcrypt.hash(PASSWORD, 10);

  await client.execute({
    sql: `INSERT INTO usuarios (nombre, username, password_hash, rol, activo)
          VALUES (?, ?, ?, 'jefe', 1)`,
    args: [NOMBRE, USERNAME, hash],
  });

  console.log(`Usuario creado: ${USERNAME} / ${PASSWORD}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
