"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, Clock, Package, Wrench, DollarSign, Pencil, Check, X, Upload, Trash2 } from "lucide-react";
import { SubirFacturaOT } from "./SubirFacturaOT";

interface OTRepuesto {
  id: number;
  cantidad: number;
  precio_costo_snapshot: number;
  precio_venta_snapshot: number;
  nombre: string;
  sku: string;
  unidad: string;
}

interface FacturaItemLine {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  match_key: string | null;
}

interface FacturaItem {
  id: number;
  numero: string;
  proveedor_nombre: string;
  total: number;
  pdf_url: string | null;
  items: string; // JSON string
}

interface Props {
  otId: number;
  cotizacion: {
    total: number;
    mano_de_obra_monto: number;
    repuestos: string;
    retiro_entrega_monto: number;
  } | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasTrabajadas: number | null;
  costoMoOverride: number | null;
  costoMoDetalle?: string | null;
  costoTotalOverride?: number | null;
  costoRepuestosCot?: string | null;
  costoRepuestosOverride?: number | null;
}

function formatCLP(n: number) {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function horasCalculadas(inicio: string, fin: string | null): number {
  if (!fin) return 0;
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.max(0, ms / 1000 / 3600);
}

function formatHoras(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (hh === 0) return `${mm} min`;
  if (mm === 0) return `${hh}h`;
  return `${hh}h ${mm}min`;
}

export function ResumenCostosOT({ otId, cotizacion, fechaInicio, fechaFin, horasTrabajadas, costoMoOverride, costoMoDetalle, costoTotalOverride, costoRepuestosCot, costoRepuestosOverride }: Props) {
  const [repuestos, setRepuestos] = useState<OTRepuesto[]>([]);
  const [facturas, setFacturas] = useState<FacturaItem[]>([]);
  const [valorHora, setValorHora] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edición inline de costo de repuesto de inventario (ot_repuestos)
  const [editandoRepuesto, setEditandoRepuesto] = useState<number | null>(null); // id de ot_repuesto
  const [repuestoInput, setRepuestoInput] = useState('');
  const [savingRepuesto, setSavingRepuesto] = useState(false);

  // Edición inline de costo de repuesto de cotización
  const [costosCot, setCostosCot] = useState<(number | null)[]>(() => {
    try { return JSON.parse(costoRepuestosCot ?? 'null') as number[] ?? []; } catch { return []; }
  });
  const [editandoCotIdx, setEditandoCotIdx] = useState<number | null>(null);
  const [cotInput, setCotInput] = useState('');
  const [savingCot, setSavingCot] = useState(false);

  // Horas editables
  const horasAuto = fechaInicio ? horasCalculadas(fechaInicio, fechaFin) : 0;
  const [editandoHoras, setEditandoHoras] = useState(false);
  const [horasInput, setHorasInput] = useState<string>("");
  const [horasGuardadas, setHorasGuardadas] = useState<number | null>(horasTrabajadas);
  const [savingHoras, setSavingHoras] = useState(false);

  // Monto directo editable
  const [editandoMonto, setEditandoMonto] = useState(false);
  const [montoInput, setMontoInput] = useState<string>("");
  const [montoGuardado, setMontoGuardado] = useState<number | null>(costoMoOverride);
  const [savingMonto, setSavingMonto] = useState(false);

  // Total de costos override
  const [editandoTotal, setEditandoTotal] = useState(false);
  const [totalInput, setTotalInput] = useState<string>("");
  const [totalGuardado, setTotalGuardado] = useState<number | null>(costoTotalOverride ?? null);
  const [savingTotal, setSavingTotal] = useState(false);

  // Override total repuestos
  const [editandoRepuestosTotal, setEditandoRepuestosTotal] = useState(false);
  const [repuestosTotalInput, setRepuestosTotalInput] = useState<string>("");
  const [repuestosTotalGuardado, setRepuestosTotalGuardado] = useState<number | null>(costoRepuestosOverride ?? null);
  const [savingRepuestosTotal, setSavingRepuestosTotal] = useState(false);

  const horasEfectivas = horasGuardadas ?? horasAuto;

  useEffect(() => {
    Promise.all([
      fetch(`/api/ot-repuestos?ot_id=${otId}`).then(r => r.json()),
      fetch("/api/configuracion").then(r => r.json()),
      fetch(`/api/facturas-compra?ot_id=${otId}`).then(r => r.json()),
    ]).then(([reps, config, facts]: [OTRepuesto[], Record<string, string>, FacturaItem[]]) => {
      setRepuestos(reps);
      setValorHora(parseInt(config.valor_hora ?? "0") || 0);
      setFacturas(facts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [otId]);

  async function recargarRepuestosYFacturas() {
    const [reps, facts] = await Promise.all([
      fetch(`/api/ot-repuestos?ot_id=${otId}`).then(r => r.json() as Promise<OTRepuesto[]>),
      fetch(`/api/facturas-compra?ot_id=${otId}`).then(r => r.json() as Promise<FacturaItem[]>),
    ]);
    setRepuestos(reps);
    setFacturas(facts);
  }

  async function eliminarFactura(id: number) {
    await fetch(`/api/facturas-compra/${id}`, { method: 'DELETE' });
    setFacturas(prev => prev.filter(f => f.id !== id));
  }

  async function guardarHoras() {
    const h = parseFloat(horasInput.replace(",", "."));
    if (isNaN(h) || h < 0) return;
    setSavingHoras(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Al editar horas, limpiamos el override de monto
        body: JSON.stringify({ horas_trabajadas: h, costo_mo_override: null }),
      });
      setHorasGuardadas(h);
      setMontoGuardado(null);
      setEditandoHoras(false);
    } finally {
      setSavingHoras(false);
    }
  }

  async function guardarMonto() {
    const m = parseInt(montoInput.replace(/\./g, "").replace(",", ""));
    if (isNaN(m) || m < 0) return;
    setSavingMonto(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costo_mo_override: m }),
      });
      setMontoGuardado(m);
      setEditandoMonto(false);
    } finally {
      setSavingMonto(false);
    }
  }

  async function guardarTotal() {
    const t = parseInt(totalInput.replace(/\./g, "").replace(",", ""));
    if (isNaN(t) || t < 0) return;
    setSavingTotal(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costo_total_override: t }),
      });
      setTotalGuardado(t);
      setEditandoTotal(false);
    } finally {
      setSavingTotal(false);
    }
  }

  async function guardarRepuestosTotal() {
    const t = parseInt(repuestosTotalInput.replace(/\./g, "").replace(",", ""));
    if (isNaN(t) || t < 0) return;
    setSavingRepuestosTotal(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costo_repuestos_override: t }),
      });
      setRepuestosTotalGuardado(t);
      setEditandoRepuestosTotal(false);
    } finally {
      setSavingRepuestosTotal(false);
    }
  }

  async function limpiarRepuestosTotal() {
    setSavingRepuestosTotal(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costo_repuestos_override: null }),
      });
      setRepuestosTotalGuardado(null);
      setEditandoRepuestosTotal(false);
    } finally {
      setSavingRepuestosTotal(false);
    }
  }

  async function limpiarTotal() {
    setSavingTotal(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costo_total_override: null }),
      });
      setTotalGuardado(null);
      setEditandoTotal(false);
    } finally {
      setSavingTotal(false);
    }
  }

  async function guardarCostoRepuesto(id: number) {
    const costo = parseInt(repuestoInput.replace(/\./g, "").replace(",", ""));
    if (isNaN(costo) || costo < 0) return;
    setSavingRepuesto(true);
    try {
      await fetch(`/api/ot-repuestos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio_costo_snapshot: costo }),
      });
      setRepuestos(prev => prev.map(r => r.id === id ? { ...r, precio_costo_snapshot: costo } : r));
      setEditandoRepuesto(null);
    } finally {
      setSavingRepuesto(false);
    }
  }

  async function guardarCostoCot(idx: number) {
    const costo = parseInt(cotInput.replace(/\./g, "").replace(",", ""));
    if (isNaN(costo) || costo < 0) return;
    setSavingCot(true);
    try {
      const repsCot = (() => { try { return JSON.parse(cotizacion?.repuestos ?? "[]") as Array<{ cantidad: number }>; } catch { return []; } })();
      const nuevos: (number | null)[] = Array.from({ length: repsCot.length }, (_, i) => costosCot[i] ?? null);
      nuevos[idx] = costo;
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costo_repuestos_cot: nuevos }),
      });
      setCostosCot(nuevos);
      setEditandoCotIdx(null);
    } finally {
      setSavingCot(false);
    }
  }

  function cancelarEdicion() {
    setEditandoHoras(false);
    setHorasInput("");
    setEditandoMonto(false);
    setMontoInput("");
    setEditandoTotal(false);
    setTotalInput("");
    setEditandoRepuesto(null);
    setRepuestoInput("");
    setEditandoCotIdx(null);
    setCotInput("");
    setEditandoRepuestosTotal(false);
    setRepuestosTotalInput("");
  }

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>;
  }

  // ── Ingresos ────────────────────────────────────────────────────────────────
  const totalCobrado = cotizacion?.total ?? 0;
  const moObra = cotizacion?.mano_de_obra_monto ?? 0;
  const retiroEntrega = cotizacion?.retiro_entrega_monto ?? 0;

  let repuestosCotizados = 0;
  try {
    const reps = JSON.parse(cotizacion?.repuestos ?? "[]") as Array<{ cantidad: number; valor_unitario: number }>;
    repuestosCotizados = reps.reduce((s, r) => s + r.cantidad * r.valor_unitario, 0);
  } catch { /* */ }

  // ── Costos ──────────────────────────────────────────────────────────────────
  const repsCot = (() => { try { return JSON.parse(cotizacion?.repuestos ?? "[]") as Array<{ detalle: string; cantidad: number; unidad: string; valor_unitario: number }>; } catch { return []; } })();
  const costoRepuestos = repuestos.reduce((s, r) => s + r.cantidad * r.precio_costo_snapshot, 0);
  const costoRepuestosCotTotal = repsCot.reduce((s, r, i) => s + r.cantidad * (costosCot[i] ?? 0), 0);
  // Ítems de facturas que no fueron asignados a ningún repuesto (no se cuentan en ningún otro lado)
  const costoFacturasNoAsignadas = facturas.reduce((sum, f) => {
    try {
      const lines = JSON.parse(f.items) as FacturaItemLine[];
      return sum + lines.filter(l => !l.match_key).reduce((s, l) => s + (l.total || l.cantidad * l.precio_unitario), 0);
    } catch { return sum; }
  }, 0);
  const costoRepuestosCalculado = costoRepuestos + costoRepuestosCotTotal + costoFacturasNoAsignadas;
  const costoRepuestosEfectivo = repuestosTotalGuardado !== null ? repuestosTotalGuardado : costoRepuestosCalculado;
  const costoMoObra = montoGuardado !== null ? montoGuardado : horasEfectivas * valorHora;
  const totalCostosCalculado = costoRepuestosEfectivo + costoMoObra;
  // Total override tiene precedencia sobre el calculado
  const totalCostos = totalGuardado !== null ? totalGuardado : totalCostosCalculado;

  // ── Resultado ───────────────────────────────────────────────────────────────
  const ganancia = totalCobrado - totalCostos;
  const margen = totalCobrado > 0 ? (ganancia / totalCobrado) * 100 : 0;

  const MargenIcon = ganancia > 0 ? TrendingUp : ganancia < 0 ? TrendingDown : Minus;
  const margenColor = ganancia > 0 ? "text-green-600" : ganancia < 0 ? "text-red-600" : "text-zinc-500";
  const margenBg = ganancia > 0 ? "bg-green-50 border-green-200" : ganancia < 0 ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200";

  return (
    <div className="space-y-4">
      {/* Resultado destacado */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${margenBg}`}>
        <div className="flex items-center gap-3">
          <MargenIcon className={`h-6 w-6 ${margenColor}`} />
          <div>
            <p className="text-xs text-zinc-500 font-medium">Ganancia neta</p>
            <p className={`text-2xl font-bold ${margenColor}`}>{formatCLP(ganancia)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 font-medium">Margen</p>
          <p className={`text-2xl font-bold ${margenColor}`}>{margen.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Ingresos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cobrado al cliente (neto)</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Mano de obra</span>
              <span className="font-medium">{formatCLP(moObra)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Repuestos</span>
              <span className="font-medium">{formatCLP(repuestosCotizados)}</span>
            </div>
            {retiroEntrega > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-600">Retiro/entrega</span>
                <span className="font-medium">{formatCLP(retiroEntrega)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold">
              <span className="text-zinc-800">Total neto</span>
              <span>{formatCLP(totalCobrado)}</span>
            </div>
            <div className="flex justify-between text-zinc-400 text-xs">
              <span>IVA 19%</span>
              <span>{formatCLP(totalCobrado * 0.19)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-zinc-600">
              <span>Total con IVA</span>
              <span>{formatCLP(totalCobrado * 1.19)}</span>
            </div>
          </div>
        </div>

        {/* Costos */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Costos reales</h4>
          </div>
          <div className="space-y-2 text-sm">
            {/* Repuestos (inventario + cotización) — sección unificada */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Package className="h-3.5 w-3.5" />
                <span>Repuestos (costo)</span>
              </div>
              <span className="font-medium">{formatCLP(costoRepuestosEfectivo)}</span>
            </div>
            {/* Override total repuestos */}
            <div className="ml-5 pt-0.5">
              {!editandoRepuestosTotal ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {repuestosTotalGuardado !== null && (
                    <span className="text-xs text-blue-500">(total manual: {formatCLP(repuestosTotalGuardado)})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { cancelarEdicion(); setEditandoRepuestosTotal(true); setRepuestosTotalInput(String(Math.round(costoRepuestosEfectivo))); }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline"
                  >
                    {repuestosTotalGuardado !== null ? "editar total" : "ingresar total manual"}
                  </button>
                  {repuestosTotalGuardado !== null && (
                    <button
                      type="button"
                      onClick={limpiarRepuestosTotal}
                      disabled={savingRepuestosTotal}
                      className="text-xs text-red-400 hover:text-red-600 underline disabled:opacity-50"
                    >
                      quitar
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400">$</span>
                  <input
                    type="number" min="0" step="100"
                    value={repuestosTotalInput}
                    onChange={e => setRepuestosTotalInput(e.target.value)}
                    className="w-28 border border-zinc-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="total"
                    autoFocus
                  />
                  <button type="button" onClick={guardarRepuestosTotal} disabled={savingRepuestosTotal} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                    {savingRepuestosTotal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </button>
                  <button type="button" onClick={cancelarEdicion} className="text-zinc-400 hover:text-zinc-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            {(repuestos.length > 0 || repsCot.length > 0) && (
              <div className="ml-5 space-y-1.5">
                {/* Inventario */}
                {repuestos.map((r) => (
                  <div key={r.id} className="text-xs text-zinc-400">
                    <div className="flex justify-between items-center">
                      <span>{r.nombre} × {r.cantidad}</span>
                      <div className="flex items-center gap-1.5 ml-2">
                        {editandoRepuesto === r.id ? (
                          <>
                            <span className="text-zinc-400">$</span>
                            <input
                              type="number" min="0" step="100"
                              value={repuestoInput}
                              onChange={e => setRepuestoInput(e.target.value)}
                              className="w-24 border border-zinc-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 text-zinc-700"
                              placeholder="costo"
                              autoFocus
                            />
                            <button type="button" onClick={() => guardarCostoRepuesto(r.id)} disabled={savingRepuesto} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                              {savingRepuesto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button type="button" onClick={cancelarEdicion} className="text-zinc-400 hover:text-zinc-600">
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span>{formatCLP(r.cantidad * r.precio_costo_snapshot)}</span>
                            <button
                              type="button"
                              onClick={() => { cancelarEdicion(); setEditandoRepuesto(r.id); setRepuestoInput(String(r.precio_costo_snapshot)); }}
                              className="text-zinc-300 hover:text-zinc-500 underline leading-none"
                            >
                              editar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-zinc-300 mt-0.5">{formatCLP(r.precio_costo_snapshot)} c/u</p>
                  </div>
                ))}
                {/* Cotización */}
                {repsCot.map((r, i) => {
                  const costoUnit = costosCot[i] ?? null;
                  return (
                    <div key={`cot-${i}`} className="text-xs text-zinc-400">
                      <div className="flex justify-between items-center">
                        <span className="truncate max-w-[8rem]">{r.detalle} × {r.cantidad}</span>
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          {editandoCotIdx === i ? (
                            <>
                              <span className="text-zinc-400">$</span>
                              <input
                                type="number" min="0" step="100"
                                value={cotInput}
                                onChange={e => setCotInput(e.target.value)}
                                className="w-24 border border-zinc-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 text-zinc-700"
                                placeholder="costo c/u"
                                autoFocus
                              />
                              <button type="button" onClick={() => guardarCostoCot(i)} disabled={savingCot} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                                {savingCot ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              </button>
                              <button type="button" onClick={cancelarEdicion} className="text-zinc-400 hover:text-zinc-600">
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span>{costoUnit !== null ? formatCLP(r.cantidad * costoUnit) : <span className="text-zinc-300">sin costo</span>}</span>
                              <button
                                type="button"
                                onClick={() => { cancelarEdicion(); setEditandoCotIdx(i); setCotInput(String(costoUnit ?? '')); }}
                                className="text-zinc-300 hover:text-zinc-500 underline leading-none"
                              >
                                editar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {costoUnit !== null && (
                        <p className="text-zinc-300 mt-0.5">{formatCLP(costoUnit)} c/u</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Facturas de compra */}
            <div className="pt-1">
              <SubirFacturaOT
                otId={otId}
                repuestosInventario={repuestos.map(r => ({ id: r.id, nombre: r.nombre, sku: r.sku }))}
                repuestesCot={repsCot.map((r, i) => ({ detalle: r.detalle, idx: i }))}
                onGuardado={recargarRepuestosYFacturas}
              />
              {facturas.length > 0 && (
                <div className="mt-2 space-y-1">
                  {facturas.map(f => (
                    <div key={f.id} className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="truncate">
                        Factura #{f.numero} — {f.proveedor_nombre} — {formatCLP(f.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminarFactura(f.id)}
                        className="ml-2 flex-shrink-0 p-0.5 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Horas hombre — editables por horas o por monto */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Clock className="h-3.5 w-3.5" />
                <span>Horas hombre</span>
              </div>
              <span className="font-medium">{formatCLP(costoMoObra)}</span>
            </div>

            <div className="ml-5 space-y-1.5">
              {!editandoHoras && !editandoMonto && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-400">
                      {montoGuardado !== null
                        ? `Monto fijo: ${formatCLP(montoGuardado)}`
                        : horasEfectivas > 0
                          ? `${formatHoras(horasEfectivas)} × ${formatCLP(valorHora)}/h`
                          : fechaInicio ? "OT aún no finalizada" : "Sin hora de inicio"}
                      {(horasGuardadas !== null || montoGuardado !== null) && (
                        <span className="ml-1 text-blue-500">(editado)</span>
                      )}
                    </span>
                    {montoGuardado !== null && costoMoDetalle && (
                      <span className="text-xs text-zinc-500 italic">&quot;{costoMoDetalle}&quot;</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditandoHoras(true); setHorasInput(String(horasEfectivas.toFixed(2))); }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline"
                  >
                    editar horas
                  </button>
                  <span className="text-xs text-zinc-300">|</span>
                  <button
                    type="button"
                    onClick={() => { setEditandoMonto(true); setMontoInput(String(Math.round(costoMoObra))); }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline"
                  >
                    editar monto
                  </button>
                </div>
              )}

              {editandoHoras && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="0" step="0.25"
                    value={horasInput}
                    onChange={e => setHorasInput(e.target.value)}
                    className="w-20 border border-zinc-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="horas"
                    autoFocus
                  />
                  <span className="text-xs text-zinc-400">h</span>
                  <button type="button" onClick={guardarHoras} disabled={savingHoras} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                    {savingHoras ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={cancelarEdicion} className="text-zinc-400 hover:text-zinc-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {editandoMonto && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400">$</span>
                  <input
                    type="number" min="0" step="100"
                    value={montoInput}
                    onChange={e => setMontoInput(e.target.value)}
                    className="w-28 border border-zinc-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="monto"
                    autoFocus
                  />
                  <button type="button" onClick={guardarMonto} disabled={savingMonto} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                    {savingMonto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={cancelarEdicion} className="text-zinc-400 hover:text-zinc-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-zinc-200 pt-2 font-semibold">
              <span className="text-zinc-800">Total costos</span>
              <span className="text-red-600">{formatCLP(totalCostos)}</span>
            </div>

            {/* Total manual override */}
            <div className="pt-1">
              {!editandoTotal ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {totalGuardado !== null && (
                    <span className="text-xs text-blue-500">(total manual: {formatCLP(totalGuardado)})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditandoTotal(true); setTotalInput(String(Math.round(totalCostos))); }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline"
                  >
                    {totalGuardado !== null ? "editar total manual" : "ingresar total manual"}
                  </button>
                  {totalGuardado !== null && (
                    <button
                      type="button"
                      onClick={limpiarTotal}
                      disabled={savingTotal}
                      className="text-xs text-red-400 hover:text-red-600 underline disabled:opacity-50"
                    >
                      quitar
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400">$</span>
                  <input
                    type="number" min="0" step="1000"
                    value={totalInput}
                    onChange={e => setTotalInput(e.target.value)}
                    className="w-28 border border-zinc-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    placeholder="total"
                    autoFocus
                  />
                  <button type="button" onClick={guardarTotal} disabled={savingTotal} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                    {savingTotal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={cancelarEdicion} className="text-zinc-400 hover:text-zinc-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {valorHora === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          El valor hora no está configurado. Podés ajustarlo en Configuración → General.
        </p>
      )}
    </div>
  );
}
