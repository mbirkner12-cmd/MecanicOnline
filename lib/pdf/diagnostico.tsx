// @ts-ignore — @react-pdf/renderer has known type issues
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

interface DiagnosticoItem {
  sistema: string;
  descripcion: string;
  gravedad: 'bajo' | 'medio' | 'alto';
}

export interface DiagnosticoPDF {
  id: number;
  fecha_hora_ingreso: string;
  kilometraje: number;
  motivo_ingreso: string | null;
  diagnostico_mecanico: string | null;
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
  } | null;
  cliente: {
    nombre: string;
    rut: string;
    telefono: string | null;
    correo: string | null;
  } | null;
  mecanico: {
    nombre: string;
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatFechaPDF(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}

function parseDiagnostico(raw: string | null): DiagnosticoItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && 'gravedad' in parsed[0]) {
      return parsed as DiagnosticoItem[];
    }
  } catch { /* plain text */ }
  return null;
}

const GRAVEDAD_CONFIG = {
  alto: {
    label: 'ALTO (CRÍTICO)',
    definicion: 'Falla grave que compromete la seguridad del vehículo o su funcionamiento inmediato. Reparación urgente.',
    bg: '#fee2e2',
    border: '#fca5a5',
    text: '#991b1b',
    badgeBg: '#dc2626',
    badgeText: '#ffffff',
  },
  medio: {
    label: 'MEDIO (NECESARIO)',
    definicion: 'Defecto detectable que requiere corrección a mediano plazo para evitar daños mayores.',
    bg: '#fff7ed',
    border: '#fdba74',
    text: '#9a3412',
    badgeBg: '#ea580c',
    badgeText: '#ffffff',
  },
  bajo: {
    label: 'BAJO (SUGERIDO)',
    definicion: 'Desgaste normal o leve. Se recomienda monitoreo o mantenimiento preventivo próximo.',
    bg: '#eff6ff',
    border: '#93c5fd',
    text: '#1e40af',
    badgeBg: '#2563eb',
    badgeText: '#ffffff',
  },
} as const;

const ORDEN: Record<string, number> = { alto: 0, medio: 1, bajo: 2 };

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111111' },
  headerSubtitle: { fontSize: 11, color: '#555555', marginTop: 2 },
  headerNumero: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111111', textAlign: 'right' },
  headerFecha: { fontSize: 9, color: '#777777', marginTop: 2, textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    backgroundColor: '#f5f5f5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  infoRow: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 4 },
  infoLabel: { width: 120, color: '#666666' },
  infoValue: { flex: 1, color: '#1a1a1a' },
  itemBox: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  itemInner: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  sistemaBadge: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sistemaText: {
    fontSize: 8,
    color: '#52525b',
    fontFamily: 'Helvetica-Bold',
  },
  itemDesc: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  legendBox: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#444444',
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 8,
  },
  legendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 90,
  },
  legendBadgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  legendDef: {
    flex: 1,
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.4,
  },
  noItems: {
    fontSize: 9,
    color: '#999999',
    fontStyle: 'italic',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#aaaaaa' },
});

// ── Component ─────────────────────────────────────────────────────────────────
interface DiagnosticoDocumentProps {
  data: DiagnosticoPDF;
}

