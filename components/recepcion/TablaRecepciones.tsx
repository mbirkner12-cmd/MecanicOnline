"use client";

import { useState } from "react";
import Link from "next/link";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EstadoBadge, type EstadoRecepcion } from "@/components/recepcion/EstadoBadge";
import { FormRecepcion, type FormRecepcionValues } from "@/components/recepcion/FormRecepcion";
import { Eye, Pencil, Trash2, FileText, ClipboardList, AlertTriangle } from "lucide-react";
import { getAlertaDocumentos } from "@/lib/utils/documentos";
import { FormCotizacion, type FormCotizacionValues } from "@/components/cotizaciones/FormCotizacion";
import { FormOT, type FormOTValues } from "@/components/ordenes-trabajo/FormOT";

// ── Types ─────────────────────────────────────────────────────────────────
export interface RecepcionRow {
  id: number;
  vehiculo_id: number;
  cliente_id: number;
  fecha_hora_ingreso: string;
  kilometraje: number;
  nivel_bencina: string | null;
  foto_tablero_url: string | null;
  fotos_urls: string;
  mecanico_id: number | null;
  puesto_id: number | null;
  estado: EstadoRecepcion;
  motivo_ingreso: string | null;
  created_at: string;
  updated_at: string;
  vehiculo: {
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
    revision_tecnica_vencimiento: string | null;
    permiso_circulacion_vencimiento: string | null;
  } | null;
  cliente: {
    id: number;
    rut: string;
    nombre: string;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
    whatsapp?: string | null;
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
}

interface TablaRecepcionesProps {
  recepciones: RecepcionRow[];
  onRefresh: () => void;
}

// ── Skeleton ──────────────────────────────────────────────────────────────
export function TablaRecepcionesSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patente</TableHead>
            <TableHead>Marca y Modelo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Mecánico</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
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

// ── Main Component ────────────────────────────────────────────────────────
export function TablaRecepciones({ recepciones, onRefresh }: TablaRecepcionesProps) {
  const [editando, setEditando] = useState<RecepcionRow | null>(null);
  const [eliminando, setEliminando] = useState<RecepcionRow | null>(null);
  const [cotizandoRecepcion, setCotizandoRecepcion] = useState<RecepcionRow | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // OT dialog state
  const [otCotizacionId, setOtCotizacionId] = useState<number | null>(null);
  const [creandoOT, setCreandoOT] = useState(false);
  const [loadingOT, setLoadingOT] = useState(false);
  const [loadingCrearOT, setLoadingCrearOT] = useState(false);

  const handleEditar = (r: RecepcionRow) => {
    setErrorMsg("");
    setEditando(r);
  };

  const handleEliminar = (r: RecepcionRow) => {
    setErrorMsg("");
    setEliminando(r);
  };

  const handleConfirmEliminar = async () => {
    if (!eliminando) return;
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/recepciones/${eliminando.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al eliminar");
      }
      setEliminando(null);
      onRefresh();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Error al eliminar recepción");
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleSubmitEdit = async (values: FormRecepcionValues) => {
    if (!editando) return;
    setLoadingEdit(true);
    try {
      // Actualizar datos del cliente si cambió
      if (editando.cliente_id && values.rut_cliente) {
        await fetch(`/api/clientes/${editando.cliente_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rut: values.rut_cliente,
            nombre: values.nombre_cliente,
            telefono: values.telefono_cliente || null,
            correo: values.correo_cliente || null,
            direccion: values.direccion_cliente || null,
            whatsapp: values.whatsapp_cliente || null,
          }),
        });
      }

      // Actualizar datos del vehículo (documentos)
      if (editando.vehiculo_id) {
        await fetch(`/api/vehiculos/${editando.vehiculo_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision_tecnica_url: values.revision_tecnica_url || null,
            revision_tecnica_vencimiento: values.revision_tecnica_vencimiento || null,
            permiso_circulacion_url: values.permiso_circulacion_url || null,
            permiso_circulacion_vencimiento: values.permiso_circulacion_vencimiento || null,
          }),
        });
      }

      // Actualizar la recepción
      const res = await fetch(`/api/recepciones/${editando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kilometraje: Number(values.kilometraje),
          nivel_bencina: values.nivel_bencina || null,
          foto_tablero_url: values.foto_tablero_url || null,
          fotos_urls: values.fotos_urls,
          mecanico_id: values.mecanico_id ? Number(values.mecanico_id) : null,
          puesto_id: values.puesto_id ? Number(values.puesto_id) : null,
          motivo_ingreso: values.motivo_ingreso || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar");
      }

      setEditando(null);
      onRefresh();
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleCrearCotizacion = async (values: FormCotizacionValues) => {
    setLoadingCotizacion(true);
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
      setCotizandoRecepcion(null);
      onRefresh();
    } finally {
      setLoadingCotizacion(false);
    }
  };

  const handleAbrirCrearOT = async (r: RecepcionRow) => {
    setErrorMsg("");
    setLoadingOT(true);
    try {
      // Buscar la cotización aceptada para esta recepción
      const res = await fetch("/api/cotizaciones");
      if (!res.ok) throw new Error("Error al cargar cotizaciones");
      const data = (await res.json()) as Array<{ id: number; recepcion_id: number; estado: string }>;
      const cot = data.find(
        (c) => c.recepcion_id === r.id && c.estado === "aceptada"
      );
      if (!cot) {
        setErrorMsg("No se encontró una cotización aceptada para esta recepción.");
        return;
      }
      setOtCotizacionId(cot.id);
      setCreandoOT(true);
    } catch {
      setErrorMsg("Error al buscar la cotización.");
    } finally {
      setLoadingOT(false);
    }
  };

  const handleCrearOT = async (values: FormOTValues) => {
    setLoadingCrearOT(true);
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
      setCreandoOT(false);
      setOtCotizacionId(null);
      onRefresh();
    } finally {
      setLoadingCrearOT(false);
    }
  };

  const getInitialValues = (r: RecepcionRow): Partial<FormRecepcionValues> => {
    let fotosUrls: string[] = [];
    try {
      fotosUrls = JSON.parse(r.fotos_urls) as string[];
    } catch {
      fotosUrls = [];
    }
    return {
      vehiculo_id: r.vehiculo_id,
      patente: r.vehiculo?.patente ?? "",
      marca: r.vehiculo?.marca ?? "",
      modelo: r.vehiculo?.modelo ?? "",
      anio: String(r.vehiculo?.anio ?? ""),
      kilometraje: String(r.kilometraje),
      nivel_bencina: r.nivel_bencina ?? "",
      foto_tablero_url: r.foto_tablero_url ?? "",
      fotos_urls: fotosUrls,
      revision_tecnica_vencimiento: r.vehiculo?.revision_tecnica_vencimiento ?? "",
      permiso_circulacion_vencimiento: r.vehiculo?.permiso_circulacion_vencimiento ?? "",
      cliente_id: r.cliente_id,
      rut_cliente: r.cliente?.rut ?? "",
      nombre_cliente: r.cliente?.nombre ?? "",
      telefono_cliente: r.cliente?.telefono ?? "",
      correo_cliente: r.cliente?.correo ?? "",
      direccion_cliente: r.cliente?.direccion ?? "",
      whatsapp_cliente: r.cliente?.whatsapp ?? "",
      mecanico_id: r.mecanico_id ? String(r.mecanico_id) : "",
      puesto_id: r.puesto_id ? String(r.puesto_id) : "",
      motivo_ingreso: r.motivo_ingreso ?? "",
    };
  };

  if (recepciones.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 flex flex-col items-center justify-center text-center">
        <p className="text-zinc-500 text-sm">No hay recepciones registradas.</p>
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="font-semibold text-zinc-700">Patente</TableHead>
              <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Marca y Modelo</TableHead>
              <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Cliente</TableHead>
              <TableHead className="font-semibold text-zinc-700 hidden md:table-cell">Mecánico</TableHead>
              <TableHead className="font-semibold text-zinc-700">Estado</TableHead>
              <TableHead className="font-semibold text-zinc-700">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recepciones.map((r) => (
              <TableRow key={r.id} className="hover:bg-zinc-50/50">
                <TableCell className="font-mono font-medium text-zinc-900">
                  <span className="inline-flex items-center gap-1">
                    {r.vehiculo?.patente ?? "—"}
                    {(() => {
                      const alerta = getAlertaDocumentos(
                        r.vehiculo?.revision_tecnica_vencimiento,
                        r.vehiculo?.permiso_circulacion_vencimiento
                      );
                      if (alerta === 'vencido') {
                        return <span title="Documento vencido"><AlertTriangle className="size-3.5 text-red-500 shrink-0" /></span>;
                      }
                      if (alerta === 'por_vencer') {
                        return <span title="Documento por vencer"><AlertTriangle className="size-3.5 text-orange-500 shrink-0" /></span>;
                      }
                      return null;
                    })()}
                  </span>
                </TableCell>
                <TableCell className="text-zinc-700 hidden md:table-cell">
                  {r.vehiculo
                    ? `${r.vehiculo.marca} ${r.vehiculo.modelo}`
                    : "—"}
                </TableCell>
                <TableCell className="text-zinc-700 hidden md:table-cell">
                  {r.cliente?.nombre ?? "—"}
                </TableCell>
                <TableCell className="text-zinc-600 text-sm hidden md:table-cell">
                  {r.mecanico?.nombre ?? <span className="text-zinc-400 text-xs">Sin asignar</span>}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={r.estado} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Ver */}
                    <Link
                      href={`/recepcion/${r.id}`}
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
                      onClick={() => handleEditar(r)}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    {/* Eliminar */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Eliminar"
                      onClick={() => handleEliminar(r)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    {/* Crear cotización — solo si está en diagnóstico o rechazada */}
                    {(r.estado === "en_diagnostico" ||
                      r.estado === "cotizacion_rechazada") && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Crear cotización"
                        onClick={() => setCotizandoRecepcion(r)}
                      >
                        <FileText className="size-4" />
                      </Button>
                    )}

                    {/* Crear OT — solo si cotización aceptada */}
                    {r.estado === "con_ot_activa" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Crear OT"
                        disabled={loadingOT}
                        onClick={() => handleAbrirCrearOT(r)}
                      >
                        <ClipboardList className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Editar */}
      <Dialog open={!!editando} onOpenChange={(o) => { if (!o) setEditando(null); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar recepción — {editando?.vehiculo?.patente ?? ""}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <FormRecepcion
              mode="edit"
              initialValues={getInitialValues(editando)}
              loading={loadingEdit}
              onCancel={() => setEditando(null)}
              onSubmit={handleSubmitEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminar */}
      <ConfirmDialog
        open={!!eliminando}
        onOpenChange={(o) => { if (!o) setEliminando(null); }}
        title="Eliminar recepción"
        description={`¿Estás seguro de que deseas eliminar la recepción del vehículo ${eliminando?.vehiculo?.patente ?? ""}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleConfirmEliminar}
        loading={loadingDelete}
      />

      {/* Dialog Crear Cotización */}
      <Dialog
        open={!!cotizandoRecepcion}
        onOpenChange={(o) => { if (!o) setCotizandoRecepcion(null); }}
      >
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nueva cotización — {cotizandoRecepcion?.vehiculo?.patente ?? ""}
            </DialogTitle>
          </DialogHeader>
          {cotizandoRecepcion && (
            <FormCotizacion
              mode="create"
              recepcionId={cotizandoRecepcion.id}
              loading={loadingCotizacion}
              onCancel={() => setCotizandoRecepcion(null)}
              onSubmit={handleCrearCotizacion}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Crear OT */}
      <Dialog
        open={creandoOT}
        onOpenChange={(o) => {
          if (!o) {
            setCreandoOT(false);
            setOtCotizacionId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva orden de trabajo</DialogTitle>
          </DialogHeader>
          {otCotizacionId && (
            <FormOT
              mode="create"
              cotizacionId={otCotizacionId}
              loading={loadingCrearOT}
              onCancel={() => {
                setCreandoOT(false);
                setOtCotizacionId(null);
              }}
              onSubmit={handleCrearOT}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
