"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Package, Plus, Search, Upload, AlertTriangle,
  ChevronRight, X, Check, Loader2, FileText, Info,
} from "lucide-react";

interface Repuesto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
  modelos: { modelo_id: number; marca: string; modelo: string; anio: number }[];
}

interface ModeloVehiculo {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  motor: string | null;
}

interface MatchExistente {
  id: number;
  sku: string;
  nombre: string;
  stock_actual: number;
}

interface ItemExtraido {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  match_existente?: MatchExistente | null;
  // estado que maneja el usuario en la pantalla de revisión
  repuesto_id?: number | null;   // null = crear nuevo, number = fusionar con existente
  modelo_ids: number[];
}

interface FacturaExtraida {
  numero: string;
  proveedor_nombre: string;
  proveedor_rut?: string;
  fecha_emision: string;
  total_neto: number;
  total_iva: number;
  total: number;
  items: ItemExtraido[];
}

function formatCLP(n: number) {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Selector de modelos ──────────────────────────────────────────────────────
function SelectorModelos({
  modelos,
  selected,
  onChange,
}: {
  modelos: ModeloVehiculo[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function toggle(id: number) {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else onChange([...selected, id]);
  }

  const q = query.trim().toLowerCase();
  const filtrados = q
    ? modelos.filter(m =>
        `${m.marca} ${m.modelo} ${m.anio}`.toLowerCase().includes(q)
      )
    : modelos;

  const selectedModelos = modelos.filter(m => selected.includes(m.id));

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Input de búsqueda */}
      <input
        type="text"
        placeholder="Buscar marca, modelo o año..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        className="w-full border border-zinc-200 rounded px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-white placeholder:text-zinc-400"
      />

      {/* Tags de seleccionados */}
      {selectedModelos.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedModelos.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 text-xs px-2 py-0.5 rounded-full">
              {m.marca} {m.modelo} {m.anio}
              <button type="button" onClick={() => toggle(m.id)} className="text-zinc-400 hover:text-zinc-700 leading-none">✕</button>
            </span>
          ))}
        </div>
      )}
      {selectedModelos.length === 0 && !open && (
        <p className="text-xs text-zinc-400 mt-1">Sin modelo asignado (genérico para todos)</p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-xs text-zinc-400 p-3">Sin resultados para &quot;{query}&quot;</p>
          ) : (
            filtrados.map(m => (
              <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggle(m.id)}
                  className="rounded"
                />
                <span className={selected.includes(m.id) ? 'font-medium text-zinc-900' : 'text-zinc-700'}>
                  {m.marca} {m.modelo} {m.anio}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal Nueva Factura ──────────────────────────────────────────────────────
function ModalFactura({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [factura, setFactura] = useState<FacturaExtraida | null>(null);
  const [items, setItems] = useState<ItemExtraido[]>([]);
  const [modelos, setModelos] = useState<ModeloVehiculo[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/modelos-vehiculo").then(r => r.json()).then(setModelos).catch(() => {});
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Solo se aceptan archivos PDF"); return; }
    setError("");
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: base64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al procesar");
      setFactura(json.extracted);
      setItems(json.extracted.items.map((it: ItemExtraido) => ({
        ...it,
        // Si hay match, preseleccionar fusión; el usuario puede cambiarlo
        repuesto_id: it.match_existente ? it.match_existente.id : null,
        modelo_ids: [],
      })));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el PDF");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!factura) return;
    setSaving(true);
    try {
      const res = await fetch("/api/facturas/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factura, items }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      onConfirm();
      onClose();
    } catch {
      setError("Error al guardar la factura");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(i: number, patch: Partial<ItemExtraido>) {
    setItems(prev => prev.map((it, j) => j === i ? { ...it, ...patch } : it));
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="font-semibold text-zinc-900">
            {step === "upload" ? "Subir factura" : "Revisar ítems extraídos"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100">
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Subí el PDF de la factura. Claude extraerá los repuestos automáticamente.
              </p>
              <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${loading ? "border-zinc-200 bg-zinc-50" : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"}`}>
                {loading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
                    <p className="text-sm text-zinc-500">Procesando PDF con IA...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-700">Hacé clic para seleccionar el PDF</p>
                    <p className="text-xs text-zinc-400">Solo archivos PDF</p>
                  </>
                )}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFile} disabled={loading} />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {step === "review" && factura && (
            <div className="space-y-5">
              {/* Info factura */}
              <div className="bg-zinc-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Proveedor</span>
                  <span className="font-medium">{factura.proveedor_nombre}</span>
                </div>
                {factura.proveedor_rut && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">RUT</span>
                    <span>{factura.proveedor_rut}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Nº Factura</span>
                  <span className="font-mono">{factura.numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Total</span>
                  <span className="font-semibold">{formatCLP(factura.total)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ítems — revisá nombre, cantidad, precio y modelos compatibles
                </p>
                {items.length === 0 && (
                  <p className="text-sm text-zinc-400 text-center py-4">No hay ítems. Volvé y subí otra factura.</p>
                )}
                {items.map((item, i) => (
                  <div key={i} className="border border-zinc-200 rounded-lg p-3 space-y-3">
                    {/* Botón eliminar ítem */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                        Eliminar ítem
                      </button>
                    </div>

                    {/* Alerta de match existente */}
                    {item.match_existente && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
                        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span>Posible duplicado: <strong>{item.match_existente.sku} — {item.match_existente.nombre}</strong> (stock: {item.match_existente.stock_actual})</span>
                          <div className="flex gap-3 mt-1.5">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`dup-${i}`}
                                checked={item.repuesto_id === item.match_existente.id}
                                onChange={() => updateItem(i, { repuesto_id: item.match_existente!.id })}
                              />
                              <span>Fusionar (mismo repuesto)</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`dup-${i}`}
                                checked={item.repuesto_id === null}
                                onChange={() => updateItem(i, { repuesto_id: null })}
                              />
                              <span>Crear nuevo SKU</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nombre */}
                    <input
                      className="w-full text-sm font-medium border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      value={item.nombre}
                      onChange={e => updateItem(i, { nombre: e.target.value })}
                      placeholder="Nombre del repuesto"
                    />

                    {/* Cantidad y precio */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-400">Cantidad</span>
                        <input
                          type="number" min="1"
                          className="border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          value={item.cantidad}
                          onChange={e => updateItem(i, { cantidad: parseInt(e.target.value) || 1 })}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-400">Precio unitario (c/IVA)</span>
                        <input
                          type="number" min="0"
                          className="border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          value={item.precio_unitario}
                          onChange={e => updateItem(i, { precio_unitario: parseInt(e.target.value) || 0 })}
                        />
                      </label>
                    </div>

                    {/* Modelos compatibles */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-400">Modelos compatibles</span>
                      <SelectorModelos
                        modelos={modelos}
                        selected={item.modelo_ids}
                        onChange={ids => updateItem(i, { modelo_ids: ids })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {step === "review" && (
          <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
            <button onClick={() => setStep("upload")} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">
              Volver
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar y agregar al inventario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Editar Repuesto ────────────────────────────────────────────────────
function ModalRepuesto({
  repuesto,
  onClose,
  onSave,
  modelos,
}: {
  repuesto: Repuesto | null;
  onClose: () => void;
  onSave: () => void;
  modelos: ModeloVehiculo[];
}) {
  const isNew = !repuesto;
  const [form, setForm] = useState({
    nombre: repuesto?.nombre ?? "",
    descripcion: repuesto?.descripcion ?? "",
    precio_costo: repuesto?.precio_costo ?? 0,
    precio_venta: repuesto?.precio_venta ?? 0,
    stock_actual: repuesto?.stock_actual ?? 0,
    stock_minimo: repuesto?.stock_minimo ?? 1,
    unidad: repuesto?.unidad ?? "unidad",
  });
  const [modeloIds, setModeloIds] = useState<number[]>(
    repuesto?.modelos?.map(m => m.modelo_id) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Búsqueda de similares (solo al crear)
  const [similares, setSimilares] = useState<Repuesto[]>([]);
  const [sumandoStock, setSumandoStock] = useState<{ rep: Repuesto; qty: number } | null>(null);
  const [savingStock, setSavingStock] = useState(false);

  useEffect(() => {
    if (!isNew || form.nombre.trim().length < 3) { setSimilares([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/repuestos?q=${encodeURIComponent(form.nombre.trim())}`);
      const data: Repuesto[] = await res.json();
      setSimilares(data.slice(0, 3));
    }, 350);
    return () => clearTimeout(t);
  }, [form.nombre, isNew]);

  async function handleSumarStock() {
    if (!sumandoStock) return;
    setSavingStock(true);
    try {
      const { rep, qty } = sumandoStock;
      await fetch(`/api/repuestos/${rep.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rep, stock_actual: rep.stock_actual + qty }),
      });
      onSave();
      onClose();
    } finally {
      setSavingStock(false);
    }
  }

  async function handleSave() {
    if (!form.nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    try {
      const url = isNew ? "/api/repuestos" : `/api/repuestos/${repuesto!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, modelo_ids: modeloIds }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      // Si es nuevo, guardar modelos por separado vía PUT
      if (isNew && modeloIds.length > 0) {
        const newRep = await res.json();
        await fetch(`/api/repuestos/${newRep.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, modelo_ids: modeloIds }),
        });
      }
      onSave();
      onClose();
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="font-semibold text-zinc-900">{isNew ? "Nuevo repuesto" : `Editar ${repuesto!.sku}`}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-100"><X className="h-4 w-4 text-zinc-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nombre *</label>
            <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.nombre} onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setSumandoStock(null); }} />
            {isNew && similares.length > 0 && !sumandoStock && (
              <div className="mt-1.5 border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
                <p className="text-xs text-amber-700 font-medium px-3 py-2 border-b border-amber-200">Repuestos similares ya en inventario:</p>
                {similares.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 border-b border-amber-100 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-zinc-900">{s.nombre}</span>
                      <span className="text-xs text-zinc-400 ml-2">{s.sku}</span>
                      <span className="text-xs text-zinc-500 ml-2">Stock: {s.stock_actual} {s.unidad}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSumandoStock({ rep: s, qty: 1 })}
                      className="ml-3 text-xs text-amber-700 font-medium hover:text-amber-900 underline flex-shrink-0"
                    >
                      + sumar stock
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sumandoStock && (
              <div className="mt-1.5 border border-blue-200 bg-blue-50 rounded-lg px-3 py-3 space-y-2">
                <p className="text-xs font-medium text-blue-800">Sumando stock a: <strong>{sumandoStock.rep.nombre}</strong> ({sumandoStock.rep.sku}) — stock actual: {sumandoStock.rep.stock_actual}</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-blue-700">Cantidad a agregar:</label>
                  <input
                    type="number" min="1"
                    value={sumandoStock.qty}
                    onChange={e => setSumandoStock(s => s ? { ...s, qty: Math.max(1, parseInt(e.target.value) || 1) } : null)}
                    className="w-20 border border-blue-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button type="button" onClick={handleSumarStock} disabled={savingStock} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {savingStock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Confirmar
                  </button>
                  <button type="button" onClick={() => setSumandoStock(null)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancelar</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Descripción</label>
            <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Precio costo (c/IVA)</label>
              <input type="number" min="0" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.precio_costo} onChange={e => setForm(f => ({ ...f, precio_costo: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Precio venta (c/IVA)</label>
              <input type="number" min="0" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.precio_venta} onChange={e => setForm(f => ({ ...f, precio_venta: parseInt(e.target.value) || 0 }))} />
              {form.precio_costo > 0 && form.precio_venta > 0 && (() => {
                const ganancia = form.precio_venta - form.precio_costo;
                const margen = (ganancia / form.precio_venta) * 100;
                const positivo = ganancia >= 0;
                return (
                  <p className={`text-xs mt-1 font-medium ${positivo ? "text-green-600" : "text-red-600"}`}>
                    Margen: {margen.toFixed(1)}% ({positivo ? "+" : ""}{formatCLP(ganancia)}/u)
                  </p>
                );
              })()}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Stock actual</label>
              <input type="number" min="0" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.stock_actual} onChange={e => setForm(f => ({ ...f, stock_actual: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Stock mínimo</label>
              <input type="number" min="0" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Unidad</label>
              <select className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                <option value="unidad">Unidad</option>
                <option value="litro">Litro</option>
                <option value="kg">Kg</option>
                <option value="metro">Metro</option>
                <option value="par">Par</option>
                <option value="set">Set</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Modelos compatibles</label>
            <SelectorModelos modelos={modelos} selected={modeloIds} onChange={setModeloIds} />
            <p className="text-xs text-zinc-400 mt-1">Si no se asigna ninguno, el repuesto se considera genérico.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showFactura, setShowFactura] = useState(false);
  const [editRepuesto, setEditRepuesto] = useState<Repuesto | null | undefined>(undefined);
  const [modelos, setModelos] = useState<ModeloVehiculo[]>([]);

  useEffect(() => {
    fetch("/api/modelos-vehiculo").then(r => r.json()).then(setModelos).catch(() => {});
  }, []);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    const res = await fetch(`/api/repuestos${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const data = await res.json();
    setRepuestos(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  const stockBajo = repuestos.filter(r => r.stock_actual <= r.stock_minimo).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Inventario de repuestos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{repuestos.length} repuestos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFactura(true)}
            className="flex items-center gap-2 px-3 py-2 border border-zinc-300 text-sm text-zinc-700 rounded-lg hover:bg-zinc-50"
          >
            <FileText className="h-4 w-4" />
            Subir factura
          </button>
          <button
            onClick={() => setEditRepuesto(null)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Nuevo repuesto
          </button>
        </div>
      </div>

      {stockBajo > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {stockBajo} repuesto{stockBajo !== 1 ? "s" : ""} con stock bajo o agotado
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
          placeholder="Buscar por nombre o SKU..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : repuestos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              {q ? "Sin resultados para tu búsqueda" : "No hay repuestos en el inventario"}
            </p>
            {!q && (
              <button onClick={() => setShowFactura(true)} className="text-sm text-zinc-600 underline">
                Subir primera factura
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nombre</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Costo (c/IVA)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Venta (c/IVA)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {repuestos.map(r => {
                const bajo = r.stock_actual <= r.stock_minimo;
                return (
                  <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.sku}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{r.nombre}</p>
                      {r.descripcion && <p className="text-xs text-zinc-400">{r.descripcion}</p>}
                      {r.modelos && r.modelos.length > 0 ? (
                        <p className="text-xs text-blue-600 mt-0.5">
                          Para: {r.modelos.map(m => `${m.marca} ${m.modelo} ${m.anio}`).join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 mt-0.5 italic">Genérico (sin modelo asignado)</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{formatCLP(r.precio_costo)}</td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-medium text-zinc-900">{formatCLP(r.precio_venta)}</p>
                      {r.precio_costo > 0 && r.precio_venta > 0 && (() => {
                        const margen = ((r.precio_venta - r.precio_costo) / r.precio_venta) * 100;
                        return <p className={`text-xs ${margen >= 0 ? "text-green-600" : "text-red-600"}`}>{margen.toFixed(1)}%</p>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${bajo ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {bajo && <AlertTriangle className="h-3 w-3" />}
                        {r.stock_actual} {r.unidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditRepuesto(r)}
                        className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showFactura && (
        <ModalFactura onClose={() => setShowFactura(false)} onConfirm={() => load()} />
      )}
      {editRepuesto !== undefined && (
        <ModalRepuesto
          repuesto={editRepuesto}
          onClose={() => setEditRepuesto(undefined)}
          onSave={() => load()}
          modelos={modelos}
        />
      )}
    </div>
  );
}
