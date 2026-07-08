"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
}

export interface FormOTValues {
  cotizacion_id: number;
  recepcion_id: number;
  vehiculo_id: number;
  cliente_id: number;
  mecanico_id?: number | null;
  puesto_id?: number | null;
  insumos: InsumoItem[];
  diagnostico?: string | null;
  fecha_estimada_inicio?: string | null;
  fecha_estimada_fin?: string | null;
  fecha_hora_inicio?: string | null;
  fecha_hora_fin?: string | null;
}

interface CotizacionOption {
  id: number;
  numero: string;
  recepcion_id: number | null;
  vehiculo_id: number;
  cliente_id: number;
  total: number;
  estado: string;
  vehiculo: {
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
  } | null;
  cliente: {
    id: number;
    rut: string;
    nombre: string;
    telefono: string | null;
    correo: string | null;
  } | null;
}

interface MecanicoOption {
  id: number;
  nombre: string;
  rut: string;
  activo: boolean;
}

interface PuestoOption {
  id: number;
  nombre: string;
  tipo: string;
  activo: boolean;
}

interface RecepcionData {
  id: number;
  mecanico_id: number | null;
  puesto_id: number | null;
  mecanico: { id: number; nombre: string } | null;
  puesto: { id: number; nombre: string; tipo: string } | null;
}

