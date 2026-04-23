import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

const ESTADOS_LINEA_TIEMPO = [
  "no_facturado",
  "en_proceso",
  "facturado",
  "pendiente_verificacion",
  "error",
];

function getEstadoMeta(estado) {
  switch (estado) {
    case "pendiente_envio":
      return {
        label: "Pendiente de envío",
        description: "La factura fue creada pero aún no llegó a ARCA.",
        color: "bg-slate-500",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "en_proceso":
      return {
        label: "En proceso",
        description: "La facturación está corriendo en este momento.",
        color: "bg-blue-500",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "facturado":
      return {
        label: "Facturado",
        description: "ARCA autorizó el comprobante correctamente.",
        color: "bg-emerald-500",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "pendiente_verificacion":
      return {
        label: "Pendiente de verificación",
        description: "No se pudo confirmar el resultado final.",
        color: "bg-amber-500",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "error":
      return {
        label: "Error",
        description: "La facturación terminó con error.",
        color: "bg-red-500",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
      };
    case "no_facturado":
    default:
      return {
        label: "No facturado",
        description: "Todavía no se emitió ninguna factura.",
        color: "bg-slate-300",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

function formatNumeroComprobante(valor) {
  const number = Number(valor ?? 0);
  if (!Number.isFinite(number) || number <= 0) return "00000000";
  return String(Math.trunc(number)).padStart(8, "0");
}

function formatFecha(valor) {
  if (!valor) return "—";

  const raw = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    return `${d}/${m}/${y}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return valor;

  return date.toLocaleDateString("es-AR");
}

function formatMoney(valor) {
  const number = Number(valor ?? 0);
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function getUsuarioFacturacion(usuarioActual) {
  return (
    usuarioActual?.usuario ||
    null
  );
}


function base64ToBlob(base64, mimeType = "application/pdf") {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

async function readFunctionErrorPayload(error) {
  try {
    if (typeof error?.context?.json === "function") {
      return await error.context.json();
    }
  } catch {
    // nada
  }

  return null;
}

function mapFacturacionFeedback(payload) {
  const codigo = payload?.codigo ?? null;
  const estadoFiscal = payload?.estadoFiscal ?? null;
  const estadoPdf = payload?.estadoPdf ?? null;
  const mensajeBackend = payload?.mensaje ?? null;

  if (codigo === "FACTURA_YA_EXISTE") {
    return {
      type: "warning",
      message:
        "Este pedido ya tiene una factura registrada para este ambiente.",
    };
  }

  if (codigo === "FACTURACION_EN_CURSO") {
    return {
      type: "warning",
      message:
        "Ya existe un proceso de facturación en curso para este pedido.",
    };
  }

  if (codigo === "FACTURACION_NO_REINTENTABLE") {
    return {
      type: "error",
      message:
        mensajeBackend ||
        "Ya existe una factura en error para este pedido, pero no es reintentable automáticamente.",
      retryable: false,
    };
  }

  if (estadoFiscal === "pendiente_verificacion") {
    return {
      type: "warning",
      message:
        mensajeBackend ||
        "No se pudo confirmar el resultado en ARCA. La factura quedó pendiente de verificación.",
    };
  }

  if (
    codigo === "WSAA_ERROR" ||
    codigo === "WSAA_HTTP_ERROR" ||
    codigo === "WSAA_SIGNER_ERROR" ||
    codigo === "WSAA_SIGNER_INVALID_JSON" ||
    codigo === "WSAA_SIGNER_EMPTY_CMS" ||
    codigo === "WSAA_ENDPOINT_FALTANTE" ||
    String(codigo ?? "").startsWith("WSAA_") ||
    codigo === "WSMTXCA_RECHAZO" ||
    codigo === "ERROR_INTERNO"
  ) {
    return {
      type: "error",
      message:
        mensajeBackend ||
        "La factura no pudo emitirse. Podés corregir el problema y volver a intentar.",
      retryable: true,
    };
  }

  if (codigo === "PEDIDO_NO_EXISTE") {
    return {
      type: "error",
      message: "El pedido ya no existe.",
    };
  }

  if (
    codigo === "ESTADO_PEDIDO_INVALIDO" ||
    codigo === "PEDIDO_SIN_FACTURA" ||
    codigo === "CLIENTE_NO_ENCONTRADO" ||
    codigo === "CLIENTE_NOMBRE_FALTANTE" ||
    codigo === "CLIENTE_CUIT_INVALIDO" ||
    codigo === "CLIENTE_CONDICION_IVA_FALTANTE" ||
    codigo === "PEDIDO_SIN_ITEMS" ||
    codigo === "ITEMS_SIN_PESO" ||
    codigo === "ITEMS_SIN_PRECIO_APLICADO" ||
    codigo === "TIPO_COMPROBANTE_INVALIDO"
  ) {
    return {
      type: "error",
      message: mensajeBackend || "No se puede emitir la factura con los datos actuales.",
      retryable: false,
    };
  }

  if (estadoFiscal === "error" && estadoPdf === "pendiente") {
    return {
      type: "error",
      message:
        mensajeBackend ||
        "La facturación terminó con error. Revisá el detalle e intentá nuevamente si corresponde.",
    };
  }

  return {
    type: "error",
    message:
      mensajeBackend ||
      "Ocurrió un error al intentar facturar.",
  };
}

function buildPdfDownloadName(pedido, factura) {
  const numero = factura?.numero_comprobante ?? "sin-numero";
  return `factura-pedido-${pedido?.id ?? "sin-id"}-${numero}.pdf`;
}

export default function FacturacionPedidoModal({
  pedido,
  onClose,
  usuarioActual,
  ambiente = "homologacion",
  onFacturaActualizada,
}) {
  const [pedidoActual, setPedidoActual] = useState(null);
  const [factura, setFactura] = useState(null);
  const [cargandoFactura, setCargandoFactura] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [accionPdf, setAccionPdf] = useState(null);
  const [errorUi, setErrorUi] = useState(null);
  const [mensajeUi, setMensajeUi] = useState(null);
  const [regenerandoPdf, setRegenerandoPdf] = useState(false);
  const [warningUi, setWarningUi] = useState(null);
  const [verificandoEstado, setVerificandoEstado] = useState(false);
  const [hintUi, setHintUi] = useState(null);
  const [abriendoRemito, setAbriendoRemito] = useState(false);

  const open = Boolean(pedido?.id);

  const estadoActual = useMemo(() => {
    if (emitiendo) return "en_proceso";

    const estadoDb =
      factura?.estado_fiscal ||
      pedidoActual?.factura_estado ||
      "no_facturado";

    if (estadoDb === "pendiente_envio") {
      return "en_proceso";
    }

    return estadoDb;
  }, [pedidoActual, factura, emitiendo]);

  const estadoMeta = useMemo(() => getEstadoMeta(estadoActual), [estadoActual]);

  async function cargarPedidoYFactura() {
    if (!pedido?.id) return;

    try {
      setCargandoFactura(true);
      setErrorUi(null);

      const { data: pedidoDb, error: pedidoError } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedido.id)
        .maybeSingle();

      if (pedidoError) throw pedidoError;

      setPedidoActual(pedidoDb ?? null);

      const facturaId = pedidoDb?.factura_id_actual;
      if (!facturaId) {
        setFactura(null);
        return;
      }

      const { data: facturaDb, error: facturaError } = await supabase
        .from("facturas_emitidas")
        .select("*")
        .eq("id", facturaId)
        .maybeSingle();

      if (facturaError) throw facturaError;

      setFactura(facturaDb ?? null);
    } catch (error) {
      console.error("[FacturacionPedidoModal] error cargando pedido/factura", error);
      setErrorUi("No se pudo cargar la información de facturación.");
    } finally {
      setCargandoFactura(false);
    }
  }

  useEffect(() => {
    if (!open) {
      setPedidoActual(null);
      setFactura(null);
      setCargandoFactura(false);
      setEmitiendo(false);
      setRegenerandoPdf(false);
      setAccionPdf(null);
      setErrorUi(null);
      setMensajeUi(null);
      setWarningUi(null);
      setVerificandoEstado(false);
      setHintUi(null);
      setAbriendoRemito(false);
      return;
    }

    cargarPedidoYFactura();
  }, [open, pedido?.id]);

  if (!open) return null;

  const puedeEmitir =
    pedidoActual?.estado === "pendiente_entrega" &&
    pedidoActual?.tipo_factura !== "Sin_Factura" &&
    (estadoActual === "no_facturado" || estadoActual === "error");

  const puedeVerRemito =
    (pedidoActual?.tipo_factura ?? pedido?.tipo_factura) !== "Sin_Factura" &&
    ["pendiente_entrega", "entregado"].includes(
      pedidoActual?.estado ?? pedido?.estado
    );

  const puedeRegenerarPdf =
    factura?.id &&
    factura?.estado_fiscal === "facturado" &&
    factura?.estado_pdf === "error";

  const puedeVerificarEstado =
    factura?.id &&
    factura?.estado_fiscal === "pendiente_verificacion";

  async function emitirFactura() {
    try {
      setEmitiendo(true);
      setErrorUi(null);
      setWarningUi(null);
      setMensajeUi(null);
      setHintUi(null);

      const { data, error } = await supabase.functions.invoke("facturacion", {
        body: {
          pedidoId: pedido.id,
          ambiente,
          usuario: getUsuarioFacturacion(usuarioActual),
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        const feedback = mapFacturacionFeedback(data);

        if (feedback.type === "warning") {
          setWarningUi(feedback.message);
        } else {
          setErrorUi(feedback.message);
        }

        if (feedback.retryable) {
          setHintUi("Este error permite reintentar la emisión cuando lo corrijas.");
        }

        await cargarPedidoYFactura();
        onFacturaActualizada?.();
        return;
      }

      if (data?.estadoFiscal === "facturado" && data?.estadoPdf === "error") {
        setWarningUi(
          "La factura se emitió correctamente, pero falló la generación del PDF. Podés regenerarlo desde este modal."
        );
      } else {
        setMensajeUi("La factura se emitió correctamente.");
      }

      await cargarPedidoYFactura();
      onFacturaActualizada?.();
    } catch (error) {
      console.error("[FacturacionPedidoModal] error emitiendo factura", error);

      const payload = await readFunctionErrorPayload(error);
      const feedback = mapFacturacionFeedback(payload);

      if (feedback.type === "warning") {
        setWarningUi(feedback.message);
      } else {
        setErrorUi(feedback.message);
      }

      if (feedback.retryable) {
        setHintUi("Este error permite reintentar la emisión cuando lo corrijas.");
      }

      if (payload) {
        await cargarPedidoYFactura();
        onFacturaActualizada?.();
        return;
      }

      setErrorUi(
        error?.message || "Ocurrió un error al intentar emitir la factura."
      );
    } finally {
      setEmitiendo(false);
    }
  }

  async function abrirRemito() {
    if (!pedido?.id) {
      setErrorUi("No hay pedido para generar el remito.");
      return;
    }

    try {
      setAbriendoRemito(true);
      setErrorUi(null);
      setWarningUi(null);
      setMensajeUi(null);
      setHintUi(null);

      const { data, error } = await supabase.functions.invoke("remito-pdf", {
        body: {
          pedidoId: pedido.id,
          usuario: getUsuarioFacturacion(usuarioActual),
        },
      });

      if (error) throw error;

      if (!data?.ok || !data?.base64Pdf) {
        throw new Error(data?.mensaje || "No se pudo generar el remito.");
      }

      const blob = base64ToBlob(
        data.base64Pdf,
        data?.mimeType || "application/pdf"
      );

      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60_000);
    } catch (error) {
      console.error("[FacturacionPedidoModal] error generando remito", error);
      setErrorUi(error?.message || "No se pudo generar el remito.");
    } finally {
      setAbriendoRemito(false);
    }
  }

  async function regenerarPdf() {
    if (!factura?.id) {
      setErrorUi("No hay una factura para regenerar el PDF.");
      return;
    }

    try {
      setRegenerandoPdf(true);
      setErrorUi(null);
      setWarningUi(null);
      setMensajeUi(null);
      setHintUi(null);

      const { data, error } = await supabase.functions.invoke("facturacion", {
        body: {
          accion: "regenerar_pdf",
          facturaId: factura.id,
          usuario: getUsuarioFacturacion(usuarioActual),
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setErrorUi(data?.mensaje || "No se pudo regenerar el PDF.");
        await cargarPedidoYFactura();
        onFacturaActualizada?.();
        return;
      }

      setMensajeUi("El PDF se regeneró correctamente.");
      await cargarPedidoYFactura();
      onFacturaActualizada?.();
    } catch (error) {
      console.error("[FacturacionPedidoModal] error regenerando pdf", error);
      setErrorUi(
        error?.message || "Ocurrió un error al intentar regenerar el PDF."
      );
    } finally {
      setRegenerandoPdf(false);
    }
  }

  async function verificarEstadoFactura() {
    if (!factura?.id) {
      setErrorUi("No hay una factura para verificar.");
      return;
    }

    try {
      setVerificandoEstado(true);
      setErrorUi(null);
      setWarningUi(null);
      setMensajeUi(null);
      setHintUi(null);

      const { data, error } = await supabase.functions.invoke("facturacion", {
        body: {
          accion: "verificar_estado",
          facturaId: factura.id,
          usuario: getUsuarioFacturacion(usuarioActual),
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        setErrorUi(data?.mensaje || "No se pudo verificar el estado.");
        await cargarPedidoYFactura();
        onFacturaActualizada?.();
        return;
      }

      if (data?.verificado === false) {
        setWarningUi(
          data?.mensaje ||
            "Todavía no se pudo confirmar el estado final en ARCA."
        );
      } else if (data?.estadoFiscal === "facturado" && data?.estadoPdf === "error") {
        setWarningUi(
          "La factura fue confirmada en ARCA, pero falló la generación del PDF. Podés regenerarlo desde este modal."
        );
      } else {
        setMensajeUi(
          data?.mensaje || "La factura fue confirmada correctamente en ARCA."
        );
      }

      await cargarPedidoYFactura();
      onFacturaActualizada?.();
    } catch (error) {
      console.error("[FacturacionPedidoModal] error verificando estado", error);
      setErrorUi(
        error?.message || "Ocurrió un error al intentar verificar el estado."
      );
    } finally {
      setVerificandoEstado(false);
    }
  }

  async function abrirPdf({ download = false } = {}) {
    if (!factura?.id) {
      setErrorUi("La factura todavía no tiene PDF disponible.");
      return;
    }

    try {
      setAccionPdf(download ? "descargar" : "ver");
      setErrorUi(null);
      setMensajeUi(null);

      const { data, error } = await supabase.functions.invoke("facturacion-pdf-url", {
        body: {
          facturaId: factura.id,
          download,
        },
      });

      if (error) throw error;

      if (!data?.ok || !data?.signedUrl) {
        throw new Error(data?.mensaje || "No se pudo obtener la URL del PDF.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[FacturacionPedidoModal] error obteniendo pdf", error);
      setErrorUi(
        error?.message || "No se pudo abrir el PDF de la factura."
      );
    } finally {
      setAccionPdf(null);
    }
  }

  function handleClose() {
    onFacturaActualizada?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Facturación</h2>
              <p className="text-sm text-slate-600">
                Pedido #{pedidoActual?.id ?? pedido?.id} —{" "}
                {pedidoActual?.cliente_nombre ?? pedido?.cliente ?? "—"}
              </p>
            </div>

            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-600">Estado actual:</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${estadoMeta.badgeClass}`}
              >
                {estadoMeta.label}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">{estadoMeta.description}</p>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Línea de tiempo
            </h3>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {ESTADOS_LINEA_TIEMPO.map((estado) => {
                const meta = getEstadoMeta(estado);
                const activo = estadoActual === estado;

                return (
                  <div
                    key={estado}
                    className={`rounded-xl border p-3 text-center ${
                      activo
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div
                      className={`mx-auto mb-2 h-3 w-3 rounded-full ${meta.color}`}
                    />
                    <div className="text-xs font-medium text-slate-900">
                      {meta.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Datos del pedido
              </h3>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">Cliente:</span>{" "}
                  <span className="font-medium">
                    {pedidoActual?.cliente_nombre ?? pedido?.cliente ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Tipo factura:</span>{" "}
                  <span className="font-medium">
                    {pedidoActual?.tipo_factura ?? pedido?.tipo_factura ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Estado pedido:</span>{" "}
                  <span className="font-medium">
                    {pedidoActual?.estado ?? pedido?.estado ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Estado factura:</span>{" "}
                  <span className="font-medium">
                    {pedidoActual?.factura_estado ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Ambiente:</span>{" "}
                  <span className="font-medium">{ambiente}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Datos fiscales
              </h3>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">Comprobante:</span>{" "}
                  <span className="font-medium">
                    {factura?.tipo_comprobante
                      ? `${factura.tipo_comprobante} ${String(factura.punto_venta ?? "").padStart(5, "0")}-${formatNumeroComprobante(factura.numero_comprobante)}`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">CAE:</span>{" "}
                  <span className="font-medium">{factura?.cae ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Vto. CAE:</span>{" "}
                  <span className="font-medium">
                    {formatFecha(factura?.cae_vto)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Estado PDF:</span>{" "}
                  <span className="font-medium">{factura?.estado_pdf ?? "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Total:</span>{" "}
                  <span className="font-medium">
                    {factura?.total != null ? `$ ${formatMoney(factura.total)}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!emitiendo && factura?.estado_fiscal === "error" && (factura?.error_codigo || factura?.error_texto) ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-semibold">Detalle del error</div>
              <div className="mt-1">Código: {factura?.error_codigo ?? "—"}</div>
              <div className="mt-1">Mensaje: {factura?.error_texto ?? "—"}</div>
            </div>
          ) : null}

          {factura?.estado_pdf === "error" && factura?.pdf_error_texto ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">
                {factura?.estado_fiscal === "facturado"
                  ? "Factura emitida, pero con error de PDF"
                  : "Error de PDF"}
              </div>
              <div className="mt-1">{factura.pdf_error_texto}</div>
            </div>
          ) : null}

          {errorUi ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {errorUi}
            </div>
          ) : null}

          {warningUi ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {warningUi}
            </div>
          ) : null}

          {hintUi ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {hintUi}
            </div>
          ) : null}

          {mensajeUi ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {mensajeUi}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              onClick={abrirRemito}
              disabled={!puedeVerRemito || abriendoRemito || cargandoFactura}
            >
              {abriendoRemito ? "Abriendo Remito..." : "Ver Remito"}
            </Button>

            <Button
              onClick={emitirFactura}
              disabled={true}//{!puedeEmitir || emitiendo || cargandoFactura}
            >
              {emitiendo ? "Facturando..." : "Emitir factura"}
            </Button>

            {puedeVerificarEstado ? (
              <Button
                variant="outline"
                onClick={verificarEstadoFactura}
                disabled={verificandoEstado || emitiendo || cargandoFactura}
              >
                {verificandoEstado ? "Verificando estado..." : "Verificar estado"}
              </Button>
            ) : null}

            {puedeRegenerarPdf ? (
              <Button
                variant="outline"
                onClick={regenerarPdf}
                disabled={regenerandoPdf || emitiendo || cargandoFactura}
              >
                {regenerandoPdf ? "Regenerando PDF..." : "Regenerar PDF"}
              </Button>
            ) : null}

            <Button
              variant="outline"
              onClick={() => abrirPdf({ download: false })}
              disabled={
                !factura?.pdf_path ||
                factura?.estado_pdf !== "generado" ||
                accionPdf != null
              }
            >
              {accionPdf === "ver" ? "Abriendo Factura..." : "Ver Factura"}
            </Button>

            <Button
              variant="outline"
              onClick={() => abrirPdf({ download: true })}
              disabled={
                !factura?.pdf_path ||
                factura?.estado_pdf !== "generado" ||
                accionPdf != null
              }
            >
              {accionPdf === "descargar"
                ? "Preparando descarga..."
                : "Descargar Factura"}
            </Button>
          </div>

          {cargandoFactura ? (
            <p className="text-xs text-slate-500">
              Cargando detalle de factura...
            </p>
          ) : null}

          {(pedidoActual?.tipo_factura ?? pedido?.tipo_factura) === "Sin_Factura" ? (
            <p className="text-xs text-slate-500">
              Este pedido está marcado como <strong>Sin_Factura</strong>, por eso no
              se puede emitir.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}