"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, QrCode, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QRPage() {
  const [url, setUrl] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/historial`);
  }, []);

  function descargarSVG() {
    const svg = printRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qr-historial-taller.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function imprimir() {
    const svg = printRef.current?.querySelector("svg");
    if (!svg) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Historial Taller</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: white; font-family: system-ui, sans-serif; }
            .card { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px; border: 2px solid #e4e4e7; border-radius: 16px; max-width: 320px; }
            h2 { font-size: 18px; font-weight: 700; color: #18181b; text-align: center; }
            p { font-size: 13px; color: #71717a; text-align: center; line-height: 1.5; }
            .url { font-size: 11px; color: #a1a1aa; word-break: break-all; text-align: center; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Consultá el historial<br/>de tu vehículo</h2>
            ${svg.outerHTML}
            <p>Escaneá el código QR e ingresá la patente de tu vehículo para ver los trabajos realizados.</p>
            <p class="url">${url}</p>
          </div>
          <script>window.print(); window.close();<\/script>
        </body>
      </html>
    `);
    w.document.close();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Código QR del taller</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Imprimí este QR y entregalo a tus clientes para que consulten el historial de su vehículo.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QR preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Código QR
            </CardTitle>
            <CardDescription>Vincula a la página pública de historial</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div ref={printRef} className="p-4 bg-white rounded-xl border border-zinc-100">
              {url && (
                <QRCodeSVG
                  value={url}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>
            <p className="text-xs text-zinc-400 text-center break-all">{url}</p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={descargarSVG}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Descargar SVG
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={imprimir}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">1</span>
              <p>El cliente escanea el código QR con la cámara de su celular.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">2</span>
              <p>Ingresa la patente de su vehículo en la página que se abre.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-medium">3</span>
              <p>Ve el historial completo de trabajos realizados: diagnóstico e insumos utilizados.</p>
            </div>
            <div className="pt-2 border-t border-zinc-100">
              <a
                href="/historial"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver la página del cliente
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
