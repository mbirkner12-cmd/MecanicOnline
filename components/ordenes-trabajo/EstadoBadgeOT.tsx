import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EstadoOT =
  | "creada"
  | "en_reparacion"
  | "listo_para_entregar"
  | "entregado";

const ESTADO_CONFIG: Record<EstadoOT, { label: string; className: string }> = {
  creada: {
    label: "Creada",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  en_reparacion: {
    label: "En reparación",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  listo_para_entregar: {
    label: "Listo para entregar",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  entregado: {
    label: "Entregado",
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
};

interface EstadoBadgeOTProps {
  estado: EstadoOT;
  className?: string;
}

export function EstadoBadgeOT({ estado, className }: EstadoBadgeOTProps) {
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

export function getEstadoOTLabel(estado: EstadoOT): string {
  return ESTADO_CONFIG[estado]?.label ?? estado;
}
