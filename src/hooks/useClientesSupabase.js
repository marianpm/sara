// src/hooks/useClientesSupabase.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useClientesSupabase() {
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState(null);

  const recargarClientes = useCallback(async () => {
    try {
      setCargandoClientes(true);
      setErrorClientes(null);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;

      setClientes(data || []);
    } catch (e) {
      console.error("Error cargando clientes:", e);
      setErrorClientes(e.message || String(e));
    } finally {
      setCargandoClientes(false);
    }
  }, []);

  useEffect(() => {
    recargarClientes();
  }, [recargarClientes]);

  return { clientes, cargandoClientes, errorClientes, recargarClientes };
}
