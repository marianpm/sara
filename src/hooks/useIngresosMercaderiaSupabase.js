import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { registrarLog } from "../logsEventos";

function armarDetalleMercaderia(payload) {
  const partes = [];

  if (payload.patas_cantidad || payload.patas_peso_kg) {
    partes.push(
      `patas: ${payload.patas_cantidad || 0} un. / ${payload.patas_peso_kg || 0} kg`
    );
  }

  if (payload.unto_peso_kg) {
    partes.push(`unto: ${payload.unto_peso_kg} kg`);
  }

  if (payload.carne_peso_kg) {
    partes.push(`carne: ${payload.carne_peso_kg} kg`);
  }

  return partes.length > 0 ? partes.join(", ") : "sin detalle";
}

export function useIngresosMercaderiaSupabase({
  enabled = true,
  usuarioActual,
} = {}) {
  const [ingresos, setIngresos] = useState([]);
  const [cargandoIngresos, setCargandoIngresos] = useState(false);
  const [errorIngresos, setErrorIngresos] = useState(null);

  const cargarIngresos = useCallback(async () => {
    if (!enabled) return;

    setCargandoIngresos(true);
    setErrorIngresos(null);

    const { data, error } = await supabase
      .from("planta_ingresos_mercaderia")
      .select(`
        *,
        proveedor:planta_proveedores (
          id,
          nombre,
          cuit,
          activo
        )
      `)
      .order("fecha_ingreso", { ascending: false })
      .order("created_at", { ascending: false });

    setCargandoIngresos(false);

    if (error) {
      console.error("Error cargando ingresos de mercadería:", error);
      setErrorIngresos(error.message || "Error cargando ingresos");
      return;
    }

    setIngresos(data || []);
  }, [enabled]);

  useEffect(() => {
    cargarIngresos();
  }, [cargarIngresos]);

  const agregarIngresoMercaderia = useCallback(
    async (payload) => {
      setErrorIngresos(null);

      const usuarioNombre =
        usuarioActual?.usuario || payload.usuario || null;

      const { data, error } = await supabase
        .from("planta_ingresos_mercaderia")
        .insert({
          fecha_ingreso: payload.fecha_ingreso,

          proveedor_id: payload.proveedor_id,
          proveedor_nombre_snapshot: payload.proveedor_nombre_snapshot,

          patas_cantidad: payload.patas_cantidad,
          patas_peso_kg: payload.patas_peso_kg,

          unto_peso_kg: payload.unto_peso_kg,
          carne_peso_kg: payload.carne_peso_kg,

          observaciones: payload.observaciones || null,
          usuario: usuarioNombre,
        })
        .select(`
          *,
          proveedor:planta_proveedores (
            id,
            nombre,
            cuit,
            activo
          )
        `)
        .single();

      if (error) {
        console.error("Error registrando ingreso de mercadería:", error);
        setErrorIngresos(error.message || "Error registrando ingreso");
        throw error;
      }

      setIngresos((prev) => [data, ...prev]);

      const detalleMercaderia = armarDetalleMercaderia(payload);

      registrarLog(
        usuarioActual || { usuario: usuarioNombre || "Sistema" },
        `Registró ingreso de mercadería. Proveedor: ${payload.proveedor_nombre_snapshot}. Fecha: ${payload.fecha_ingreso}. Detalle: ${detalleMercaderia}.`
      );

      return data;
    },
    [usuarioActual]
  );

  return {
    ingresos,
    cargandoIngresos,
    errorIngresos,
    cargarIngresos,
    agregarIngresoMercaderia,
  };
}