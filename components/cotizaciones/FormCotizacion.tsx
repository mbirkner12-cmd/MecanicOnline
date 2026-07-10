"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { formatRut, normalizeRut, formatPhone } from "@/lib/format";
import { DiagnosticoDisplay } from "@/components/diagnostico/DiagnosticoDisplay";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RepuestoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
  valor_unitario: number;
  monto_total: number;
}

export interface ManoDeObraItem {
  detalle: string;
  monto: number;
}

export interface FormCotizacionValues {
  recepcion_id?: number | null;
  vehiculo_id?: number;
  cliente_id?: number;
  // Sin recepción fields
  patente?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  rut_cliente?: string;
  nombre_cliente?: string;
  telefono_cliente?: string;
  // Common
  mano_de_obra_detalle: string;
  mano_de_obra_monto: number;
  repuestos: RepuestoItem[];
  recomendaciones: RepuestoItem[];
  retiro_entrega_monto: number;
  total: number;
}

interface RecepcionOption {
  id: number;
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
  } | null;
  kilometraje: number;
  estado: string;
  diagnostico_mecanico?: string | null;
}

interface FormCotizacionProps {
  recepcionId?: number;
  initialValues?: Partial<FormCotizacionValues>;
  onSubmit: (values: FormCotizacionValues) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  mode: "create" | "edit";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function capitalizarPrimera(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const UNIDADES = ["unid.", "lt.", "kg.", "m.", "set"];

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

// ── Shared table for repuestos / recomendaciones ──────────────────────────────
interface ItemsTableProps {
  items: RepuestoItem[];
  onUpdate: (idx: number, field: keyof RepuestoItem, value: string | number) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  addLabel: string;
  subtotalLabel: string;
}

function ItemsTable({ items, onUpdate, onRemove, onAdd, addLabel, subtotalLabel }: ItemsTableProps) {
  const subtotal = items.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);
  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600 min-w-[200px]">Detalle</th>
                <th className="text-center px-2 py-2 text-xs font-semibold text-zinc-600 w-20">Cant.</th>
                <th className="text-center px-2 py-2 text-xs font-semibold text-zinc-600 w-20">Unidad</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-600 w-28">V. Unit.</th>
                <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-600 w-24">Total</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      className={INPUT_CLS}
                      placeholder="Descripción"
                      value={item.detalle}
                      onChange={(e) => onUpdate(idx, "detalle", capitalizarPrimera(e.target.value))}
                      spellCheck={true}
                      autoCorrect="on"
                      autoCapitalize="sentences"
                      lang="es"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className={`${INPUT_CLS} text-center`}
                      placeholder="1"
                      min={0}
                      step={1}
                      value={item.cantidad || ""}
                      onChange={(e) => onUpdate(idx, "cantidad", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      className={SELECT_CLS}
                      value={item.unidad}
                      onChange={(e) => onUpdate(idx, "unidad", e.target.value)}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className={`${INPUT_CLS} text-right`}
                      placeholder="0"
                      min={0}
                      step={1}
                      value={item.valor_unitario || ""}
                      onChange={(e) => onUpdate(idx, "valor_unitario", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className={`${INPUT_CLS} text-right`}
                      placeholder="0"
                      min={0}
                      step={1}
                      value={item.monto_total || ""}
                      onChange={(e) => onUpdate(idx, "monto_total", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="inline-flex items-center justify-center size-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="flex items-center gap-1.5"
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
        {items.length > 0 && (
          <span className="text-sm text-zinc-600">
            {subtotalLabel}:{" "}
            <span className="font-semibold text-zinc-900">{formatPesos(subtotal)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FormCotizacion({
  recepcionId,
  initialValues,
  onSubmit,
  onCancel,
  loading,
  mode,
}: FormCotizacionProps) {
  // ── Recepciones disponibles (only for free-standing create) ──────────────
  const [recepcionesDisp, setRecepcionesDisp] = useState<RecepcionOption[]>([]);
  const [recepcionesLoading, setRecepcionesLoading] = useState(false);

  // ── Selected recepcion data ───────────────────────────────────────────────
  const [selectedRecepcionId, setSelectedRecepcionId] = useState<number>(
    recepcionId ?? (initialValues?.recepcion_id ?? 0)
  );
  const [recepcionData, setRecepcionData] = useState<RecepcionOption | null>(null);
  const [recepcionLoading, setRecepcionLoading] = useState(false);

  // ── Sin recepción mode ────────────────────────────────────────────────────
  const [sinRecepcion, setSinRecepcion] = useState(false);
  const [srPatente, setSrPatente] = useState("");
  const [srMarca, setSrMarca] = useState("");
  const [srModelo, setSrModelo] = useState("");
  const [srAnio, setSrAnio] = useState("");
  const [srVehiculoId, setSrVehiculoId] = useState<number | undefined>();
  const [srVehiculoReadonly, setSrVehiculoReadonly] = useState(false);
  const [srRutCliente, setSrRutCliente] = useState("");
  const [srNombreCliente, setSrNombreCliente] = useState("");
  const [srTelefono, setSrTelefono] = useState("");
  const [srClienteId, setSrClienteId] = useState<number | undefined>();
  const [srBuscandoVehiculo, setSrBuscandoVehiculo] = useState(false);
  const [srBuscandoCliente, setSrBuscandoCliente] = useState(false);

  const debouncedSrPatente = useDebounce(srPatente, 400);
  const debouncedSrRut = useDebounce(srRutCliente, 400);

  // ── Form fields ───────────────────────────────────────────────────────────
  const [manoDeObraItems, setManoDeObraItems] = useState<ManoDeObraItem[]>(() => {
    const raw = initialValues?.mano_de_obra_detalle ?? "";
    try {
      const parsed = JSON.parse(raw) as ManoDeObraItem[];
      if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON, ignore */ }
    return [];
  });

  const [repuestos, setRepuestos] = useState<RepuestoItem[]>(
    initialValues?.repuestos ?? []
  );

  const [recomendaciones, setRecomendaciones] = useState<RepuestoItem[]>(
    initialValues?.recomendaciones ?? []
  );

  const [retiroEntregaMonto, setRetiroEntregaMonto] = useState(
    initialValues?.retiro_entrega_monto ?? 0
  );

  const [errorMsg, setErrorMsg] = useState("");

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalManoDeObra = manoDeObraItems.reduce((acc, i) => acc + (i.monto ?? 0), 0);
  const totalRepuestos = repuestos.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);
  const totalRecomendaciones = recomendaciones.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);
  const totalReparacion = totalManoDeObra + totalRepuestos + (retiroEntregaMonto || 0);

  // ── Load available recepciones ────────────────────────────────────────────
  const fetchRecepcionesDisp = useCallback(async () => {
    if (recepcionId) return;
    setRecepcionesLoading(true);
    try {
      const res = await fetch("/api/recepciones");
      if (!res.ok) throw new Error("Error al cargar");
      const data = (await res.json()) as RecepcionOption[];
      const filtered = data.filter(
        (r) => r.estado === "en_diagnostico" || r.estado === "cotizacion_rechazada"
      );
      setRecepcionesDisp(filtered);
    } catch {
      // silently ignore
    } finally {
      setRecepcionesLoading(false);
    }
  }, [recepcionId]);

  useEffect(() => {
    fetchRecepcionesDisp();
  }, [fetchRecepcionesDisp]);

  // ── Load recepcion data when id is known ──────────────────────────────────
  const fetchRecepcionData = useCallback(async (id: number) => {
    if (!id) return;
    setRecepcionLoading(true);
    try {
      const res = await fetch(`/api/recepciones/${id}`);
      if (!res.ok) throw new Error("Error al cargar recepción");
      const data = (await res.json()) as RecepcionOption & { diagnostico_mecanico?: string | null };
      setRecepcionData(data);
    } catch {
      setRecepcionData(null);
    } finally {
      setRecepcionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sinRecepcion) return;
    const idToLoad = recepcionId ?? selectedRecepcionId;
    if (idToLoad) {
      fetchRecepcionData(idToLoad);
    }
  }, [recepcionId, selectedRecepcionId, sinRecepcion, fetchRecepcionData]);

  // ── Sin recepción: vehicle lookup by patente ──────────────────────────────
  useEffect(() => {
    if (!sinRecepcion || !debouncedSrPatente || debouncedSrPatente.length < 4) return;
    setSrBuscandoVehiculo(true);
    fetch(`/api/vehiculos?patente=${encodeURIComponent(debouncedSrPatente)}`)
      .then((r) => r.json())
      .then((data: { id: number; marca: string; modelo: string; anio: number; cliente: { id: number; rut: string; nombre: string; telefono: string | null } | null } | null) => {
        setSrBuscandoVehiculo(false);
        if (data && data.id) {
          setSrVehiculoId(data.id);
          setSrMarca(data.marca);
          setSrModelo(data.modelo);
          setSrAnio(String(data.anio));
          setSrVehiculoReadonly(true);
          if (data.cliente) {
            setSrClienteId(data.cliente.id);
            setSrRutCliente(data.cliente.rut);
            setSrNombreCliente(data.cliente.nombre);
            setSrTelefono(data.cliente.telefono ?? "");
          }
        }
      })
      .catch(() => setSrBuscandoVehiculo(false));
  }, [debouncedSrPatente, sinRecepcion]);

  // ── Sin recepción: client lookup by RUT ──────────────────────────────────
  useEffect(() => {
    if (!sinRecepcion || !debouncedSrRut || debouncedSrRut.length < 5) return;
    setSrBuscandoCliente(true);
    fetch(`/api/clientes?rut=${encodeURIComponent(normalizeRut(debouncedSrRut))}`)
      .then((r) => r.json())
      .then((data: { id: number; nombre: string; telefono: string | null } | null) => {
        setSrBuscandoCliente(false);
        if (data && data.id) {
          setSrClienteId(data.id);
          setSrNombreCliente(data.nombre);
          setSrTelefono(data.telefono ?? "");
        }
      })
      .catch(() => setSrBuscandoCliente(false));
  }, [debouncedSrRut, sinRecepcion]);

  // ── Mano de obra helpers ──────────────────────────────────────────────────
  const addManoDeObra = () =>
    setManoDeObraItems((prev) => [...prev, { detalle: "", monto: 0 }]);

  const removeManoDeObra = (idx: number) =>
    setManoDeObraItems((prev) => prev.filter((_, i) => i !== idx));

  const updateManoDeObra = (idx: number, field: keyof ManoDeObraItem, value: string | number) => {
    setManoDeObraItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: field === "monto" ? Number(value) : value };
      return copy;
    });
  };

  // ── Generic item helpers for repuestos / recomendaciones ─────────────────
  function makeItemHelpers(setter: React.Dispatch<React.SetStateAction<RepuestoItem[]>>) {
    const add = () =>
      setter((prev) => [...prev, { detalle: "", cantidad: 1, unidad: "unid.", valor_unitario: 0, monto_total: 0 }]);

    const remove = (idx: number) =>
      setter((prev) => prev.filter((_, i) => i !== idx));

    const update = (idx: number, field: keyof RepuestoItem, value: string | number) => {
      setter((prev) => {
        const copy = [...prev];
        const item = { ...copy[idx] };
        if (field === "detalle" || field === "unidad") {
          (item as Record<string, unknown>)[field] = value as string;
        } else {
          (item as Record<string, unknown>)[field] = Number(value);
        }
        if (field === "monto_total") {
          // Back-calculate unit price from manually entered total
          const qty = item.cantidad || 1;
          item.valor_unitario = Math.round((item.monto_total ?? 0) / qty);
        } else {
          // Forward-calculate total from unit price × quantity
          item.monto_total = (item.cantidad ?? 0) * (item.valor_unitario ?? 0);
        }
        copy[idx] = item;
        return copy;
      });
    };

    return { add, remove, update };
  }

  const repuestosHelpers = makeItemHelpers(setRepuestos);
  const recomendacionesHelpers = makeItemHelpers(setRecomendaciones);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // ── Sin recepción path ────────────────────────────────────────────────
    if (sinRecepcion && !recepcionId) {
      if (!srPatente.trim()) { setErrorMsg("La patente es requerida."); return; }
      if (!srMarca.trim() || !srModelo.trim() || !srAnio) {
        setErrorMsg("Marca, modelo y año son requeridos.");
        return;
      }
      if (!srNombreCliente.trim()) {
        setErrorMsg("El nombre del cliente es requerido.");
        return;
      }
      try {
        await onSubmit({
          recepcion_id: null,
          vehiculo_id: srVehiculoId,
          cliente_id: srClienteId,
          patente: srPatente,
          marca: srMarca,
          modelo: srModelo,
          anio: Number(srAnio),
          rut_cliente: srRutCliente,
          nombre_cliente: srNombreCliente,
          telefono_cliente: srTelefono || undefined,
          mano_de_obra_detalle: JSON.stringify(manoDeObraItems),
          mano_de_obra_monto: totalManoDeObra,
          repuestos,
          recomendaciones,
          retiro_entrega_monto: retiroEntregaMonto,
          total: totalReparacion,
        });
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
      }
      return;
    }

    // ── Con recepción path ────────────────────────────────────────────────
    const recId = recepcionId ?? selectedRecepcionId;
    if (!recId) {
      setErrorMsg("Selecciona una recepción");
      return;
    }
    if (!recepcionData) {
      setErrorMsg("No se pudieron cargar los datos de la recepción");
      return;
    }

    try {
      await onSubmit({
        recepcion_id: recId,
        vehiculo_id: recepcionData.vehiculo?.id ?? 0,
        cliente_id: recepcionData.cliente?.id ?? 0,
        mano_de_obra_detalle: JSON.stringify(manoDeObraItems),
        mano_de_obra_monto: totalManoDeObra,
        repuestos,
        recomendaciones,
        retiro_entrega_monto: retiroEntregaMonto,
        total: totalReparacion,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const v = recepcionData;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* ── Datos vehículo / cliente ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Datos del vehículo y cliente
        </h3>

        {/* Toggle con/sin recepción — solo en modo creación sin recepción fija */}
        {!recepcionId && mode === "create" && (
          <div className="flex rounded-lg border border-zinc-200 divide-x divide-zinc-200 text-sm overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-2 px-3 transition-colors ${!sinRecepcion ? "bg-zinc-900 text-white font-medium" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              onClick={() => setSinRecepcion(false)}
            >
              Con recepción
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 transition-colors ${sinRecepcion ? "bg-zinc-900 text-white font-medium" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              onClick={() => setSinRecepcion(true)}
            >
              Sin recepción
            </button>
          </div>
        )}

        {/* ── Sin recepción: vehicle + client fields ── */}
        {!recepcionId && sinRecepcion && mode === "create" && (
          <div className="flex flex-col gap-3">
            {/* Patente */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Patente *</label>
              <input
                type="text"
                className={`${INPUT_CLS} uppercase`}
                placeholder="ABCD12"
                value={srPatente}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setSrPatente(val);
                  if (!val) {
                    setSrVehiculoId(undefined);
                    setSrVehiculoReadonly(false);
                    setSrMarca("");
                    setSrModelo("");
                    setSrAnio("");
                  }
                }}
                disabled={srVehiculoReadonly}
              />
              {srBuscandoVehiculo && <p className="text-xs text-zinc-400">Buscando vehículo...</p>}
              {srVehiculoReadonly && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                  <span className="text-blue-800 font-medium">
                    Vehículo encontrado: {srMarca} {srModelo} ({srAnio})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSrVehiculoReadonly(false);
                      setSrVehiculoId(undefined);
                      setSrMarca("");
                      setSrModelo("");
                      setSrAnio("");
                    }}
                    className="text-xs text-blue-600 hover:underline ml-3 shrink-0"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            {/* Marca / Modelo / Año — solo si no auto-rellenado */}
            {!srVehiculoReadonly && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Marca *</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Toyota"
                    value={srMarca}
                    onChange={(e) => setSrMarca(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Modelo *</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    placeholder="Corolla"
                    value={srModelo}
                    onChange={(e) => setSrModelo(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Año *</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    placeholder="2020"
                    value={srAnio}
                    onChange={(e) => setSrAnio(e.target.value)}
                    min={1900}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </div>
            )}

            {/* RUT cliente */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">RUT cliente</label>
              <div className="relative">
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="12.345.678-9"
                  value={srRutCliente}
                  onChange={(e) => {
                    setSrRutCliente(e.target.value);
                    setSrClienteId(undefined);
                  }}
                  onBlur={(e) => setSrRutCliente(formatRut(e.target.value))}
                />
                {srBuscandoCliente && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    Buscando...
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Nombre cliente *</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="Juan Pérez"
                  value={srNombreCliente}
                  onChange={(e) => setSrNombreCliente(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Teléfono</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  placeholder="+56 9 1234 5678"
                  value={srTelefono}
                  onChange={(e) => setSrTelefono(e.target.value)}
                  onBlur={(e) => setSrTelefono(formatPhone(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Con recepción: dropdown + data display ── */}
        {!sinRecepcion && (
          <>
            {!recepcionId && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Recepción <span className="text-red-500">*</span>
                </label>
                {recepcionesLoading ? (
                  <div className="h-8 bg-zinc-100 rounded-lg animate-pulse" />
                ) : (
                  <select
                    className={SELECT_CLS}
                    value={selectedRecepcionId || ""}
                    onChange={(e) => setSelectedRecepcionId(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccionar recepción...</option>
                    {recepcionesDisp.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.vehiculo?.patente ?? `Recepción #${r.id}`} —{" "}
                        {r.vehiculo?.marca} {r.vehiculo?.modelo} ({r.vehiculo?.anio}) —{" "}
                        {r.cliente?.nombre}
                      </option>
                    ))}
                  </select>
                )}
                {recepcionesDisp.length === 0 && !recepcionesLoading && (
                  <p className="text-xs text-zinc-400">
                    No hay recepciones disponibles en estado &apos;En diagnóstico&apos; o &apos;Cotización rechazada&apos;.
                  </p>
                )}
              </div>
            )}

            {recepcionLoading ? (
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
                  <span className="text-xs text-zinc-500">Año</span>
                  <div className={READONLY_CLS}>{v.vehiculo?.anio ?? "—"}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">Kilometraje ingreso</span>
                  <div className={READONLY_CLS}>
                    {v.kilometraje ? `${v.kilometraje.toLocaleString("es-CL")} km` : "—"}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">Teléfono cliente</span>
                  <div className={READONLY_CLS}>{v.cliente?.telefono ?? "—"}</div>
                </div>
              </div>
            ) : (
              !recepcionId && (
                <p className="text-xs text-zinc-400 italic">
                  Selecciona una recepción para ver los datos del vehículo y cliente.
                </p>
              )
            )}
          </>
        )}
      </div>

      {/* ── Diagnóstico del mecánico (con recepción) ── */}
      {!sinRecepcion && v?.diagnostico_mecanico && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2 flex items-center gap-2">
            <ClipboardList className="size-4 text-zinc-400" />
            Diagnóstico del mecánico
          </h3>
          <DiagnosticoDisplay value={v.diagnostico_mecanico} />
        </div>
      )}

      {/* ── Sección 1: Mano de obra ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Mano de obra
        </h3>

        {manoDeObraItems.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-600">Descripción</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-600 w-36">Monto ($)</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {manoDeObraItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        className={INPUT_CLS}
                        placeholder="Ej: Cambio de aceite y filtro"
                        value={item.detalle}
                        onChange={(e) => updateManoDeObra(idx, "detalle", capitalizarPrimera(e.target.value))}
                        spellCheck={true}
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        lang="es"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className={`${INPUT_CLS} text-right`}
                        placeholder="0"
                        min={0}
                        step={1}
                        value={item.monto || ""}
                        onChange={(e) => updateManoDeObra(idx, "monto", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => removeManoDeObra(idx)}
                        className="inline-flex items-center justify-center size-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addManoDeObra}
            className="flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Agregar ítem
          </Button>
          {manoDeObraItems.length > 0 && (
            <span className="text-sm text-zinc-600">
              Subtotal mano de obra:{" "}
              <span className="font-semibold text-zinc-900">{formatPesos(totalManoDeObra)}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Sección 2: Repuestos ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Repuestos
        </h3>
        <ItemsTable
          items={repuestos}
          onUpdate={repuestosHelpers.update}
          onRemove={repuestosHelpers.remove}
          onAdd={repuestosHelpers.add}
          addLabel="Agregar repuesto"
          subtotalLabel="Subtotal repuestos"
        />
      </div>

      {/* ── Sección 3: Retiro y entrega ── */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2">
          Retiro y entrega
        </h3>
        <div className="flex flex-col gap-1 max-w-[200px]">
          <label className="text-xs font-medium text-zinc-600">Monto retiro y entrega ($)</label>
          <input
            type="number"
            className={INPUT_CLS}
            placeholder="0"
            min={0}
            step={1}
            value={retiroEntregaMonto || ""}
            onChange={(e) => setRetiroEntregaMonto(Number(e.target.value))}
          />
        </div>
      </div>

      {/* ── Totales ── */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-3 bg-zinc-50">
          <span className="text-sm font-medium text-zinc-700">Total Neto</span>
          <span className="text-sm font-semibold text-zinc-900">{formatPesos(totalReparacion)}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-3 border-t border-zinc-100">
          <span className="text-sm text-zinc-500">IVA (19%)</span>
          <span className="text-sm text-zinc-700">{formatPesos(Math.round(totalReparacion * 0.19))}</span>
        </div>
        <div className="flex items-center justify-between bg-zinc-900 px-5 py-4">
          <div>
            <span className="font-semibold text-white block">Total</span>
            <span className="text-xs text-zinc-400">Neto + IVA 19%</span>
          </div>
          <span className="text-xl font-bold text-white">{formatPesos(Math.round(totalReparacion * 1.19))}</span>
        </div>
      </div>

      {/* ── Sección 4: Recomendaciones ── */}
      <div className="flex flex-col gap-3">
        <div className="border-b border-zinc-100 pb-2">
          <h3 className="font-semibold text-zinc-900 text-sm">
            Recomendaciones adicionales
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Trabajos opcionales que se sugieren pero no forman parte de la reparación principal
          </p>
        </div>
        <ItemsTable
          items={recomendaciones}
          onUpdate={recomendacionesHelpers.update}
          onRemove={recomendacionesHelpers.remove}
          onAdd={recomendacionesHelpers.add}
          addLabel="Agregar recomendación"
          subtotalLabel="Subtotal recomendaciones"
        />

        {recomendaciones.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-amber-900 block text-sm">Si incluye recomendaciones</span>
              <span className="text-xs text-amber-700">
                {formatPesos(totalReparacion)} neto + {formatPesos(totalRecomendaciones)} recomendaciones + IVA 19%
              </span>
            </div>
            <span className="text-xl font-bold text-amber-900">
              {formatPesos(Math.round((totalReparacion + totalRecomendaciones) * 1.19))}
            </span>
          </div>
        )}
      </div>

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
            : "Crear cotización"}
        </Button>
      </div>
    </form>
  );
}
