// src/AprobacionesPanel.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { supabase } from "./supabaseClient";
import { registrarLog } from "./logsEventos";
import { formatFecha } from "./utils/pedidosUtils";

export default function AprobacionesPanel({ usuarioActual, recargarClientes, recargarPedidos }) {
  const [clientesPendientes, setClientesPendientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState(null);

  const [pedidosPendientes, setPedidosPendientes] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [errorPedidos, setErrorPedidos] = useState(null);


  function puedeAprobarPedido(pedido, clientesPendientes) {
    const hayClientePendiente = clientesPendientes.some(
      (cli) => cli.nombre === pedido.cliente_nombre
    );
    return !hayClientePendiente;
  }

  // === CLIENTES PENDIENTES ===

  const recargarClientesPendientes = useCallback(async () => {
    try {
      setCargandoClientes(true);
      setErrorClientes(null);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("estado_aprobacion", "Pendiente")
        .order("nombre", { ascending: true });

      if (error) throw error;

      setClientesPendientes(data || []);
    } catch (e) {
      console.error("Error cargando clientes pendientes:", e);
      setErrorClientes(e.message || String(e));
    } finally {
      setCargandoClientes(false);
    }
  }, []);

  // === PEDIDOS PENDIENTES (Pedidos + PedidoItems + estado del cliente) ===

  const recargarPedidosPendientes = useCallback(async () => {
    try {
      setCargandoPedidos(true);
      setErrorPedidos(null);

      // 1) Pedidos pendientes
      const { data: pedidosRaw, error: pedError } = await supabase
        .from("pedidos")
        .select("*")
        .eq("estado_aprobacion", "Pendiente")
        .order("created_at", { ascending: true });

      if (pedError) throw pedError;

      if (!pedidosRaw || pedidosRaw.length === 0) {
        setPedidosPendientes([]);
        return;
      }

      // 2) Items de esos pedidos
      const idsPedidos = pedidosRaw.map((p) => p.id);

      const { data: itemsRaw, error: itemsError } = await supabase
        .from("pedidoItems")
        .select("*")
        .in("pedido_id", idsPedidos)
        .order("nro_linea", { ascending: true });

      if (itemsError) throw itemsError;

      const itemsPorPedidoId = {};
      (itemsRaw || []).forEach((it) => {
        if (!itemsPorPedidoId[it.pedido_id]) {
          itemsPorPedidoId[it.pedido_id] = [];
        }
        itemsPorPedidoId[it.pedido_id].push({
          itemId: it.id,
          productoNombre: it.producto_nombre,
          tipo: it.producto_nombre,
          cantidad: it.cantidad,
          peso: it.peso_kg,
        });
      });

      // 3) Traer estado_aprobacion de los clientes de esos pedidos
      const nombresClientes = [
        ...new Set(
          (pedidosRaw || [])
            .map((p) => p.cliente_nombre)
            .filter((n) => !!n)
        ),
      ];

      let mapaClientes = {};
      if (nombresClientes.length > 0) {
        const { data: clientesRel, error: cliError } = await supabase
          .from("clientes")
          .select("id, nombre, estado_aprobacion")
          .in("nombre", nombresClientes);

        if (cliError) throw cliError;

        (clientesRel || []).forEach((c) => {
          mapaClientes[c.nombre] = c;
        });
      }

      // 4) Construir vista del pedido (similar al hook de pedidos)
      const vista = (pedidosRaw || []).map((pr) => {
        const notas =
          pr.observaciones ??
          pr.Observaciones ??
          "";

        const clienteRow = mapaClientes[pr.cliente_nombre] || null;

        return {
          ...pr,
          cliente: pr.cliente_nombre,
          fecha: pr.fecha_solicitada || "",
          tipoEntrega: pr.tipo_entrega,
          productos: itemsPorPedidoId[pr.id] || [],
          notas,
          clienteId: clienteRow?.id ?? null,
          clienteEstadoAprobacion: clienteRow?.estado_aprobacion ?? null,
        };
      });

      setPedidosPendientes(vista);
    } catch (e) {
      console.error("Error cargando pedidos pendientes:", e);
      setErrorPedidos(e.message || String(e));
    } finally {
      setCargandoPedidos(false);
    }
  }, []);

  useEffect(() => {
    recargarClientesPendientes();
    recargarPedidosPendientes();
  }, [recargarClientesPendientes, recargarPedidosPendientes]);

  // === Acciones Clientes ===

  const aprobarCliente = async (cliente) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ estado_aprobacion: "Aprobado" })
        .eq("id", cliente.id);

      if (error) throw error;

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} aprobó el cliente "${cliente.nombre}" (ID ${cliente.id})`
      );

      await recargarClientesPendientes();
      
      
      await recargarClientes();
      
    } catch (e) {
      console.error("Error aprobando cliente:", e);
      alert("Error aprobando cliente: " + (e.message || String(e)));
    }
  };

  const rechazarCliente = async (cliente) => {
    try {
      const { error } = await supabase
        .from("clientes")
        .update({ estado_aprobacion: "Rechazado" })
        .eq("id", cliente.id);

      if (error) throw error;

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} rechazó el cliente "${cliente.nombre}" (ID ${cliente.id})`
      );

      await recargarClientesPendientes();

      // refrescar lista global también
      if (typeof recargarClientes === "function") {
        await recargarClientes();
      }
    } catch (e) {
      console.error("Error rechazando cliente:", e);
      alert("Error rechazando cliente: " + (e.message || String(e)));
    }
  };

  // === Acciones Pedidos ===

  const aprobarPedido = async (pedido) => {
    try {
      // chequeo defensivo en base: ¿el cliente está aprobado?
      const clienteNombre = pedido.cliente_nombre || pedido.cliente;
      if (clienteNombre) {
        const { data: cliente, error: cliError } = await supabase
          .from("clientes")
          .select("estado_aprobacion")
          .eq("nombre", clienteNombre)
          .maybeSingle();

        if (cliError) throw cliError;

        if (!cliente || cliente.estado_aprobacion !== "Aprobado") {
          alert(
            "No se puede aprobar el pedido porque el cliente todavía no está aprobado."
          );
          return;
        }
      }

      const { error } = await supabase
        .from("pedidos")
        .update({ estado_aprobacion: "Aprobado" })
        .eq("id", pedido.id);

      if (error) throw error;

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} aprobó el pedido (ID ${pedido.id}) del cliente "${pedido.cliente ?? ""}"`
      );

      await recargarPedidosPendientes();

      // refrescar lista global de pedidos (Pesajes/Entregas)
      if (typeof recargarPedidos === "function") {
        await recargarPedidos();
      }
    } catch (e) {
      console.error("Error aprobando pedido:", e);
      alert("Error aprobando pedido: " + (e.message || String(e)));
    }
  };

  const rechazarPedido = async (pedido) => {
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado_aprobacion: "Rechazado" })
        .eq("id", pedido.id);

      if (error) throw error;

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} rechazó el pedido (ID ${pedido.id}) del cliente "${pedido.cliente ?? ""}"`
      );

      await recargarPedidosPendientes();

      if (typeof recargarPedidos === "function") {
        await recargarPedidos();
      }
    } catch (e) {
      console.error("Error rechazando pedido:", e);
      alert("Error rechazando pedido: " + (e.message || String(e)));
    }
  };

  return (
    <div className="space-y-6">
      {/* CLIENTES PENDIENTES */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">
            Clientes pendientes de aprobación
          </h2>

          {cargandoClientes && (
            <p className="text-sm text-slate-500">
              Cargando clientes pendientes...
            </p>
          )}

          {errorClientes && (
            <p className="text-sm text-red-600">Error: {errorClientes}</p>
          )}

          {!cargandoClientes &&
            !errorClientes &&
            clientesPendientes.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay clientes pendientes.
              </p>
            )}

          {clientesPendientes.length > 0 && (
            <ul className="divide-y divide-slate-200">
              {clientesPendientes.map((cli) => (
                <li
                  key={cli.id}
                  className="py-2 flex justify-between items-center gap-4"
                >
                  <div className="text-sm">
                    <div className="font-medium">{cli.nombre}</div>
                    <div className="text-xs text-slate-500">
                      ID #{cli.id} · {cli.id_impositiva} {cli.numero}
                      {cli.domicilio ? ` · ${cli.domicilio}` : ""}
                    </div>
                    <div className="text-xs text-slate-500">
                      Cargado por: {cli.creado_por_usuario_nombre}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rechazarCliente(cli)}
                    >
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => aprobarCliente(cli)}
                    >
                      Aprobar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* PEDIDOS PENDIENTES */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-lg font-semibold">
            Pedidos pendientes de aprobación
          </h2>

          {cargandoPedidos && (
            <p className="text-sm text-slate-500">
              Cargando pedidos pendientes...
            </p>
          )}

          {errorPedidos && (
            <p className="text-sm text-red-600">Error: {errorPedidos}</p>
          )}

          {!cargandoPedidos &&
            !errorPedidos &&
            pedidosPendientes.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay pedidos pendientes.
              </p>
            )}

          {pedidosPendientes.length > 0 && (
            <ul className="divide-y divide-slate-200">
              {pedidosPendientes.map((ped) => {
                const clienteAprobado =
                  ped.clienteEstadoAprobacion === "Aprobado";
                const habilitado = puedeAprobarPedido(ped, clientesPendientes);

                return (
                  <li
                    key={ped.id}
                    className="py-2 flex justify-between items-start gap-4"
                  >
                    <div className="text-sm flex-1">
                      <div className="font-medium">
                        Pedido para: {ped.cliente}
                      </div>
                      <div className="text-xs text-slate-500">
                        Fecha:{" "}
                        {ped.fecha ? formatFecha(ped.fecha) : "sin fecha"} · Tipo
                        entrega: {ped.tipoEntrega ?? "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Cliente ID:{" "}
                        {ped.clienteId ? `#${ped.clienteId}` : "desconocido"} ·
                        Estado cliente:{" "}
                        {ped.clienteEstadoAprobacion || "sin información"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Cargado por: {ped.creado_por_usuario_nombre}
                      </div>

                      {!clienteAprobado && (
                        <p className="mt-1 text-xs text-amber-700">
                          Este pedido no puede aprobarse hasta que el cliente
                          esté aprobado.
                        </p>
                      )}

                      {/* Productos del pedido */}
                      {Array.isArray(ped.productos) &&
                        ped.productos.length > 0 && (
                          <ul className="mt-1 list-disc list-inside text-xs text-slate-600">
                            {ped.productos.map((prod, idx) => (
                              <li key={idx}>
                                {prod.tipo} x {prod.cantidad}
                                {prod.peso != null &&
                                  !Number.isNaN(prod.peso) && (
                                    <> — {prod.peso} kg</>
                                  )}
                              </li>
                            ))}
                          </ul>
                        )}

                      {ped.notas && (
                        <p className="mt-1 text-xs text-slate-500">
                          Notas: {ped.notas}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rechazarPedido(ped)}
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        disabled={!habilitado}
                        title={
                          !habilitado
                            ? "Primero aprobá el cliente antes de aprobar el pedido"
                            : "Aprobar pedido"
                        }
                        onClick={() => habilitado && aprobarPedido(ped)}
                      >
                        Aprobar
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
