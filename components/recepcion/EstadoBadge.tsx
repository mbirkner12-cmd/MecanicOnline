import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EstadoRecepcion =
  | "en_diagnostico"
  | "cotizacion_pendiente"
  | "cotizacion_rechazada"
  | "con_ot_activa"
  | "entregado";

const ESTADO_CONFIG: Record<
  EstadoRecepcion,
  { label: string; className: string }
> = {
  en_diagnostico: {
    label: "En diagnóstico",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  cotizacion_pendiente: {
    label: "Cotización pendiente",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  cotizacion_rechazada: {
    label: "Cotización rechazada",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  con_ot_activa: {
    label: "Con OT activa",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  entregado: {
    label: "Entregado",
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
};

interface EstadoBadgeProps {
  estado: EstadoRecepcion;
  className?: string;
}

export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "border font-medium h-auto py-0.5 px-2 text-xs", className)}
    >
      {config.label}
    </Badge>
  );
}

export function getEstadoLabel(estado: EstadoRecepcion): string {
  return ESTADO_CONFIG[estado]?.label ?? estado;
}
