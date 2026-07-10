"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  FileText,
  Search,
  Wrench,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  stats: {
    enTaller: number;
    enDiagnostico: number;
    cotizacionesPendientes: number;
    enReparacion: number;
    listosParaEntregar: number;
    entregadosHoy: number;
  };
  puestos: Array<{
    puesto: { id: number; nombre: string; tipo: string };
    vehiculo: { patente: string; marca: string; modelo: string } | null;
    cliente: string | null;
    mecanico: string | null;
    estado: string | null;
    link: string | null;
  }>;
  pendientes: {
    cotizacionesSinRespuesta: Array<{
      id: number;
      numero: string;
      cliente_nombre: string | null;
      patente: string | null;
      created_at: string;
    }>;
    recepcionesSinCotizacion: Array<{
      id: number;
      patente: string | null;
      marca: string | null;
      modelo: string | null;
      cliente_nombre: string | null;
      created_at: string;
    }>;
    otsSinMecanico: Array<{
      id: number;
      numero: string;
      patente: string | null;
      estado: string;
      created_at: string;
    }>;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function diasAtras(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86400000
  );
  return days === 0 ? "hoy" : `${days}d`;
}

// ── EstadoBadge ───────────────────────────────────────────────────────────────

const ESTADO_MAP: Record<string, { label: string; className: string }> = {
  en_reparacion: {
    label: "En reparación",
    className: "bg-orange-100 text-orange-700",
  },
  creada: {
    label: "Creada",
    className: "bg-blue-100 text-blue-700",
  },
  listo_para_entregar: {
    label: "Listo p/entregar",
    className: "bg-green-100 text-green-700",
  },
  en_diagnostico: {
    label: "En diagnóstico",
    className: "bg-blue-100 text-blue-700",
  },
  cotizacion_pendiente: {
    label: "Cot. pendiente",
    className: "bg-amber-100 text-amber-700",
  },
  cotizacion_rechazada: {
    label: "Cot. rechazada",
    className: "bg-red-100 text-red-700",
  },
};

function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return null;
  const config = ESTADO_MAP[estado] ?? {
    label: estado,
    className: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  value: number;
  label: string;
  accentClass: string;
}

function StatCard({ value, label, accentClass }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-zinc-200 p-5 flex flex-col gap-1 border-t-4 ${accentClass}`}
    >
      <span className="text-3xl font-bold text-zinc-900">{value}</span>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}

// ── Pendientes card ───────────────────────────────────────────────────────────

interface PendientesItem {
  id: number;
  primary: string;
  secondary: string;
  created_at: string;
  link: string;
}

interface PendientesCardProps {
  icon: React.ReactNode;
  title: string;
  items: PendientesItem[];
}

function PendientesCard({ icon, title, items }: PendientesCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
            {items.length}
          </span>
        )}
      </div>
      <div className="divide-y divide-zinc-100">
        {items.length === 0 ? (
          <div className="px-5 py-4 text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="size-4" />
            Todo al día
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className="block px-5 py-3 hover:bg-zinc-50 transition-colors"
            >
              <div className="font-medium text-zinc-900 text-sm">
                {item.primary}
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                <Clock className="size-3" />
                {item.secondary} · {diasAtras(item.created_at)}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Error al cargar datos");
      const json: DashboardData = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-zinc-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-zinc-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-48 bg-zinc-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => fetchData(true)}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, puestos, pendientes } = data;

  // ── Build pendientes items ─────────────────────────────────────────────────
  const cotizacionItems: PendientesItem[] =
    pendientes.cotizacionesSinRespuesta.map((c) => ({
      id: c.id,
      primary: `${c.numero}${c.patente ? ` · ${c.patente}` : ""}`,
      secondary: c.cliente_nombre ?? "Sin cliente",
      created_at: c.created_at,
      link: `/cotizaciones`,
    }));

  const recepcionItems: PendientesItem[] =
    pendientes.recepcionesSinCotizacion.map((r) => ({
      id: r.id,
      primary: r.patente
        ? `${r.patente} ${r.marca ?? ""} ${r.modelo ?? ""}`.trim()
        : "Sin patente",
      secondary: r.cliente_nombre ?? "Sin cliente",
      created_at: r.created_at,
      link: `/recepcion/${r.id}`,
    }));

  const otItems: PendientesItem[] = pendientes.otsSinMecanico.map((o) => ({
    id: o.id,
    primary: `OT ${o.numero}${o.patente ? ` · ${o.patente}` : ""}`,
    secondary: ESTADO_MAP[o.estado]?.label ?? o.estado,
    created_at: o.created_at,
    link: `/ordenes-trabajo`,
  }));

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Panel del taller</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Vista general del taller en tiempo real
            {lastUpdated && (
              <span className="ml-2 text-zinc-400">
                · Actualizado{" "}
                {lastUpdated.toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="shrink-0 gap-1.5"
        >
          <RefreshCw
            className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          value={stats.enTaller}
          label="En taller"
          accentClass="border-t-zinc-400"
        />
        <StatCard
          value={stats.enDiagnostico}
          label="En diagnóstico"
          accentClass="border-t-blue-400"
        />
        <StatCard
          value={stats.cotizacionesPendientes}
          label="Cotizaciones pend."
          accentClass="border-t-amber-400"
        />
        <StatCard
          value={stats.enReparacion}
          label="En reparación"
          accentClass="border-t-orange-400"
        />
        <StatCard
          value={stats.listosParaEntregar}
          label="Listos p/entregar"
          accentClass="border-t-green-400"
        />
        <StatCard
          value={stats.entregadosHoy}
          label="Entregados hoy"
          accentClass="border-t-zinc-300"
        />
      </div>

      {/* ── Puestos ── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Puestos</h2>
        </div>
        {puestos.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">
            No hay puestos activos configurados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">
                    Puesto
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">
                    Vehículo
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">
                    Mecánico
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-500 whitespace-nowrap">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {puestos.map((p) => (
                  <tr
                    key={p.puesto.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                      {p.puesto.nombre}
                    </td>
                    {p.vehiculo ? (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-zinc-900">
                            {p.vehiculo.patente}
                          </span>{" "}
                          <span className="font-sans font-normal text-zinc-500">
                            {p.vehiculo.marca} {p.vehiculo.modelo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                          {p.cliente ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                          {p.mecanico ?? (
                            <span className="text-zinc-400 text-xs">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.link ? (
                            <Link
                              href={p.link}
                              className="inline-flex hover:opacity-80 transition-opacity"
                            >
                              <EstadoBadge estado={p.estado} />
                            </Link>
                          ) : (
                            <EstadoBadge estado={p.estado} />
                          )}
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-zinc-400 text-sm"
                      >
                        Libre
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pendientes ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PendientesCard
          icon={<FileText className="size-4 text-zinc-500" />}
          title="Cotizaciones sin respuesta"
          items={cotizacionItems}
        />
        <PendientesCard
          icon={<Search className="size-4 text-zinc-500" />}
          title="En diagnóstico sin cotización"
          items={recepcionItems}
        />
        <PendientesCard
          icon={<Wrench className="size-4 text-zinc-500" />}
          title="OTs sin mecánico"
          items={otItems}
        />
      </div>
    </div>
  );
}
