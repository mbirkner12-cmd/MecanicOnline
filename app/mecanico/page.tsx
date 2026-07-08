'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Car, Stethoscope, AlertTriangle } from 'lucide-react';
import { getAlertaDocumentos } from '@/lib/utils/documentos';
import { useSession } from '@/lib/hooks/useSession';

interface RecepcionMecanico {
  id: number;
  vehiculo_id: number;
  cliente_id: number;
  fecha_hora_ingreso: string;
  kilometraje: number;
  mecanico_id: number | null;
  estado: string;
  diagnostico_mecanico: string | null;
  vehiculo: {
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    revision_tecnica_vencimiento?: string | null;
    permiso_circulacion_vencimiento?: string | null;
  } | null;
}

function formatFecha(iso: string): string {
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

export default function MecanicoPage() {
  const { session, loading: sessionLoading } = useSession();
  const [recepciones, setRecepciones] = useState<RecepcionMecanico[]>([]);
  const [loading, setLoading] = useState(true);

  // Diagnosticar dialog
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagTarget, setDiagTarget] = useState<RecepcionMecanico | null>(null);
  const [diagText, setDiagText] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);

  const fetchRecepciones = async () => {
    if (!session?.mecanicoId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/recepciones');
      if (!res.ok) return;
      const data = await res.json() as RecepcionMecanico[];
      // Filter by this mechanic AND estado en_diagnostico
      const filtered = data.filter(
        (r) => r.mecanico_id === session.mecanicoId && r.estado === 'en_diagnostico'
      );
      setRecepciones(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && session) {
      fetchRecepciones();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionLoading]);

  const openDiag = (r: RecepcionMecanico) => {
    setDiagTarget(r);
    setDiagText(r.diagnostico_mecanico ?? '');
    setDiagOpen(true);
  };

  const handleGuardarDiag = async () => {
    if (!diagTarget) return;
    setDiagLoading(true);
    try {
      const res = await fetch(`/api/recepciones/${diagTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnostico_mecanico: diagText || null }),
      });
      if (!res.ok) return;
      setDiagOpen(false);
      await fetchRecepciones();
    } finally {
      setDiagLoading(false);
    }
  };

  if (sessionLoading) {
    return <div className="animate-pulse h-8 bg-zinc-100 rounded w-48" />;
  }

  if (!session?.mecanicoId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">Mis vehículos en diagnóstico</h1>
        <p className="text-zinc-500 text-sm">
          Tu usuario no tiene un mecánico vinculado. Contacta al jefe de taller.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Mis vehículos en diagnóstico</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Vehículos asignados a ti con estado "En diagnóstico"</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Car className="size-4 text-zinc-500" />
            Vehículos asignados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recepciones.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No tienes vehículos en diagnóstico.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Patente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Marca y modelo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Fecha ingreso</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Diagnóstico</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recepciones.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900">
                      <span className="inline-flex items-center gap-1">
                        {r.vehiculo?.patente ?? '—'}
                        {(() => {
                          const alerta = getAlertaDocumentos(
                            r.vehiculo?.revision_tecnica_vencimiento,
                            r.vehiculo?.permiso_circulacion_vencimiento
                          );
                          if (alerta === 'vencido') {
                            return <span title="Documento vencido"><AlertTriangle className="size-3.5 text-red-500 shrink-0" /></span>;
                          }
                          if (alerta === 'por_vencer') {
                            return <span title="Documento por vencer"><AlertTriangle className="size-3.5 text-orange-500 shrink-0" /></span>;
                          }
                          return null;
                        })()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-700">
                      {r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo} ${r.vehiculo.anio}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">
                      {formatFecha(r.fecha_hora_ingreso)}
                    </td>
                    <td className="py-2.5 px-3">
                      {r.diagnostico_mecanico ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Completado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openDiag(r)}
                      >
                        <Stethoscope className="size-3 mr-1" />
                        Diagnosticar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Diagnóstico */}
      <Dialog open={diagOpen} onOpenChange={(o) => { if (!diagLoading) setDiagOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Diagnóstico — {diagTarget?.vehiculo?.patente ?? ''}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-xs text-zinc-500">
              {diagTarget?.vehiculo
                ? `${diagTarget.vehiculo.marca} ${diagTarget.vehiculo.modelo} ${diagTarget.vehiculo.anio}`
                : ''}
            </p>
            <textarea
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              value={diagText}
              onChange={(e) => setDiagText(e.target.value)}
              placeholder="Describe el diagnóstico del vehículo..."
              rows={5}
              spellCheck
              autoCapitalize="sentences"
              lang="es"
              disabled={diagLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagOpen(false)} disabled={diagLoading}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarDiag} disabled={diagLoading}>
              {diagLoading ? 'Guardando...' : 'Guardar diagnóstico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
