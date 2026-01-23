import React, { useMemo, useState } from "react";
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
  productosSupabase,
  agregarProducto,
  eliminarProducto,
  handleFechaChange,
  handleAgregarPedidoClick,
  // desde Supabase
  clientesSupabase,
  cargandoClientes,
  errorClientes,
}) {
  const tiposYaSeleccionados = pedido.productos.map((p) => p.productoNombre);

  const [numeroCliente, setNumeroCliente] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const productosDisponibles = productosSupabase || [];
  const productoSel = productosDisponibles.find((p) => String(p.id) === String(productoTemp.productoId));
  const variantesDisponibles = (productoSel?.producto_variantes || []).filter(v => v.activo !== false);

  const variantesYaSeleccionadas = pedido.productos.map((p) => String(p.productoVarianteId));

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
      cuit: cliente.numero_impositivo != null ? String(cliente.numero_impositivo) : prev.cuit,
      direccion: cliente.domicilio || prev.direccion,
    }));
    // autocompletar N° cliente (id)
    setNumeroCliente(cliente.id != null ? String(cliente.id) : "");
    setMostrarSugerencias(false); // cerrar desplegable siempre al elegir
  };

  const handleNumeroClienteChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // solo números
    setNumeroCliente(value);

    if (!value) return;

    const num = Number(value);
    if (Number.isNaN(num)) return;

    const cliente = (clientesSupabase || []).find((c) => c.id === num);
    if (cliente) {
      handleSeleccionCliente(cliente);
    }
  };

  const preciosEspecialesOK =
    pedido.tipoPrecio !== "Especial" ||
    pedido.productos.every((p) => Number(p.precioEspecial) > 0);

  // Reglas para permitir confirmar pedido
  const puedeConfirmar =
    clienteValido &&
    pedido.cuit &&
    pedido.cliente &&
    pedido.productos.length > 0 &&
    pedido.tipoEntrega &&
    pedido.marca &&
    preciosEspecialesOK;

  {pedido.tipoPrecio === "Especial" && !preciosEspecialesOK && (
    <p className="text-xs text-red-600">
      Para precio Especial tenés que cargar el $/kg en todos los productos.
    </p>
  )}

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
              maxLength={60}
              value={pedido.cliente}
              onFocus={() => setMostrarSugerencias(true)}
              onChange={(e) => {
                setPedido((prev) => ({ ...prev, cliente: e.target.value }));
                setMostrarSugerencias(true);
              }}
            />

            {/* Sugerencias de clientes (por nombre) */}
            {mostrarSugerencias && 
              textoBusqueda.length >= 2 &&
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
                          {cli.id_impositiva} {cli.numero_impositivo}{" "}
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

          {/* Columna: N° cliente */}
          <div className="w-full md:w-40 space-y-1">
            <label className="text-sm font-medium text-slate-800">
              N° cliente
            </label>
            <Input
              value={numeroCliente}
              onChange={handleNumeroClienteChange}
            />
          </div>

          {/* Columna: CUIT del cliente */}
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-slate-800">
              CUIT/CUIL del cliente
            </label>
            <Input
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

          {/* Tipo de Factura */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Factura</span>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={pedido.tipo_factura === "Factura_A" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipo_factura: "Factura_A" }))
                }
              >
                Factura A
              </Button>

              <Button
                variant={pedido.tipo_factura === "Factura_B" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipo_factura: "Factura_B" }))
                }
              >
                Factura B
              </Button>

              <Button
                variant={pedido.tipo_factura === "Sin_Factura" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipo_factura: "Sin_Factura" }))
                }
              >
                Sin factura
              </Button>
            </div>
          </div>


          {/* Precio Mayorista / Minorista / Especial */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">
              Tipo de Precio
            </span>
            <div className="flex gap-2">
              <Button
                variant={pedido.tipoPrecio === "Mayorista" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoPrecio: "Mayorista" }))
                }
              >
                Mayorista
              </Button>
              <Button
                variant={pedido.tipoPrecio === "Minorista" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoPrecio: "Minorista" }))
                }
              >
                Minorista
              </Button>
              <Button
                variant={pedido.tipoPrecio === "Especial" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoPrecio: "Especial" }))
                }
              >
                Especial
              </Button>
            </div>
          </div>

          {/* Marca Sarria / 1319 */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">
              Marca
            </span>
            <div className="flex gap-2">
              <Button
                variant={pedido.marca === "Sarria" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, marca: "Sarria" }))
                }
              >
                Sarria
              </Button>
              <Button
                variant={pedido.marca === "1319" ? "default" : "outline"}
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, marca: "1319" }))
                }
              >
                1319
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Producto (familia) */}
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={productoTemp.productoId}
              disabled={!clienteValido || cargandoProductos || !!errorProductos}
              onChange={(e) => {
                const id = e.target.value;
                const p = productosDisponibles.find((x) => String(x.id) === String(id));
                setProductoTemp((prev) => ({
                  ...prev,
                  productoId: id,
                  productoNombre: p?.nombre ?? "",
                  productoVarianteId: "",
                  presentacion: "",
                }));
              }}
            >
              <option value="">Producto</option>
              {productosDisponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>

            {/* Presentación (variante) */}
            <select
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={productoTemp.productoVarianteId}
              disabled={!clienteValido || !productoTemp.productoId}
              onChange={(e) => {
                const varId = e.target.value;
                const v = variantesDisponibles.find((x) => String(x.id) === String(varId));
                setProductoTemp((prev) => ({
                  ...prev,
                  productoVarianteId: varId,
                  presentacion: v?.presentacion ?? "",
                }));
              }}
            >
              <option value="">
                {productoTemp.productoId ? "Presentación" : "Elegí un producto"}
              </option>

              {variantesDisponibles.map((v) => (
                <option
                  key={v.id}
                  value={v.id}
                  disabled={variantesYaSeleccionadas.includes(String(v.id))}
                >
                  {v.presentacion}
                </option>
              ))}
            </select>
          </div>


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

          {pedido.tipoPrecio === "Especial" && (
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Precio especial ($/kg)"
              value={productoTemp.precioEspecial ?? ""}
              disabled={!clienteValido}
              onChange={(e) => {
                const v = e.target.value;
                setProductoTemp((prev) => ({
                  ...prev,
                  precioEspecial: v === "" ? "" : Number(v),
                }));
              }}
            />
          )}

          <Button
            type="button"
            variant="outline"
            disabled={
              !clienteValido ||
              !productoTemp.productoVarianteId ||
              !productoTemp.cantidad ||
              productoTemp.cantidad <= 0 ||
              (pedido.tipoPrecio === "Especial" &&
                !(Number(productoTemp.precioEspecial) > 0))
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
                    {prod.productoNombre} — {prod.presentacion} x {prod.cantidad}
                  </span>

                  {pedido.tipoPrecio === "Especial" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">$ / kg</span>
                      <Input
                        className="h-8 w-28"
                        type="number"
                        min="0"
                        step="0.01"
                        value={prod.precioEspecial ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPedido((prev) => ({
                            ...prev,
                            productos: prev.productos.map((p, i) =>
                              i === idx
                                ? { ...p, precioEspecial: v === "" ? null : Number(v) }
                                : p
                            ),
                          }));
                        }}
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="destructive"
                    className="h-7 px-3"
                    onClick={() => eliminarProducto(prod.productoVarianteId)}
                  >
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fecha + Notas en la misma fila en desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
