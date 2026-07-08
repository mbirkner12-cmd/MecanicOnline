CREATE TABLE `clientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rut` text NOT NULL,
	`nombre` text NOT NULL,
	`telefono` text,
	`correo` text,
	`direccion` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_rut_unique` ON `clientes` (`rut`);--> statement-breakpoint
CREATE TABLE `configuracion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clave` text NOT NULL,
	`valor` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `configuracion_clave_unique` ON `configuracion` (`clave`);--> statement-breakpoint
CREATE TABLE `cotizaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero` text NOT NULL,
	`recepcion_id` integer NOT NULL,
	`vehiculo_id` integer NOT NULL,
	`cliente_id` integer NOT NULL,
	`mano_de_obra_detalle` text,
	`mano_de_obra_monto` real DEFAULT 0 NOT NULL,
	`repuestos` text DEFAULT '[]' NOT NULL,
	`retiro_entrega_monto` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cotizaciones_numero_unique` ON `cotizaciones` (`numero`);--> statement-breakpoint
CREATE TABLE `herramientas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`marca` text,
	`cantidad` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mecanicos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rut` text NOT NULL,
	`nombre` text NOT NULL,
	`contrato_url` text,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mecanicos_rut_unique` ON `mecanicos` (`rut`);--> statement-breakpoint
CREATE TABLE `ordenes_trabajo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero` text NOT NULL,
	`cotizacion_id` integer NOT NULL,
	`recepcion_id` integer NOT NULL,
	`vehiculo_id` integer NOT NULL,
	`cliente_id` integer NOT NULL,
	`mecanico_id` integer,
	`diagnostico` text,
	`fecha_hora_inicio` text,
	`fecha_hora_fin` text,
	`estado` text DEFAULT 'creada' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recepcion_id`) REFERENCES `recepciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mecanico_id`) REFERENCES `mecanicos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ordenes_trabajo_numero_unique` ON `ordenes_trabajo` (`numero`);--> statement-breakpoint
CREATE TABLE `puestos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recepciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehiculo_id` integer NOT NULL,
	`cliente_id` integer NOT NULL,
	`fecha_hora_ingreso` text NOT NULL,
	`kilometraje` integer NOT NULL,
	`nivel_bencina` text,
	`foto_tablero_url` text,
	`fotos_urls` text DEFAULT '[]' NOT NULL,
	`mecanico_id` integer,
	`puesto_id` integer,
	`estado` text DEFAULT 'en_diagnostico' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mecanico_id`) REFERENCES `mecanicos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`puesto_id`) REFERENCES `puestos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehiculos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patente` text NOT NULL,
	`marca` text NOT NULL,
	`modelo` text NOT NULL,
	`anio` integer NOT NULL,
	`kilometraje_actual` integer NOT NULL,
	`cliente_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehiculos_patente_unique` ON `vehiculos` (`patente`);