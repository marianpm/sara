// src/features/clientes/components/ClientesPanel.jsx
import React, { useMemo, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent } from "../../../shared/ui/card";
import { supabase } from "../../../shared/lib/supabaseClient";
import AddressAutocompleteInput from "../../../shared/components/AddressAutocompleteInput";
import { useClientesAdminSupabase } from "../hooks/useClientesAdminSupabase";
import {
  calcularPesoPromedioProducto,
  formatearKgPromedio,
} from "../../pedidos/utils/pedidosUtils";
import ClientesMapaPanel from "./ClientesMapaPanel";
import ClienteDetallePanel from "./ClienteDetallePanel";
import ClienteHistorialPedidosPanel from "./ClienteHistorialPedidosPanel";

const ESTADOS_APROBACION_CLIENTE = ["Aprobado", "Pendiente", "Rechazado"];

const TIPOS_CLIENTE = [
  "Fiambreria",
  "Restaurant",
  "Distribuidora",
  "Particular",
  "Frigorifico",
  "Focacceria",
  "Otro",
];

const normalizarTexto = (value) => {
  const texto = String(value ?? "").trim();
  return texto || null;
};

const formatFecha = (value) => {
  if (!value) return "-";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-AR");
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

const obtenerTotalPedido = (pedido) => {
  return (
    pedido?.total ??
    null
  );
};

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

const nombreVisibleCliente = (cliente) => {
  return (
    cliente.razon_social ||
    cliente.nombre_fantasia ||
    `${cliente.id_impositiva ?? ""} ${cliente.numero_impositivo ?? ""}`.trim() ||
    `Cliente ${cliente.id}`
  );
};

const clienteToForm = (cliente) => ({
  id: cliente.id,
  razon_social: cliente.razon_social ?? "",
  nombre_fantasia: cliente.nombre_fantasia ?? "",
  activo: Boolean(cliente.activo),
  id_impositiva: cliente.id_impositiva ?? "CUIT",
  numero_impositivo: cliente.numero_impositivo ?? "",
  domicilio_fiscal: cliente.domicilio_fiscal ?? "",
  domicilio_entrega: cliente.domicilio_entrega ?? "",
  domicilio_entrega_lat: cliente.domicilio_entrega_lat ?? "",
  domicilio_entrega_lng: cliente.domicilio_entrega_lng ?? "",
  estado_aprobacion: cliente.estado_aprobacion ?? "Pendiente",
  telefono: cliente.telefono ?? "",
  email: cliente.email ?? "",
  tipo: cliente.tipo ?? "Otro",
  condicion_iva: cliente.condicion_iva ?? "",
  observaciones: cliente.observaciones ?? "",
});

export default function ClientesPanel({
  usuarioActual,
  pedidosHistorial = [],
  cargandoPedidosHistorial = false,
  errorPedidosHistorial = null,
}) {
  const {
    clientes,
    cargandoClientes: cargando,
    errorClientes: error,
    resumenClientes,
    buscarClientes,
    cargarClientesConPedidosUltimos30Dias,
    limpiarClientes,
    reemplazarCliente,
  } = useClientesAdminSupabase();

  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaNumeroCliente, setBusquedaNumeroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [clienteEditando, setClienteEditando] = useState(null);
  const [form, setForm] = useState(null);

  const [clienteHistorial, setClienteHistorial] = useState(null);
  const [pedidosCliente, setPedidosCliente] = useState([]);
  const cargandoHistorial = cargandoPedidosHistorial;
  const [errorHistorial, setErrorHistorial] = useState(null);
  const [pedidoDetalleHistorial, setPedidoDetalleHistorial] = useState(null);
  const [vistaClientes, setVistaClientes] = useState("listado");
  const [clienteDetalle, setClienteDetalle] = useState(null);

  const [alerta, setAlerta] = useState(null);

  const mostrarAlerta = (tipo, mensaje) => {
    setAlerta({ tipo, mensaje });
    window.setTimeout(() => setAlerta(null), 3500);
  };

  const clientesFiltrados = useMemo(() => clientes || [], [clientes]);

  const abrirDetalleCliente = (cliente) => {
    setClienteDetalle(cliente);
    setVistaClientes("detalle");
  };

  const volverAlListadoClientes = () => {
    setVistaClientes("listado");
    setClienteDetalle(null);
  };

  const volverAlDetalleCliente = () => {
    if (!clienteDetalle && clienteHistorial) {
      setClienteDetalle(clienteHistorial);
    }

    setVistaClientes("detalle");
  };

  const abrirEdicion = (cliente) => {
    setClienteEditando(cliente);
    setForm(clienteToForm(cliente));
  };

  const cerrarEdicion = () => {
    if (guardando) return;
    setClienteEditando(null);
    setForm(null);
  };

  const actualizarCampo = (campo, value) => {
    setForm((prev) => ({
      ...prev,
      [campo]: value,
    }));
  };

  const handleDomicilioEntregaTextChange = (value) => {
    setForm((prev) => ({
      ...prev,
      domicilio_entrega: value,
      domicilio_entrega_lat: null,
      domicilio_entrega_lng: null,
    }));
  };

  const handleDomicilioEntregaSelect = (data) => {
    if (!data) {
      setForm((prev) => ({
        ...prev,
        domicilio_entrega_lat: null,
        domicilio_entrega_lng: null,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      domicilio_entrega: data.formattedAddress,
      domicilio_entrega_lat: data.lat,
      domicilio_entrega_lng: data.lng,
    }));
  };

  const abrirUbicacionEntrega = () => {
    if (!form) return;

    const direccion = String(form.domicilio_entrega || "").trim();

    const tieneCoordenadas =
      form.domicilio_entrega_lat !== "" &&
      form.domicilio_entrega_lng !== "" &&
      form.domicilio_entrega_lat != null &&
      form.domicilio_entrega_lng != null;

    if (!direccion && !tieneCoordenadas) return;

    const query = tieneCoordenadas
      ? `${form.domicilio_entrega_lat},${form.domicilio_entrega_lng}`
      : direccion;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const telefonoWhatsApp = (telefono) => {
    let soloNumeros = String(telefono || "").replace(/\D/g, "");

    if (!soloNumeros) return null;

    // Si ya viene como +549..., queda bien.
    if (soloNumeros.startsWith("549")) return soloNumeros;

    // Si ya viene como 54..., lo respetamos.
    if (soloNumeros.startsWith("54")) return soloNumeros;

    // Si empieza con 0, lo sacamos.
    if (soloNumeros.startsWith("0")) {
      soloNumeros = soloNumeros.slice(1);
    }

    // Para Argentina móvil asumimos +549.
    return `549${soloNumeros}`;
  };

  const tieneTelefonoCliente = (cliente) => {
    return Boolean(telefonoWhatsApp(cliente?.telefono));
  };

  const abrirMensajeCliente = (cliente) => {
    const telefono = telefonoWhatsApp(cliente?.telefono);
    if (!telefono) return;

    const nombreCliente = nombreVisibleCliente(cliente);
    const texto = `Hola ${nombreCliente}, te escribimos de Sarria.`;

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const abrirHistorialCliente = (cliente) => {
    if (!cliente?.id) return;

    setClienteDetalle(cliente);
    setClienteHistorial(cliente);
    setPedidoDetalleHistorial(null);
    setErrorHistorial(null);

    if (errorPedidosHistorial) {
      setPedidosCliente([]);
      setErrorHistorial(errorPedidosHistorial);
      setVistaClientes("historial");
      return;
    }

    const pedidosDelCliente = (pedidosHistorial || [])
      .filter((pedido) => String(pedido.cliente_id) === String(cliente.id))
      .sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();

        const fechaB = new Date(b.fecha).getTime();

        return fechaB - fechaA;
      });

    setPedidosCliente(pedidosDelCliente);
    setVistaClientes("historial");
  };

  const cerrarHistorialCliente = () => {
    setClienteHistorial(null);
    setPedidosCliente([]);
    setErrorHistorial(null);
    setPedidoDetalleHistorial(null);
  };

  const guardarCliente = async () => {
    if (!form) return;

    if (!form.estado_aprobacion) {
      mostrarAlerta("error", "Seleccioná el estado de aprobación.");
      return;
    }

    if (!form.tipo) {
      mostrarAlerta("error", "Seleccioná el tipo de cliente.");
      return;
    }

    setGuardando(true);

    const domicilioEntregaNormalizado = normalizarTexto(form.domicilio_entrega);

    const domicilioEntregaOriginal = normalizarTexto(
      clienteEditando?.domicilio_entrega
    );

    const cambioDomicilioEntrega =
      domicilioEntregaNormalizado !== domicilioEntregaOriginal;

    const lat =
      form.domicilio_entrega_lat === "" || form.domicilio_entrega_lat == null
        ? null
        : Number(form.domicilio_entrega_lat);

    const lng =
      form.domicilio_entrega_lng === "" || form.domicilio_entrega_lng == null
        ? null
        : Number(form.domicilio_entrega_lng);

    const tieneCoordenadasEntrega = lat != null && lng != null;

    if (
      (form.domicilio_entrega_lat !== "" &&
        form.domicilio_entrega_lat != null &&
        Number.isNaN(lat)) ||
      (form.domicilio_entrega_lng !== "" &&
        form.domicilio_entrega_lng != null &&
        Number.isNaN(lng))
    ) {
      mostrarAlerta("error", "Las coordenadas de entrega no son válidas.");
      setGuardando(false);
      return;
    }

    if (
      cambioDomicilioEntrega &&
      domicilioEntregaNormalizado &&
      !tieneCoordenadasEntrega
    ) {
      mostrarAlerta(
        "error",
        "Si cambiás el domicilio de entrega, tenés que seleccionarlo desde Google."
      );
      setGuardando(false);
      return;
    }

    const payload = {
      nombre_fantasia: normalizarTexto(form.nombre_fantasia),
      activo: Boolean(form.activo),
      domicilio_fiscal: normalizarTexto(form.domicilio_fiscal),
      domicilio_entrega: domicilioEntregaNormalizado,
      domicilio_entrega_lat: domicilioEntregaNormalizado ? lat : null,
      domicilio_entrega_lng: domicilioEntregaNormalizado ? lng : null,
      estado_aprobacion: form.estado_aprobacion,
      telefono: normalizarTexto(form.telefono),
      email: normalizarTexto(form.email),
      tipo: form.tipo,
      observaciones: normalizarTexto(form.observaciones),
    };

    const { data: clienteActualizado, error: updateError } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", form.id)
      .select("*")
      .single();

    if (updateError) {
      console.error(updateError);

      if (updateError.code === "23514") {
        mostrarAlerta(
          "error",
          "Algún valor no coincide con las opciones permitidas."
        );
      } else if (updateError.code === "42501") {
        mostrarAlerta("error", "No tenés permisos para editar clientes.");
      } else {
        mostrarAlerta("error", "No se pudo guardar el cliente.");
      }

      setGuardando(false);
      return;
    }

    if (clienteActualizado) {
      reemplazarCliente(clienteActualizado);
    }

    setGuardando(false);
    cerrarEdicion();
    mostrarAlerta("ok", "Cliente actualizado correctamente.");
  };

  const ejecutarBusquedaClientes = () => {
    buscarClientes({
      texto: busqueda,
      numeroCliente: busquedaNumeroCliente,
      estado: filtroEstado,
      tipo: filtroTipo,
    });
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-500">
            Consulta y edición de datos comerciales, de contacto y de entrega.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 rounded-full bg-slate-100 p-1">
            <Button
              type="button"
              variant={vistaClientes === "listado" ? "default" : "ghost"}
              className="rounded-full text-xs sm:text-sm"
              onClick={() => setVistaClientes("listado")}
            >
              Listado
            </Button>

            <Button
              type="button"
              variant={vistaClientes === "mapa" ? "default" : "ghost"}
              className="rounded-full text-xs sm:text-sm"
              onClick={() => setVistaClientes("mapa")}
            >
              Clientes en mapa
            </Button>
          </div>
        </CardContent>
      </Card>

      {vistaClientes === "listado" && (
        <>

      {alerta && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            alerta.tipo === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {alerta.mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Error cargando clientes: {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Total clientes</div>
            <div className="text-2xl font-bold">
              {resumenClientes.cargando ? "..." : resumenClientes.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">
              Con pedidos en últimos 30 días
            </div>
            <div className="text-2xl font-bold">
              {resumenClientes.cargando
                ? "..."
                : resumenClientes.conPedidosUltimos30Dias}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">
              Sin pedidos en últimos 30 días
            </div>
            <div className="text-2xl font-bold">
              {resumenClientes.cargando
                ? "..."
                : resumenClientes.sinPedidosUltimos30Dias}
            </div>
          </CardContent>
        </Card>
      </div>

      {resumenClientes.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo cargar el resumen de clientes: {resumenClientes.error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-[1.5fr_9rem_1fr_1fr_auto_auto]">
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  ejecutarBusquedaClientes();
                }
              }}
              placeholder="Buscar por cliente, CUIT, teléfono, email o domicilio..."
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />

            <input
              value={busquedaNumeroCliente}
              onChange={(event) =>
                setBusquedaNumeroCliente(event.target.value.replace(/\D/g, ""))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  ejecutarBusquedaClientes();
                }
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="N° cliente"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            />

            <select
              value={filtroEstado}
              onChange={(event) => setFiltroEstado(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="todos">Todos los estados</option>
              {ESTADOS_APROBACION_CLIENTE.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(event) => setFiltroTipo(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_CLIENTE.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={ejecutarBusquedaClientes}
              disabled={
                cargando ||
                (busqueda.trim().length < 2 && !busquedaNumeroCliente.trim())
              }
            >
              Buscar
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                cargarClientesConPedidosUltimos30Dias({
                  numeroCliente: busquedaNumeroCliente,
                  estado: filtroEstado,
                  tipo: filtroTipo,
                })
              }
              disabled={cargando}
            >
              Últimos 30 días
            </Button>
          </div>

          <div className="flex flex-col gap-1 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>
              {clientesFiltrados.length === 0
                ? "No se cargan clientes automáticamente. Buscá por texto o usá Últimos 30 días."
                : `Mostrando ${clientesFiltrados.length} clientes.`}
            </span>

            {clientesFiltrados.length > 0 && (
              <button
                type="button"
                className="text-left text-xs font-medium text-slate-600 underline md:text-right"
                onClick={limpiarClientes}
              >
                Limpiar resultados
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando clientes...
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay clientes para mostrar.
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="cursor-pointer border-b transition hover:bg-slate-50 last:border-b-0"
                      onClick={() => abrirDetalleCliente(cliente)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">
                          {nombreVisibleCliente(cliente)}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID {cliente.id} · Alta {formatFecha(cliente.created_at)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div>
                          {cliente.id_impositiva} {cliente.numero_impositivo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {cliente.condicion_iva || "Sin condición IVA"}
                        </div>
                      </td>

                      <td className="px-4 py-3">{cliente.tipo}</td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            cliente.estado_aprobacion === "Aprobado"
                              ? "bg-emerald-50 text-emerald-700"
                              : cliente.estado_aprobacion === "Rechazado"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {cliente.estado_aprobacion}
                        </span>
                      </td>

                      <td className="max-w-[260px] px-4 py-3">
                        <div className="truncate">
                          {cliente.domicilio_entrega || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirHistorialCliente(cliente);
                            }}
                          >
                            Historial
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirMensajeCliente(cliente);
                            }}
                            disabled={!tieneTelefonoCliente(cliente)}
                          >
                            Enviar mensaje
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirEdicion(cliente);
                            }}
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
       </Card>
      </>
      )}

      {clienteEditando && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Editar cliente</h2>
                  <p className="text-sm text-slate-500">
                    ID {clienteEditando.id} · creado por{" "}
                    {clienteEditando.creado_por_usuario_nombre || "-"}
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={cerrarEdicion}
                  disabled={guardando}
                >
                  Cerrar
                </Button>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
              <CampoTexto
                label="Razón social"
                value={form.razon_social}
                disabled
              />

              <CampoTexto
                label="Nombre de fantasía"
                value={form.nombre_fantasia}
                onChange={(value) => actualizarCampo("nombre_fantasia", value)}
              />

              <CampoTexto
                label="Tipo documento"
                value={form.id_impositiva}
                disabled
              />

              <CampoTexto
                label="Número impositivo"
                value={form.numero_impositivo}
                disabled
              />

              <CampoSelect
                label="Estado aprobación"
                value={form.estado_aprobacion}
                opciones={ESTADOS_APROBACION_CLIENTE}
                onChange={(value) => actualizarCampo("estado_aprobacion", value)}
              />

              <CampoSelect
                label="Tipo cliente"
                value={form.tipo}
                opciones={TIPOS_CLIENTE}
                onChange={(value) => actualizarCampo("tipo", value)}
              />

              <CampoTexto
                label="Condición IVA"
                value={form.condicion_iva || "Sin condición IVA"}
                disabled
              />

              <label className="space-y-1">
                <span className="text-sm font-medium">Activo</span>
                <select
                  value={form.activo ? "si" : "no"}
                  onChange={(event) =>
                    actualizarCampo("activo", event.target.value === "si")
                  }
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>

              <CampoTexto
                label="Teléfono"
                value={form.telefono}
                onChange={(value) => actualizarCampo("telefono", value)}
              />

              <CampoTexto
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => actualizarCampo("email", value)}
              />

              <div className="md:col-span-2">
                <CampoTexto
                  label="Domicilio fiscal"
                  value={form.domicilio_fiscal}
                  onChange={(value) => actualizarCampo("domicilio_fiscal", value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <AddressAutocompleteInput
                  id="cliente-edicion-domicilio-entrega-google"
                  name="domicilio_entrega_google"
                  label="Domicilio de entrega"
                  value={form.domicilio_entrega}
                  placeholder="Ingresá y seleccioná la dirección"
                  lat={form.domicilio_entrega_lat}
                  lng={form.domicilio_entrega_lng}
                  onTextChange={handleDomicilioEntregaTextChange}
                  onSelectAddress={handleDomicilioEntregaSelect}
                />

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={abrirUbicacionEntrega}
                    disabled={
                      !form.domicilio_entrega &&
                      (form.domicilio_entrega_lat == null ||
                        form.domicilio_entrega_lng == null)
                    }
                  >
                    Abrir ubicación
                  </Button>
                </div>

                <p className="text-xs text-slate-500">
                  Si modificás el domicilio de entrega, seleccionalo desde Google para actualizar
                  automáticamente la ubicación.
                </p>
              </div>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium">Observaciones</span>
                <textarea
                  value={form.observaciones}
                  onChange={(event) =>
                    actualizarCampo("observaciones", event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <Button
                variant="outline"
                onClick={cerrarEdicion}
                disabled={guardando}
              >
                Cancelar
              </Button>

              <Button onClick={guardarCliente} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pedidoDetalleHistorial && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Detalle del pedido</h2>
                  <p className="text-sm text-slate-500">
                    Pedido #{pedidoDetalleHistorial.id} ·{" "}
                    {formatFecha(pedidoDetalleHistorial.fecha)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPedidoDetalleHistorial(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <div>
                  <span className="font-medium">Estado:</span>{" "}
                  {obtenerEstadoPedidoVisible(pedidoDetalleHistorial)}
                </div>

                <div>
                  <span className="font-medium">Entrega:</span>{" "}
                  {pedidoDetalleHistorial.tipoEntrega || "-"}
                </div>

                <div>
                  <span className="font-medium">Factura:</span>{" "}
                  {pedidoDetalleHistorial.tipo_factura || "-"}
                </div>

                <div>
                  <span className="font-medium">Total:</span>{" "}
                  {obtenerTotalPedido(pedidoDetalleHistorial) != null
                    ? formatearMoneda(obtenerTotalPedido(pedidoDetalleHistorial))
                    : "-"}
                </div>

                <div>
                  <span className="font-medium">Marca:</span>{" "}
                  {pedidoDetalleHistorial.marca || "-"}
                </div>

                <div>
                  <span className="font-medium">Cargado por:</span>{" "}
                  {pedidoDetalleHistorial.creado_por_usuario_nombre ||
                    pedidoDetalleHistorial.creadoPor ||
                    "-"}
                </div>

                {(pedidoDetalleHistorial.direccion_entrega ||
                  pedidoDetalleHistorial.domicilio_entrega) && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Dirección:</span>{" "}
                    {pedidoDetalleHistorial.direccion_entrega ||
                      pedidoDetalleHistorial.domicilio_entrega}
                  </div>
                )}
              </div>

              {Array.isArray(pedidoDetalleHistorial.productos) &&
              pedidoDetalleHistorial.productos.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-800">
                    Productos
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">Presentación</th>
                          <th className="px-4 py-3 text-right">Cantidad</th>
                          <th className="px-4 py-3 text-right">Peso</th>
                          <th className="px-4 py-3 text-right">Promedio</th>
                          <th className="px-4 py-3 text-right">Precio/kg</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pedidoDetalleHistorial.productos.map((prod, index) => {
                          const promedio = calcularPesoPromedioProducto(prod);

                          return (
                            <tr
                              key={`${prod.productoVarianteId ?? prod.productoId ?? index}-${index}`}
                              className="border-b last:border-b-0"
                            >
                              <td className="px-4 py-3">
                                {prod.productoNombre ||
                                  prod.nombre ||
                                  prod.producto_nombre ||
                                  "-"}
                              </td>

                              <td className="px-4 py-3">
                                {prod.presentacion || "-"}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {prod.cantidad ?? "-"}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {prod.peso != null && !Number.isNaN(Number(prod.peso))
                                  ? `${prod.peso} kg`
                                  : "-"}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {promedio != null ? formatearKgPromedio(promedio) : "-"}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {prod.precioPorKg != null
                                  ? formatearMoneda(prod.precioPorKg)
                                  : prod.precioEspecial != null
                                  ? formatearMoneda(prod.precioEspecial)
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Este pedido no tiene productos cargados para mostrar.
                </div>
              )}

              {pedidoDetalleHistorial.notas && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <span className="font-medium">Notas:</span>{" "}
                  {pedidoDetalleHistorial.notas}
                </div>
                )}
            </div>
          </div>
        </div>
      )}

      {vistaClientes === "mapa" && <ClientesMapaPanel />}

      {vistaClientes === "detalle" && clienteDetalle && (
        <ClienteDetallePanel
          cliente={clienteDetalle}
          pedidosHistorial={pedidosHistorial}
          onVolver={volverAlListadoClientes}
          onEditar={abrirEdicion}
          onVerHistorial={abrirHistorialCliente}
          onEnviarMensaje={abrirMensajeCliente}
        />
      )}

      {vistaClientes === "historial" && clienteHistorial && (
        <ClienteHistorialPedidosPanel
          cliente={clienteHistorial}
          pedidos={pedidosCliente}
          cargando={cargandoPedidosHistorial}
          error={errorHistorial}
          onVolver={volverAlDetalleCliente}
          onVerDetallePedido={setPedidoDetalleHistorial}
        />
      )}
      </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={[
          "h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400",
          disabled
            ? "border-slate-200 bg-slate-100 text-slate-500"
            : "border-slate-200 bg-white text-slate-950",
        ].join(" ")}
      />
    </label>
  );
}

function CampoSelect({ label, value, opciones, onChange }) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
      >
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
    </label>
  );
}