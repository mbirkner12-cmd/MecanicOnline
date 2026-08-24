ALTER TABLE `ordenes_trabajo` ADD COLUMN `metodo_pago` text;
ALTER TABLE `ordenes_trabajo` ADD COLUMN `pagado` integer DEFAULT 0 NOT NULL;
