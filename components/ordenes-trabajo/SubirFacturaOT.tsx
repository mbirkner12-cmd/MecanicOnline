'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, X, Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  otId: number;
  repuestosInventario: Array<{ id: number; nombre: string; sku: string }>;
  repuestesCot: Array<{ detalle: string; idx: number }>;
  onGuardado: () => void;
}

interface ItemLocal {
  localId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  matchKey: string | null;
}

interface ExtractedData {
  numero: string | null;
  proveedor_nombre: string | null;
  proveedor_rut: string | null;
  fecha_emision: string | null;
  total_neto: number;
  total_iva: number;
  total: number;
  items: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
    match_key: string | null;
  }>;
}

function formatCLP(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export function SubirFacturaOT({ otId, repuestosInventario, repuestesCot, onGuardado }: Props) {
  const [open, setOpen] = useState(false);
  // Steps: 1 = upload, 2 = loading, 3 = confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  // Step 3 — header fields
  const [numero, setNumero] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [proveedorRut, setProveedorRut] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [totalNeto, setTotalNeto] = useState('');
  const [totalIva, setTotalIva] = useState('');
  const [totalTotal, setTotalTotal] = useState('');

  // Step 3 — items
  const [items, setItems] = useState<ItemLocal[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  function resetState() {
    setStep(1);
    setFile(null);
    setDragOver(false);
    setAnalyzeError('');
    setNumero('');
    setProveedorNombre('');
    setProveedorRut('');
    setFechaEmision('');
    setTotalNeto('');
    setTotalIva('');
    setTotalTotal('');
    setItems([]);
    setPdfUrl(null);
    setSaveError('');
    setSaving(false);
  }

  function handleFileSelect(f: File) {
    setFile(f);
    setAnalyzeError('');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  async function handleAnalizar() {
    if (!file) { setAnalyzeError('Seleccioná un archivo primero'); return; }
    setAnalyzeError('');
    setStep(2);

    try {
      // Build repuestos list for AI
      const repuestosParaAI: Array<{ key: string; nombre: string; sku?: string }> = [
        ...repuestosInventario.map(r => ({ key: `inv_${r.id}`, nombre: r.nombre, sku: r.sku })),
        ...repuestesCot.map(r => ({ key: `cot_${r.idx}`, nombre: r.detalle })),
      ];

      const fd = new FormData();
      fd.append('file', file);
      fd.append('repuestos_json', JSON.stringify(repuestosParaAI));

      const res = await fetch('/api/facturas-compra/parse', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Error al analizar la factura');
      }

      const data = await res.json() as { extracted: ExtractedData; pdf_url: string };
      const ext = data.extracted;

      // Populate form
      setNumero(ext.numero ?? '');
      setProveedorNombre(ext.proveedor_nombre ?? '');
      setProveedorRut(ext.proveedor_rut ?? '');
      setFechaEmision(ext.fecha_emision ?? '');
      setTotalNeto(String(ext.total_neto ?? 0));
      setTotalIva(String(ext.total_iva ?? 0));
      setTotalTotal(String(ext.total ?? 0));
      setPdfUrl(data.pdf_url);

      setItems(
        (ext.items ?? []).map(item => ({
          localId: crypto.randomUUID(),
          nombre: item.nombre ?? '',
          cantidad: item.cantidad ?? 1,
          precioUnitario: item.precio_unitario ?? 0,
          matchKey: item.match_key ?? null,
        }))
      );

      setStep(3);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Error al analizar la factura');
      setStep(1);
    }
  }

  function addItem() {
    setItems(prev => [
      ...prev,
      { localId: crypto.randomUUID(), nombre: '', cantidad: 1, precioUnitario: 0, matchKey: null },
    ]);
  }

  function removeItem(localId: string) {
    setItems(prev => prev.filter(i => i.localId !== localId));
  }

  function updateItem(localId: string, field: keyof Omit<ItemLocal, 'localId'>, value: string | number | null) {
    setItems(prev =>
      prev.map(i => i.localId === localId ? { ...i, [field]: value } : i)
    );
  }

  const calcTotalNeto = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

  async function handleGuardar() {
    setSaveError('');
    setSaving(true);
    try {
      const res = await fetch('/api/facturas-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ot_id: otId,
          numero: numero.trim(),
          proveedor_nombre: proveedorNombre.trim(),
          proveedor_rut: proveedorRut.trim() || null,
          fecha_emision: fechaEmision,
          total_neto: parseFloat(totalNeto) || 0,
          total_iva: parseFloat(totalIva) || 0,
          total: parseFloat(totalTotal) || 0,
          pdf_url: pdfUrl,
          items: items.map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: i.precioUnitario,
            total: i.cantidad * i.precioUnitario,
            match_key: i.matchKey,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Error al guardar la factura');
      }

      setOpen(false);
      resetState();
      onGuardado();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar la factura');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) resetState();
  }

  const assignOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Sin asignar' },
    ...repuestosInventario.map(r => ({ value: `inv_${r.id}`, label: `${r.nombre} (inv.)` })),
    ...repuestesCot.map(r => ({ value: `cot_${r.idx}`, label: `${r.detalle} (cot.)` })),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs text-zinc-600 bg-white hover:bg-zinc-50 transition-colors"
      >
        <Upload className="h-3.5 w-3.5" />
        Subir factura
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Step 2: Loading */}
        {step === 2 && (
          <DialogContent className="max-w-sm" showCloseButton={false}>
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-600 font-medium">Leyendo factura con IA...</p>
            </div>
          </DialogContent>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Subir factura a OT</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-zinc-500 bg-zinc-50'
                    : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/50'
                }`}
              >
                <Upload className="h-8 w-8 text-zinc-300" />
                {file ? (
                  <p className="text-sm font-medium text-zinc-700">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500">Arrastrá o hacé click para seleccionar</p>
                    <p className="text-xs text-zinc-400">PDF, JPG, PNG, WEBP</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleInputChange}
              />

              {analyzeError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {analyzeError}
                </p>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnalizar}
                disabled={!file}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Analizar con IA
              </button>
            </DialogFooter>
          </DialogContent>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Confirmar datos de factura</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Header fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">N° Factura</label>
                  <input
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="Folio"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Proveedor</label>
                  <input
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={proveedorNombre}
                    onChange={e => setProveedorNombre(e.target.value)}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">RUT proveedor</label>
                  <input
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={proveedorRut}
                    onChange={e => setProveedorRut(e.target.value)}
                    placeholder="12.345.678-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Fecha emisión</label>
                  <input
                    type="date"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={fechaEmision}
                    onChange={e => setFechaEmision(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Total neto ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={totalNeto}
                    onChange={e => setTotalNeto(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">IVA ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={totalIva}
                    onChange={e => setTotalIva(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Total ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    value={totalTotal}
                    onChange={e => setTotalTotal(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Items table */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Ítems ({items.length}) — total calculado: {formatCLP(calcTotalNeto)}
                </p>
                <div className="rounded-xl border border-zinc-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="text-left px-3 py-2 text-zinc-500 font-semibold">Descripción</th>
                        <th className="text-right px-2 py-2 text-zinc-500 font-semibold w-16">Cant.</th>
                        <th className="text-right px-2 py-2 text-zinc-500 font-semibold w-28">Precio unit.</th>
                        <th className="text-right px-2 py-2 text-zinc-500 font-semibold w-24">Total</th>
                        <th className="text-left px-2 py-2 text-zinc-500 font-semibold">Asignar a</th>
                        <th className="w-8 px-1 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.localId} className="border-b border-zinc-100 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              className="w-full border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                              value={item.nombre}
                              onChange={e => updateItem(item.localId, 'nombre', e.target.value)}
                              placeholder="Descripción"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              className="w-16 border border-zinc-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-zinc-900"
                              value={item.cantidad}
                              onChange={e => updateItem(item.localId, 'cantidad', parseFloat(e.target.value) || 1)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              className="w-28 border border-zinc-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-zinc-900"
                              value={item.precioUnitario}
                              onChange={e => updateItem(item.localId, 'precioUnitario', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td className="px-2 py-2 text-right text-zinc-600 font-medium tabular-nums">
                            {formatCLP(item.cantidad * item.precioUnitario)}
                          </td>
                          <td className="px-2 py-2">
                            <select
                              className="w-full border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                              value={item.matchKey ?? ''}
                              onChange={e => updateItem(item.localId, 'matchKey', e.target.value || null)}
                            >
                              {assignOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.localId)}
                              className="p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar ítem
                </button>
              </div>

              {saveError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {saveError}
                </p>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => { setStep(1); }}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleGuardar}
                disabled={saving || !numero.trim() || !proveedorNombre.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Guardar factura
              </button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
