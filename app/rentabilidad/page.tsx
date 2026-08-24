'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, DollarSign, Wrench, Package, BarChart3 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OTRow {
  id: number;
  numero: string;
  estado: string;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  horas_trabajadas: number | null;
  costo_mo_override: number | null;
  updated_at: string;
  vehiculo_patente: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  cliente_nombre: string | null;
  cot_total: number | null;
  cot_mo: number | null;
  cot_retiro: number | null;
  cot_repuestos: string | null;
}

interface RentabilidadData {
  ots: OTRow[];
  valorHora: number;
  costoRepuestosPorOT: Record<number, { costo: number; venta: number }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(Math.round(n));
}

function horasAuto(inicio: string | null, fin: string | null): number {
  if (!inicio || !fin) return 0;
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  return Math.max(0, ms / 3_600_000);
}

function calcOT(ot: OTRow, valorHora: number, costoReps: { costo: number; venta: number } | undefined) {
  const ingreso = ot.cot_total ?? 0;
  const ingresoMO = ot.cot_mo ?? 0;
  let ingresoRepsCot = 0;
  try {
    const reps = JSON.parse(ot.cot_repuestos ?? '[]') as Array<{ cantidad: number; valor_unitario: number }>;
    ingresoRepsCot = reps.reduce((s, r) => s + r.cantidad * r.valor_unitario, 0);
  } catch { /* */ }

  const h = ot.horas_trabajadas ?? horasAuto(ot.fecha_hora_inicio, ot.fecha_hora_fin);
  const costoMO = ot.costo_mo_override !== null ? ot.costo_mo_override : h * valorHora;
  const costoRepsInv = costoReps?.costo ?? 0;
  const totalCosto = costoMO + costoRepsInv;
  const ganancia = ingreso - totalCosto;
  const margen = ingreso > 0 ? (ganancia / ingreso) * 100 : 0;

  return { ingreso, ingresoMO, ingresoRepsCot, costoMO, costoRepsInv, totalCosto, ganancia, margen };
}

const PERIODOS = [
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: 'Todo', days: 0 },
] as const;

