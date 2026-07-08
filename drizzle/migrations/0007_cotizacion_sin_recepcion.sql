PRAGMA foreign_keys=OFF;
CREATE TABLE cotizaciones_new (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  numero text NOT NULL UNIQUE,
  recepcion_id integer REFERENCES recepciones(id),
  vehiculo_id integer NOT NULL REFERENCES vehiculos(id),
  cliente_id integer NOT NULL REFERENCES clientes(id),
  mano_de_obra_detalle text,
  mano_de_obra_monto real NOT NULL DEFAULT 0,
  repuestos text NOT NULL DEFAULT '[]',
  recomendaciones text NOT NULL DEFAULT '[]',
  retiro_entrega_monto real NOT NULL DEFAULT 0,
  total real NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  created_at text NOT NULL DEFAULT (datetime('now')),
  updated_at text NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO cotizaciones_new SELECT * FROM cotizaciones;
DROP TABLE cotizaciones;
ALTER TABLE cotizaciones_new RENAME TO cotizaciones;
PRAGMA foreign_keys=ON;
