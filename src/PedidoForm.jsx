import React, { useMemo } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

export default function PedidoForm({
  pedido,
  productoTemp,
  setPedido,
  setProductoTemp,
  tiposDisponibles,
  cargandoProductos,
  errorProductos,
  hoyISO,
  handleCuitChange,
  agregarProducto,
  eliminarProducto,
  handleFechaChange,
  handleAgregarPedidoClick,
  // desde Supabase
  clientesSupabase,
  cargandoClientes,
  errorClientes,
}) {
  const tiposYaSeleccionados = pedido.productos.map((p) => p.tipo);

  // texto que estás escribiendo en "Nombre del cliente"
  const textoBusqueda = (pedido.cliente || "").toLowerCase().trim();

  // cliente coincidente EXACTO por nombre (tabla Clientes)
  const clienteCoincidente = useMemo(() => {
    if (!textoBusqueda) return null;
    return (clientesSupabase || []).find(
      (c) =>
        c.nombre &&
        c.nombre.toLowerCase().trim() === textoBusqueda
    );
  }, [textoBusqueda, clientesSupabase]);

  const clienteValido = !!clienteCoincidente;

  // sugerencias por "contiene" en el nombre (solo para mostrar lista)
  const sugerenciasClientes = useMemo(() => {
    if (!textoBusqueda || textoBusqueda.length < 2) return [];
    if (!clientesSupabase || clientesSupabase.length === 0) return [];

    const filtrados = clientesSupabase
      .filter(
        (c) =>
          c.nombre &&
          c.nombre.toLowerCase().includes(textoBusqueda)
      )
      .slice(0, 10);

    // si hay solo uno y coincide exacto, no muestro la lista
    if (
      filtrados.length === 1 &&
      filtrados[0].nombre.toLowerCase().trim() === textoBusqueda
    ) {
      return [];
    }

    return filtrados;
  }, [textoBusqueda, clientesSupabase]);

  const handleSeleccionCliente = (cliente) => {
    setPedido((prev) => ({
      ...prev,
      cliente: cliente.nombre,
      cuit: cliente.numero != null ? String(cliente.numero) : prev.cuit,
      direccion: cliente.domicilio || prev.direccion,
    }));
  };

  // Reglas para permitir confirmar pedido
  const puedeConfirmar =
    clienteValido &&
    pedido.cuit &&
    pedido.cliente &&
    pedido.productos.length > 0 &&
    pedido.tipoEntrega;

  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-2xl font-semibold">Nuevo Pedido</h2>

        {/* NOMBRE + CUIT EN LA MISMA FILA */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Columna: Nombre del cliente */}
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Nombre del cliente
            </label>
            <Input
              placeholder="Nombre del cliente"
              maxLength={60}
              value={pedido.cliente}
              onChange={(e) =>
                setPedido((prev) => ({ ...prev, cliente: e.target.value }))
              }
            />

            {/* Sugerencias de clientes (por nombre) */}
            {textoBusqueda.length >= 2 &&
              !cargandoClientes &&
              !errorClientes &&
              sugerenciasClientes.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto text-sm z-10">
                  {sugerenciasClientes.map((cli) => (
                    <button
                      key={cli.id}
                      type="button"
                      className="w-full text-left px-2 py-1 hover:bg-slate-100"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSeleccionCliente(cli);
                      }}
                    >
                      <div className="font-medium">{cli.nombre}</div>
                      <div className="text-xs text-slate-500">
                        {cli.id_impositiva} {cli.numero}{" "}
                        {cli.domicilio ? `· ${cli.domicilio}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}

            {cargandoClientes && (
              <p className="text-xs text-slate-500">Cargando clientes...</p>
            )}
            {errorClientes && (
              <p className="text-xs text-red-600">
                Error cargando clientes: {errorClientes}
              </p>
            )}
            {!clienteValido &&
              !cargandoClientes &&
              !errorClientes &&
              textoBusqueda.length >= 2 &&
              sugerenciasClientes.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  No se encontró un cliente con ese nombre. Solo se pueden cargar
                  pedidos para clientes existentes.
                </p>
              )}
          </div>

          {/* Columna: CUIT del cliente */}
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-slate-800">
              ID del cliente
            </label>
            <Input
              placeholder="ID del cliente"
              value={pedido.cuit}
              maxLength={11}
              onChange={handleCuitChange}
            />
          </div>
        </div>

        {/* Tipo de entrega + Factura en la misma fila, más cerca */}
        <div className="flex flex-wrap items-start gap-4">
          {/* Tipo de entrega */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">
              Tipo de entrega
            </span>
            <div className="flex gap-2">
              <Button
                variant={pedido.tipoEntrega === "Envio" ? "default" : "outline"}
                className="rounded-full"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoEntrega: "Envio" }))
                }
              >
                Envío
              </Button>
              <Button
                variant={pedido.tipoEntrega === "Retiro" ? "default" : "outline"}
                className="rounded-full"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoEntrega: "Retiro" }))
                }
              >
                Retiro
              </Button>
            </div>
          </div>

          {/* Factura Sí / No */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">
              Factura
            </span>
            <div className="flex gap-2">
              <Button
                variant={pedido.factura ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, factura: true }))
                }
              >
                Sí
              </Button>
              <Button
                variant={!pedido.factura ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, factura: false }))
                }
              >
                No
              </Button>
            </div>
          </div>
        </div>

        {/* Productos (bloqueados si cliente no válido) */}
        <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
          <h3 className="font-semibold">Agregar producto</h3>

          {!clienteValido && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
              Primero seleccioná un cliente válido para poder cargar productos.
            </p>
          )}

          <select
            className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={productoTemp.tipo}
            disabled={!clienteValido || cargandoProductos || !!errorProductos}
            onChange={(e) =>
              setProductoTemp((prev) => ({ ...prev, tipo: e.target.value }))
            }
          >
            <option value="">Seleccioná tipo de jamón</option>

            {cargandoProductos && (
              <option disabled>Cargando productos...</option>
            )}

            {!cargandoProductos &&
              !errorProductos &&
              tiposDisponibles.map((tipo) => (
                <option
                  key={tipo}
                  value={tipo}
                  disabled={tiposYaSeleccionados.includes(tipo)}
                >
                  {tipo}
                </option>
              ))}

            {!cargandoProductos &&
              !errorProductos &&
              tiposDisponibles.length === 0 && (
                <option disabled>No hay productos en Supabase</option>
              )}

            {errorProductos && (
              <option disabled>Error cargando productos</option>
            )}
          </select>

          {errorProductos && (
            <p className="text-xs text-red-600 mt-1">
              Error: {errorProductos}
            </p>
          )}

          <Input
            type="number"
            min="1"
            value={productoTemp.cantidad}
            disabled={!clienteValido}
            onChange={(e) => {
              const value = e.target.value.replace(/^0+/, "");
              setProductoTemp((prev) => ({
                ...prev,
                cantidad: Number(value || 0),
              }));
            }}
          />

          <Button
            type="button"
            variant="outline"
            disabled={
              !clienteValido ||
              !productoTemp.tipo ||
              !productoTemp.cantidad ||
              productoTemp.cantidad <= 0
            }
            onClick={agregarProducto}
          >
            Agregar producto
          </Button>

          {pedido.productos.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {pedido.productos.map((prod, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded-md bg-white px-2 py-1 border border-slate-200"
                >
                  <span>
                    {prod.tipo} x {prod.cantidad}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-7 px-3"
                    onClick={() => eliminarProducto(prod.tipo)}
                  >
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fecha */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            Fecha de envío (opcional)
          </label>
          <Input
            type="date"
            min={hoyISO}
            value={pedido.fecha || ""}
            onChange={handleFechaChange}
          />
        </div>

        {/* Notas / observaciones */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            Notas (opcional)
          </label>
          <textarea
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px]"
            maxLength={200}
            value={pedido.notas || ""}
            onChange={(e) =>
              setPedido((prev) => ({ ...prev, notas: e.target.value }))
            }
          />
        </div>

        {/* Botón confirmar pedido */}
        <Button
          type="button"
          className="w-full mt-2"
          disabled={!puedeConfirmar}
          onClick={handleAgregarPedidoClick}
        >
          Agregar pedido
        </Button>

      </CardContent>
    </Card>
  );
}
