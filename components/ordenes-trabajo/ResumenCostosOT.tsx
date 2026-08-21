"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, Clock, Package, Wrench, DollarSign, Pencil, Check, X } from "lucide-react";

interface OTRepuesto {
  cantidad: number;
  precio_costo_snapshot: number;
  precio_venta_snapshot: number;
  nombre: string;
  sku: string;
  unidad: string;
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
  costoMoOverride: number | null; // monto directo, tiene precedencia sobre horas
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

export function ResumenCostosOT({ otId, cotizacion, fechaInicio, fechaFin, horasTrabajadas, costoMoOverride }: Props) {
  const [repuestos, setRepuestos] = useState<OTRepuesto[]>([]);
  const [valorHora, setValorHora] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const horasEfectivas = horasGuardadas ?? horasAuto;

  useEffect(() => {
    Promise.all([
      fetch(`/api/ot-repuestos?ot_id=${otId}`).then(r => r.json()),
      fetch("/api/configuracion").then(r => r.json()),
    ]).then(([reps, config]: [OTRepuesto[], Record<string, string>]) => {
      setRepuestos(reps);
      setValorHora(parseInt(config.valor_hora ?? "0") || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [otId]);

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

  function cancelarEdicion() {
    setEditandoHoras(false);
    setHorasInput("");
    setEditandoMonto(false);
    setMontoInput("");
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
  const costoRepuestos = repuestos.reduce((s, r) => s + r.cantidad * r.precio_costo_snapshot, 0);
  // Monto override tiene precedencia; si no, calcular desde horas
  const costoMoObra = montoGuardado !== null ? montoGuardado : horasEfectivas * valorHora;
  const totalCostos = costoRepuestos + costoMoObra;

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
            {/* Repuestos */}
            <div className="flex justify-between">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Package className="h-3.5 w-3.5" />
                <span>Repuestos (costo)</span>
              </div>
              <span className="font-medium">{formatCLP(costoRepuestos)}</span>
            </div>
            {repuestos.length > 0 && (
              <div className="ml-5 space-y-1">
                {repuestos.map((r, i) => (
                  <div key={i} className="flex justify-between text-xs text-zinc-400">
                    <span>{r.nombre} × {r.cantidad}</span>
                    <span>{formatCLP(r.cantidad * r.precio_costo_snapshot)}</span>
                  </div>
                ))}
              </div>
            )}

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

            <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold">
              <span className="text-zinc-800">Total costos</span>
              <span className="text-red-600">{formatCLP(totalCostos)}</span>
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
