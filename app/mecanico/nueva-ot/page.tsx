'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Loader2, Car, Check } from 'lucide-react';
import { useSession } from '@/lib/hooks/useSession';

const INPUT_CLS = 'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

interface VehiculoInfo {
  vehiculo_id?: number;
  cliente_id?: number;
  marca: string;
  modelo: string;
  anio: number | string;
  patente: string;
  nombre_cliente?: string;
  rut_cliente?: string;
  telefono_cliente?: string;
}

export default function NuevaOTMecanicoPage() {
  const router = useRouter();
  const { session } = useSession();

  const [patente, setPatente] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [vehiculo, setVehiculo] = useState<VehiculoInfo | null>(null);
  const [errorPatente, setErrorPatente] = useState('');

  // Campos del cliente (si es vehiculo nuevo o sin cliente)
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [motivo, setMotivo] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Búsqueda de patente con debounce
  useEffect(() => {
    const p = patente.trim().toUpperCase();
    if (p.length < 4) { setVehiculo(null); setErrorPatente(''); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      setErrorPatente('');
      try {
        const res = await fetch(`/api/patente?patente=${encodeURIComponent(p)}`);
        const data = await res.json();
        if (data.source === 'local' && data.vehiculo_id) {
          // Vehículo existente — buscar datos completos
          const vRes = await fetch(`/api/vehiculos/${data.vehiculo_id}`);
          const vData = await vRes.json();
          setVehiculo({
            vehiculo_id: vData.id,
            cliente_id: vData.cliente_id,
            marca: vData.marca,
            modelo: vData.modelo,
            anio: vData.anio,
            patente: vData.patente,
            nombre_cliente: vData.cliente?.nombre ?? '',
            rut_cliente: vData.cliente?.rut ?? '',
            telefono_cliente: vData.cliente?.telefono ?? '',
          });
          setNombreCliente(vData.cliente?.nombre ?? '');
          setTelefonoCliente(vData.cliente?.telefono ?? '');
        } else if (data.source === 'boostr' || data.marca) {
          setVehiculo({
            marca: data.marca ?? '',
            modelo: data.modelo ?? '',
            anio: data.anio ?? '',
            patente: p,
          });
        } else {
          setErrorPatente('Patente no encontrada.');
        }
      } catch {
        setErrorPatente('Error al buscar la patente.');
      } finally {
        setBuscando(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [patente]);

  async function handleCrear() {
    if (!vehiculo) return;
    setError('');
    setSaving(true);

    try {
      let vehiculo_id = vehiculo.vehiculo_id;
      let cliente_id = vehiculo.cliente_id;

      // Si es vehículo nuevo, crear cliente y vehículo primero
      if (!vehiculo_id) {
        if (!nombreCliente.trim()) { setError('El nombre del cliente es requerido.'); setSaving(false); return; }

        // Crear cliente
        const cRes = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nombreCliente.trim(), telefono: telefonoCliente.trim() || null }),
        });
        if (!cRes.ok) throw new Error('Error al crear cliente');
        const cData = await cRes.json();
        cliente_id = cData.id;

        // Crear vehículo
        const vRes = await fetch('/api/vehiculos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            anio: Number(vehiculo.anio),
            kilometraje_actual: 0,
            cliente_id,
          }),
        });
        if (!vRes.ok) throw new Error('Error al crear vehículo');
        const vData = await vRes.json();
        vehiculo_id = vData.id;
      }

      // Crear OT rápida
      const res = await fetch('/api/ordenes-trabajo/rapida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculo_id,
          cliente_id,
          mecanico_id: session?.mecanicoId ?? null,
          motivo: motivo.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al crear OT');
      }

      const data = await res.json();
      router.push(`/mecanico/ordenes-trabajo/${data.ot_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear OT');
    } finally {
      setSaving(false);
    }
  }

  const esVehiculoConocido = !!vehiculo?.vehiculo_id;
  const puedeCrear = !!vehiculo && (esVehiculoConocido || nombreCliente.trim().length > 0);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Nueva orden de trabajo</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Ingresá la patente para comenzar</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Car className="size-4 text-zinc-500" />
            Vehículo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patente */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block font-medium">Patente *</label>
            <div className="relative">
              <input
                className={INPUT_CLS + ' uppercase pr-8'}
                placeholder="Ej: ABCD12"
                value={patente}
                onChange={e => { setPatente(e.target.value.toUpperCase()); setVehiculo(null); }}
                maxLength={8}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {buscando
                  ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  : vehiculo
                    ? <Check className="h-4 w-4 text-green-500" />
                    : <Search className="h-4 w-4 text-zinc-300" />
                }
              </div>
            </div>
            {errorPatente && <p className="text-xs text-red-600 mt-1">{errorPatente}</p>}
          </div>

          {/* Datos del vehículo */}
          {vehiculo && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Marca</label>
                <input className={INPUT_CLS} value={vehiculo.marca} onChange={e => setVehiculo(v => v ? { ...v, marca: e.target.value } : v)} readOnly={esVehiculoConocido} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Modelo</label>
                <input className={INPUT_CLS} value={vehiculo.modelo} onChange={e => setVehiculo(v => v ? { ...v, modelo: e.target.value } : v)} readOnly={esVehiculoConocido} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Año</label>
                <input className={INPUT_CLS} value={vehiculo.anio} onChange={e => setVehiculo(v => v ? { ...v, anio: e.target.value } : v)} readOnly={esVehiculoConocido} />
              </div>
            </div>
          )}

          {/* Cliente */}
          {vehiculo && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cliente</p>
              {esVehiculoConocido ? (
                <div className="text-sm text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2">
                  {vehiculo.nombre_cliente || <span className="text-zinc-400 italic">Sin nombre</span>}
                  {vehiculo.telefono_cliente && <span className="text-zinc-400 ml-2">· {vehiculo.telefono_cliente}</span>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-500 mb-1 block">Nombre *</label>
                    <input className={INPUT_CLS} placeholder="Nombre del cliente" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-zinc-500 mb-1 block">Teléfono</label>
                    <input className={INPUT_CLS} placeholder="+56 9 ..." value={telefonoCliente} onChange={e => setTelefonoCliente(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Motivo */}
          {vehiculo && (
            <div className="border-t border-zinc-100 pt-4">
              <label className="text-xs text-zinc-500 mb-1 block font-medium">Motivo de ingreso</label>
              <textarea
                className="flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                placeholder="Ej: Cambio de aceite, revisión de frenos..."
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={saving} className="flex-1">
          Cancelar
        </Button>
        <Button
          onClick={handleCrear}
          disabled={!puedeCrear || saving}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          {saving ? <><Loader2 className="size-4 mr-2 animate-spin" />Creando...</> : 'Crear orden de trabajo'}
        </Button>
      </div>
    </div>
  );
}
