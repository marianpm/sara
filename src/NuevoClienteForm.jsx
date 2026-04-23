import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { supabase } from "./supabaseClient";
import { registrarLog } from "./logsEventos";
import AddressAutocompleteInput from "./components/AddressAutocompleteInput";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

const CONDICIONES_IVA = [
  "IVA Responsable Inscripto",
  "IVA Sujeto Exento",
  "Consumidor Final",
  "Responsable Monotributo",
  "IVA No Alcanzado",
];

const initialState = {
  razon_social: "",
  nombre_fantasia: "",
  id_impositiva: "CUIT",
  numero_impositivo: "",
  condicion_iva: "",
  domicilio_fiscal: "",
  domicilio_entrega: "",
  domicilio_entrega_lat: null,
  domicilio_entrega_lng: null,
  domicilioEntregaIgualFiscal: true,
  telefono: "",
  email: "",
  tipo: "Otro",
  observaciones: "",
};

export default function NuevoClienteForm({ usuarioActual, onClienteCreado }) {
  const [form, setForm] = useState(initialState);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);
  const [clienteCreado, setClienteCreado] = useState(null);

  const [consultandoPadron, setConsultandoPadron] = useState(false);
  const [padronError, setPadronError] = useState(null);
  const [padronResultado, setPadronResultado] = useState(null);

  const puedeConsultarPadron =
    form.id_impositiva === "CUIT" && /^[0-9]{11}$/.test(form.numero_impositivo);

  const consultaPadronExitosa =
    padronResultado?.fuente === "ARCA" && !padronError;

  const esDni = form.id_impositiva === "DNI";

  const razonSocialBloqueada =
    !esDni &&
    consultaPadronExitosa &&
    !!padronResultado?.razon_social_sugerida;
                                                                                        
  const condicionIvaBloqueada =
    esDni ||
    (consultaPadronExitosa && !!padronResultado?.condicion_iva_sugerida);

  const domicilioFiscalDesdeArca =
    consultaPadronExitosa && !!padronResultado?.domicilio_fiscal_sugerido;

  const entregaIgualFiscalActiva =
    form.domicilioEntregaIgualFiscal && !domicilioFiscalDesdeArca;

  const consultarPadron = async () => {
    if (!puedeConsultarPadron || consultandoPadron) return;

    try {
      setConsultandoPadron(true);
      setPadronError(null);
      setPadronResultado(null);
                                        
      const { data, error } = await supabase.functions.invoke(
        "consultar-padron-cliente",
        {
          body: {
            cuit: form.numero_impositivo,
          },
        }
      );

      if (error) {
        if (error instanceof FunctionsHttpError) {
          let detalle = null;

          try {
            detalle = await error.context.json();
          } catch {
            detalle = null;
          }

          const mensajeBase =
            detalle?.error || error.message || "No se pudo consultar ARCA";

          const mensajeNormalizado = String(mensajeBase).toLowerCase();

          if (
            detalle?.ambiente === "homologacion" &&
            mensajeNormalizado.includes("no existe persona con ese id")
          ) {
            throw new Error(
              "ARCA homologación no devolvió datos para este CUIT. Probá con otro CUIT de testing o validalo luego en producción."
            );
          }

          const codigo = detalle?.code ? ` [${detalle.code}]` : "";
          const requestId = detalle?.requestId ? ` (ref: ${detalle.requestId})` : "";

          throw new Error(`${mensajeBase}${codigo}${requestId}`);
        }

        if (error instanceof FunctionsRelayError) {
          throw new Error(
            "No se pudo comunicar con Supabase para consultar ARCA."
          );
        }

        if (error instanceof FunctionsFetchError) {
          throw new Error(
            "No se pudo conectar con la función de consulta de padrón."
          );
        }

        throw new Error(error.message || "No se pudo consultar ARCA");
      }

      setPadronResultado(data);

      const traeDomicilioFiscalArca = !!data?.domicilio_fiscal_sugerido;

      setForm((prev) => ({
        ...prev,
        razon_social: data?.razon_social_sugerida || prev.razon_social,
        domicilio_fiscal:
          data?.domicilio_fiscal_sugerido || prev.domicilio_fiscal,
        domicilioEntregaIgualFiscal: traeDomicilioFiscalArca
          ? false
          : prev.domicilioEntregaIgualFiscal,
        domicilio_entrega: traeDomicilioFiscalArca ? "" : prev.domicilio_entrega,
        domicilio_entrega_lat: traeDomicilioFiscalArca
          ? null
          : prev.domicilio_entrega_lat,
        domicilio_entrega_lng: traeDomicilioFiscalArca
          ? null
          : prev.domicilio_entrega_lng,
        condicion_iva:
          data?.condicion_iva_sugerida || prev.condicion_iva,
      }));
    } catch (e) {
      console.error("Error consultando padrón:", e);
      setPadronError(e.message || "No se pudo consultar ARCA");
    } finally {
      setConsultandoPadron(false);
    }
  };

  const textoFiscal = form.domicilio_fiscal.trim();
  const textoEntrega = form.domicilio_entrega.trim();

  const hayDireccionFiscal = textoFiscal.length > 0;
  const hayDireccionEntrega = textoEntrega.length > 0;

  const direccionFiscalGoogleOK =
    hayDireccionFiscal &&
    form.domicilio_entrega_lat != null &&
    form.domicilio_entrega_lng != null;

  const direccionEntregaOK = entregaIgualFiscalActiva
    ? direccionFiscalGoogleOK
    : hayDireccionEntrega &&
      form.domicilio_entrega_lat != null &&
      form.domicilio_entrega_lng != null;

  const faltaSeleccionGoogleEntrega = entregaIgualFiscalActiva
    ? hayDireccionFiscal &&
      (form.domicilio_entrega_lat == null || form.domicilio_entrega_lng == null)
    : hayDireccionEntrega &&
      (form.domicilio_entrega_lat == null || form.domicilio_entrega_lng == null);

  const razonSocialForm = form.razon_social.trim();
  const nombreFantasiaForm = form.nombre_fantasia.trim();
  const numeroDocumento = form.numero_impositivo.trim();

  const documentoValido = esDni
    ? /^[0-9]{7,8}$/.test(numeroDocumento)
    : /^[0-9]{11}$/.test(numeroDocumento);

  const condicionIvaValida = form.condicion_iva.trim().length > 0;

  const nombreClienteValido = esDni
    ? nombreFantasiaForm.length > 0
    : razonSocialForm.length > 0 || nombreFantasiaForm.length > 0;

  const puedeCrear =
    nombreClienteValido &&
    documentoValido &&
    condicionIvaValida &&
    direccionEntregaOK;

  const handleTipoDocumentoChange = (value) => {
    setForm((prev) => ({
      ...prev,
      id_impositiva: value,
      numero_impositivo: "",
      condicion_iva: value === "DNI" ? "Consumidor Final" : "",
      razon_social: value === "DNI" ? "" : prev.razon_social,
    }));

    setPadronResultado(null);
    setPadronError(null);
  };

  const handleNumeroDocumentoChange = (value) => {
    const soloNumeros = value.replace(/\D/g, "");
    const maxLength = form.id_impositiva === "DNI" ? 8 : 11;

    setForm((prev) => ({
      ...prev,
      numero_impositivo: soloNumeros.slice(0, maxLength),
    }));

    setPadronResultado(null);
    setPadronError(null);
  };

  const handleCrear = async () => {
    if (!puedeCrear || creando) return;

    try {
      setCreando(true);
      setError(null);

      const esDni = form.id_impositiva === "DNI";

      const razonSocialParaGuardar =
        !esDni && form.razon_social.trim().length > 0
          ? form.razon_social.trim()
          : null;

      const nombreFantasiaParaGuardar =
        form.nombre_fantasia.trim().length > 0
          ? form.nombre_fantasia.trim()
          : razonSocialParaGuardar;

      const numero_impositivo = form.numero_impositivo.trim();

      const domicilio_fiscal =
        form.domicilio_fiscal.trim().length > 0
          ? form.domicilio_fiscal.trim()
          : null;

      const domicilio_entrega = entregaIgualFiscalActiva
        ? domicilio_fiscal
        : form.domicilio_entrega.trim().length > 0
          ? form.domicilio_entrega.trim()
          : null;

      const domicilio_entrega_lat =
        domicilio_entrega != null ? form.domicilio_entrega_lat : null;

      const domicilio_entrega_lng =
        domicilio_entrega != null ? form.domicilio_entrega_lng : null;

      const estado_aprobacion_cliente =
        usuarioActual?.rol === "Admin" ? "Aprobado" : "Pendiente";

      const telefono =
        form.telefono.trim().length > 0
          ? `+549${form.telefono.trim()}`
          : null;

      const email =
        form.email.trim().length > 0
          ? form.email.trim().toLowerCase()
          : null;

      const tipo = form.tipo || "Otro";
      const observaciones =
        form.observaciones.trim().length > 0 ? form.observaciones.trim() : null;

      const { data, error: dbError } = await supabase
        .from("clientes")
        .insert({
          razon_social: razonSocialParaGuardar,
          nombre_fantasia: nombreFantasiaParaGuardar,
          id_impositiva: form.id_impositiva,
          numero_impositivo,
          condicion_iva: form.condicion_iva,
          domicilio_fiscal,
          domicilio_entrega,
          domicilio_entrega_lat,
          domicilio_entrega_lng,
          activo: true,
          estado_aprobacion: estado_aprobacion_cliente,
          creado_por_usuario_nombre:
            usuarioActual?.nombre ?? usuarioActual?.usuario ?? null,
          telefono,
          email,
          tipo,
          observaciones,
        })
        .select("*")
        .single();

      if (dbError) {
        if (dbError.code === "23505") {
          const errorMessage = String(dbError.message || "");
          const errorDetails = String(dbError.details || "");

          const esDocumentoDuplicado =
            errorMessage.includes("clientes_documento_unico") ||
            errorDetails.includes("(id_impositiva, numero_impositivo)");

          if (esDocumentoDuplicado) {
            setError(
              `Ya existe un cliente con ${form.id_impositiva} ${numero_impositivo}.`
            );
          } else {
            setError("Ya existe un cliente con esos datos.");
          }
          return;
        } else if (dbError.code === "23514") {
          setError(
            "Hay un dato inválido. Revisá documento, condición IVA y nombre del cliente."
          );
          return;
        } else {
          setError(
            "Error guardando el cliente: " + (dbError.message || String(dbError))
          );
          return;
        }
      }

      const nombreLog =
        data.nombre_fantasia || data.razon_social || `${data.id_impositiva} ${data.numero_impositivo}`;

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} ha creado el cliente: ${nombreLog} (ID ${data.id})`
      );

      setClienteCreado(data);
    } catch (e) {
      console.error("Error creando cliente:", e);
      setError(
        "Error inesperado guardando el cliente: " + (e.message || String(e))
      );
    } finally {
      setCreando(false);
    }
  };

  const handleCerrarModal = async () => {
    const cliente = clienteCreado;
    setClienteCreado(null);
    setForm(initialState);

    if (onClienteCreado && cliente) {
      await onClienteCreado(cliente);
    }
  };

  const toggleEntregaIgual = (checked) => {
    setForm((prev) => {
      if (checked) {
        return {
          ...prev,
          domicilioEntregaIgualFiscal: true,
          domicilio_entrega: prev.domicilio_fiscal,
          domicilio_entrega_lat: null,
          domicilio_entrega_lng: null,
        };
      }

      return {
        ...prev,
        domicilioEntregaIgualFiscal: false,
        domicilio_entrega: "",
        domicilio_entrega_lat: null,
        domicilio_entrega_lng: null,
      };
    });
  };

  const textoAyudaDocumento =
    form.id_impositiva === "DNI"
      ? "El DNI debe tener 7 u 8 dígitos."
      : "CUIT, CUIL y CDI deben tener 11 dígitos.";

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-2xl font-semibold">Nuevo cliente</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Tipo y número de documento
              </label>
              <div className="flex gap-2">
                <select
                  className="w-28 h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={form.id_impositiva}
                  onChange={(e) => handleTipoDocumentoChange(e.target.value)}
                >
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                  <option value="CDI">CDI</option>
                  <option value="DNI">DNI</option>
                </select>

                <Input
                  className="flex-1"
                  placeholder={
                    form.id_impositiva === "DNI"
                      ? "DNI (sin puntos)"
                      : "Número (sin guiones)"
                  }
                  maxLength={form.id_impositiva === "DNI" ? 8 : 11}
                  inputMode="numeric"
                  value={form.numero_impositivo}
                  onChange={(e) => handleNumeroDocumentoChange(e.target.value)}
                />
              </div>

              <p className="text-xs text-slate-500">{textoAyudaDocumento}</p>

              {form.numero_impositivo.length > 0 && !documentoValido && (
                <p className="text-xs text-amber-700">
                  El número ingresado no tiene un formato válido.
                </p>
              )}

              {form.id_impositiva === "CUIT" && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={consultarPadron}
                      disabled={!puedeConsultarPadron || consultandoPadron}
                    >
                      {consultandoPadron ? "Consultando..." : "Consultar ARCA"}
                    </Button>

                    {consultaPadronExitosa && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Consulta exitosa
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500">
                    Trae una sugerencia desde padrón para revisar antes de guardar.
                  </span>
                </div>
              )}

              {padronError && (
                <p className="text-xs text-red-600">{padronError}</p>
              )}

              {padronResultado?.fuente === "ARCA" && (
                <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-700">
                    Datos sugeridos por ARCA. Revisalos antes de guardar.
                    {padronResultado?.wsaa_source === "cache" ? " (WSAA cacheado)" : ""}
                  </p>

                  {!padronResultado?.domicilio_fiscal_sugerido && (
                    <p className="text-xs text-amber-700">
                      ARCA no devolvió un domicilio fiscal usable para este CUIT.
                    </p>
                  )}

                  {!padronResultado?.condicion_iva_sugerida && (
                    <p className="text-xs text-amber-700">
                      ARCA no devolvió una condición frente al IVA inferible. Confirmala manualmente.
                    </p>
                  )}

                  {Array.isArray(padronResultado?.mensajes_padron) &&
                    padronResultado.mensajes_padron.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-medium text-slate-700">
                          Observaciones devueltas por ARCA:
                        </p>
                        <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                          {padronResultado.mensajes_padron.map((msg, index) => (
                            <li key={`${index}-${msg}`}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Razón social
              </label>
              <Input
                className="disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                placeholder={
                  form.id_impositiva === "DNI"
                    ? "No aplica para DNI"
                    : "Razón social"
                }
                maxLength={60}
                value={form.razon_social}
                disabled={esDni || razonSocialBloqueada}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    razon_social: e.target.value,
                  }))
                }
              />
              {esDni && (
                <p className="text-xs text-slate-500">
                  Para DNI no se guarda razón social.
                </p>
              )}

              {!esDni && razonSocialBloqueada && (
                <p className="text-xs text-slate-500">
                  Razón social completada por ARCA y bloqueada para evitar cambios manuales.
                </p>
              )}

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-slate-800">
                  {esDni
                    ? "Nombre de negocio/persona"
                    : "Nombre de negocio/persona (opcional)"}
                </label>
                <Input
                  placeholder={
                    esDni
                      ? "Nombre y apellido o cómo querés ubicarlo"
                      : "Nombre de fantasía"
                  }
                  maxLength={120}
                  value={form.nombre_fantasia}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      nombre_fantasia: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Condición frente al IVA
            </label>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100 disabled:text-slate-500"
              value={form.condicion_iva}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  condicion_iva: e.target.value,
                }))
              }
              disabled={condicionIvaBloqueada}
            >
              <option value="">Seleccionar condición</option>
              {CONDICIONES_IVA.map((condicion) => (
                <option key={condicion} value={condicion}>
                  {condicion}
                </option>
              ))}
            </select>

            {form.id_impositiva === "DNI" && (
              <p className="text-xs text-slate-500">
                Para DNI se toma automáticamente Consumidor Final.
              </p>
            )}

            {form.id_impositiva !== "DNI" && condicionIvaBloqueada && (
              <p className="text-xs text-slate-500">
                Condición frente al IVA completada por ARCA y bloqueada para evitar cambios manuales.
              </p>
            )}

            {form.id_impositiva !== "DNI" &&
              padronResultado?.fuente === "ARCA" &&
              !padronResultado?.condicion_iva_sugerida && (
                <p className="text-xs text-amber-700">
                  ARCA no pudo sugerir la condición frente al IVA para este CUIT. Seleccionala manualmente.
                </p>
              )}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Teléfono (opcional)
              </label>
              <div className="flex w-full items-stretch">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 h-10">
                  +549
                </span>
                <Input
                  placeholder="Ej: 11 2345 6789"
                  maxLength={30}
                  inputMode="numeric"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      telefono: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Email (opcional)
              </label>
              <Input
                type="email"
                placeholder="ejemplo@cliente.com"
                maxLength={120}
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Tipo de cliente
            </label>
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              value={form.tipo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tipo: e.target.value,
                }))
              }
            >
              <option value="Focacceria">Focacceria</option>
              <option value="Fiambreria">Fiambrería</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Distribuidora">Distribuidora</option>
              <option value="Frigorifico">Frigorífico</option>
              <option value="Particular">Particular</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {domicilioFiscalDesdeArca ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Domicilio fiscal
              </label>
              <Input
                className="disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                value={form.domicilio_fiscal}
                disabled
                readOnly
              />
              <p className="text-xs text-slate-500">
                Domicilio fiscal traído por ARCA. Cargá aparte el domicilio de entrega desde Google.
              </p>
            </div>
          ) : entregaIgualFiscalActiva ? (
            <AddressAutocompleteInput
              label="Domicilio fiscal (si lo seleccionás desde Google también será el domicilio de entrega)"
              value={form.domicilio_fiscal}
              placeholder="Ingresá y seleccioná la dirección"
              lat={form.domicilio_entrega_lat}
              lng={form.domicilio_entrega_lng}
              onTextChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  domicilio_fiscal: value,
                  domicilio_entrega: value,
                  domicilio_entrega_lat: null,
                  domicilio_entrega_lng: null,
                }))
              }
              onSelectAddress={(data) => {
                if (!data) {
                  setForm((prev) => ({
                    ...prev,
                    domicilio_entrega_lat: null,
                    domicilio_entrega_lng: null,
                  }));
                  return;
                }

                setForm((prev) => ({
                  ...prev,
                  domicilio_fiscal: data.formattedAddress,
                  domicilio_entrega: data.formattedAddress,
                  domicilio_entrega_lat: data.lat,
                  domicilio_entrega_lng: data.lng,
                }));
              }}
            />
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {esDni ? "Domicilio fiscal" : "Domicilio fiscal (opcional)"}
              </label>
              <Input
                placeholder="Domicilio fiscal"
                maxLength={120}
                value={form.domicilio_fiscal}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    domicilio_fiscal: e.target.value,
                  }))
                }
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="entregaIgualFiscal"
              type="checkbox"
              className="h-4 w-4"
              checked={entregaIgualFiscalActiva}
              disabled={domicilioFiscalDesdeArca}
              onChange={(e) => toggleEntregaIgual(e.target.checked)}
            />
            <label
              htmlFor="entregaIgualFiscal"
              className="text-sm text-slate-800"
            >
              Domicilio de entrega igual a domicilio fiscal
            </label>
          </div>

          {!form.domicilioEntregaIgualFiscal && (
            <AddressAutocompleteInput
              label="Domicilio de entrega"
              value={form.domicilio_entrega}
              placeholder="Ingresá y seleccioná la dirección"
              lat={form.domicilio_entrega_lat}
              lng={form.domicilio_entrega_lng}
              onTextChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  domicilio_entrega: value,
                  domicilio_entrega_lat: null,
                  domicilio_entrega_lng: null,
                }))
              }
              onSelectAddress={(data) => {
                if (!data) {
                  setForm((prev) => ({
                    ...prev,
                    domicilio_entrega_lat: null,
                    domicilio_entrega_lng: null,
                  }));
                  return;
                }

                setForm((prev) => ({
                  ...prev,
                  domicilio_entrega: data.formattedAddress,
                  domicilio_entrega_lat: data.lat,
                  domicilio_entrega_lng: data.lng,
                }));
              }}
            />
          )}

          {faltaSeleccionGoogleEntrega && (
            <p className="text-xs text-amber-700">
              La dirección de entrega quedó cargada como texto, pero todavía falta
              seleccionarla desde las sugerencias de Google para guardar.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Observaciones (opcional)
            </label>
            <Input
              placeholder="Notas"
              maxLength={200}
              value={form.observaciones}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  observaciones: e.target.value,
                }))
              }
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button
            type="button"
            className="w-full mt-2"
            disabled={!puedeCrear || creando}
            onClick={handleCrear}
          >
            {creando ? "Guardando..." : "Guardar cliente"}
          </Button>
        </CardContent>
      </Card>

      {clienteCreado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Cliente creado</h2>

              <div className="space-y-1 text-sm text-slate-800">
                <p><strong>N° cliente:</strong> {clienteCreado.id}</p>
                {clienteCreado.razon_social && (
                  <p><strong>Razón social:</strong> {clienteCreado.razon_social}</p>
                )}
                {clienteCreado.nombre_fantasia && (
                  <p><strong>Nombre de fantasía:</strong> {clienteCreado.nombre_fantasia}</p>
                )}
                <p>
                  <strong>{clienteCreado.id_impositiva}:</strong>{" "}
                  {clienteCreado.numero_impositivo}
                </p>
                <p>
                  <strong>Condición IVA:</strong> {clienteCreado.condicion_iva}
                </p>

                {clienteCreado.telefono && (
                  <p><strong>Teléfono:</strong> {clienteCreado.telefono}</p>
                )}

                {clienteCreado.email && (
                  <p><strong>Email:</strong> {clienteCreado.email}</p>
                )}

                {clienteCreado.domicilio_fiscal && (
                  <p><strong>Domicilio fiscal:</strong> {clienteCreado.domicilio_fiscal}</p>
                )}

                {clienteCreado.domicilio_entrega && (
                  <p><strong>Domicilio entrega:</strong> {clienteCreado.domicilio_entrega}</p>
                )}

                {clienteCreado.observaciones && (
                  <p><strong>Observaciones:</strong> {clienteCreado.observaciones}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={handleCerrarModal}>Aceptar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}