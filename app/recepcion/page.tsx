"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Download } from "lucide-react";
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

  const exportarExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = recepciones.map(r => ({
      'Patente': r.vehiculo?.patente ?? '',
      'Marca': r.vehiculo?.marca ?? '',
      'Modelo': r.vehiculo?.modelo ?? '',
      'Año': r.vehiculo?.anio ?? '',
      'VIN': r.vehiculo?.vin ?? '',
      'Cliente': r.cliente?.nombre ?? '',
      'RUT Cliente': r.cliente?.rut ?? '',
      'Teléfono': r.cliente?.telefono ?? '',
      'Mecánico': r.mecanico?.nombre ?? '',
      'Puesto': r.puesto?.nombre ?? '',
      'Estado': r.estado,
      'Kilometraje': r.kilometraje,
      'Nivel Bencina': r.nivel_bencina ?? '',
      'Motivo Ingreso': r.motivo_ingreso ?? '',
      'Fecha Ingreso': new Date(r.fecha_hora_ingreso).toLocaleDateString('es-CL'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [12,12,14,6,18,24,14,14,18,14,14,12,14,30,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recepciones');
    XLSX.writeFile(wb, 'recepciones.xlsx');
  };

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
        <div className="flex items-center gap-2">
          {recepciones.length > 0 && (
            <button
              onClick={exportarExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Excel
            </button>
          )}
          <Button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva recepción
          </Button>
        </div>
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
