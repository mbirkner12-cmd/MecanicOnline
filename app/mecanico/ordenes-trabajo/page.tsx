'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EstadoBadgeOT, type EstadoOT } from '@/components/ordenes-trabajo/EstadoBadgeOT';
import { ClipboardList, Eye, Play, ClipboardCheck, Plus } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';

interface OTMecanico {
  id: number;
  numero: string;
  estado: EstadoOT;
  mecanico_id: number | null;
  recepcion_id: number | null;
  fecha_estimada_inicio: string | null;
  fecha_estimada_fin: string | null;
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
  } | null;
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return iso; }
}

export default function MecanicoOrdenesPage() {
  const { session, loading: sessionLoading } = useSession();
  const [ordenes, setOrdenes] = useState<OTMecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [iniciando, setIniciando] = useState<number | null>(null);

  const fetchOrdenes = async () => {
    if (!session?.mecanicoId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ordenes-trabajo');
      if (!res.ok) return;
      const data = await res.json() as OTMecanico[];
      setOrdenes(data.filter((ot) => ot.mecanico_id === session.mecanicoId && ot.estado !== 'entregado'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && session) fetchOrdenes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionLoading]);

  async function handleIniciar(ot: OTMecanico) {
    setIniciando(ot.id);
    try {
      await fetch(`/api/ordenes-trabajo/${ot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'en_reparacion' }),
      });
      await fetchOrdenes();
    } finally {
      setIniciando(null);
    }
  }

  if (sessionLoading) return <div className="animate-pulse h-8 bg-zinc-100 rounded w-48" />;

  const pendientes = ordenes.filter(ot => ot.estado === 'creada');
  const activas = ordenes.filter(ot => ot.estado === 'en_reparacion');
  const terminadas = ordenes.filter(ot => ot.estado === 'listo_para_entregar');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mis órdenes de trabajo</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Órdenes asignadas a ti</p>
        </div>
        <Link href="/mecanico/nueva-ot">
          <Button className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white">
            <Plus className="size-4" />
            Nueva OT
          </Button>
        </Link>
      </div>

      {/* Pendientes de iniciar */}
      {pendientes.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-blue-700">
              <Play className="size-4" />
              Pendientes de iniciar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">N° OT</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Vehículo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Fecha estimada</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((ot) => (
                  <tr key={ot.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900">{ot.numero}</td>
                    <td className="py-2.5 px-3 text-zinc-700">
                      <span className="font-medium">{ot.vehiculo?.patente ?? '—'}</span>
                      <span className="text-zinc-400 ml-2 text-xs">{ot.vehiculo ? `${ot.vehiculo.marca} ${ot.vehiculo.modelo} ${ot.vehiculo.anio}` : ''}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">{formatFecha(ot.fecha_estimada_inicio)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ot.recepcion_id === null ? (
                          <Link href={`/mecanico/ordenes-trabajo/${ot.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                              <ClipboardCheck className="size-3 mr-1" />
                              Registrar ingreso
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={iniciando === ot.id}
                            onClick={() => handleIniciar(ot)}
                          >
                            <Play className="size-3 mr-1" />
                            {iniciando === ot.id ? 'Iniciando...' : 'Iniciar'}
                          </Button>
                        )}
                        <Link href={`/mecanico/ordenes-trabajo/${ot.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            <Eye className="size-3" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* En reparación */}
      {activas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="size-4 text-zinc-500" />
              En reparación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OTTable ordenes={activas} />
          </CardContent>
        </Card>
      )}

      {/* Listas para entregar */}
      {terminadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="size-4 text-zinc-500" />
              Listas para entregar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OTTable ordenes={terminadas} />
          </CardContent>
        </Card>
      )}

      {ordenes.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-400 italic">No tienes órdenes de trabajo asignadas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OTTable({ ordenes }: { ordenes: OTMecanico[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-100">
          <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">N° OT</th>
          <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Vehículo</th>
          <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Estado</th>
          <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {ordenes.map((ot) => (
          <tr key={ot.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
            <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900">{ot.numero}</td>
            <td className="py-2.5 px-3 text-zinc-700">
              <span className="font-medium">{ot.vehiculo?.patente ?? '—'}</span>
              <span className="text-zinc-400 ml-2 text-xs">{ot.vehiculo ? `${ot.vehiculo.marca} ${ot.vehiculo.modelo} ${ot.vehiculo.anio}` : ''}</span>
            </td>
            <td className="py-2.5 px-3">
              <EstadoBadgeOT estado={ot.estado} sinRecepcion={ot.recepcion_id === null} />
            </td>
            <td className="py-2.5 px-3 text-right">
              <Link href={`/mecanico/ordenes-trabajo/${ot.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Eye className="size-3 mr-1" />
                  Ver
                </Button>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
