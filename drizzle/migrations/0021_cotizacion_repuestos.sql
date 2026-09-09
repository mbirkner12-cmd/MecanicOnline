CREATE TABLE `cotizacion_repuestos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cotizacion_id` integer NOT NULL REFERENCES `cotizaciones`(`id`),
	`repuesto_id` integer NOT NULL REFERENCES `repuestos`(`id`),
	`cantidad` integer NOT NULL,
	`precio_venta_snapshot` real NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