// ── Barra horizontal simple ───────────────────────────────────────────────────
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span className="font-medium text-zinc-800">{formatCLP(value)}</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function RentabilidadPage() {
  const [data, setData] = useState<RentabilidadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<number>(90);

  useEffect(() => {
    fetch('/api/rentabilidad')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  // Filtrar por período
  const otsFiltradas = useMemo(() => {
    if (!data) return [];
    if (periodo === 0) return data.ots;
    const desde = new Date();
    desde.setDate(desde.getDate() - periodo);
    return data.ots.filter(ot => {
      const fecha = ot.fecha_hora_fin ?? ot.updated_at;
      return fecha ? new Date(fecha) >= desde : false;
    });
  }, [data, periodo]);

  // Calcular agregados
  const stats = useMemo(() => {
    if (!data) return null;
    let totalIngreso = 0, totalCostoMO = 0, totalCostoReps = 0, totalGanancia = 0;
    let totalIngresoMO = 0, totalIngresoReps = 0;

    for (const ot of otsFiltradas) {
      const c = calcOT(ot, data.valorHora, data.costoRepuestosPorOT[ot.id]);
      totalIngreso += c.ingreso;
      totalCostoMO += c.costoMO;
      totalCostoReps += c.costoRepsInv;
      totalGanancia += c.ganancia;
      totalIngresoMO += c.ingresoMO;
      totalIngresoReps += c.ingresoRepsCot;
    }

    const totalCosto = totalCostoMO + totalCostoReps;
    const margenProm = totalIngreso > 0 ? (totalGanancia / totalIngreso) * 100 : 0;

    return { totalIngreso, totalCostoMO, totalCostoReps, totalCosto, totalGanancia, margenProm, totalIngresoMO, totalIngresoReps };
  }, [data, otsFiltradas]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-zinc-100 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-zinc-100 rounded-xl" />
      </div>
    );
  }

  const margenColor = !stats ? 'text-zinc-500' : stats.margenProm > 30 ? 'text-green-600' : stats.margenProm > 10 ? 'text-amber-600' : 'text-red-600';
  const MargenIcon = !stats ? Minus : stats.totalGanancia > 0 ? TrendingUp : stats.totalGanancia < 0 ? TrendingDown : Minus;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Rentabilidad</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Costos y márgenes de las órdenes terminadas</p>
        </div>
        {/* Filtro período */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
          {PERIODOS.map(p => (
            <button
              key={p.days}
              onClick={() => setPeriodo(p.days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${periodo === p.days ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards resumen ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500 font-medium">Ingresos netos</p>
          </div>
          <p className="text-xl font-bold text-zinc-900">{formatCLP(stats?.totalIngreso ?? 0)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{otsFiltradas.length} OTs</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500 font-medium">Costos totales</p>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCLP(stats?.totalCosto ?? 0)}</p>
          <p className="text-xs text-zinc-400 mt-0.5">MO + repuestos</p>
        </div>

        <div className={`bg-white rounded-xl border p-4 ${(stats?.totalGanancia ?? 0) >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <MargenIcon className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500 font-medium">Ganancia bruta</p>
          </div>
          <p className={`text-xl font-bold ${(stats?.totalGanancia ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCLP(stats?.totalGanancia ?? 0)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">antes de IVA</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500 font-medium">Margen promedio</p>
          </div>
          <p className={`text-xl font-bold ${margenColor}`}>{stats ? `${stats.margenProm.toFixed(1)}%` : '—'}</p>
          <p className="text-xs text-zinc-400 mt-0.5">sobre ingresos netos</p>
        </div>
      </div>

      {/* ── Desglose ingresos vs costos ──────────────────────────────────── */}
      {stats && stats.totalIngreso > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ingresos */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-zinc-400" />
              Ingresos por categoría
            </h2>
            <div className="space-y-3">
              <Bar label="Mano de obra" value={stats.totalIngresoMO} max={stats.totalIngreso} color="bg-blue-400" />
              <Bar label="Repuestos (cotizados)" value={stats.totalIngresoReps} max={stats.totalIngreso} color="bg-violet-400" />
              <Bar label="Otros / retiro-entrega" value={Math.max(0, stats.totalIngreso - stats.totalIngresoMO - stats.totalIngresoReps)} max={stats.totalIngreso} color="bg-zinc-300" />
            </div>
            <div className="border-t border-zinc-100 pt-3 flex justify-between text-sm font-semibold text-zinc-800">
              <span>Total neto</span>
              <span>{formatCLP(stats.totalIngreso)}</span>
            </div>
          </div>

          {/* Costos */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Package className="h-4 w-4 text-zinc-400" />
              Costos por categoría
            </h2>
            <div className="space-y-3">
              <Bar label="Mano de obra (costo)" value={stats.totalCostoMO} max={stats.totalIngreso} color="bg-amber-400" />
              <Bar label="Repuestos (costo de compra)" value={stats.totalCostoReps} max={stats.totalIngreso} color="bg-orange-400" />
              <div className="pt-1 border-t border-zinc-100">
                <Bar label="Ganancia bruta" value={Math.max(0, stats.totalGanancia)} max={stats.totalIngreso} color="bg-green-400" />
              </div>
            </div>
            <div className="border-t border-zinc-100 pt-3">
              <div className="flex justify-between text-sm font-semibold text-red-600">
                <span>Total costos</span>
                <span>{formatCLP(stats.totalCosto)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-green-600 mt-1">
                <span>Ganancia bruta</span>
                <span>{formatCLP(stats.totalGanancia)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla por OT ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Detalle por OT</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">OT</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 hidden md:table-cell">Cliente / Vehículo</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500">Ingreso</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 hidden lg:table-cell">Costo MO</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500 hidden lg:table-cell">Costo reps.</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500">Ganancia</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500">Margen</th>
              </tr>
            </thead>
            <tbody>
              {otsFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400 text-sm">
                    No hay órdenes en el período seleccionado.
                  </td>
                </tr>
              ) : (
                otsFiltradas.map(ot => {
                  const c = calcOT(ot, data!.valorHora, data!.costoRepuestosPorOT[ot.id]);
                  const margenColor = c.margen > 30 ? 'text-green-600 bg-green-50' : c.margen > 10 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                  return (
                    <tr key={ot.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5">
                        <Link href={`/ordenes-trabajo/${ot.id}`} className="font-mono font-semibold text-zinc-900 hover:text-blue-600 hover:underline text-xs">
                          {ot.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <p className="text-zinc-700 text-xs">{ot.cliente_nombre ?? '—'}</p>
                        <p className="text-zinc-400 text-xs">{ot.vehiculo_patente} · {ot.vehiculo_marca} {ot.vehiculo_modelo}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-zinc-800">{formatCLP(c.ingreso)}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-500 hidden lg:table-cell">{formatCLP(c.costoMO)}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-500 hidden lg:table-cell">{formatCLP(c.costoRepsInv)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${c.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCLP(c.ganancia)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${margenColor}`}>
                          {c.margen.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {otsFiltradas.length > 0 && stats && (
              <tfoot>
                <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold">
                  <td className="px-4 py-2.5 text-xs text-zinc-500" colSpan={2}>{otsFiltradas.length} OTs</td>
                  <td className="px-4 py-2.5 text-right text-zinc-800">{formatCLP(stats.totalIngreso)}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-500 hidden lg:table-cell">{formatCLP(stats.totalCostoMO)}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-500 hidden lg:table-cell">{formatCLP(stats.totalCostoReps)}</td>
                  <td className={`px-4 py-2.5 text-right ${stats.totalGanancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCLP(stats.totalGanancia)}</td>
                  <td className={`px-4 py-2.5 text-right ${margenColor}`}>{stats.margenProm.toFixed(1)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {data?.valorHora === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          El valor hora no está configurado — los costos de mano de obra aparecen en $0.{' '}
          <Link href="/configuracion/general" className="underline font-medium">Configurarlo aquí</Link>
        </p>
      )}
    </div>
  );
}
