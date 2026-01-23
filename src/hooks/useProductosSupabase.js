import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useProductosSupabase() {
  const [productosSupabase, setProductosSupabase] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState(null);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const { data, error } = await supabase
          .from("productos")
          .select("id,nombre,producto_variantes(id,presentacion,precio_minorista,precio_mayorista,activo)")
          .order("nombre", { ascending: true })
          .order("presentacion", { foreignTable: "producto_variantes", ascending: true });

        if (error) {
          console.error("Error cargando productos:", error);
          setErrorProductos(error.message);
        } else {
          setProductosSupabase(data || []);
        }
      } catch (e) {
        console.error("Error inesperado cargando productos:", e);
        setErrorProductos(String(e));
      } finally {
        setCargandoProductos(false);
      }
    };

    cargarProductos();
  }, []);

  return { productosSupabase, cargandoProductos, errorProductos };
}
