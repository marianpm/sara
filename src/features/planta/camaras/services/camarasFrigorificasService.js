import { supabase } from "../../../../shared/lib/supabaseClient";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchCamarasFrigorificas({ historyHours = 24 } = {}) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tuya-camaras-status?historyHours=${historyHours}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "No se pudieron consultar las cámaras");
  }

  return data;
}

export async function fetchHistorialCamara({ camaraId, historyHours = 24 }) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tuya-camaras-status?modo=historial&camaraId=${camaraId}&historyHours=${historyHours}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "No se pudo consultar el historial");
  }

  return data.historial || [];
}

export async function actualizarParametroCamara({
  usuario,
  camaraId,
  code,
  value,
}) {
  if (!usuario) {
    throw new Error("No se pudo identificar el usuario de SARA.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tuya-camaras-set-property`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usuario,
        camaraId,
        code,
        value,
        confirm: true,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "No se pudo actualizar el parámetro");
  }

  return data;
}

export async function fetchLogsCamarasFrio({
    camaraId = null,
    estado = "",
    limit = 100,
  } = {}) {
    let query = supabase
      .from("logs_camaras_frio")
      .select(
        `
        id,
        created_at,
        camara_numero,
        camara_nombre,
        codigo,
        tipo,
        severidad,
        estado,
        origen,
        usuario,
        descripcion,
        datos,
        resuelto_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (camaraId) {
      query = query.eq("camara_numero", camaraId);
    }

    if (estado) {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "No se pudieron cargar los logs");
    }

    return data || [];
  }

  export async function exportarAuditoriaCamarasFrio({
  mes,
  camaraNumero = null,
}) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaras-frio-exportar-auditoria`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        mes,
        camaraNumero,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo generar la planilla");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || "Temperaturas_Camaras.xlsx";

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export async function imprimirAuditoriaCamarasFrio({
  mes,
  camaraNumero = null,
}) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("El navegador bloqueó la ventana de impresión");
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Preparando impresión...</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        Preparando impresión...
      </body>
    </html>
  `);
  printWindow.document.close();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camaras-frio-imprimir-auditoria`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        mes,
        camaraNumero,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    printWindow.close();
    throw new Error(text || "No se pudo preparar la impresión");
  }

  const html = await response.text();

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}