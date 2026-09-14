'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DollarSign, CheckCircle2, Clock, Filter, FileText, AlertTriangle, Eye, X, Package, Wrench, Loader2, ClipboardList } from 'lucide-react';
import { EstadoBadgeOT, type EstadoOT } from '@/components/ordenes-trabajo/EstadoBadgeOT';

interface CobroRow {
  id: number;
  numero: string;
  estado: EstadoOT;
  metodo_pago: string | null;
  pagado: boolean;
  boleta_creada: boolean;
  tipo_documento: 'boleta' | 'factura';
  fecha_hora_fin: string | null;
  updated_at: string;
  vehiculo: { patente: string; marca: string; modelo: string; anio: number } | null;
  cliente: { nombre: string; telefono: string | null } | null;
  cotizacion: { total: number; mano_de_obra_monto: number; retiro_entrega_monto: number } | null;
}

interface OTDetalle {
  id: number;
  numero: string;
  diagnostico: string | null;
  costo_mo_detalle: string | null;
  insumos: string;
  cliente: { nombre: string; rut: string | null } | null;
  cotizacion: {
    total: number;
    mano_de_obra_monto: number;
    mano_de_obra_detalle: string | null;
    repuestos: string;
    retiro_entrega_monto: number;
  } | null;
}

interface OTRepuestoItem {
  id: number;
  nombre: string;
  sku: string;
  cantidad: number;
  unidad: string;
  precio_venta_snapshot: number;
}

interface RepuestoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
  valor_unitario: number;
  monto_total: number;
}

interface MOItem {
  detalle: string;
  monto: number;
}

interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
}

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
}

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  try { return JSON.parse(raw ?? '') as T; } catch { return fallback; }
}

