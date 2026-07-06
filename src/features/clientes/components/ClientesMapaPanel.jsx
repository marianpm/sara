import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent } from "../../../shared/ui/card";
import { supabase } from "../../../shared/lib/supabaseClient";

const ORIGEN = {
  label: "Sarria / BOK Santos Lugares",
  lat: -34.5965791,
  lng: -58.54992,
};

const TIPOS_CLIENTE = [
  "todos",
  "Fiambreria",
  "Restaurant",
  "Distribuidora",
  "Particular",
  "Frigorifico",
  "Focacceria",
  "Otro",
];

let googleMapsPromise = null;

function cargarGoogleMaps(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const scriptExistente = document.getElementById("sara-google-maps-js");

    if (scriptExistente) {
      scriptExistente.addEventListener("load", () => resolve(window.google.maps));
      scriptExistente.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "sara-google-maps-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizarTexto = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const nombreVisibleCliente = (cliente) => {
  return (
    cliente.razon_social ||
    cliente.nombre_fantasia ||
    `${cliente.id_impositiva ?? ""} ${cliente.numero_impositivo ?? ""}`.trim() ||
    `Cliente ${cliente.id}`
  );
};

const telefonoWhatsApp = (telefono) => {
  let soloNumeros = String(telefono || "").replace(/\D/g, "");

  if (!soloNumeros) return null;
  if (soloNumeros.startsWith("549")) return soloNumeros;
  if (soloNumeros.startsWith("54")) return soloNumeros;

  if (soloNumeros.startsWith("0")) {
    soloNumeros = soloNumeros.slice(1);
  }

  return `549${soloNumeros}`;
};

const abrirUbicacionCliente = (cliente) => {
  const lat = toNumberOrNull(cliente.domicilio_entrega_lat);
  const lng = toNumberOrNull(cliente.domicilio_entrega_lng);

  const query =
    lat != null && lng != null
      ? `${lat},${lng}`
      : cliente.domicilio_entrega || "";

  if (!query) return;

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;

  window.open(url, "_blank", "noopener,noreferrer");
};

const abrirMensajeCliente = (cliente) => {
  const telefono = telefonoWhatsApp(cliente?.telefono);
  if (!telefono) return;

  const texto = `Hola ${nombreVisibleCliente(
    cliente
  )}, te escribimos de Sarria.`;

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;

  window.open(url, "_blank", "noopener,noreferrer");
};

export default function ClientesMapaPanel() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const mapaDivRef = useRef(null);
  const mapaRef = useRef(null);
  const markersRef = useRef([]);

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const cargarClientesMapa = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const { data, error: clientesError } = await supabase
        .from("clientes")
        .select(
          `
          id,
          razon_social,
          nombre_fantasia,
          id_impositiva,
          numero_impositivo,
          tipo,
          activo,
          estado_aprobacion,
          telefono,
          email,
          domicilio_entrega,
          domicilio_entrega_lat,
          domicilio_entrega_lng
        `
        )
        .not("domicilio_entrega_lat", "is", null)
        .not("domicilio_entrega_lng", "is", null)
        .order("razon_social", { ascending: true })
        .limit(1000);

      if (clientesError) throw clientesError;

      setClientes(data || []);
    } catch (err) {
      console.error("Error cargando clientes para mapa:", err);
      setError(err?.message || "No se pudieron cargar los clientes en el mapa.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientesMapa();
  }, [cargarClientesMapa]);

  const clientesConCoordenadas = useMemo(() => {
    return (clientes || [])
      .map((cliente) => ({
        ...cliente,
        lat: toNumberOrNull(cliente.domicilio_entrega_lat),
        lng: toNumberOrNull(cliente.domicilio_entrega_lng),
      }))
      .filter((cliente) => cliente.lat != null && cliente.lng != null);
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return clientesConCoordenadas.filter((cliente) => {
      if (filtroTipo !== "todos" && cliente.tipo !== filtroTipo) {
        return false;
      }

      if (!texto) return true;

      const searchable = normalizarTexto(
        [
          nombreVisibleCliente(cliente),
          cliente.domicilio_entrega,
          cliente.tipo,
          cliente.telefono,
          cliente.email,
          cliente.numero_impositivo,
        ].join(" ")
      );

      return searchable.includes(texto);
    });
  }, [clientesConCoordenadas, busqueda, filtroTipo]);

  useEffect(() => {
    if (!apiKey || !mapaDivRef.current) return;

    let cancelado = false;

    const dibujarMapa = async () => {
      try {
        const maps = await cargarGoogleMaps(apiKey);

        if (cancelado || !mapaDivRef.current) return;

        if (!mapaRef.current) {
          mapaRef.current = new maps.Map(mapaDivRef.current, {
            center: {
              lat: ORIGEN.lat,
              lng: ORIGEN.lng,
            },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        const mapa = mapaRef.current;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        const bounds = new maps.LatLngBounds();

        const markerOrigen = new maps.Marker({
          position: {
            lat: ORIGEN.lat,
            lng: ORIGEN.lng,
          },
          map: mapa,
          title: ORIGEN.label,
          label: "S",
        });

        markersRef.current.push(markerOrigen);
        bounds.extend(markerOrigen.getPosition());

        clientesFiltrados.forEach((cliente) => {
          const marker = new maps.Marker({
            position: {
              lat: cliente.lat,
              lng: cliente.lng,
            },
            map: mapa,
            title: nombreVisibleCliente(cliente),
          });

          marker.addListener("click", () => {
            setClienteSeleccionado(cliente);
          });

          markersRef.current.push(marker);
          bounds.extend(marker.getPosition());
        });

        if (clientesFiltrados.length > 0) {
          mapa.fitBounds(bounds, 60);
        } else {
          mapa.setCenter({
            lat: ORIGEN.lat,
            lng: ORIGEN.lng,
          });
          mapa.setZoom(11);
        }
      } catch (err) {
        console.error("Error inicializando Google Maps:", err);
        setError(err?.message || "No se pudo mostrar el mapa.");
      }
    };

    dibujarMapa();

    return () => {
      cancelado = true;
    };
  }, [apiKey, clientesFiltrados]);

  const clientesSinCoordenadas = clientes.length - clientesConCoordenadas.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="text-xl font-semibold">Clientes en mapa</h2>
            <p className="text-sm text-slate-500">
              Visualización interna de clientes con domicilio de entrega validado.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px] lg:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: Ciudadela, fiambrería, cliente..."
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              >
                {TIPOS_CLIENTE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo === "todos" ? "Todos los tipos" : tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Clientes en mapa</div>
              <div className="text-2xl font-bold">
                {clientesFiltrados.length}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">Con coordenadas</div>
              <div className="text-2xl font-bold">
                {clientesConCoordenadas.length}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs text-amber-700">Sin coordenadas</div>
              <div className="text-2xl font-bold text-amber-800">
                {clientesSinCoordenadas}
              </div>
            </div>
          </div>

          {!apiKey && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Falta configurar VITE_GOOGLE_MAPS_API_KEY para mostrar el mapa.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="h-[620px] p-0">
            <div
              ref={mapaDivRef}
              className="h-full w-full rounded-2xl bg-slate-100"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-[620px] flex-col p-0">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">Clientes visibles</h3>
              <p className="text-sm text-slate-500">
                Tocá un pin o un cliente para ver el detalle.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {clientesFiltrados.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No hay clientes para mostrar con los filtros actuales.
                </p>
              ) : (
                <div className="space-y-2">
                  {clientesFiltrados.map((cliente) => {
                    const seleccionado =
                      clienteSeleccionado &&
                      String(clienteSeleccionado.id) === String(cliente.id);

                    return (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => {
                          setClienteSeleccionado(cliente);

                          if (mapaRef.current) {
                            mapaRef.current.panTo({
                              lat: cliente.lat,
                              lng: cliente.lng,
                            });
                            mapaRef.current.setZoom(15);
                          }
                        }}
                        className={[
                          "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                          seleccionado
                            ? "border-slate-900 bg-slate-100"
                            : "border-slate-200 bg-white hover:border-slate-400",
                        ].join(" ")}
                      >
                        <div className="font-medium text-slate-950">
                          {nombreVisibleCliente(cliente)}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {cliente.tipo || "-"} ·{" "}
                          {cliente.estado_aprobacion || "-"}
                        </div>

                        <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                          {cliente.domicilio_entrega || "-"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {clienteSeleccionado && (
              <div className="border-t bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">
                  {nombreVisibleCliente(clienteSeleccionado)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {clienteSeleccionado.tipo || "-"} ·{" "}
                  {clienteSeleccionado.estado_aprobacion || "-"}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  {clienteSeleccionado.domicilio_entrega || "-"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => abrirUbicacionCliente(clienteSeleccionado)}
                  >
                    Abrir Maps
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => abrirMensajeCliente(clienteSeleccionado)}
                    disabled={!telefonoWhatsApp(clienteSeleccionado.telefono)}
                  >
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}