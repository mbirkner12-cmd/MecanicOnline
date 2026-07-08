import { GRAVEDAD_CONFIG, type DiagnosticoItem } from "./DiagnosticoForm";

const ORDEN: Record<string, number> = { alto: 0, medio: 1, bajo: 2 };

export function parseDiagnostico(raw: string | null | undefined): DiagnosticoItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && "gravedad" in parsed[0]) {
      return parsed as DiagnosticoItem[];
    }
  } catch { /* plain text */ }
  return null;
}

interface DiagnosticoDisplayProps {
  value: string | null | undefined;
}

export function DiagnosticoDisplay({ value }: DiagnosticoDisplayProps) {
  if (!value) return null;

  const items = parseDiagnostico(value);

  if (!items) {
    return (
      <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{value}</p>
    );
  }

  const sorted = [...items].sort((a, b) => (ORDEN[a.gravedad] ?? 3) - (ORDEN[b.gravedad] ?? 3));

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item, idx) => {
        const cfg = GRAVEDAD_CONFIG[item.gravedad];
        return (
          <div key={idx} className={`rounded-lg border p-3 flex flex-col gap-1.5 ${cfg.borderCls}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badgeCls}`}
              >
                {cfg.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 px-2 py-0.5 text-xs font-medium">
                {item.sistema}
              </span>
            </div>
            {item.descripcion && (
              <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                {item.descripcion}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
