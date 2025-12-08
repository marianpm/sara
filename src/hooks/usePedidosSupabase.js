// src/hooks/usePedidosSupabase.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { registrarLog } from "../logsEventos";

export function usePedidosSupabase({
  clientesSupabase,
  productosSupabase,
  cargandoClientes,
  cargandoProductos,
  usuarioActual,
}) {
  const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [errorPedidos, setErrorPedidos] = useState(null);

  // --- Construir "view model" de pedidos ---
  const construirPedidosVista = useCallback(
    (pedidosRaw, itemsRaw) => {
      return (pedidosRaw || []).map((pr) => {
        const cliente = (clientesSupabase || []).find(
          (c) => c.nombre === pr.cliente_nombre
        );

        const items = (itemsRaw || []).filter((it) => it.pedido_id === pr.id);

        const productosVista = items.map((it) => {
          const prod = (productosSupabase || []).find(
            (p) => p.nombre === it.producto_nombre
          );

          return {
            itemId: it.id,
            productoNombre: it.producto_nombre,
            tipo: prod ? prod.nombre : `Producto ${it.producto_nombre}`,
            cantidad: it.cantidad,
            peso: it.peso_kg, // usado por pedidoEstaPesado
          };
        });

        const notas =
          pr.observaciones ??
          pr.Observaciones ?? // por si la columna quedó con mayúscula
          "";

        return {
          id: pr.id,
          clienteId: pr.cliente_nombre,
          cliente: cliente ? cliente.nombre : `Cliente ${pr.cliente_nombre}`,
          cuit:
            cliente && cliente.numero != null ? String(cliente.numero) : "",
          direccion: cliente?.domicilio ?? "",
          fecha: pr.fecha_solicitada || "",
          tipoEntrega: pr.tipo_entrega,
          estado: pr.estado,
          entregado: pr.estado === "entregado",
          productos: productosVista,
          notas,
          factura: pr.factura === true,
        };
      });
    },
    [clientesSupabase, productosSupabase]
  );

  // --- Carga desde Supabase ---
  const recargarPedidos = useCallback(async () => {
    try {
      setCargandoPedidos(true);
      setErrorPedidos(null);

      const { data: pedidosRaw, error: pedError } = await supabase
        .from("Pedidos")
        .select("*")
        .order("created_at", { ascending: true });

      if (pedError) throw pedError;

      const { data: itemsRaw, error: itemsError } = await supabase
        .from("PedidoItems")
        .select("*");

      if (itemsError) throw itemsError;

      const vista = construirPedidosVista(pedidosRaw || [], itemsRaw || []);
      setPedidos(vista);
    } catch (e) {
      console.error("Error cargando pedidos:", e);
      setErrorPedidos(e.message || String(e));
    } finally {
      setCargandoPedidos(false);
    }
  }, [construirPedidosVista]);

  // Carga inicial (cuando ya tengo catálogos)
  useEffect(() => {
    if (cargandoClientes || cargandoProductos) return;
    recargarPedidos();
  }, [cargandoClientes, cargandoProductos, recargarPedidos]);

  // Suscripción Realtime a cambios en Pedidos / PedidoItems
  useEffect(() => {
    if (cargandoClientes || cargandoProductos) return;

    const channel = supabase
      .channel("pedidos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Pedidos" },
        () => {
          recargarPedidos();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "PedidoItems" },
        () => {
          recargarPedidos();
        }
      )
      .subscribe();

    // cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargandoClientes, cargandoProductos, recargarPedidos]);

  // --- Acciones de negocio / Supabase ---

  const agregarPedidoConfirmado = useCallback(
    async (pedidoAConfirmar) => {
      try {
        const nombreActual = (pedidoAConfirmar.cliente || "")
          .toLowerCase()
          .trim();

        const clienteCoincidente = (clientesSupabase || []).find(
          (c) =>
            c.nombre && c.nombre.toLowerCase().trim() === nombreActual
        );

        if (!clienteCoincidente) {
          alert("El cliente seleccionado ya no existe en la base.");
          return;
        }

        // 1) Insert en Pedidos
        const { data: pedidoInsertado, error: pedError } = await supabase
          .from("Pedidos")
          .insert({
            cliente_nombre: clienteCoincidente.nombre,
            fecha_solicitada: pedidoAConfirmar.fecha || null,
            tipo_entrega: pedidoAConfirmar.tipoEntrega,
            estado: "pendiente_pesaje",
            observaciones: pedidoAConfirmar.notas || null,
            factura: !!pedidoAConfirmar.factura,
          })
          .select("*")
          .single();

        if (pedError) throw pedError;

        // 2) Insert en PedidoItems
        const itemsAInsertar = (pedidoAConfirmar.productos || []).map(
          (prod, index) => {
            const productoRow = (productosSupabase || []).find(
              (p) => p.nombre === prod.tipo
            );
            if (!productoRow) {
              throw new Error(
                `Producto no encontrado en base: ${prod.tipo}`
              );
            }

            return {
              pedido_id: pedidoInsertado.id,
              producto_nombre: productoRow.nombre,
              cantidad: prod.cantidad,
              peso_kg: prod.peso ?? null,
              nro_linea: index + 1,
            };
          }
        );

        const { error: itemsError } = await supabase
          .from("PedidoItems")
          .insert(itemsAInsertar);

        if (itemsError) throw itemsError;

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha cargado un nuevo pedido (ID ${pedidoInsertado.id})`
        );

        await recargarPedidos();
      } catch (e) {
        console.error("Error guardando pedido:", e);
        alert(
          "Error guardando el pedido en la base: " +
            (e.message || String(e))
        );
      }
    },
    [clientesSupabase, productosSupabase, usuarioActual, recargarPedidos]
  );

  const actualizarPesajes = useCallback(
    async (pedidoSeleccionado, nuevosPesos) => {
      if (!pedidoSeleccionado) return;

      try {
        const productos = pedidoSeleccionado.productos || [];

        // Actualizar cada item
        for (let i = 0; i < productos.length; i++) {
          const prod = productos[i];
          const nuevoPeso = nuevosPesos[i];

          const { error } = await supabase
            .from("PedidoItems")
            .update({ peso_kg: nuevoPeso })
            .eq("id", prod.itemId);

          if (error) throw error;
        }

        // Si todos tienen peso → pendiente_entrega
        const todosPesados = (nuevosPesos || []).every((p) => p != null);
        if (todosPesados) {
          const { error: pedError } = await supabase
            .from("Pedidos")
            .update({ estado: "pendiente_entrega" })
            .eq("id", pedidoSeleccionado.id);

          if (pedError) throw pedError;
        }

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha modificado el pesaje del pedido: (ID ${pedidoSeleccionado.id})`
        );

        await recargarPedidos();
      } catch (e) {
        console.error("Error guardando pesajes:", e);
        alert(
          "Error guardando los pesajes en la base: " +
            (e.message || String(e))
        );
      }
    },
    [usuarioActual, recargarPedidos]
  );

  const marcarEntregadoPedido = useCallback(
    async (pedido) => {
      if (!pedido) return;

      try {
        const { error } = await supabase
          .from("Pedidos")
          .update({ estado: "entregado" })
          .eq("id", pedido.id);

        if (error) throw error;

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha marcado el pedido: (ID ${pedido.id}) como entregado`
        );

        await recargarPedidos();
      } catch (e) {
        console.error("Error marcando entregado:", e);
        alert(
          "Error actualizando el estado del pedido en la base: " +
            (e.message || String(e))
        );
      }
    },
    [usuarioActual, recargarPedidos]
  );

  const eliminarPedido = useCallback(
    async (pedido) => {
      if (!pedido) return;

      try {
        const { error } = await supabase
          .from("Pedidos")
          .delete()
          .eq("id", pedido.id);

        if (error) throw error;

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha eliminado el pedido: (ID ${pedido.id})`
        );

        await recargarPedidos();
      } catch (e) {
        console.error("Error eliminando pedido:", e);
        alert(
          "Error eliminando el pedido en la base: " +
            (e.message || String(e))
        );
      }
    },
    [usuarioActual, recargarPedidos]
  );

  return {
    pedidos,
    cargandoPedidos,
    errorPedidos,
    recargarPedidos,
    agregarPedidoConfirmado,
    actualizarPesajes,
    marcarEntregadoPedido,
    eliminarPedido,
  };
}
