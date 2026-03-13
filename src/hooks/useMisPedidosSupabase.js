import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const normalizarTexto = (valor) =>
  String(valor ?? "").trim().toLowerCase();

export function useMisPedidosSupabase({ usuarioActual, clientesSupabase }) {
  const [pedidosHistorial, setPedidosHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState(null);

  const recargarHistorial = useCallback(async () => {
    try {
      setCargandoHistorial(true);
      setErrorHistorial(null);

      if (usuarioActual?.rol === "Operario") {
        setPedidosHistorial([]);
        return;
      }

      const { data: pedidosRaw, error: pedError } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false });

      if (pedError) throw pedError;

      const identificadoresUsuario = [
        usuarioActual?.nombre,
        usuarioActual?.usuario,
      ]
        .map(normalizarTexto)
        .filter(Boolean);

      let pedidosVisibles = pedidosRaw || [];

      if (usuarioActual?.rol === "Corredor") {
        pedidosVisibles = pedidosVisibles.filter((p) =>
          identificadoresUsuario.includes(
            normalizarTexto(p.creado_por_usuario_nombre)
          )
        );
      }

      if (pedidosVisibles.length === 0) {
        setPedidosHistorial([]);
        return;
      }

      const idsPedidos = pedidosVisibles.map((p) => p.id);

      const { data: itemsRaw, error: itemsError } = await supabase
        .from("pedidoItems")
        .select("*")
        .in("pedido_id", idsPedidos)
        .order("nro_linea", { ascending: true });

      if (itemsError) throw itemsError;

      const itemsPorPedido = {};
      (itemsRaw || []).forEach((it) => {
        if (!itemsPorPedido[it.pedido_id]) {
          itemsPorPedido[it.pedido_id] = [];
        }

        itemsPorPedido[it.pedido_id].push({
          itemId: it.id,
          productoNombre: it.producto_nombre,
          presentacion: it.presentacion,
          cantidad: it.cantidad,
          precioPorKg: it.precio_kg_aplicado,
          peso: it.peso_kg,
        });
      });

      const vista = pedidosVisibles.map((pr) => {
      const cliente = (clientesSupabase || []).find(
        (c) =>
          normalizarTexto(c.razon_social) === normalizarTexto(pr.cliente_nombre)
      );

      return {
        id: pr.id,
        cliente: pr.cliente_nombre,
        fecha: pr.fecha_solicitada || "",
        fechaCreacion: pr.created_at ? String(pr.created_at).slice(0, 10) : "",
        tipoEntrega: pr.tipo_entrega,
        estado: pr.estado,
        estado_aprobacion: pr.estado_aprobacion,
        tipo_factura: pr.tipo_factura,
        tipoPrecio: pr.tipo_precio,
        marca: pr.marca,
        creadoPor: pr.creado_por_usuario_nombre || "",
        notas: pr.observaciones ?? pr.Observaciones ?? "",
        direccion_entrega: cliente?.domicilio_entrega ?? "",
        productos: itemsPorPedido[pr.id] || [],
      };
    });

      setPedidosHistorial(vista);
    } catch (e) {
      console.error("Error cargando historial de pedidos:", e);
      setErrorHistorial(e.message || String(e));
    } finally {
      setCargandoHistorial(false);
    }
  }, [usuarioActual?.rol, usuarioActual?.nombre, usuarioActual?.usuario, clientesSupabase,]);

  useEffect(() => {
    recargarHistorial();
  }, [recargarHistorial]);

  useEffect(() => {
    if (usuarioActual?.rol === "Operario") return;

    const channel = supabase
      .channel("mis-pedidos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          recargarHistorial();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidoItems" },
        () => {
          recargarHistorial();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usuarioActual?.rol, recargarHistorial]);

  return {
    pedidosHistorial,
    cargandoHistorial,
    errorHistorial,
    recargarHistorial,
  };
}