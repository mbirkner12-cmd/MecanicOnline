'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Plus, Trash2, GripVertical } from 'lucide-react';

interface ChecklistItem {
  key: string;
  label: string;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50) + '_' + Math.random().toString(36).slice(2, 6);
}

export default function GeneralPage() {
  const [valorHora, setValorHora] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTarifas, setSavingTarifas] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; target: 'tarifas' | 'checklist' } | null>(null);

  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.json() as Promise<{ valor_hora?: string; checklist_items?: ChecklistItem[] }>)
      .then(data => {
        setValorHora(data.valor_hora ?? '');
        setChecklistItems(data.checklist_items ?? []);
      })
      .catch(() => setFeedback({ type: 'error', message: 'Error al cargar la configuración', target: 'tarifas' }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveTarifas() {
    const num = parseFloat(valorHora);
    if (isNaN(num) || num < 0) {
      setFeedback({ type: 'error', message: 'El valor debe ser un número positivo', target: 'tarifas' });
      return;
    }
    setSavingTarifas(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_hora: valorHora }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setFeedback({ type: 'error', message: data.error ?? 'Error al guardar', target: 'tarifas' });
        return;
      }
      setFeedback({ type: 'success', message: 'Guardado correctamente', target: 'tarifas' });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión', target: 'tarifas' });
    } finally {
      setSavingTarifas(false);
    }
  }

  async function handleSaveChecklist(items: ChecklistItem[]) {
    setSavingChecklist(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist_items: items }),
      });
      if (!res.ok) throw new Error();
      setFeedback({ type: 'success', message: 'Checklist guardado', target: 'checklist' });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ type: 'error', message: 'Error al guardar el checklist', target: 'checklist' });
    } finally {
      setSavingChecklist(false);
    }
  }

  function addItem() {
    const label = newItemLabel.trim();
    if (!label) return;
    const updated = [...checklistItems, { key: slugify(label), label }];
    setChecklistItems(updated);
    setNewItemLabel('');
    void handleSaveChecklist(updated);
  }

  function removeItem(key: string) {
    const updated = checklistItems.filter(i => i.key !== key);
    setChecklistItems(updated);
    void handleSaveChecklist(updated);
  }

  const Feedback = ({ target }: { target: 'tarifas' | 'checklist' }) =>
    feedback?.target === target ? (
      <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
        feedback.type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-600 border border-red-200'
      }`}>
        {feedback.type === 'success'
          ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
        {feedback.message}
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configuración general</h1>
        <p className="text-zinc-500 mt-1 text-sm">Parámetros globales del taller</p>
      </div>

      {/* Tarifas */}
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Tarifas</CardTitle>
          <CardDescription>Valor utilizado para calcular la mano de obra</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <div className="text-zinc-500 text-sm">Cargando...</div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valor_hora">Valor hora ($/hora)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm font-medium">$</span>
                  <Input
                    id="valor_hora"
                    type="number"
                    min="0"
                    step="500"
                    value={valorHora}
                    onChange={e => setValorHora(e.target.value)}
                    className="max-w-[200px]"
                    placeholder="0"
                  />
                </div>
              </div>
              <Feedback target="tarifas" />
              <Button onClick={handleSaveTarifas} disabled={savingTarifas} className="w-fit">
                {savingTarifas ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Checklist de entrega */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Checklist de entrega</CardTitle>
          <CardDescription>Ítems que el mecánico debe verificar al terminar una OT</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Lista actual */}
              {checklistItems.length === 0 ? (
                <p className="text-sm text-zinc-400 italic">No hay ítems configurados.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
                  {checklistItems.map((item, idx) => (
                    <li key={item.key} className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-50">
                      <GripVertical className="size-4 text-zinc-300 flex-none" />
                      <span className="flex-1 text-sm text-zinc-800">{item.label}</span>
                      <span className="text-xs text-zinc-400 hidden sm:block">#{idx + 1}</span>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors flex-none"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Agregar nuevo ítem */}
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo ítem del checklist..."
                  value={newItemLabel}
                  onChange={e => setNewItemLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                  className="flex-1"
                />
                <Button
                  onClick={addItem}
                  disabled={!newItemLabel.trim() || savingChecklist}
                  variant="outline"
                  className="flex items-center gap-1.5"
                >
                  <Plus className="size-4" />
                  Agregar
                </Button>
              </div>

              <Feedback target="checklist" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
