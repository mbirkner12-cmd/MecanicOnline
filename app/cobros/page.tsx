'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DollarSign, CheckCircle2, Clock, Filter } from 'lucide-react';
import { EstadoBadgeOT, type EstadoOT } from '@/components/ordenes-trabajo/EstadoBadgeOT';

interface CobroRow {
  id: number;
  numero: string;
  estado: EstadoOT;
  metodo_pago: string | null;
  pagado: boolean;
  fecha_hora_fin: string | null;
  updated_at: string;
  vehiculo: { patente: string; marca: string; modelo: string; anio: number } | null;
  cliente: { nombre: string; telefono: string | null } | null;
  cotizacion: { total: number; mano_de_obra_monto: number; retiro_entrega_monto: number } | null;
}

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
}

function formatFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CobrosPage() {
  const [cobros, setCobros] = useState<CobroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'pagado'>('todos');
  const [actualizando, setActualizando] = useState<number | null>(null);

  const fetchCobros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cobros');
      if (res.ok) setCobros(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCobros(); }, [fetchCobros]);

  async function actualizarPago(id: number, campos: { pagado?: boolean; metodo_pago?: string | null }) {
    setActualizando(id);
    try {
      await fetch(`/api/ordenes-trabajo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      });
      setCobros(prev => prev.map(c => c.id === id ? { ...c, ...campos } : c));
    } finally {
      setActualizando(null);
    }
  }

  const filtrados = cobros.filter(c => {
    if (filtro === 'pendiente') return !c.pagado;
    if (filtro === 'pagado') return c.pagado;
    return true;
  });

  const totalPendiente = cobros.filter(c => !c.pagado).reduce((s, c) => s + (c.cotizacion?.total ?? 0) * 1.19, 0);
  const totalCobrado = cobros.filter(c => c.pagado).reduce((s, c) => s + (c.cotizacion?.total ?? 0) * 1.19, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Cobros</h1>
        <p className="text-zinc-500 text-sm mt-0.5">OTs listas para entregar y entregadas</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Pendiente de cobro</p>
            <p className="text-lg font-bold text-zinc-900">{formatCLP(totalPendiente)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Cobrado (historial)</p>
            <p className="text-lg font-bold text-zinc-900">{formatCLP(totalCobrado)}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        {(['todos', 'pendiente', 'pagado'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Pagados'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">N° OT</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Cliente / Vehículo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden md:table-cell">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500">Total (c/IVA)</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 hidden lg:table-cell">Método</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">Pagado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-zinc-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-400 text-sm">
                  No hay órdenes en este estado.
                </td>
              </tr>
            ) : (
              filtrados.map(c => (
                <tr key={c.id} className={`border-b border-zinc-100 last:border-0 transition-colors ${c.pagado ? 'bg-green-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/ordenes-trabajo/${c.id}`} className="font-mono font-semibold text-zinc-900 hover:text-blue-600 hover:underline">
                      {c.numero}
                    </Link>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatFecha(c.fecha_hora_fin ?? c.updated_at)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{c.cliente?.nombre ?? '—'}</p>
                    <p className="text-xs text-zinc-400">
                      {c.vehiculo ? `${c.vehiculo.patente} · ${c.vehiculo.marca} ${c.vehiculo.modelo} ${c.vehiculo.anio}` : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <EstadoBadgeOT estado={c.estado} />
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-900">
                    {formatCLP((c.cotizacion?.total ?? 0) * 1.19)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <select
                      value={c.metodo_pago ?? ''}
                      disabled={actualizando === c.id}
                      onChange={e => actualizarPago(c.id, { metodo_pago: e.target.value || null })}
                      className="border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 w-36"
                    >
                      <option value="">Sin especificar</option>
                      {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={actualizando === c.id}
                      onClick={() => actualizarPago(c.id, { pagado: !c.pagado })}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                        c.pagado
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                      title={c.pagado ? 'Marcar como no pagado' : 'Marcar como pagado'}
                    >
                      {c.pagado
                        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Pagado</>
                        : <><DollarSign className="h-3.5 w-3.5" /> Pendiente</>
                      }
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
