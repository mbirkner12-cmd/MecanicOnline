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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Link as LinkIcon } from 'lucide-react';

type Mecanico = {
  id: number;
  rut: string;
  nombre: string;
  contrato_url: string | null;
  activo: boolean;
  created_at: string;
};

type FormData = {
  nombre: string;
  rut: string;
  contrato_url: string;
};

const emptyForm: FormData = { nombre: '', rut: '', contrato_url: '' };

export default function MecanicosPage() {
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  async function fetchMecanicos() {
    try {
      const res = await fetch('/api/mecanicos');
      const data = await res.json();
      setMecanicos(data);
    } catch {
      setApiError('Error al cargar mecánicos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMecanicos();
  }, []);

  function openCreateDialog() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function openEditDialog(m: Mecanico) {
    setEditingId(m.id);
    setForm({ nombre: m.nombre, rut: m.rut, contrato_url: m.contrato_url ?? '' });
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  }

  function validate(): boolean {
    const newErrors: Partial<FormData> = {};
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!form.rut.trim()) newErrors.rut = 'El RUT es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      const url = editingId ? `/api/mecanicos/${editingId}` : '/api/mecanicos';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? 'Error al guardar');
        return;
      }
      setDialogOpen(false);
      await fetchMecanicos();
    } catch {
      setApiError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar al mecánico "${nombre}"?`)) return;
    try {
      const res = await fetch(`/api/mecanicos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Error al eliminar');
        return;
      }
      await fetchMecanicos();
    } catch {
      alert('Error de conexión');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mecánicos</h1>
          <p className="text-zinc-500 mt-1 text-sm">Gestión del equipo de trabajo</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar mecánico
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Cargando...</div>
        ) : mecanicos.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No hay mecánicos registrados</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mecanicos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.nombre}</TableCell>
                  <TableCell className="text-zinc-600">{m.rut}</TableCell>
                  <TableCell>
                    {m.contrato_url ? (
                      <a
                        href={m.contrato_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Ver contrato
                      </a>
                    ) : (
                      <span className="text-zinc-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.activo ? 'default' : 'secondary'}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(m)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(m.id, m.nombre)}
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
            <DialogTitle>{editingId ? 'Editar mecánico' : 'Agregar mecánico'}</DialogTitle>
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
                placeholder="Ej: Pedro González"
              />
              {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rut">RUT *</Label>
              <Input
                id="rut"
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
                placeholder="Ej: 15.555.555-5"
              />
              {errors.rut && <p className="text-xs text-red-500">{errors.rut}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contrato_url">URL del contrato (opcional)</Label>
              <Input
                id="contrato_url"
                value={form.contrato_url}
                onChange={(e) => setForm({ ...form, contrato_url: e.target.value })}
                placeholder="https://..."
              />
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
