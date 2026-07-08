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
import { EstadoBadge, type EstadoRecepcion } from "@/components/recepcion/EstadoBadge";
import { FormRecepcion, type FormRecepcionValues } from "@/components/recepcion/FormRecepcion";
import { ArrowLeft, Pencil, Car, User, Wrench, X, Stethoscope, FileText, Phone } from "lucide-react";
import { getEstadoDocumento, getAlertaDocumentos, formatFechaVencimiento, type EstadoDocumento } from "@/lib/utils/documentos";
import { DiagnosticoDisplay } from "@/components/diagnostico/DiagnosticoDisplay";

// ── Types ──────────────────────────────────────────────────────────────────
interface RecepcionDetalle {
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
  diagnostico_mecanico: string | null;
  created_at: string;
  updated_at: string;
  vehiculo: {
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
    revision_tecnica_url?: string | null;
    revision_tecnica_vencimiento?: string | null;
    permiso_circulacion_url?: string | null;
    permiso_circulacion_vencimiento?: string | null;
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

// ── Helpers ────────────────────────────────────────────────────────────────
function BadgeDocumento({ estado }: { estado: EstadoDocumento }) {
  if (estado === 'sin_datos') return null;
  const config = {
    vigente: { label: 'Vigente', cls: 'bg-green-100 text-green-700' },
    por_vencer: { label: 'Por vencer', cls: 'bg-orange-100 text-orange-700' },
    vencido: { label: 'Vencida', cls: 'bg-red-100 text-red-700' },
  };
  const c = config[estado];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
}

const NIVEL_BENCINA_LABELS: Record<string, string> = {
  vacio: "Vacío",
  "1/4": "1/4",
  "1/2": "1/2",
  "3/4": "3/4",
  lleno: "Lleno",
};

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

// ── Component ──────────────────────────────────────────────────────────────
export default function RecepcionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [recepcion, setRecepcion] = useState<RecepcionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fetchRecepcion = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/recepciones/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Recepción no encontrada.");
          return;
        }
        throw new Error("Error al cargar");
      }
      const data = (await res.json()) as RecepcionDetalle;
      setRecepcion(data);
    } catch {
      setError("No se pudo cargar la recepción.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecepcion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (values: FormRecepcionValues) => {
    if (!recepcion) return;
    setSaving(true);
    try {
      // Actualizar datos del cliente
      if (recepcion.cliente_id) {
        await fetch(`/api/clientes/${recepcion.cliente_id}`, {
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
      if (recepcion.vehiculo_id) {
        await fetch(`/api/vehiculos/${recepcion.vehiculo_id}`, {
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

      // Actualizar recepción
      const res = await fetch(`/api/recepciones/${recepcion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kilometraje: Number(values.kilometraje),
          nivel_bencina: values.nivel_bencina || null,
          foto_tablero_url: values.foto_tablero_url || null,
          fotos_urls: values.fotos_urls,
          mecanico_id: values.mecanico_id ? Number(values.mecanico_id) : null,
          puesto_id: values.puesto_id ? Number(values.puesto_id) : null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al actualizar");
      }

      setEditOpen(false);
      await fetchRecepcion();
    } finally {
      setSaving(false);
    }
  };

  const getInitialValues = (): Partial<FormRecepcionValues> => {
    if (!recepcion) return {};
    let fotosUrls: string[] = [];
    try {
      fotosUrls = JSON.parse(recepcion.fotos_urls) as string[];
    } catch {
      fotosUrls = [];
    }
    return {
      vehiculo_id: recepcion.vehiculo_id,
      patente: recepcion.vehiculo?.patente ?? "",
      marca: recepcion.vehiculo?.marca ?? "",
      modelo: recepcion.vehiculo?.modelo ?? "",
      anio: String(recepcion.vehiculo?.anio ?? ""),
      kilometraje: String(recepcion.kilometraje),
      nivel_bencina: recepcion.nivel_bencina ?? "",
      foto_tablero_url: recepcion.foto_tablero_url ?? "",
      fotos_urls: fotosUrls,
      revision_tecnica_url: recepcion.vehiculo?.revision_tecnica_url ?? "",
      revision_tecnica_vencimiento: recepcion.vehiculo?.revision_tecnica_vencimiento ?? "",
      permiso_circulacion_url: recepcion.vehiculo?.permiso_circulacion_url ?? "",
      permiso_circulacion_vencimiento: recepcion.vehiculo?.permiso_circulacion_vencimiento ?? "",
      cliente_id: recepcion.cliente_id,
      rut_cliente: recepcion.cliente?.rut ?? "",
      nombre_cliente: recepcion.cliente?.nombre ?? "",
      telefono_cliente: recepcion.cliente?.telefono ?? "",
      correo_cliente: recepcion.cliente?.correo ?? "",
      direccion_cliente: recepcion.cliente?.direccion ?? "",
      whatsapp_cliente: recepcion.cliente?.whatsapp ?? "",
      mecanico_id: recepcion.mecanico_id ? String(recepcion.mecanico_id) : "",
      puesto_id: recepcion.puesto_id ? String(recepcion.puesto_id) : "",
    };
  };

  // ── Loading / Error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-zinc-100 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !recepcion) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/recepcion"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <p className="text-red-600">{error || "Recepción no encontrada."}</p>
      </div>
    );
  }

  let fotosUrls: string[] = [];
  try {
    fotosUrls = JSON.parse(recepcion.fotos_urls) as string[];
  } catch {
    fotosUrls = [];
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => router.push("/recepcion")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-900">
                  Recepción #{recepcion.id}
                </h1>
                <EstadoBadge estado={recepcion.estado} />
              </div>
              <p className="text-zinc-500 text-sm mt-0.5">
                Ingreso: {formatFecha(recepcion.fecha_hora_ingreso)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {recepcion.diagnostico_mecanico && (
              <a href={`/api/recepciones/${recepcion.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <FileText className="size-4" />
                  PDF Diagnóstico
                </Button>
              </a>
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
                    {recepcion.vehiculo?.patente ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Marca</dt>
                  <dd className="text-zinc-700">{recepcion.vehiculo?.marca ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Modelo</dt>
                  <dd className="text-zinc-700">{recepcion.vehiculo?.modelo ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Año</dt>
                  <dd className="text-zinc-700">{recepcion.vehiculo?.anio ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Km de ingreso</dt>
                  <dd className="text-zinc-700">
                    {recepcion.kilometraje.toLocaleString("es-CL")} km
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Nivel bencina</dt>
                  <dd className="text-zinc-700">
                    {recepcion.nivel_bencina
                      ? NIVEL_BENCINA_LABELS[recepcion.nivel_bencina] ??
                        recepcion.nivel_bencina
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
                    {recepcion.cliente?.nombre ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">RUT</dt>
                  <dd className="text-zinc-700">{recepcion.cliente?.rut ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Teléfono</dt>
                  <dd className="text-zinc-700">{recepcion.cliente?.telefono ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Correo</dt>
                  <dd className="text-zinc-700 truncate max-w-[16ch]">
                    {recepcion.cliente?.correo ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Dirección</dt>
                  <dd className="text-zinc-700 text-right max-w-[20ch] leading-snug">
                    {recepcion.cliente?.direccion ?? "—"}
                  </dd>
                </div>
                {recepcion.cliente?.whatsapp && (
                  <div className="flex justify-between items-start">
                    <dt className="text-zinc-500 flex items-center gap-1">
                      <Phone className="size-3" />
                      WhatsApp
                    </dt>
                    <dd className="text-right">
                      <span className="text-zinc-700">{recepcion.cliente.whatsapp}</span>
                      <p className="text-zinc-400 text-xs mt-0.5">Campo reservado para notificaciones futuras</p>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Card Asignación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wrench className="size-4 text-zinc-500" />
                Asignación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Mecánico</dt>
                  <dd className="text-zinc-700">
                    {recepcion.mecanico?.nombre ?? (
                      <span className="text-zinc-400">Sin asignar</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Puesto</dt>
                  <dd className="text-zinc-700">
                    {recepcion.puesto?.nombre ?? (
                      <span className="text-zinc-400">Sin asignar</span>
                    )}
                  </dd>
                </div>
                {recepcion.puesto && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Tipo puesto</dt>
                    <dd className="text-zinc-700 capitalize">{recepcion.puesto.tipo}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Card Documentación del vehículo */}
        {(() => {
          const rtVenc = recepcion.vehiculo?.revision_tecnica_vencimiento;
          const pcVenc = recepcion.vehiculo?.permiso_circulacion_vencimiento;
          const rtUrl = recepcion.vehiculo?.revision_tecnica_url;
          const pcUrl = recepcion.vehiculo?.permiso_circulacion_url;
          const alerta = getAlertaDocumentos(rtVenc, pcVenc);
          const rtEstado = getEstadoDocumento(rtVenc);
          const pcEstado = getEstadoDocumento(pcVenc);
          return (
            <div className="space-y-3">
              {alerta === 'vencido' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Hay documentos vencidos. Informar al cliente.
                </div>
              )}
              {alerta === 'por_vencer' && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  Documentos próximos a vencer. Considerar informar al cliente.
                </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-zinc-500" />
                    Documentación del vehículo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Revisión Técnica */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        Revisión Técnica
                      </p>
                      {rtUrl ? (
                        <a href={rtUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={rtUrl}
                            alt="Revisión técnica"
                            className="h-20 w-28 object-cover rounded-lg border border-zinc-200 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : null}
                      {rtVenc ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-zinc-500">Vence:</span>
                          <span className="text-zinc-700">{formatFechaVencimiento(rtVenc)}</span>
                          <BadgeDocumento estado={rtEstado} />
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 italic">Sin información</p>
                      )}
                    </div>
                    {/* Permiso de Circulación */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        Permiso de Circulación
                      </p>
                      {pcUrl ? (
                        <a href={pcUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pcUrl}
                            alt="Permiso de circulación"
                            className="h-20 w-28 object-cover rounded-lg border border-zinc-200 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : null}
                      {pcVenc ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-zinc-500">Vence:</span>
                          <span className="text-zinc-700">{formatFechaVencimiento(pcVenc)}</span>
                          <BadgeDocumento estado={pcEstado} />
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 italic">Sin información</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Motivo de ingreso */}
        {recepcion.motivo_ingreso && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-zinc-700">Motivo de ingreso</span>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                {recepcion.motivo_ingreso}
              </p>
            </div>
          </div>
        )}

        {/* Diagnóstico del mecánico */}
        {recepcion.diagnostico_mecanico && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-zinc-500" />
              <span className="text-sm font-semibold text-zinc-700">Diagnóstico del mecánico</span>
            </div>
            <DiagnosticoDisplay value={recepcion.diagnostico_mecanico} />
          </div>
        )}

        {/* Fotos */}
        {(recepcion.foto_tablero_url || fotosUrls.length > 0) && (
          <div className="space-y-3">
            <h2 className="font-semibold text-zinc-900">Fotos</h2>
            <div className="flex flex-wrap gap-3">
              {recepcion.foto_tablero_url && (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={recepcion.foto_tablero_url}
                    alt="Foto tablero"
                    className="h-28 w-36 object-cover rounded-xl border border-zinc-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxSrc(recepcion.foto_tablero_url)}
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                    Tablero
                  </span>
                </div>
              )}
              {fotosUrls.map((src, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    className="h-28 w-28 object-cover rounded-xl border border-zinc-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxSrc(src)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-zinc-300"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="size-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Foto ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={(open) => setEditOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar recepción — {recepcion.vehiculo?.patente ?? ""}
            </DialogTitle>
          </DialogHeader>
          <FormRecepcion
            mode="edit"
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
