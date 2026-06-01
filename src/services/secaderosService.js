import { supabase } from "../supabaseClient";
import { registrarLog } from "../logsEventos";

function usuarioParaDb(usuarioActual) {
  return usuarioActual?.usuario ?? null;
}

function nombreUsuario(usuarioActual) {
  return usuarioActual?.usuario ?? usuarioActual?.nombre ?? "Usuario";
}

function formatearLineaParaLog(linea) {
  const bodega = linea?.secadero?.nombre || linea?.secadero_nombre || "Bodega";
  const codigo = linea?.codigo || `Línea ${linea?.numero ?? ""}`;
  return `${bodega} - ${codigo}`;
}

export async function listarSecaderos() {
  const { data: secaderos, error: secaderosError } = await supabase
    .from("secaderos")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (secaderosError) throw secaderosError;

  const { data: lineas, error: lineasError } = await supabase
    .from("secadero_lineas")
    .select("*")
    .eq("activa", true)
    .order("orden", { ascending: true });

  if (lineasError) throw lineasError;

  const lineaIds = (lineas || []).map((linea) => linea.id);

  const ocupacionesPromise = lineaIds.length
    ? supabase
        .from("secadero_ocupaciones")
        .select("*")
        .eq("estado", "ocupada")
        .in("linea_id", lineaIds)
    : Promise.resolve({ data: [], error: null });

  const { data: ocupaciones, error: ocupacionesError } =
    await ocupacionesPromise;

  if (ocupacionesError) throw ocupacionesError;

  const ocupacionesPorLinea = new Map(
    (ocupaciones || []).map((ocupacion) => [ocupacion.linea_id, ocupacion])
  );

  return (secaderos || []).map((secadero) => ({
    ...secadero,
    lineas: (lineas || [])
      .filter((linea) => linea.secadero_id === secadero.id)
      .map((linea) => ({
        ...linea,
        secadero,
        ocupacionActiva: ocupacionesPorLinea.get(linea.id) || null,
      })),
  }));
}

export async function listarHistorialSecaderos() {
  const { data: ocupaciones, error: ocupacionesError } = await supabase
    .from("secadero_ocupaciones")
    .select("*")
    .neq("estado", "ocupada")
    .order("fecha_salida", { ascending: false, nullsFirst: false })
    .limit(150);

  if (ocupacionesError) throw ocupacionesError;

  const lineaIds = Array.from(
    new Set((ocupaciones || []).map((o) => o.linea_id).filter(Boolean))
  );

  if (lineaIds.length === 0) return [];

  const { data: lineas, error: lineasError } = await supabase
    .from("secadero_lineas")
    .select("*, secadero:secaderos(*)")
    .in("id", lineaIds);

  if (lineasError) throw lineasError;

  const lineasPorId = new Map((lineas || []).map((linea) => [linea.id, linea]));

  return (ocupaciones || []).map((ocupacion) => ({
    ...ocupacion,
    linea: lineasPorId.get(ocupacion.linea_id) || null,
  }));
}

export async function cargarLineaSecadero({
  linea,
  lote,
  fechaIngreso,
  observacionesIngreso,
  usuarioActual,
}) {
  const loteNormalizado = String(lote || "").trim();

  if (!linea?.id) {
    throw new Error("No se encontró la línea seleccionada.");
  }

  if (!loteNormalizado) {
    throw new Error("El lote es obligatorio.");
  }

  if (!fechaIngreso) {
    throw new Error("La fecha de ingreso es obligatoria.");
  }

  const { data, error } = await supabase
    .from("secadero_ocupaciones")
    .insert({
      linea_id: linea.id,
      lote: loteNormalizado,
      fecha_ingreso: fechaIngreso,
      observaciones_ingreso:
        String(observacionesIngreso || "").trim().length > 0
          ? String(observacionesIngreso).trim()
          : null,
      estado: "ocupada",
      creado_por_usuario_nombre: usuarioParaDb(usuarioActual),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Esta línea ya tiene una ocupación activa.");
    }

    throw error;
  }

  registrarLog(
    usuarioActual,
    `${nombreUsuario(usuarioActual)} cargó ${formatearLineaParaLog(
      linea
    )} con lote ${loteNormalizado}, fecha ingreso ${fechaIngreso}.`
  );

  return data;
}

export async function liberarLineaSecadero({
  linea,
  ocupacion,
  fechaSalida,
  cantidadPodridos,
  observacionesSalida,
  usuarioActual,
}) {
  if (!linea?.id || !ocupacion?.id) {
    throw new Error("No se encontró la ocupación seleccionada.");
  }

  if (!fechaSalida) {
    throw new Error("La fecha de salida es obligatoria.");
  }

  const cantidadPodridosNormalizada =
    cantidadPodridos === "" || cantidadPodridos == null
      ? null
      : Number(cantidadPodridos);

  if (
    cantidadPodridosNormalizada != null &&
    (!Number.isFinite(cantidadPodridosNormalizada) ||
      cantidadPodridosNormalizada < 0)
  ) {
    throw new Error("La cantidad de podridos no es válida.");
  }

  const { data, error } = await supabase
    .from("secadero_ocupaciones")
    .update({
      fecha_salida: fechaSalida,
      cantidad_podridos: cantidadPodridosNormalizada,
      observaciones_salida:
        String(observacionesSalida || "").trim().length > 0
          ? String(observacionesSalida).trim()
          : null,
      estado: "liberada",
      liberado_por_usuario_nombre: usuarioParaDb(usuarioActual),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ocupacion.id)
    .eq("estado", "ocupada")
    .select("*")
    .single();

  if (error) throw error;

  registrarLog(
    usuarioActual,
    `${nombreUsuario(usuarioActual)} liberó ${formatearLineaParaLog(
      linea
    )}, lote ${ocupacion.lote}, fecha salida ${fechaSalida}${
      cantidadPodridosNormalizada != null
        ? `, podridos ${cantidadPodridosNormalizada}`
        : ""
    }.`
  );

  return data;
}