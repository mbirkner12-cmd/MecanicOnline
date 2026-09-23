'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Circle, Camera, Loader2, X, ZoomIn } from 'lucide-react';

export interface ChecklistItem {
  key: string;
  label: string;
}

interface ChecklistRow {
  id: number;
  ot_id: number;
  item_key: string;
  checked: boolean;
  foto_url: string | null;
  updated_at: string;
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
  const pendingUploadKey = useRef<string | null>(null);

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

  const getRow = (key: string) => rows.find(r => r.item_key === key);

  const toggleCheck = async (key: string) => {
    if (!editable || savingKey) return;
    const current = getRow(key);
    const newChecked = !current?.checked;
    setSavingKey(key);
    setRows(prev => {
      const exists = prev.find(r => r.item_key === key);
      if (exists) return prev.map(r => r.item_key === key ? { ...r, checked: newChecked } : r);
      return [...prev, { id: 0, ot_id: otId, item_key: key, checked: newChecked, foto_url: null, updated_at: '' }];
    });
    try {
      const res = await fetch(`/api/ordenes-trabajo/${otId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, checked: newChecked }),
      });
      if (res.ok) {
        const updated = await res.json() as ChecklistRow;
        setRows(prev => prev.map(r => r.item_key === key ? updated : r));
      }
    } catch {
      setRows(prev => prev.map(r => r.item_key === key ? { ...r, checked: !newChecked } : r));
    } finally {
      setSavingKey(null);
    }
  };

  const handleFotoClick = (key: string) => {
    if (!editable) return;
    pendingUploadKey.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = pendingUploadKey.current;
    if (!file || !key) return;
    e.target.value = '';
    setUploadingKey(key);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error('upload failed');
      const { url } = await uploadRes.json() as { url: string };
      const res = await fetch(`/api/ordenes-trabajo/${otId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, foto_url: url }),
      });
      if (res.ok) {
        const updated = await res.json() as ChecklistRow;
        setRows(prev => {
          const exists = prev.find(r => r.item_key === key);
          if (exists) return prev.map(r => r.item_key === key ? updated : r);
          return [...prev, updated];
        });
      }
    } catch { /* silent */ } finally {
      setUploadingKey(null);
    }
  };

  const removeFoto = async (key: string) => {
    if (!editable) return;
    setRows(prev => prev.map(r => r.item_key === key ? { ...r, foto_url: null } : r));
    await fetch(`/api/ordenes-trabajo/${otId}/checklist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_key: key, foto_url: null }),
    });
  };

  const checkedCount = rows.filter(r => r.checked && items.some(i => i.key === r.item_key)).length;
  const total = items.length;
  const allDone = total > 0 && checkedCount === total;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
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
      <div className="flex items-center justify-between mb-4">
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

      <div className="h-1.5 bg-zinc-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: total > 0 ? `${(checkedCount / total) * 100}%` : '0%' }}
        />
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const row = getRow(item.key);
          const isChecked = row?.checked ?? false;
          const fotoUrl = row?.foto_url ?? null;
          const isSaving = savingKey === item.key;
          const isUploading = uploadingKey === item.key;

          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                isChecked ? 'border-green-200 bg-green-50/50' : 'border-zinc-100 bg-white'
              }`}
            >
              <button
                onClick={() => toggleCheck(item.key)}
                disabled={!editable || !!savingKey}
                className={`flex-none transition-colors ${editable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isSaving ? (
                  <Loader2 className="size-5 text-zinc-400 animate-spin" />
                ) : isChecked ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <Circle className="size-5 text-zinc-300" />
                )}
              </button>

              <span className={`flex-1 text-sm ${isChecked ? 'text-zinc-600 line-through' : 'text-zinc-800'}`}>
                {item.label}
              </span>

              <div className="flex items-center gap-1.5 flex-none">
                {fotoUrl ? (
                  <>
                    <button
                      onClick={() => setLightbox(fotoUrl)}
                      className="relative size-9 rounded-md overflow-hidden border border-zinc-200 hover:ring-2 hover:ring-blue-300 transition-all"
                      title="Ver foto"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fotoUrl} alt={item.label} className="size-full object-cover" />
                    </button>
                    {editable && (
                      <button
                        onClick={() => removeFoto(item.key)}
                        className="size-5 rounded-full bg-zinc-100 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="Quitar foto"
                      >
                        <X className="size-3 text-zinc-500 hover:text-red-600" />
                      </button>
                    )}
                  </>
                ) : editable ? (
                  <button
                    onClick={() => handleFotoClick(item.key)}
                    disabled={isUploading}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 border border-dashed border-zinc-200 hover:border-zinc-400 rounded-md px-2 py-1 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
                    <span>{isUploading ? 'Subiendo...' : 'Foto'}</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

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
