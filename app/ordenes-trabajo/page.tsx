"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EstadoBadgeOT, type EstadoOT } from "@/components/ordenes-trabajo/EstadoBadgeOT";
import { CambiarEstadoDialog } from "@/components/ordenes-trabajo/CambiarEstadoDialog";
import { FormOT, type FormOTValues, type InsumoItem } from "@/components/ordenes-trabajo/FormOT";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OTRow {
  id: number;
  numero: string;
  cotizacion_id: number;
  recepcion_id: number | null;
  vehiculo_id: number;
  cliente_id: number;
  mecanico_id: number | null;
  puesto_id: number | null;
  insumos: string;
  diagnostico: string | null;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  estado: EstadoOT;
  created_at: string;
  updated_at: string;
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
  mecanico: {
    id: number;
    nombre: string;
    rut: string;
  } | null;
  puesto: {
    id: number;
    nombre: string;
    tipo: string;
  } | null;
  cotizacion: {
    id: number;
    numero: string;
    total: number;
    estado: string;
  } | null;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            {["N° OT", "Patente", "Marca y Modelo", "Cliente", "Mecánico", "Estado", "Acciones"].map(
              (h) => (
                <TableHead key={h} className="font-semibold text-zinc-700">
                  {h}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((_, j) => (
                <TableCell key={j}>
                  <div className="h-4 bg-zinc-100 rounded animate-pulse w-24" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrdenesTrabajoPAge() {
  const [ots, setOTs] = useState<OTRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Nueva OT dialog
  const [nuevaOTOpen, setNuevaOTOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cambiar estado dialog
  const [cambiarEstadoOT, setCambiarEstadoOT] = useState<OTRow | null>(null);
  const [cambiarEstadoLoading, setCambiarEstadoLoading] = useState(false);

  // Editar dialog
  const [editandoOT, setEditandoOT] = useState<OTRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const fetchOTs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/ordenes-trabajo");
      if (!res.ok) throw new Error("Error al cargar órdenes de trabajo");
      const data = (await res.json()) as OTRow[];
      setOTs(data);
    } catch {
      setErrorMsg("No se pudieron cargar las órdenes de trabajo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOTs();
  }, [fetchOTs]);

  // ── Crear OT ──────────────────────────────────────────────────────────────
  const handleCrear = async (values: FormOTValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/ordenes-trabajo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al crear OT");
      }
      setNuevaOTOpen(false);
      await fetchOTs();
    } finally {
      setSaving(false);
    }
  };

  // ── Cambiar estado ────────────────────────────────────────────────────────
  const handleCambiarEstado = async (nuevoEstado: EstadoOT) => {
    if (!cambiarEstadoOT) return;
    setCambiarEstadoLoading(true);
    try {
      const res = await fetch(`/api/ordenes-trabajo/${cambiarEstadoOT.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar estado");
      }
      setCambiarEstadoOT(null);
      await fetchOTs();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al cambiar estado");
    } finally {
      setCambiarEstadoLoading(false);
    }
  };

  // ── Editar OT ─────────────────────────────────────────────────────────────
  const handleEditar = async (values: FormOTValues) => {
    if (!editandoOT) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/ordenes-trabajo/${editandoOT.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostico: values.diagnostico,
          mecanico_id: values.mecanico_id,
          puesto_id: values.puesto_id,
          insumos: values.insumos,
          fecha_hora_inicio: values.fecha_hora_inicio,
          fecha_hora_fin: values.fecha_hora_fin,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar OT");
      }
      setEditandoOT(null);
      await fetchOTs();
    } finally {
      setEditLoading(false);
    }
  };

  const getEditInitialValues = (ot: OTRow): Partial<FormOTValues> => {
    let insumos: InsumoItem[] = [];
    try {
      insumos = JSON.parse(ot.insumos ?? "[]") as InsumoItem[];
    } catch {
      insumos = [];
    }
    return {
      cotizacion_id: ot.cotizacion_id,
      recepcion_id: ot.recepcion_id,
      vehiculo_id: ot.vehiculo_id,
      cliente_id: ot.cliente_id,
      mecanico_id: ot.mecanico_id,
      puesto_id: ot.puesto_id,
      insumos,
      diagnostico: ot.diagnostico,
      fecha_hora_inicio: ot.fecha_hora_inicio,
      fecha_hora_fin: ot.fecha_hora_fin,
    };
  };

  // Jefe puede avanzar todos los estados si no hay mecánico; si hay mecánico, solo puede entregar
  const puedeAvanzarJefe = (ot: OTRow) =>
    ot.mecanico_id === null
      ? ot.estado !== "entregado"
      : ot.estado === "listo_para_entregar";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Órdenes de trabajo</h1>
          <p className="text-zinc-500 mt-1 text-sm">Gestión de órdenes de trabajo del taller</p>
        </div>
        <Button onClick={() => setNuevaOTOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva OT
        </Button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Skeleton />
      ) : ots.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 flex flex-col items-center justify-center text-center">
          <p className="text-zinc-500 text-sm">No hay órdenes de trabajo registradas.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="font-semibold text-zinc-700">N° OT</TableHead>
                <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Patente</TableHead>
                <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Marca y Modelo</TableHead>
                <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Cliente</TableHead>
                <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Mecánico</TableHead>
                <TableHead className="font-semibold text-zinc-700">Estado</TableHead>
                <TableHead className="font-semibold text-zinc-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ots.map((ot) => (
                <TableRow key={ot.id} className="hover:bg-zinc-50/50">
                  <TableCell className="font-mono font-medium text-zinc-900">
                    {ot.numero}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-zinc-900 hidden md:table-cell">
                    {ot.vehiculo?.patente ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-700 hidden md:table-cell">
                    {ot.vehiculo
                      ? `${ot.vehiculo.marca} ${ot.vehiculo.modelo}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-700 hidden md:table-cell">
                    {ot.cliente?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="text-zinc-600 text-sm hidden md:table-cell">
                    {ot.mecanico?.nombre ?? (
                      <span className="text-zinc-400 text-xs">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <EstadoBadgeOT estado={ot.estado} sinRecepcion={ot.recepcion_id === null} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Ver */}
                      <Link
                        href={`/ordenes-trabajo/${ot.id}`}
                        className="inline-flex items-center justify-center size-7 rounded-[min(var(--radius-md),12px)] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="size-4" />
                      </Link>

                      {/* Editar */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar"
                        onClick={() => setEditandoOT(ot)}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      {/* Cambiar estado — jefe puede avanzar si no hay mecánico o si está listo para entregar */}
                      {puedeAvanzarJefe(ot) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          onClick={() => setCambiarEstadoOT(ot)}
                          title="Cambiar estado"
                        >
                          Cambiar estado
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Nueva OT */}
      <Dialog open={nuevaOTOpen} onOpenChange={(open) => setNuevaOTOpen(open)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva orden de trabajo</DialogTitle>
          </DialogHeader>
          <FormOT
            mode="create"
            loading={saving}
            onCancel={() => setNuevaOTOpen(false)}
            onSubmit={handleCrear}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Editar OT */}
      <Dialog open={!!editandoOT} onOpenChange={(o) => { if (!o) setEditandoOT(null); }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar OT — {editandoOT?.numero ?? ""}
            </DialogTitle>
          </DialogHeader>
          {editandoOT && (
            <FormOT
              mode="edit"
              cotizacionId={editandoOT.cotizacion_id}
              otId={editandoOT.id}
              initialValues={getEditInitialValues(editandoOT)}
              loading={editLoading}
              onCancel={() => setEditandoOT(null)}
              onSubmit={handleEditar}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Cambiar Estado */}
      {cambiarEstadoOT && (
        <CambiarEstadoDialog
          ot={cambiarEstadoOT}
          open={!!cambiarEstadoOT}
          onOpenChange={(o) => { if (!o) setCambiarEstadoOT(null); }}
          onConfirm={handleCambiarEstado}
          loading={cambiarEstadoLoading}
          jefeOnly={cambiarEstadoOT.mecanico_id !== null}
          sinRecepcion={cambiarEstadoOT.recepcion_id === null}
        />
      )}
    </div>
  );
}
