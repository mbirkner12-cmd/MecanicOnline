'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function GeneralPage() {
  const [valorHora, setValorHora] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => r.json())
      .then((data) => {
        setValorHora(data.valor_hora ?? '');
      })
      .catch(() => {
        setFeedback({ type: 'error', message: 'Error al cargar la configuración' });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const num = parseFloat(valorHora);
    if (isNaN(num) || num < 0) {
      setFeedback({ type: 'error', message: 'El valor debe ser un número positivo' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor_hora: valorHora }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error ?? 'Error al guardar' });
        return;
      }
      setFeedback({ type: 'success', message: 'Configuración guardada correctamente' });
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configuración general</h1>
        <p className="text-zinc-500 mt-1 text-sm">Parámetros globales del taller</p>
      </div>

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
                    onChange={(e) => setValorHora(e.target.value)}
                    className="max-w-[200px]"
                    placeholder="0"
                  />
                </div>
              </div>

              {feedback && (
                <div
                  className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
                    feedback.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {feedback.message}
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-fit">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
