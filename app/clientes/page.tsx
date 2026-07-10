"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRut, formatPhone } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClienteRow {
  id: number;
  rut: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  whatsapp: string | null;
  num_vehiculos: number;
  num_visitas: number;
  ultima_visita: string | null;
}

interface ClienteForm {
  nombre: string;
  rut: string;
  telefono: string;
  direccion: string;
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<ClienteRow | null>(null);
  const [form, setForm] = useState<ClienteForm>({ nombre: "", rut: "", telefono: "", direccion: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clientes");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ClienteRow[];
      setClientes(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  function openEdit(c: ClienteRow, e: React.MouseEvent) {
    e.stopPropagation();
    setEditando(c);
    setForm({
      nombre: c.nombre,
      rut: formatRut(c.rut),
      telefono: formatPhone(c.telefono ?? c.whatsapp ?? ""),
      direccion: c.direccion ?? "",
    });
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/clientes/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          rut: form.rut,
          telefono: form.telefono || null,
          direccion: form.direccion || null,
          whatsapp: form.telefono || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }
      setEditando(null);
      await fetchClientes();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.rut.toLowerCase().includes(q) ||
      (c.telefono ?? "").toLowerCase().includes(q) ||
      (c.correo ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clientes</h1>
          <p className="text-zinc-500 mt-1 text-sm">Clientes registrados en el sistema</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 rounded-md px-3 py-1.5">
          <Users className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">{clientes.length} clientes</span>
        </div>
      </div>

      <div>
        <input
          type="text"
          placeholder="Buscar por nombre, RUT, teléfono o correo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 font-medium text-zinc-500">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">RUT</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Teléfono</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Correo</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Vehículos</th>
              <th className="text-center px-4 py-3 font-medium text-zinc-500">Visitas</th>
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
                  {busqueda ? "Sin resultados para esa búsqueda" : "No hay clientes registrados"}
                </td>
              </tr>
            ) : (
              filtrados.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{c.nombre}</td>
                  <td className="px-4 py-3 text-zinc-600 font-mono text-xs hidden md:table-cell">{formatRut(c.rut)}</td>
                  <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{c.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{c.correo ?? "—"}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {c.num_vehiculos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                      {c.num_visitas}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{formatFecha(c.ultima_visita)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => openEdit(c, e)}
                      className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                      title="Editar cliente"
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
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">RUT</label>
              <input
                type="text"
                value={form.rut}
                onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))}
                onBlur={(e) => setForm((f) => ({ ...f, rut: formatRut(e.target.value) }))}
                placeholder="12.345.678-9"
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                onBlur={(e) => setForm((f) => ({ ...f, telefono: formatPhone(e.target.value) }))}
                placeholder="+56 9 1234 5678"
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
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
