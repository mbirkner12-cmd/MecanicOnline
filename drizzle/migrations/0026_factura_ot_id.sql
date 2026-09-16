ALTER TABLE `facturas_compra` ADD COLUMN `ot_id` integer REFERENCES `ordenes_trabajo`(`id`);