interface FormOTProps {
  cotizacionId?: number;
  otId?: number;
  initialValues?: Partial<FormOTValues>;
  onSubmit: (values: FormOTValues) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  mode: "create" | "edit";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function capitalizarPrimera(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatPesos(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

const SELECT_CLS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const INPUT_CLS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const READONLY_CLS =
  "flex h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm text-zinc-600 cursor-default";

const UNIDADES = ["unid.", "lt.", "kg.", "m.", "set"];

// ── Component ─────────────────────────────────────────────────────────────────
export function FormOT({
  cotizacionId,
  otId,
  initialValues,
  onSubmit,
  onCancel,
  loading,
  mode,
}: FormOTProps) {
  // ── Cotizaciones disponibles ──────────────────────────────────────────────
  const [cotizacionesDisp, setCotizacionesDisp] = useState<CotizacionOption[]>([]);
  const [cotizacionesLoading, setCotizacionesLoading] = useState(false);

  // ── Selected cotizacion ───────────────────────────────────────────────────
  const [selectedCotizacionId, setSelectedCotizacionId] = useState<number>(
    cotizacionId ?? initialValues?.cotizacion_id ?? 0
  );
  const [cotizacionData, setCotizacionData] = useState<CotizacionOption | null>(null);
  const [cotizacionLoading, setCotizacionLoading] = useState(false);

  // ── Recepcion data (mecánico y puesto de la inspección) ──────────────────
  const [recepcionData, setRecepcionData] = useState<RecepcionData | null>(null);

  // ── Mecanicos ─────────────────────────────────────────────────────────────
  const [mecanicos, setMecanicos] = useState<MecanicoOption[]>([]);
  const [mecanicosLoading, setMecanicosLoading] = useState(false);

  // ── Puestos ───────────────────────────────────────────────────────────────
  const [puestos, setPuestos] = useState<PuestoOption[]>([]);
  const [puestosLoading, setPuestosLoading] = useState(false);

  // ── Form fields ───────────────────────────────────────────────────────────
  const [diagnostico, setDiagnostico] = useState(initialValues?.diagnostico ?? "");
  const [mecanicoId, setMecanicoId] = useState<string>(
    initialValues?.mecanico_id ? String(initialValues.mecanico_id) : ""
  );
  const [puestoId, setPuestoId] = useState<string>(
    initialValues?.puesto_id ? String(initialValues.puesto_id) : ""
  );
  const [insumos, setInsumos] = useState<InsumoItem[]>(initialValues?.insumos ?? []);
  const [fechaEstimadaInicio, setFechaEstimadaInicio] = useState(initialValues?.fecha_estimada_inicio ?? "");
  const [fechaEstimadaFin, setFechaEstimadaFin] = useState(initialValues?.fecha_estimada_fin ?? "");
  const [fechaInicio, setFechaInicio] = useState(initialValues?.fecha_hora_inicio ?? "");
  const [fechaFin, setFechaFin] = useState(initialValues?.fecha_hora_fin ?? "");

  // ── "¿Mantener?" states (solo en modo create) ─────────────────────────────
  const [mantenerMecanico, setMantenerMecanico] = useState<boolean | null>(null);
  const [mantenerPuesto, setMantenerPuesto] = useState<boolean | null>(null);

  const [errorMsg, setErrorMsg] = useState("");

  // ── Load mecánicos ────────────────────────────────────────────────────────
  const fetchMecanicos = useCallback(async () => {
    setMecanicosLoading(true);
    try {
      const res = await fetch("/api/mecanicos");
      if (!res.ok) throw new Error("Error al cargar mecánicos");
      const data = (await res.json()) as MecanicoOption[];
      setMecanicos(data.filter((m) => m.activo));
    } catch {
      // silently ignore
    } finally {
      setMecanicosLoading(false);
    }
  }, []);

  // ── Load puestos ──────────────────────────────────────────────────────────
  const fetchPuestos = useCallback(async () => {
    setPuestosLoading(true);
    try {
      const res = await fetch("/api/puestos");
      if (!res.ok) throw new Error("Error al cargar puestos");
      const data = (await res.json()) as PuestoOption[];
      setPuestos(data.filter((p) => p.activo));
    } catch {
      // silently ignore
    } finally {
      setPuestosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMecanicos();
    fetchPuestos();
  }, [fetchMecanicos, fetchPuestos]);

  // ── Load cotizaciones disponibles (aceptadas sin OT) ─────────────────────
  const fetchCotizacionesDisp = useCallback(async () => {
    if (cotizacionId) return; // fija, no cargar lista
    setCotizacionesLoading(true);
    try {
      const [cotRes, otRes] = await Promise.all([
        fetch("/api/cotizaciones"),
        fetch("/api/ordenes-trabajo"),
      ]);
      if (!cotRes.ok || !otRes.ok) throw new Error("Error al cargar datos");
      const cotData = (await cotRes.json()) as CotizacionOption[];
      const otData = (await otRes.json()) as { cotizacion_id: number }[];

      const cotizacionIdsConOT = new Set(otData.map((ot) => ot.cotizacion_id));
      const disponibles = cotData.filter(
        (c) => c.estado === "aceptada" && !cotizacionIdsConOT.has(c.id) && c.recepcion_id != null
      );
      setCotizacionesDisp(disponibles);
    } catch {
      // silently ignore
    } finally {
      setCotizacionesLoading(false);
    }
  }, [cotizacionId]);

  useEffect(() => {
    fetchCotizacionesDisp();
  }, [fetchCotizacionesDisp]);

  // ── Load cotizacion data when id is known ─────────────────────────────────
  const fetchCotizacionData = useCallback(async (id: number) => {
    if (!id) return;
    setCotizacionLoading(true);
    try {
      const res = await fetch(`/api/cotizaciones/${id}`);
      if (!res.ok) throw new Error("Error al cargar cotización");
      const data = (await res.json()) as CotizacionOption;
      setCotizacionData(data);
    } catch {
      setCotizacionData(null);
    } finally {
      setCotizacionLoading(false);
    }
  }, []);

  useEffect(() => {
    const idToLoad = cotizacionId ?? selectedCotizacionId;
    if (idToLoad) {
      fetchCotizacionData(idToLoad);
    }
  }, [cotizacionId, selectedCotizacionId, fetchCotizacionData]);

  // ── Load recepcion data when cotizacion is loaded ─────────────────────────
  useEffect(() => {
    if (!cotizacionData?.recepcion_id) return;
    fetch(`/api/recepciones/${cotizacionData.recepcion_id}`)
      .then((r) => r.json())
      .then((data: RecepcionData) => setRecepcionData(data))
      .catch(() => {});
  }, [cotizacionData]);

  // ── Insumos helpers ───────────────────────────────────────────────────────
  const addInsumo = () =>
    setInsumos((prev) => [...prev, { detalle: "", cantidad: 1, unidad: "unid." }]);

  const removeInsumo = (idx: number) =>
    setInsumos((prev) => prev.filter((_, i) => i !== idx));

  const updateInsumo = (
    idx: number,
    field: keyof InsumoItem,
    value: string | number
  ) => {
    setInsumos((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        [field]: field === "cantidad" ? Number(value) : value,
      };
      return copy;
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cotId = cotizacionId ?? selectedCotizacionId;
    if (!cotId) {
      setErrorMsg("Selecciona una cotización");
      return;
    }
    if (!cotizacionData) {
      setErrorMsg("No se pudieron cargar los datos de la cotización");
      return;
    }
    if (!cotizacionData.recepcion_id) {
      setErrorMsg("Esta cotización no tiene una recepción asociada. Primero debe registrar el ingreso del vehículo.");
      return;
    }

    try {
      const values: FormOTValues = {
        cotizacion_id: cotId,
        recepcion_id: cotizacionData.recepcion_id,
        vehiculo_id: cotizacionData.vehiculo_id,
        cliente_id: cotizacionData.cliente_id,
        mecanico_id: mecanicoId ? Number(mecanicoId) : null,
        puesto_id: puestoId ? Number(puestoId) : null,
        insumos,
        diagnostico: diagnostico || null,
        fecha_estimada_inicio: fechaEstimadaInicio || null,
        fecha_estimada_fin: fechaEstimadaFin || null,
      };

      if (mode === "edit") {
        values.fecha_hora_inicio = fechaInicio || null;
        values.fecha_hora_fin = fechaFin || null;
      }

      await onSubmit(values);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const v = cotizacionData;

  // ── Mechanic panel helpers ────────────────────────────────────────────────
  const mecDeLaInspeccion = recepcionData?.mecanico ?? null;
  const puestoDeLaInspeccion = recepcionData?.puesto ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* ── Sección 1: Datos heredados ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Vehículo y cliente
        </h3>

        {/* Selector de cotización — solo cuando no hay cotizacionId fija */}
        {!cotizacionId && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Cotización aceptada <span className="text-red-500">*</span>
            </label>
            {cotizacionesLoading ? (
              <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
            ) : (
              <select
                className={SELECT_CLS}
                value={selectedCotizacionId || ""}
                onChange={(e) => setSelectedCotizacionId(Number(e.target.value))}
                required
              >
                <option value="">Seleccionar cotización...</option>
                {cotizacionesDisp.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} — {c.vehiculo?.patente ?? `Cot. #${c.id}`}{" "}
                    {c.vehiculo ? `${c.vehiculo.marca} ${c.vehiculo.modelo}` : ""} —{" "}
                    {c.cliente?.nombre}
                  </option>
                ))}
              </select>
            )}
            {cotizacionesDisp.length === 0 && !cotizacionesLoading && (
              <p className="text-xs text-zinc-400">
                No hay cotizaciones aceptadas sin OT disponibles.
              </p>
            )}
          </div>
        )}

        {/* Datos read-only */}
        {cotizacionLoading ? (
          <div className="h-20 bg-zinc-100 rounded-lg animate-pulse" />
        ) : v ? (
          <div className="grid grid-cols-2 gap-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Patente</span>
              <div className={READONLY_CLS}>{v.vehiculo?.patente ?? "—"}</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Cliente</span>
              <div className={READONLY_CLS}>{v.cliente?.nombre ?? "—"}</div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Marca / Modelo</span>
              <div className={READONLY_CLS}>
                {v.vehiculo ? `${v.vehiculo.marca} ${v.vehiculo.modelo}` : "—"}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Total cotización</span>
              <div className={READONLY_CLS}>{formatPesos(v.total ?? 0)}</div>
            </div>
          </div>
        ) : (
          !cotizacionId && (
            <p className="text-xs text-zinc-400 italic">
              Selecciona una cotización para ver los datos del vehículo y cliente.
            </p>
          )
        )}
      </div>

      {/* ── Sección 2: Diagnóstico ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Diagnóstico
        </h3>
        <textarea
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
          placeholder="Descripción del diagnóstico técnico..."
          value={diagnostico ?? ""}
          onChange={(e) => setDiagnostico(capitalizarPrimera(e.target.value))}
          spellCheck={true}
          autoCorrect="on"
          autoCapitalize="sentences"
          lang="es"
          rows={3}
        />
      </div>

      {/* ── Sección 3: Mecánico ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Mecánico asignado
        </h3>

        {mode === "create" && mecDeLaInspeccion ? (
          <>
            {/* Panel azul informativo */}
            {mantenerMecanico === null && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex flex-col gap-2">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Mecánico de la inspección:</span>{" "}
                  {mecDeLaInspeccion.nombre}
                </p>
                <p className="text-xs text-blue-700">¿Asignar el mismo mecánico a esta OT?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-blue-300 text-blue-800 hover:bg-blue-100"
                    onClick={() => {
                      setMecanicoId(String(mecDeLaInspeccion.id));
                      setMantenerMecanico(true);
                    }}
                  >
                    Sí, mantener
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setMantenerMecanico(false)}
                  >
                    No, cambiar
                  </Button>
                </div>
              </div>
            )}

            {/* Mecánico mantenido — campo read-only */}
            {mantenerMecanico === true && (
              <div className="flex items-center gap-2">
                <div className={`${READONLY_CLS} flex-1`}>{mecDeLaInspeccion.nombre}</div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    setMantenerMecanico(false);
                    setMecanicoId("");
                  }}
                >
                  Cambiar
                </Button>
              </div>
            )}

            {/* Selector visible cuando eligió "No, cambiar" */}
            {mantenerMecanico === false && (
              mecanicosLoading ? (
                <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  className={SELECT_CLS}
                  value={mecanicoId}
                  onChange={(e) => setMecanicoId(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {mecanicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              )
            )}
          </>
        ) : (
          /* Sin mecánico en recepción, o modo edit: mostrar select directo */
          mecanicosLoading ? (
            <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
          ) : (
            <select
              className={SELECT_CLS}
              value={mecanicoId}
              onChange={(e) => setMecanicoId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {mecanicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          )
        )}
      </div>

      {/* ── Sección 4: Puesto ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Puesto asignado
        </h3>

        {mode === "create" && puestoDeLaInspeccion ? (
          <>
            {/* Panel azul informativo */}
            {mantenerPuesto === null && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex flex-col gap-2">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Puesto de la inspección:</span>{" "}
                  {puestoDeLaInspeccion.nombre}{" "}
                  <span className="text-blue-600 text-xs">({puestoDeLaInspeccion.tipo})</span>
                </p>
                <p className="text-xs text-blue-700">¿Asignar el mismo puesto a esta OT?</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-blue-300 text-blue-800 hover:bg-blue-100"
                    onClick={() => {
                      setPuestoId(String(puestoDeLaInspeccion.id));
                      setMantenerPuesto(true);
                    }}
                  >
                    Sí, mantener
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setMantenerPuesto(false)}
                  >
                    No, cambiar
                  </Button>
                </div>
              </div>
            )}

            {/* Puesto mantenido — campo read-only */}
            {mantenerPuesto === true && (
              <div className="flex items-center gap-2">
                <div className={`${READONLY_CLS} flex-1`}>
                  {puestoDeLaInspeccion.nombre}{" "}
                  <span className="text-zinc-400 text-xs">({puestoDeLaInspeccion.tipo})</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs shrink-0"
                  onClick={() => {
                    setMantenerPuesto(false);
                    setPuestoId("");
                  }}
                >
                  Cambiar
                </Button>
              </div>
            )}

            {/* Selector visible cuando eligió "No, cambiar" */}
            {mantenerPuesto === false && (
              puestosLoading ? (
                <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  className={SELECT_CLS}
                  value={puestoId}
                  onChange={(e) => setPuestoId(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {puestos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.tipo})
                    </option>
                  ))}
                </select>
              )
            )}
          </>
        ) : (
          /* Sin puesto en recepción, o modo edit: mostrar select directo */
          puestosLoading ? (
            <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
          ) : (
            <select
              className={SELECT_CLS}
              value={puestoId}
              onChange={(e) => setPuestoId(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {puestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.tipo})
                </option>
              ))}
            </select>
          )
        )}
      </div>

      {/* ── Sección 5: Insumos y materiales ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Insumos y materiales
        </h3>

        {insumos.length > 0 && (
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600 w-full">
                    Detalle
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600 w-20 whitespace-nowrap">
                    Cantidad
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600 w-24">
                    Unidad
                  </th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {insumos.map((item, idx) => (
                  <tr key={idx} className="border-b border-zinc-100 last:border-0">
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        className={INPUT_CLS}
                        placeholder="Ej: Aceite de motor"
                        value={item.detalle}
                        onChange={(e) =>
                          updateInsumo(idx, "detalle", capitalizarPrimera(e.target.value))
                        }
                        spellCheck={true}
                        autoCorrect="on"
                        lang="es"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className={INPUT_CLS}
                        min={0}
                        value={item.cantidad}
                        onChange={(e) => updateInsumo(idx, "cantidad", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className={SELECT_CLS}
                        value={item.unidad}
                        onChange={(e) => updateInsumo(idx, "unidad", e.target.value)}
                      >
                        {UNIDADES.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeInsumo(idx)}
                        className="inline-flex items-center justify-center size-7 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start flex items-center gap-1.5"
          onClick={addInsumo}
        >
          <Plus className="size-3.5" />
          Agregar insumo
        </Button>
      </div>

      {/* ── Sección 6: Fechas estimadas (siempre visible) ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Fechas estimadas
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Inicio estimado</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={fechaEstimadaInicio ?? ""}
              onChange={(e) => setFechaEstimadaInicio(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Fin estimado</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={fechaEstimadaFin ?? ""}
              onChange={(e) => setFechaEstimadaFin(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Sección 7: Fechas reales (solo en modo edit) ── */}
      {mode === "edit" && (
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
            Fechas reales
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Inicio real</label>
              <input
                type="datetime-local"
                className={INPUT_CLS}
                value={fechaInicio ?? ""}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Fin real</label>
              <input
                type="datetime-local"
                className={INPUT_CLS}
                value={fechaFin ?? ""}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? mode === "edit"
              ? "Guardando..."
              : "Creando..."
            : mode === "edit"
            ? "Guardar cambios"
            : "Crear OT"}
        </Button>
      </div>
    </form>
  );
}
