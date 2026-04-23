import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { supabase } from "../supabaseClient";
import { formatFecha } from "../utils/pedidosUtils";
import DetallePedidoModal from "./DetallePedidoModal";
import ClienteAutocomplete from "./ClienteAutocomplete";
import AddressAutocompleteInput from "./AddressAutocompleteInput";

const ORIGEN = {
  label:
    "BOK Santos Lugares Buenos Aires AR, Calixto Oyuela 1795, B1676",
  lat: -34.5965791,
  lng: -58.54992,
};

const WHATSAPP_FABIAN = import.meta.env.VITE_WHATSAPP_FABIAN || "";

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatMeters = (meters) => {
  if (!Number.isFinite(meters)) return "-";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) return "-";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
};

const formatDeltaSeconds = (seconds) => {
  if (!Number.isFinite(seconds)) return "-";
  const sign = seconds >= 0 ? "+" : "-";
  return `${sign}${formatSeconds(Math.abs(seconds))}`;
};

const formatDeltaMeters = (meters) => {
  if (!Number.isFinite(meters)) return "-";
  const sign = meters >= 0 ? "+" : "-";
  return `${sign}${formatMeters(Math.abs(meters))}`;
};

const normalizarPedidoParaDetalle = (pedido) => ({
  ...pedido,
  cliente: pedido.cliente ?? pedido.cliente_nombre ?? "-",
  tipoEntrega: pedido.tipoEntrega ?? pedido.tipo_entrega ?? "-",
  direccion_entrega:
    pedido.direccion_entrega ??
    pedido.domicilio_entrega ??
    "-",
  fecha: pedido.fecha ?? pedido.fecha_solicitada ?? "-",
  notas: pedido.notas ?? pedido.observaciones ?? "-",
});

const buildParadas = (pedidos) =>
  pedidos
    .map((p, index) => ({
      id: p.id ?? `${p.cliente ?? "pedido"}-${index}`,
      cliente: p.cliente ?? p.cliente_nombre ?? "Cliente sin nombre",
      direccion:
        p.direccion_entrega ??
        p.domicilio_entrega ??
        "",
      lat: toNumberOrNull(
        p.domicilio_entrega_lat ??
          p.direccion_entrega_lat ??
          null
      ),
      lng: toNumberOrNull(
        p.domicilio_entrega_lng ??
          p.direccion_entrega_lng ??
          null
      ),
      pedidoDetalle: normalizarPedidoParaDetalle(p),
    }))
    .filter(
      (p) =>
        (p.lat !== null && p.lng !== null) ||
        String(p.direccion || "").trim() !== ""
    );

const locationString = (parada) => {
  if (
    parada?.lat !== null &&
    parada?.lat !== undefined &&
    parada?.lng !== null &&
    parada?.lng !== undefined
  ) {
    return `${parada.lat},${parada.lng}`;
  }
  return parada?.direccion ?? "";
};

const buildEmbedSrc = (ruta, apiKey) => {
  if (!ruta?.paradasOrdenadas?.length || !apiKey) return null;

  const orderedStops = ruta.paradasOrdenadas;
  const destination = `${ORIGEN.lat},${ORIGEN.lng}`;

  const waypoints = orderedStops
    .map(locationString)
    .filter(Boolean)
    .join("|");

  const params = new URLSearchParams({
    key: apiKey,
    origin: `${ORIGEN.lat},${ORIGEN.lng}`,
    destination,
    mode: "driving",
  });

  if (waypoints) params.set("waypoints", waypoints);

  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
};

