'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, Wrench, Package, BarChart3, Users, Download, TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, FileText, ShoppingCart } from 'lucide-react';
import type { InsumoStats } from '@/app/api/insumos/route';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OTRow {
  id: number;
  numero: string;
  estado: string;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  horas_trabajadas: number | null;
  costo_mo_override: number | null;
  costo_repuestos_cot: string | null;
  costo_repuestos_override: number | null;
  costo_total_override: number | null;
  updated_at: string;
  mecanico_id: number | null;
  mecanico_nombre: string | null;
  vehiculo_patente: string | null;
  vehiculo_marca: string | null;
  vehiculo_modelo: string | null;
  cliente_nombre: string | null;
  cot_total: number | null;
  cot_mo: number | null;
  cot_retiro: number | null;
  cot_repuestos: string | null;
}

interface RepuestoDetalle {
  ot_id: number;
  nombre: string;
  cantidad: number;
  precio_costo_snapshot: number;
}

interface FacturaRow {
  id: number;
  ot_id: number | null;
  numero: string;
  proveedor_nombre: string;
  fecha_emision: string;
  total_neto: number;
  total: number;
  pdf_url: string | null;
  items: string;
}

interface GastoEstructura {
  id: number;
  nombre: string;
  monto_mensual: number;
  tipo: 'fijo' | 'gav' | 'puntual';
  mes: string | null;
  activo: boolean;
}

