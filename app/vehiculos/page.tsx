"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Car, Pencil, Download, Search, X } from "lucide-react";
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
  vin: string | null;
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
  vin: string;
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
  const [form, setForm] = useState<VehiculoForm>({ patente: "", marca: "", modelo: "", anio: "", vin: "", kilometraje_actual: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Cambio de propietario
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientesLista, setClientesLista] = useState<{ id: number; nombre: string; rut: string | null }[]>([]);
  const [showClienteDrop, setShowClienteDrop] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);

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
      vin: v.vin ?? "",
      kilometraje_actual: String(v.kilometraje_actual),
    });
    setClienteId(v.cliente_id);
    setClienteSearch(v.cliente_nombre ?? "");
    setShowClienteDrop(false);
    setErrorMsg("");
    if (clientesLista.length === 0) {
      fetch("/api/clientes")
        .then(r => r.json())
        .then((data: { id: number; nombre: string; rut: string | null }[]) => setClientesLista(data))
        .catch(() => {/* ignore */});
    }
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
          vin: form.vin || null,
          kilometraje_actual: Number(form.kilometraje_actual),
          ...(clienteId !== null ? { cliente_id: clienteId } : {}),
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

  const exportarExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = filtrados.map(v => ({
      'Patente': v.patente,
      'Marca': v.marca,
      'Modelo': v.modelo,
      'Año': v.anio,
      'VIN': v.vin ?? '',
      'Kilometraje (km)': v.kilometraje_actual,
      'Cliente': v.cliente_nombre ?? '',
      'RUT Cliente': v.cliente_rut ?? '',
      'Teléfono': v.cliente_telefono ?? '',
      'N° Visitas': v.num_visitas,
      'Última Visita': formatFecha(v.ultima_visita),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [12,12,14,6,18,16,24,14,14,10,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehículos');
    XLSX.writeFile(wb, 'vehiculos.xlsx');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vehículos</h1>
          <p className="text-zinc-500 mt-1 text-sm">Vehículos registrados en el sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {vehiculos.length > 0 && (
            <button
              onClick={exportarExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
          )}
          <div className="flex items-center gap-2 bg-zinc-100 rounded-md px-3 py-1.5">
            <Car className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700">{vehiculos.length} vehículos</span>
          </div>
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
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Año</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Kilometraje</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Cliente</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Visitas</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Última visita</th>
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
                  <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{v.anio}</td>
                  <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{formatKm(v.kilometraje_actual)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-zinc-800">{v.cliente_nombre ?? "—"}</div>
                    {v.cliente_rut && (
                      <div className="text-zinc-400 text-xs font-mono">{v.cliente_rut}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                      {v.num_visitas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{formatFecha(v.ultima_visita)}</td>
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">VIN</label>
              <input
                type="text"
                value={form.vin}
                onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))}
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
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
            {/* Propietario */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Propietario</label>
              <div ref={clienteRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={clienteSearch}
                    onChange={e => { setClienteSearch(e.target.value); setClienteId(null); setShowClienteDrop(true); }}
                    onFocus={() => setShowClienteDrop(true)}
                    onBlur={() => setTimeout(() => setShowClienteDrop(false), 150)}
                    placeholder="Buscar cliente por nombre o RUT..."
                    className="w-full pl-8 pr-8 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                  {clienteSearch && (
                    <button type="button" onClick={() => { setClienteSearch(""); setClienteId(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {showClienteDrop && clienteSearch.trim().length > 0 && (() => {
                  const q = clienteSearch.toLowerCase();
                  const matches = clientesLista.filter(c =>
                    c.nombre.toLowerCase().includes(q) || (c.rut ?? "").toLowerCase().includes(q)
                  ).slice(0, 8);
                  if (matches.length === 0) return null;
                  return (
                    <ul className="absolute z-50 left-0 top-full mt-0.5 w-full max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg text-sm">
                      {matches.map(c => (
                        <li
                          key={c.id}
                          onMouseDown={() => { setClienteId(c.id); setClienteSearch(c.nombre); setShowClienteDrop(false); }}
                          className="px-3 py-2 cursor-pointer hover:bg-zinc-50 flex items-center justify-between"
                        >
                          <span className="font-medium text-zinc-900">{c.nombre}</span>
                          {c.rut && <span className="text-xs text-zinc-400 font-mono ml-2">{c.rut}</span>}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
              {clienteId !== null && clienteId !== editando?.cliente_id && (
                <p className="text-xs text-amber-600">El propietario cambiará al guardar</p>
              )}
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
