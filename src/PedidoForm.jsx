import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import AddressAutocompleteInput from "./components/AddressAutocompleteInput";
import ClienteAutocomplete from "./components/ClienteAutocomplete";

const normalizarTexto = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default function PedidoForm({
  pedido,
  productoTemp,
  setPedido,
  setProductoTemp,
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
  const [numeroCliente, setNumeroCliente] = useState("");
  const [usarDireccionCliente, setUsarDireccionCliente] = useState(true);

  const productosDisponibles = [...(productosSupabase || [])]
    .filter((p) => p.activo !== false)
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

  const productoSel = productosDisponibles.find(
    (p) => String(p.id) === String(productoTemp.productoId)
  );

  const variantesDisponibles = (productoSel?.producto_variantes || []).filter(
    (v) => v.activo !== false
  );

  const variantesYaSeleccionadas = pedido.productos.map((p) =>
    String(p.productoVarianteId)
  );

  const clientesAutocomplete = useMemo(
    () =>
      (clientesSupabase || []).map((cliente) => ({
        ...cliente,
        nombre: cliente.razon_social ?? "",
        direccion: cliente.domicilio_entrega ?? cliente.domicilio_fiscal ?? "",
      })),
    [clientesSupabase]
  );

  const textoBusqueda = normalizarTexto(pedido.cliente || "");

  const clienteCoincidente = useMemo(() => {
    if (!textoBusqueda) return null;

    return (
      clientesAutocomplete.find(
        (c) => normalizarTexto(c.nombre) === textoBusqueda
      ) ?? null
    );
  }, [textoBusqueda, clientesAutocomplete]);

  const clienteValido = !!clienteCoincidente;

  useEffect(() => {
    if (!clienteCoincidente) return;

    setUsarDireccionCliente(true);

    setPedido((prev) => {
      const nuevoCuit =
        clienteCoincidente.numero_impositivo != null
          ? String(clienteCoincidente.numero_impositivo)
          : "";

      const nuevaDireccion = clienteCoincidente.domicilio_entrega ?? "";
      const nuevaLat = clienteCoincidente.domicilio_entrega_lat ?? null;
      const nuevaLng = clienteCoincidente.domicilio_entrega_lng ?? null;

      if (
        prev.cuit === nuevoCuit &&
        prev.direccion_entrega === nuevaDireccion &&
        prev.direccion_entrega_lat === nuevaLat &&
        prev.direccion_entrega_lng === nuevaLng
      ) {
        return prev;
      }

      return {
        ...prev,
        cuit: nuevoCuit,
        direccion_entrega: nuevaDireccion,
        direccion_entrega_lat: nuevaLat,
        direccion_entrega_lng: nuevaLng,
      };
    });

    setNumeroCliente(
      clienteCoincidente.id != null ? String(clienteCoincidente.id) : ""
    );
  }, [clienteCoincidente, setPedido]);

  const handleSeleccionCliente = (cliente) => {
    setUsarDireccionCliente(true);

    setPedido((prev) => ({
      ...prev,
      cliente: cliente.nombre ?? cliente.razon_social ?? "",
      cuit:
        cliente.numero_impositivo != null
          ? String(cliente.numero_impositivo)
          : "",
      direccion_entrega: cliente.domicilio_entrega ?? "",
      direccion_entrega_lat: cliente.domicilio_entrega_lat ?? null,
      direccion_entrega_lng: cliente.domicilio_entrega_lng ?? null,
    }));

    setNumeroCliente(cliente.id != null ? String(cliente.id) : "");
  };

  const handleNumeroClienteChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setNumeroCliente(value);

    if (!value) return;

    const cliente = clientesAutocomplete.find(
      (c) => String(c.id) === String(Number(value))
    );

    if (cliente) {
      handleSeleccionCliente(cliente);
    }
  };

  const preciosEspecialesOK =
    pedido.tipoPrecio !== "Especial" ||
    pedido.productos.every((p) => Number(p.precioEspecial) > 0);

  const entregaOK =
    pedido.tipoEntrega !== "Envio" ||
    (pedido.direccion_entrega?.trim().length > 0 &&
      pedido.direccion_entrega_lat != null &&
      pedido.direccion_entrega_lng != null);

  const puedeConfirmar =
    clienteValido &&
    pedido.cuit &&
    pedido.cliente &&
    pedido.productos.length > 0 &&
    pedido.tipoEntrega &&
    pedido.marca &&
    preciosEspecialesOK &&
    entregaOK;

  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-2xl font-semibold">Nuevo Pedido</h2>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Razon social/Nombre
            </label>

            <ClienteAutocomplete
              clientes={clientesAutocomplete}
              value={clienteCoincidente}
              inputValue={pedido.cliente || ""}
              onInputChange={(value) =>
                setPedido((prev) => ({
                  ...prev,
                  cliente: value,
                }))
              }
              onSelect={(cliente) => {
                if (!cliente) {
                  setNumeroCliente("");
                  setPedido((prev) => ({
                    ...prev,
                    cliente: "",
                    cuit: "",
                    direccion_entrega: "",
                    direccion_entrega_lat: null,
                    direccion_entrega_lng: null,
                  }));
                  return;
                }

                handleSeleccionCliente(cliente);
              }}
              placeholder="Buscar por razón social, nombre o dirección..."
              minChars={2}
              noResultsText="No se encontraron clientes."
            />

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
              textoBusqueda.length >= 2 && (
                <p className="mt-1 text-xs text-red-600">
                  Seleccioná un cliente existente de la lista.
                </p>
              )}
          </div>

          <div className="w-full space-y-1 md:w-40">
            <label className="text-sm font-medium text-slate-800">
              N° cliente
            </label>
            <Input value={numeroCliente} onChange={handleNumeroClienteChange} />
          </div>

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

        {pedido.tipoEntrega === "Envio" && clienteValido && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-800">
              Dirección de entrega
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={usarDireccionCliente ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setUsarDireccionCliente(true);
                  setPedido((prev) => ({
                    ...prev,
                    direccion_entrega:
                      clienteCoincidente?.domicilio_entrega ?? "",
                    direccion_entrega_lat:
                      clienteCoincidente?.domicilio_entrega_lat ?? null,
                    direccion_entrega_lng:
                      clienteCoincidente?.domicilio_entrega_lng ?? null,
                  }));
                }}
              >
                Usar dirección del cliente
              </Button>

              <Button
                type="button"
                variant={!usarDireccionCliente ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setUsarDireccionCliente(false);
                  setPedido((prev) => ({
                    ...prev,
                    direccion_entrega: "",
                    direccion_entrega_lat: null,
                    direccion_entrega_lng: null,
                  }));
                }}
              >
                Usar otra dirección
              </Button>
            </div>

            {usarDireccionCliente ? (
              <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {pedido.direccion_entrega ||
                  "Este cliente no tiene dirección de entrega cargada."}
              </div>
            ) : (
              <AddressAutocompleteInput
                value={pedido.direccion_entrega || ""}
                placeholder="Ingresá y seleccioná la nueva dirección"
                lat={pedido.direccion_entrega_lat}
                lng={pedido.direccion_entrega_lng}
                onTextChange={(value) =>
                  setPedido((prev) => ({
                    ...prev,
                    direccion_entrega: value,
                    direccion_entrega_lat: null,
                    direccion_entrega_lng: null,
                  }))
                }
                onSelectAddress={(data) => {
                  if (!data) {
                    setPedido((prev) => ({
                      ...prev,
                      direccion_entrega_lat: null,
                      direccion_entrega_lng: null,
                    }));
                    return;
                  }

                  setPedido((prev) => ({
                    ...prev,
                    direccion_entrega: data.formattedAddress,
                    direccion_entrega_lat: data.lat,
                    direccion_entrega_lng: data.lng,
                  }));
                }}
              />
            )}

            {pedido.tipoEntrega === "Envio" &&
              (pedido.direccion_entrega_lat == null ||
                pedido.direccion_entrega_lng == null) && (
                <p className="text-xs text-amber-700">
                  La dirección de entrega tiene que quedar seleccionada desde
                  Google Maps.
                </p>
              )}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-4">
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
                  setPedido((prev) => ({
                    ...prev,
                    tipoEntrega: "Retiro",
                    direccion_entrega: "",
                    direccion_entrega_lat: null,
                    direccion_entrega_lng: null,
                  }))
                }
              >
                Retiro
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Factura</span>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  pedido.tipo_factura === "Factura_A" ? "default" : "outline"
                }
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipo_factura: "Factura_A" }))
                }
              >
                Factura A
              </Button>

              <Button
                variant={
                  pedido.tipo_factura === "Factura_B" ? "default" : "outline"
                }
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipo_factura: "Factura_B" }))
                }
              >
                Factura B
              </Button>

              <Button
                variant={
                  pedido.tipo_factura === "Sin_Factura" ? "default" : "outline"
                }
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({
                    ...prev,
                    tipo_factura: "Sin_Factura",
                  }))
                }
              >
                Sin factura
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">
              Tipo de Precio
            </span>
            <div className="flex gap-2">
              <Button
                variant={
                  pedido.tipoPrecio === "Mayorista" ? "default" : "outline"
                }
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoPrecio: "Mayorista" }))
                }
              >
                Mayorista
              </Button>
              <Button
                variant={
                  pedido.tipoPrecio === "Minorista" ? "default" : "outline"
                }
                className="rounded-full px-4"
                type="button"
                onClick={() =>
                  setPedido((prev) => ({ ...prev, tipoPrecio: "Minorista" }))
                }
              >
                Minorista
              </Button>
              <Button
                variant={
                  pedido.tipoPrecio === "Especial" ? "default" : "outline"
                }
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

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Marca</span>
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

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="font-semibold">Agregar producto</h3>

          {!clienteValido && (
            <p className="mb-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
              Primero seleccioná un cliente válido para poder cargar productos.
            </p>
          )}

          {pedido.tipoPrecio === "Especial" && !preciosEspecialesOK && (
            <p className="text-xs text-red-600">
              Para precio Especial tenés que cargar el $/kg en todos los
              productos.
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <select
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={productoTemp.productoId}
              disabled={!clienteValido || cargandoProductos || !!errorProductos}
              onChange={(e) => {
                const id = e.target.value;
                const p = productosDisponibles.find(
                  (x) => String(x.id) === String(id)
                );
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

            <select
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={productoTemp.productoVarianteId}
              disabled={!clienteValido || !productoTemp.productoId}
              onChange={(e) => {
                const varId = e.target.value;
                const v = variantesDisponibles.find(
                  (x) => String(x.id) === String(varId)
                );
                setProductoTemp((prev) => ({
                  ...prev,
                  productoVarianteId: varId,
                  presentacion: v?.presentacion ?? "",
                }));
              }}
            >
              <option value="">
                {productoTemp.productoId
                  ? "Presentación"
                  : "Elegí la presentación"}
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
            <p className="mt-1 text-xs text-red-600">Error: {errorProductos}</p>
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
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1"
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
                                ? {
                                    ...p,
                                    precioEspecial:
                                      v === "" ? null : Number(v),
                                  }
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Fecha de envío/retiro (opcional)
            </label>
            <Input
              type="date"
              min={hoyISO}
              value={pedido.fecha || ""}
              onChange={handleFechaChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Notas (opcional)
            </label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              maxLength={200}
              value={pedido.notas || ""}
              onChange={(e) =>
                setPedido((prev) => ({ ...prev, notas: e.target.value }))
              }
            />
          </div>
        </div>

        <Button
          type="button"
          className="mt-2 w-full"
          disabled={!puedeConfirmar}
          onClick={handleAgregarPedidoClick}
        >
          Agregar pedido
        </Button>
      </CardContent>
    </Card>
  );
}