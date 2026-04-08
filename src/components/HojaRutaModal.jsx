import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { supabase } from "../supabaseClient";
import { formatFecha } from "../utils/pedidosUtils";
import DetallePedidoModal from "./DetallePedidoModal";

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

const buildWhatsappText = ({ fecha, ruta }) => {
  const lines = [
    `Hoja de ruta - ${formatFecha(fecha)}`,
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

export default function HojaRutaModal({
  abierto,
  fecha,
  pedidos,
  onClose,
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ruta, setRuta] = useState(null);
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const paradas = useMemo(() => buildParadas(pedidos), [pedidos]);

  useEffect(() => {
    if (!abierto) return;

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
              console.log("detalle error function:", body);
              detalle = body?.error || detalle;
            } catch {
              try {
                const text = await error.context.text();
                console.log("detalle error function texto:", text);
                detalle = text || detalle;
              } catch {
                // no-op
              }
            }
          }

          if (!cancelado) {
            setError(detalle);
            setRuta(null);
          }

          return;
        }

        if (!cancelado) {
          setRuta(data);
        }
      } catch (e) {
        console.error("error inesperado hoja de ruta:", e);
        if (!cancelado) {
          setError("Ocurrió un error inesperado al calcular la hoja de ruta.");
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

  const embedSrc = useMemo(
    () => buildEmbedSrc(ruta, apiKey),
    [ruta, apiKey]
  );

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

  const compartirPorWhatsapp = () => {
    if (!ruta) return;

    const text = buildWhatsappText({ fecha, ruta });

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
    if (!ruta) return;

    try {
      const text = buildWhatsappText({ fecha, ruta });
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
        <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-xl font-semibold">
                Hoja de ruta — {formatFecha(fecha)}
              </h2>
              <p className="text-sm text-slate-600">
                Origen fijo: {ORIGEN.label}
              </p>
            </div>

            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 p-5 lg:grid-cols-[390px_1fr]">
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
                    <div className="text-sm">
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
                      <div className="rounded-xl border border-dashed p-3 bg-slate-50">
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
              {embedSrc ? (
                <iframe
                  title="Mapa de hoja de ruta"
                  src={embedSrc}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
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