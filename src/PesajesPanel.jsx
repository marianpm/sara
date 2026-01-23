// src/PesajesPanel.jsx
import React from "react";
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
  filtroFecha,
  setFiltroFecha,
  abrirPesaje,
  setConfirmConfig,
  printPedido,
  usuarioActual,
}) {
  const pedidosFiltrados = filtrarPedidosPorFecha(pedidos, filtroFecha);

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

        {/* Pendientes de pesaje */}
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
                            {p.cliente}{" "}
                            <span className="text-slate-500">
                              ({p.marca} — {p.tipoEntrega})
                            </span>
                          </div>
                          <ul className="list-disc list-inside">
                            {p.productos.map((prod, idx) => (
                              <li key={idx}>
                                {prod.productoNombre} x {prod.cantidad}
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

        {/* Pesajes completados */}
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
                            {p.cliente}{" "}
                            <span className="text-slate-500">
                              ({p.marca} — {p.tipoEntrega})
                            </span>
                          </div>
                          <ul className="list-disc list-inside">
                            {p.productos.map((prod, idx) => (
                              <li key={idx}>
                                {prod.productoNombre} x {prod.cantidad} — {prod.peso} kg
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
                              if (
                                window.confirm("Desea imprimir este pesaje?")
                              ) {
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
      </CardContent>
    </Card>
  );
}
