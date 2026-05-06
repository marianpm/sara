import express from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { HttpError, assert } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

const normalizarImporte = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

router.post("/", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const usuarioActual = req.usuarioActual;

    const clienteId = req.body?.clienteId;
    const fechaCobro = req.body?.fechaCobro;
    const medioPago = req.body?.medioPago;
    const observacion = req.body?.observacion;
    const importeTotal = normalizarImporte(req.body?.importeTotal);
    const aplicaciones = Array.isArray(req.body?.aplicaciones)
      ? req.body.aplicaciones
      : [];

    assert(clienteId, 400, "Falta seleccionar el cliente.");
    assert(fechaCobro, 400, "Falta indicar la fecha de cobro.");
    assert(medioPago, 400, "Falta indicar el medio de pago.");
    assert(importeTotal > 0, 400, "El importe del cobro debe ser mayor a cero.");

    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from("clientes")
      .select("id, razon_social")
      .eq("id", clienteId)
      .maybeSingle();

    if (clienteError) throw clienteError;
    assert(cliente, 404, "No se encontró el cliente.");

    const aplicacionesValidas = aplicaciones
      .map((a) => ({
        factura_id: a.factura_id,
        importe_aplicado: normalizarImporte(a.importe_aplicado),
      }))
      .filter((a) => a.factura_id && a.importe_aplicado > 0);

    const totalAplicado = normalizarImporte(
      aplicacionesValidas.reduce(
        (acc, a) => acc + Number(a.importe_aplicado || 0),
        0
      )
    );

    assert(
      totalAplicado - importeTotal <= 0.01,
      400,
      "El importe aplicado no puede superar el importe total del cobro."
    );

    if (aplicacionesValidas.length > 0) {
      const facturaIds = aplicacionesValidas.map((a) => a.factura_id);

      const { data: facturas, error: facturasError } = await supabaseAdmin
        .from("v_facturas_cuenta_corriente")
        .select("factura_id, cliente_id, saldo_pendiente")
        .in("factura_id", facturaIds);

      if (facturasError) throw facturasError;

      for (const aplicacion of aplicacionesValidas) {
        const factura = (facturas || []).find(
          (f) => String(f.factura_id) === String(aplicacion.factura_id)
        );

        assert(factura, 404, "Una de las facturas no existe.");
        assert(
          String(factura.cliente_id) === String(clienteId),
          400,
          "Una de las facturas no pertenece al cliente seleccionado."
        );
        assert(
          Number(aplicacion.importe_aplicado) <=
            Number(factura.saldo_pendiente || 0) + 0.01,
          400,
          "No se puede aplicar un importe mayor al saldo pendiente de una factura."
        );
      }
    }

    const { data: cobroInsertado, error: cobroError } = await supabaseAdmin
      .from("cobros")
      .insert({
        cliente_id: clienteId,
        fecha_cobro: fechaCobro,
        medio_pago: medioPago,
        importe_total: importeTotal,
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

        const { error: aplicacionesError } = await supabaseAdmin
          .from("cobros_aplicaciones")
          .insert(filasAplicaciones);

        if (aplicacionesError) throw aplicacionesError;
      }
    } catch (e) {
      await supabaseAdmin
        .from("cobros")
        .update({
          estado: "Anulado",
          anulado_at: new Date().toISOString(),
          anulado_por_usuario_nombre: usuarioActual.usuario,
          motivo_anulacion:
            "Anulado automáticamente por error al aplicar a facturas: " +
            (e.message || String(e)),
        })
        .eq("id", cobroInsertado.id);

      throw e;
    }

    res.status(201).json({
      cobro: cobroInsertado,
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/:cobroId/anular",
  requireAuth,
  requireRole("Admin"),
  async (req, res, next) => {
    try {
      const usuarioActual = req.usuarioActual;
      const cobroId = req.params.cobroId;
      const motivo = String(req.body?.motivo || "").trim();

      assert(cobroId, 400, "Falta identificar el cobro.");
      assert(motivo, 400, "Indicá un motivo para anular el cobro.");

      const { data: cobroActual, error: cobroActualError } = await supabaseAdmin
        .from("cobros")
        .select("id, estado, importe_total, cliente_id")
        .eq("id", cobroId)
        .maybeSingle();

      if (cobroActualError) throw cobroActualError;

      assert(cobroActual, 404, "No se encontró el cobro.");
      assert(
        cobroActual.estado !== "Anulado",
        400,
        "El cobro ya se encuentra anulado."
      );

      const { data: cobroAnulado, error: updateError } = await supabaseAdmin
        .from("cobros")
        .update({
          estado: "Anulado",
          anulado_at: new Date().toISOString(),
          anulado_por_usuario_nombre: usuarioActual.usuario,
          motivo_anulacion: motivo,
        })
        .eq("id", cobroId)
        .select("*")
        .single();

      if (updateError) throw updateError;

      res.json({
        cobro: cobroAnulado,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;