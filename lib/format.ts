// RUT chileno: 12.345.678-9
export function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean;

  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${bodyFormatted}-${dv}`;
}

// Quita los puntos para enviar a la API y guardar en DB: 12.345.678-9 → 12345678-9
export function normalizeRut(value: string): string {
  return value.replace(/\./g, '').trim().toUpperCase();
}

// Teléfono chileno: +56 9 1234 5678
export function formatPhone(value: string): string {
  if (!value.trim()) return '';

  const digits = value.replace(/\D/g, '');

  // Quitar prefijo 56 si vino con él
  let local = digits;
  if (local.startsWith('56') && local.length > 9) {
    local = local.slice(2);
  }

  // Celular: 9 dígitos (empieza con 9)
  if (local.length === 9) {
    return `+56 ${local[0]} ${local.slice(1, 5)} ${local.slice(5)}`;
  }

  // Fijo: 8 dígitos
  if (local.length === 8) {
    return `+56 2 ${local.slice(0, 4)} ${local.slice(4)}`;
  }

  return value;
}
