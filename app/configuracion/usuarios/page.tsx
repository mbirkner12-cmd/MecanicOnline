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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Plus, Pencil, KeyRound, PowerOff, Power } from 'lucide-react';

interface Mecanico {
  id: number;
  nombre: string;
  rut: string;
  activo: boolean;
}

interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: 'jefe' | 'mecanico';
  mecanico_id: number | null;
  activo: boolean;
  created_at: string;
  mecanico: { id: number; nombre: string; rut: string } | null;
}

const ROL_LABELS: Record<string, string> = {
  jefe: 'Jefe',
  mecanico: 'Mecánico',
};

const SELECT_CLS =
  'flex h-10 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'mecanico' as 'jefe' | 'mecanico',
    mecanico_id: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', username: '', rol: 'mecanico' as 'jefe' | 'mecanico', mecanico_id: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Reset password dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usuRes, mecRes] = await Promise.all([
        fetch('/api/usuarios'),
        fetch('/api/mecanicos'),
      ]);
      const [usuData, mecData] = await Promise.all([usuRes.json(), mecRes.json()]);
      setUsuarios(usuData as Usuario[]);
      setMecanicos((mecData as Mecanico[]).filter((m) => m.activo));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: createForm.nombre,
          username: createForm.username,
          password: createForm.password,
          rol: createForm.rol,
          mecanico_id: createForm.rol === 'mecanico' && createForm.mecanico_id
            ? Number(createForm.mecanico_id)
            : null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setCreateError(data.error ?? 'Error al crear usuario'); return; }
      setCreateOpen(false);
      setCreateForm({ nombre: '', username: '', password: '', rol: 'mecanico', mecanico_id: '' });
      await fetchData();
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (u: Usuario) => {
    setEditTarget(u);
    setEditForm({ nombre: u.nombre, username: u.username, rol: u.rol, mecanico_id: u.mecanico_id ? String(u.mecanico_id) : '' });
    setEditError('');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditError('');
    setEditLoading(true);
    try {
      const res = await fetch(`/api/usuarios/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editForm.nombre,
          username: editForm.username,
          rol: editForm.rol,
          mecanico_id: editForm.rol === 'mecanico' && editForm.mecanico_id
            ? Number(editForm.mecanico_id)
            : null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setEditError(data.error ?? 'Error al actualizar'); return; }
      setEditOpen(false);
      await fetchData();
    } finally {
      setEditLoading(false);
    }
  };

  // ── Reset password ─────────────────────────────────────────────────────────
  const openReset = (u: Usuario) => {
    setResetTarget(u);
    setResetPassword('');
    setResetError('');
    setResetOpen(true);
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    if (!resetPassword) { setResetError('Ingrese una nueva contraseña'); return; }
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch(`/api/usuarios/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) { setResetError('Error al cambiar contraseña'); return; }
      setResetOpen(false);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggleActivo = async (u: Usuario) => {
    await fetch(`/api/usuarios/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !u.activo }),
    });
    await fetchData();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuarios</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gestión de accesos al sistema</p>
        </div>
        <Button onClick={() => { setCreateError(''); setCreateOpen(true); }} className="flex items-center gap-2">
          <Plus className="size-4" />
          Crear usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserCircle className="size-4 text-zinc-500" />
            Listado de usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Nombre</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Usuario</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Rol</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Mecánico vinculado</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-zinc-500">Estado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-medium text-zinc-900">{u.nombre}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-600">{u.username}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={u.rol === 'jefe' ? 'default' : 'secondary'}>
                        {ROL_LABELS[u.rol]}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-600">
                      {u.mecanico?.nombre ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={u.activo ? 'default' : 'secondary'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(u)}>
                          <Pencil className="size-3 mr-1" />
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openReset(u)}>
                          <KeyRound className="size-3 mr-1" />
                          Contraseña
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleToggleActivo(u)}
                        >
                          {u.activo
                            ? <><PowerOff className="size-3 mr-1" />Desactivar</>
                            : <><Power className="size-3 mr-1" />Activar</>
                          }
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!createLoading) setCreateOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-nombre">Nombre completo</Label>
              <Input
                id="c-nombre"
                value={createForm.nombre}
                onChange={(e) => setCreateForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-username">Nombre de usuario</Label>
              <Input
                id="c-username"
                value={createForm.username}
                onChange={(e) => setCreateForm(f => ({ ...f, username: e.target.value }))}
                placeholder="juan.perez"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-password">Contraseña</Label>
              <Input
                id="c-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-rol">Rol</Label>
              <select
                id="c-rol"
                className={SELECT_CLS}
                value={createForm.rol}
                onChange={(e) => setCreateForm(f => ({ ...f, rol: e.target.value as 'jefe' | 'mecanico', mecanico_id: '' }))}
              >
                <option value="jefe">Jefe</option>
                <option value="mecanico">Mecánico</option>
              </select>
            </div>
            {createForm.rol === 'mecanico' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-mecanico">Mecánico vinculado</Label>
                <select
                  id="c-mecanico"
                  className={SELECT_CLS}
                  value={createForm.mecanico_id}
                  onChange={(e) => setCreateForm(f => ({ ...f, mecanico_id: e.target.value }))}
                >
                  <option value="">Sin vincular</option>
                  {mecanicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {createError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!editLoading) setEditOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-nombre">Nombre completo</Label>
              <Input
                id="e-nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-username">Nombre de usuario</Label>
              <Input
                id="e-username"
                value={editForm.username}
                onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-rol">Rol</Label>
              <select
                id="e-rol"
                className={SELECT_CLS}
                value={editForm.rol}
                onChange={(e) => setEditForm(f => ({ ...f, rol: e.target.value as 'jefe' | 'mecanico', mecanico_id: '' }))}
              >
                <option value="jefe">Jefe</option>
                <option value="mecanico">Mecánico</option>
              </select>
            </div>
            {editForm.rol === 'mecanico' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="e-mecanico">Mecánico vinculado</Label>
                <select
                  id="e-mecanico"
                  className={SELECT_CLS}
                  value={editForm.mecanico_id}
                  onChange={(e) => setEditForm(f => ({ ...f, mecanico_id: e.target.value }))}
                >
                  <option value="">Sin vincular</option>
                  {mecanicos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {editError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Reset Password */}
      <Dialog open={resetOpen} onOpenChange={(o) => { if (!resetLoading) setResetOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña — {resetTarget?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-password">Nueva contraseña</Label>
              <Input
                id="r-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {resetError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {resetError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetLoading}>
              Cancelar
            </Button>
            <Button onClick={handleReset} disabled={resetLoading}>
              {resetLoading ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
