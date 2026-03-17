// src/PesajesPanel.jsx
import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  formatFecha,
  agruparPorFecha,
  pedidoEstaPesado,
  filtrarPedidosPorFecha,
} from "./utils/pedidosUtils";

export default function PesajesPanel({
  pedidos,
  pedidosPendientesAprobacion,
  filtroFecha,
  setFiltroFecha,
  abrirPesaje,
  setConfirmConfig,
  printPedido,
  usuarioActual,
}) {
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const abrirDetallePedido = (pedido) => setPedidoDetalle(pedido);
  const cerrarDetallePedido = () => setPedidoDetalle(null);

  const copiarDireccion = async () => {
    if (!pedidoDetalle?.direccion_entrega) return;
    try {
      await navigator.clipboard.writeText(pedidoDetalle.direccion_entrega);
    } catch (error) {
      console.error("No se pudo copiar la dirección", error);
    }
  };

  const abrirUbicacion = () => {
    if (!pedidoDetalle?.direccion_entrega) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      pedidoDetalle.direccion_entrega
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
                        key={i}
                        className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-slate-50"
                      >
                        <div className="text-sm">
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

                          <ul className="list-disc list-inside">
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
                        key={i}
                        className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-white"
                      >
                        <div className="text-sm">
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

                          <ul className="list-disc list-inside">
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
                            onClick={() => abrirPesaje(indexGlobal)}
                          >
                            Ver / editar pesajes
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              if (window.confirm("Desea imprimir este pesaje?")) {
                                printPedido(p);
                              }
                            }}
                          >
                            Imprimir
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

        {pedidoDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={cerrarDetallePedido}>
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">Detalle del pedido</h2>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={cerrarDetallePedido}
                  >
                    Cerrar
                  </Button>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    <strong>Cliente:</strong> {pedidoDetalle.cliente || "-"}
                  </p>
                  <p>
                    <strong>CUIT/CUIL:</strong> {pedidoDetalle.cuit || "-"}
                  </p>
                  <p>
                    <strong>Tipo de entrega:</strong>{" "}
                    {pedidoDetalle.tipoEntrega || "-"}
                  </p>
                  <p>
                    <strong>Dirección de entrega:</strong>{" "}
                    {pedidoDetalle.direccion_entrega || "-"}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {pedidoDetalle.fecha || "-"}
                  </p>
                  <p>
                    <strong>Factura:</strong>{" "}
                    {pedidoDetalle.tipo_factura || "-"}
                  </p>
                  <p>
                    <strong>Marca:</strong> {pedidoDetalle.marca || "-"}
                  </p>
                  <p>
                    <strong>Notas:</strong> {pedidoDetalle.notas || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copiarDireccion}
                    disabled={!pedidoDetalle?.direccion_entrega}
                  >
                    Copiar dirección
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={abrirUbicacion}
                    disabled={!pedidoDetalle?.direccion_entrega}
                  >
                    Abrir ubicación
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}