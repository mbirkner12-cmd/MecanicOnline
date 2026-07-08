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
import { ClipboardList, Eye } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';

interface OTMecanico {
  id: number;
  numero: string;
  estado: EstadoOT;
  mecanico_id: number | null;
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function MecanicoOrdenesPage() {
  const { session, loading: sessionLoading } = useSession();
  const [ordenes, setOrdenes] = useState<OTMecanico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading || !session?.mecanicoId) return;

    const fetchOrdenes = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/ordenes-trabajo');
        if (!res.ok) return;
        const data = await res.json() as OTMecanico[];
        setOrdenes(data.filter((ot) => ot.mecanico_id === session.mecanicoId));
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, [session, sessionLoading]);

  if (sessionLoading) {
    return <div className="animate-pulse h-8 bg-zinc-100 rounded w-48" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Mis órdenes de trabajo</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Órdenes asignadas a ti</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardList className="size-4 text-zinc-500" />
            Listado de OT
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : ordenes.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No tienes órdenes de trabajo asignadas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">N° OT</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Patente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Estado</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Fecha estimada</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((ot) => (
                  <tr key={ot.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900">{ot.numero}</td>
                    <td className="py-2.5 px-3 text-zinc-700">
                      {ot.vehiculo?.patente ?? '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <EstadoBadgeOT estado={ot.estado} />
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">
                      {formatFecha(ot.fecha_estimada_fin)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/mecanico/ordenes-trabajo/${ot.id}`}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-zinc-700 hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Eye className="size-3" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
