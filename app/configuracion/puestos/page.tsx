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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Puesto = {
  id: number;
  nombre: string;
  tipo: string;
  activo: boolean;
  created_at: string;
};

type FormData = {
  nombre: string;
  tipo: string;
  tipoPersonalizado: string;
};

const TIPOS_PREDEFINIDOS = ['Con elevador', 'Sin elevador'];
const emptyForm: FormData = { nombre: '', tipo: '', tipoPersonalizado: '' };

export default function PuestosPage() {
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<{ nombre?: string; tipo?: string }>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function fetchPuestos() {
    try {
      const res = await fetch('/api/puestos');
      const data = await res.json();
      setPuestos(data);
    } catch {
      setApiError('Error al cargar puestos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPuestos();
  }, []);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function openEditDialog(p: Puesto) {
    setEditingId(p.id);
    const esPredefinido = TIPOS_PREDEFINIDOS.includes(p.tipo);
    setForm({
      nombre: p.nombre,
      tipo: esPredefinido ? p.tipo : 'Otro',
      tipoPersonalizado: esPredefinido ? '' : p.tipo,
    });
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function validate(): boolean {
    const newErrors: { nombre?: string; tipo?: string } = {};
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    const tipoFinal = form.tipo === 'Otro' ? form.tipoPersonalizado.trim() : form.tipo;
    if (!tipoFinal) newErrors.tipo = 'El tipo es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    const tipoFinal = form.tipo === 'Otro' ? form.tipoPersonalizado.trim() : form.tipo;
    try {
      const url = editingId ? `/api/puestos/${editingId}` : '/api/puestos';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre, tipo: tipoFinal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Error al guardar');
        return;
      }
      setDialogOpen(false);
      await fetchPuestos();
    } catch {
      setApiError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar el puesto "${nombre}"?`)) return;
    try {
      const res = await fetch(`/api/puestos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Error al eliminar');
        return;
      }
      await fetchPuestos();
    } catch {
      alert('Error de conexión');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Puestos de trabajo</h1>
          <p className="text-zinc-500 mt-1 text-sm">Fosas, bahías y espacios del taller</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar puesto
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Cargando...</div>
        ) : puestos.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No hay puestos registrados</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {puestos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-zinc-600">{p.tipo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(p)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p.id, p.nombre)}
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
            <DialogTitle>{editingId ? 'Editar puesto' : 'Agregar puesto'}</DialogTitle>
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
                placeholder="Ej: Fosa 1"
              />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(val) => setForm({ ...form, tipo: val ?? '', tipoPersonalizado: '' })}
              >
                <SelectTrigger id="tipo">
                  <SelectValue>
                    {form.tipo || <span className="text-muted-foreground">Seleccionar tipo...</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PREDEFINIDOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && <p className="text-xs text-red-500">{errors.tipo}</p>}
            </div>

            {form.tipo === 'Otro' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tipoPersonalizado">Tipo personalizado *</Label>
                <Input
                  id="tipoPersonalizado"
                  value={form.tipoPersonalizado}
                  onChange={(e) => setForm({ ...form, tipoPersonalizado: e.target.value })}
                  placeholder="Ej: Exterior"
                />
              </div>
            )}
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
