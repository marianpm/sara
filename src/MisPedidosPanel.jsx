import React, { useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { formatFecha } from "./utils/pedidosUtils";

const normalizarTexto = (valor) =>
  String(valor ?? "").trim().toLowerCase();

const parseFechaYMD = (valor) => {
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

const obtenerEstadoVisible = (pedido) => {
  if (pedido.estado_aprobacion === "Pendiente") {
    return "Pendiente de aprobación";
  }

  if (pedido.estado === "entregado") {
    return "Entregado";
  }

  return "Pendiente";
};

const badgeEstadoClass = (estadoVisible) => {
  if (estadoVisible === "Pendiente de aprobación") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (estadoVisible === "Entregado") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
};

export default function MisPedidosPanel({
  pedidos,
  cargando,
  error,
  usuarioActual,
}) {
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("semana"); // semana | mes | todos
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos | pendientes_aprobacion | pendiente | entregado

  const esAdmin = usuarioActual?.rol === "Admin";
  const titulo = esAdmin ? "Pedidos" : "Mis pedidos";

  const pedidosFiltrados = useMemo(() => {
    const lista = pedidos || [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return lista.filter((pedido) => {
      const clienteMatch =
        !busquedaCliente ||
        normalizarTexto(pedido.cliente).includes(
          normalizarTexto(busquedaCliente)
        );

      if (!clienteMatch) return false;

      const estadoVisible = obtenerEstadoVisible(pedido);

      if (filtroEstado === "pendientes_aprobacion") {
        if (estadoVisible !== "Pendiente de aprobación") return false;
      }

      if (filtroEstado === "pendiente") {
        if (estadoVisible !== "Pendiente") return false;
      }

      if (filtroEstado === "entregado") {
        if (estadoVisible !== "Entregado") return false;
      }

      if (filtroPeriodo !== "todos") {
        const fechaBase = parseFechaYMD(pedido.fechaCreacion || pedido.fecha);

        if (fechaBase) {
          const limite = new Date(hoy);

          if (filtroPeriodo === "semana") {
            limite.setDate(limite.getDate() - 7);
          }

          if (filtroPeriodo === "mes") {
            limite.setMonth(limite.getMonth() - 1);
          }

          limite.setHours(0, 0, 0, 0);

          if (fechaBase < limite) return false;
        }
      }

      return true;
    });
  }, [pedidos, busquedaCliente, filtroPeriodo, filtroEstado]);

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{titulo}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Cliente
              </label>
              <Input
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar por cliente"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Período
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filtroPeriodo === "semana" ? "default" : "outline"}
                  className="h-8 px-3 text-xs"
                  onClick={() => setFiltroPeriodo("semana")}
                >
                  Semana
                </Button>
                <Button
                  variant={filtroPeriodo === "mes" ? "default" : "outline"}
                  className="h-8 px-3 text-xs"
                  onClick={() => setFiltroPeriodo("mes")}
                >
                  Mes
                </Button>
                <Button
                  variant={filtroPeriodo === "todos" ? "default" : "outline"}
                  className="h-8 px-3 text-xs"
                  onClick={() => setFiltroPeriodo("todos")}
                >
                  Todos
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-slate-700">Estado</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  filtroEstado === "pendientes_aprobacion"
                    ? "default"
                    : "outline"
                }
                className="h-8 px-3 text-xs"
                onClick={() => setFiltroEstado("pendientes_aprobacion")}
              >
                Pendientes de aprobación
              </Button>
              <Button
                variant={filtroEstado === "pendiente" ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setFiltroEstado("pendiente")}
              >
                Pendiente
              </Button>
              <Button
                variant={filtroEstado === "entregado" ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setFiltroEstado("entregado")}
              >
                Entregado
              </Button>
              <Button
                variant={filtroEstado === "todos" ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setFiltroEstado("todos")}
              >
                Todos
              </Button>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          {cargando ? "Cargando pedidos..." : `${pedidosFiltrados.length} pedido(s) encontrado(s)`}
        </div>

        {error && <p className="text-sm text-red-600">Error: {error}</p>}

        {!cargando && !error && pedidosFiltrados.length === 0 && (
          <p className="text-sm text-slate-600">
            No hay pedidos que coincidan con los filtros.
          </p>
        )}

        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => {
            const estadoVisible = obtenerEstadoVisible(pedido);

            return (
              <div
                key={pedido.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">
                      {pedido.cliente}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        (ID #{pedido.id})
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${badgeEstadoClass(
                      estadoVisible
                    )}`}
                  >
                    {estadoVisible}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div>
                    <span className="font-medium">Cargado:</span>{" "}
                    {pedido.fechaCreacion
                      ? formatFecha(pedido.fechaCreacion)
                      : "Sin fecha"}
                  </div>
                  <div>
                    <span className="font-medium">Fecha solicitada:</span>{" "}
                    {pedido.fecha ? formatFecha(pedido.fecha) : "Sin fecha"}
                  </div>
                  <div>
                    <span className="font-medium">Marca:</span>{" "}
                    {pedido.marca || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Factura:</span>{" "}
                    {pedido.tipo_factura || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Entrega:</span>{" "}
                    {pedido.tipoEntrega || "-"}
                  </div>
                  {esAdmin && (
                    <div>
                      <span className="font-medium">Cargado por:</span>{" "}
                      {pedido.creadoPor || "-"}
                    </div>
                  )}
                  {pedido.tipoEntrega === "Envio" && (
                    <div>
                      <span className="font-medium">Dirección:</span>{" "}
                      {pedido.direccion_entrega || "-"}
                    </div>
                  )}
                </div>

                {Array.isArray(pedido.productos) && pedido.productos.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-slate-800">
                      Productos
                    </div>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {pedido.productos.map((prod, idx) => (
                        <li key={idx}>
                          {prod.productoNombre} — {prod.presentacion} x{" "}
                          {prod.cantidad}
                          { prod.precioPorKg != null && (
                            <> — ({prod.precioPorKg} $/kg)</>
                          )}
                          {prod.peso != null && !Number.isNaN(prod.peso) && (
                            <> — {prod.peso} kg</>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pedido.notas && (
                  <p className="text-xs text-amber-700">
                    Notas: {pedido.notas}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}