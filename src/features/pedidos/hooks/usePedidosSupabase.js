// src/features/pedidos/hooks/usePedidosSupabase.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../shared/lib/supabaseClient";
import { registrarLog } from "../../../shared/services/logsEventos";

async function notificarPedidoPendienteAprobacion({
  pedidoId,
  clienteNombre,
  fechaSolicitada,
}) {
  if (!pedidoId) {
    console.warn("No se notificó WhatsApp: falta pedidoId");
    return;
  }

  const { data, error } = await supabase.functions.invoke(
    "whatsapp-alerta-pedido-aprobacion",
    {
      body: {
        pedido_id: pedidoId,
        cliente_nombre: clienteNombre || "Cliente sin nombre",
        fecha_solicitada: fechaSolicitada || "-",
      },
    }
  );

  if (error) {
    console.error("Error invocando alerta WhatsApp:", error);
    return;
  }

  if (data?.ok === false) {
    console.error("WhatsApp respondió con error:", data);
  }
}

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
  const [pedidosPendientesAprobacion, setPedidosPendientesAprobacion] = useState([]);

  // --- Construir "view model" de pedidos ---
  const construirPedidosVista = useCallback((pedidosRaw, itemsRaw) => {
    return (pedidosRaw || []).map((pr) => {
      const clienteRegistro = pr.clienteRegistro || null;

      const items = (itemsRaw || []).filter((it) => it.pedido_id === pr.id);

      const productosVista = items.map((it) => {
        return {
          itemId: it.id,
          productoNombre: it.producto_nombre,
          cantidad: it.cantidad,
          cantidadPesada:
            it.cantidad_pesada != null
              ? it.cantidad_pesada
              : it.peso_kg != null
                ? it.cantidad
                : 0,
          precioPorKg: it.precio_kg_aplicado,
          peso: it.peso_kg,
          presentacion: it.presentacion,
        };
      });

      const notas = pr.observaciones ?? "";

      return {
        id: pr.id,

        clienteRegistro,

        cliente_id: pr.cliente_id,
        clienteId: pr.cliente_id,
        cliente:
          clienteRegistro?.razon_social ||
          clienteRegistro?.nombre_fantasia ||
          `${clienteRegistro?.id_impositiva ?? ""} ${clienteRegistro?.numero_impositivo ?? ""}`.trim() ||
          `Cliente ${pr.cliente_id}`,
        nombre_fantasia: clienteRegistro?.nombre_fantasia || "",

        id_impositiva: clienteRegistro?.id_impositiva || "",
        numero_impositivo:
          clienteRegistro?.numero_impositivo != null
            ? String(clienteRegistro.numero_impositivo)
            : "",

        direccion_entrega:
          pr.domicilio_entrega ?? clienteRegistro?.domicilio_entrega ?? "",
        direccion_entrega_lat: pr.domicilio_entrega_lat ?? null,
        direccion_entrega_lng: pr.domicilio_entrega_lng ?? null,

        fecha: pr.fecha_solicitada || "",
        tipoEntrega: pr.tipo_entrega,
        estado: pr.estado,
        entregado: pr.estado === "entregado",

        productos: productosVista,
        notas,

        tipo_factura: pr.tipo_factura,
        factura_estado: pr.factura_estado,
        tipoPrecio: pr.tipo_precio,
        marca: pr.marca,

        precio_total: pr.precio_total,
      };
    });
  }, []);

  // --- Carga desde Supabase ---
  const recargarPedidos = useCallback(async () => {
    try {
      setCargandoPedidos(true);
      setErrorPedidos(null);

      // Pedidos aprobados (los que ya usa Pesajes / Entregas)
      const { data: pedidosRaw, error: pedError } = await supabase
        .from("pedidos")
        .select("*, clienteRegistro:clientes!pedidos_cliente_id_fkey(*)")
        .eq("estado_aprobacion", "Aprobado")
        .order("created_at", { ascending: true });

      if (pedError) throw pedError;

      // Pedidos pendientes de aprobación (solo para alertas / aviso)
      const { data: pedidosPendientesRaw, error: pendientesError } = await supabase
        .from("pedidos")
        .select("id, cliente_id, fecha_solicitada, estado, estado_aprobacion, clienteRegistro:clientes!pedidos_cliente_id_fkey(*)")
        .eq("estado_aprobacion", "Pendiente")
        .order("created_at", { ascending: true });

      if (pendientesError) throw pendientesError;

      const { data: itemsRaw, error: itemsError } = await supabase
        .from("pedidoItems")
        .select("*");

      if (itemsError) throw itemsError;

      const vista = construirPedidosVista(pedidosRaw || [], itemsRaw || []);
      setPedidos(vista);

      // Vista mínima para poder filtrarlos por fecha en el panel
      const pendientesVista = (pedidosPendientesRaw || []).map((pr) => ({
        id: pr.id,
        cliente_id: pr.cliente_id,
        clienteId: pr.cliente_id,
        fecha: pr.fecha_solicitada || "",
        estado: pr.estado,
        estado_aprobacion: pr.estado_aprobacion,
        cliente:
          pr.clienteRegistro?.razon_social ||
          pr.clienteRegistro?.nombre_fantasia ||
          `${pr.clienteRegistro?.id_impositiva ?? ""} ${pr.clienteRegistro?.numero_impositivo ?? ""}`.trim() ||
          `Cliente ${pr.cliente_id}`,
        clienteRegistro: pr.clienteRegistro || null,
      }));

      setPedidosPendientesAprobacion(pendientesVista);
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
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          recargarPedidos();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidoItems" },
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

        const estado_aprobacion_pedido = (usuarioActual?.rol === "Admin" ? "Aprobado" : "Pendiente");

        const clienteCoincidente = (clientesSupabase || []).find(
          (c) => String(c.id) === String(pedidoAConfirmar.cliente_id)
        );

        if (!clienteCoincidente) {
          alert("El cliente seleccionado ya no existe en la base.");
          return;
        }

        // 1) Insert en Pedidos
        const { data: pedidoInsertado, error: pedError } = await supabase
          .from("pedidos")
          .insert({
            cliente_id: clienteCoincidente.id,
            fecha_solicitada: pedidoAConfirmar.fecha || null,
            tipo_entrega: pedidoAConfirmar.tipoEntrega,
            estado: "pendiente_pesaje",
            estado_aprobacion: estado_aprobacion_pedido,
            observaciones: pedidoAConfirmar.notas || null,
            tipo_factura: pedidoAConfirmar.tipo_factura,
            tipo_precio: pedidoAConfirmar.tipoPrecio,
            creado_por_usuario_nombre: usuarioActual?.nombre ?? usuarioActual?.usuario ?? null,
            marca: pedidoAConfirmar.marca,
            domicilio_entrega:
              pedidoAConfirmar.tipoEntrega === "Envio"
                ? pedidoAConfirmar.direccion_entrega || null
                : null,
            domicilio_entrega_lat: pedidoAConfirmar.tipoEntrega === "Envio" ? pedidoAConfirmar.direccion_entrega_lat : null,
            domicilio_entrega_lng: pedidoAConfirmar.tipoEntrega === "Envio" ? pedidoAConfirmar.direccion_entrega_lng : null,
          })
          .select("*")
          .single();

        if (pedError) throw pedError;

        // 2) Insert en PedidoItems
        const itemsAInsertar = (pedidoAConfirmar.productos || []).map(
          (prod, index) => {
            const productoRow = (productosSupabase || []).find(
              (p) => p.nombre === prod.productoNombre
            );
            if (!productoRow) {
              throw new Error(
                `Producto no encontrado en base: ${prod.productoNombre}`
              );
            }

            return {
              pedido_id: pedidoInsertado.id,
              producto_variante_id: prod.productoVarianteId,
              producto_nombre: productoRow.nombre,
              presentacion: prod.presentacion,
              cantidad: prod.cantidad,
              cantidad_pesada: prod.peso != null ? prod.cantidad : 0,
              peso_kg: prod.peso ?? null,
              nro_linea: index + 1,
              precio_especial:
                pedidoAConfirmar.tipoPrecio === "Especial"
                  ? prod.precioEspecial ?? null
                  : null,
            };
          }
        );

        const { error: itemsError } = await supabase
          .from("pedidoItems")
          .insert(itemsAInsertar);

        if (itemsError) throw itemsError;

        if (estado_aprobacion_pedido === "Pendiente") {
          notificarPedidoPendienteAprobacion({
            pedidoId: pedidoInsertado.id,
            clienteNombre:
              clienteCoincidente.razon_social ||
              clienteCoincidente.nombre_fantasia ||
              `${clienteCoincidente.id_impositiva ?? ""} ${clienteCoincidente.numero_impositivo ?? ""}`.trim() ||
              `Cliente ${clienteCoincidente.id}`,
            fechaSolicitada: pedidoInsertado.fecha_solicitada,
          }).catch((error) => {
            console.error(
              "El pedido se creó, pero falló la notificación WhatsApp:",
              error
            );
          });
        }

        const nombreClienteLog =
          clienteCoincidente.razon_social ||
          clienteCoincidente.nombre_fantasia ||
          `${clienteCoincidente.id_impositiva ?? ""} ${clienteCoincidente.numero_impositivo ?? ""}`.trim() ||
          `Cliente ${clienteCoincidente.id}`;

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha cargado un nuevo pedido (ID ${pedidoInsertado.id}) para el cliente: ${nombreClienteLog}`
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
    async (pedidoSeleccionado, nuevosPesos, nuevasCantidadesPesadas = []) => {
      if (!pedidoSeleccionado) return;

      try {
        const productos = pedidoSeleccionado.productos || [];

        const productosActualizados = [];

        for (let i = 0; i < productos.length; i++) {
          const prod = productos[i];

          const cantidadPedida = Number(prod.cantidad);
          const nuevoPesoRaw = nuevosPesos[i];
          const nuevoPeso =
            nuevoPesoRaw === "" || nuevoPesoRaw == null
              ? null
              : Number(nuevoPesoRaw);

          let nuevaCantidadPesada = nuevasCantidadesPesadas[i];

          if (nuevaCantidadPesada === "" || nuevaCantidadPesada == null) {
            nuevaCantidadPesada = prod.cantidadPesada ?? 0;

            if (
              nuevaCantidadPesada === 0 &&
              nuevoPeso != null &&
              Number.isFinite(cantidadPedida)
            ) {
              nuevaCantidadPesada = cantidadPedida;
            }
          }

          nuevaCantidadPesada = Number(nuevaCantidadPesada);

          if (!Number.isFinite(nuevaCantidadPesada)) {
            nuevaCantidadPesada = 0;
          }

          if (Number.isFinite(cantidadPedida)) {
            if (nuevaCantidadPesada < 0) nuevaCantidadPesada = 0;
            if (nuevaCantidadPesada > cantidadPedida) {
              nuevaCantidadPesada = cantidadPedida;
            }
          }

          const { error } = await supabase
            .from("pedidoItems")
            .update({
              peso_kg: nuevoPeso,
              cantidad_pesada: nuevaCantidadPesada,
            })
            .eq("id", prod.itemId);

          if (error) throw error;

          productosActualizados.push({
            ...prod,
            peso: nuevoPeso,
            cantidadPesada: nuevaCantidadPesada,
          });
        }

        const todosPesados = productosActualizados.every((prod) => {
          const cantidadPedida = Number(prod.cantidad);
          const cantidadPesada = Number(prod.cantidadPesada);
          const peso = Number(prod.peso);

          return (
            Number.isFinite(cantidadPedida) &&
            Number.isFinite(cantidadPesada) &&
            Number.isFinite(peso) &&
            cantidadPedida > 0 &&
            cantidadPesada >= cantidadPedida &&
            peso > 0
          );
        });

        const nuevoEstado = todosPesados
          ? "pendiente_entrega"
          : "pendiente_pesaje";

        if (pedidoSeleccionado.estado !== "entregado") {
          const { error: pedError } = await supabase
            .from("pedidos")
            .update({ estado: nuevoEstado })
            .eq("id", pedidoSeleccionado.id);

          if (pedError) throw pedError;
        }

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha modificado el pesaje del pedido: (ID ${pedidoSeleccionado.id}) del cliente: ${pedidoSeleccionado.cliente}`
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
          .from("pedidos")
          .update({ estado: "entregado" })
          .eq("id", pedido.id);

        if (error) throw error;

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha marcado el pedido: (ID ${pedido.id}) del cliente: ${pedido.cliente} como entregado`
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
          .from("pedidos")
          .delete()
          .eq("id", pedido.id);

        if (error) throw error;

        registrarLog(
          usuarioActual,
          `${usuarioActual?.usuario ?? "Usuario"} ha eliminado el pedido: (ID ${pedido.id}) del cliente: ${pedido.cliente}`
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
    pedidosPendientesAprobacion,
    cargandoPedidos,
    errorPedidos,
    recargarPedidos,
    agregarPedidoConfirmado,
    actualizarPesajes,
    marcarEntregadoPedido,
    eliminarPedido,
  };
}
