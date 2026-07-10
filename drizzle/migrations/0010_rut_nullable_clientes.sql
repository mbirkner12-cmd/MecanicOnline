-- Make rut nullable in clientes (SQLite requires table recreation)
PRAGMA foreign_keys=OFF;

CREATE TABLE `clientes_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `rut` text,
  `nombre` text NOT NULL,
  `telefono` text,
  `correo` text,
  `direccion` text,
  `whatsapp` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO `clientes_new` SELECT * FROM `clientes`;

DROP TABLE `clientes`;

ALTER TABLE `clientes_new` RENAME TO `clientes`;

CREATE UNIQUE INDEX `clientes_rut_unique` ON `clientes` (`rut`) WHERE `rut` IS NOT NULL;

PRAGMA foreign_keys=ON;
