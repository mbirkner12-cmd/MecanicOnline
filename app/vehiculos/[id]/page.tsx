"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AlertaTipo =
  | "revision_tecnica"
  | "permiso_circulacion"
  | "neumaticos"
  | "aceite_filtros"
  | "otro";

const TIPO_LABELS: Record<AlertaTipo, string> = {
  revision_tecnica: "Revisión Técnica",
  permiso_circulacion: "Permiso de Circulación",
  neumaticos: "Neumáticos",
  aceite_filtros: "Aceite y Filtros",
  otro: "Otro",
};

const TIPOS = Object.entries(TIPO_LABELS) as [AlertaTipo, string][];

interface Alerta {
  id: number;
  vehiculo_id: number;
  tipo: AlertaTipo;
  descripcion: string | null;
  fecha_vencimiento: string | null;
  dias_anticipacion: number;
  activo: boolean;
  ultimo_envio: string | null;
}

interface Visita {
  id: number;
  fecha_hora_ingreso: string;
  kilometraje: number;
  estado: string;
  motivo_ingreso: string | null;
  diagnostico_mecanico: string | null;
}

interface VehiculoDetalle {
  id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje_actual: number;
  revision_tecnica_vencimiento: string | null;
  permiso_circulacion_vencimiento: string | null;
  cliente: {
    id: number;
    rut: string;
    nombre: string;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
    whatsapp: string | null;
  } | null;
  alertas: Alerta[];
  visitas: Visita[];
}

interface AlertaForm {
  tipo: AlertaTipo;
  descripcion: string;
  fecha_vencimiento: string;
  dias_anticipacion: number;
}

const defaultForm: AlertaForm = {
  tipo: "revision_tecnica",
  descripcion: "",
  fecha_vencimiento: "",
  dias_anticipacion: 30,
};

function diasRestantes(fecha: string): number {
  const venc = new Date(fecha);
  venc.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function AlertaBadge({ alerta }: { alerta: Alerta }) {
  if (!alerta.activo) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500">
        Inactiva
      </span>
    );
  }
  if (!alerta.fecha_vencimiento) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500">
        Sin fecha
      </span>
    );
  }
  const dias = diasRestantes(alerta.fecha_vencimiento);
  if (dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Vencida ({Math.abs(dias)}d)
      </span>
    );
  }
  if (dias <= alerta.dias_anticipacion) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Próxima ({dias}d)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Vigente ({dias}d)
    </span>
  );
}

function EstadoRecepcionBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    en_diagnostico: "En diagnóstico",
    cotizacion_pendiente: "Cotización pendiente",
    cotizacion_rechazada: "Cotización rechazada",
    con_ot_activa: "Con OT activa",
    entregado: "Entregado",
  };
  const colors: Record<string, string> = {
    en_diagnostico: "bg-blue-100 text-blue-700",
    cotizacion_pendiente: "bg-yellow-100 text-yellow-700",
    cotizacion_rechazada: "bg-red-100 text-red-700",
    con_ot_activa: "bg-purple-100 text-purple-700",
    entregado: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[estado] ?? "bg-zinc-100 text-zinc-600"}`}>
      {map[estado] ?? estado}
    </span>
  );
}

export default function VehiculoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [vehiculo, setVehiculo] = useState<VehiculoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlerta, setEditingAlerta] = useState<Alerta | null>(null);
  const [form, setForm] = useState<AlertaForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchVehiculo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehiculos/${id}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as VehiculoDetalle;
      setVehiculo(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVehiculo();
  }, [fetchVehiculo]);

  function openNew() {
    setEditingAlerta(null);
    setForm(defaultForm);
    setErrorMsg("");
    setDialogOpen(true);
  }

  function openEdit(a: Alerta) {
    setEditingAlerta(a);
    setForm({
      tipo: a.tipo,
      descripcion: a.descripcion ?? "",
      fecha_vencimiento: a.fecha_vencimiento ?? "",
      dias_anticipacion: a.dias_anticipacion,
    });
    setErrorMsg("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fecha_vencimiento) {
      setErrorMsg("La fecha de vencimiento es requerida");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      const body = {
        tipo: form.tipo,
        descripcion: form.descripcion || null,
        fecha_vencimiento: form.fecha_vencimiento,
        dias_anticipacion: form.dias_anticipacion,
      };

      let res: Response;
      if (editingAlerta) {
        res = await fetch(`/api/alertas-vehiculo/${editingAlerta.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/alertas-vehiculo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehiculo_id: Number(id), ...body }),
        });
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al guardar");
      }

      setDialogOpen(false);
      await fetchVehiculo();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActivo(a: Alerta) {
    await fetch(`/api/alertas-vehiculo/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !a.activo }),
    });
    await fetchVehiculo();
  }

  async function handleDelete(a: Alerta) {
    if (!confirm(`¿Eliminar el recordatorio de ${TIPO_LABELS[a.tipo]}?`)) return;
    await fetch(`/api/alertas-vehiculo/${a.id}`, { method: "DELETE" });
    await fetchVehiculo();
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <div className="h-32 bg-zinc-100 rounded animate-pulse" />
        <div className="h-48 bg-zinc-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!vehiculo) {
    return (
      <div className="text-center py-20 text-zinc-400">Vehículo no encontrado</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/vehiculos")}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Vehículos
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-semibold text-zinc-900 font-mono">{vehiculo.patente}</span>
      </div>

      {/* Vehicle + Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehicle */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Vehículo</h2>
          <p className="text-2xl font-bold text-zinc-900 font-mono mb-1">{vehiculo.patente}</p>
          <p className="text-lg text-zinc-700">{vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio}</p>
          <p className="text-sm text-zinc-500 mt-2">{vehiculo.kilometraje_actual.toLocaleString("es-CL")} km</p>
          {vehiculo.revision_tecnica_vencimiento && (
            <p className="text-xs text-zinc-400 mt-1">
              Rev. técnica: {formatFecha(vehiculo.revision_tecnica_vencimiento)}
            </p>
          )}
          {vehiculo.permiso_circulacion_vencimiento && (
            <p className="text-xs text-zinc-400 mt-0.5">
              Permiso circulación: {formatFecha(vehiculo.permiso_circulacion_vencimiento)}
            </p>
          )}
        </div>

        {/* Client */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Cliente</h2>
          {vehiculo.cliente ? (
            <>
              <p className="text-lg font-semibold text-zinc-900">{vehiculo.cliente.nombre}</p>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{vehiculo.cliente.rut}</p>
              {vehiculo.cliente.telefono && (
                <p className="text-sm text-zinc-600 mt-2">📞 {vehiculo.cliente.telefono}</p>
              )}
              {vehiculo.cliente.whatsapp && (
                <p className="text-sm text-zinc-600 mt-0.5">💬 WhatsApp: {vehiculo.cliente.whatsapp}</p>
              )}
              {vehiculo.cliente.correo && (
                <p className="text-sm text-zinc-600 mt-0.5">✉️ {vehiculo.cliente.correo}</p>
              )}
              {vehiculo.cliente.direccion && (
                <p className="text-sm text-zinc-500 mt-0.5">📍 {vehiculo.cliente.direccion}</p>
              )}
            </>
          ) : (
            <p className="text-zinc-400">Sin cliente asociado</p>
          )}
        </div>
      </div>

      {/* Alerts section */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Recordatorios de mantención</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Se enviarán automáticamente por WhatsApp y email según los días configurados
            </p>
          </div>
          <Button size="sm" onClick={openNew} className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        </div>

        {vehiculo.alertas.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-400 text-sm">
            No hay recordatorios configurados. Agrega uno para recibir avisos automáticos.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-5 py-2.5 font-medium text-zinc-500">Tipo</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Descripción</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Fecha vencimiento</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Aviso</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Último envío</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {vehiculo.alertas.map((a) => (
                <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-800">{TIPO_LABELS[a.tipo]}</td>
                  <td className="px-4 py-3 text-zinc-500">{a.descripcion ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatFecha(a.fecha_vencimiento)}</td>
                  <td className="px-4 py-3">
                    <AlertaBadge alerta={a} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{a.dias_anticipacion}d antes</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{formatFecha(a.ultimo_envio)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        title={a.activo ? "Desactivar" : "Activar"}
                        onClick={() => handleToggleActivo(a)}
                        className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        {a.activo ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        title="Editar"
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Eliminar"
                        onClick={() => handleDelete(a)}
                        className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Visit history */}
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Historial de visitas</h2>
        </div>
        {vehiculo.visitas.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-400 text-sm">
            Sin visitas registradas
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-5 py-2.5 font-medium text-zinc-500">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Kilometraje</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Motivo</th>
                <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {vehiculo.visitas.map((v) => (
                <tr key={v.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-5 py-3 text-zinc-700">{formatFecha(v.fecha_hora_ingreso)}</td>
                  <td className="px-4 py-3 text-zinc-600">{v.kilometraje.toLocaleString("es-CL")} km</td>
                  <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">{v.motivo_ingreso ?? "—"}</td>
                  <td className="px-4 py-3">
                    <EstadoRecepcionBadge estado={v.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dialog: add/edit alerta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAlerta ? "Editar recordatorio" : "Nuevo recordatorio"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as AlertaTipo }))}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                required
              >
                {TIPOS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Descripción <span className="text-zinc-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder={form.tipo === "otro" ? "Ej: Cambio correa distribución" : "Nota adicional"}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Fecha de vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Días de anticipación para el aviso</label>
              <input
                type="number"
                min={1}
                max={365}
                value={form.dias_anticipacion}
                onChange={(e) => setForm((f) => ({ ...f, dias_anticipacion: Number(e.target.value) }))}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                required
              />
              <p className="text-xs text-zinc-400">
                Se enviará el mensaje automáticamente {form.dias_anticipacion} días antes de la fecha
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editingAlerta ? "Guardar cambios" : "Agregar recordatorio"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
