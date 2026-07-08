ALTER TABLE `ordenes_trabajo` ADD `puesto_id` integer REFERENCES puestos(id);--> statement-breakpoint
ALTER TABLE `ordenes_trabajo` ADD `insumos` text DEFAULT '[]' NOT NULL;