import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EstadoCotizacion = "pendiente" | "aceptada" | "rechazada";

const ESTADO_CONFIG: Record<EstadoCotizacion, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  aceptada: {
    label: "Aceptada",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  rechazada: {
    label: "Rechazada",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

interface EstadoBadgeCotProps {
  estado: EstadoCotizacion;
  className?: string;
}

export function EstadoBadgeCot({ estado, className }: EstadoBadgeCotProps) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        "border font-medium h-auto py-0.5 px-2 text-xs",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
