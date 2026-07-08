"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Car, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VehiculoRow {
  id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje_actual: number;
  cliente_id: number;
  cliente_nombre: string | null;
  cliente_rut: string | null;
  cliente_telefono: string | null;
  num_visitas: number;
  ultima_visita: string | null;
}

interface VehiculoForm {
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  kilometraje_actual: string;
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatKm(km: number) {
  return km.toLocaleString("es-CL") + " km";
}

export default function VehiculosPage() {
  const router = useRouter();
  const [vehiculos, setVehiculos] = useState<VehiculoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<VehiculoRow | null>(null);
  const [form, setForm] = useState<VehiculoForm>({ patente: "", marca: "", modelo: "", anio: "", kilometraje_actual: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchVehiculos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehiculos");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as VehiculoRow[];
      setVehiculos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  function openEdit(v: VehiculoRow, e: React.MouseEvent) {
    e.stopPropagation();
    setEditando(v);
    setForm({
      patente: v.patente,
      marca: v.marca,
      modelo: v.modelo,
      anio: String(v.anio),
      kilometraje_actual: String(v.kilometraje_actual),
    });
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/vehiculos/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patente: form.patente,
          marca: form.marca,
          modelo: form.modelo,
          anio: Number(form.anio),
          kilometraje_actual: Number(form.kilometraje_actual),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }
      setEditando(null);
      await fetchVehiculos();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const filtrados = vehiculos.filter((v) => {
    const q = busqueda.toLowerCase();
    return (
      v.patente.toLowerCase().includes(q) ||
      v.marca.toLowerCase().includes(q) ||
      v.modelo.toLowerCase().includes(q) ||
      (v.cliente_nombre ?? "").toLowerCase().includes(q) ||
      (v.cliente_rut ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vehículos</h1>
          <p className="text-zinc-500 mt-1 text-sm">Vehículos registrados en el sistema</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 rounded-md px-3 py-1.5">
          <Car className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">{vehiculos.length} vehículos</span>
        </div>
      </div>

      <div>
        <input
          type="text"
          placeholder="Buscar por patente, marca, modelo o cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Patente</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Vehículo</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Año</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Kilometraje</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Cliente</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500">Visitas</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Última visita</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
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
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                  {busqueda ? "Sin resultados para esa búsqueda" : "No hay vehículos registrados"}
                </td>
              </tr>
            ) : (
              filtrados.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/vehiculos/${v.id}`)}
                  className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-zinc-900 text-xs">
                    {v.patente}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">{v.marca} {v.modelo}</td>
                  <td className="px-4 py-3 text-zinc-600">{v.anio}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatKm(v.kilometraje_actual)}</td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-800">{v.cliente_nombre ?? "—"}</div>
                    {v.cliente_rut && (
                      <div className="text-zinc-400 text-xs font-mono">{v.cliente_rut}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                      {v.num_visitas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{formatFecha(v.ultima_visita)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => openEdit(v, e)}
                      className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                      title="Editar vehículo"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editando} onOpenChange={(open) => { if (!open) setEditando(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar vehículo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Patente</label>
              <input
                type="text"
                value={form.patente}
                onChange={(e) => setForm((f) => ({ ...f, patente: e.target.value.toUpperCase() }))}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Marca</label>
                <input
                  type="text"
                  value={form.marca}
                  onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                  className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Modelo</label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                  className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Año</label>
                <input
                  type="number"
                  value={form.anio}
                  onChange={(e) => setForm((f) => ({ ...f, anio: e.target.value }))}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Kilometraje</label>
                <input
                  type="number"
                  value={form.kilometraje_actual}
                  onChange={(e) => setForm((f) => ({ ...f, kilometraje_actual: e.target.value }))}
                  min={0}
                  className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  required
                />
              </div>
            </div>
            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{errorMsg}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
