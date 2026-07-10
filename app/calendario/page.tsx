"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TipoEvento =
  | "entrada_vehiculo"
  | "retiro_vehiculo"
  | "entrega_vehiculo"
  | "cotizacion"
  | "otro";

interface Evento {
  id: number;
  fecha: string; // 'YYYY-MM-DD'
  titulo: string;
  tipo: TipoEvento;
  descripcion: string | null;
  created_at: string;
}

const TIPO_CONFIG: Record<
  TipoEvento,
  { label: string; bgCls: string; textCls: string; dotCls: string }
> = {
  entrada_vehiculo: {
    label: "Entrada vehículo",
    bgCls: "bg-blue-100",
    textCls: "text-blue-700",
    dotCls: "bg-blue-500",
  },
  retiro_vehiculo: {
    label: "Retiro vehículo",
    bgCls: "bg-orange-100",
    textCls: "text-orange-700",
    dotCls: "bg-orange-500",
  },
  entrega_vehiculo: {
    label: "Entrega vehículo",
    bgCls: "bg-green-100",
    textCls: "text-green-700",
    dotCls: "bg-green-500",
  },
  cotizacion: {
    label: "Cotización",
    bgCls: "bg-purple-100",
    textCls: "text-purple-700",
    dotCls: "bg-purple-500",
  },
  otro: {
    label: "Otro",
    bgCls: "bg-zinc-100",
    textCls: "text-zinc-600",
    dotCls: "bg-zinc-400",
  },
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dia = date.toLocaleString("es-CL", { weekday: "long" });
  const mes = date.toLocaleString("es-CL", { month: "long" });
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${d} de ${mes}`;
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formTitulo, setFormTitulo] = useState("");
  const [formTipo, setFormTipo] = useState<TipoEvento>("otro");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEventos = useCallback(async () => {
    setLoading(true);
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    const mes = `${y}-${m}`;
    try {
      const res = await fetch(`/api/calendario?mes=${mes}`);
      if (res.ok) {
        const data: Evento[] = await res.json();
        setEventos(data);
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const prevMonth = () =>
    setCurrentDate(
      (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCurrentDate(
      (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
    );

  const monthLabel = (() => {
    const raw = currentDate.toLocaleString("es-CL", {
      month: "long",
      year: "numeric",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const totalDays = monthEnd.getDate();

  // Monday = 0 offset
  const rawDow = monthStart.getDay(); // 0=Sun
  const startDow = rawDow === 0 ? 6 : rawDow - 1;

  const totalCells = Math.ceil((startDow + totalDays) / 7) * 7;

  const todayStr = toYMD(new Date());

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setFormTitulo("");
    setFormTipo("otro");
    setFormDesc("");
    setDialogOpen(true);
  };

  const handleAddEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !formTitulo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: selectedDate,
          titulo: formTitulo.trim(),
          tipo: formTipo,
          descripcion: formDesc.trim() || undefined,
        }),
      });
      if (res.ok) {
        setFormTitulo("");
        setFormTipo("otro");
        setFormDesc("");
        await fetchEventos();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvento = async (id: number) => {
    await fetch(`/api/calendario/${id}`, { method: "DELETE" });
    await fetchEventos();
  };

  const dayEventos = (dateStr: string) =>
    eventos.filter((ev) => ev.fecha === dateStr);

  const selectedEventos = selectedDate ? dayEventos(selectedDate) : [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-zinc-500" />
          <h1 className="text-xl font-semibold text-zinc-800">Calendario</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-zinc-700 min-w-[140px] text-center">
            {monthLabel}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(TIPO_CONFIG) as TipoEvento[]).map((tipo) => {
          const cfg = TIPO_CONFIG[tipo];
          return (
            <span
              key={tipo}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium",
                cfg.bgCls,
                cfg.textCls
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotCls)} />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm bg-white">
        <div className="min-w-[560px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-zinc-200">
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
              Cargando eventos...
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, cellIdx) => {
                const dayNumber = cellIdx - startDow + 1;
                const isCurrentMonth = dayNumber >= 1 && dayNumber <= totalDays;
                const cellDate = new Date(year, month, dayNumber);
                const dateStr = toYMD(cellDate);
                const isToday = dateStr === todayStr;
                const dayEvents = isCurrentMonth ? dayEventos(dateStr) : [];

                return (
                  <div
                    key={cellIdx}
                    onClick={() => isCurrentMonth && handleDayClick(dateStr)}
                    className={cn(
                      "min-h-[80px] sm:min-h-[80px] min-h-[60px] p-1.5 border-r border-b border-zinc-100 transition-colors",
                      isCurrentMonth
                        ? "bg-white cursor-pointer hover:bg-zinc-50/80"
                        : "bg-zinc-50/30 cursor-default",
                      isToday && isCurrentMonth && "bg-blue-50/50 hover:bg-blue-50"
                    )}
                  >
                    {isCurrentMonth && (
                      <>
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                            isToday
                              ? "bg-blue-600 text-white"
                              : "text-zinc-700"
                          )}
                        >
                          {dayNumber}
                        </span>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded truncate",
                                TIPO_CONFIG[ev.tipo].bgCls,
                                TIPO_CONFIG[ev.tipo].textCls
                              )}
                            >
                              {ev.titulo}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-zinc-400 px-1.5">
                              +{dayEvents.length - 3} más
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Day Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-zinc-800">
              {selectedDate ? formatDateLabel(selectedDate) : ""}
            </DialogTitle>
          </DialogHeader>

          {/* Existing events */}
          <div className="space-y-2">
            {selectedEventos.length === 0 ? (
              <p className="text-sm text-zinc-400 py-2">
                No hay eventos para este día.
              </p>
            ) : (
              selectedEventos.map((ev) => {
                const cfg = TIPO_CONFIG[ev.tipo];
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/60"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5",
                        cfg.bgCls,
                        cfg.textCls
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotCls)} />
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {ev.titulo}
                      </p>
                      {ev.descripcion && (
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                          {ev.descripcion}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEvento(ev.id)}
                      className="shrink-0 p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 my-1">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Agregar nota
            </span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Add event form */}
          <form onSubmit={handleAddEvento} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ej: Revisión Toyota Corolla"
                required
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Tipo
              </label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value as TipoEvento)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition appearance-none cursor-pointer"
              >
                {(Object.keys(TIPO_CONFIG) as TipoEvento[]).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {TIPO_CONFIG[tipo].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Descripción <span className="text-zinc-400">(opcional)</span>
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                placeholder="Detalles adicionales..."
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={saving || !formTitulo.trim()}
              className="w-full"
              size="sm"
            >
              {saving ? "Guardando..." : "Agregar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
