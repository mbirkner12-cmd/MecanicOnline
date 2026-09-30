'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, X, Loader2, FileSpreadsheet, ImageIcon } from 'lucide-react';

type GastoEstructura = {
  id: number;
  nombre: string;
  monto_mensual: number;
  tipo: 'fijo' | 'gav';
  activo: boolean;
  created_at: string;
};

type FormData = { nombre: string; monto_mensual: string; tipo: 'fijo' | 'gav' };
type GastoImportado = { nombre: string; monto_mensual: number; tipo: 'fijo' | 'gav' };

const emptyForm: FormData = { nombre: '', monto_mensual: '', tipo: 'fijo' };

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n);
}

// Intenta detectar columnas en Excel y extraer filas
function parseExcelRows(sheetData: string[][]): GastoImportado[] {
  if (sheetData.length === 0) return [];

  const header = sheetData[0].map(h => String(h ?? '').toLowerCase().trim());
  const nombreIdx = header.findIndex(h => /nombre|gasto|descripci|concepto|ítem|item|servicio|detalle/.test(h));
  const montoIdx = header.findIndex(h => /monto|valor|importe|mensual|costo|precio|total/.test(h));
  const tipoIdx = header.findIndex(h => /tipo|categor|clasificaci/.test(h));

  const dataStart = nombreIdx >= 0 || montoIdx >= 0 ? 1 : 0;

  const nIdx = nombreIdx >= 0 ? nombreIdx : 0;
  const mIdx = montoIdx >= 0 ? montoIdx : 1;

  const result: GastoImportado[] = [];
  for (let i = dataStart; i < sheetData.length; i++) {
    const row = sheetData[i];
    const nombre = String(row[nIdx] ?? '').trim();
    const rawMonto = String(row[mIdx] ?? '').replace(/[$.\s]/g, '').replace(',', '.');
    const monto = parseFloat(rawMonto);
    if (!nombre || isNaN(monto) || monto <= 0) continue;

    let tipo: 'fijo' | 'gav' = 'fijo';
    if (tipoIdx >= 0) {
      const t = String(row[tipoIdx] ?? '').toLowerCase();
      if (/gav|comercial|admin|venta/.test(t)) tipo = 'gav';
    }
    result.push({ nombre, monto_mensual: Math.round(monto), tipo });
  }
  return result;
}

export default function GastosEstructuraPage() {
  const [gastos, setGastos] = useState<GastoEstructura[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog agregar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dialog importar
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GastoImportado[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setEditingId(null); setForm(emptyForm); setErrors({}); setApiError(null); setDialogOpen(true);
  }
  function openEdit(g: GastoEstructura) {
    setEditingId(g.id);
    setForm({ nombre: g.nombre, monto_mensual: String(g.monto_mensual), tipo: g.tipo });
    setErrors({}); setApiError(null); setDialogOpen(true);
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
    setSaving(true); setApiError(null);
    try {
      const url = editingId ? `/api/gastos-estructura/${editingId}` : '/api/gastos-estructura';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, monto_mensual: parseFloat(form.monto_mensual) }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error ?? 'Error'); return; }
      setDialogOpen(false); await fetchGastos();
    } catch { setApiError('Error de conexión'); } finally { setSaving(false); }
  }
  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/gastos-estructura/${id}`, { method: 'DELETE' });
    await fetchGastos();
  }

  // ── Importación ────────────────────────────────────────────────────────────
  function openImport() {
    setPreview([]); setImportError(null); setImportLoading(false); setImportOpen(true);
  }

  async function handleFile(file: File) {
    setImportError(null);
    setImportLoading(true);
    setPreview([]);
    try {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const base64 = await fileToBase64(file);
        const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
        const res = await fetch('/api/gastos-estructura/analizar-imagen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        });
        if (!res.ok) throw new Error('Error al analizar imagen');
        const items = await res.json() as GastoImportado[];
        if (!Array.isArray(items) || items.length === 0) throw new Error('No se encontraron datos en la imagen');
        setPreview(items);
      } else {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
        const items = parseExcelRows(rows);
        if (items.length === 0) throw new Error('No se encontraron filas válidas en el archivo');
        setPreview(items);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Error al procesar el archivo');
    } finally {
      setImportLoading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleConfirmImport() {
    setImportSaving(true);
    try {
      await Promise.all(
        preview.map(g =>
          fetch('/api/gastos-estructura', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(g),
          })
        )
      );
      setImportOpen(false);
      await fetchGastos();
    } catch {
      setImportError('Error al guardar los gastos');
    } finally {
      setImportSaving(false);
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={openImport} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar gasto
          </Button>
        </div>
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
                        <td className="px-4 py-2.5 text-right text-zinc-700 font-medium">
                          {formatCLP(g.monto_mensual)}<span className="text-zinc-400 font-normal text-xs ml-1">/ mes</span>
                        </td>
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

      {/* ── Dialog agregar/editar ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar gasto' : 'Agregar gasto'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {apiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{apiError}</div>}
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

      {/* ── Dialog importar ──────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={open => { if (!importSaving) setImportOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar gastos</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Drop zone */}
            {preview.length === 0 && !importLoading && (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex justify-center gap-3 mb-3">
                  <FileSpreadsheet className="h-8 w-8 text-zinc-300" />
                  <ImageIcon className="h-8 w-8 text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-zinc-600">Arrastra un archivo o haz clic para seleccionar</p>
                <p className="text-xs text-zinc-400 mt-1">Excel (.xlsx, .xls), CSV o imagen (foto de la planilla)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
            )}

            {/* Loading */}
            {importLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <p className="text-sm text-zinc-500">Analizando archivo...</p>
              </div>
            )}

            {/* Error */}
            {importError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{importError}</div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <>
                <p className="text-sm text-zinc-600">Se encontraron <span className="font-semibold">{preview.length} gastos</span>. Revisá el tipo antes de importar.</p>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-50">
                      <tr className="border-b border-zinc-200">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Nombre</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Monto / mes</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-zinc-500">Tipo</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((g, i) => (
                        <tr key={i} className="border-b border-zinc-50 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              value={g.nombre}
                              onChange={e => setPreview(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                              className="w-full text-sm bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-400 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={g.monto_mensual}
                              onChange={e => setPreview(prev => prev.map((x, j) => j === i ? { ...x, monto_mensual: parseInt(e.target.value) || 0 } : x))}
                              className="w-24 text-sm text-right bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-400 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select
                              value={g.tipo}
                              onChange={e => setPreview(prev => prev.map((x, j) => j === i ? { ...x, tipo: e.target.value as 'fijo' | 'gav' } : x))}
                              className="text-xs border border-zinc-200 rounded px-1.5 py-0.5 bg-white focus:outline-none"
                            >
                              <option value="fijo">Fijo</option>
                              <option value="gav">GAV</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => setPreview(prev => prev.filter((_, j) => j !== i))} className="text-zinc-300 hover:text-red-500">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => { setPreview([]); setImportError(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 underline self-start"
                >
                  Cargar otro archivo
                </button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importSaving}>Cancelar</Button>
            {preview.length > 0 && (
              <Button onClick={handleConfirmImport} disabled={importSaving}>
                {importSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando...</> : `Importar ${preview.length} gastos`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
