CREATE TABLE `eventos_calendario` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `fecha` text NOT NULL,
  `titulo` text NOT NULL,
  `tipo` text NOT NULL DEFAULT 'otro',
  `descripcion` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX `idx_eventos_fecha` ON `eventos_calendario` (`fecha`);
