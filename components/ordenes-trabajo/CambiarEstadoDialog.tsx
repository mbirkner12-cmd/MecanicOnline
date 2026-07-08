"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstadoBadgeOT, type EstadoOT } from "@/components/ordenes-trabajo/EstadoBadgeOT";

// ── Progresión para el jefe: solo puede marcar como entregado ─────────────────
// El mecánico maneja los estados anteriores (creada → en_reparacion → listo_para_entregar)
const SIGUIENTE_ESTADO_JEFE: Record<string, EstadoOT> = {
  listo_para_entregar: "entregado",
};

// ── Progresión completa (para compatibilidad con otros usos) ──────────────────
const SIGUIENTE_ESTADO_COMPLETO: Record<string, EstadoOT> = {
  creada: "en_reparacion",
  en_reparacion: "listo_para_entregar",
  listo_para_entregar: "entregado",
};

const ESTADO_LABELS: Record<EstadoOT, string> = {
  creada: "Creada",
  en_reparacion: "En reparación",
  listo_para_entregar: "Listo para entregar",
  entregado: "Entregado",
};

const SELECT_CLS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export interface OTParaCambioEstado {
  id: number;
  numero: string;
  estado: EstadoOT;
}

interface CambiarEstadoDialogProps {
  ot: OTParaCambioEstado;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (nuevoEstado: EstadoOT) => void;
  loading: boolean;
  /** If true, only allow the jefe transition (listo_para_entregar → entregado).
   *  If false/undefined, allow full progression (backwards compat). */
  jefeOnly?: boolean;
}

export function CambiarEstadoDialog({
  ot,
  open,
  onOpenChange,
  onConfirm,
  loading,
  jefeOnly = true,
}: CambiarEstadoDialogProps) {
  const map = jefeOnly ? SIGUIENTE_ESTADO_JEFE : SIGUIENTE_ESTADO_COMPLETO;
  const siguienteEstado = map[ot.estado];

  if (!siguienteEstado) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar estado de {ot.numero}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-600">Estado actual</span>
            <EstadoBadgeOT estado={ot.estado} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-600">
              Nuevo estado
            </label>
            <select className={SELECT_CLS} value={siguienteEstado} disabled>
              <option value={siguienteEstado}>{ESTADO_LABELS[siguienteEstado]}</option>
            </select>
            <p className="text-xs text-zinc-400">
              Solo se puede avanzar al siguiente estado en la progresión.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(siguienteEstado)}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
