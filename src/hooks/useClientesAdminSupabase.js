// src/hooks/useClientesAdminSupabase.js
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const LIMITE_CLIENTES = 80;

const resumenInicial = {
  total: 0,
  conPedidosUltimos30Dias: 0,
  sinPedidosUltimos30Dias: 0,
  cargando: false,
  error: null,
};

const fechaHaceDiasISO = (dias) => {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
};

const limpiarBusqueda = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/[,()]/g, " ");
};

export function useClientesAdminSupabase() {
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [errorClientes, setErrorClientes] = useState(null);
  const [modoListado, setModoListado] = useState("vacio");
  const [resumenClientes, setResumenClientes] = useState(resumenInicial);

  const aplicarFiltros = (query, { estado = "todos", tipo = "todos" } = {}) => {
    let q = query;

    if (estado !== "todos") {
      q = q.eq("estado_aprobacion", estado);
    }

    if (tipo !== "todos") {
      q = q.eq("tipo", tipo);
    }

    return q
      .order("razon_social", { ascending: true, nullsFirst: false })
      .order("nombre_fantasia", { ascending: true, nullsFirst: false })
      .limit(LIMITE_CLIENTES);
  };

  const cargarResumenClientes = useCallback(async () => {
    try {
      setResumenClientes((prev) => ({
        ...prev,
        cargando: true,
        error: null,
      }));

      const desde = fechaHaceDiasISO(30);

      const { count: totalClientes, error: totalError } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      let queryPedidos = supabase
        .from("pedidos")
        .select("cliente_id")
        .gte("fecha_solicitada", desde)
        .not("cliente_id", "is", null)
        .limit(5000);

      const { data: pedidos, error: pedidosError } = await queryPedidos;

      if (pedidosError) throw pedidosError;

      const clientesConPedidos = new Set(
        (pedidos ?? [])
          .map((pedido) => pedido.cliente_id)
          .filter(Boolean)
          .map(String)
      );

      const total = totalClientes ?? 0;
      const conPedidosUltimos30Dias = clientesConPedidos.size;

      setResumenClientes({
        total,
        conPedidosUltimos30Dias,
        sinPedidosUltimos30Dias: Math.max(total - conPedidosUltimos30Dias, 0),
        cargando: false,
        error: null,
      });
    } catch (error) {
      console.error("Error cargando resumen de clientes:", error);

      setResumenClientes((prev) => ({
        ...prev,
        cargando: false,
        error: error.message || String(error),
      }));
    }
  }, []);

  const buscarClientes = useCallback(
    async ({
      texto = "",
      numeroCliente = "",
      estado = "todos",
      tipo = "todos",
    } = {}) => {
      const busqueda = limpiarBusqueda(texto);

      const idClienteBuscado = String(numeroCliente ?? "")
        .replace(/\D/g, "")
        .trim();

      if (!idClienteBuscado && busqueda.length < 2) {
        setClientes([]);
        setErrorClientes(null);
        setModoListado("vacio");
        return;
      }

      try {
        setCargandoClientes(true);
        setErrorClientes(null);
        setModoListado("busqueda");

        let query = supabase.from("clientes").select("*");

        if (idClienteBuscado) {
          query = query.eq("id", Number(idClienteBuscado));
        } else {
          const filtroTexto = [
            `razon_social.ilike.%${busqueda}%`,
            `nombre_fantasia.ilike.%${busqueda}%`,
            `numero_impositivo.ilike.%${busqueda}%`,
            `telefono.ilike.%${busqueda}%`,
            `email.ilike.%${busqueda}%`,
            `domicilio_entrega.ilike.%${busqueda}%`,
          ].join(",");

          query = query.or(filtroTexto);
        }

        query = aplicarFiltros(query, { estado, tipo });

        const { data, error } = await query;

        if (error) throw error;

        setClientes(data ?? []);
      } catch (error) {
        console.error("Error buscando clientes:", error);
        setErrorClientes(error.message || String(error));
        setClientes([]);
      } finally {
        setCargandoClientes(false);
      }
    },
    []
  );

  const cargarClientesConPedidosUltimos30Dias = useCallback(
    async ({ numeroCliente = "", estado = "todos", tipo = "todos" } = {}) => {
      try {
        setCargandoClientes(true);
        setErrorClientes(null);
        setModoListado("ultimos30");

        const desde = fechaHaceDiasISO(30);

        const idClienteBuscado = String(numeroCliente ?? "")
          .replace(/\D/g, "")
          .trim();

        let queryPedidos = supabase
          .from("pedidos")
          .select("cliente_id")
          .gte("fecha_solicitada", desde)
          .not("cliente_id", "is", null)
          .limit(5000);

        if (idClienteBuscado) {
          queryPedidos = queryPedidos.eq("cliente_id", Number(idClienteBuscado));
        }

        const { data: pedidos, error: pedidosError } = await queryPedidos;

        if (pedidosError) throw pedidosError;

        const clienteIds = [
          ...new Set(
            (pedidos ?? [])
              .map((pedido) => pedido.cliente_id)
              .filter(Boolean)
          ),
        ];

        if (clienteIds.length === 0) {
          setClientes([]);
          return;
        }

        let query = supabase
          .from("clientes")
          .select("*")
          .in("id", clienteIds);

        query = aplicarFiltros(query, { estado, tipo });

        const { data, error } = await query;

        if (error) throw error;

        setClientes(data ?? []);
      } catch (error) {
        console.error("Error cargando clientes recientes:", error);
        setErrorClientes(error.message || String(error));
        setClientes([]);
      } finally {
        setCargandoClientes(false);
      }
    },
    []
  );

  const limpiarClientes = useCallback(() => {
    setClientes([]);
    setErrorClientes(null);
    setModoListado("vacio");
  }, []);

  const reemplazarCliente = useCallback((clienteActualizado) => {
    setClientes((prev) =>
      prev.map((cliente) =>
        cliente.id === clienteActualizado.id ? clienteActualizado : cliente
      )
    );
  }, []);

  useEffect(() => {
    cargarResumenClientes();
  }, [cargarResumenClientes]);

  return {
    clientes,
    cargandoClientes,
    errorClientes,
    modoListado,
    resumenClientes,
    buscarClientes,
    cargarClientesConPedidosUltimos30Dias,
    limpiarClientes,
    reemplazarCliente,
    cargarResumenClientes,
  };
}