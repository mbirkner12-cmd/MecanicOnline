'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EstadoBadgeOT, type EstadoOT } from '@/components/ordenes-trabajo/EstadoBadgeOT';
import { ObservacionesOT, type ObservacionItem } from '@/components/ordenes-trabajo/ObservacionesOT';
import { ArrowLeft, Car, User, Wrench, Calendar, FileText, Package, ClipboardList, CheckCircle2, Circle, ClipboardCheck, FileDown } from 'lucide-react';
import { DiagnosticoDisplay } from '@/components/diagnostico/DiagnosticoDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormRecepcion, type FormRecepcionValues } from '@/components/recepcion/FormRecepcion';

interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
}

interface OTDetalleMecanico {
  id: number;
  numero: string;
  cotizacion_id: number;
  recepcion_id: number | null;
  vehiculo_id: number;
  cliente_id: number;
  mecanico_id: number | null;
  puesto_id: number | null;
  insumos: string;
  tareas_completadas: string;
  diagnostico: string | null;
  fecha_estimada_inicio: string | null;
  fecha_estimada_fin: string | null;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  estado: EstadoOT;
  created_at: string;
  vehiculo: {
    id: number;
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
  } | null;
  cliente: {
    id: number;
    rut: string;
    nombre: string;
    telefono: string | null;
  } | null;
  mecanico: {
    id: number;
    nombre: string;
  } | null;
  puesto: {
    id: number;
    nombre: string;
    tipo: string;
  } | null;
  recepcion: {
    id: number;
    motivo_ingreso: string | null;
    diagnostico_mecanico: string | null;
  } | null;
  cotizacion: {
    id: number;
    numero: string;
    total: number;
    mano_de_obra_detalle: string | null;
    mano_de_obra_monto: number;
    repuestos: string;
    retiro_entrega_monto: number;
  } | null;
  observaciones: string;
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatPesos(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function MecanicoOTDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ot, setOT] = useState<OTDetalleMecanico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accionLoading, setAccionLoading] = useState(false);
  const [tareasCompletadas, setTareasCompletadas] = useState<boolean[]>([]);
  const [tareaGuardando, setTareaGuardando] = useState<number | null>(null);
  const [recepcionDialogOpen, setRecepcionDialogOpen] = useState(false);
  const [recepcionLoading, setRecepcionLoading] = useState(false);

  const fetchOT = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ordenes-trabajo/${id}`);
      if (!res.ok) {
        if (res.status === 404) { setError('Orden de trabajo no encontrada.'); return; }
        throw new Error('Error al cargar');
      }
      const data = await res.json() as OTDetalleMecanico;
      setOT(data);
      try {
        const parsed = JSON.parse(data.tareas_completadas ?? '[]') as boolean[];
        setTareasCompletadas(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTareasCompletadas([]);
      }
    } catch {
      setError('No se pudo cargar la orden de trabajo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOT();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCambiarEstado = async (nuevoEstado: EstadoOT) => {
    if (!ot) return;
    setAccionLoading(true);
    try {
      const res = await fetch(`/api/ordenes-trabajo/${ot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      await fetchOT();
    } finally {
      setAccionLoading(false);
    }
  };

  const handleRegistrarRecepcion = async (values: FormRecepcionValues) => {
    if (!ot) return;
    setRecepcionLoading(true);
    try {
      const res = await fetch('/api/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, ot_id: ot.id }),
      });
      if (!res.ok) throw new Error('Error al registrar recepción');
      setRecepcionDialogOpen(false);
      await fetchOT();
    } finally {
      setRecepcionLoading(false);
    }
  };

  const handleToggleTarea = async (idx: number, mdoLength: number) => {
    if (!ot || ot.estado !== 'en_reparacion') return;
    const nueva = [...tareasCompletadas];
    // Extend array if shorter than items
    while (nueva.length < mdoLength) nueva.push(false);
    nueva[idx] = !nueva[idx];
    setTareasCompletadas(nueva);
    setTareaGuardando(idx);
    try {
      await fetch(`/api/ordenes-trabajo/${ot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tareas_completadas: nueva }),
      });
    } finally {
      setTareaGuardando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-zinc-100 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !ot) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/mecanico/ordenes-trabajo"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <p className="text-red-600">{error || 'Orden de trabajo no encontrada.'}</p>
      </div>
    );
  }

  // Parse mano de obra items once for reuse
  let mdoItems: { detalle: string; monto: number }[] = [];
  try { mdoItems = JSON.parse(ot.cotizacion?.mano_de_obra_detalle ?? '[]') as typeof mdoItems; } catch { /* noop */ }

  const canIniciar = ot.estado === 'creada' && ot.recepcion_id !== null;
  const todasCompletadas = mdoItems.length === 0
    || mdoItems.every((_, i) => tareasCompletadas[i] === true);
  const canTerminar = ot.estado === 'en_reparacion' && todasCompletadas;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/mecanico/ordenes-trabajo')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{ot.numero}</h1>
              <EstadoBadgeOT estado={ot.estado} sinRecepcion={ot.recepcion_id === null} />
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">
              Creada: {formatFecha(ot.created_at)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {ot.estado === 'creada' && ot.recepcion_id === null && (
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => setRecepcionDialogOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-2"
              >
                <ClipboardCheck className="size-4" />
                Registrar ingreso
              </Button>
              <p className="text-xs text-zinc-400">Debes registrar el ingreso antes de iniciar</p>
            </div>
          )}
          {canIniciar && (
            <Button
              onClick={() => handleCambiarEstado('en_reparacion')}
              disabled={accionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {accionLoading ? 'Procesando...' : 'Iniciar reparación'}
            </Button>
          )}
          {ot.estado === 'en_reparacion' && (
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => handleCambiarEstado('listo_para_entregar')}
                disabled={accionLoading || !canTerminar}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
              >
                {accionLoading ? 'Procesando...' : 'Marcar como terminado'}
              </Button>
              {!todasCompletadas && mdoItems.length > 0 && (
                <p className="text-xs text-zinc-400">
                  Faltan {mdoItems.filter((_, i) => !tareasCompletadas[i]).length} trabajo(s)
                </p>
              )}
            </div>
          )}
          {(ot.estado === 'listo_para_entregar' || ot.estado === 'entregado') && (
            <div className="flex flex-col items-end gap-2">
              <p className="text-sm text-zinc-500 italic">
                {ot.estado === 'entregado' ? 'OT entregada al cliente.' : 'Esperando entrega por el jefe.'}
              </p>
              <a
                href={`/api/ordenes-trabajo/${ot.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="flex items-center gap-2">
                  <FileDown className="size-4" />
                  Descargar PDF
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Motivo de ingreso */}
      {ot.recepcion?.motivo_ingreso && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Motivo de ingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {ot.recepcion.motivo_ingreso}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico */}
      {ot.recepcion?.diagnostico_mecanico && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="size-4 text-zinc-500" />
              Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosticoDisplay value={ot.recepcion.diagnostico_mecanico} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehículo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Car className="size-4 text-zinc-500" />
              Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Patente</dt>
                <dd className="font-mono font-semibold text-zinc-900">{ot.vehiculo?.patente ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Marca</dt>
                <dd className="text-zinc-700">{ot.vehiculo?.marca ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Modelo</dt>
                <dd className="text-zinc-700">{ot.vehiculo?.modelo ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Año</dt>
                <dd className="text-zinc-700">{ot.vehiculo?.anio ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Km actual</dt>
                <dd className="text-zinc-700">
                  {ot.vehiculo?.kilometraje_actual
                    ? `${ot.vehiculo.kilometraje_actual.toLocaleString('es-CL')} km`
                    : '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="size-4 text-zinc-500" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Nombre</dt>
                <dd className="font-medium text-zinc-900">{ot.cliente?.nombre ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Teléfono</dt>
                <dd className="text-zinc-700">{ot.cliente?.telefono ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Mecánico y puesto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="size-4 text-zinc-500" />
              Puesto asignado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Puesto</dt>
                <dd className="text-zinc-700">
                  {ot.puesto ? `${ot.puesto.nombre} (${ot.puesto.tipo})` : <span className="text-zinc-400">Sin asignar</span>}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-zinc-500" />
              Fechas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Inicio estimado</dt>
                <dd className="text-zinc-700">{formatFecha(ot.fecha_estimada_inicio)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Fin estimado</dt>
                <dd className="text-zinc-700">{formatFecha(ot.fecha_estimada_fin)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2">
                <dt className="text-zinc-500">Inicio real</dt>
                <dd className="text-zinc-700">{formatFecha(ot.fecha_hora_inicio)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Fin real</dt>
                <dd className="text-zinc-700">{formatFecha(ot.fecha_hora_fin)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Trabajos a realizar */}
      {mdoItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-zinc-500" />
                Trabajos a realizar
              </span>
              <span className="text-xs font-normal text-zinc-400">
                {tareasCompletadas.filter(Boolean).length} / {mdoItems.length} completados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-zinc-100">
              {mdoItems.map((item, i) => {
                const completada = tareasCompletadas[i] === true;
                const guardando = tareaGuardando === i;
                const interactivo = ot.estado === 'en_reparacion';
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={!interactivo || guardando}
                      onClick={() => handleToggleTarea(i, mdoItems.length)}
                      className={`w-full flex items-center gap-3 py-3 text-left transition-colors rounded-lg px-1
                        ${interactivo ? 'hover:bg-zinc-50 active:bg-zinc-100 cursor-pointer' : 'cursor-default'}
                        ${guardando ? 'opacity-50' : ''}`}
                    >
                      {completada
                        ? <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                        : <Circle className="size-5 text-zinc-300 shrink-0" />
                      }
                      <span className={`text-sm leading-snug ${completada ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                        {item.detalle}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Hint when tasks remain */}
            {ot.estado === 'en_reparacion' && !todasCompletadas && (
              <p className="mt-3 text-xs text-zinc-400">
                Marca todos los trabajos como completados para poder terminar la OT.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Repuestos */}
      {ot.cotizacion && (() => {
        let repuestos: { detalle: string; cantidad: number; unidad: string }[] = [];
        try { repuestos = JSON.parse(ot.cotizacion.repuestos ?? '[]') as typeof repuestos; } catch { /* noop */ }
        if (repuestos.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-zinc-500" />
                Repuestos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left py-1.5 text-xs font-semibold text-zinc-500">Detalle</th>
                    <th className="text-right py-1.5 text-xs font-semibold text-zinc-500 pr-3">Cantidad</th>
                    <th className="text-left py-1.5 text-xs font-semibold text-zinc-500">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {repuestos.map((item, i) => (
                    <tr key={i} className="border-b border-zinc-50 last:border-0">
                      <td className="py-1.5 text-zinc-700">{item.detalle || '—'}</td>
                      <td className="py-1.5 text-zinc-700 text-right pr-3">{item.cantidad}</td>
                      <td className="py-1.5 text-zinc-500">{item.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })()}

      {/* Insumos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4 text-zinc-500" />
            Insumos y materiales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            let insumos: InsumoItem[] = [];
            try { insumos = JSON.parse(ot.insumos ?? '[]') as InsumoItem[]; } catch { /* noop */ }
            if (insumos.length === 0) {
              return <p className="text-sm text-zinc-400 italic">Sin insumos registrados.</p>;
            }
            return (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left py-1.5 text-xs font-semibold text-zinc-500 w-full">Detalle</th>
                    <th className="text-right py-1.5 text-xs font-semibold text-zinc-500 pr-4">Cantidad</th>
                    <th className="text-left py-1.5 text-xs font-semibold text-zinc-500">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((item, i) => (
                    <tr key={i} className="border-b border-zinc-50 last:border-0">
                      <td className="py-1.5 text-zinc-700">{item.detalle || '—'}</td>
                      <td className="py-1.5 text-zinc-700 text-right pr-4">{item.cantidad}</td>
                      <td className="py-1.5 text-zinc-500">{item.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </CardContent>
      </Card>

      {/* Observaciones del vehículo */}
      <ObservacionesOT
        otId={ot.id}
        initialObservaciones={(() => { try { return JSON.parse(ot.observaciones ?? '[]') as ObservacionItem[]; } catch { return []; } })()}
        editable={ot.estado === 'en_reparacion'}
      />

      {/* Dialog Registrar Recepción */}
      <Dialog open={recepcionDialogOpen} onOpenChange={(o) => { if (!o) setRecepcionDialogOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Registrar ingreso — {ot.numero}
            </DialogTitle>
          </DialogHeader>
          <FormRecepcion
            loading={recepcionLoading}
            onCancel={() => setRecepcionDialogOpen(false)}
            onSubmit={handleRegistrarRecepcion}
            initialValues={{
              vehiculo_id: ot.vehiculo_id,
              cliente_id: ot.cliente_id,
              patente: ot.vehiculo?.patente ?? '',
              marca: ot.vehiculo?.marca ?? '',
              modelo: ot.vehiculo?.modelo ?? '',
              anio: ot.vehiculo?.anio ? String(ot.vehiculo.anio) : '',
              kilometraje: ot.vehiculo?.kilometraje_actual ? String(ot.vehiculo.kilometraje_actual) : '',
              rut_cliente: ot.cliente?.rut ?? '',
              nombre_cliente: ot.cliente?.nombre ?? '',
              telefono_cliente: ot.cliente?.telefono ?? '',
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
