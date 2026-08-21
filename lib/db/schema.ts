import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const clientes = sqliteTable('clientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rut: text('rut').unique(),
  nombre: text('nombre').notNull(),
  telefono: text('telefono'),
  correo: text('correo'),
  direccion: text('direccion'),
  whatsapp: text('whatsapp'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const vehiculos = sqliteTable('vehiculos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patente: text('patente').notNull().unique(),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  anio: integer('anio').notNull(),
  vin: text('vin'),
  kilometraje_actual: integer('kilometraje_actual').notNull(),
  cliente_id: integer('cliente_id').notNull().references(() => clientes.id),
  modelo_id: integer('modelo_id'),
  revision_tecnica_url: text('revision_tecnica_url'),
  revision_tecnica_vencimiento: text('revision_tecnica_vencimiento'),
  permiso_circulacion_url: text('permiso_circulacion_url'),
  permiso_circulacion_vencimiento: text('permiso_circulacion_vencimiento'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const mecanicos = sqliteTable('mecanicos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rut: text('rut').notNull().unique(),
  nombre: text('nombre').notNull(),
  contrato_url: text('contrato_url'),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const puestos = sqliteTable('puestos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const herramientas = sqliteTable('herramientas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  marca: text('marca'),
  cantidad: integer('cantidad').notNull().default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const configuracion = sqliteTable('configuracion', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clave: text('clave').notNull().unique(),
  valor: text('valor').notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const recepciones = sqliteTable('recepciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehiculo_id: integer('vehiculo_id').notNull().references(() => vehiculos.id),
  cliente_id: integer('cliente_id').notNull().references(() => clientes.id),
  fecha_hora_ingreso: text('fecha_hora_ingreso').notNull(),
  kilometraje: integer('kilometraje').notNull(),
  nivel_bencina: text('nivel_bencina'),
  foto_tablero_url: text('foto_tablero_url'),
  fotos_urls: text('fotos_urls').default('[]').notNull(),
  mecanico_id: integer('mecanico_id').references(() => mecanicos.id),
  puesto_id: integer('puesto_id').references(() => puestos.id),
  estado: text('estado', {
    enum: ['en_diagnostico', 'cotizacion_pendiente', 'cotizacion_rechazada', 'con_ot_activa', 'entregado'],
  }).notNull().default('en_diagnostico'),
  diagnostico_mecanico: text('diagnostico_mecanico'),
  motivo_ingreso: text('motivo_ingreso'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  rol: text('rol', { enum: ['jefe', 'mecanico'] }).notNull(),
  mecanico_id: integer('mecanico_id').references(() => mecanicos.id),
  activo: integer('activo', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const cotizaciones = sqliteTable('cotizaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: text('numero').notNull().unique(),
  recepcion_id: integer('recepcion_id').references(() => recepciones.id),
  vehiculo_id: integer('vehiculo_id').notNull().references(() => vehiculos.id),
  cliente_id: integer('cliente_id').notNull().references(() => clientes.id),
  mano_de_obra_detalle: text('mano_de_obra_detalle'),
  mano_de_obra_monto: real('mano_de_obra_monto').default(0).notNull(),
  repuestos: text('repuestos').default('[]').notNull(),
  recomendaciones: text('recomendaciones').default('[]').notNull(),
  retiro_entrega_monto: real('retiro_entrega_monto').default(0).notNull(),
  total: real('total').notNull(),
  estado: text('estado', {
    enum: ['pendiente', 'aceptada', 'rechazada'],
  }).notNull().default('pendiente'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const alertas_vehiculo = sqliteTable('alertas_vehiculo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vehiculo_id: integer('vehiculo_id').notNull().references(() => vehiculos.id),
  tipo: text('tipo', {
    enum: ['revision_tecnica', 'permiso_circulacion', 'neumaticos', 'aceite_filtros', 'otro'],
  }).notNull().default('otro'),
  descripcion: text('descripcion'),
  fecha_vencimiento: text('fecha_vencimiento'),
  dias_anticipacion: integer('dias_anticipacion').notNull().default(30),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  ultimo_envio: text('ultimo_envio'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const ordenes_trabajo = sqliteTable('ordenes_trabajo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: text('numero').notNull().unique(),
  cotizacion_id: integer('cotizacion_id').notNull().references(() => cotizaciones.id),
  recepcion_id: integer('recepcion_id').references(() => recepciones.id),
  vehiculo_id: integer('vehiculo_id').notNull().references(() => vehiculos.id),
  cliente_id: integer('cliente_id').notNull().references(() => clientes.id),
  mecanico_id: integer('mecanico_id').references(() => mecanicos.id),
  puesto_id: integer('puesto_id').references(() => puestos.id),
  insumos: text('insumos').default('[]').notNull(),
  diagnostico: text('diagnostico'),
  fecha_estimada_inicio: text('fecha_estimada_inicio'),
  fecha_estimada_fin: text('fecha_estimada_fin'),
  fecha_hora_inicio: text('fecha_hora_inicio'),
  fecha_hora_fin: text('fecha_hora_fin'),
  horas_trabajadas: real('horas_trabajadas'),
  costo_mo_override: real('costo_mo_override'),
  tareas_completadas: text('tareas_completadas').default('[]').notNull(),
  observaciones: text('observaciones').default('[]').notNull(),
  estado: text('estado', {
    enum: ['creada', 'en_reparacion', 'listo_para_entregar', 'entregado'],
  }).notNull().default('creada'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const modelos_vehiculo = sqliteTable('modelos_vehiculo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  anio: integer('anio').notNull(),
  motor: text('motor'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const repuestos = sqliteTable('repuestos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sku: text('sku').notNull().unique(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  precio_costo: real('precio_costo').notNull().default(0),
  precio_venta: real('precio_venta').notNull().default(0),
  stock_actual: integer('stock_actual').notNull().default(0),
  stock_minimo: integer('stock_minimo').notNull().default(1),
  unidad: text('unidad').notNull().default('unidad'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updated_at: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const repuesto_modelo = sqliteTable('repuesto_modelo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  repuesto_id: integer('repuesto_id').notNull().references(() => repuestos.id),
  modelo_id: integer('modelo_id').notNull().references(() => modelos_vehiculo.id),
});

export const ot_repuestos = sqliteTable('ot_repuestos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ot_id: integer('ot_id').notNull().references(() => ordenes_trabajo.id),
  repuesto_id: integer('repuesto_id').notNull().references(() => repuestos.id),
  cantidad: integer('cantidad').notNull(),
  precio_costo_snapshot: real('precio_costo_snapshot').notNull(),
  precio_venta_snapshot: real('precio_venta_snapshot').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const facturas_compra = sqliteTable('facturas_compra', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: text('numero').notNull(),
  proveedor_nombre: text('proveedor_nombre').notNull(),
  proveedor_rut: text('proveedor_rut'),
  fecha_emision: text('fecha_emision').notNull(),
  total_neto: real('total_neto').notNull().default(0),
  total_iva: real('total_iva').notNull().default(0),
  total: real('total').notNull().default(0),
  pdf_url: text('pdf_url'),
  items: text('items').notNull().default('[]'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const eventos_calendario = sqliteTable('eventos_calendario', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(), // 'YYYY-MM-DD'
  titulo: text('titulo').notNull(),
  tipo: text('tipo', {
    enum: ['entrada_vehiculo', 'retiro_vehiculo', 'entrega_vehiculo', 'cotizacion', 'otro'],
  }).notNull().default('otro'),
  descripcion: text('descripcion'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});
