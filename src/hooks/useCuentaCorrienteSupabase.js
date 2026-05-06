// src/hooks/useCuentaCorrienteSupabase.js
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { registrarLog } from "../logsEventos";

const normalizarImporte = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export function useCuentaCorrienteSupabase({
  enabled = true,
  usuarioActual = null,
} = {}) {
  const [resumenClientes, setResumenClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [cargandoCuentaCorriente, setCargandoCuentaCorriente] = useState(false);
  const [errorCuentaCorriente, setErrorCuentaCorriente] = useState(null);

  const [movimientos, setMovimientos] = useState([]);
  const [cobros, setCobros] = useState([]);

  const recargarCuentaCorriente = useCallback(async () => {
    if (!enabled) {
      setResumenClientes([]);
      setFacturas([]);
      setMovimientos([]);
      setCobros([]);
      setCargandoCuentaCorriente(false);
      setErrorCuentaCorriente(null);
      return;
    }

    try {
      setCargandoCuentaCorriente(true);
      setErrorCuentaCorriente(null);

      const { data: clientesData, error: clientesError } = await supabase
        .from("v_cuenta_corriente_clientes")
        .select("*")
        .order("saldo_pendiente", { ascending: false });

      if (clientesError) throw clientesError;

      const clienteIds = (clientesData || [])
        .map((c) => c.cliente_id)
        .filter(Boolean);

      let clientesDetalleData = [];

      if (clienteIds.length > 0) {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .in("id", clienteIds);

        if (error) throw error;

        clientesDetalleData = data || [];
      }

      const clientesPorId = new Map();

      for (const cliente of clientesDetalleData) {
        clientesPorId.set(String(cliente.id), cliente);
      }

      const clientesDataConDetalle = (clientesData || []).map((c) => ({
        ...c,
        clienteRegistro: clientesPorId.get(String(c.cliente_id)) || null,
      }));

      const { data: facturasData, error: facturasError } = await supabase
        .from("v_facturas_cuenta_corriente")
        .select("*")
        .not("numero_comprobante", "is", null)
        .not("total", "is", null)
        .order("fecha_emision", { ascending: false })
        .order("created_at", { ascending: false });

      if (facturasError) throw facturasError;

      const { data: movimientosData, error: movimientosError } = await supabase
        .from("v_movimientos_cuenta_corriente")
        .select("*")
        .order("cliente_id", { ascending: true })
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

      if (movimientosError) throw movimientosError;

      const { data: cobrosData, error: cobrosError } = await supabase
        .from("v_cobros_cuenta_corriente")
        .select("*")
        .order("fecha_cobro", { ascending: false })
        .order("created_at", { ascending: false });

      if (cobrosError) throw cobrosError;

      setResumenClientes(clientesDataConDetalle);
      setFacturas(facturasData || []);
      setMovimientos(movimientosData || []);
      setCobros(cobrosData || []);
    } catch (e) {
      console.error("Error cargando cuenta corriente:", e);
      setErrorCuentaCorriente(e.message || String(e));
    } finally {
      setCargandoCuentaCorriente(false);
    }
  }, [enabled]);

  const registrarCobro = useCallback(
    async ({
      clienteId,
      fechaCobro,
      medioPago,
      importeTotal,
      observacion,
      aplicaciones = [],
    }) => {
      if (!usuarioActual || usuarioActual.rol !== "Admin") {
        throw new Error("Solo un usuario Admin puede registrar cobros.");
      }

      const importe = normalizarImporte(importeTotal);

      if (!clienteId) {
        throw new Error("Falta seleccionar el cliente.");
      }

      if (!fechaCobro) {
        throw new Error("Falta indicar la fecha de cobro.");
      }

      if (!medioPago) {
        throw new Error("Falta indicar el medio de pago.");
      }

      if (importe <= 0) {
        throw new Error("El importe del cobro debe ser mayor a cero.");
      }

      const aplicacionesValidas = (aplicaciones || [])
        .map((a) => ({
          factura_id: a.factura_id,
          importe_aplicado: normalizarImporte(a.importe_aplicado),
        }))
        .filter((a) => a.factura_id && a.importe_aplicado > 0);

      const totalAplicado = aplicacionesValidas.reduce(
        (acc, a) => acc + Number(a.importe_aplicado || 0),
        0
      );

      if (totalAplicado - importe > 0.01) {
        throw new Error(
          "El importe aplicado no puede superar el importe total del cobro."
        );
      }

      const { data: cobroInsertado, error: cobroError } = await supabase
        .from("cobros")
        .insert({
          cliente_id: clienteId,
          fecha_cobro: fechaCobro,
          medio_pago: medioPago,
          importe_total: importe,
          observacion: observacion?.trim() || null,
          creado_por_usuario_nombre: usuarioActual.usuario,
          estado: "Registrado",
        })
        .select("*")
        .single();

      if (cobroError) throw cobroError;

      try {
        if (aplicacionesValidas.length > 0) {
          const filasAplicaciones = aplicacionesValidas.map((a) => ({
            cobro_id: cobroInsertado.id,
            factura_id: a.factura_id,
            importe_aplicado: a.importe_aplicado,
          }));

          const { error: aplicacionesError } = await supabase
            .from("cobros_aplicaciones")
            .insert(filasAplicaciones);

          if (aplicacionesError) throw aplicacionesError;
        }
      } catch (e) {
        await supabase
          .from("cobros")
          .update({
            estado: "Anulado",
            observacion:
              (observacion?.trim() || "") +
              "\n\nCobro anulado automáticamente por error al aplicar a facturas: " +
              (e.message || String(e)),
          })
          .eq("id", cobroInsertado.id);

        throw e;
      }

      registrarLog(
        usuarioActual,
        `${usuarioActual.usuario} registró un cobro de $${importe} para el cliente ID ${clienteId}`
      );

      await recargarCuentaCorriente();

      return cobroInsertado;
    },
    [usuarioActual, recargarCuentaCorriente]
  );

  useEffect(() => {
    recargarCuentaCorriente();
  }, [recargarCuentaCorriente]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("cuenta-corriente-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facturas_emitidas" },
        () => recargarCuentaCorriente()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cobros" },
        () => recargarCuentaCorriente()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cobros_aplicaciones" },
        () => recargarCuentaCorriente()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, recargarCuentaCorriente]);

  const anularCobro = useCallback(
    async ({ cobroId, motivo }) => {
      if (!usuarioActual || usuarioActual.rol !== "Admin") {
        throw new Error("Solo un usuario Admin puede anular cobros.");
      }

      if (!cobroId) {
        throw new Error("Falta identificar el cobro a anular.");
      }

      const motivoLimpio = motivo?.trim();

      if (!motivoLimpio) {
        throw new Error("Indicá un motivo para anular el cobro.");
      }

      const { data: cobroActual, error: cobroActualError } = await supabase
        .from("cobros")
        .select("id, estado, importe_total, cliente_id")
        .eq("id", cobroId)
        .single();

      if (cobroActualError) throw cobroActualError;

      if (!cobroActual) {
        throw new Error("No se encontró el cobro.");
      }

      if (cobroActual.estado === "Anulado") {
        throw new Error("El cobro ya se encuentra anulado.");
      }

      const { error: updateError } = await supabase
        .from("cobros")
        .update({
          estado: "Anulado",
          anulado_at: new Date().toISOString(),
          anulado_por_usuario_nombre: usuarioActual.usuario,
          motivo_anulacion: motivoLimpio,
        })
        .eq("id", cobroId);

      if (updateError) throw updateError;

      registrarLog(
        usuarioActual,
        `${usuarioActual.usuario} anuló el cobro ${cobroId} por $${cobroActual.importe_total}. Motivo: ${motivoLimpio}`
      );

      await recargarCuentaCorriente();
    },
    [usuarioActual, recargarCuentaCorriente]
  );

  const aplicarSaldoAFavor = useCallback(
    async ({ clienteId }) => {
      if (!usuarioActual || usuarioActual.rol !== "Admin") {
        throw new Error("Solo un usuario Admin puede aplicar saldos a favor.");
      }

      if (!clienteId) {
        throw new Error("Falta identificar el cliente.");
      }

      const { data: cobrosConSaldo, error: cobrosError } = await supabase
        .from("v_cobros_cuenta_corriente")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("estado", "Registrado")
        .gt("saldo_sin_aplicar", 0)
        .order("fecha_cobro", { ascending: true })
        .order("created_at", { ascending: true });

      if (cobrosError) throw cobrosError;

      const { data: facturasPendientes, error: facturasError } = await supabase
        .from("v_facturas_cuenta_corriente")
        .select("*")
        .eq("cliente_id", clienteId)
        .gt("saldo_pendiente", 0)
        .not("numero_comprobante", "is", null)
        .not("total", "is", null)
        .order("fecha_emision", { ascending: false })
        .order("created_at", { ascending: false });

      if (facturasError) throw facturasError;

      if (!cobrosConSaldo || cobrosConSaldo.length === 0) {
        throw new Error("El cliente no tiene saldo a favor disponible.");
      }

      if (!facturasPendientes || facturasPendientes.length === 0) {
        throw new Error("El cliente no tiene facturas pendientes para aplicar.");
      }

      const normalizar = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
      };

      const aplicaciones = [];

      const cobrosTrabajo = cobrosConSaldo.map((c) => ({
        cobro_id: c.cobro_id,
        saldo_disponible: normalizar(c.saldo_sin_aplicar),
      }));

      const facturasTrabajo = facturasPendientes.map((f) => ({
        factura_id: f.factura_id,
        saldo_pendiente: normalizar(f.saldo_pendiente),
      }));

      for (const factura of facturasTrabajo) {
        let saldoFactura = factura.saldo_pendiente;

        if (saldoFactura <= 0) continue;

        for (const cobro of cobrosTrabajo) {
          if (saldoFactura <= 0) break;
          if (cobro.saldo_disponible <= 0) continue;

          const importeAplicar = normalizar(
            Math.min(saldoFactura, cobro.saldo_disponible)
          );

          if (importeAplicar <= 0) continue;

          aplicaciones.push({
            cobro_id: cobro.cobro_id,
            factura_id: factura.factura_id,
            importe_aplicado: importeAplicar,
          });

          cobro.saldo_disponible = normalizar(
            cobro.saldo_disponible - importeAplicar
          );

          saldoFactura = normalizar(saldoFactura - importeAplicar);
        }
      }

      if (aplicaciones.length === 0) {
        throw new Error("No hay saldo aplicable a facturas pendientes.");
      }

      for (const aplicacion of aplicaciones) {
        const { data: existente, error: existenteError } = await supabase
          .from("cobros_aplicaciones")
          .select("id, importe_aplicado")
          .eq("cobro_id", aplicacion.cobro_id)
          .eq("factura_id", aplicacion.factura_id)
          .maybeSingle();

        if (existenteError) throw existenteError;

        if (existente) {
          const nuevoImporte = normalizar(
            Number(existente.importe_aplicado || 0) +
              Number(aplicacion.importe_aplicado || 0)
          );

          const { error: updateError } = await supabase
            .from("cobros_aplicaciones")
            .update({
              importe_aplicado: nuevoImporte,
            })
            .eq("id", existente.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("cobros_aplicaciones")
            .insert(aplicacion);

          if (insertError) throw insertError;
        }
      }

      const totalAplicado = aplicaciones.reduce(
        (acc, a) => acc + Number(a.importe_aplicado || 0),
        0
      );

      registrarLog(
        usuarioActual,
        `${usuarioActual.usuario} aplicó saldo a favor por $${normalizar(
          totalAplicado
        )} al cliente ID ${clienteId}`
      );

      await recargarCuentaCorriente();

      return {
        totalAplicado: normalizar(totalAplicado),
        cantidadAplicaciones: aplicaciones.length,
      };
    },
    [usuarioActual, recargarCuentaCorriente]
  );

  return {
    resumenClientes,
    facturas,
    movimientos,
    cobros,
    cargandoCuentaCorriente,
    errorCuentaCorriente,
    recargarCuentaCorriente,
    registrarCobro,
    anularCobro,
    aplicarSaldoAFavor,
  };
}