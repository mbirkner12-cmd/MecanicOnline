// @ts-ignore — @react-pdf/renderer has known type issues
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export interface RepuestoItem {
  detalle: string;
  cantidad: number;
  unidad: string;
  valor_unitario: number;
  monto_total: number;
}

export interface ManoDeObraItem {
  detalle: string;
  monto: number;
}

export interface CotizacionPDF {
  id: number;
  numero: string;
  created_at: string;
  mano_de_obra_detalle: string | null;
  mano_de_obra_monto: number;
  repuestos: RepuestoItem[];
  recomendaciones?: RepuestoItem[];
  retiro_entrega_monto: number;
  total: number;
  estado: string;
  vehiculo: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    kilometraje_actual: number;
  } | null;
  cliente: {
    nombre: string;
    telefono: string | null;
    rut: string;
  } | null;
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
  sectionTitleAlt: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    backgroundColor: '#fef3c7',
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
  totalAltContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#92400e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
    borderRadius: 2,
  },
  totalAltLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fef3c7' },
  totalAltValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#fef3c7' },
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
});

// ── Shared table renderer ─────────────────────────────────────────────────────
function RepuestosTable({ items, subtotalLabel }: { items: RepuestoItem[]; subtotalLabel: string }) {
  const subtotal = items.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);
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
        <Text style={[styles.montoLabel, { fontFamily: 'Helvetica-Bold' }]}>{subtotalLabel}</Text>
        {/* @ts-ignore */}
        <Text style={styles.montoValue}>{formatPesos(subtotal)}</Text>
      </View>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface CotizacionDocumentProps {
  data: CotizacionPDF;
}

export function CotizacionDocument({ data }: CotizacionDocumentProps) {
  const repuestos = data.repuestos ?? [];
  const recomendaciones = data.recomendaciones ?? [];
  const totalRepuestos = repuestos.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);
  const totalRecomendaciones = recomendaciones.reduce((acc, r) => acc + (r.monto_total ?? 0), 0);

  let manoDeObraItems: ManoDeObraItem[] = [];
  try {
    const parsed = JSON.parse(data.mano_de_obra_detalle ?? '[]') as ManoDeObraItem[];
    if (Array.isArray(parsed)) manoDeObraItems = parsed;
  } catch { /* not JSON */ }

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
            <Text style={styles.headerSubtitle}>Cotización de servicios</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.headerRight}>
            {/* @ts-ignore */}
            <Text style={styles.headerNumero}>{data.numero}</Text>
            {/* @ts-ignore */}
            <Text style={styles.headerFecha}>Fecha: {formatFechaPDF(data.created_at)}</Text>
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
            <Text style={styles.infoLabel}>Teléfono</Text>
            {/* @ts-ignore */}
            <Text style={styles.infoValue}>{data.cliente?.telefono ?? '—'}</Text>
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

        {/* ── Mano de obra ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>MANO DE OBRA</Text>
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
                <Text style={styles.montoValue}>{formatPesos(data.mano_de_obra_monto)}</Text>
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
            <RepuestosTable items={repuestos} subtotalLabel="Subtotal repuestos" />
          )}
        </View>

        {/* ── Retiro y entrega ── */}
        {/* @ts-ignore */}
        <View style={styles.section}>
          {/* @ts-ignore */}
          <Text style={styles.sectionTitle}>RETIRO Y ENTREGA</Text>
          {/* @ts-ignore */}
          <View style={styles.montoRow}>
            {/* @ts-ignore */}
            <Text style={styles.montoLabel}>Monto retiro y entrega</Text>
            {/* @ts-ignore */}
            <Text style={styles.montoValue}>{formatPesos(data.retiro_entrega_monto)}</Text>
          </View>
        </View>

        {/* ── Totales ── */}
        {/* @ts-ignore */}
        <View style={{ marginTop: 4 }}>
          {/* @ts-ignore */}
          <View style={[styles.montoRow, { borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 6 }]}>
            {/* @ts-ignore */}
            <Text style={[styles.montoLabel, { fontFamily: 'Helvetica-Bold' }]}>Total Neto</Text>
            {/* @ts-ignore */}
            <Text style={[styles.montoValue, { fontFamily: 'Helvetica-Bold' }]}>{formatPesos(data.total)}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.montoRow}>
            {/* @ts-ignore */}
            <Text style={styles.montoLabel}>IVA (19%)</Text>
            {/* @ts-ignore */}
            <Text style={styles.montoValue}>{formatPesos(Math.round(data.total * 0.19))}</Text>
          </View>
          {/* @ts-ignore */}
          <View style={styles.totalContainer}>
            {/* @ts-ignore */}
            <Text style={styles.totalLabel}>TOTAL</Text>
            {/* @ts-ignore */}
            <Text style={styles.totalValue}>{formatPesos(Math.round(data.total * 1.19))}</Text>
          </View>
        </View>

        {/* ── Recomendaciones ── */}
        {recomendaciones.length > 0 && (
          // @ts-ignore
          <View style={[styles.section, { marginTop: 16 }]}>
            {/* @ts-ignore */}
            <Text style={styles.sectionTitleAlt}>RECOMENDACIONES ADICIONALES (OPCIONAL)</Text>
            <RepuestosTable items={recomendaciones} subtotalLabel="Subtotal recomendaciones" />
            {/* @ts-ignore */}
            <View style={styles.totalAltContainer}>
              {/* @ts-ignore */}
              <View>
                {/* @ts-ignore */}
                <Text style={styles.totalAltLabel}>SI INCLUYE RECOMENDACIONES</Text>
                {/* @ts-ignore */}
                <Text style={[styles.totalAltLabel, { fontSize: 8, fontFamily: 'Helvetica', marginTop: 2 }]}>
                  {formatPesos(data.total)} neto + {formatPesos(totalRecomendaciones)} recomendaciones + IVA 19%
                </Text>
              </View>
              {/* @ts-ignore */}
              <Text style={styles.totalAltValue}>{formatPesos(Math.round((data.total + totalRecomendaciones) * 1.19))}</Text>
            </View>
          </View>
        )}

        {/* ── Footer ── */}
        {/* @ts-ignore */}
        <View style={styles.footer} fixed>
          {/* @ts-ignore */}
          <Text style={styles.footerText}>Cotización válida por 30 días</Text>
          {/* @ts-ignore */}
          <Text style={styles.footerText}>{data.numero} — MecanicOnline</Text>
        </View>
      </Page>
    </Document>
  );
}
