import React, { useMemo } from "react";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent } from "../../../shared/ui/card";

const formatFecha = (value) => {
  if (!value) return "-";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-AR");
};

const formatearMoneda = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return valor ?? "-";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
};

const nombreVisibleCliente = (cliente) => {
  return (
    cliente?.razon_social ||
    cliente?.nombre_fantasia ||
    `${cliente?.id_impositiva ?? ""} ${cliente?.numero_impositivo ?? ""}`.trim() ||
    `Cliente ${cliente?.id ?? ""}`
  );
};

const obtenerTotalPedido = (pedido) => {
  return pedido?.total ?? null;
};

const obtenerEstadoPedidoVisible = (pedido) => {
  if (pedido.estado_aprobacion === "Pendiente") {
    return "Pendiente de aprobación";
  }

  if (pedido.estado === "entregado") {
    return "Entregado";
  }

  return "Pendiente";
};

const badgeEstadoPedidoClass = (estadoVisible) => {
  if (estadoVisible === "Pendiente de aprobación") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (estadoVisible === "Entregado") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

const tieneCoordenadasEntrega = (cliente) => {
  return (
    cliente?.domicilio_entrega_lat != null &&
    cliente?.domicilio_entrega_lng != null
  );
};

export default function ClienteDetallePanel({
  cliente,
  pedidosHistorial = [],
  onVolver,
  onEditar,
  onVerHistorial,
  onEnviarMensaje,
}) {
  const pedidosCliente = useMemo(() => {
    if (!cliente?.id) return [];

    return (pedidosHistorial || [])
      .filter((pedido) => String(pedido.cliente_id) === String(cliente.id))
      .sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();

        const fechaB = new Date(b.fecha).getTime();

        return fechaB - fechaA;
      })
      .slice(0, 8);
  }, [cliente, pedidosHistorial]);

  if (!cliente) return null;

  const nombre = nombreVisibleCliente(cliente);

  const direccionEntrega = String(cliente.domicilio_entrega || "").trim();

  const puedeAbrirUbicacion =
    direccionEntrega || tieneCoordenadasEntrega(cliente);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const mapaQuery = tieneCoordenadasEntrega(cliente)
    ? `${cliente.domicilio_entrega_lat},${cliente.domicilio_entrega_lng}`
    : direccionEntrega;

  const mapaSrc =
    apiKey && mapaQuery
      ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
          apiKey
        )}&q=${encodeURIComponent(mapaQuery)}`
      : "";

  const copiarDireccion = async () => {
    if (!direccionEntrega) return;

    try {
      await navigator.clipboard.writeText(direccionEntrega);
    } catch (error) {
      console.error("No se pudo copiar la dirección", error);
    }
  };

  const abrirUbicacion = () => {
    if (!puedeAbrirUbicacion) return;

    const query = tieneCoordenadasEntrega(cliente)
      ? `${cliente.domicilio_entrega_lat},${cliente.domicilio_entrega_lng}`
      : direccionEntrega;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Button type="button" variant="outline" onClick={onVolver}>
            ← Volver
          </Button>

          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight">{nombre}</h2>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                ID cliente {cliente.id ?? "-"}
              </span>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  cliente.estado_aprobacion === "Aprobado"
                    ? "bg-emerald-50 text-emerald-700"
                    : cliente.estado_aprobacion === "Rechazado"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {cliente.estado_aprobacion || "-"}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {cliente.tipo || "-"}
              </span>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  cliente.activo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {cliente.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onEnviarMensaje?.(cliente)}>
            WhatsApp
          </Button>

          <Button type="button" variant="outline" onClick={() => onEditar?.(cliente)}>
            Editar datos
          </Button>

          <Button type="button" onClick={() => onVerHistorial?.(cliente)}>
            Ver historial
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="text-lg font-semibold">Datos comerciales</h3>
                <p className="text-sm text-slate-500">
                  Información principal del cliente.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Dato label="Razón social" value={cliente.razon_social} />
                <Dato label="Nombre de fantasía" value={cliente.nombre_fantasia} />
                <Dato
                  label="Documento"
                  value={`${cliente.id_impositiva || "-"} ${
                    cliente.numero_impositivo || ""
                  }`.trim()}
                />
                <Dato label="Condición IVA" value={cliente.condicion_iva} />
                <Dato label="Tipo de cliente" value={cliente.tipo} />
                <Dato label="Fecha de alta" value={formatFecha(cliente.created_at)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="text-lg font-semibold">Contacto</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Dato label="Teléfono" value={cliente.telefono} />
                <Dato label="Email" value={cliente.email} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Domicilios</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copiarDireccion}
                    disabled={!direccionEntrega}
                  >
                    Copiar dirección
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={abrirUbicacion}
                    disabled={!puedeAbrirUbicacion}
                  >
                    Abrir Maps
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Dato label="Domicilio fiscal" value={cliente.domicilio_fiscal} />
                <Dato label="Domicilio de entrega" value={cliente.domicilio_entrega} />
              </div>

              {mapaSrc ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <iframe
                    title={`Mapa de ${nombre}`}
                    src={mapaSrc}
                    className="h-[320px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No se puede mostrar el mapa porque falta la dirección, las coordenadas o la clave de Google Maps.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h3 className="text-lg font-semibold">Observaciones</h3>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {cliente.observaciones || "Sin observaciones."}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Últimos pedidos</h3>
                  <p className="text-sm text-slate-500">
                    Vista rápida del historial reciente.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onVerHistorial?.(cliente)}
                >
                  Ver todo
                </Button>
              </div>

              {pedidosCliente.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Este cliente no tiene pedidos registrados.
                </div>
              ) : (
                <div className="space-y-2">
                  {pedidosCliente.map((pedido) => {
                    const fechaPedido = pedido.fecha;

                    const estadoPedido = obtenerEstadoPedidoVisible(pedido);

                    return (
                      <div
                        key={pedido.id}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-950">
                              Pedido #{pedido.id}
                            </div>

                            <div className="text-xs text-slate-500">
                              {formatFecha(fechaPedido)}
                            </div>
                          </div>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-medium ${badgeEstadoPedidoClass(
                              estadoPedido
                            )}`}
                          >
                            {estadoPedido}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-1 text-xs text-slate-600">
                          <div>
                            Entrega:{" "}
                            <span className="font-medium">
                              {pedido.tipoEntrega || "-"}
                            </span>
                          </div>

                          <div>
                            Factura:{" "}
                            <span className="font-medium">
                              {pedido.tipo_factura || "-"}
                            </span>
                          </div>

                          <div>
                            Total:{" "}
                            <span className="font-medium">
                              {obtenerTotalPedido(pedido) != null
                                ? formatearMoneda(obtenerTotalPedido(pedido))
                                : "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Dato({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value || "-"}</div>
    </div>
  );
}