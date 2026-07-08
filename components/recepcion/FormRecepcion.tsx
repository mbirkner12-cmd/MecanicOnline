"use client";

import { useState, useEffect, useRef, useCallback, useDeferredValue } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, X, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEstadoDocumento, type EstadoDocumento } from "@/lib/utils/documentos";
import { formatRut, normalizeRut, formatPhone } from "@/lib/format";

// ── Badge de estado de documento ───────────────────────────────────────────
function BadgeDocumento({ estado }: { estado: EstadoDocumento }) {
  if (estado === 'sin_datos') return null;
  const config = {
    vigente: { label: 'Vigente', cls: 'bg-green-100 text-green-700' },
    por_vencer: { label: 'Por vencer', cls: 'bg-orange-100 text-orange-700' },
    vencido: { label: 'Vencida', cls: 'bg-red-100 text-red-700' },
  };
  const c = config[estado];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ClienteData {
  id: number;
  rut: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  whatsapp?: string | null;
}

interface VehiculoData {
  id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje_actual: number;
  cliente_id: number;
  cliente: ClienteData | null;
}

interface MecanicoOption {
  id: number;
  nombre: string;
}

interface PuestoOption {
  id: number;
  nombre: string;
  tipo: string;
}

export interface FormRecepcionValues {
  // Vehículo
  vehiculo_id?: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: string;
  kilometraje: string;
  nivel_bencina: string;
  foto_tablero_url?: string;
  fotos_urls: string[];
  // Documentos del vehículo
  revision_tecnica_url?: string;
  revision_tecnica_vencimiento?: string;
  permiso_circulacion_url?: string;
  permiso_circulacion_vencimiento?: string;
  // Cliente
  cliente_id?: number;
  rut_cliente: string;
  nombre_cliente: string;
  telefono_cliente: string;
  correo_cliente: string;
  direccion_cliente: string;
  whatsapp_cliente?: string;
  // Motivo de ingreso
  motivo_ingreso?: string;
  // Asignación
  mecanico_id: string;
  puesto_id: string;
}

interface FormRecepcionProps {
  initialValues?: Partial<FormRecepcionValues>;
  onSubmit: (values: FormRecepcionValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  mode?: "create" | "edit";
  cotizacion_id?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const NIVEL_BENCINA_OPTIONS = [
  { value: "vacio", label: "Vacío" },
  { value: "1/4", label: "1/4" },
  { value: "1/2", label: "1/2" },
  { value: "3/4", label: "3/4" },
  { value: "lleno", label: "Lleno" },
];

// ── Component ──────────────────────────────────────────────────────────────
export function FormRecepcion({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  mode = "create",
}: FormRecepcionProps) {
  // Vehículo
  const [patente, setPatente] = useState(initialValues?.patente ?? "");
  const [marca, setMarca] = useState(initialValues?.marca ?? "");
  const [modelo, setModelo] = useState(initialValues?.modelo ?? "");
  const [anio, setAnio] = useState(initialValues?.anio ?? "");
  const [kilometraje, setKilometraje] = useState(initialValues?.kilometraje ?? "");
  const [nivelBencina, setNivelBencina] = useState(initialValues?.nivel_bencina ?? "");
  const [vehiculoId, setVehiculoId] = useState<number | undefined>(initialValues?.vehiculo_id);
  const [vehiculoReadonly, setVehiculoReadonly] = useState(false);

  // Fotos
  const [fotoTableroFile, setFotoTableroFile] = useState<File | null>(null);
  const [fotoTableroPreview, setFotoTableroPreview] = useState<string>(
    initialValues?.foto_tablero_url ?? ""
  );
  const [fotosFiles, setFotosFiles] = useState<File[]>([]);
  const [fotosPreviews, setFotosPreviews] = useState<string[]>(
    initialValues?.fotos_urls ?? []
  );
  const fotoTableroRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef<HTMLInputElement>(null);

  // Documentos del vehículo
  const [revTecnicaFile, setRevTecnicaFile] = useState<File | null>(null);
  const [revTecnicaPreview, setRevTecnicaPreview] = useState(initialValues?.revision_tecnica_url ?? "");
  const [revTecnicaVencimiento, setRevTecnicaVencimiento] = useState(initialValues?.revision_tecnica_vencimiento ?? "");
  const [permisoCircFile, setPermisoCircFile] = useState<File | null>(null);
  const [permisoCircPreview, setPermisoCircPreview] = useState(initialValues?.permiso_circulacion_url ?? "");
  const [permisoCircVencimiento, setPermisoCircVencimiento] = useState(initialValues?.permiso_circulacion_vencimiento ?? "");
  const revTecnicaRef = useRef<HTMLInputElement>(null);
  const permisoCircRef = useRef<HTMLInputElement>(null);

  // Cliente
  const [rutCliente, setRutCliente] = useState(initialValues?.rut_cliente ?? "");
  const [nombreCliente, setNombreCliente] = useState(initialValues?.nombre_cliente ?? "");
  const [telefonoCliente, setTelefonoCliente] = useState(initialValues?.telefono_cliente ?? "");
  const [correoCliente, setCorreoCliente] = useState(initialValues?.correo_cliente ?? "");
  const [direccionCliente, setDireccionCliente] = useState(
    initialValues?.direccion_cliente ?? ""
  );
  const [whatsappCliente, setWhatsappCliente] = useState(initialValues?.whatsapp_cliente ?? "");
  const [clienteId, setClienteId] = useState<number | undefined>(initialValues?.cliente_id);

  // Motivo de ingreso
  const [motivoIngreso, setMotivoIngreso] = useState(initialValues?.motivo_ingreso ?? "");

  // Asignación
  const [mecanicoId, setMecanicoId] = useState(initialValues?.mecanico_id ?? "");
  const [puestoId, setPuestoId] = useState(initialValues?.puesto_id ?? "");
  const [mecanicos, setMecanicos] = useState<MecanicoOption[]>([]);
  const [puestos, setPuestos] = useState<PuestoOption[]>([]);

  // Búsqueda vehículo
  const [vehiculoEncontrado, setVehiculoEncontrado] = useState<VehiculoData | null>(null);
  const [vehiculoBuscando, setVehiculoBuscando] = useState(false);
  const [vehiculoDecision, setVehiculoDecision] = useState<"pending" | "mantener" | "cambiar" | null>(null);

  // Búsqueda cliente
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteData | null>(null);
  const [clienteBuscando, setClienteBuscando] = useState(false);

  // Sugerencias marca/modelo
  const [marcasSugeridas, setMarcasSugeridas] = useState<string[]>([]);
  const [modelosSugeridos, setModelosSugeridos] = useState<string[]>([]);
  const deferredMarca = useDeferredValue(marca);

  // Error general
  const [errorMsg, setErrorMsg] = useState("");

  const debouncedPatente = useDebounce(patente, 400);
  const debouncedRut = useDebounce(rutCliente, 400);

  // Cargar marcas al montar
  useEffect(() => {
    fetch("/api/vehiculos/sugerencias")
      .then((r) => r.json())
      .then((data: { marcas: string[]; modelos: string[] }) => {
        setMarcasSugeridas(data.marcas);
        setModelosSugeridos(data.modelos);
      })
      .catch(() => {});
  }, []);

  // Filtrar modelos cuando cambia la marca
  useEffect(() => {
    if (!deferredMarca) return;
    fetch(`/api/vehiculos/sugerencias?marca=${encodeURIComponent(deferredMarca)}`)
      .then((r) => r.json())
      .then((data: { marcas: string[]; modelos: string[] }) => {
        setModelosSugeridos(data.modelos);
      })
      .catch(() => {});
  }, [deferredMarca]);

  // Cargar mecánicos y puestos al montar
  useEffect(() => {
    fetch("/api/mecanicos")
      .then((r) => r.json())
      .then((data: MecanicoOption[]) => setMecanicos(data.filter((m) => (m as unknown as { activo: boolean }).activo !== false)))
      .catch(() => {});
    fetch("/api/puestos")
      .then((r) => r.json())
      .then((data: PuestoOption[]) => setPuestos(data.filter((p) => (p as unknown as { activo: boolean }).activo !== false)))
      .catch(() => {});
  }, []);

  // Búsqueda de vehículo por patente
  useEffect(() => {
    if (!debouncedPatente || debouncedPatente.length < 4 || mode === "edit") return;
    setVehiculoBuscando(true);
    setVehiculoDecision(null);
    setVehiculoEncontrado(null);

    fetch(`/api/vehiculos?patente=${encodeURIComponent(debouncedPatente)}`)
      .then((r) => r.json())
      .then((data: VehiculoData | null) => {
        setVehiculoBuscando(false);
        if (data && data.id) {
          setVehiculoEncontrado(data);
          setVehiculoDecision("pending");
        }
      })
      .catch(() => setVehiculoBuscando(false));
  }, [debouncedPatente, mode]);

  // Búsqueda de cliente por RUT
  useEffect(() => {
    if (!debouncedRut || debouncedRut.length < 5) return;
    setClienteBuscando(true);

    fetch(`/api/clientes?rut=${encodeURIComponent(normalizeRut(debouncedRut))}`)
      .then((r) => r.json())
      .then((data: ClienteData | null) => {
        setClienteBuscando(false);
        if (data && data.id) {
          setClienteEncontrado(data);
          // Auto-rellenar
          setNombreCliente(data.nombre);
          setTelefonoCliente(data.telefono ?? "");
          setCorreoCliente(data.correo ?? "");
          setDireccionCliente(data.direccion ?? "");
          setWhatsappCliente(data.whatsapp ?? "");
          setClienteId(data.id);
        } else {
          setClienteEncontrado(null);
          setClienteId(undefined);
        }
      })
      .catch(() => {
        setClienteBuscando(false);
        setClienteEncontrado(null);
      });
  }, [debouncedRut]);

  const handleMantenerCliente = useCallback(() => {
    if (!vehiculoEncontrado) return;
    setMarca(vehiculoEncontrado.marca);
    setModelo(vehiculoEncontrado.modelo);
    setAnio(String(vehiculoEncontrado.anio));
    setVehiculoId(vehiculoEncontrado.id);
    setVehiculoReadonly(true);
    setVehiculoDecision("mantener");

    if (vehiculoEncontrado.cliente) {
      const c = vehiculoEncontrado.cliente;
      setRutCliente(c.rut);
      setNombreCliente(c.nombre);
      setTelefonoCliente(c.telefono ?? "");
      setCorreoCliente(c.correo ?? "");
      setDireccionCliente(c.direccion ?? "");
      setWhatsappCliente(c.whatsapp ?? "");
      setClienteId(c.id);
      setClienteEncontrado(c);
    }
  }, [vehiculoEncontrado]);

  const handleCambiarCliente = useCallback(() => {
    if (!vehiculoEncontrado) return;
    setMarca(vehiculoEncontrado.marca);
    setModelo(vehiculoEncontrado.modelo);
    setAnio(String(vehiculoEncontrado.anio));
    setVehiculoId(vehiculoEncontrado.id);
    setVehiculoReadonly(true);
    setVehiculoDecision("cambiar");
    // Limpiar datos de cliente para ingresar nuevos
    setRutCliente("");
    setNombreCliente("");
    setTelefonoCliente("");
    setCorreoCliente("");
    setDireccionCliente("");
    setClienteId(undefined);
    setClienteEncontrado(null);
  }, [vehiculoEncontrado]);

  // Foto tablero
  const handleFotoTablero = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoTableroFile(file);
    const url = URL.createObjectURL(file);
    setFotoTableroPreview(url);
  };

  const removeFotoTablero = () => {
    setFotoTableroFile(null);
    setFotoTableroPreview("");
    if (fotoTableroRef.current) fotoTableroRef.current.value = "";
  };

  // Fotos múltiples
  const handleFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const maxNew = 10 - fotosFiles.length - fotosPreviews.filter(p => !p.startsWith("blob:")).length;
    const toAdd = files.slice(0, maxNew);
    setFotosFiles((prev) => [...prev, ...toAdd]);
    const previews = toAdd.map((f) => URL.createObjectURL(f));
    setFotosPreviews((prev) => [...prev, ...previews]);
    if (fotosRef.current) fotosRef.current.value = "";
  };

  const removeFoto = (index: number) => {
    setFotosFiles((prev) => {
      const newFiles = [...prev];
      // index in previews may include existing URLs from edit mode
      const existingUrlCount = initialValues?.fotos_urls?.length ?? 0;
      const fileIndex = index - existingUrlCount;
      if (fileIndex >= 0) newFiles.splice(fileIndex, 1);
      return newFiles;
    });
    setFotosPreviews((prev) => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Error al subir archivo");
    const data = (await res.json()) as { url: string };
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!patente.trim() || !marca.trim() || !modelo.trim() || !anio || !kilometraje) {
      setErrorMsg("Completa los datos del vehículo (patente, marca, modelo, año, km).");
      return;
    }
    if (!rutCliente.trim() || !nombreCliente.trim()) {
      setErrorMsg("RUT y nombre del cliente son obligatorios.");
      return;
    }

    try {
      // Subir foto tablero si hay nueva
      let fotoTableroUrl = fotoTableroPreview && !fotoTableroPreview.startsWith("blob:") ? fotoTableroPreview : "";
      if (fotoTableroFile) {
        fotoTableroUrl = await uploadFile(fotoTableroFile);
      }

      // Subir fotos múltiples (solo los File objects nuevos)
      const existingFotoUrls = (initialValues?.fotos_urls ?? []).filter(
        (u) => !u.startsWith("blob:")
      );
      const newFotoUrls: string[] = [];
      for (const file of fotosFiles) {
        const url = await uploadFile(file);
        newFotoUrls.push(url);
      }

      // Combinar: URLs existentes (edit mode) + nuevas
      const allFotosUrls = [...existingFotoUrls, ...newFotoUrls];

      // Subir foto revisión técnica si hay nueva
      let revTecnicaUrl = revTecnicaPreview && !revTecnicaPreview.startsWith("blob:") ? revTecnicaPreview : "";
      if (revTecnicaFile) {
        revTecnicaUrl = await uploadFile(revTecnicaFile);
      }

      // Subir foto permiso circulación si hay nueva
      let permisoCircUrl = permisoCircPreview && !permisoCircPreview.startsWith("blob:") ? permisoCircPreview : "";
      if (permisoCircFile) {
        permisoCircUrl = await uploadFile(permisoCircFile);
      }

      await onSubmit({
        vehiculo_id: vehiculoId,
        patente: patente.toUpperCase(),
        marca,
        modelo,
        anio,
        kilometraje,
        nivel_bencina: nivelBencina,
        foto_tablero_url: fotoTableroUrl || undefined,
        fotos_urls: allFotosUrls,
        revision_tecnica_url: revTecnicaUrl || undefined,
        revision_tecnica_vencimiento: revTecnicaVencimiento || undefined,
        permiso_circulacion_url: permisoCircUrl || undefined,
        permiso_circulacion_vencimiento: permisoCircVencimiento || undefined,
        cliente_id: clienteId,
        rut_cliente: rutCliente,
        nombre_cliente: nombreCliente,
        telefono_cliente: telefonoCliente,
        correo_cliente: correoCliente,
        direccion_cliente: direccionCliente,
        whatsapp_cliente: whatsappCliente || undefined,
        motivo_ingreso: motivoIngreso || undefined,
        mecanico_id: mecanicoId,
        puesto_id: puestoId,
      });
    } catch {
      setErrorMsg("Error al guardar la recepción. Intenta de nuevo.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Sección 1: Vehículo */}
      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Datos del vehículo
        </h3>

        {/* Patente */}
        <div className="grid gap-1.5">
          <Label htmlFor="patente">Patente *</Label>
          <Input
            id="patente"
            value={patente}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setPatente(val);
              if (!val) {
                setVehiculoEncontrado(null);
                setVehiculoDecision(null);
                setVehiculoReadonly(false);
                setVehiculoId(undefined);
              }
            }}
            placeholder="ABCD12"
            className="uppercase"
            disabled={vehiculoReadonly && mode !== "edit"}
          />
          {vehiculoBuscando && (
            <p className="text-xs text-zinc-400">Buscando vehículo...</p>
          )}
        </div>

        {/* Panel de vehículo encontrado */}
        {vehiculoDecision === "pending" && vehiculoEncontrado && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="size-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Vehículo encontrado</p>
                <p className="text-blue-700">
                  {vehiculoEncontrado.marca} {vehiculoEncontrado.modelo} —{" "}
                  {vehiculoEncontrado.anio}
                </p>
                {vehiculoEncontrado.cliente && (
                  <p className="text-blue-600 mt-1">
                    Cliente actual:{" "}
                    <span className="font-medium">{vehiculoEncontrado.cliente.nombre}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleMantenerCliente}
              >
                Sí, mantener cliente
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCambiarCliente}
              >
                Cambiar cliente
              </Button>
            </div>
          </div>
        )}

        <datalist id="marcas-list">
          {marcasSugeridas.map((m) => <option key={m} value={m} />)}
        </datalist>
        <datalist id="modelos-list">
          {modelosSugeridos.map((m) => <option key={m} value={m} />)}
        </datalist>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="marca">Marca *</Label>
            <Input
              id="marca"
              list="marcas-list"
              value={marca}
              onChange={(e) => setMarca(capitalizeWords(e.target.value))}
              placeholder="Toyota"
              readOnly={vehiculoReadonly && mode !== "edit"}
              className={vehiculoReadonly && mode !== "edit" ? "bg-zinc-50" : ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="modelo">Modelo *</Label>
            <Input
              id="modelo"
              list="modelos-list"
              value={modelo}
              onChange={(e) => setModelo(capitalizeWords(e.target.value))}
              placeholder="Corolla"
              readOnly={vehiculoReadonly && mode !== "edit"}
              className={vehiculoReadonly && mode !== "edit" ? "bg-zinc-50" : ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="anio">Año *</Label>
            <Input
              id="anio"
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="2020"
              min={1900}
              max={new Date().getFullYear() + 1}
              readOnly={vehiculoReadonly && mode !== "edit"}
              className={vehiculoReadonly && mode !== "edit" ? "bg-zinc-50" : ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kilometraje">Kilometraje de ingreso *</Label>
            <Input
              id="kilometraje"
              type="number"
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              placeholder="50000"
              min={0}
            />
          </div>
        </div>

        {/* Nivel bencina */}
        <div className="grid gap-1.5">
          <Label htmlFor="nivel_bencina">Nivel de bencina</Label>
          <select
            id="nivel_bencina"
            value={nivelBencina}
            onChange={(e) => setNivelBencina(e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccionar...</option>
            {NIVEL_BENCINA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Foto tablero */}
        <div className="grid gap-1.5">
          <Label>Foto del tablero</Label>
          {fotoTableroPreview ? (
            <div className="relative inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoTableroPreview}
                alt="Foto tablero"
                className="h-24 w-36 object-cover rounded-lg border border-zinc-200"
              />
              <button
                type="button"
                onClick={removeFotoTablero}
                className="absolute -top-2 -right-2 rounded-full bg-white border border-zinc-300 p-0.5 shadow-sm hover:bg-zinc-50"
              >
                <X className="size-3 text-zinc-600" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                <ImageIcon className="size-4" />
                <span>Seleccionar foto</span>
              </div>
              <input
                ref={fotoTableroRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFotoTablero}
              />
            </label>
          )}
        </div>

        {/* Fotos del vehículo */}
        <div className="grid gap-1.5">
          <Label>
            Fotos del vehículo{" "}
            <span className="text-zinc-400 text-xs">(máx. 10)</span>
          </Label>
          {fotosPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {fotosPreviews.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeFoto(i)}
                    className="absolute -top-2 -right-2 rounded-full bg-white border border-zinc-300 p-0.5 shadow-sm hover:bg-zinc-50"
                  >
                    <X className="size-3 text-zinc-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {fotosPreviews.length < 10 && (
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                <ImageIcon className="size-4" />
                <span>Agregar fotos</span>
              </div>
              <input
                ref={fotosRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleFotos}
              />
            </label>
          )}
        </div>
      </div>

      {/* Sección 1b: Motivo de ingreso */}
      <div className="space-y-2">
        <h3 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Motivo de ingreso
        </h3>
        <textarea
          id="motivo_ingreso"
          value={motivoIngreso}
          onChange={(e) => setMotivoIngreso(e.target.value)}
          placeholder="Ej: El cliente indica ruido en el motor al arrancar, además solicita revisión de frenos..."
          rows={3}
          spellCheck={true}
          autoCorrect="on"
          lang="es"
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Sección 1c: Documentación del vehículo */}
      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Documentación del vehículo
        </h3>

        {/* Revisión Técnica */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">Revisión Técnica</p>
          <div className="grid gap-1.5">
            <Label>Foto</Label>
            {revTecnicaPreview ? (
              <div className="relative inline-flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={revTecnicaPreview}
                  alt="Revisión técnica"
                  className="h-24 w-36 object-cover rounded-lg border border-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRevTecnicaFile(null);
                    setRevTecnicaPreview("");
                    if (revTecnicaRef.current) revTecnicaRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 rounded-full bg-white border border-zinc-300 p-0.5 shadow-sm hover:bg-zinc-50"
                >
                  <X className="size-3 text-zinc-600" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                  <ImageIcon className="size-4" />
                  <span>Seleccionar foto</span>
                </div>
                <input
                  ref={revTecnicaRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setRevTecnicaFile(file);
                    setRevTecnicaPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rev_tecnica_vencimiento">Fecha de vencimiento</Label>
            <div className="flex items-center gap-2">
              <input
                id="rev_tecnica_vencimiento"
                type="date"
                value={revTecnicaVencimiento}
                onChange={(e) => setRevTecnicaVencimiento(e.target.value)}
                className="flex h-8 w-full max-w-[180px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <BadgeDocumento estado={getEstadoDocumento(revTecnicaVencimiento)} />
            </div>
          </div>
        </div>

        {/* Permiso de Circulación */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">Permiso de Circulación</p>
          <div className="grid gap-1.5">
            <Label>Foto</Label>
            {permisoCircPreview ? (
              <div className="relative inline-flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={permisoCircPreview}
                  alt="Permiso de circulación"
                  className="h-24 w-36 object-cover rounded-lg border border-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPermisoCircFile(null);
                    setPermisoCircPreview("");
                    if (permisoCircRef.current) permisoCircRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 rounded-full bg-white border border-zinc-300 p-0.5 shadow-sm hover:bg-zinc-50"
                >
                  <X className="size-3 text-zinc-600" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                  <ImageIcon className="size-4" />
                  <span>Seleccionar foto</span>
                </div>
                <input
                  ref={permisoCircRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPermisoCircFile(file);
                    setPermisoCircPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="permiso_circ_vencimiento">Fecha de vencimiento</Label>
            <div className="flex items-center gap-2">
              <input
                id="permiso_circ_vencimiento"
                type="date"
                value={permisoCircVencimiento}
                onChange={(e) => setPermisoCircVencimiento(e.target.value)}
                className="flex h-8 w-full max-w-[180px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <BadgeDocumento estado={getEstadoDocumento(permisoCircVencimiento)} />
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Cliente */}
      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Datos del cliente
        </h3>

        <div className="grid gap-1.5">
          <Label htmlFor="rut_cliente">RUT *</Label>
          <div className="relative">
            <Input
              id="rut_cliente"
              value={rutCliente}
              onChange={(e) => {
                setRutCliente(e.target.value);
                setClienteEncontrado(null);
                setClienteId(undefined);
              }}
              onBlur={(e) => setRutCliente(formatRut(e.target.value))}
              placeholder="12.345.678-9"
            />
            {clienteBuscando && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                Buscando...
              </span>
            )}
          </div>
          {clienteEncontrado && (
            <p className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle className="size-3" /> Cliente encontrado: actualizando datos
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="nombre_cliente">Nombre *</Label>
            <Input
              id="nombre_cliente"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              placeholder="Juan Pérez"
            />
          </div>
          <div className="grid gap-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="telefono_cliente">Teléfono</Label>
            <Input
              id="telefono_cliente"
              value={telefonoCliente}
              onChange={(e) => setTelefonoCliente(e.target.value)}
              onBlur={(e) => setTelefonoCliente(formatPhone(e.target.value))}
              placeholder="+56 9 1234 5678"
            />
          </div>
          <div className="grid gap-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="correo_cliente">Correo</Label>
            <Input
              id="correo_cliente"
              type="email"
              value={correoCliente}
              onChange={(e) => setCorreoCliente(e.target.value)}
              placeholder="juan@ejemplo.com"
            />
          </div>
          <div className="grid gap-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="direccion_cliente">Dirección</Label>
            <Input
              id="direccion_cliente"
              value={direccionCliente}
              onChange={(e) => setDireccionCliente(e.target.value)}
              placeholder="Av. Principal 123"
            />
          </div>
          <div className="grid gap-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="whatsapp_cliente">WhatsApp</Label>
            <Input
              id="whatsapp_cliente"
              value={whatsappCliente}
              onChange={(e) => setWhatsappCliente(e.target.value)}
              onBlur={(e) => setWhatsappCliente(formatPhone(e.target.value))}
              placeholder="+56 9 1234 5678"
            />
          </div>
        </div>
      </div>

      {/* Sección 3: Asignación */}
      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">
          Asignación
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="mecanico">Mecánico</Label>
            <select
              id="mecanico"
              value={mecanicoId}
              onChange={(e) => setMecanicoId(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Sin asignar</option>
              {mecanicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="puesto">Puesto</Label>
            <select
              id="puesto"
              value={puestoId}
              onChange={(e) => setPuestoId(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Sin asignar</option>
              {puestos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end"
      )}>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Guardando..."
            : mode === "edit"
            ? "Guardar cambios"
            : "Crear recepción"}
        </Button>
      </div>
    </form>
  );
}
