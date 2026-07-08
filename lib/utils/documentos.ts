export type EstadoDocumento = 'vigente' | 'por_vencer' | 'vencido' | 'sin_datos';

export function getEstadoDocumento(fechaVencimiento: string | null | undefined): EstadoDocumento {
  if (!fechaVencimiento) return 'sin_datos';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento + 'T00:00:00');
  const diffDias = Math.floor((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'por_vencer';
  return 'vigente';
}

export function getAlertaDocumentos(
  rtVencimiento: string | null | undefined,
  pcVencimiento: string | null | undefined
): 'vencido' | 'por_vencer' | 'ok' | null {
  const rt = getEstadoDocumento(rtVencimiento);
  const pc = getEstadoDocumento(pcVencimiento);
  if (rt === 'sin_datos' && pc === 'sin_datos') return null;
  if (rt === 'vencido' || pc === 'vencido') return 'vencido';
  if (rt === 'por_vencer' || pc === 'por_vencer') return 'por_vencer';
  return 'ok';
}

export function formatFechaVencimiento(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}
