'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Circle, Camera, Loader2, X, Plus } from 'lucide-react';

export interface ChecklistItem {
  key: string;
  label: string;
}

interface ChecklistRow {
  item_key: string;
  checked: boolean;
  fotos_urls: string[];
}

interface Props {
  otId: number;
  editable: boolean;
}

export function ChecklistOT({ otId, editable }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKey = useRef<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/configuracion')
        .then(r => r.ok ? r.json() as Promise<{ checklist_items?: ChecklistItem[] }> : Promise.resolve({} as { checklist_items?: ChecklistItem[] }))
        .catch(() => ({} as { checklist_items?: ChecklistItem[] })),
      fetch(`/api/ordenes-trabajo/${otId}/checklist`)
        .then(r => r.ok ? r.json() as Promise<ChecklistRow[]> : Promise.resolve([]))
        .catch(() => [] as ChecklistRow[]),
    ]).then(([cfg, checkRows]) => {
      setItems(cfg.checklist_items ?? []);
      setRows(Array.isArray(checkRows) ? checkRows : []);
    }).finally(() => setLoading(false));
  }, [otId]);

  const getRow = (key: string): ChecklistRow =>
    rows.find(r => r.item_key === key) ?? { item_key: key, checked: false, fotos_urls: [] };

  const applyRowUpdate = (updated: ChecklistRow) =>
    setRows(prev => {
      const exists = prev.find(r => r.item_key === updated.item_key);
      if (exists) return prev.map(r => r.item_key === updated.item_key ? updated : r);
      return [...prev, updated];
    });

  const toggleCheck = async (key: string) => {
    if (!editable || savingKey) return;
    const current = getRow(key);
    const newChecked = !current.checked;
    setSavingKey(key);
    applyRowUpdate({ ...current, checked: newChecked });
    try {
      const res = await fetch(`/api/ordenes-trabajo/${otId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, checked: newChecked }),
      });
      if (res.ok) applyRowUpdate(await res.json() as ChecklistRow);
      else applyRowUpdate({ ...current, checked: !newChecked });
    } catch {
      applyRowUpdate({ ...current, checked: !newChecked });
    } finally {
      setSavingKey(null);
    }
  };

  const handleAddFotoClick = (key: string) => {
    if (!editable) return;
    pendingKey.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = pendingKey.current;
    if (!file || !key) return;
    e.target.value = '';
    setUploadingKey(key);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error();
      const { url } = await uploadRes.json() as { url: string };
      const res = await fetch(`/api/ordenes-trabajo/${otId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, add_foto: url }),
      });
      if (res.ok) applyRowUpdate(await res.json() as ChecklistRow);
    } catch { /* silent */ } finally {
      setUploadingKey(null);
    }
  };

  const removeFoto = async (key: string, url: string) => {
    if (!editable) return;
    const current = getRow(key);
    applyRowUpdate({ ...current, fotos_urls: current.fotos_urls.filter(u => u !== url) });
    const res = await fetch(`/api/ordenes-trabajo/${otId}/checklist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_key: key, remove_foto: url }),
    });
    if (res.ok) applyRowUpdate(await res.json() as ChecklistRow);
  };

  const checkedCount = rows.filter(r => r.checked && items.some(i => i.key === r.item_key)).length;
  const total = items.length;
  const allDone = total > 0 && checkedCount === total;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400 italic">No hay ítems configurados en el checklist.</p>;
  }

  return (
    <>
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500">
          <span className={`font-semibold ${allDone ? 'text-green-600' : 'text-zinc-700'}`}>{checkedCount}</span>
          <span> / {total} ítems completados</span>
        </p>
        {allDone && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="size-3" />
            Todo listo
          </span>
        )}
      </div>

      <div className="h-1.5 bg-zinc-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: total > 0 ? `${(checkedCount / total) * 100}%` : '0%' }}
        />
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const row = getRow(item.key);
          const isChecked = row.checked;
          const fotos = row.fotos_urls;
          const isSaving = savingKey === item.key;
          const isUploading = uploadingKey === item.key;
          const hasFotos = fotos.length > 0;

          return (
            <div
              key={item.key}
              className={`rounded-lg border px-3 py-2.5 transition-colors ${
                isChecked ? 'border-green-200 bg-green-50/50' : 'border-zinc-100 bg-white'
              }`}
            >
              {/* Top row: checkbox + label */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCheck(item.key)}
                  disabled={!editable || !!savingKey}
                  className={`flex-none ${editable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {isSaving
                    ? <Loader2 className="size-5 text-zinc-400 animate-spin" />
                    : isChecked
                      ? <CheckCircle2 className="size-5 text-green-500" />
                      : <Circle className="size-5 text-zinc-300" />}
                </button>
                <span className={`flex-1 text-sm ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-800'}`}>
                  {item.label}
                </span>
              </div>

              {/* Fotos row */}
              {(hasFotos || editable) && (
                <div className="flex items-center gap-2 mt-2 ml-8 flex-wrap">
                  {fotos.map((url, i) => (
                    <div key={url} className="relative group">
                      <button
                        onClick={() => setLightbox(url)}
                        className="size-12 rounded-md overflow-hidden border border-zinc-200 hover:ring-2 hover:ring-blue-300 transition-all block"
                        title={`Foto ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`foto ${i + 1}`} className="size-full object-cover" />
                      </button>
                      {editable && (
                        <button
                          onClick={() => removeFoto(item.key, url)}
                          className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Quitar foto"
                        >
                          <X className="size-2.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add photo button */}
                  {editable && (
                    <button
                      onClick={() => handleAddFotoClick(item.key)}
                      disabled={isUploading}
                      className="size-12 rounded-md border border-dashed border-zinc-300 hover:border-zinc-400 flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
                      title="Agregar foto"
                    >
                      {isUploading
                        ? <Loader2 className="size-4 animate-spin" />
                        : <>
                            <Camera className="size-3.5" />
                            <Plus className="size-2.5" />
                          </>}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <X className="size-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Foto checklist"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