interface RentabilidadData {
  ots: OTRow[];
  valorHora: number;
  costoRepuestosPorOT: Record<number, { costo: number; venta: number }>;
  repuestosDetalle: RepuestoDetalle[];
  facturas: FacturaRow[];
  mecanicoFactores: Record<number, { tipo_pago: string; factor_boleta: number }>;
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

const ACEITE_RE = /\baceite|lubricante|5w|10w|0w|15w|atf|dexron\b/i;
const FILTRO_RE = /\bfiltro|filter\b/i;
const FRENO_RE = /\bpastilla|zapata|disco\s*(freno|brake)|rotor|l[ií]quido\s*freno\b/i;
const SUSPENSION_RE = /\bamortiguador|muelle|resorte|bieleta|r[oó]tula|silent\s*block|brazo\b/i;
const BUJIA_RE = /\bbuj[íi]a\b/i;
const DISTRIBUCION_RE = /\bdistribuci[oó]n|timing\b/i;
const EMBRAGUE_RE = /\bembrague|clutch\b/i;
const REFRIGERACION_RE = /\brefrigerante|anticongelante|coolant|termostato\b/i;
const NEUMATICO_RE = /\bneumático|neumatico|cubierta|llanta|tire\b/i;
const BATERIA_RE = /\bbater[íi]a|battery\b/i;
const ELECTRICO_RE = /\balternador|arranque|starter|sensor|cable|fusible|foco|ampoll[ae]\b/i;
const DIRECCION_RE = /\bdirecci[oó]n|cremallera|terminal\b/i;

function normalizeRepuestoNombre(nombre: string): string {
  if (ACEITE_RE.test(nombre)) return 'Aceites';
  if (FILTRO_RE.test(nombre)) return 'Filtros';
  if (FRENO_RE.test(nombre)) return 'Frenos';
  if (SUSPENSION_RE.test(nombre)) return 'Suspensión';
  if (BUJIA_RE.test(nombre)) return 'Bujías';
  if (DISTRIBUCION_RE.test(nombre)) return 'Distribución';
  if (EMBRAGUE_RE.test(nombre)) return 'Embrague';
  if (REFRIGERACION_RE.test(nombre)) return 'Refrigeración';
  if (NEUMATICO_RE.test(nombre)) return 'Neumáticos';
  if (BATERIA_RE.test(nombre)) return 'Baterías';
  if (ELECTRICO_RE.test(nombre)) return 'Eléctrico';
  if (DIRECCION_RE.test(nombre)) return 'Dirección';
  return 'Otros';
}

function calcOT(
  ot: OTRow,
  valorHora: number,
  costoRepsInvData: { costo: number; venta: number } | undefined,
  facturasOT: FacturaRow[],
  factorBoleta = 0
) {
  const ingreso = ot.cot_total ?? 0;
  const ingresoMO = ot.cot_mo ?? 0;
  let ingresoRepsCot = 0;
  try {
    const reps = JSON.parse(ot.cot_repuestos ?? '[]') as Array<{ cantidad: number; valor_unitario: number }>;
    ingresoRepsCot = reps.reduce((s, r) => s + r.cantidad * r.valor_unitario, 0);
  } catch { /* */ }

  const h = ot.horas_trabajadas ?? horasAuto(ot.fecha_hora_inicio, ot.fecha_hora_fin);
  const costoMOBase = ot.costo_mo_override !== null ? ot.costo_mo_override : h * valorHora;
  const costoMO = factorBoleta > 0 ? costoMOBase / (1 - factorBoleta / 100) : costoMOBase;

  let costoRepsCotTotal = 0;
  try {
    const costosCot = JSON.parse(ot.costo_repuestos_cot ?? 'null') as (number | null)[] | null ?? [];
    const repsCot = JSON.parse(ot.cot_repuestos ?? '[]') as Array<{ cantidad: number }>;
    costoRepsCotTotal = repsCot.reduce((s, r, i) => s + r.cantidad * (costosCot[i] ?? 0), 0);
  } catch { /* */ }

  const costoFacturasNoAsignadas = facturasOT.reduce((sum, f) => {
    try {
      const lines = JSON.parse(f.items) as Array<{ match_key: string | null; total: number; cantidad: number; precio_unitario: number }>;
      const costoAsignado = lines.filter(l => l.match_key).reduce((s, l) => s + (l.total || l.cantidad * l.precio_unitario), 0);
      return sum + Math.max(0, (f.total_neto ?? 0) - costoAsignado);
    } catch { return sum + (f.total_neto ?? 0); }
  }, 0);

  const costoRepsInv = costoRepsInvData?.costo ?? 0;
  const costoRepsCalculado = costoRepsInv + costoRepsCotTotal + costoFacturasNoAsignadas;
  const costoReps = ot.costo_repuestos_override !== null ? ot.costo_repuestos_override : costoRepsCalculado;
  const totalCostoCalculado = costoReps + costoMO;
  const totalCosto = ot.costo_total_override !== null ? ot.costo_total_override : totalCostoCalculado;
  const ganancia = ingreso - totalCosto;
  const margen = ingreso > 0 ? (ganancia / ingreso) * 100 : 0;
  return { ingreso, ingresoMO, ingresoRepsCot, costoMO, costoReps, totalCosto, ganancia, margen };
}

const PERIODOS = [
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: 'Todo', days: 0 },
] as const;

