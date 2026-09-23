CREATE TABLE `ot_checklist` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ot_id` integer NOT NULL REFERENCES `ordenes_trabajo`(`id`),
  `item_key` text NOT NULL,
  `checked` integer NOT NULL DEFAULT 0,
  `foto_url` text,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  UNIQUE(`ot_id`, `item_key`)
);
