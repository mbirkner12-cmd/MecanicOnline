CREATE TABLE `alertas_vehiculo` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `vehiculo_id` integer NOT NULL REFERENCES `vehiculos`(`id`),
  `tipo` text NOT NULL DEFAULT 'otro',
  `descripcion` text,
  `fecha_vencimiento` text,
  `dias_anticipacion` integer NOT NULL DEFAULT 30,
  `activo` integer NOT NULL DEFAULT 1,
  `ultimo_envio` text,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);