// ── Export Excel ─────────────────────────────────────────────────────────────
async function exportarExcel(
  rows: OTRow[],
  valorHora: number,
  costoRepuestosPorOT: Record<number, { costo: number; venta: number }>,
  facturasMap: Record<number, FacturaRow[]>,
  mecanicoFactores: Record<number, { tipo_pago: string; factor_boleta: number }>,
) {
  const XLSX = await import('xlsx');
  const data = rows.map(ot => {
    const factor = ot.mecanico_id != null ? (mecanicoFactores[ot.mecanico_id]?.factor_boleta ?? 0) : 0;
    const c = calcOT(ot, valorHora, costoRepuestosPorOT[ot.id], facturasMap[ot.id] ?? [], factor);
    return {
      'N° OT': ot.numero,
      'Patente': ot.vehiculo_patente ?? '',
      'Cliente': ot.cliente_nombre ?? '',
      'Mecánico': ot.mecanico_nombre ?? '',
      'Ingreso': c.ingreso,
      'Costo MO': c.costoMO,
      'Costo Repuestos': c.costoReps,
      'Ganancia': c.ganancia,
      'Margen %': parseFloat(c.margen.toFixed(1)),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rentabilidad');
  XLSX.writeFile(wb, `rentabilidad_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

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
  const [gastos, setGastos] = useState<GastoEstructura[]>([]);
  const [insumos, setInsumos] = useState<InsumoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<number>(90);
  const [mesFiltro, setMesFiltro] = useState<string>(''); // 'YYYY-MM' o vacío
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [expandedOTs, setExpandedOTs] = useState<Set<number>>(new Set());
  const [expandedInsumos, setExpandedInsumos] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch('/api/rentabilidad').then(r => r.json() as Promise<RentabilidadData>),
      fetch('/api/gastos-estructura').then(r => r.json() as Promise<GastoEstructura[]>),
    ]).then(([d, g]) => {
        setData(d);
        setGastos(g.filter(x => x.activo));

        // Recolectar nombres únicos de inventario + cotizaciones
        const namesSet = new Set<string>();
        for (const r of d.repuestosDetalle) {
          if (r.nombre) namesSet.add(r.nombre);
        }
        for (const ot of d.ots) {
          try {
            const reps = JSON.parse(ot.cot_repuestos ?? '[]') as Array<{ detalle: string }>;
            for (const r of reps) { if (r.detalle) namesSet.add(r.detalle); }
          } catch { /* */ }
        }
        const uniqueNames = [...namesSet];

        if (uniqueNames.length > 0) {
          fetch('/api/categorize-repuestos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombres: uniqueNames }),
          })
            .then(r => r.json() as Promise<Record<string, string>>)
            .then(setCategorias)
            .catch(() => { /* fallback to normalization */ });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch insumos cuando cambia el filtro de período
  useEffect(() => {
    let url = '/api/insumos';
    if (mesFiltro) {
      url += `?mes=${mesFiltro}`;
    } else if (periodo > 0) {
      const desde = new Date();
      desde.setDate(desde.getDate() - periodo);
      url += `?desde=${desde.toISOString().slice(0, 10)}`;
    }
    // periodo === 0 (Todo): sin filtro de fecha → trae todo
    fetch(url)
      .then(r => r.json() as Promise<InsumoStats[]>)
      .then(d => setInsumos(Array.isArray(d) ? d : []))
      .catch(() => setInsumos([]));
  }, [mesFiltro, periodo]);

  // Filtrar por período o mes específico
  const otsFiltradas = useMemo(() => {
    if (!data) return [];
    if (mesFiltro) {
      return data.ots.filter(ot => {
        const fecha = ot.fecha_hora_fin ?? ot.updated_at;
        return fecha ? fecha.slice(0, 7) === mesFiltro : false;
      });
    }
    if (periodo === 0) return data.ots;
    const desde = new Date();
    desde.setDate(desde.getDate() - periodo);
    return data.ots.filter(ot => {
      const fecha = ot.fecha_hora_fin ?? ot.updated_at;
      return fecha ? new Date(fecha) >= desde : false;
    });
  }, [data, periodo, mesFiltro]);

  // Map facturas por OT
  const facturasMap = useMemo(() => {
    if (!data) return {} as Record<number, FacturaRow[]>;
    const map: Record<number, FacturaRow[]> = {};
    for (const f of data.facturas) {
      if (f.ot_id === null) continue;
      if (!map[f.ot_id]) map[f.ot_id] = [];
      map[f.ot_id].push(f);
    }
    return map;
  }, [data]);

  // Calcular agregados
  const stats = useMemo(() => {
    if (!data) return null;
    let totalIngreso = 0, totalCostoMO = 0, totalCostoReps = 0, totalGanancia = 0;
    let totalIngresoMO = 0, totalIngresoReps = 0;

    for (const ot of otsFiltradas) {
      const factor = ot.mecanico_id != null ? (data.mecanicoFactores[ot.mecanico_id]?.factor_boleta ?? 0) : 0;
      const c = calcOT(ot, data.valorHora, data.costoRepuestosPorOT[ot.id], facturasMap[ot.id] ?? [], factor);
      totalIngreso += c.ingreso;
      totalCostoMO += c.costoMO;
      totalCostoReps += c.costoReps;
      totalGanancia += c.ganancia;
      totalIngresoMO += c.ingresoMO;
      totalIngresoReps += c.ingresoRepsCot;
    }

    const totalCosto = totalCostoMO + totalCostoReps;
    const margenProm = totalIngreso > 0 ? (totalGanancia / totalIngreso) * 100 : 0;

    return { totalIngreso, totalCostoMO, totalCostoReps, totalCosto, totalGanancia, margenProm, totalIngresoMO, totalIngresoReps };
  }, [data, otsFiltradas, facturasMap]);

  // Costo M.O. por mecánico
  const mecanicoCosts = useMemo(() => {
    if (!data) return [];
    const map: Record<string, { nombre: string; totalMO: number; nOTs: number }> = {};
    for (const ot of otsFiltradas) {
      const factor = ot.mecanico_id != null ? (data.mecanicoFactores[ot.mecanico_id]?.factor_boleta ?? 0) : 0;
      const c = calcOT(ot, data.valorHora, data.costoRepuestosPorOT[ot.id], facturasMap[ot.id] ?? [], factor);
      const key = ot.mecanico_nombre ?? 'Sin asignar';
      if (!map[key]) map[key] = { nombre: key, totalMO: 0, nOTs: 0 };
      map[key].totalMO += c.costoMO;
      map[key].nOTs += 1;
    }
    return Object.values(map).sort((a, b) => b.totalMO - a.totalMO);
  }, [data, otsFiltradas, facturasMap]);

  // Consumo de insumos por categoría (solo desde cot_repuestos para evitar doble conteo)
  const consumoPorCategoria = useMemo(() => {
    if (!data) return {} as Record<string, { unidad: string; totalCantidad: number; items: Array<{ otNumero: string; detalle: string; cantidad: number }> }>;
    const map: Record<string, { unidad: string; totalCantidad: number; items: Array<{ otNumero: string; detalle: string; cantidad: number }> }> = {};

    for (const ot of otsFiltradas) {
      try {
        const reps = JSON.parse(ot.cot_repuestos ?? '[]') as Array<{ detalle: string; cantidad: number }>;
        for (const r of reps) {
          if (!r.detalle || r.cantidad <= 0) continue;
          const cat = categorias[r.detalle] ?? normalizeRepuestoNombre(r.detalle);
          const unidad = (cat === 'Aceites' || cat === 'Refrigeración') ? 'L' : 'uds.';
          if (!map[cat]) map[cat] = { unidad, totalCantidad: 0, items: [] };
          map[cat].totalCantidad += r.cantidad;
          map[cat].items.push({ otNumero: ot.numero, detalle: r.detalle, cantidad: r.cantidad });
        }
      } catch { /* */ }
    }

    return map;
  }, [data, otsFiltradas, categorias]);

  // Cuántos meses cubre el período seleccionado (para prorratear costos fijos)
  const mesesPeriodo = useMemo(() => {
    if (mesFiltro) return 1;
    if (periodo === 30) return 1;
    if (periodo === 90) return 3;
    if (periodo === 180) return 6;
    // Todo: rango real de las OTs filtradas
    if (otsFiltradas.length === 0) return 1;
    const dates = otsFiltradas
      .map(ot => new Date(ot.fecha_hora_fin ?? ot.updated_at).getTime())
      .filter(t => !isNaN(t));
    if (dates.length === 0) return 1;
    const diffMs = Math.max(...dates) - Math.min(...dates);
    return Math.max(1, Math.round(diffMs / (30 * 24 * 3600 * 1000)));
  }, [mesFiltro, periodo, otsFiltradas]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Rentabilidad</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Costos y márgenes de las órdenes terminadas</p>
        </div>
        {/* Filtro período + exportar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
            {PERIODOS.map(p => (
              <button
                key={p.days}
                onClick={() => { setPeriodo(p.days); setMesFiltro(''); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!mesFiltro && periodo === p.days ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="month"
            value={mesFiltro}
            onChange={e => setMesFiltro(e.target.value)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${mesFiltro ? 'bg-white border-zinc-900 text-zinc-900 shadow-sm' : 'bg-zinc-100 border-transparent text-zinc-500 hover:text-zinc-700'}`}
            title="Filtrar por mes"
          />
          {data && otsFiltradas.length > 0 && (
            <button
              onClick={() => exportarExcel(otsFiltradas, data.valorHora, data.costoRepuestosPorOT, facturasMap, data.mecanicoFactores)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              title="Exportar a Excel"
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
          )}
        </div>
      </div>

      {/* ── Cards resumen ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* ── Ingresos por categoría ───────────────────────────────────────── */}
      {stats && stats.totalIngreso > 0 && (
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
      )}

      {/* ── Mecánico + Top repuestos ──────────────────────────────────────── */}
      {otsFiltradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Costo MO por mecánico */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              Costo M.O. por mecánico
            </h2>
            {mecanicoCosts.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">Sin datos de mecánicos.</p>
            ) : (
              <div className="space-y-3">
                {mecanicoCosts.map(m => (
                  <Bar
                    key={m.nombre}
                    label={`${m.nombre} (${m.nOTs} OT${m.nOTs !== 1 ? 's' : ''})`}
                    value={m.totalMO}
                    max={mecanicoCosts[0].totalMO}
                    color="bg-blue-400"
                  />
                ))}
              </div>
            )}
            {mecanicoCosts.length > 0 && stats && (
              <div className="border-t border-zinc-100 pt-3 flex justify-between text-sm font-semibold text-zinc-800">
                <span>Total M.O.</span>
                <span>{formatCLP(stats.totalCostoMO)}</span>
              </div>
            )}
          </div>

          {/* Costos detalle (desde facturas) */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Package className="h-4 w-4 text-zinc-400" />
              Costos detalle
            </h2>
            {insumos.length === 0 && (!stats || stats.totalCostoMO === 0) ? (
              <p className="text-xs text-zinc-400 italic">Sin facturas de compra en el período.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxVal = Math.max(insumos[0]?.totalGasto ?? 0, stats?.totalCostoMO ?? 0);
                  return (
                    <>
                      {stats && stats.totalCostoMO > 0 && (
                        <Bar label="Mano de obra" value={stats.totalCostoMO} max={maxVal} color="bg-amber-400" />
                      )}
                      {insumos.length > 0 && stats && stats.totalCostoMO > 0 && (
                        <div className="border-t border-zinc-100" />
                      )}
                      {insumos.map(ins => (
                        <Bar
                          key={ins.cat}
                          label={ins.cat}
                          value={ins.totalGasto}
                          max={maxVal}
                          color="bg-orange-400"
                        />
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Estado de Resultados ─────────────────────────────────────────── */}
      {stats && gastos.length > 0 && (() => {
        // Determinar rango de meses del período para filtrar puntuales
        const mesesEnRango = new Set<string>();
        if (mesFiltro) {
          mesesEnRango.add(mesFiltro);
        } else {
          const hoy = new Date();
          const desde = periodo === 0
            ? (otsFiltradas.length > 0
              ? new Date(Math.min(...otsFiltradas.map(o => new Date(o.fecha_hora_fin ?? o.updated_at).getTime())))
              : new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1))
            : new Date(hoy.getTime() - periodo * 24 * 3600 * 1000);
          const cur = new Date(desde.getFullYear(), desde.getMonth(), 1);
          while (cur <= hoy) {
            mesesEnRango.add(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
            cur.setMonth(cur.getMonth() + 1);
          }
        }

        const gastosPuntuales = gastos.filter(g => g.tipo === 'puntual' && g.mes && mesesEnRango.has(g.mes));
        const totalPuntuales = gastosPuntuales.reduce((s, g) => s + g.monto_mensual, 0);
        const totalFijos = gastos.filter(g => g.tipo === 'fijo').reduce((s, g) => s + g.monto_mensual * mesesPeriodo, 0);
        const totalGav = gastos.filter(g => g.tipo === 'gav').reduce((s, g) => s + g.monto_mensual * mesesPeriodo, 0);
        const margenBruto = stats.totalIngreso - stats.totalCosto;
        const ebit = margenBruto - totalFijos - totalGav - totalPuntuales;
        const margenBrutoPct = stats.totalIngreso > 0 ? (margenBruto / stats.totalIngreso) * 100 : 0;
        const margenNetoEEPct = stats.totalIngreso > 0 ? (ebit / stats.totalIngreso) * 100 : 0;
        const ResultIcon = ebit > 0 ? TrendingUp : ebit < 0 ? TrendingDown : Minus;
        const resultColor = ebit > 0 ? 'text-green-600' : ebit < 0 ? 'text-red-600' : 'text-zinc-500';
        const resultBg = ebit > 0 ? 'bg-green-50 border-green-200' : ebit < 0 ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200';

        const Row = ({ label, value, bold, indent, separator, color }: { label: string; value: number; bold?: boolean; indent?: boolean; separator?: boolean; color?: string }) => (
          <div className={`flex justify-between text-sm py-1.5 ${separator ? 'border-t border-zinc-200 mt-1 pt-2.5' : ''}`}>
            <span className={`${indent ? 'pl-4 text-zinc-500' : bold ? 'font-semibold text-zinc-800' : 'text-zinc-600'}`}>{label}</span>
            <span className={`font-medium ${color ?? (bold ? 'text-zinc-900' : 'text-zinc-700')}`}>{formatCLP(value)}</span>
          </div>
        );

        return (
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zinc-400" />
                Estado de Resultados
              </h2>
              <span className="text-xs text-zinc-400">{mesesPeriodo} {mesesPeriodo === 1 ? 'mes' : 'meses'}</span>
            </div>
            <div className="space-y-0">
              <Row label="Ingresos netos" value={stats.totalIngreso} bold />
              <Row label="Costo M.O." value={stats.totalCostoMO} indent />
              <Row label="Costo repuestos" value={stats.totalCostoReps} indent />
              <Row label="Margen bruto" value={margenBruto} bold separator color={margenBruto >= 0 ? 'text-green-700' : 'text-red-600'} />
              <div className="text-xs text-zinc-400 text-right -mt-1 pb-1">{margenBrutoPct.toFixed(1)}% del ingreso</div>
              {gastos.filter(g => g.tipo === 'fijo').map(g => (
                <Row key={g.id} label={g.nombre} value={g.monto_mensual * mesesPeriodo} indent />
              ))}
              {totalFijos > 0 && <Row label="Total costos fijos" value={totalFijos} bold separator />}
              {gastos.filter(g => g.tipo === 'gav').map(g => (
                <Row key={g.id} label={g.nombre} value={g.monto_mensual * mesesPeriodo} indent />
              ))}
              {totalGav > 0 && <Row label="Total GAV" value={totalGav} bold separator />}
              {gastosPuntuales.length > 0 && (
                <>
                  {gastosPuntuales.map(g => (
                    <Row key={g.id} label={`${g.nombre}${g.mes ? ` (${g.mes.slice(0, 7)})` : ''}`} value={g.monto_mensual} indent />
                  ))}
                  <Row label="Total gastos puntuales" value={totalPuntuales} bold separator />
                </>
              )}
            </div>
            <div className={`mt-4 p-4 rounded-xl border ${resultBg} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <ResultIcon className={`h-5 w-5 ${resultColor}`} />
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Resultado del período</p>
                  <p className={`text-2xl font-bold ${resultColor}`}>{formatCLP(ebit)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-medium">Margen neto</p>
                <p className={`text-xl font-bold ${resultColor}`}>{margenNetoEEPct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Consumo vs Compras ───────────────────────────────────────────── */}
      {(() => {
        const allCats = new Set([
          ...Object.keys(consumoPorCategoria),
          ...insumos.map(i => i.cat),
        ]);
        const rows = [...allCats].map(cat => {
          const consumo = consumoPorCategoria[cat];
          const compra = insumos.find(i => i.cat === cat);
          const unidad = consumo?.unidad ?? compra?.unidad ?? 'uds.';
          const cantidadUsada = consumo?.totalCantidad ?? 0;
          const gastoFacturas = compra?.totalGasto ?? 0;
          const precioPorUnidad = cantidadUsada > 0 && gastoFacturas > 0
            ? gastoFacturas / cantidadUsada : 0;
          const items = consumo?.items ?? [];
          return { cat, unidad, cantidadUsada, gastoFacturas, precioPorUnidad, items };
        }).filter(r => r.cantidadUsada > 0 || r.gastoFacturas > 0)
          .sort((a, b) => b.gastoFacturas - a.gastoFacturas || b.cantidadUsada - a.cantidadUsada);

        if (rows.length === 0) return null;

        return (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Consumo vs Compras</h2>
              <span className="ml-auto text-xs text-zinc-400">Consumo desde OTs · Gasto desde facturas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="w-8 px-2 py-2.5" />
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">Categoría</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500">Consumido (OTs)</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500">Gasto (facturas)</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-zinc-500">Precio / unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.flatMap(r => {
                    const isExpanded = expandedInsumos.has(r.cat);
                    const toggleExpand = () => setExpandedInsumos(prev => {
                      const next = new Set(prev);
                      if (next.has(r.cat)) next.delete(r.cat); else next.add(r.cat);
                      return next;
                    });
                    const mainRow = (
                      <tr key={r.cat} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-2 py-2.5 text-center">
                          {r.items.length > 0 ? (
                            <button onClick={toggleExpand} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-zinc-700">{r.cat}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
                          {r.cantidadUsada > 0
                            ? r.unidad === 'L' ? `${r.cantidadUsada.toFixed(1)} L` : `${Math.round(r.cantidadUsada)} uds.`
                            : <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-zinc-800">
                          {r.gastoFacturas > 0 ? formatCLP(r.gastoFacturas) : <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                          {r.precioPorUnidad > 0 ? `${formatCLP(r.precioPorUnidad)} / ${r.unidad}` : <span className="text-zinc-300">—</span>}
                        </td>
                      </tr>
                    );
                    if (!isExpanded || r.items.length === 0) return [mainRow];
                    const detailRow = (
                      <tr key={`${r.cat}-detail`} className="bg-zinc-50 border-b border-zinc-100">
                        <td colSpan={5} className="px-6 py-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-zinc-400 border-b border-zinc-200">
                                <th className="text-left pb-1.5 pr-4 font-medium">OT</th>
                                <th className="text-left pb-1.5 pr-4 font-medium">Ítem</th>
                                <th className="text-right pb-1.5 font-medium">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.items.map((item, i) => (
                                <tr key={i} className="border-b border-zinc-100 last:border-0">
                                  <td className="py-1 pr-4 font-mono text-zinc-500">{item.otNumero}</td>
                                  <td className="py-1 pr-4 text-zinc-600">{item.detalle}</td>
                                  <td className="py-1 text-right tabular-nums text-zinc-700 font-medium">
                                    {r.unidad === 'L' ? `${item.cantidad} L` : `${item.cantidad} uds.`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    );
                    return [mainRow, detailRow];
                  })}
                </tbody>
                {rows.some(r => r.gastoFacturas > 0) && (
                  <tfoot>
                    <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold">
                      <td colSpan={2} className="px-4 py-2.5 text-xs text-zinc-500">Total gasto en facturas</td>
                      <td />
                      <td className="px-4 py-2.5 text-right text-zinc-800">
                        {formatCLP(rows.reduce((s, r) => s + r.gastoFacturas, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        );
      })()}

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
                <th className="w-8 px-2 py-2.5" />
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500">OT</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 hidden md:table-cell">Cliente / Vehículo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 hidden md:table-cell">Mecánico</th>
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
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">
                    No hay órdenes en el período seleccionado.
                  </td>
                </tr>
              ) : (
                otsFiltradas.flatMap(ot => {
                  const factor = ot.mecanico_id != null ? (data!.mecanicoFactores[ot.mecanico_id]?.factor_boleta ?? 0) : 0;
                  const c = calcOT(ot, data!.valorHora, data!.costoRepuestosPorOT[ot.id], facturasMap[ot.id] ?? [], factor);
                  const rowMargenColor = c.margen > 30 ? 'text-green-600 bg-green-50' : c.margen > 10 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                  const otFacturas = facturasMap[ot.id] ?? [];
                  const isExpanded = expandedOTs.has(ot.id);
                  const rows = [
                    <tr key={ot.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                      <td className="px-2 py-2.5 text-center">
                        {otFacturas.length > 0 ? (
                          <button
                            onClick={() => setExpandedOTs(prev => {
                              const next = new Set(prev);
                              if (next.has(ot.id)) next.delete(ot.id); else next.add(ot.id);
                              return next;
                            })}
                            className="text-zinc-400 hover:text-zinc-700 transition-colors"
                            title={isExpanded ? 'Ocultar facturas' : 'Ver facturas'}
                          >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/ordenes-trabajo/${ot.id}`} className="font-mono font-semibold text-zinc-900 hover:text-blue-600 hover:underline text-xs">
                          {ot.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <p className="text-zinc-700 text-xs">{ot.cliente_nombre ?? '—'}</p>
                        <p className="text-zinc-400 text-xs">{ot.vehiculo_patente} · {ot.vehiculo_marca} {ot.vehiculo_modelo}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600 hidden md:table-cell">{ot.mecanico_nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-zinc-800">{formatCLP(c.ingreso)}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-500 hidden lg:table-cell">{formatCLP(c.costoMO)}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-500 hidden lg:table-cell">{formatCLP(c.costoReps)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${c.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCLP(c.ganancia)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${rowMargenColor}`}>
                          {c.margen.toFixed(1)}%
                        </span>
                      </td>
                    </tr>,
                  ];
                  if (isExpanded && otFacturas.length > 0) {
                    rows.push(
                      <tr key={`${ot.id}-facturas`} className="bg-zinc-50 border-b border-zinc-100">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <FileText className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-500">Facturas de compra</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-zinc-400 border-b border-zinc-200">
                                  <th className="text-left pb-1.5 pr-4 font-medium">N° Factura</th>
                                  <th className="text-left pb-1.5 pr-4 font-medium">Proveedor</th>
                                  <th className="text-left pb-1.5 pr-4 font-medium hidden sm:table-cell">Fecha</th>
                                  <th className="text-right pb-1.5 pr-4 font-medium">Neto</th>
                                  <th className="text-right pb-1.5 font-medium">Total</th>
                                  <th className="pb-1.5 pl-3 w-8" />
                                </tr>
                              </thead>
                              <tbody>
                                {otFacturas.map(f => (
                                  <tr key={f.id} className="border-b border-zinc-100 last:border-0">
                                    <td className="py-1.5 pr-4 font-mono text-zinc-700">{f.numero}</td>
                                    <td className="py-1.5 pr-4 text-zinc-600">{f.proveedor_nombre}</td>
                                    <td className="py-1.5 pr-4 text-zinc-500 hidden sm:table-cell">{f.fecha_emision ? new Date(f.fecha_emision).toLocaleDateString('es-CL') : '—'}</td>
                                    <td className="py-1.5 pr-4 text-right text-zinc-700">{formatCLP(f.total_neto)}</td>
                                    <td className="py-1.5 text-right font-medium text-zinc-800">{formatCLP(f.total)}</td>
                                    <td className="py-1.5 pl-3 text-center">
                                      {f.pdf_url ? (
                                        <a href={f.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Ver PDF">
                                          <FileText className="h-3.5 w-3.5" />
                                        </a>
                                      ) : null}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })
              )}
            </tbody>
            {otsFiltradas.length > 0 && stats && (
              <tfoot>
                <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold">
                  <td className="px-4 py-2.5 text-xs text-zinc-500" colSpan={4}>{otsFiltradas.length} OTs</td>
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
