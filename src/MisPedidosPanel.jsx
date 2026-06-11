import React, { useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  formatFecha,
  calcularPesoPromedioProducto,
  formatearKgPromedio,
  pedidoEstaPesado,
} from "./utils/pedidosUtils";
import { printPedido } from "./utils/printPedido";
import { clienteCoincideBusqueda } from "./utils/busquedaClientes";
import DetalleClienteModal from "./components/DetalleClienteModal";

const parseFechaYMD = (valor) => {
  if (!valor) return null;
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return null;
  fecha.setHours(0, 0, 0, 0);
  return fecha;
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
  const [busquedaNumeroCliente, setBusquedaNumeroCliente] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("semana"); // semana | mes | todos
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos | pendientes_aprobacion | pendiente | entregado

  const esAdmin = usuarioActual?.rol === "Admin";
  const titulo = esAdmin ? "Pedidos" : "Mis pedidos";

  const [clienteDetalle, setClienteDetalle] = useState(null);
  
  const [abriendoFacturaId, setAbriendoFacturaId] = useState(null);
  const [errorFacturaPdf, setErrorFacturaPdf] = useState(null);

  const abrirDetalleCliente = (pedido) => {
    if (!pedido?.clienteRegistro) {
      console.warn("El pedido no tiene clienteRegistro:", pedido);
      return;
    }

    setClienteDetalle(pedido.clienteRegistro);
  };

  const abrirFacturaPedido = async (pedido) => {
    try {
      setErrorFacturaPdf(null);

      const facturaId = pedido?.factura_id_actual;

      if (!facturaId) {
        throw new Error("Este pedido todavía no tiene factura asociada.");
      }

      setAbriendoFacturaId(pedido.id);

      const { data, error } = await supabase.functions.invoke(
        "facturacion-pdf-url",
        {
          body: {
            facturaId,
            download: false,
          },
        }
      );

      if (error) throw error;

      if (!data?.ok || !data?.signedUrl) {
        throw new Error(data?.mensaje || "No se pudo obtener el PDF de la factura.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[MisPedidosPanel] error abriendo factura", error);
      setErrorFacturaPdf(error?.message || "No se pudo abrir la factura.");
    } finally {
      setAbriendoFacturaId(null);
    }
  };

  const pedidosFiltrados = useMemo(() => {
    const lista = pedidos || [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return lista.filter((pedido) => {
      const clienteMatch = clienteCoincideBusqueda(
        {
          cliente: pedido.cliente,
          nombre: pedido.cliente,
          razon_social: pedido.cliente_nombre,
          nombre_fantasia: pedido.nombre_fantasia,
          direccion: pedido.direccion_entrega,
          domicilio_entrega: pedido.direccion_entrega,
          numero_impositivo: pedido.numero_impositivo,

          // Buscar también por N° cliente
          id: pedido.cliente_id,
          cliente_id: pedido.cliente_id,
          numero_cliente: pedido.cliente_id,
        },
        busquedaCliente
      );

      if (!clienteMatch) return false;

      const numeroClienteBuscado = busquedaNumeroCliente.trim();

      if (
        numeroClienteBuscado &&
        String(pedido.cliente_id) !== numeroClienteBuscado
      ) {
        return false;
      }

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
  }, [
    pedidos,
    busquedaCliente,
    busquedaNumeroCliente,
    filtroPeriodo,
    filtroEstado,
  ]);

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{titulo}</h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Cliente
              </label>
              <Input
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar por razón social, nombre, dirección o CUIT"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                N° cliente
              </label>
              <Input
                value={busquedaNumeroCliente}
                onChange={(e) =>
                  setBusquedaNumeroCliente(e.target.value.replace(/\D/g, ""))
                }
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ej: 53"
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

        {errorFacturaPdf && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorFacturaPdf}
          </p>
        )}

        {!cargando && !error && pedidosFiltrados.length === 0 && (
          <p className="text-sm text-slate-600">
            No hay pedidos que coincidan con los filtros.
          </p>
        )}

        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => {
            const estadoVisible = obtenerEstadoVisible(pedido);
            const puedeImprimirPedido =
              Array.isArray(pedido.productos) && pedidoEstaPesado(pedido);

            return (
              <div
                key={pedido.id}
                className="relative rounded-2xl border border-slate-200 bg-white p-3 pr-3 md:pr-36 space-y-2"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => abrirDetalleCliente(pedido)}
                      >
                        {pedido.cliente}
                      </button>{" "}
                      <span className="text-xs font-normal text-slate-500">
                        (ID #{pedido.id})
                      </span>
                    </div>
                  </div>

                  <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex h-8 min-w-[104px] items-center justify-center rounded-full border px-3 text-xs font-medium ${badgeEstadoClass(
                        estadoVisible
                      )}`}
                    >
                      {estadoVisible}
                    </span>

                    {esAdmin && pedido.factura_id_actual && pedido.factura_estado === "facturado" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[104px] rounded-full px-3 text-xs"
                        onClick={() => abrirFacturaPedido(pedido)}
                        disabled={abriendoFacturaId === pedido.id}
                      >
                        {abriendoFacturaId === pedido.id ? "Abriendo..." : "Ver Factura"}
                      </Button>
                    )}

                    {puedeImprimirPedido && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[104px] rounded-full px-3 text-xs"
                        onClick={() => {printPedido(pedido);}}
                      >
                        Imprimir pedido
                      </Button>
                    )}
                  </div>
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
                  {estadoVisible === "Entregado" && pedido.total != null && (
                    <div>
                      <span className="font-medium">Total:</span>{" "}
                      {formatearMoneda(pedido.total)}
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
                      {pedido.productos.map((prod, idx) => {
                        const promedio = calcularPesoPromedioProducto(prod);

                        return (
                          <li key={idx}>
                            {prod.productoNombre} — {prod.presentacion} x {prod.cantidad}

                            {prod.precioPorKg != null && (
                              <> — ({prod.precioPorKg} $/kg)</>
                            )}

                            {promedio != null && (
                              <span className="text-slate-500">
                                {" "}
                                — Prom: {formatearKgPromedio(promedio)}
                              </span>
                            )}

                            {prod.peso != null && !Number.isNaN(prod.peso) && (
                              <> — {prod.peso} kg</>
                            )}
                          </li>
                        );
                      })}
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
        
        <DetalleClienteModal
          cliente={clienteDetalle}
          onClose={() => setClienteDetalle(null)}
        />
      </CardContent>
    </Card>
  );
}