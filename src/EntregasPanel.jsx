// src/EntregasPanel.jsx
import React from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  formatFecha,
  agruparPorFecha,
  pedidoEstaPesado,
  filtrarPedidosPorFecha,
} from "./utils/pedidosUtils";

export default function EntregasPanel({
  pedidos,
  filtroFecha,
  setFiltroFecha,
  setConfirmConfig,
  usuarioActual
}) {
  const pedidosFiltrados = filtrarPedidosPorFecha(pedidos, filtroFecha);

  const pedidosEntregas = pedidosFiltrados.filter(
    (p) => pedidoEstaPesado(p) && !p.entregado
  );

  const entregasEnvio = pedidosEntregas.filter(
    (p) => p.tipoEntrega === "Envio"
  );
  const entregasRetiro = pedidosEntregas.filter(
    (p) => p.tipoEntrega === "Retiro"
  );

  const entregasEnvioAgrupadas = agruparPorFecha(entregasEnvio);
  const entregasRetiroAgrupadas = agruparPorFecha(entregasRetiro);

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Entregas</h2>
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

        {Object.keys(entregasEnvioAgrupadas).length === 0 &&
          Object.keys(entregasRetiroAgrupadas).length === 0 && (
            <p className="text-sm text-slate-600">
              No hay pedidos pendientes de entrega.
            </p>
          )}

        {/* Envíos */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Envíos</h3>
          {Object.keys(entregasEnvioAgrupadas).length === 0 && (
            <p className="text-sm text-slate-600">No hay envíos pendientes.</p>
          )}

          {Object.entries(entregasEnvioAgrupadas).map(([fecha, lista]) => (
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
                             ({p.marca} — ID: {p.cuit} — {p.tipoEntrega})
                          </span>
                        </div>
                        <ul className="list-disc list-inside">
                          {p.productos.map((prod, idx) => (
                            <li key={idx}>
                              {prod.tipo} x {prod.cantidad} — {prod.peso} kg
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="default"
                          className="h-8 px-3 text-xs"
                          onClick={() =>
                            setConfirmConfig({
                              type: "marcarEntregado",
                              title: "Marcar entregado",
                              index: indexGlobal,
                            })
                          }
                        >
                          Marcar entregado
                        </Button>
                        <Button
                          variant="destructive"
                          className="h-8 px-3 text-xs"
                          disabled={usuarioActual?.rol !== "Admin"}
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
          ))}
        </div>

        {/* Retiros */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Retiros</h3>
          {Object.keys(entregasRetiroAgrupadas).length === 0 && (
            <p className="text-sm text-slate-600">No hay retiros pendientes.</p>
          )}

          {Object.entries(entregasRetiroAgrupadas).map(([fecha, lista]) => (
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
                             ({p.marca} — ID: {p.cuit} — {p.tipoEntrega})
                          </span>
                        </div>
                        <ul className="list-disc list-inside">
                          {p.productos.map((prod, idx) => (
                            <li key={idx}>
                              {prod.tipo} x {prod.cantidad} — {prod.peso} kg
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="default"
                          className="h-8 px-3 text-xs"
                          onClick={() =>
                            setConfirmConfig({
                              type: "marcarEntregado",
                              title: "Marcar entregado",
                              index: indexGlobal,
                            })
                          }
                        >
                          Marcar entregado
                        </Button>
                        <Button
                          variant="destructive"
                          className="h-8 px-3 text-xs"
                          disabled={usuarioActual?.rol !== "Admin"}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
