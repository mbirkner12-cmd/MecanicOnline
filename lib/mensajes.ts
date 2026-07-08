const TIPO_LABELS: Record<string, string> = {
  revision_tecnica: 'Revisión Técnica',
  permiso_circulacion: 'Permiso de Circulación',
  neumaticos: 'Neumáticos',
  aceite_filtros: 'Aceite y Filtros',
  otro: 'Recordatorio de mantención',
};

function formatFechaLegible(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function diasRestantes(fecha: string): number {
  const venc = new Date(fecha);
  const hoy = new Date();
  return Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

interface DatosAlerta {
  clienteNombre: string;
  clienteCorreo: string | null;
  clienteWhatsapp: string | null;
  patente: string;
  marca: string;
  modelo: string;
  tipo: string;
  descripcion: string | null;
  fechaVencimiento: string;
}

function buildMensajeTexto(d: DatosAlerta): string {
  const tipoLabel = TIPO_LABELS[d.tipo] ?? d.tipo;
  const dias = diasRestantes(d.fechaVencimiento);
  const fechaLegible = formatFechaLegible(d.fechaVencimiento);
  const tallerNombre = process.env.TALLER_NOMBRE ?? 'MecanicOnline';

  const descripcionLinea = d.descripcion ? `\n📌 ${d.descripcion}` : '';

  return `Hola ${d.clienteNombre}! 👋

Te contactamos desde *${tallerNombre}* para avisarte que tu vehículo *${d.patente}* (${d.marca} ${d.modelo}) tiene próxima la siguiente mantención:

🔧 *${tipoLabel}*${descripcionLinea}
📅 Vence el: *${fechaLegible}*
⏳ Faltan: *${dias} día${dias !== 1 ? 's' : ''}*

Escríbenos para agendar tu hora y te ayudamos a tenerlo al día. 😊`;
}

function buildEmailHtml(d: DatosAlerta): { subject: string; html: string } {
  const tipoLabel = TIPO_LABELS[d.tipo] ?? d.tipo;
  const dias = diasRestantes(d.fechaVencimiento);
  const fechaLegible = formatFechaLegible(d.fechaVencimiento);
  const tallerNombre = process.env.TALLER_NOMBRE ?? 'MecanicOnline';

  const subject = `${tallerNombre}: Recordatorio de ${tipoLabel} — ${d.patente}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: sans-serif; background:#f4f4f5; margin:0; padding:24px;">
  <div style="max-width:540px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e4e4e7;">
    <div style="background:#18181b; padding:24px 32px;">
      <h1 style="color:#fff; margin:0; font-size:20px;">${tallerNombre}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#52525b; margin:0 0 16px;">Hola <strong>${d.clienteNombre}</strong>,</p>
      <p style="color:#52525b; margin:0 0 24px;">
        Te recordamos que tu vehículo <strong>${d.patente}</strong> (${d.marca} ${d.modelo}) tiene próxima la siguiente mantención:
      </p>
      <div style="background:#f4f4f5; border-radius:8px; padding:20px 24px; margin-bottom:24px;">
        <p style="margin:0 0 8px; font-size:18px; font-weight:700; color:#18181b;">${tipoLabel}</p>
        ${d.descripcion ? `<p style="margin:0 0 8px; color:#52525b;">${d.descripcion}</p>` : ''}
        <p style="margin:0 0 4px; color:#52525b;">📅 Vence el: <strong>${fechaLegible}</strong></p>
        <p style="margin:0; color:#52525b;">⏳ Faltan: <strong style="color:${dias <= 7 ? '#ef4444' : dias <= 30 ? '#f97316' : '#22c55e'}">${dias} día${dias !== 1 ? 's' : ''}</strong></p>
      </div>
      <p style="color:#52525b; margin:0;">Contáctanos para agendar tu revisión.</p>
    </div>
    <div style="padding:16px 32px; border-top:1px solid #e4e4e7; text-align:center;">
      <p style="color:#a1a1aa; font-size:12px; margin:0;">${tallerNombre}</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function enviarWhatsApp(datos: DatosAlerta): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.warn('[mensajes] WhatsApp no configurado (faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');
    return false;
  }

  if (!datos.clienteWhatsapp) {
    console.warn(`[mensajes] Cliente ${datos.clienteNombre} no tiene WhatsApp registrado`);
    return false;
  }

  const to = `whatsapp:${datos.clienteWhatsapp.startsWith('+') ? datos.clienteWhatsapp : `+56${datos.clienteWhatsapp}`}`;
  const body = buildMensajeTexto(datos);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: `whatsapp:${from}`, To: to, Body: body }).toString(),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[mensajes] Error Twilio:', err);
      return false;
    }

    console.log(`[mensajes] WhatsApp enviado a ${to}`);
    return true;
  } catch (err) {
    console.error('[mensajes] Error enviando WhatsApp:', err);
    return false;
  }
}

export async function enviarEmail(datos: DatosAlerta): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM ?? 'recordatorios@mecaniconline.cl';

  if (!apiKey) {
    console.warn('[mensajes] Email no configurado (falta RESEND_API_KEY)');
    return false;
  }

  if (!datos.clienteCorreo) {
    console.warn(`[mensajes] Cliente ${datos.clienteNombre} no tiene correo registrado`);
    return false;
  }

  const { subject, html } = buildEmailHtml(datos);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [datos.clienteCorreo],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[mensajes] Error Resend:', err);
      return false;
    }

    console.log(`[mensajes] Email enviado a ${datos.clienteCorreo}`);
    return true;
  } catch (err) {
    console.error('[mensajes] Error enviando email:', err);
    return false;
  }
}

export type { DatosAlerta };
