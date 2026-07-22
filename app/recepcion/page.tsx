"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TablaRecepciones,
  TablaRecepcionesSkeleton,
  type RecepcionRow,
} from "@/components/recepcion/TablaRecepciones";
import { FormRecepcion, type FormRecepcionValues } from "@/components/recepcion/FormRecepcion";

export default function RecepcionPage() {
  const [recepciones, setRecepciones] = useState<RecepcionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRecepciones = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/recepciones");
      if (!res.ok) throw new Error("Error al cargar recepciones");
      const data = (await res.json()) as RecepcionRow[];
      setRecepciones(data);
    } catch {
      setErrorMsg("No se pudieron cargar las recepciones. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecepciones();
  }, [fetchRecepciones]);

  const handleCrear = async (values: FormRecepcionValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/recepciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patente: values.patente,
          marca: values.marca,
          modelo: values.modelo,
          anio: values.anio,
          vin: values.vin || null,
          kilometraje: values.kilometraje,
          nivel_bencina: values.nivel_bencina || null,
          foto_tablero_url: values.foto_tablero_url || null,
          fotos_urls: values.fotos_urls,
          revision_tecnica_url: values.revision_tecnica_url || null,
          revision_tecnica_vencimiento: values.revision_tecnica_vencimiento || null,
          permiso_circulacion_url: values.permiso_circulacion_url || null,
          permiso_circulacion_vencimiento: values.permiso_circulacion_vencimiento || null,
          rut_cliente: values.rut_cliente,
          nombre_cliente: values.nombre_cliente,
          telefono_cliente: values.telefono_cliente || null,
          direccion_cliente: values.direccion_cliente || null,
          vehiculo_id: values.vehiculo_id,
          cliente_id: values.cliente_id,
          mecanico_id: values.mecanico_id ? Number(values.mecanico_id) : null,
          puesto_id: values.puesto_id ? Number(values.puesto_id) : null,
          motivo_ingreso: values.motivo_ingreso || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al crear recepción");
      }

      setDialogOpen(false);
      await fetchRecepciones();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Recepción de vehículos
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Gestión de ingresos al taller
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva recepción
        </Button>
      </div>

      {/* Error general */}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Tabla o skeleton */}
      {loading ? (
        <TablaRecepcionesSkeleton />
      ) : (
        <TablaRecepciones
          recepciones={recepciones}
          onRefresh={fetchRecepciones}
        />
      )}

      {/* Dialog Nueva Recepción */}
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva recepción</DialogTitle>
          </DialogHeader>
          <FormRecepcion
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
