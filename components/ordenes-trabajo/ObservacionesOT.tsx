'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2 } from 'lucide-react';

export interface ObservacionItem {
  comentario: string;
  urgencia: 'baja' | 'media' | 'alta';
  fecha: string;
}

interface Props {
  otId: number;
  initialObservaciones: ObservacionItem[];
  editable: boolean;
}

const URGENCIA_LABELS: Record<ObservacionItem['urgencia'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

const URGENCIA_BADGE_CLASS: Record<ObservacionItem['urgencia'], string> = {
  baja: 'bg-emerald-100 text-emerald-800',
  media: 'bg-amber-100 text-amber-800',
  alta: 'bg-red-100 text-red-800',
};

function formatFechaObs(iso: string): string {
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

export function ObservacionesOT({ otId, initialObservaciones, editable }: Props) {
  const [observaciones, setObservaciones] = useState<ObservacionItem[]>(initialObservaciones);
  const [comentario, setComentario] = useState('');
  const [urgencia, setUrgencia] = useState<ObservacionItem['urgencia']>('media');
  const [saving, setSaving] = useState(false);

  const saveObservaciones = async (updated: ObservacionItem[]) => {
    setSaving(true);
    try {
      await fetch(`/api/ordenes-trabajo/${otId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: updated }),
      });
      setObservaciones(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleAgregar = async () => {
    const texto = comentario.trim();
    if (!texto) return;
    const nueva: ObservacionItem = {
      comentario: texto,
      urgencia,
      fecha: new Date().toISOString(),
    };
    const updated = [...observaciones, nueva];
    await saveObservaciones(updated);
    setComentario('');
    setUrgencia('media');
  };

  const handleEliminar = async (idx: number) => {
    const updated = observaciones.filter((_, i) => i !== idx);
    await saveObservaciones(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="size-4 text-zinc-500" />
          Observaciones del vehículo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {observaciones.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Sin observaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {observaciones.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold shrink-0 ${URGENCIA_BADGE_CLASS[obs.urgencia]}`}
                >
                  {URGENCIA_LABELS[obs.urgencia]}
                </span>
                <span className="flex-1 text-sm text-zinc-700 leading-relaxed">
                  {obs.comentario}
                </span>
                <span className="text-xs text-zinc-400 whitespace-nowrap shrink-0">
                  {formatFechaObs(obs.fecha)}
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleEliminar(idx)}
                    disabled={saving}
                    className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    aria-label="Eliminar observación"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && (
          <div className="flex flex-col gap-2 pt-3 border-t border-zinc-100">
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              placeholder="Describe la observación..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              spellCheck
              autoCorrect="on"
              autoCapitalize="sentences"
              lang="es"
            />
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={urgencia}
                onChange={(e) => setUrgencia(e.target.value as ObservacionItem['urgencia'])}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
              <Button
                size="sm"
                onClick={handleAgregar}
                disabled={saving || !comentario.trim()}
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
