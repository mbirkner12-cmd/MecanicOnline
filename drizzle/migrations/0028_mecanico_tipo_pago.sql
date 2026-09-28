ALTER TABLE `mecanicos` ADD COLUMN `tipo_pago` text NOT NULL DEFAULT 'contrato';
ALTER TABLE `mecanicos` ADD COLUMN `factor_boleta` real NOT NULL DEFAULT 0;
