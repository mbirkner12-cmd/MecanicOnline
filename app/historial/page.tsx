"use client";

import { useState } from "react";
import { Search, Car, Wrench, Package, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
  precio_unitario?: number;
}

interface Trabajo {
  numero: string;
  estado: string;
  diagnostico: string | null;
  insumos: InsumoItem[];
  fecha_ingreso: string | null;
  fecha_entrega: string | null;
  motivo_ingreso: string | null;
}

interface Vehiculo {
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
}

interface HistorialData {
  vehiculo: Vehiculo;
  trabajos: Trabajo[];
}

const ESTADO_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  creada: { label: "Programado", color: "text-zinc-500 bg-zinc-100", icon: <Clock className="h-3.5 w-3.5" /> },
  en_reparacion: { label: "En reparación", color: "text-blue-700 bg-blue-100", icon: <Wrench className="h-3.5 w-3.5" /> },
  listo_para_entregar: { label: "Listo para retirar", color: "text-amber-700 bg-amber-100", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  entregado: { label: "Entregado", color: "text-green-700 bg-green-100", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

function formatFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" });
}

function normalizePatente(p: string) {
  return p.trim().toUpperCase().replace(/[\s\-]/g, "");
}

export default function HistorialPage() {
  const [patente, setPatente] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<HistorialData | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const p = normalizePatente(patente);
    if (!p || p.length < 4) {
      setError("Ingresá una patente válida");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/historial?patente=${encodeURIComponent(p)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se encontraron resultados");
        return;
      }
      setData(json);
    } catch {
      setError("Error al consultar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Historial de mi vehículo</h1>
            <p className="text-sm text-zinc-500">Consultá los trabajos realizados</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Search form */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <form onSubmit={buscar} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-zinc-700">
              Ingresá la patente de tu vehículo
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={patente}
                  onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  placeholder="Ej: ABCD12 o ABC123"
                  maxLength={10}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                <Search className="h-4 w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-4">
            {/* Vehicle info */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <Car className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">
                  {data.vehiculo.marca} {data.vehiculo.modelo} {data.vehiculo.anio}
                </p>
                <p className="text-sm font-mono text-zinc-500">{data.vehiculo.patente}</p>
              </div>
              <div className="ml-auto text-sm text-zinc-500">
                {data.trabajos.length} trabajo{data.trabajos.length !== 1 ? "s" : ""}
              </div>
            </div>

            {data.trabajos.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-8">No hay trabajos registrados para este vehículo.</p>
            )}

            {data.trabajos.map((t, i) => {
              const estado = ESTADO_INFO[t.estado] ?? ESTADO_INFO.creada;
              return (
                <div key={i} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                  {/* OT header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <span className="text-sm font-semibold text-zinc-800">OT {t.numero}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${estado.color}`}>
                      {estado.icon}
                      {estado.label}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Dates */}
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-xs text-zinc-400 mb-0.5">Ingreso</p>
                        <p className="text-zinc-700">{formatFecha(t.fecha_ingreso)}</p>
                      </div>
                      {t.fecha_entrega && (
                        <div>
                          <p className="text-xs text-zinc-400 mb-0.5">Entrega</p>
                          <p className="text-zinc-700">{formatFecha(t.fecha_entrega)}</p>
                        </div>
                      )}
                    </div>

                    {/* Motivo */}
                    {t.motivo_ingreso && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Motivo de ingreso</p>
                        <p className="text-sm text-zinc-700">{t.motivo_ingreso}</p>
                      </div>
                    )}

                    {/* Diagnóstico */}
                    {t.diagnostico && (
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Diagnóstico y trabajo realizado</p>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">{t.diagnostico}</p>
                      </div>
                    )}

                    {/* Insumos */}
                    {t.insumos.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Package className="h-3.5 w-3.5 text-zinc-400" />
                          <p className="text-xs text-zinc-400">Repuestos e insumos utilizados</p>
                        </div>
                        <div className="rounded-lg border border-zinc-100 divide-y divide-zinc-100">
                          {t.insumos.map((ins, j) => (
                            <div key={j} className="flex items-center justify-between px-3 py-2 text-sm">
                              <span className="text-zinc-700">{ins.detalle}</span>
                              <span className="text-zinc-500 text-xs ml-3 flex-shrink-0">
                                {ins.cantidad} {ins.unidad}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