export function DiagnosticoDocument({ data }: DiagnosticoDocumentProps) {
  const items = parseDiagnostico(data.diagnostico_mecanico);
  const sorted = items
    ? [...items].sort((a, b) => (ORDEN[a.gravedad] ?? 3) - (ORDEN[b.gravedad] ?? 3))
    : null;

  return (
    // @ts-ignore
    <Document>
      {/* @ts-ignore */}
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        {/* @ts-ignore */}
        <View style={styles.header}>
          {/* @ts-ignore */}
          <View>
            {/* @ts-ignore */}
            <Text style={styles.headerTitle}>MecanicOnline</Text>
            {/* @ts-ignore */}
            <Text style={styles.headerSubtitle}>Informe de Diagnóstico</Text>
          </View>
          {/* @ts-ignore */}
          <View>
            {/* @ts-ignore */}
            <Text style={styles.headerNumero}>Recepción #{data.id}</Text>
            {/* @ts-ignore */}
            <Text style={styles.headerFecha}>Fecha: {formatFechaPDF(data.fecha_hora_ingreso)}</Text>
            {data.mecanico && (
              // @ts-ignore
              <Text style={[styles.headerFecha, { marginTop: 1 }]}>Mecánico: {data.mecanico.nombre}</Text>
            )}
          </View>
        </View>

        {/* ── Cliente ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>Nombre</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>{data.cliente?.nombre ?? '—'}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>RUT</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>{data.cliente?.rut ?? '—'}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>Teléfono</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>{data.cliente?.telefono ?? '—'}</Text>
          </View>
          {data.cliente?.correo && (
            // @ts-ignore
            <View style={styles.infoRow}>
              {/* @ts-ignore */}
              <Text style={styles.infoLabel}>Correo</Text>
              {/* @ts-ignore */}
              <Text style={styles.infoValue}>{data.cliente.correo}</Text>
            </View>
          )}
        </View>

        {/* ── Vehículo ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>VEHÍCULO</Text>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>Patente</Text>
            {/* @ts-ignore */}
            <Text style={[styles.infoValue, { fontFamily: 'Helvetica-Bold' }]}>{data.vehiculo?.patente ?? '—'}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>Marca / Modelo</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>
              {data.vehiculo ? `${data.vehiculo.marca} ${data.vehiculo.modelo} ${data.vehiculo.anio}` : '—'}
            </Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>Kilometraje ingreso</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>
              {data.kilometraje ? `${data.kilometraje.toLocaleString('es-CL')} km` : '—'}
            </Text>
          </View>
        </View>

        {/* ── Motivo de ingreso ── */}
        {data.motivo_ingreso && (
          // @ts-ignore
          <View style={styles.section}>
            {/* @ts-ignore */}
            <Text style={styles.sectionTitle}>MOTIVO DE INGRESO</Text>
            {/* @ts-ignore */}
            <View style={styles.infoRow}>
              {/* @ts-ignore */}
              <Text style={[styles.infoValue, { lineHeight: 1.5 }]}>{data.motivo_ingreso}</Text>
            </View>
          </View>
        )}

        {/* ── Leyenda de niveles ── */}
        {/* @ts-ignore */}
        <View style={styles.legendBox}>
          {/* @ts-ignore */}
          <Text style={styles.legendTitle}>DEFINICIÓN DE NIVELES DE GRAVEDAD</Text>
          {((['alto', 'medio', 'bajo']) as const).map((g) => {
            const cfg = GRAVEDAD_CONFIG[g];
            return (
              // @ts-ignore
              <View key={g} style={styles.legendRow}>
                {/* @ts-ignore */}
                <View style={[styles.legendBadge, { backgroundColor: cfg.badgeBg }]}>
                  {/* @ts-ignore */}
                  <Text style={[styles.legendBadgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
                </View>
                {/* @ts-ignore */}
                <Text style={styles.legendDef}>{cfg.definicion}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Hallazgos ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>HALLAZGOS DEL DIAGNÓSTICO</Text>
          {!sorted || sorted.length === 0 ? (
            // @ts-ignore
            <Text style={styles.noItems}>Sin hallazgos registrados.</Text>
          ) : (
            sorted.map((item, idx) => {
              const cfg = GRAVEDAD_CONFIG[item.gravedad];
              return (
                // @ts-ignore
                <View key={idx} style={styles.itemBox}>
                  {/* @ts-ignore */}
                  <View style={[styles.itemInner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                    {/* @ts-ignore */}
                    <View style={styles.itemHeader}>
                      {/* @ts-ignore */}
                      <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                        {/* @ts-ignore */}
                        <Text style={[styles.badgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
                      </View>
                      {/* @ts-ignore */}
                      <View style={styles.sistemaBadge}>
                        {/* @ts-ignore */}
                        <Text style={styles.sistemaText}>{item.sistema}</Text>
                      </View>
                    </View>
                    {item.descripcion ? (
                      // @ts-ignore
                      <Text style={styles.itemDesc}>{item.descripcion}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Footer ── */}
        {/* @ts-ignore */}
        <View style={styles.footer} fixed>
          {/* @ts-ignore */}
          <Text style={styles.footerText}>Informe de diagnóstico — MecanicOnline</Text>
          {/* @ts-ignore */}
          <Text style={styles.footerText}>Recepción #{data.id} — {formatFechaPDF(data.fecha_hora_ingreso)}</Text>
        </View>

      </Page>
    </Document>
  );
}
