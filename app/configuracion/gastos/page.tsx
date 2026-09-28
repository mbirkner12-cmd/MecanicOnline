'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type GastoEstructura = {
  id: number;
  nombre: string;
  monto_mensual: number;
  tipo: 'fijo' | 'gav';
  activo: boolean;
  created_at: string;
};

type FormData = {
  nombre: string;
  monto_mensual: string;
  tipo: 'fijo' | 'gav';
};

const emptyForm: FormData = { nombre: '', monto_mensual: '', tipo: 'fijo' };

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
}

export default function GastosEstructuraPage() {
  const [gastos, setGastos] = useState<GastoEstructura[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function fetchGastos() {
    try {
      const res = await fetch('/api/gastos-estructura');
      setGastos(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchGastos(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function openEdit(g: GastoEstructura) {
    setEditingId(g.id);
    setForm({ nombre: g.nombre, monto_mensual: String(g.monto_mensual), tipo: g.tipo });
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function validate() {
    const e: Partial<FormData> = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.monto_mensual || isNaN(parseFloat(form.monto_mensual))) e.monto_mensual = 'Ingresa un monto válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const url = editingId ? `/api/gastos-estructura/${editingId}` : '/api/gastos-estructura';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monto_mensual: parseFloat(form.monto_mensual) }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? 'Error al guardar'); return; }
      setDialogOpen(false);
      await fetchGastos();
    } catch {
      setApiError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/gastos-estructura/${id}`, { method: 'DELETE' });
    await fetchGastos();
  }

  const fijos = gastos.filter(g => g.tipo === 'fijo');
  const gavs = gastos.filter(g => g.tipo === 'gav');
  const totalFijos = fijos.reduce((s, g) => s + g.monto_mensual, 0);
  const totalGav = gavs.reduce((s, g) => s + g.monto_mensual, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gastos de estructura</h1>
          <p className="text-zinc-500 mt-1 text-sm">Costos fijos y GAV mensuales para el estado de resultados</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar gasto
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 font-medium mb-1">Total costos fijos / mes</p>
          <p className="text-xl font-bold text-zinc-900">{formatCLP(totalFijos)}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500 font-medium mb-1">Total GAV / mes</p>
          <p className="text-xl font-bold text-zinc-900">{formatCLP(totalGav)}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500">Cargando...</div>
      ) : gastos.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          No hay gastos registrados. Agrega costos fijos (arriendo, luz, etc.) y GAV.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[{ label: 'Costos fijos', items: fijos, total: totalFijos }, { label: 'GAV', items: gavs, total: totalGav }].map(group => (
            group.items.length > 0 && (
              <div key={group.label} className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{group.label}</span>
                  <span className="text-xs font-semibold text-zinc-700">{formatCLP(group.total)} / mes</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {group.items.map(g => (
                      <tr key={g.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                        <td className="px-4 py-2.5 font-medium text-zinc-800">{g.nombre}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-700 font-medium">{formatCLP(g.monto_mensual)}<span className="text-zinc-400 font-normal text-xs ml-1">/ mes</span></td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(g)} className="h-7 w-7 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id, g.nombre)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar gasto' : 'Agregar gasto'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {apiError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{apiError}</div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Arriendo local" />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monto">Monto mensual *</Label>
              <Input id="monto" type="number" min="0" step="1000" value={form.monto_mensual} onChange={e => setForm({ ...form, monto_mensual: e.target.value })} placeholder="Ej: 500000" />
              {errors.monto_mensual && <p className="text-xs text-red-500">{errors.monto_mensual}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, tipo: 'fijo' })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${form.tipo === 'fijo' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                  Costo fijo
                </button>
                <button type="button" onClick={() => setForm({ ...form, tipo: 'gav' })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${form.tipo === 'gav' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                  GAV
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
