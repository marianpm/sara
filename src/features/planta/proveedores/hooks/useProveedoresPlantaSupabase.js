import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../shared/lib/supabaseClient";

export function useProveedoresPlantaSupabase({ enabled = true } = {}) {
  const [proveedores, setProveedores] = useState([]);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState(null);

  const cargarProveedores = useCallback(async () => {
    if (!enabled) return;

    setCargandoProveedores(true);
    setErrorProveedores(null);

    const { data, error } = await supabase
      .from("planta_proveedores")
      .select("*")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    setCargandoProveedores(false);

    if (error) {
      console.error("Error cargando proveedores:", error);
      setErrorProveedores(error.message || "Error cargando proveedores");
      return;
    }

    setProveedores(data || []);
  }, [enabled]);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const crearProveedor = useCallback(async (nombre) => {
    const nombreLimpio = String(nombre || "").trim();

    if (!nombreLimpio) {
      throw new Error("El nombre del proveedor es obligatorio.");
    }

    const { data, error } = await supabase
      .from("planta_proveedores")
      .upsert(
        {
          nombre: nombreLimpio,
          activo: true,
        },
        {
          onConflict: "nombre",
        }
      )
      .select("*")
      .single();

    if (error) {
      console.error("Error creando proveedor:", error);
      throw error;
    }

    setProveedores((prev) => {
      const sinDuplicado = prev.filter((p) => p.id !== data.id);
      return [...sinDuplicado, data].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
    });

    return data;
  }, []);

  return {
    proveedores,
    cargandoProveedores,
    errorProveedores,
    cargarProveedores,
    crearProveedor,
  };
}