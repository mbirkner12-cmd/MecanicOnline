"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadgeCot, type EstadoCotizacion } from "@/components/cotizaciones/EstadoBadgeCot";
import { FormCotizacion, type FormCotizacionValues, type RepuestoItem, type ManoDeObraItem } from "@/components/cotizaciones/FormCotizacion";
import { ArrowLeft, Pencil, FileText, Car, User, ClipboardList, Truck } from "lucide-react";
import { FormRecepcion, type FormRecepcionValues } from "@/components/recepcion/FormRecepcion";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CotizacionDetalle {
  id: number;
  numero: string;
  recepcion_id: number | null;
  vehiculo_id: number;
  cliente_id: number;
  mano_de_obra_detalle: string | null;
  mano_de_obra_monto: number;
  repuestos: string;
  recomendaciones: string;
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
  recepcion: {
    id: number;
    diagnostico_mecanico?: string | null;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatPesos(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function parseRepuestos(raw: string | null | undefined): RepuestoItem[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (Array.isArray(parsed)) return parsed as RepuestoItem[];
  } catch { /* ignore */ }
  return [];
}

function parseManoDeObra(raw: string | null | undefined): ManoDeObraItem[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (Array.isArray(parsed)) return parsed as ManoDeObraItem[];
  } catch { /* ignore */ }
  return [];
}

// ── Shared repuestos table ─────────────────────────────────────────────────────
function RepuestosCard({ title, items, subtotalLabel }: { title: string; items: RepuestoItem[]; subtotalLabel: string }) {
  const subtotal = items.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Sin ítems</p>
        ) : (
          <div className="rounded-lg overflow-hidden border border-zinc-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50">
                  <TableHead className="text-xs">Detalle</TableHead>
                  <TableHead className="text-xs text-center w-20">Cant.</TableHead>
                  <TableHead className="text-xs text-center w-20">Unidad</TableHead>
                  <TableHead className="text-xs text-right w-28">V. Unit.</TableHead>
                  <TableHead className="text-xs text-right w-28">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{item.detalle}</TableCell>
                    <TableCell className="text-sm text-center">{item.cantidad}</TableCell>
                    <TableCell className="text-sm text-center">{item.unidad}</TableCell>
                    <TableCell className="text-sm text-right">{formatPesos(item.valor_unitario)}</TableCell>
                    <TableCell className="text-sm text-right">{formatPesos(item.monto_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {items.length > 0 && (
          <div className="flex justify-between mt-3 pt-3 border-t border-zinc-100">
            <span className="text-sm text-zinc-500">{subtotalLabel}</span>
            <span className="font-medium text-zinc-900">{formatPesos(subtotal)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CotizacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cotizacion, setCotizacion] = useState<CotizacionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ingresarOpen, setIngresarOpen] = useState(false);
  const [savingIngreso, setSavingIngreso] = useState(false);

  const fetchCotizacion = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cotizaciones/${id}`);
      if (!res.ok) {
        if (res.status === 404) { setError("Cotización no encontrada."); return; }
        throw new Error("Error al cargar");
      }
      const data = (await res.json()) as CotizacionDetalle;
      setCotizacion(data);
    } catch {
      setError("No se pudo cargar la cotización.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotizacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (values: FormCotizacionValues) => {
    if (!cotizacion) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cotizaciones/${cotizacion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mano_de_obra_detalle: values.mano_de_obra_detalle,
          mano_de_obra_monto: values.mano_de_obra_monto,
          repuestos: values.repuestos,
          recomendaciones: values.recomendaciones,
          retiro_entrega_monto: values.retiro_entrega_monto,
          total: values.total,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar");
      }
      setEditOpen(false);
      await fetchCotizacion();
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: "aceptada" | "rechazada") => {
    if (!cotizacion) return;
    const confirmMsg =
      nuevoEstado === "aceptada"
        ? `¿Aceptar la cotización ${cotizacion.numero}?`
        : `¿Rechazar la cotización ${cotizacion.numero}?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/cotizaciones/${cotizacion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar");
      }
      await fetchCotizacion();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCrearRecepcion = async (values: FormRecepcionValues) => {
    if (!cotizacion) return;
    setSavingIngreso(true);
    try {
      const res = await fetch("/api/recepciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, cotizacion_id: cotizacion.id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al crear recepción");
      }
      setIngresarOpen(false);
      await fetchCotizacion();
    } finally {
      setSavingIngreso(false);
    }
  };

  const getInitialValues = (): Partial<FormCotizacionValues> => {
    if (!cotizacion) return {};
    return {
      recepcion_id: cotizacion.recepcion_id,
      vehiculo_id: cotizacion.vehiculo_id,
      cliente_id: cotizacion.cliente_id,
      mano_de_obra_detalle: cotizacion.mano_de_obra_detalle ?? "",
      mano_de_obra_monto: cotizacion.mano_de_obra_monto,
      repuestos: parseRepuestos(cotizacion.repuestos),
      recomendaciones: parseRepuestos(cotizacion.recomendaciones),
      retiro_entrega_monto: cotizacion.retiro_entrega_monto,
      total: cotizacion.total,
    };
  };

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-zinc-100 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !cotizacion) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/cotizaciones" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <p className="text-red-600">{error || "Cotización no encontrada."}</p>
      </div>
    );
  }

  const repuestos = parseRepuestos(cotizacion.repuestos);
  const recomendaciones = parseRepuestos(cotizacion.recomendaciones);
  const manoDeObraItems = parseManoDeObra(cotizacion.mano_de_obra_detalle);
  const totalRecomendaciones = recomendaciones.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push("/cotizaciones")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-900">{cotizacion.numero}</h1>
                <EstadoBadgeCot estado={cotizacion.estado} />
              </div>
              <p className="text-zinc-500 text-sm mt-0.5">Creada: {formatFecha(cotizacion.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {cotizacion.estado === "pendiente" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => handleCambiarEstado("aceptada")}
                  disabled={actionLoading}
                >
                  Aceptar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleCambiarEstado("rechazada")}
                  disabled={actionLoading}
                >
                  Rechazar
                </Button>
              </>
            )}
            <a href={`/api/cotizaciones/${cotizacion.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <FileText className="size-4" />
                PDF
              </Button>
            </a>
            <Button onClick={() => setEditOpen(true)} size="sm" className="flex items-center gap-1.5">
              <Pencil className="size-4" />
              Editar
            </Button>
          </div>
        </div>

        {/* Banner: cotización aceptada sin recepción */}
        {cotizacion.estado === "aceptada" && !cotizacion.recepcion_id && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Truck className="size-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Cotización aceptada — pendiente de ingreso</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Para crear la orden de trabajo, primero debe registrar el ingreso del vehículo al taller.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setIngresarOpen(true)}
            >
              Registrar ingreso
            </Button>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Car className="size-4 text-zinc-500" />
                Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Patente</dt>
                  <dd className="font-mono font-semibold text-zinc-900">{cotizacion.vehiculo?.patente ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Marca / Modelo</dt>
                  <dd className="text-zinc-700">
                    {cotizacion.vehiculo ? `${cotizacion.vehiculo.marca} ${cotizacion.vehiculo.modelo}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Año</dt>
                  <dd className="text-zinc-700">{cotizacion.vehiculo?.anio ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Kilometraje</dt>
                  <dd className="text-zinc-700">
                    {cotizacion.vehiculo?.kilometraje_actual
                      ? `${cotizacion.vehiculo.kilometraje_actual.toLocaleString("es-CL")} km`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="size-4 text-zinc-500" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Nombre</dt>
                  <dd className="font-medium text-zinc-900">{cotizacion.cliente?.nombre ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">RUT</dt>
                  <dd className="text-zinc-700">{cotizacion.cliente?.rut ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Teléfono</dt>
                  <dd className="text-zinc-700">{cotizacion.cliente?.telefono ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Correo</dt>
                  <dd className="text-zinc-700 truncate max-w-[18ch]">{cotizacion.cliente?.correo ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Diagnóstico del mecánico */}
        {cotizacion.recepcion?.diagnostico_mecanico && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardList className="size-4 text-zinc-500" />
                Diagnóstico del mecánico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {cotizacion.recepcion.diagnostico_mecanico}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Mano de obra */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mano de obra</CardTitle>
          </CardHeader>
          <CardContent>
            {manoDeObraItems.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">Sin ítems de mano de obra</p>
            ) : (
              <div className="rounded-lg overflow-hidden border border-zinc-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      <TableHead className="text-xs">Descripción</TableHead>
                      <TableHead className="text-xs text-right w-36">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manoDeObraItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{item.detalle}</TableCell>
                        <TableCell className="text-sm text-right">{formatPesos(item.monto)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {manoDeObraItems.length > 0 && (
              <div className="flex justify-between mt-3 pt-3 border-t border-zinc-100">
                <span className="text-sm text-zinc-500">Subtotal mano de obra</span>
                <span className="font-medium text-zinc-900">{formatPesos(cotizacion.mano_de_obra_monto)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repuestos */}
        <RepuestosCard title="Repuestos" items={repuestos} subtotalLabel="Subtotal repuestos" />

        {/* Retiro y entrega + Total reparación */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">Retiro y entrega</span>
              <span className="text-sm text-zinc-700">{formatPesos(cotizacion.retiro_entrega_monto)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-zinc-200">
              <div>
                <span className="font-semibold text-zinc-900 block">Total reparación</span>
                <span className="text-xs text-zinc-400">Mano de obra + repuestos + retiro/entrega</span>
              </div>
              <span className="text-xl font-bold text-zinc-900">{formatPesos(cotizacion.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recomendaciones */}
        {recomendaciones.length > 0 && (
          <>
            <RepuestosCard
              title="Recomendaciones adicionales (opcional)"
              items={recomendaciones}
              subtotalLabel="Subtotal recomendaciones"
            />
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-amber-900 block text-sm">Si incluye recomendaciones</span>
                    <span className="text-xs text-amber-700">
                      {formatPesos(cotizacion.total)} reparación + {formatPesos(totalRecomendaciones)} recomendaciones
                    </span>
                  </div>
                  <span className="text-xl font-bold text-amber-900">
                    {formatPesos(cotizacion.total + totalRecomendaciones)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => router.push("/cotizaciones")}
          >
            <ArrowLeft className="size-4" />
            Volver a cotizaciones
          </Button>
        </div>
      </div>

      {/* Dialog Registrar ingreso */}
      <Dialog open={ingresarOpen} onOpenChange={(open) => setIngresarOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar ingreso del vehículo</DialogTitle>
          </DialogHeader>
          <FormRecepcion
            mode="create"
            loading={savingIngreso}
            onCancel={() => setIngresarOpen(false)}
            onSubmit={handleCrearRecepcion}
            initialValues={{
              vehiculo_id: cotizacion.vehiculo?.id,
              patente: cotizacion.vehiculo?.patente ?? "",
              marca: cotizacion.vehiculo?.marca ?? "",
              modelo: cotizacion.vehiculo?.modelo ?? "",
              anio: String(cotizacion.vehiculo?.anio ?? ""),
              kilometraje: String(cotizacion.vehiculo?.kilometraje_actual ?? ""),
              nivel_bencina: "",
              fotos_urls: [],
              cliente_id: cotizacion.cliente?.id,
              rut_cliente: cotizacion.cliente?.rut ?? "",
              nombre_cliente: cotizacion.cliente?.nombre ?? "",
              telefono_cliente: cotizacion.cliente?.telefono ?? "",
              correo_cliente: cotizacion.cliente?.correo ?? "",
              direccion_cliente: "",
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={(open) => setEditOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cotización — {cotizacion.numero}</DialogTitle>
          </DialogHeader>
          <FormCotizacion
            mode="edit"
            recepcionId={cotizacion.recepcion_id ?? undefined}
            initialValues={getInitialValues()}
            loading={saving}
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEdit}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
