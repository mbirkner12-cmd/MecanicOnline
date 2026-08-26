'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Camera, Loader2, Receipt, ExternalLink, AlertTriangle } from 'lucide-react';

interface GastoRow {
  id: number;
  ot_id: number;
  descripcion: string;
  monto: number;
  foto_boleta_url: string | null;
  cobrar_cliente: boolean;
  created_at: string;
}

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(Math.round(n));
}

export function GastosOT({
  otId,
  editable,
  jefeView = false,
}: {
  otId: number;
  editable: boolean;     // mecánico puede agregar/eliminar (OT en_reparacion)
  jefeView?: boolean;    // jefe puede editar cobrar_cliente
}) {
  const [gastos, setGastos] = useState<GastoRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario nuevo gasto
  const [desc, setDesc] = useState('');
  const [monto, setMonto] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const loadGastos = useCallback(async () => {
    const res = await fetch(`/api/ot-gastos?ot_id=${otId}`);
    if (res.ok) setGastos(await res.json());
    setLoading(false);
  }, [otId]);

  useEffect(() => { loadGastos(); }, [loadGastos]);

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Error al subir foto');
      const { url } = await res.json() as { url: string };
      setFotoUrl(url);
    } catch {
      setError('Error al subir la foto de la boleta');
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleAgregar() {
    if (!desc.trim()) { setError('Escribí una descripción'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/ot-gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ot_id: otId,
          descripcion: desc.trim(),
          monto: parseFloat(monto.replace(/\./g, '').replace(',', '.')) || 0,
          foto_boleta_url: fotoUrl,
        }),
      });
      if (!res.ok) throw new Error();
      setDesc(''); setMonto(''); setFotoUrl(null);
      if (fileRef.current) fileRef.current.value = '';
      await loadGastos();
    } catch {
      setError('Error al guardar el gasto');
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(id: number) {
    await fetch(`/api/ot-gastos/${id}`, { method: 'DELETE' });
    setGastos(prev => prev.filter(g => g.id !== id));
  }

  async function toggleCobrar(g: GastoRow) {
    setGastos(prev => prev.map(x => x.id === g.id ? { ...x, cobrar_cliente: !x.cobrar_cliente } : x));
    await fetch(`/api/ot-gastos/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cobrar_cliente: !g.cobrar_cliente }),
    });
  }

  const totalACobrar = gastos.filter(g => g.cobrar_cliente).reduce((s, g) => s + g.monto, 0);

  return (
    <div className="space-y-4">
      {/* Formulario agregar — solo en edición (mecánico con OT activa) */}
      {editable && (
        <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-zinc-50/50">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Agregar implemento / gasto</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500 mb-1 block">Descripción *</label>
              <input
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                placeholder="Ej: Aceite de motor, llave de tuercas, sello de goma..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Monto ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                placeholder="0"
                value={monto}
                onChange={e => setMonto(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Foto de boleta</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFoto}
                  className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-600 bg-white hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                >
                  {uploadingFoto
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Camera className="h-3.5 w-3.5" />
                  }
                  {fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {fotoUrl && (
                  <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Ver
                  </a>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAgregar}
            disabled={saving || !desc.trim() || uploadingFoto}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Agregar
          </button>
        </div>
      )}

      {/* Lista de gastos */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>
      ) : gastos.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Sin implementos o gastos registrados.</p>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-zinc-500">Descripción</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-zinc-500">Monto</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-zinc-500">Boleta</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-zinc-500">Cobrar al cliente</th>
                {editable && <th className="px-2 py-2.5 w-8" />}
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => (
                <tr key={g.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2.5 text-zinc-800 font-medium">{g.descripcion}</td>
                  <td className="px-3 py-2.5 text-right text-zinc-700">{g.monto > 0 ? formatCLP(g.monto) : <span className="text-zinc-400">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">
                    {g.foto_boleta_url ? (
                      <a href={g.foto_boleta_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Receipt className="h-3.5 w-3.5" /> Ver
                      </a>
                    ) : (
                      <span className="text-zinc-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {(jefeView || !editable) ? (
                      <button
                        type="button"
                        onClick={jefeView ? () => toggleCobrar(g) : undefined}
                        disabled={!jefeView}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          g.cobrar_cliente
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                        } disabled:cursor-default`}
                      >
                        {g.cobrar_cliente ? '✓ Sí' : 'No'}
                      </button>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${g.cobrar_cliente ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {g.cobrar_cliente ? '✓ Sí' : 'No'}
                      </span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleEliminar(g.id)}
                        className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {gastos.some(g => g.cobrar_cliente) && (
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50">
                  <td colSpan={editable ? 4 : 3} className="px-3 py-2 text-xs font-semibold text-zinc-500 text-right">
                    Total a cobrar al cliente
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-zinc-900">{formatCLP(totalACobrar)}</td>
                  {editable && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