const buildWhatsappText = ({ fecha, ruta, titulo = "Hoja de ruta" }) => {
  const lines = [
    `${titulo} - ${formatFecha(fecha)}`,
    `Distancia estimada total: ${formatMeters(ruta?.distanciaMetros)}`,
    `Tiempo estimado total: ${formatSeconds(ruta?.duracionSegundos)}`,
    "",
    "Paradas:",
  ];

  let acumuladoSegundos = 0;
  let acumuladoMetros = 0;

  (ruta?.paradasOrdenadas ?? []).forEach((parada, idx) => {
    acumuladoSegundos += parada.duracionDesdeAnteriorSegundos ?? 0;
    acumuladoMetros += parada.distanciaDesdeAnteriorMetros ?? 0;

    lines.push(
      `${idx + 1}. ${parada.cliente} - ${
        parada.direccion || locationString(parada)
      }`
    );
    lines.push(
      `   Desde anterior: ${formatSeconds(
        parada.duracionDesdeAnteriorSegundos
      )} · ${formatMeters(parada.distanciaDesdeAnteriorMetros)}`
    );
    lines.push(
      `   Acumulado: ${formatSeconds(acumuladoSegundos)} · ${formatMeters(
        acumuladoMetros
      )}`
    );
  });

  if (ruta?.retornoABase) {
    lines.push("");
    lines.push(
      `Vuelta a base: ${formatSeconds(
        ruta.retornoABase.duracionSegundos
      )} · ${formatMeters(ruta.retornoABase.distanciaMetros)}`
    );
  }

  return lines.join("\n");
};

const normalizarClienteOpcion = (cliente, index) => ({
  id:
    cliente?.id ??
    cliente?.cliente_id ??
    cliente?.numero_impositivo ??
    `cliente-${index}`,
  nombre:
    cliente?.razon_social ??
    cliente?.nombre ??
    cliente?.cliente ??
    `Cliente ${index + 1}`,
  direccion:
    cliente?.domicilio_entrega ??
    cliente?.direccion_entrega ??
    cliente?.domicilio ??
    "",
  lat: toNumberOrNull(
    cliente?.domicilio_entrega_lat ??
      cliente?.direccion_entrega_lat ??
      null
  ),
  lng: toNumberOrNull(
    cliente?.domicilio_entrega_lng ??
      cliente?.direccion_entrega_lng ??
      null
  ),
});

const getImpactoInfo = (deltaSegundos, totalSegundos) => {
  // rojo: impacto > 50 min o recorrido total > 5 hs
  if (deltaSegundos > 50 * 60 || totalSegundos > 5 * 3600) {
    return {
      key: "rojo",
      label: "Rojo",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      boxClass: "border-red-200 bg-red-50",
      textClass: "text-red-700",
    };
  }

  // amarillo: impacto >= 30 min
  if (deltaSegundos >= 30 * 60) {
    return {
      key: "amarillo",
      label: "Amarillo",
      badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
      boxClass: "border-yellow-200 bg-yellow-50",
      textClass: "text-yellow-800",
    };
  }

  return {
    key: "verde",
    label: "Verde",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    boxClass: "border-emerald-200 bg-emerald-50",
    textClass: "text-emerald-700",
  };
};

const buildDescripcionInsercion = (ruta, paradaId) => {
  const stops = ruta?.paradasOrdenadas ?? [];
  const index = stops.findIndex((p) => String(p.id) === String(paradaId));

  if (index === -1) return "No se pudo determinar la posición de la nueva parada.";

  const anterior = index > 0 ? stops[index - 1] : null;
  const siguiente = index < stops.length - 1 ? stops[index + 1] : null;

  if (!anterior && siguiente) {
    return `Se ubicaría como parada ${index + 1}, antes de ${siguiente.cliente}.`;
  }

  if (anterior && siguiente) {
    return `Se ubicaría como parada ${index + 1}, entre ${anterior.cliente} y ${siguiente.cliente}.`;
  }

  if (anterior && !siguiente) {
    return `Se ubicaría como parada ${index + 1}, después de ${anterior.cliente}.`;
  }

  return `Se ubicaría como parada ${index + 1}.`;
};

const invokeCalcularHojaRuta = async ({ fecha, paradas }) => {
  const { data, error } = await supabase.functions.invoke(
    "calcular-hoja-ruta",
    {
      body: {
        fecha,
        paradas,
      },
    }
  );

  if (error) {
    let detalle = error.message || "No se pudo calcular la hoja de ruta.";

    if (error.context) {
      try {
        const body = await error.context.json();
        detalle = body?.error || detalle;
      } catch {
        try {
          const text = await error.context.text();
          detalle = text || detalle;
        } catch {
          // no-op
        }
      }
    }

    throw new Error(detalle);
  }

  return data;
};