// ── Modal de detalle ──────────────────────────────────────────────────────────
function DetalleModal({ otId, onClose }: { otId: number; onClose: () => void }) {
  const [ot, setOT] = useState<OTDetalle | null>(null);
  const [repuestos, setRepuestos] = useState<OTRepuestoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/ordenes-trabajo/${otId}`).then(r => r.json()),
      fetch(`/api/ot-repuestos?ot_id=${otId}`).then(r => r.json()),
    ]).then(([otData, repsData]: [OTDetalle, OTRepuestoItem[]]) => {
      setOT(otData);
      setRepuestos(repsData);
    }).finally(() => setLoading(false));
  }, [otId]);

  const moItems = parseJSON<MOItem[]>(ot?.cotizacion?.mano_de_obra_detalle, []);
  const repCot = parseJSON<RepuestoItem[]>(ot?.cotizacion?.repuestos, []);
  const insumos = parseJSON<InsumoItem[]>(ot?.insumos, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel lateral */}
      <div className="relative z-10 bg-white h-full w-full max-w-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">Detalle del trabajo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : !ot ? (
            <p className="text-sm text-zinc-400 text-center py-12">No se pudo cargar el detalle.</p>
          ) : (
            <>
              {/* Cliente */}
              {ot.cliente && (
                <section className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Cliente</p>
                    <p className="text-sm font-semibold text-zinc-900">{ot.cliente.nombre}</p>
                  </div>
                  {ot.cliente.rut && (
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 mb-0.5">RUT</p>
                      <p className="text-sm font-mono text-zinc-700">{ot.cliente.rut}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Diagnóstico */}
              {ot.diagnostico && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Diagnóstico</h3>
                  </div>
                  <p className="text-sm text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">{ot.diagnostico}</p>
                </section>
              )}

              {/* Mano de obra */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Mano de obra</h3>
                </div>
                {moItems.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic">Sin detalle de mano de obra.</p>
                ) : (
                  <div className="rounded-lg border border-zinc-200 overflow-hidden">
                    {moItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 border-b border-zinc-100 last:border-0 text-sm">
                        <span className="text-zinc-700">{item.detalle}</span>
                        <span className="font-medium text-zinc-900 flex-shrink-0 ml-4">{formatCLP(item.monto)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 bg-zinc-50 text-xs font-semibold text-zinc-500 border-t border-zinc-200">
                      <span>Subtotal MO</span>
                      <span className="text-zinc-900">{formatCLP(ot.cotizacion?.mano_de_obra_monto ?? 0)}</span>
                    </div>
                  </div>
                )}
                {ot.costo_mo_detalle && (
                  <p className="text-xs text-zinc-500 italic mt-1.5 px-1">&quot;{ot.costo_mo_detalle}&quot;</p>
                )}
              </section>

              {/* Repuestos de la cotización */}
              {repCot.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Repuestos cotizados</h3>
                  </div>
                  <div className="rounded-lg border border-zinc-200 overflow-hidden">
                    {repCot.map((r, i) => (
                      <div key={i} className="flex justify-between items-start px-3 py-2 border-b border-zinc-100 last:border-0 text-sm gap-3">
                        <div className="min-w-0">
                          <p className="text-zinc-700">{r.detalle}</p>
                          <p className="text-xs text-zinc-400">{r.cantidad} {r.unidad} × {formatCLP(r.valor_unitario)}</p>
                        </div>
                        <span className="font-medium text-zinc-900 flex-shrink-0">{formatCLP(r.monto_total)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Repuestos del inventario */}
              {repuestos.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Repuestos del inventario</h3>
                  </div>
                  <div className="rounded-lg border border-zinc-200 overflow-hidden">
                    {repuestos.map((r) => (
                      <div key={r.id} className="flex justify-between items-start px-3 py-2 border-b border-zinc-100 last:border-0 text-sm gap-3">
                        <div className="min-w-0">
                          <p className="text-zinc-700">{r.nombre}</p>
                          <p className="text-xs text-zinc-400">{r.sku} · {r.cantidad} {r.unidad}</p>
                        </div>
                        <span className="font-medium text-zinc-900 flex-shrink-0">{formatCLP(r.cantidad * r.precio_venta_snapshot)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Insumos */}
              {insumos.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Insumos utilizados</h3>
                  </div>
                  <div className="rounded-lg border border-zinc-200 overflow-hidden">
                    {insumos.map((ins, i) => (
                      <div key={i} className="flex justify-between items-center px-3 py-2 border-b border-zinc-100 last:border-0 text-sm">
                        <span className="text-zinc-700">{ins.detalle}</span>
                        <span className="text-zinc-500 flex-shrink-0 ml-4">{ins.cantidad} {ins.unidad}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Total */}
              {ot.cotizacion && (
                <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-1.5">
                  {ot.cotizacion.retiro_entrega_monto > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Retiro y entrega</span>
                      <span className="text-zinc-700">{formatCLP(ot.cotizacion.retiro_entrega_monto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-zinc-700">Total neto</span>
                    <span className="text-zinc-900">{formatCLP(ot.cotizacion.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>IVA 19%</span>
                    <span>{formatCLP(Math.round(ot.cotizacion.total * 0.19))}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold">
                    <span className="text-zinc-900">Total con IVA</span>
                    <span className="text-zinc-900 text-base">{formatCLP(Math.round(ot.cotizacion.total * 1.19))}</span>
                  </div>
                </section>
              )}

              <div className="pt-1">
                <Link
                  href={`/ordenes-trabajo/${otId}`}
                  className="text-xs text-blue-600 hover:underline"
                  onClick={onClose}
                >
                  Ver OT completa →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function CobrosPage() {
  const [cobros, setCobros] = useState<CobroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'pagado'>('todos');
  const [actualizando, setActualizando] = useState<number | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const fetchCobros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cobros');
      if (res.ok) setCobros(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCobros(); }, [fetchCobros]);

  async function actualizarPago(id: number, campos: { pagado?: boolean; metodo_pago?: string | null; boleta_creada?: boolean; tipo_documento?: 'boleta' | 'factura' }) {
    setActualizando(id);
    try {
      await fetch(`/api/ordenes-trabajo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      });
      setCobros(prev => prev.map(c => c.id === id ? { ...c, ...campos } : c));
    } finally {
      setActualizando(null);
    }
  }

  const filtrados = cobros.filter(c => {
    if (filtro === 'pendiente') return !c.pagado;
    if (filtro === 'pagado') return c.pagado;
    return true;
  });

  const totalPendiente = cobros.filter(c => !c.pagado).reduce((s, c) => s + (c.cotizacion?.total ?? 0) * 1.19, 0);
  const totalCobrado = cobros.filter(c => c.pagado).reduce((s, c) => s + (c.cotizacion?.total ?? 0) * 1.19, 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cobros</h1>
          <p className="text-zinc-500 text-sm mt-0.5">OTs listas para entregar y entregadas</p>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Pendiente de cobro</p>
              <p className="text-lg font-bold text-zinc-900">{formatCLP(totalPendiente)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Cobrado (historial)</p>
              <p className="text-lg font-bold text-zinc-900">{formatCLP(totalCobrado)}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          {(['todos', 'pendiente', 'pagado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
            >
              {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Pagados'}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">N° OT</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Cliente / Vehículo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden md:table-cell">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500">Total (c/IVA)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden lg:table-cell">Método</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 hidden lg:table-cell">Documento</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Pagado</th>
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-zinc-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-zinc-400 text-sm">
                    No hay órdenes en este estado.
                  </td>
                </tr>
              ) : (
                filtrados.map(c => {
                  const necesitaBoleta = c.metodo_pago === 'transferencia' && c.tipo_documento === 'boleta' && !c.boleta_creada;
                  return (
                    <tr key={c.id} className={`border-b border-zinc-100 last:border-0 transition-colors ${c.pagado ? 'bg-green-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <Link href={`/ordenes-trabajo/${c.id}`} className="font-mono font-semibold text-zinc-900 hover:text-blue-600 hover:underline">
                          {c.numero}
                        </Link>
                        <p className="text-xs text-zinc-400 mt-0.5">{formatFecha(c.fecha_hora_fin ?? c.updated_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{c.cliente?.nombre ?? '—'}</p>
                        <p className="text-xs text-zinc-400">
                          {c.vehiculo ? `${c.vehiculo.patente} · ${c.vehiculo.marca} ${c.vehiculo.modelo} ${c.vehiculo.anio}` : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <EstadoBadgeOT estado={c.estado} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-900">
                        {formatCLP((c.cotizacion?.total ?? 0) * 1.19)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <select
                          value={c.metodo_pago ?? ''}
                          disabled={actualizando === c.id}
                          onChange={e => actualizarPago(c.id, { metodo_pago: e.target.value || null })}
                          className="border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 w-36"
                        >
                          <option value="">Sin especificar</option>
                          {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </td>
                      {/* Documento — boleta o factura + estado creada/pendiente */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex rounded-lg overflow-hidden border border-zinc-200 text-xs">
                            {(['boleta', 'factura'] as const).map(tipo => (
                              <button
                                key={tipo}
                                disabled={actualizando === c.id}
                                onClick={() => actualizarPago(c.id, { tipo_documento: tipo })}
                                className={`px-2.5 py-1 font-medium transition-colors disabled:opacity-50 capitalize ${
                                  c.tipo_documento === tipo
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-white text-zinc-500 hover:bg-zinc-50'
                                }`}
                              >
                                {tipo}
                              </button>
                            ))}
                          </div>
                          {c.metodo_pago === 'transferencia' && c.tipo_documento === 'boleta' && (
                            <button
                              disabled={actualizando === c.id}
                              onClick={() => actualizarPago(c.id, { boleta_creada: !c.boleta_creada })}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                                c.boleta_creada
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                              title={c.boleta_creada ? 'Marcar boleta como pendiente' : 'Marcar boleta como creada'}
                            >
                              {c.boleta_creada
                                ? <><FileText className="h-3.5 w-3.5" /> Creada</>
                                : <><AlertTriangle className="h-3.5 w-3.5" /> Pendiente</>
                              }
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <button
                            disabled={actualizando === c.id}
                            onClick={() => actualizarPago(c.id, { pagado: !c.pagado })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                              c.pagado
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                            }`}
                            title={c.pagado ? 'Marcar como no pagado' : 'Marcar como pagado'}
                          >
                            {c.pagado
                              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Pagado</>
                              : <><DollarSign className="h-3.5 w-3.5" /> Pendiente</>
                            }
                          </button>
                          {necesitaBoleta && (
                            <button
                              disabled={actualizando === c.id}
                              onClick={() => actualizarPago(c.id, { boleta_creada: true })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50 lg:hidden"
                              title={`${c.tipo_documento === 'factura' ? 'Factura' : 'Boleta'} pendiente — clic para marcar como creada`}
                            >
                              <AlertTriangle className="h-3 w-3" /> {c.tipo_documento === 'factura' ? 'Factura' : 'Boleta'}
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Botón ver detalle */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => setDetalleId(c.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                          title="Ver detalle del trabajo"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de detalle */}
      {detalleId !== null && (
        <DetalleModal otId={detalleId} onClose={() => setDetalleId(null)} />
      )}
    </>
  );
}
