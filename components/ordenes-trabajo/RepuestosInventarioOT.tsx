"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Search, AlertTriangle, Loader2 } from "lucide-react";

interface OTRepuesto {
  id: number;
  repuesto_id: number;
  sku: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio_costo_snapshot: number;
  precio_venta_snapshot: number;
}

interface RepuestoStock {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  stock_actual: number;
  unidad: string;
  precio_costo: number;
  precio_venta: number;
  modelos: { modelo_id: number }[];
}

function formatCLP(n: number) {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

async function fetchRepuestos(q: string, modeloId?: number): Promise<RepuestoStock[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (modeloId) params.set("modelo_id", String(modeloId));
  const res = await fetch(`/api/repuestos?${params}`);
  return res.json();
}

export function RepuestosInventarioOT({ otId, editable = true, modeloId, vehiculo }: { otId: number; editable?: boolean; modeloId?: number; vehiculo?: { marca: string; modelo: string; anio: number } }) {
  const [items, setItems] = useState<OTRepuesto[]>([]);
  const [loading, setLoading] = useState(true);

  // Catálogo disponible (preloaded si hay modeloId, o resultado de búsqueda)
  const [catalogo, setCatalogo] = useState<RepuestoStock[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);

  const [query, setQuery] = useState("");
  const [repuestoSel, setRepuestoSel] = useState<RepuestoStock | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const loadItems = useCallback(async () => {
    const res = await fetch(`/api/ot-repuestos?ot_id=${otId}`);
    setItems(await res.json());
    setLoading(false);
  }, [otId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Cargar catálogo inicial cuando hay modelo conocido
  useEffect(() => {
    if (!editable) return;
    setLoadingCatalogo(true);
    fetchRepuestos("", modeloId)
      .then(setCatalogo)
      .finally(() => setLoadingCatalogo(false));
  }, [modeloId, editable]);

  // Filtrar por búsqueda con debounce
  useEffect(() => {
    if (!editable) return;
    if (!query.trim()) {
      // Volver al catálogo completo
      fetchRepuestos("", modeloId).then(setCatalogo);
      return;
    }
    const t = setTimeout(() => {
      setLoadingCatalogo(true);
      fetchRepuestos(query, modeloId)
        .then(setCatalogo)
        .finally(() => setLoadingCatalogo(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, modeloId, editable]);

  async function handleAgregar() {
    if (!repuestoSel || cantidad < 1) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/ot-repuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ot_id: otId, repuesto_id: repuestoSel.id, cantidad }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error al agregar"); return; }
      setRepuestoSel(null);
      setCantidad(1);
      // Recargar catálogo para actualizar stock
      fetchRepuestos(query, modeloId).then(setCatalogo);
      loadItems();
    } catch {
      setError("Error al agregar el repuesto");
    } finally {
      setAdding(false);
    }
  }

  async function handleEliminar(id: number) {
    await fetch(`/api/ot-repuestos/${id}`, { method: "DELETE" });
    fetchRepuestos(query, modeloId).then(setCatalogo);
    loadItems();
  }

  const totalVenta = items.reduce((s, i) => s + i.cantidad * i.precio_venta_snapshot, 0);

  // Excluir del catálogo los repuestos ya agregados a la OT
  const agregadosIds = new Set(items.map(i => i.repuesto_id));
  const catalogoFiltrado = catalogo.filter(r => !agregadosIds.has(r.id));

  return (
    <div className="space-y-4">
      {editable && (
        <div className="space-y-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
              placeholder="Buscar por nombre o SKU..."
              value={query}
              onChange={e => { setQuery(e.target.value); setRepuestoSel(null); }}
            />
            {loadingCatalogo && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />}
          </div>

          {/* Repuesto seleccionado */}
          {repuestoSel ? (
            <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{repuestoSel.nombre}</p>
                <p className="text-xs text-zinc-500">
                  Stock disponible: <span className={repuestoSel.stock_actual <= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>{repuestoSel.stock_actual} {repuestoSel.unidad}</span>
                  {" · "}Precio venta: {formatCLP(repuestoSel.precio_venta)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min={1}
                  max={repuestoSel.stock_actual}
                  value={cantidad}
                  onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 border border-zinc-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={handleAgregar}
                  disabled={adding || repuestoSel.stock_actual <= 0 || cantidad > repuestoSel.stock_actual}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Agregar
                </button>
                <button type="button" onClick={() => setRepuestoSel(null)} className="text-xs text-zinc-400 hover:text-zinc-600 px-1">✕</button>
              </div>
            </div>
          ) : (
            /* Lista del catálogo disponible */
            catalogoFiltrado.length > 0 && (
              <div className="border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                {modeloId && vehiculo && (
                  <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 font-medium">
                    Repuestos para {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
                  </div>
                )}
                <div className="max-h-56 overflow-y-auto">
                {catalogoFiltrado.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setRepuestoSel(r); setCantidad(1); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 text-sm border-b border-zinc-100 last:border-0 text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-zinc-900">{r.nombre}</span>
                        <span className="text-xs text-zinc-400">{r.sku}</span>
                        {r.modelos?.length === 0 ? (
                          <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">Genérico</span>
                        ) : (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Para este vehículo</span>
                        )}
                      </div>
                      {r.descripcion && <p className="text-xs text-zinc-400 mt-0.5">{r.descripcion}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.stock_actual <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {r.stock_actual <= 0 && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                        Stock: {r.stock_actual} {r.unidad}
                      </span>
                      <span className="text-xs text-zinc-500">{formatCLP(r.precio_venta)}</span>
                    </div>
                  </button>
                ))}
                </div>
              </div>
            )
          )}

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
      )}

      {/* Lista de repuestos ya agregados a la OT */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Sin repuestos del inventario asociados.</p>
      ) : (
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Repuesto</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Cant.</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">P. venta</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Total</th>
                {editable && <th className="px-2 py-2 w-8" />}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium text-zinc-900">{item.nombre}</p>
                    <p className="text-xs text-zinc-400">{item.sku}</p>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-700">{item.cantidad} {item.unidad}</td>
                  <td className="px-3 py-2 text-right text-zinc-700">{formatCLP(item.precio_venta_snapshot)}</td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-900">{formatCLP(item.cantidad * item.precio_venta_snapshot)}</td>
                  {editable && (
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleEliminar(item.id)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                        title="Eliminar y restaurar stock"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50">
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-zinc-500 text-right">Total repuestos</td>
                <td className="px-3 py-2 text-right font-bold text-zinc-900">{formatCLP(totalVenta)}</td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
