-- Make recepcion_id nullable in ordenes_trabajo (SQLite requires table recreation)
PRAGMA foreign_keys=OFF;

CREATE TABLE `ordenes_trabajo_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `numero` text NOT NULL,
  `cotizacion_id` integer NOT NULL REFERENCES `cotizaciones`(`id`),
  `recepcion_id` integer REFERENCES `recepciones`(`id`),
  `vehiculo_id` integer NOT NULL REFERENCES `vehiculos`(`id`),
  `cliente_id` integer NOT NULL REFERENCES `clientes`(`id`),
  `mecanico_id` integer REFERENCES `mecanicos`(`id`),
  `puesto_id` integer REFERENCES `puestos`(`id`),
  `insumos` text NOT NULL DEFAULT '[]',
  `diagnostico` text,
  `fecha_estimada_inicio` text,
  `fecha_estimada_fin` text,
  `fecha_hora_inicio` text,
  `fecha_hora_fin` text,
  `tareas_completadas` text NOT NULL DEFAULT '[]',
  `estado` text NOT NULL DEFAULT 'creada',
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO `ordenes_trabajo_new` SELECT * FROM `ordenes_trabajo`;

DROP TABLE `ordenes_trabajo`;

ALTER TABLE `ordenes_trabajo_new` RENAME TO `ordenes_trabajo`;

CREATE UNIQUE INDEX `ordenes_trabajo_numero_unique` ON `ordenes_trabajo` (`numero`);

PRAGMA foreign_keys=ON;
