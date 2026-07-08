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
import { EstadoBadgeOT, type EstadoOT } from "@/components/ordenes-trabajo/EstadoBadgeOT";
import { CambiarEstadoDialog } from "@/components/ordenes-trabajo/CambiarEstadoDialog";
import { FormOT, type FormOTValues, type InsumoItem } from "@/components/ordenes-trabajo/FormOT";
import { ArrowLeft, Pencil, Car, User, Wrench, Calendar, FileText, Package } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface OTDetalle {
  id: number;
  numero: string;
  cotizacion_id: number;
  recepcion_id: number;
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
    mano_de_obra_detalle: string | null;
    mano_de_obra_monto: number;
    repuestos: string;
    retiro_entrega_monto: number;
    estado: string;
  } | null;
  recepcion: {
    id: number;
    estado: string;
    fecha_hora_ingreso: string;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
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

function formatPesos(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

// El jefe solo puede marcar como entregado (el mecánico maneja los estados anteriores)
const SIGUIENTE_ESTADO: Record<string, EstadoOT> = {
  listo_para_entregar: "entregado",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function OTDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ot, setOT] = useState<OTDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editar diagnóstico inline
  const [editDiagnostico, setEditDiagnostico] = useState(false);
  const [diagnosticoTemp, setDiagnosticoTemp] = useState("");
  const [savingDiagnostico, setSavingDiagnostico] = useState(false);

  // Cambiar estado
  const [cambiarEstadoOpen, setCambiarEstadoOpen] = useState(false);
  const [cambiarEstadoLoading, setCambiarEstadoLoading] = useState(false);

  // Editar OT
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const fetchOT = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ordenes-trabajo/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Orden de trabajo no encontrada.");
          return;
        }
        throw new Error("Error al cargar");
      }
      const data = (await res.json()) as OTDetalle;
      setOT(data);
      setDiagnosticoTemp(data.diagnostico ?? "");
    } catch {
      setError("No se pudo cargar la orden de trabajo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOT();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Guardar diagnóstico inline ────────────────────────────────────────────
  const handleGuardarDiagnostico = async () => {
    if (!ot) return;
    setSavingDiagnostico(true);
    try {
      const res = await fetch(`/api/ordenes-trabajo/${ot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnostico: diagnosticoTemp || null }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setEditDiagnostico(false);
      await fetchOT();
    } finally {
      setSavingDiagnostico(false);
    }
  };

  // ── Cambiar estado ────────────────────────────────────────────────────────
  const handleCambiarEstado = async (nuevoEstado: EstadoOT) => {
    if (!ot) return;
    setCambiarEstadoLoading(true);
    try {
      const res = await fetch(`/api/ordenes-trabajo/${ot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      setCambiarEstadoOpen(false);
      await fetchOT();
    } finally {
      setCambiarEstadoLoading(false);
    }
  };

  // ── Editar OT ─────────────────────────────────────────────────────────────
  const handleEditar = async (values: FormOTValues) => {
    if (!ot) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/ordenes-trabajo/${ot.id}`, {
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
        throw new Error(data.error ?? "Error al actualizar");
      }
      setEditOpen(false);
      await fetchOT();
    } finally {
      setEditLoading(false);
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-zinc-100 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !ot) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/ordenes-trabajo"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <p className="text-red-600">{error || "Orden de trabajo no encontrada."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push("/ordenes-trabajo")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-900">{ot.numero}</h1>
                <EstadoBadgeOT estado={ot.estado} />
              </div>
              <p className="text-zinc-500 text-sm mt-0.5">
                Creada: {formatFecha(ot.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {SIGUIENTE_ESTADO[ot.estado] && (
              <Button
                variant="outline"
                onClick={() => setCambiarEstadoOpen(true)}
                className="flex items-center gap-2"
              >
                Cambiar estado
              </Button>
            )}
            <Button onClick={() => setEditOpen(true)} className="flex items-center gap-2">
              <Pencil className="size-4" />
              Editar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Vehículo */}
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
                  <dd className="font-mono font-semibold text-zinc-900">
                    {ot.vehiculo?.patente ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Marca</dt>
                  <dd className="text-zinc-700">{ot.vehiculo?.marca ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Modelo</dt>
                  <dd className="text-zinc-700">{ot.vehiculo?.modelo ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Año</dt>
                  <dd className="text-zinc-700">{ot.vehiculo?.anio ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Km actual</dt>
                  <dd className="text-zinc-700">
                    {ot.vehiculo?.kilometraje_actual
                      ? `${ot.vehiculo.kilometraje_actual.toLocaleString("es-CL")} km`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card Cliente */}
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
                  <dd className="font-medium text-zinc-900">
                    {ot.cliente?.nombre ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">RUT</dt>
                  <dd className="text-zinc-700">{ot.cliente?.rut ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Teléfono</dt>
                  <dd className="text-zinc-700">{ot.cliente?.telefono ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card Mecánico y Puesto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wrench className="size-4 text-zinc-500" />
                Mecánico y puesto asignados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Mecánico</dt>
                  <dd className="text-zinc-700">
                    {ot.mecanico?.nombre ?? (
                      <span className="text-zinc-400">Sin asignar</span>
                    )}
                  </dd>
                </div>
                {ot.mecanico && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">RUT mecánico</dt>
                    <dd className="text-zinc-700">{ot.mecanico.rut}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-100 pt-2">
                  <dt className="text-zinc-500">Puesto</dt>
                  <dd className="text-zinc-700">
                    {ot.puesto ? (
                      <>
                        {ot.puesto.nombre}{" "}
                        <span className="text-zinc-400 text-xs">({ot.puesto.tipo})</span>
                      </>
                    ) : (
                      <span className="text-zinc-400">Sin asignar</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Card Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-zinc-500" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Inicio reparación</dt>
                  <dd className="text-zinc-700">{formatFecha(ot.fecha_hora_inicio)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Fin reparación</dt>
                  <dd className="text-zinc-700">{formatFecha(ot.fecha_hora_fin)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Card Diagnóstico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Diagnóstico</span>
              {!editDiagnostico && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setDiagnosticoTemp(ot.diagnostico ?? "");
                    setEditDiagnostico(true);
                  }}
                >
                  <Pencil className="size-3 mr-1" />
                  Editar diagnóstico
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editDiagnostico ? (
              <div className="flex flex-col gap-3">
                <textarea
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                  value={diagnosticoTemp}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDiagnosticoTemp(v ? v.charAt(0).toUpperCase() + v.slice(1) : v);
                  }}
                  spellCheck={true}
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  lang="es"
                  rows={4}
                  placeholder="Descripción del diagnóstico técnico..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditDiagnostico(false)}
                    disabled={savingDiagnostico}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGuardarDiagnostico}
                    disabled={savingDiagnostico}
                  >
                    {savingDiagnostico ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {ot.diagnostico || (
                  <span className="text-zinc-400 italic">Sin diagnóstico registrado.</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card Insumos y materiales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="size-4 text-zinc-500" />
              Insumos y materiales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              let insumos: InsumoItem[] = [];
              try {
                insumos = JSON.parse(ot.insumos ?? "[]") as InsumoItem[];
              } catch {
                insumos = [];
              }
              if (insumos.length === 0) {
                return (
                  <p className="text-sm text-zinc-400 italic">Sin insumos registrados.</p>
                );
              }
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left py-1.5 text-xs font-semibold text-zinc-500 w-full">
                        Detalle
                      </th>
                      <th className="text-right py-1.5 text-xs font-semibold text-zinc-500 pr-4 whitespace-nowrap">
                        Cantidad
                      </th>
                      <th className="text-left py-1.5 text-xs font-semibold text-zinc-500 whitespace-nowrap">
                        Unidad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.map((item, i) => (
                      <tr key={i} className="border-b border-zinc-50 last:border-0">
                        <td className="py-1.5 text-zinc-700">{item.detalle || "—"}</td>
                        <td className="py-1.5 text-zinc-700 text-right pr-4">{item.cantidad}</td>
                        <td className="py-1.5 text-zinc-500">{item.unidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </CardContent>
        </Card>

        {/* Resumen cotización */}
        {ot.cotizacion && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-zinc-500" />
                Resumen cotización ({ot.cotizacion.numero})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Mano de obra</dt>
                  <dd className="text-zinc-700">
                    {formatPesos(ot.cotizacion.mano_de_obra_monto ?? 0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Retiro y entrega</dt>
                  <dd className="text-zinc-700">
                    {formatPesos(ot.cotizacion.retiro_entrega_monto ?? 0)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-2">
                  <dt className="font-semibold text-zinc-900">Total general</dt>
                  <dd className="font-bold text-zinc-900">
                    {formatPesos(ot.cotizacion.total ?? 0)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Cambiar Estado */}
      {ot && SIGUIENTE_ESTADO[ot.estado] && (
        <CambiarEstadoDialog
          ot={ot}
          open={cambiarEstadoOpen}
          onOpenChange={(o) => { if (!o) setCambiarEstadoOpen(false); }}
          onConfirm={handleCambiarEstado}
          loading={cambiarEstadoLoading}
        />
      )}

      {/* Dialog Editar OT */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar OT — {ot.numero}</DialogTitle>
          </DialogHeader>
          <FormOT
            mode="edit"
            cotizacionId={ot.cotizacion_id}
            otId={ot.id}
            initialValues={{
              cotizacion_id: ot.cotizacion_id,
              recepcion_id: ot.recepcion_id,
              vehiculo_id: ot.vehiculo_id,
              cliente_id: ot.cliente_id,
              mecanico_id: ot.mecanico_id,
              puesto_id: ot.puesto_id,
              insumos: (() => { try { return JSON.parse(ot.insumos ?? '[]') as InsumoItem[]; } catch { return []; } })(),
              diagnostico: ot.diagnostico,
              fecha_hora_inicio: ot.fecha_hora_inicio,
              fecha_hora_fin: ot.fecha_hora_fin,
            }}
            loading={editLoading}
            onCancel={() => setEditOpen(false)}
            onSubmit={handleEditar}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
