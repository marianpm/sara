import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useProductosSupabase() {
  const [productosSupabase, setProductosSupabase] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(null);

  const cargarProductos = useCallback(async () => {
    setCargandoProductos(true);
    setErrorProductos(null);

    try {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          id,
          nombre,
          categoria,
          activo,
          created_at,
          producto_variantes (
            id,
            producto_id,
            presentacion,
            precio_minorista,
            precio_mayorista,
            activo
          )
        `)
        .order("id", { ascending: true })
        .order("presentacion", {
          foreignTable: "producto_variantes",
          ascending: true,
        });

      if (error) {
        console.error("Error cargando productos:", error);
        setErrorProductos(error.message);
        setProductosSupabase([]);
        return;
      }

      setProductosSupabase(data || []);
    } catch (e) {
      console.error("Error inesperado cargando productos:", e);
      setErrorProductos(String(e));
      setProductosSupabase([]);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  return {
    productosSupabase,
    cargandoProductos,
    errorProductos,
    recargarProductos: cargarProductos,
  };
}