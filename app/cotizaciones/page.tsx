"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Eye, FileText } from "lucide-react";
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
import { EstadoBadgeCot, type EstadoCotizacion } from "@/components/cotizaciones/EstadoBadgeCot";
import { FormCotizacion, type FormCotizacionValues } from "@/components/cotizaciones/FormCotizacion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CotizacionRow {
  id: number;
  numero: string;
  recepcion_id: number | null;
  vehiculo_id: number;
  cliente_id: number;
  mano_de_obra_detalle: string | null;
  mano_de_obra_monto: number;
  repuestos: string;
  retiro_entrega_monto: number;
  total: number;
  estado: EstadoCotizacion;
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPesos(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            {["N° Cotización", "Vehículo", "Cliente", "Total (c/IVA)", "Estado", "Acciones"].map((h) => (
              <TableHead key={h} className="font-semibold text-zinc-700">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
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
export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/cotizaciones");
      if (!res.ok) throw new Error("Error al cargar cotizaciones");
      const data = (await res.json()) as CotizacionRow[];
      setCotizaciones(data);
    } catch {
      setErrorMsg("No se pudieron cargar las cotizaciones. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  const handleCrear = async (values: FormCotizacionValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al crear cotización");
      }
      setDialogOpen(false);
      await fetchCotizaciones();
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (
    cot: CotizacionRow,
    nuevoEstado: "aceptada" | "rechazada"
  ) => {
    const confirmMsg =
      nuevoEstado === "aceptada"
        ? `¿Aceptar la cotización ${cot.numero}?`
        : `¿Rechazar la cotización ${cot.numero}?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(cot.id);
    try {
      const res = await fetch(`/api/cotizaciones/${cot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar");
      }
      await fetchCotizaciones();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cotizaciones</h1>
          <p className="text-zinc-500 mt-1 text-sm">Gestión de cotizaciones del taller</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva cotización
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
      ) : cotizaciones.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 flex flex-col items-center justify-center text-center">
          <p className="text-zinc-500 text-sm">No hay cotizaciones registradas.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="font-semibold text-zinc-700">N° Cotización</TableHead>
                <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Vehículo</TableHead>
                <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Cliente</TableHead>
                <TableHead className="font-semibold text-zinc-700">Total (c/IVA)</TableHead>
                <TableHead className="font-semibold text-zinc-700">Estado</TableHead>
                <TableHead className="font-semibold text-zinc-700">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotizaciones.map((cot) => (
                <TableRow key={cot.id} className="hover:bg-zinc-50/50">
                  <TableCell className="font-mono font-medium text-zinc-900">
                    {cot.numero}
                  </TableCell>
                  <TableCell className="text-zinc-700 hidden md:table-cell">
                    {cot.vehiculo
                      ? `${cot.vehiculo.patente} — ${cot.vehiculo.marca} ${cot.vehiculo.modelo}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-700 hidden md:table-cell">
                    {cot.cliente?.nombre ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium text-zinc-900">
                    {formatPesos(Math.round(cot.total * 1.19))}
                  </TableCell>
                  <TableCell>
                    <EstadoBadgeCot estado={cot.estado} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Ver detalle */}
                      <Link
                        href={`/cotizaciones/${cot.id}`}
                        className="inline-flex items-center justify-center size-7 rounded-[min(var(--radius-md),12px)] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="size-4" />
                      </Link>

                      {/* PDF */}
                      <a
                        href={`/api/cotizaciones/${cot.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center size-7 rounded-[min(var(--radius-md),12px)] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                        title="Descargar PDF"
                      >
                        <FileText className="size-4" />
                      </a>

                      {/* Aceptar / Rechazar — solo si pendiente */}
                      {cot.estado === "pendiente" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-green-700 hover:bg-green-50 hover:text-green-800"
                            onClick={() => handleCambiarEstado(cot, "aceptada")}
                            disabled={actionLoading === cot.id}
                            title="Aceptar cotización"
                          >
                            Aceptar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleCambiarEstado(cot, "rechazada")}
                            disabled={actionLoading === cot.id}
                            title="Rechazar cotización"
                          >
                            Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Nueva Cotización */}
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva cotización</DialogTitle>
          </DialogHeader>
          <FormCotizacion
            mode="create"
            loading={saving}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleCrear}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
