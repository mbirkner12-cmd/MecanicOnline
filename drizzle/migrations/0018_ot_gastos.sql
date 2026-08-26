CREATE TABLE `ot_gastos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ot_id` integer NOT NULL REFERENCES `ordenes_trabajo`(`id`),
  `descripcion` text NOT NULL,
  `monto` real NOT NULL DEFAULT 0,
  `foto_boleta_url` text,
  `cobrar_cliente` integer NOT NULL DEFAULT 0,
  `created_at` text DEFAULT (datetime('now')) NOT NULL
);