export default function HojaRutaModal({
  abierto,
  fecha,
  pedidos,
  clientes = [],
  onClose,
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ruta, setRuta] = useState(null);
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [modoNuevaParada, setModoNuevaParada] = useState("cliente");
  const [clienteSeleccionado, setClienteSeleccionadoId] = useState(null);
  const [usarDireccionCliente, setUsarDireccionCliente] = useState(true);
  const [direccionSimulada, setDireccionSimulada] = useState({
    texto: "",
    lat: null,
    lng: null,
  });
  const [cargandoSimulacion, setCargandoSimulacion] = useState(false);
  const [errorSimulacion, setErrorSimulacion] = useState("");
  const [simulacion, setSimulacion] = useState(null);
  const [mapaActivo, setMapaActivo] = useState("actual");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const paradas = useMemo(() => buildParadas(pedidos), [pedidos]);

  const clientesOptions = useMemo(
    () =>
      (clientes ?? [])
        .map((cliente, index) => normalizarClienteOpcion(cliente, index))
        .filter((cliente) => String(cliente.nombre || "").trim() !== ""),
    [clientes]
  );

  const hayDireccionSimulada = direccionSimulada.texto.trim().length > 0;

  const direccionSimuladaOK =
    !hayDireccionSimulada ||
    (direccionSimulada.lat != null && direccionSimulada.lng != null);

  const requiereDireccionGoogle =
    modoNuevaParada === "manual" ||
    (modoNuevaParada === "cliente" && !usarDireccionCliente);

  const puedeSimularNuevaParada = (() => {
    if (!ruta || cargandoSimulacion) return false;

    if (modoNuevaParada === "cliente") {
      if (!clienteSeleccionado) return false;

      if (usarDireccionCliente) {
        return (
          String(clienteSeleccionado?.direccion || "").trim().length > 0 ||
          (clienteSeleccionado?.lat != null && clienteSeleccionado?.lng != null)
        );
      }

      return hayDireccionSimulada && direccionSimuladaOK;
    }

    return hayDireccionSimulada && direccionSimuladaOK;
  })();

  useEffect(() => {
    if (!abierto) {
      setMostrarSimulador(false);
      setModoNuevaParada("cliente");
      setClienteSeleccionadoId(null);
      setUsarDireccionCliente(true);
      setDireccionSimulada({
        texto: "",
        lat: null,
        lng: null,
      });
      setCargandoSimulacion(false);
      setErrorSimulacion("");
      setSimulacion(null);
      setMapaActivo("actual");
      setPedidoDetalle(null);
      return;
    }

    let cancelado = false;

    const cargar = async () => {
      if (paradas.length === 0) {
        setRuta(null);
        setError("No hay envíos con dirección o coordenadas válidas para esa fecha.");
        return;
      }

      setCargando(true);
      setError("");
      setRuta(null);

      try {
        const data = await invokeCalcularHojaRuta({
          fecha,
          paradas,
        });

        if (!cancelado) {
          setRuta(data);
        }
      } catch (e) {
        console.error("error hoja de ruta:", e);
        if (!cancelado) {
          setError(e.message || "Ocurrió un error inesperado al calcular la hoja de ruta.");
          setRuta(null);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [abierto, fecha, paradas]);

  const embedSrcActual = useMemo(
    () => buildEmbedSrc(ruta, apiKey),
    [ruta, apiKey]
  );

  const embedSrcSimulada = useMemo(
    () => buildEmbedSrc(simulacion?.ruta, apiKey),
    [simulacion, apiKey]
  );

  const embedSrc =
    mapaActivo === "simulada" && embedSrcSimulada
      ? embedSrcSimulada
      : embedSrcActual;

  const rutaParaAcciones =
    mapaActivo === "simulada" && simulacion?.ruta ? simulacion.ruta : ruta;

  const tituloRutaParaAcciones =
    mapaActivo === "simulada" && simulacion?.ruta
      ? "Simulación de hoja de ruta"
      : "Hoja de ruta";

  const paradasConAcumulado = useMemo(() => {
    let acumuladoSegundos = 0;
    let acumuladoMetros = 0;

    return (ruta?.paradasOrdenadas ?? []).map((parada) => {
      acumuladoSegundos += parada.duracionDesdeAnteriorSegundos ?? 0;
      acumuladoMetros += parada.distanciaDesdeAnteriorMetros ?? 0;

      return {
        ...parada,
        duracionAcumuladaSegundos: acumuladoSegundos,
        distanciaAcumuladaMetros: acumuladoMetros,
      };
    });
  }, [ruta]);

  const construirParadaCandidata = () => {
    if (modoNuevaParada === "cliente") {
      if (!clienteSeleccionado) {
        throw new Error("Seleccioná un cliente para simular la nueva parada.");
      }

      if (usarDireccionCliente) {
        const direccionCliente = String(clienteSeleccionado.direccion || "").trim();

        if (
          !direccionCliente &&
          (clienteSeleccionado.lat === null || clienteSeleccionado.lng === null)
        ) {
          throw new Error(
            "El cliente seleccionado no tiene dirección de entrega válida."
          );
        }

        return {
          id: "simulacion-nueva-parada",
          cliente: clienteSeleccionado.nombre,
          direccion: direccionCliente,
          lat: clienteSeleccionado.lat,
          lng: clienteSeleccionado.lng,
          pedidoDetalle: null,
        };
      }

      const direccion = String(direccionSimulada.texto || "").trim();

      if (!direccion) {
        throw new Error("Ingresá una dirección para la simulación.");
      }

      if (direccionSimulada.lat == null || direccionSimulada.lng == null) {
        throw new Error(
          "Seleccioná una sugerencia de Google para validar la dirección."
        );
      }

      return {
        id: "simulacion-nueva-parada",
        cliente: clienteSeleccionado.nombre,
        direccion,
        lat: direccionSimulada.lat,
        lng: direccionSimulada.lng,
        pedidoDetalle: null,
      };
    }

    const direccion = String(direccionSimulada.texto || "").trim();

    if (!direccion) {
      throw new Error("Ingresá una dirección para la nueva parada.");
    }

    if (direccionSimulada.lat == null || direccionSimulada.lng == null) {
      throw new Error(
        "Seleccioná una sugerencia de Google para validar la dirección."
      );
    }

    return {
      id: "simulacion-nueva-parada",
      cliente: "Nueva parada",
      direccion,
      lat: direccionSimulada.lat,
      lng: direccionSimulada.lng,
      pedidoDetalle: null,
    };
  };

  const simularNuevaParada = async () => {
    if (!ruta) return;

    try {
      setCargandoSimulacion(true);
      setErrorSimulacion("");
      setSimulacion(null);

      const paradaCandidata = construirParadaCandidata();
      const paradasSimuladas = [...paradas, paradaCandidata];

      const rutaSimulada = await invokeCalcularHojaRuta({
        fecha,
        paradas: paradasSimuladas,
      });

      const deltaTiempoSegundos =
        (rutaSimulada?.duracionSegundos ?? 0) - (ruta?.duracionSegundos ?? 0);

      const deltaDistanciaMetros =
        (rutaSimulada?.distanciaMetros ?? 0) - (ruta?.distanciaMetros ?? 0);

      const impacto = getImpactoInfo(
        deltaTiempoSegundos,
        rutaSimulada?.duracionSegundos ?? 0
      );

      const descripcionInsercion = buildDescripcionInsercion(
        rutaSimulada,
        paradaCandidata.id
      );

      setSimulacion({
        paradaCandidata,
        ruta: rutaSimulada,
        deltaTiempoSegundos,
        deltaDistanciaMetros,
        impacto,
        descripcionInsercion,
      });

      setMapaActivo("simulada");
    } catch (e) {
      console.error("error simulando nueva parada:", e);
      setErrorSimulacion(
        e.message || "No se pudo simular la nueva parada."
      );
    } finally {
      setCargandoSimulacion(false);
    }
  };

  const limpiarSimulacion = () => {
    setSimulacion(null);
    setErrorSimulacion("");
    setMapaActivo("actual");
  };

  const compartirPorWhatsapp = () => {
    if (!rutaParaAcciones) return;

    const text = buildWhatsappText({
      fecha,
      ruta: rutaParaAcciones,
      titulo: tituloRutaParaAcciones,
    });

    if (WHATSAPP_FABIAN) {
      const url = `https://wa.me/${WHATSAPP_FABIAN}?text=${encodeURIComponent(
        text
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    navigator.clipboard?.writeText(text);
    window.alert(
      "No configuraste VITE_WHATSAPP_FABIAN. Te copié la hoja de ruta al portapapeles."
    );
  };

  const copiarHojaRuta = async () => {
    if (!rutaParaAcciones) return;

    try {
      const text = buildWhatsappText({
        fecha,
        ruta: rutaParaAcciones,
        titulo: tituloRutaParaAcciones,
      });
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("No se pudo copiar la hoja de ruta", error);
    }
  };

  const abrirDetallePedido = (parada) => {
    if (!parada?.pedidoDetalle) return;
    setPedidoDetalle(parada.pedidoDetalle);
  };

  const cerrarDetallePedido = () => setPedidoDetalle(null);

  if (!abierto) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 px-4 py-6">
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-xl font-semibold">
                Hoja de ruta — {formatFecha(fecha)}
              </h2>
            </div>

            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 p-5 lg:grid-cols-[430px_1fr]">
            <div className="min-h-0 overflow-y-auto rounded-xl border p-4">
              {cargando && (
                <p className="text-sm text-slate-600">Calculando hoja de ruta...</p>
              )}

              {!cargando && error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              {!cargando && !error && ruta && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Paradas:</span>{" "}
                        {paradasConAcumulado.length}
                      </div>
                      <div>
                        <span className="font-semibold">Distancia total:</span>{" "}
                        {formatMeters(ruta.distanciaMetros)}
                      </div>
                      <div>
                        <span className="font-semibold">Tiempo total:</span>{" "}
                        {formatSeconds(ruta.duracionSegundos)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Validación de nueva parada
                      </div>

                      <Button
                        variant={mostrarSimulador ? "outline" : "default"}
                        onClick={() => setMostrarSimulador((value) => !value)}
                      >
                        {mostrarSimulador ? "Ocultar" : "Validar nueva parada"}
                      </Button>
                    </div>

                    {mostrarSimulador && (
                      <div className="mt-4 space-y-3">
                        <div className="grid gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-700">
                              Modo
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant={modoNuevaParada === "cliente" ? "default" : "outline"}
                                onClick={() => {
                                  setModoNuevaParada("cliente");
                                  setClienteSeleccionadoId(null);
                                  setUsarDireccionCliente(true);
                                  setDireccionSimulada({
                                    texto: "",
                                    lat: null,
                                    lng: null,
                                  });
                                  setErrorSimulacion("");
                                }}
                                className="w-full"
                              >
                                Cliente existente
                              </Button>

                              <Button
                                type="button"
                                variant={modoNuevaParada === "manual" ? "default" : "outline"}
                                onClick={() => {
                                  setModoNuevaParada("manual");
                                  setClienteSeleccionadoId(null);
                                  setUsarDireccionCliente(true);
                                  setDireccionSimulada({
                                    texto: "",
                                    lat: null,
                                    lng: null,
                                  });
                                  setErrorSimulacion("");
                                }}
                                className="w-full"
                              >
                                Dirección manual
                              </Button>
                            </div>
                          </div>

                          {modoNuevaParada === "cliente" ? (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">
                                  Cliente
                                </label>

                                <ClienteAutocomplete
                                  clientes={clientesOptions}
                                  value={clienteSeleccionado}
                                  onSelect={(cliente) => {
                                    setClienteSeleccionadoId(cliente);
                                    setErrorSimulacion("");
                                  }}
                                  placeholder="Buscar cliente por nombre o dirección..."
                                />
                              </div>

                              <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={usarDireccionCliente}
                                  onChange={(e) => {
                                    setUsarDireccionCliente(e.target.checked);
                                    setDireccionSimulada({
                                      texto: "",
                                      lat: null,
                                      lng: null,
                                    });
                                    setErrorSimulacion("");
                                  }}
                                />
                                Usar dirección de entrega guardada del cliente
                              </label>

                              {usarDireccionCliente && clienteSeleccionado && (
                                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                  <span className="font-medium text-slate-800">
                                    Dirección actual:
                                  </span>{" "}
                                  {clienteSeleccionado.direccion || "Sin dirección guardada"}
                                </div>
                              )}

                              {!usarDireccionCliente && (
                                <AddressAutocompleteInput
                                  label="Dirección alternativa para la simulación"
                                  value={direccionSimulada.texto}
                                  placeholder="Ingresá y seleccioná la dirección"
                                  lat={direccionSimulada.lat}
                                  lng={direccionSimulada.lng}
                                  onTextChange={(value) =>
                                    setDireccionSimulada({
                                      texto: value,
                                      lat: null,
                                      lng: null,
                                    })
                                  }
                                  onSelectAddress={(data) => {
                                    if (!data) {
                                      setDireccionSimulada((prev) => ({
                                        ...prev,
                                        lat: null,
                                        lng: null,
                                      }));
                                      return;
                                    }

                                    setDireccionSimulada({
                                      texto: data.formattedAddress,
                                      lat: data.lat,
                                      lng: data.lng,
                                    });
                                  }}
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <AddressAutocompleteInput
                                label="Dirección"
                                value={direccionSimulada.texto}
                                placeholder="Ingresá y seleccioná la dirección"
                                lat={direccionSimulada.lat}
                                lng={direccionSimulada.lng}
                                onTextChange={(value) =>
                                  setDireccionSimulada({
                                    texto: value,
                                    lat: null,
                                    lng: null,
                                  })
                                }
                                onSelectAddress={(data) => {
                                  if (!data) {
                                    setDireccionSimulada((prev) => ({
                                      ...prev,
                                      lat: null,
                                      lng: null,
                                    }));
                                    return;
                                  }

                                  setDireccionSimulada({
                                    texto: data.formattedAddress,
                                    lat: data.lat,
                                    lng: data.lng,
                                  });
                                }}
                              />
                            </>
                          )}
                        </div>

                        {requiereDireccionGoogle && hayDireccionSimulada && !direccionSimuladaOK && (
                          <p className="text-xs text-amber-700">
                            Seleccioná una sugerencia de Google para validar la dirección.
                          </p>
                        )}

                        {errorSimulacion && (
                          <p className="text-sm text-red-600">{errorSimulacion}</p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={simularNuevaParada}
                            disabled={!puedeSimularNuevaParada}
                          >
                            {cargandoSimulacion ? "Simulando..." : "Simular impacto"}
                          </Button>

                          {simulacion && (
                            <Button variant="outline" onClick={limpiarSimulacion}>
                              Limpiar simulación
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {simulacion && (
                    <div
                      className={`rounded-xl border p-3 ${simulacion.impacto.boxClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          Resultado de la simulación
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${simulacion.impacto.badgeClass}`}
                        >
                          {simulacion.impacto.label}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-white/70 p-2">
                          <div className="text-xs text-slate-500">Ruta actual</div>
                          <div className="font-medium text-slate-800">
                            {formatSeconds(ruta.duracionSegundos)} ·{" "}
                            {formatMeters(ruta.distanciaMetros)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white/70 p-2">
                          <div className="text-xs text-slate-500">Con nueva parada</div>
                          <div className="font-medium text-slate-800">
                            {formatSeconds(simulacion.ruta.duracionSegundos)} ·{" "}
                            {formatMeters(simulacion.ruta.distanciaMetros)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white/70 p-2">
                          <div className="text-xs text-slate-500">Impacto en tiempo</div>
                          <div className={`font-medium ${simulacion.impacto.textClass}`}>
                            {formatDeltaSeconds(simulacion.deltaTiempoSegundos)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-white/70 p-2">
                          <div className="text-xs text-slate-500">Impacto en distancia</div>
                          <div className="font-medium text-slate-800">
                            {formatDeltaMeters(simulacion.deltaDistanciaMetros)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-700">
                        <span className="font-medium">Ubicación estimada:</span>{" "}
                        {simulacion.descripcionInsercion}
                      </div>

                      <div className="mt-2 text-xs text-slate-600">
                        Regla del semáforo: rojo si suma más de 50 min o si la ruta total
                        supera 5 hs; amarillo si suma 30 min o más; verde si suma menos de
                        30 min.
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {paradasConAcumulado.map((parada, index) => (
                      <div
                        key={parada.id ?? `${parada.cliente}-${index}`}
                        className="rounded-xl border p-3"
                      >
                        <button
                          type="button"
                          className="text-left text-sm font-semibold text-slate-900 hover:underline"
                          onClick={() => abrirDetallePedido(parada)}
                        >
                          {index + 1}. {parada.cliente}
                        </button>

                        <div className="mt-1 text-sm text-slate-600">
                          {parada.direccion || locationString(parada)}
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <div>
                            Desde anterior:{" "}
                            <span className="font-medium text-slate-700">
                              {formatSeconds(parada.duracionDesdeAnteriorSegundos)} ·{" "}
                              {formatMeters(parada.distanciaDesdeAnteriorMetros)}
                            </span>
                          </div>
                          <div>
                            Acumulado:{" "}
                            <span className="font-medium text-slate-700">
                              {formatSeconds(parada.duracionAcumuladaSegundos)} ·{" "}
                              {formatMeters(parada.distanciaAcumuladaMetros)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {ruta.retornoABase && (
                      <div className="rounded-xl border border-dashed bg-slate-50 p-3">
                        <div className="text-sm font-semibold text-slate-900">
                          Vuelta
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {formatSeconds(ruta.retornoABase.duracionSegundos)} ·{" "}
                            {formatMeters(ruta.retornoABase.distanciaMetros)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={compartirPorWhatsapp}>
                      Compartir a Fabián
                    </Button>

                    <Button variant="outline" onClick={copiarHojaRuta}>
                      Copiar hoja de ruta
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-[420px] overflow-hidden rounded-xl border bg-slate-50">
              <div className="flex items-center justify-between border-b bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {mapaActivo === "simulada" && simulacion?.ruta
                      ? "Mapa simulado"
                      : "Mapa actual"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {mapaActivo === "simulada" && simulacion?.ruta
                      ? "Visualizando la ruta con la nueva parada"
                      : "Visualizando la hoja de ruta actual"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={mapaActivo === "actual" ? "default" : "outline"}
                    onClick={() => setMapaActivo("actual")}
                  >
                    Actual
                  </Button>

                  {simulacion?.ruta && (
                    <Button
                      variant={mapaActivo === "simulada" ? "default" : "outline"}
                      onClick={() => setMapaActivo("simulada")}
                    >
                      Simulada
                    </Button>
                  )}
                </div>
              </div>

              {embedSrc ? (
                <iframe
                  title="Mapa de hoja de ruta"
                  src={embedSrc}
                  className="h-[calc(100%-61px)] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-[calc(100%-61px)] items-center justify-center p-6 text-center text-sm text-slate-600">
                  {!apiKey
                    ? "Falta VITE_GOOGLE_MAPS_API_KEY para mostrar el mapa embebido."
                    : "No se pudo mostrar el mapa embebido para esta ruta."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DetallePedidoModal
        pedido={pedidoDetalle}
        onClose={cerrarDetallePedido}
      />
    </>
  );
}