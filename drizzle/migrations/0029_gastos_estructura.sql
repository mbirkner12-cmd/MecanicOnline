CREATE TABLE IF NOT EXISTS `gastos_estructura` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `nombre` text NOT NULL,
  `monto_mensual` real NOT NULL DEFAULT 0,
  `tipo` text NOT NULL DEFAULT 'fijo',
  `activo` integer NOT NULL DEFAULT 1,
  `created_at` text DEFAULT (datetime('now')) NOT NULL
);
