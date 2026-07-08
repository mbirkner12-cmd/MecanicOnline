CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text NOT NULL,
	`mecanico_id` integer,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`mecanico_id`) REFERENCES `mecanicos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_username_unique` ON `usuarios` (`username`);--> statement-breakpoint
ALTER TABLE `recepciones` ADD `diagnostico_mecanico` text;