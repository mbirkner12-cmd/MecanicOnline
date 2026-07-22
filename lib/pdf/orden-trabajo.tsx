// @ts-ignore — @react-pdf/renderer has known type issues
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export interface ObservacionItemPDF {
  comentario: string;
  urgencia: 'baja' | 'media' | 'alta';
  fecha: string;
}

export interface OTDocumentData {
  numero: string;
  created_at: string;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  vehiculo: { patente: string; marca: string; modelo: string; anio: number; kilometraje_actual: number } | null;
  cliente: { nombre: string; rut: string; telefono: string | null } | null;
  mecanico: { nombre: string } | null;
  cotizacion: {
    mano_de_obra_detalle: string | null;
    mano_de_obra_monto: number;
    repuestos: string;
    retiro_entrega_monto: number;
    total: number;
  } | null;
  insumos: string;
  observaciones: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatPesos(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
}

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

function formatFechaHoraPDF(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${min}`;
  } catch {
    return isoDate;
  }
}

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
  headerLeft: { flexDirection: 'column', gap: 2 },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111111' },
  headerSubtitle: { fontSize: 11, color: '#555555', marginTop: 2 },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  headerNumero: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111111' },
  headerFecha: { fontSize: 9, color: '#777777', marginTop: 2 },
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
  infoLabel: { width: 110, color: '#666666' },
  infoValue: { flex: 1, color: '#1a1a1a' },
  table: { marginHorizontal: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: '#fafafa',
  },
  colTh: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#444444' },
  colTd: { fontSize: 9, color: '#1a1a1a' },
  colPatente: { width: 80 },
  colMarca: { flex: 1 },
  colModelo: { flex: 1 },
  colAnio: { width: 50 },
  colKm: { width: 80 },
  colMoDetalle: { flex: 1 },
  colMoMonto: { width: 80, textAlign: 'right' },
  colDetalle: { flex: 2 },
  colCantidad: { width: 55 },
  colUnidad: { width: 45 },
  colValorUnit: { width: 75, textAlign: 'right' },
  colTotal: { width: 75, textAlign: 'right' },
  montoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  montoLabel: { color: '#555555' },
  montoValue: { color: '#1a1a1a' },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 2,
  },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
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
  noData: { fontSize: 9, color: '#999999', paddingHorizontal: 4, paddingVertical: 4, fontStyle: 'italic' },
  // Observation styles
  obsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  obsBadgeBaja: {
    backgroundColor: '#d1fae5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  obsBadgeMedia: {
    backgroundColor: '#fef3c7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  obsBadgeAlta: {
    backgroundColor: '#fee2e2',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  obsBadgeTextBaja: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#065f46' },
  obsBadgeTextMedia: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e' },
  obsBadgeTextAlta: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#991b1b' },
  obsComentario: { flex: 1, fontSize: 9, color: '#1a1a1a' },
  obsFecha: { fontSize: 8, color: '#888888', width: 90, textAlign: 'right' },
});

interface RepuestoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
  valor_unitario: number;
  monto_total: number;
}

interface ManoDeObraItem {
  detalle: string;
  monto: number;
}

interface InsumoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
}

// ── Repuestos table ──────────────────────────────────────────────────────────
function RepuestosTable({ items }: { items: RepuestoItem[] }) {
  return (
    // @ts-ignore
    <View style={styles.table}>
      {/* @ts-ignore */}
      <View style={styles.tableHeader}>
        {/* @ts-ignore */}
        <Text style={[styles.colTh, styles.colDetalle]}>Detalle</Text>
        {/* @ts-ignore */}
        <Text style={[styles.colTh, styles.colCantidad, { textAlign: 'center' }]}>Cant.</Text>
        {/* @ts-ignore */}
        <Text style={[styles.colTh, styles.colUnidad, { textAlign: 'center' }]}>Unid.</Text>
        {/* @ts-ignore */}
        <Text style={[styles.colTh, styles.colValorUnit]}>V. Unit.</Text>
        {/* @ts-ignore */}
        <Text style={[styles.colTh, styles.colTotal]}>Total</Text>
      </View>
      {items.map((item, idx) => (
        // @ts-ignore
        <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          {/* @ts-ignore */}
          <Text style={[styles.colTd, styles.colDetalle]}>{item.detalle}</Text>
          {/* @ts-ignore */}
          <Text style={[styles.colTd, styles.colCantidad, { textAlign: 'center' }]}>{item.cantidad}</Text>
          {/* @ts-ignore */}
          <Text style={[styles.colTd, styles.colUnidad, { textAlign: 'center' }]}>{item.unidad}</Text>
          {/* @ts-ignore */}
          <Text style={[styles.colTd, styles.colValorUnit]}>{formatPesos(item.valor_unitario)}</Text>
          {/* @ts-ignore */}
          <Text style={[styles.colTd, styles.colTotal]}>{formatPesos(item.monto_total)}</Text>
        </View>
      ))}
      {/* @ts-ignore */}
      <View style={[styles.montoRow, { marginTop: 4, justifyContent: 'flex-end', gap: 16 }]}>
        {/* @ts-ignore */}
        <Text style={[styles.montoLabel, { fontFamily: 'Helvetica-Bold' }]}>Subtotal repuestos</Text>
        {/* @ts-ignore */}
        <Text style={styles.montoValue}>{formatPesos(items.reduce((acc, r) => acc + (r.monto_total ?? 0), 0))}</Text>
      </View>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface OTDocumentProps {
  data: OTDocumentData;
}

export function OTDocument({ data }: OTDocumentProps) {
  let manoDeObraItems: ManoDeObraItem[] = [];
  try {
    const parsed = JSON.parse(data.cotizacion?.mano_de_obra_detalle ?? '[]') as ManoDeObraItem[];
    if (Array.isArray(parsed)) manoDeObraItems = parsed;
  } catch { /* not JSON */ }

  let repuestos: RepuestoItem[] = [];
  try {
    const parsed = JSON.parse(data.cotizacion?.repuestos ?? '[]') as RepuestoItem[];
    if (Array.isArray(parsed)) repuestos = parsed;
  } catch { /* not JSON */ }

  let insumos: InsumoItem[] = [];
  try {
    const parsed = JSON.parse(data.insumos ?? '[]') as InsumoItem[];
    if (Array.isArray(parsed)) insumos = parsed;
  } catch { /* not JSON */ }

  let observaciones: ObservacionItemPDF[] = [];
  try {
    const parsed = JSON.parse(data.observaciones ?? '[]') as ObservacionItemPDF[];
    if (Array.isArray(parsed)) observaciones = parsed;
  } catch { /* not JSON */ }

  const neto = data.cotizacion?.total ?? 0;
  const iva = Math.round(neto * 0.19);
  const total = Math.round(neto * 1.19);

  return (
    // @ts-ignore
    <Document>
      {/* @ts-ignore */}
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        {/* @ts-ignore */}
        <View style={styles.header}>
          {/* @ts-ignore */}
          <View style={styles.headerLeft}>
            {/* @ts-ignore */}
            <Text style={styles.headerTitle}>MecanicOnline</Text>
            {/* @ts-ignore */}
            <Text style={styles.headerSubtitle}>Orden de Trabajo</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.headerRight}>
            {/* @ts-ignore */}
            <Text style={styles.headerNumero}>{data.numero}</Text>
            {/* @ts-ignore */}
            <Text style={styles.headerFecha}>Fecha: {formatFechaPDF(data.created_at)}</Text>
          </View>
        </View>

        {/* ── Vehículo ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>VEHÍCULO</Text>
          {/* @ts-ignore */}
          <View style={styles.table}>
            {/* @ts-ignore */}
            <View style={styles.tableHeader}>
              {/* @ts-ignore */}
              <Text style={[styles.colTh, styles.colPatente]}>Patente</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTh, styles.colMarca]}>Marca</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTh, styles.colModelo]}>Modelo</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTh, styles.colAnio]}>Año</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTh, styles.colKm, { textAlign: 'right' }]}>Kilometraje</Text>
            </View>
            {/* @ts-ignore */}
            <View style={styles.tableRow}>
              {/* @ts-ignore */}
              <Text style={[styles.colTd, styles.colPatente]}>{data.vehiculo?.patente ?? '—'}</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTd, styles.colMarca]}>{data.vehiculo?.marca ?? '—'}</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTd, styles.colModelo]}>{data.vehiculo?.modelo ?? '—'}</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTd, styles.colAnio]}>{data.vehiculo?.anio ?? '—'}</Text>
              {/* @ts-ignore */}
              <Text style={[styles.colTd, styles.colKm, { textAlign: 'right' }]}>
                {data.vehiculo?.kilometraje_actual
                  ? `${data.vehiculo.kilometraje_actual.toLocaleString('es-CL')} km`
                  : '—'}
              </Text>
            </View>
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
        </View>

        {/* ── Mecánico ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>MECÁNICO</Text>
          {/* @ts-ignore */}
          <View style={styles.infoRow}>
            {/* @ts-ignore */}
            <Text style={styles.infoLabel}>Nombre</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>{data.mecanico?.nombre ?? 'Sin asignar'}</Text>
          </View>
          {data.fecha_hora_inicio && (
            // @ts-ignore
            <View style={styles.infoRow}>
              {/* @ts-ignore */}
              <Text style={styles.infoLabel}>Inicio reparación</Text>
              {/* @ts-ignore */}
              <Text style={styles.infoValue}>{formatFechaHoraPDF(data.fecha_hora_inicio)}</Text>
            </View>
          )}
          {data.fecha_hora_fin && (
            // @ts-ignore
            <View style={styles.infoRow}>
              {/* @ts-ignore */}
              <Text style={styles.infoLabel}>Fin reparación</Text>
              {/* @ts-ignore */}
              <Text style={styles.infoValue}>{formatFechaHoraPDF(data.fecha_hora_fin)}</Text>
            </View>
          )}
        </View>

        {/* ── Trabajos realizados (mano de obra) ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>TRABAJOS REALIZADOS</Text>
          {manoDeObraItems.length === 0 ? (
            // @ts-ignore
            <Text style={styles.noData}>Sin ítems de mano de obra</Text>
          ) : (
            // @ts-ignore
            <View style={styles.table}>
              {/* @ts-ignore */}
              <View style={styles.tableHeader}>
                {/* @ts-ignore */}
                <Text style={[styles.colTh, styles.colMoDetalle]}>Descripción</Text>
                {/* @ts-ignore */}
                <Text style={[styles.colTh, styles.colMoMonto]}>Monto</Text>
              </View>
              {manoDeObraItems.map((item, idx) => (
                // @ts-ignore
                <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  {/* @ts-ignore */}
                  <Text style={[styles.colTd, styles.colMoDetalle]}>{item.detalle}</Text>
                  {/* @ts-ignore */}
                  <Text style={[styles.colTd, styles.colMoMonto]}>{formatPesos(item.monto)}</Text>
                </View>
              ))}
              {/* @ts-ignore */}
              <View style={[styles.montoRow, { marginTop: 4, justifyContent: 'flex-end', gap: 16 }]}>
                {/* @ts-ignore */}
                <Text style={[styles.montoLabel, { fontFamily: 'Helvetica-Bold' }]}>Subtotal mano de obra</Text>
                {/* @ts-ignore */}
                <Text style={styles.montoValue}>{formatPesos(data.cotizacion?.mano_de_obra_monto ?? 0)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Repuestos ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>REPUESTOS</Text>
          {repuestos.length === 0 ? (
            // @ts-ignore
            <Text style={styles.noData}>Sin repuestos</Text>
          ) : (
            <RepuestosTable items={repuestos} />
          )}
        </View>

        {/* ── Insumos ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>INSUMOS Y MATERIALES</Text>
          {insumos.length === 0 ? (
            // @ts-ignore
            <Text style={styles.noData}>Sin insumos</Text>
          ) : (
            // @ts-ignore
            <View style={styles.table}>
              {/* @ts-ignore */}
              <View style={styles.tableHeader}>
                {/* @ts-ignore */}
                <Text style={[styles.colTh, styles.colDetalle]}>Detalle</Text>
                {/* @ts-ignore */}
                <Text style={[styles.colTh, styles.colCantidad, { textAlign: 'center' }]}>Cant.</Text>
                {/* @ts-ignore */}
                <Text style={[styles.colTh, styles.colUnidad, { textAlign: 'center' }]}>Unid.</Text>
              </View>
              {insumos.map((item, idx) => (
                // @ts-ignore
                <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  {/* @ts-ignore */}
                  <Text style={[styles.colTd, styles.colDetalle]}>{item.detalle}</Text>
                  {/* @ts-ignore */}
                  <Text style={[styles.colTd, styles.colCantidad, { textAlign: 'center' }]}>{item.cantidad}</Text>
                  {/* @ts-ignore */}
                  <Text style={[styles.colTd, styles.colUnidad, { textAlign: 'center' }]}>{item.unidad}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Totales ── */}
        {/* @ts-ignore */}
        <View style={{ marginTop: 4 }}>
          {/* @ts-ignore */}
          <View style={[styles.montoRow, { borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 6 }]}>
            {/* @ts-ignore */}
            <Text style={[styles.montoLabel, { fontFamily: 'Helvetica-Bold' }]}>Total Neto</Text>
            {/* @ts-ignore */}
            <Text style={[styles.montoValue, { fontFamily: 'Helvetica-Bold' }]}>{formatPesos(neto)}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.montoRow}>
            {/* @ts-ignore */}
            <Text style={styles.montoLabel}>IVA (19%)</Text>
            {/* @ts-ignore */}
            <Text style={styles.montoValue}>{formatPesos(iva)}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.totalContainer}>
            {/* @ts-ignore */}
            <Text style={styles.totalLabel}>TOTAL</Text>
            {/* @ts-ignore */}
            <Text style={styles.totalValue}>{formatPesos(total)}</Text>
          </View>
        </View>

        {/* ── Observaciones ── */}
        {observaciones.length > 0 && (
          // @ts-ignore
          <View style={[styles.section, { marginTop: 16 }]}>
            {/* @ts-ignore */}
            <Text style={styles.sectionTitle}>OBSERVACIONES DEL VEHÍCULO</Text>
            {observaciones.map((obs, idx) => {
              const badgeStyle =
                obs.urgencia === 'alta'
                  ? styles.obsBadgeAlta
                  : obs.urgencia === 'media'
                  ? styles.obsBadgeMedia
                  : styles.obsBadgeBaja;
              const badgeTextStyle =
                obs.urgencia === 'alta'
                  ? styles.obsBadgeTextAlta
                  : obs.urgencia === 'media'
                  ? styles.obsBadgeTextMedia
                  : styles.obsBadgeTextBaja;
              return (
                // @ts-ignore
                <View key={idx} style={styles.obsRow}>
                  {/* @ts-ignore */}
                  <View style={badgeStyle}>
                    {/* @ts-ignore */}
                    <Text style={badgeTextStyle}>{obs.urgencia.toUpperCase()}</Text>
                  </View>
                  {/* @ts-ignore */}
                  <Text style={styles.obsComentario}>{obs.comentario}</Text>
                  {/* @ts-ignore */}
                  <Text style={styles.obsFecha}>{formatFechaHoraPDF(obs.fecha)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Footer ── */}
        {/* @ts-ignore */}
        <View style={styles.footer} fixed>
          {/* @ts-ignore */}
          <Text style={styles.footerText}>MecanicOnline</Text>
          {/* @ts-ignore */}
          <Text style={styles.footerText}>{data.numero}</Text>
        </View>
      </Page>
    </Document>
  );
}
