// src/Sara.jsx
import React, { useState, useEffect } from "react";

import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

import { useProductosSupabase } from "./hooks/useProductosSupabase";
import { useClientesSupabase } from "./hooks/useClientesSupabase";
import { usePedidosSupabase } from "./hooks/usePedidosSupabase";

import PedidoForm from "./PedidoForm";
import AprobacionesPanel from "./AprobacionesPanel";
import PesajesPanel from "./PesajesPanel";
import EntregasPanel from "./EntregasPanel";
import NuevoClienteForm from "./NuevoClienteForm";

import { formatFecha } from "./utils/pedidosUtils";
import { printPedido } from "./utils/printPedido";


// Modelo base de pedido
const modeloVacio = {
  cuit: "",
  cliente: "",
  direccion: "",
  productos: [],
  fecha: "",
  tipoEntrega: "", // "Envio" | "Retiro"
  entregado: false,
  notas: "",
  factura: true,
  tipoPrecio: "Mayorista", // "Mayorista" | "Minorista" 
  marca: "Sarria", // "Sarria" | "1319" 
};

export default function Sara({ usuarioActual }) {
  const esAdmin = usuarioActual?.rol === "Admin";
  const esOperario = usuarioActual?.rol === "Operario";
  const esCorredor = usuarioActual?.rol === "Corredor";

  const [pedido, setPedido] = useState(modeloVacio);
  const [productoTemp, setProductoTemp] = useState({
    tipo: "",
    cantidad: 1,
    peso: null,
  });

  // pestañas: si es admin arranca en Nuevo Cliente, si no, en Pesajes
  const [tabValue, setTabValue] = useState(
    esCorredor || esAdmin ? "nuevo" : "pendientes"
  );
  const [filtroFecha, setFiltroFecha] = useState("hoy"); // "hoy" | "semana" | "todas"

  // Estado para el modal de pesajes
  const [indicePedidoPesaje, setIndicePedidoPesaje] = useState(null);
  const [pesosTemp, setPesosTemp] = useState([]);

  // Modal de confirmación (pedido / eliminar / entregar)
  const [confirmConfig, setConfirmConfig] = useState(null);

  const hoy = new Date();
  const hoyISO = hoy.toISOString().split("T")[0];

  // Productos desde Supabase
  const { productosSupabase, cargandoProductos, errorProductos } =
    useProductosSupabase();
  const tiposDisponibles = productosSupabase.map((p) => p.nombre);

  // Clientes desde Supabase
  const {
    clientes: clientesSupabase,
    cargandoClientes,
    errorClientes,
    recargarClientes,
  } = useClientesSupabase();

  // Pedidos desde hook centralizado
  const {
    pedidos,
    cargandoPedidos,
    errorPedidos,
    recargarPedidos,
    agregarPedidoConfirmado,
    actualizarPesajes,
    marcarEntregadoPedido,
    eliminarPedido,
  } = usePedidosSupabase({
    clientesSupabase,
    productosSupabase,
    cargandoClientes,
    cargandoProductos,
    usuarioActual,
  });

  useEffect(() => {
    // Cada vez que cambia el usuario (o su rol), reseteamos la pestaña inicial
    if (esCorredor || esAdmin) {
      setTabValue("nuevo");
    } else {
      setTabValue("pendientes");
    }
  }, [esAdmin, esCorredor]);

  // Resetear formularios cuando cambio de tab
  useEffect(() => {
    if (tabValue === "nuevo") {
      setPedido(modeloVacio);
      setProductoTemp({ tipo: "", cantidad: 1, peso: null });
    }
  }, [tabValue]);


  // --- Handlers de UI de pedido (solo manejan estado local) ---

  const handleCuitChange = (e) => {
    const cuit = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPedido((prev) => ({
      ...prev,
      cuit,
    }));
  };

  const agregarProducto = () => {
    if (
      productoTemp.tipo &&
      productoTemp.cantidad > 0 &&
      !/^0/.test(productoTemp.cantidad.toString())
    ) {
      setPedido((prev) => ({
        ...prev,
        productos: [...prev.productos, { ...productoTemp, peso: null }],
      }));
      setProductoTemp({ tipo: "", cantidad: 1, peso: null });
    }
  };

  const eliminarProducto = (tipo) => {
    setPedido((prev) => ({
      ...prev,
      productos: prev.productos.filter((p) => p.tipo !== tipo),
    }));
  };

  const handleAgregarPedidoClick = () => {
    const nombreActual = (pedido.cliente || "").toLowerCase().trim();

    const clienteCoincidente = (clientesSupabase || []).find(
      (c) =>
        c.nombre && c.nombre.toLowerCase().trim() === nombreActual
    );

    if (
      !clienteCoincidente ||
      !pedido.cuit ||
      !pedido.cliente ||
      pedido.productos.length === 0 ||
      !pedido.tipoEntrega
    ) {
      return;
    }

    const pedidoSnapshot = {
      ...pedido,
      productos: pedido.productos.map((p) => ({ ...p })),
    };

    setConfirmConfig({
      type: "confirmPedido",
      title: "Confirmar pedido",
      pedido: pedidoSnapshot,
    });
  };

  const esDomingo = (fecha) => {
    const d = new Date(fecha);
    return d.getDay() === 0;
  };

  const handleFechaChange = (e) => {
    const fechaElegida = e.target.value;
    const hoySinHora = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );
    const fechaIngresada = new Date(fechaElegida);
    if (esDomingo(fechaElegida) || fechaIngresada < hoySinHora) return;
    setPedido((prev) => ({ ...prev, fecha: fechaElegida }));
  };

  // ---- Lógica de pesajes (UI) ----

  const abrirPesaje = (indexGlobal) => {
    const pedidoSeleccionado = pedidos[indexGlobal];
    setIndicePedidoPesaje(indexGlobal);
    setPesosTemp(
      pedidoSeleccionado.productos.map((prod) =>
        prod.peso != null && !Number.isNaN(prod.peso) ? String(prod.peso) : ""
      )
    );
  };

  const cerrarPesaje = () => {
    setIndicePedidoPesaje(null);
    setPesosTemp([]);
  };

  const guardarPesajes = async () => {
    if (indicePedidoPesaje === null) return;

    const pedidoSeleccionado = pedidos[indicePedidoPesaje];
    if (!pedidoSeleccionado) return;

    const nuevosPesos = pedidoSeleccionado.productos.map((prod, i) => {
      const valor = pesosTemp[i];
      const pesoNum =
        valor !== "" && valor != null
          ? parseFloat(String(valor).replace(",", "."))
          : null;
      return !Number.isNaN(pesoNum) ? pesoNum : null;
    });

    await actualizarPesajes(pedidoSeleccionado, nuevosPesos);
    cerrarPesaje();
  };

  const marcarEntregado = async (indexGlobal) => {
    const pedidoSel = pedidos[indexGlobal];
    if (!pedidoSel) return;
    await marcarEntregadoPedido(pedidoSel);
  };

  const eliminarPedidoPorIndex = async (index) => {
    const pedidoSel = pedidos[index];
    if (!pedidoSel) return;
    await eliminarPedido(pedidoSel);
  };

  // ---- Modal de confirmación genérico ----
  const cerrarConfirmModal = () => setConfirmConfig(null);

  const confirmarAccionModal = async () => {
    if (!confirmConfig) return;

    if (confirmConfig.type === "confirmPedido" && confirmConfig.pedido) {
      await agregarPedidoConfirmado(confirmConfig.pedido);

      // limpiar formulario de nuevo pedido
      setPedido(modeloVacio);
      setProductoTemp({ tipo: "", cantidad: 1, peso: null });
    }

    if (confirmConfig.type === "eliminarPedido") {
      const index = confirmConfig.index;
      await eliminarPedidoPorIndex(index);
    }

    if (confirmConfig.type === "marcarEntregado") {
      const index = confirmConfig.index;
      await marcarEntregado(index);
    }

    setConfirmConfig(null);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
            {esAdmin && (
              <>
                <Button
                  variant={tabValue === "aprobaciones" ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setTabValue("aprobaciones")}
                >
                  Aprobaciones
                </Button>
              </>
            )}
            {(esAdmin || esCorredor) && (
              <>
                <Button
                  variant={
                    tabValue === "nuevoCliente" ? "default" : "ghost"
                  }
                  className="rounded-full"
                  onClick={() => setTabValue("nuevoCliente")}
                >
                  Nuevo cliente
                </Button>
                <Button
                  variant={tabValue === "nuevo" ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setTabValue("nuevo")}
                >
                  Nuevo pedido
                </Button>
              </>
            )}
            {(esAdmin || esOperario ) && (
              <>
                <Button
                  variant={tabValue === "pendientes" ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setTabValue("pendientes")}
                >
                  Pesajes
                </Button>
                <Button
                  variant={tabValue === "entregas" ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setTabValue("entregas")}
                >
                  Entregas
                </Button>
              </>
            )}
          </div>
        </div>

        {/* NUEVO CLIENTE (solo admin) */}
        {(esAdmin || esCorredor) && tabValue === "nuevoCliente" && (
          <NuevoClienteForm
            usuarioActual={usuarioActual}
            onClienteCreado={async () => {
              // cuando se crea un cliente:
              // 1) recargo el listado para el autocomplete
              // 2) cambio la pestaña a "Nuevo pedido"
              if (typeof recargarClientes === "function") {
                await recargarClientes();
              }
              setTabValue("nuevo");
            }}
          />
        )}

        {/* NUEVO PEDIDO */}
        {tabValue === "nuevo" && (
          <PedidoForm
            pedido={pedido}
            productoTemp={productoTemp}
            setPedido={setPedido}
            setProductoTemp={setProductoTemp}
            tiposDisponibles={tiposDisponibles}
            cargandoProductos={cargandoProductos}
            errorProductos={errorProductos}
            hoyISO={hoyISO}
            handleCuitChange={handleCuitChange}
            agregarProducto={agregarProducto}
            eliminarProducto={eliminarProducto}
            handleFechaChange={handleFechaChange}
            handleAgregarPedidoClick={handleAgregarPedidoClick}
            clientesSupabase={clientesSupabase}
            cargandoClientes={cargandoClientes}
            errorClientes={errorClientes}
          />
        )}

        {/* PESAJES */}
        {tabValue === "pendientes" && (
          <PesajesPanel
            pedidos={pedidos}
            filtroFecha={filtroFecha}
            setFiltroFecha={setFiltroFecha}
            abrirPesaje={abrirPesaje}
            setConfirmConfig={setConfirmConfig}
            printPedido={printPedido}
            usuarioActual={usuarioActual}
          />
        )}

        {/* ENTREGAS */}
        {tabValue === "entregas" && (
          <EntregasPanel
            pedidos={pedidos}
            filtroFecha={filtroFecha}
            setFiltroFecha={setFiltroFecha}
            setConfirmConfig={setConfirmConfig}
            usuarioActual={usuarioActual}
          />
        )}

        {/* APROBACIONES (solo admin) */}
        {esAdmin && tabValue === "aprobaciones" && (
          <AprobacionesPanel 
            usuarioActual={usuarioActual}
            recargarClientes={recargarClientes}
            recargarPedidos={recargarPedidos} />
        )}

        {cargandoPedidos && (
          <p className="text-xs text-slate-500 text-center">
            Cargando pedidos...
          </p>
        )}
        {errorPedidos && (
          <p className="text-xs text-red-600 text-center">
            Error cargando pedidos: {errorPedidos}
          </p>
        )}
      </div>

      {/* Modal pesajes */}
      {indicePedidoPesaje !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full mx-4">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Asignar pesajes</h2>
              {pedidos[indicePedidoPesaje] && (
                <>
                  <p className="text-sm text-slate-600">
                    Cliente:{" "}
                    <span className="font-medium">
                      {pedidos[indicePedidoPesaje].cliente}
                    </span>{" "}
                    (ID: {pedidos[indicePedidoPesaje].cuit})
                  </p>
                  <div className="space-y-3">
                    {pedidos[indicePedidoPesaje].productos.map((prod, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                      >
                        {/* Descripción del producto */}
                        <div className="text-sm">
                          <div
                            className="font-medium truncate"
                            title={prod.tipo}  // tooltip con el nombre completo
                          >
                            {prod.tipo}
                          </div>
                          <div className="text-slate-500 text-xs">
                            Cantidad: {prod.cantidad}
                          </div>
                        </div>

                        {/* Campo de peso + unidad */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            className="w-21 h-8 text-center text-sm"
                            value={pesosTemp[i] ?? ""}
                            onChange={(e) => {
                              let value = e.target.value;

                              if (value === "") {
                                setPesosTemp((prev) => {
                                  const nuevo = [...prev];
                                  nuevo[i] = "";
                                  return nuevo;
                                });
                                return;
                              }

                              let numero = Number(value);
                              if (Number.isNaN(numero)) return;

                              if (numero < 0) numero = 0;
                              if (numero > 10000) numero = 10000;
                              numero = Math.round(numero * 100) / 100;

                              setPesosTemp((prev) => {
                                const nuevo = [...prev];
                                nuevo[i] = numero;
                                return nuevo;
                              });
                            }}
                            placeholder="kg"
                          />
                          <span className="text-xs text-slate-500">kg</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cerrarPesaje}>
                  Cancelar
                </Button>
                <Button onClick={guardarPesajes}>Guardar pesajes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">{confirmConfig.title}</h2>

              {confirmConfig.type === "confirmPedido" &&
                confirmConfig.pedido && (
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>¿Confirmás el siguiente pedido?</p>
                    <p>
                      <strong>ID:</strong> {confirmConfig.pedido.cuit}
                    </p>
                    <p>
                      <strong>Cliente:</strong> {confirmConfig.pedido.cliente}
                    </p>
                    <p>
                      <strong>Dirección:</strong>{" "}
                      {confirmConfig.pedido.direccion || "Sin definir"}
                    </p>
                    <p>
                      <strong>Tipo de entrega:</strong>{" "}
                      {confirmConfig.pedido.tipoEntrega}
                    </p>
                    <p>
                      <strong>Factura:</strong> {confirmConfig.pedido.factura ? "Sí" : "No"}
                    </p>
                    <p>
                      <strong>Tipo de precio:</strong>{" "}
                      {confirmConfig.pedido.tipoPrecio}
                    </p>
                    <p>
                      <strong>Marca:</strong>{" "}
                      {confirmConfig.pedido.marca}
                    </p>
                    <p>
                      <strong>Fecha:</strong>{" "}
                      {confirmConfig.pedido.fecha
                        ? formatFecha(confirmConfig.pedido.fecha)
                        : "Sin fecha definida"}
                    </p>
                    <div>
                      <strong>Productos:</strong>
                      <ul className="list-disc list-inside">
                        {confirmConfig.pedido.productos.map((prod, idx) => (
                          <li key={idx}>
                            {prod.tipo} x {prod.cantidad}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {confirmConfig.pedido.notas && (
                      <p>
                        <strong>Notas:</strong> {confirmConfig.pedido.notas}
                      </p>
                    )}
                  </div>
                )}

              {confirmConfig.type === "eliminarPedido" && (
                <p className="text-sm text-slate-700">
                  ¿Estás seguro de eliminar este pedido? Esta acción no se puede
                  deshacer.
                </p>
              )}

              {confirmConfig.type === "marcarEntregado" && (
                <p className="text-sm text-slate-700">
                  ¿Marcar este pedido como entregado?
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cerrarConfirmModal}>
                  Cancelar
                </Button>
                <Button onClick={confirmarAccionModal}>Confirmar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
