"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DiagnosticoItem {
  sistema: string;
  descripcion: string;
  gravedad: "bajo" | "medio" | "alto";
}

export const SISTEMAS = [
  "Motor",
  "Transmisión",
  "Frenos",
  "Suspensión",
  "Dirección",
  "Sistema eléctrico",
  "Carrocería",
  "Climatización",
  "Escape",
  "Neumáticos",
  "Combustible",
  "Otro",
];

export const GRAVEDAD_CONFIG = {
  alto: {
    label: "ALTO (CRÍTICO)",
    definicion: "Falla grave que compromete la seguridad del vehículo o su funcionamiento inmediato. Reparación urgente.",
    badgeCls: "bg-red-100 text-red-800",
    borderCls: "border-red-200 bg-red-50",
  },
  medio: {
    label: "MEDIO (NECESARIO)",
    definicion: "Defecto detectable que requiere corrección a mediano plazo para evitar daños mayores.",
    badgeCls: "bg-orange-100 text-orange-800",
    borderCls: "border-orange-200 bg-orange-50",
  },
  bajo: {
    label: "BAJO (SUGERIDO)",
    definicion: "Desgaste normal o leve. Se recomienda monitoreo o mantenimiento preventivo próximo.",
    badgeCls: "bg-blue-100 text-blue-800",
    borderCls: "border-blue-200 bg-blue-50",
  },
} as const;

const SELECT_CLS =
  "flex h-8 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

interface DiagnosticoFormProps {
  value: DiagnosticoItem[];
  onChange: (items: DiagnosticoItem[]) => void;
  disabled?: boolean;
}

export function DiagnosticoForm({ value, onChange, disabled }: DiagnosticoFormProps) {
  const addItem = () =>
    onChange([...value, { sistema: "Motor", gravedad: "medio", descripcion: "" }]);

  const removeItem = (idx: number) =>
    onChange(value.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof DiagnosticoItem, val: string) =>
    onChange(value.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));

  return (
    <div className="flex flex-col gap-4">
      {/* Leyenda */}
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 flex flex-col gap-2">
        {(["alto", "medio", "bajo"] as const).map((g) => {
          const cfg = GRAVEDAD_CONFIG[g];
          return (
            <div key={g} className="flex items-start gap-2 text-xs">
              <span
                className={`shrink-0 mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cfg.badgeCls}`}
              >
                {cfg.label}
              </span>
              <span className="text-zinc-500 leading-snug">{cfg.definicion}</span>
            </div>
          );
        })}
      </div>

      {/* Hallazgos */}
      <div className="flex flex-col gap-3">
        {value.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-3 flex flex-col gap-2 ${GRAVEDAD_CONFIG[item.gravedad].borderCls}`}
          >
            <div className="flex gap-2 items-center">
              <select
                className={`${SELECT_CLS} flex-1`}
                value={item.sistema}
                onChange={(e) => updateItem(idx, "sistema", e.target.value)}
                disabled={disabled}
              >
                {SISTEMAS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                className={`${SELECT_CLS} w-48`}
                value={item.gravedad}
                onChange={(e) => updateItem(idx, "gravedad", e.target.value)}
                disabled={disabled}
              >
                <option value="alto">ALTO (CRÍTICO)</option>
                <option value="medio">MEDIO (NECESARIO)</option>
                <option value="bajo">BAJO (SUGERIDO)</option>
              </select>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={disabled}
                className="inline-flex items-center justify-center size-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              placeholder="Describe el hallazgo..."
              value={item.descripcion}
              onChange={(e) => updateItem(idx, "descripcion", e.target.value)}
              disabled={disabled}
              rows={3}
              spellCheck
              autoCapitalize="sentences"
              lang="es"
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={disabled}
        className="flex items-center gap-1.5 self-start"
      >
        <Plus className="size-3.5" />
        Agregar hallazgo
      </Button>
    </div>
  );
}
