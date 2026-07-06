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
  if (Number.isNaN(numero)) return "-";

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

const obtenerFechaPedido = (pedido) => pedido?.fecha ?? null;

const obtenerTotalPedido = (pedido) => pedido?.total ?? null;

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

export default function ClienteHistorialPedidosPanel({
  cliente,
  pedidos = [],
  cargando = false,
  error = null,
  onVolver,
  onVerDetallePedido,
}) {
  const nombre = nombreVisibleCliente(cliente);

  const resumen = useMemo(() => {
    const pedidosOrdenados = [...(pedidos || [])].sort((a, b) => {
      const fechaA = new Date(obtenerFechaPedido(a) || 0).getTime();
      const fechaB = new Date(obtenerFechaPedido(b) || 0).getTime();
      return fechaB - fechaA;
    });

    const pedidosConTotal = pedidosOrdenados
      .map((pedido) => Number(obtenerTotalPedido(pedido)))
      .filter((total) => Number.isFinite(total));

    const montoTotal = pedidosConTotal.reduce((acc, total) => acc + total, 0);

    const primerPedido = pedidosOrdenados.length
      ? pedidosOrdenados[pedidosOrdenados.length - 1]
      : null;

    const ultimoPedido = pedidosOrdenados.length ? pedidosOrdenados[0] : null;

    return {
      pedidosOrdenados,
      cantidadPedidos: pedidosOrdenados.length,
      primerPedido,
      ultimoPedido,
      montoTotal,
      cantidadConTotal: pedidosConTotal.length,
      promedioPedido:
        pedidosConTotal.length > 0 ? montoTotal / pedidosConTotal.length : null,
    };
  }, [pedidos]);

  if (!cliente) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Button type="button" variant="outline" onClick={onVolver}>
            ← Volver al cliente
          </Button>

          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight">
              Historial de pedidos
            </h2>
            <p className="text-sm text-slate-500">
              {nombre} · ID cliente {cliente.id ?? "-"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No se pudo cargar el historial: {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ResumenCard
          label="Cantidad de pedidos"
          value={resumen.cantidadPedidos}
        />

        <ResumenCard
          label="Primer pedido"
          value={formatFecha(obtenerFechaPedido(resumen.primerPedido))}
        />

        <ResumenCard
          label="Último pedido"
          value={formatFecha(obtenerFechaPedido(resumen.ultimoPedido))}
        />

        <ResumenCard
          label="Monto gastado"
          value={formatearMoneda(resumen.montoTotal)}
          helper={
            resumen.cantidadConTotal !== resumen.cantidadPedidos
              ? `${resumen.cantidadConTotal} pedidos con total registrado`
              : null
          }
        />

        <ResumenCard
          label="Promedio por pedido"
          value={
            resumen.promedioPedido != null
              ? formatearMoneda(resumen.promedioPedido)
              : "-"
          }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {cargando ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Cargando historial...
            </div>
          ) : resumen.pedidosOrdenados.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Este cliente no tiene pedidos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Pedido</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Entrega</th>
                    <th className="px-4 py-3">Factura</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Notas</th>
                    <th className="w-[120px] px-4 py-3 text-center">
                      Detalle
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {resumen.pedidosOrdenados.map((pedido) => {
                    const fechaPedido = obtenerFechaPedido(pedido);
                    const estadoPedido = obtenerEstadoPedidoVisible(pedido);
                    const totalPedido = obtenerTotalPedido(pedido);

                    const tipoEntrega = pedido.tipoEntrega || "-";

                    return (
                      <tr key={pedido.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          {formatFecha(fechaPedido)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-950">
                            #{pedido.id}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${badgeEstadoPedidoClass(
                              estadoPedido
                            )}`}
                          >
                            {estadoPedido}
                          </span>
                        </td>

                        <td className="px-4 py-3">{tipoEntrega}</td>

                        <td className="px-4 py-3">
                          {pedido.tipo_factura || "-"}
                        </td>

                        <td className="px-4 py-3 text-right font-medium">
                          {totalPedido != null
                            ? formatearMoneda(totalPedido)
                            : "-"}
                        </td>

                        <td className="max-w-[240px] px-4 py-3">
                          <div className="truncate">{pedido.notas || "-"}</div>
                        </td>

                        <td className="w-[120px] px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
                            onClick={() => onVerDetallePedido?.(pedido)}
                          >
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResumenCard({ label, value, helper }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
      </CardContent>
    </Card>
  );
}