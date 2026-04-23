import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  formatFecha,
  agruparPorFecha,
  pedidoEstaPesado,
  filtrarPedidosPorFecha,
} from "./utils/pedidosUtils";
import DetallePedidoModal from "./components/DetallePedidoModal";
import FacturacionPedidoModal from "./components/FacturacionPedidoModal";

function getFacturaEstadoMeta(estado) {
  switch (estado) {
    case "pendiente_envio":
      return {
        label: "Pendiente envío",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "en_proceso":
      return {
        label: "En proceso",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "facturado":
      return {
        label: "Facturado",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "sin_factura":
      return {
        label: "Sin factura",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "pendiente_verificacion":
      return {
        label: "Pendiente verificación",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "error":
      return {
        label: "Error",
        className: "bg-red-50 text-red-700 border-red-200",
      };
    case "no_facturado":
    default:
      return {
        label: "No facturado",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

export default function PesajesPanel({
  pedidos,
  pedidosPendientesAprobacion,
  filtroFecha,
  setFiltroFecha,
  abrirPesaje,
  setConfirmConfig,
  printPedido,
  usuarioActual,
  recargarPedidos,
}) {
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [pedidoFacturacion, setPedidoFacturacion] = useState(null);

  const abrirDetallePedido = (pedido) => setPedidoDetalle(pedido);
  const cerrarDetallePedido = () => setPedidoDetalle(null);

  const abrirFacturacionPedido = (pedido) => setPedidoFacturacion(pedido);
  const cerrarFacturacionPedido = () => setPedidoFacturacion(null);

  const pedidosFiltrados = filtrarPedidosPorFecha(pedidos, filtroFecha);

  const pedidosPendientesAprobacionFiltrados = filtrarPedidosPorFecha(
    pedidosPendientesAprobacion || [],
    filtroFecha
  );

  const pedidosPesajesPendientes = pedidosFiltrados.filter(
    (p) => !pedidoEstaPesado(p)
  );
  const pedidosPesajesCompletados = pedidosFiltrados.filter((p) =>
    pedidoEstaPesado(p)
  );

  const pedidosPesajesPendientesAgrupados = agruparPorFecha(
    pedidosPesajesPendientes
  );
  const pedidosPesajesCompletadosAgrupados = agruparPorFecha(
    pedidosPesajesCompletados
  );

  const renderPedidoHeader = (p, { mostrarFacturaBadge = false } = {}) => {
    const facturaMeta = getFacturaEstadoMeta(p.factura_estado);

    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold">
          <button
            type="button"
            className="text-left hover:underline"
            onClick={() => abrirDetallePedido(p)}
          >
            {p.cliente}
          </button>{" "}
          <span className="text-slate-500">
            ({p.marca} — {p.tipoEntrega} — {p.tipo_factura})
          </span>
        </div>

        {mostrarFacturaBadge && (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${facturaMeta.className}`}
          >
            {facturaMeta.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Pesajes</h2>
          <div className="flex gap-2">
            <Button
              variant={filtroFecha === "hoy" ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setFiltroFecha("hoy")}
            >
              Hoy
            </Button>
            <Button
              variant={filtroFecha === "semana" ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setFiltroFecha("semana")}
            >
              Semana
            </Button>
            <Button
              variant={filtroFecha === "todas" ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setFiltroFecha("todas")}
            >
              Todas
            </Button>
          </div>
        </div>

        {pedidosPendientesAprobacionFiltrados.length > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div>
              <span className="font-semibold">
                Existen pedidos pendientes de aprobación
              </span>
              <span className="ml-2 text-amber-800">
                ({pedidosPendientesAprobacionFiltrados.length})
              </span>
            </div>
            <span className="text-amber-700">⏳</span>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Pendientes de pesaje</h3>
          {Object.keys(pedidosPesajesPendientesAgrupados).length === 0 && (
            <p className="text-sm text-slate-600">
              No hay pedidos pendientes de pesaje.
            </p>
          )}

          {Object.entries(pedidosPesajesPendientesAgrupados).map(
            ([fecha, lista]) => (
              <div key={fecha} className="space-y-2">
                <h4 className="text-sm font-semibold mt-2">
                  {formatFecha(fecha)}
                </h4>
                <ul className="space-y-2">
                  {lista.map((p, i) => {
                    const indexGlobal = pedidos.indexOf(p);
                    return (
                      <li
                        key={p.id ?? i}
                        className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50"
                      >
                        <div className="text-sm">
                          {renderPedidoHeader(p, { mostrarFacturaBadge: false })}

                          <ul className="list-disc list-inside mt-2">
                            {p.productos.map((prod, idx) => (
                              <li key={idx}>
                                {prod.productoNombre} — {prod.presentacion} x{" "}
                                {prod.cantidad}
                                {usuarioActual?.rol === "Admin" && (
                                  <> — ({prod.precioPorKg} $/kg)</>
                                )}
                                {prod.peso != null &&
                                  !Number.isNaN(prod.peso) && (
                                    <span className="text-slate-500">
                                      {" "}
                                      — {prod.peso} kg
                                    </span>
                                  )}
                              </li>
                            ))}
                          </ul>

                          {p.notas && (
                            <p className="text-xs text-amber-700 mt-1">
                              Notas: {p.notas}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => abrirPesaje(indexGlobal)}
                          >
                            Pesar
                          </Button>

                          <Button
                            variant="destructive"
                            className="h-8 px-3 text-xs"
                            disabled={!(usuarioActual?.rol === "Admin")}
                            onClick={() =>
                              setConfirmConfig({
                                type: "eliminarPedido",
                                title: "Eliminar pedido",
                                index: indexGlobal,
                              })
                            }
                          >
                            Eliminar
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Pesajes completados</h3>
          {Object.keys(pedidosPesajesCompletadosAgrupados).length === 0 && (
            <p className="text-sm text-slate-600">
              No hay pesajes completados.
            </p>
          )}

          {Object.entries(pedidosPesajesCompletadosAgrupados).map(
            ([fecha, lista]) => (
              <div key={fecha} className="space-y-2">
                <h4 className="text-sm font-semibold mt-2">
                  {formatFecha(fecha)}
                </h4>
                <ul className="space-y-2">
                  {lista.map((p, i) => {
                    const indexGlobal = pedidos.indexOf(p);
                    return (
                      <li
                        key={p.id ?? i}
                        className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-white"
                      >
                        <div className="text-sm">
                          {renderPedidoHeader(p, { mostrarFacturaBadge: true })}

                          <ul className="list-disc list-inside mt-2">
                            {p.productos.map((prod, idx) => (
                              <li key={idx}>
                                {prod.productoNombre} — {prod.presentacion} x{" "}
                                {prod.cantidad}
                                {usuarioActual?.rol === "Admin" && (
                                  <> — ({prod.precioPorKg} $/kg)</>
                                )}{" "}
                                — {prod.peso} kg
                              </li>
                            ))}
                          </ul>

                          {p.notas && (
                            <p className="text-xs text-amber-700 mt-1">
                              Notas: {p.notas}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            disabled={p.factura_estado !== "no_facturado"}
                            onClick={() => abrirPesaje(indexGlobal)}
                          >
                            Ver / editar pesajes
                          </Button>

                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            disabled={!(usuarioActual?.rol === "Admin") || (p.tipo_factura === "Sin_Factura")}
                            onClick={() => abrirFacturacionPedido(p)}
                          >
                            Facturación
                          </Button>

                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              if (window.confirm("Desea imprimir este pedido?")) {
                                printPedido(p);
                              }
                            }}
                          >
                            Imprimir pedido
                          </Button>

                          <Button
                            variant="destructive"
                            className="h-8 px-3 text-xs"
                            disabled={!(usuarioActual?.rol === "Admin") || (p.factura_estado === "facturado")}
                            onClick={() =>
                              setConfirmConfig({
                                type: "eliminarPedido",
                                title: "Eliminar pedido",
                                index: indexGlobal,
                              })
                            }
                          >
                            Eliminar
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}
        </div>

        <DetallePedidoModal
          pedido={pedidoDetalle}
          onClose={cerrarDetallePedido}
        />

        <FacturacionPedidoModal
          pedido={pedidoFacturacion}
          onClose={cerrarFacturacionPedido}
          usuarioActual={usuarioActual}
          ambiente="homologacion"
          onFacturaActualizada={recargarPedidos}
        />
      </CardContent>
    </Card>
  );
}