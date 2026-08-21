-- Inventario: modelos, repuestos, compatibilidad, uso en OTs y facturas

CREATE TABLE `modelos_vehiculo` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `marca` text NOT NULL,
  `modelo` text NOT NULL,
  `anio` integer NOT NULL,
  `motor` text,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE `vehiculos` ADD COLUMN `modelo_id` integer REFERENCES `modelos_vehiculo`(`id`);

CREATE TABLE `repuestos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `sku` text NOT NULL UNIQUE,
  `nombre` text NOT NULL,
  `descripcion` text,
  `precio_costo` real NOT NULL DEFAULT 0,
  `precio_venta` real NOT NULL DEFAULT 0,
  `stock_actual` integer NOT NULL DEFAULT 0,
  `stock_minimo` integer NOT NULL DEFAULT 1,
  `unidad` text NOT NULL DEFAULT 'unidad',
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE `repuesto_modelo` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `repuesto_id` integer NOT NULL REFERENCES `repuestos`(`id`),
  `modelo_id` integer NOT NULL REFERENCES `modelos_vehiculo`(`id`)
);

CREATE TABLE `ot_repuestos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ot_id` integer NOT NULL REFERENCES `ordenes_trabajo`(`id`),
  `repuesto_id` integer NOT NULL REFERENCES `repuestos`(`id`),
  `cantidad` integer NOT NULL,
  `precio_costo_snapshot` real NOT NULL,
  `precio_venta_snapshot` real NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE `facturas_compra` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `numero` text NOT NULL,
  `proveedor_nombre` text NOT NULL,
  `proveedor_rut` text,
  `fecha_emision` text NOT NULL,
  `total_neto` real NOT NULL DEFAULT 0,
  `total_iva` real NOT NULL DEFAULT 0,
  `total` real NOT NULL DEFAULT 0,
  `pdf_url` text,
  `items` text NOT NULL DEFAULT '[]',
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);
