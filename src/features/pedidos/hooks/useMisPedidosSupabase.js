import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../shared/lib/supabaseClient";

const normalizarTexto = (valor) =>
  String(valor ?? "").trim().toLowerCase();

export function useMisPedidosSupabase({ usuarioActual }) {
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
        .select("*, clienteRegistro:clientes!pedidos_cliente_id_fkey(*)")
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

      const facturaIds = pedidosVisibles
        .map((p) => p.factura_id_actual)
        .filter(Boolean);

      let facturasPorId = {};

      if (facturaIds.length > 0) {
        const { data: facturasRaw, error: facturasError } = await supabase
          .from("facturas_emitidas")
          .select(
            "id, estado_fiscal, estado_pdf, pdf_path, pdf_url_publica, tipo_comprobante, punto_venta, numero_comprobante"
          )
          .in("id", facturaIds);

        if (facturasError) throw facturasError;

        facturasPorId = (facturasRaw || []).reduce((acc, factura) => {
          acc[factura.id] = factura;
          return acc;
        }, {});
      }

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
        const clienteRegistro = pr.clienteRegistro || null;

        const facturaActual = pr.factura_id_actual
          ? facturasPorId[pr.factura_id_actual] || null
          : null;

        return {
          id: pr.id,

          cliente_id: pr.cliente_id,
          cliente:
            clienteRegistro?.razon_social ||
            clienteRegistro?.nombre_fantasia ||
            `${clienteRegistro?.id_impositiva ?? ""} ${clienteRegistro?.numero_impositivo ?? ""}`.trim() ||
            `Cliente ${pr.cliente_id}`,
          clienteRegistro,

          nombre_fantasia: clienteRegistro?.nombre_fantasia || "",

          fecha: pr.fecha_solicitada || "",
          fechaCreacion: pr.created_at ? String(pr.created_at).slice(0, 10) : "",

          tipoEntrega: pr.tipo_entrega,
          estado: pr.estado,
          estado_aprobacion: pr.estado_aprobacion,
          tipo_factura: pr.tipo_factura,
          factura_estado: pr.factura_estado || "no_facturado",
          factura_id_actual: pr.factura_id_actual || null,

          factura_estado_fiscal: facturaActual?.estado_fiscal || null,
          factura_estado_pdf: facturaActual?.estado_pdf || null,
          factura_pdf_path: facturaActual?.pdf_path || null,
          factura_pdf_url_publica: facturaActual?.pdf_url_publica || null,
          factura_tipo_comprobante: facturaActual?.tipo_comprobante || null,
          factura_punto_venta: facturaActual?.punto_venta || null,
          factura_numero_comprobante: facturaActual?.numero_comprobante || null,
          tipoPrecio: pr.tipo_precio,
          marca: pr.marca,
          creadoPor: pr.creado_por_usuario_nombre || "",
          notas: pr.observaciones || "",

          direccion_entrega:
            pr.domicilio_entrega || clienteRegistro?.domicilio_entrega || "",

          numero_impositivo: clienteRegistro?.numero_impositivo || "",

          total: pr.precio_total,
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
  }, [usuarioActual?.rol, usuarioActual?.nombre, usuarioActual?.usuario]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facturas_emitidas" },
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