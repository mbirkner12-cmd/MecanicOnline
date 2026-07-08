'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Herramienta = {
  id: number;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  cantidad: number;
  created_at: string;
};

type FormData = {
  nombre: string;
  descripcion: string;
  marca: string;
  cantidad: string;
};

const emptyForm: FormData = { nombre: '', descripcion: '', marca: '', cantidad: '0' };

export default function HerramientasPage() {
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function fetchHerramientas() {
    try {
      const res = await fetch('/api/herramientas');
      const data = await res.json();
      setHerramientas(data);
    } catch {
      setApiError('Error al cargar herramientas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHerramientas();
  }, []);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function openEditDialog(h: Herramienta) {
    setEditingId(h.id);
    setForm({
      nombre: h.nombre,
      descripcion: h.descripcion ?? '',
      marca: h.marca ?? '',
      cantidad: String(h.cantidad),
    });
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function validate(): boolean {
    const newErrors: Partial<FormData> = {};
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    const cant = parseInt(form.cantidad, 10);
    if (isNaN(cant) || cant < 0) newErrors.cantidad = 'La cantidad debe ser 0 o mayor';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const url = editingId ? `/api/herramientas/${editingId}` : '/api/herramientas';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          descripcion: form.descripcion,
          marca: form.marca,
          cantidad: parseInt(form.cantidad, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Error al guardar');
        return;
      }
      setDialogOpen(false);
      await fetchHerramientas();
    } catch {
      setApiError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar la herramienta "${nombre}"?`)) return;
    try {
      const res = await fetch(`/api/herramientas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Error al eliminar');
        return;
      }
      await fetchHerramientas();
    } catch {
      alert('Error de conexión');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Herramientas</h1>
          <p className="text-zinc-500 mt-1 text-sm">Inventario de herramientas del taller</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar herramienta
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Cargando...</div>
        ) : herramientas.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No hay herramientas registradas</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / Descripción</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {herramientas.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{h.nombre}</p>
                      {h.descripcion && (
                        <p className="text-sm text-zinc-500">{h.descripcion}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-600">{h.marca ?? '—'}</TableCell>
                  <TableCell>
                    <span className="font-medium tabular-nums">{h.cantidad}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(h)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(h.id, h.nombre)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar herramienta' : 'Agregar herramienta'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {apiError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {apiError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Llave de torque"
              />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción de la herramienta..."
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="marca">Marca (opcional)</Label>
              <Input
                id="marca"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                placeholder="Ej: Snap-on"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min="0"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              />
              {errors.cantidad && <p className="text-xs text-red-500">{errors.cantidad}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
