// src/CuentaCorrientePanel.jsx
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import DetalleClienteModal from "./components/DetalleClienteModal";
import { printEstadoCuenta } from "./utils/printEstadoCuenta";

const hoyISO = () => new Intl.DateTimeFormat("en-CA").format(new Date());

const formatMoney = (value) => {
  const n = Number(value || 0);

  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
};

const formatFecha = (value) => {
  if (!value) return "-";

  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("es-AR");
};

const normalizarImporte = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const compararPorFechaDescYCreacionDesc = (a, b, campoFecha) => {
  const fechaA = a?.[campoFecha] || "";
  const fechaB = b?.[campoFecha] || "";

  if (fechaA !== fechaB) {
    return fechaB.localeCompare(fechaA);
  }

  const creadoA = a?.created_at || "";
  const creadoB = b?.created_at || "";

  if (creadoA !== creadoB) {
    return creadoB.localeCompare(creadoA);
  }

  return 0;
};

const comprobanteLabel = (cargo) => {
  if (cargo?.comprobante_label) return cargo.comprobante_label;

  if (cargo?.tipo_cargo === "pedido_sin_factura") {
    return `Pedido #${cargo.pedido_id} sin factura`;
  }

  if (!cargo?.numero_comprobante) return "-";

  const pv = String(cargo.punto_venta || "").padStart(4, "0");
  const nro = String(cargo.numero_comprobante || "").padStart(8, "0");

  return `${cargo.tipo_comprobante || ""} ${pv}-${nro}`;
};

const estadoCobroClass = (estado) => {
  if (estado === "Cobrada") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (estado === "Parcial") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-red-50 text-red-700 border-red-200";
};

const saldoClass = (value) => {
  const n = Number(value || 0);

  if (n > 0) return "text-red-700";
  if (n < 0) return "text-emerald-700";
  return "text-slate-700";
};

const calcularAplicacionesAutomaticas = (cargosPendientes, importeTotal) => {
  let restante = normalizarImporte(importeTotal);
  const aplicaciones = [];

  for (const cargo of cargosPendientes) {
    if (restante <= 0) break;

    const saldoCargo = normalizarImporte(cargo.saldo_pendiente);
    if (saldoCargo <= 0) continue;

    const importeAplicado = Math.min(restante, saldoCargo);
    const importeRedondeado = normalizarImporte(importeAplicado);

    if (importeRedondeado > 0) {
      aplicaciones.push({
        cargo_id: cargo.cargo_id,
        cargo,
        importe_aplicado: importeRedondeado,
      });

      restante = normalizarImporte(restante - importeRedondeado);
    }
  }

  return aplicaciones;
};

export default function CuentaCorrientePanel({
  resumenClientes = [],
  cargos = [],
  movimientos = [],
  cobros = [],
  cargando = false,
  error = null,
  registrarCobro,
  anularCobro,
  aplicarSaldoAFavor,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState(null);
  const [detalleTab, setDetalleTab] = useState("movimientos");

  const [clienteDetalleModal, setClienteDetalleModal] = useState(null);

  const [clienteCobro, setClienteCobro] = useState(null);
  const [formCobro, setFormCobro] = useState({
    fechaCobro: hoyISO(),
    medioPago: "Transferencia",
    importeTotal: "",
    observacion: "",
  });
  const [guardandoCobro, setGuardandoCobro] = useState(false);
  const [errorCobro, setErrorCobro] = useState(null);

  const [cobroAAnular, setCobroAAnular] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [anulandoCobro, setAnulandoCobro] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState(null);

  const [aplicandoSaldo, setAplicandoSaldo] = useState(false);
  const [errorAplicarSaldo, setErrorAplicarSaldo] = useState(null);

  const [clienteAplicarSaldo, setClienteAplicarSaldo] = useState(null);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return (resumenClientes || []).filter((c) => {
      if (!q) return true;

      return [
        c.razon_social,
        c.nombre_fantasia,
        c.numero_impositivo,
        c.email,
        c.telefono,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [resumenClientes, busqueda]);

  const clienteSeleccionado = useMemo(() => {
    return (resumenClientes || []).find(
      (c) => String(c.cliente_id) === String(clienteSeleccionadoId)
    );
  }, [resumenClientes, clienteSeleccionadoId]);

  const cargosCliente = useMemo(() => {
    if (!clienteSeleccionadoId) return [];

    return (cargos || [])
      .filter((c) => String(c.cliente_id) === String(clienteSeleccionadoId))
      .sort((a, b) =>
        compararPorFechaDescYCreacionDesc(a, b, "fecha_emision")
      );
  }, [cargos, clienteSeleccionadoId]);

  const movimientosCliente = useMemo(() => {
    if (!clienteSeleccionadoId) return [];

    return (movimientos || [])
      .filter((m) => String(m.cliente_id) === String(clienteSeleccionadoId))
      .sort((a, b) => compararPorFechaDescYCreacionDesc(a, b, "fecha"));
  }, [movimientos, clienteSeleccionadoId]);

  const cobrosCliente = useMemo(() => {
    if (!clienteSeleccionadoId) return [];

    return (cobros || [])
      .filter((c) => String(c.cliente_id) === String(clienteSeleccionadoId))
      .sort((a, b) =>
        compararPorFechaDescYCreacionDesc(a, b, "fecha_cobro")
      );
  }, [cobros, clienteSeleccionadoId]);

  const cargosPendientesCobro = useMemo(() => {
    if (!clienteCobro) return [];

    return (cargos || [])
      .filter(
        (c) =>
          String(c.cliente_id) === String(clienteCobro.cliente_id) &&
          Number(c.saldo_pendiente || 0) > 0
      )
      .sort((a, b) => {
        const fa = a.fecha_emision || "";
        const fb = b.fecha_emision || "";
        return fa.localeCompare(fb);
      });
  }, [cargos, clienteCobro]);

  const importeCobro = useMemo(
    () => normalizarImporte(formCobro.importeTotal),
    [formCobro.importeTotal]
  );

  const aplicacionesPreview = useMemo(() => {
    return calcularAplicacionesAutomaticas(
      cargosPendientesCobro,
      importeCobro
    );
  }, [cargosPendientesCobro, importeCobro]);

  const totalAplicadoPreview = useMemo(() => {
    return aplicacionesPreview.reduce(
      (acc, a) => acc + Number(a.importe_aplicado || 0),
      0
    );
  }, [aplicacionesPreview]);

  const saldoSinAplicarPreview = useMemo(() => {
    return Math.max(
      normalizarImporte(importeCobro - totalAplicadoPreview),
      0
    );
  }, [importeCobro, totalAplicadoPreview]);

  const totales = useMemo(() => {
    return (resumenClientes || []).reduce(
      (acc, c) => {
        acc.totalFacturado += Number(c.total_facturado || 0);
        acc.totalCobrado += Number(c.total_cobrado || 0);
        acc.totalAplicado += Number(c.total_aplicado || 0);
        acc.saldoPendiente += Number(c.saldo_pendiente || 0);
        acc.saldoAFavor += Number(c.saldo_a_favor || 0);
        acc.saldoNeto += Number(c.saldo_neto || 0);
        acc.facturasPendientes += Number(c.cantidad_facturas_pendientes || 0);
        return acc;
      },
      {
        totalFacturado: 0,
        totalCobrado: 0,
        totalAplicado: 0,
        saldoPendiente: 0,
        saldoAFavor: 0,
        saldoNeto: 0,
        facturasPendientes: 0,
      }
    );
  }, [resumenClientes]);

  const abrirDetalleCliente = (clienteId) => {
    setClienteSeleccionadoId(clienteId);
    setDetalleTab("movimientos");
    setErrorAplicarSaldo(null);
  };

  const imprimirEstadoCuentaCliente = () => {
    printEstadoCuenta({
      cliente: clienteSeleccionado,
      movimientos: movimientosCliente,
    });
  };

  const abrirModalCobro = (cliente) => {
    setClienteCobro(cliente);
    setErrorCobro(null);
    setFormCobro({
      fechaCobro: hoyISO(),
      medioPago: "Transferencia",
      importeTotal:
        Number(cliente?.saldo_pendiente || 0) > 0
          ? String(Number(cliente.saldo_pendiente || 0))
          : "",
      observacion: "",
    });
  };

  const cerrarModalCobro = () => {
    if (guardandoCobro) return;
    setClienteCobro(null);
    setErrorCobro(null);
  };

  const handleGuardarCobro = async () => {
    if (!clienteCobro) return;

    try {
      setGuardandoCobro(true);
      setErrorCobro(null);

      if (!registrarCobro) {
        throw new Error("La función para registrar cobros no está disponible.");
      }

      if (importeCobro <= 0) {
        throw new Error("El importe del cobro debe ser mayor a cero.");
      }

      if (formCobro.fechaCobro > hoyISO()) {
        throw new Error("La fecha de cobro no puede ser posterior a hoy.");
      }

      await registrarCobro({
        clienteId: clienteCobro.cliente_id,
        fechaCobro: formCobro.fechaCobro,
        medioPago: formCobro.medioPago,
        importeTotal: importeCobro,
        observacion: formCobro.observacion,
        aplicaciones: aplicacionesPreview.map((a) => ({
          cargo_id: a.cargo_id,
          importe_aplicado: a.importe_aplicado,
        })),
      });

      setClienteCobro(null);
      setErrorCobro(null);
    } catch (e) {
      console.error("Error registrando cobro:", e);
      setErrorCobro(e.message || String(e));
    } finally {
      setGuardandoCobro(false);
    }
  };

  const abrirModalAnularCobro = (cobro) => {
    setCobroAAnular(cobro);
    setMotivoAnulacion("");
    setErrorAnulacion(null);
  };

  const cerrarModalAnularCobro = () => {
    if (anulandoCobro) return;

    setCobroAAnular(null);
    setMotivoAnulacion("");
    setErrorAnulacion(null);
  };

  const handleAnularCobro = async () => {
    if (!cobroAAnular) return;

    try {
      setAnulandoCobro(true);
      setErrorAnulacion(null);

      if (!anularCobro) {
        throw new Error("La función para anular cobros no está disponible.");
      }

      await anularCobro({
        cobroId: cobroAAnular.cobro_id,
        motivo: motivoAnulacion,
      });

      setCobroAAnular(null);
      setMotivoAnulacion("");
      setErrorAnulacion(null);
    } catch (e) {
      console.error("Error anulando cobro:", e);
      setErrorAnulacion(e.message || String(e));
    } finally {
      setAnulandoCobro(false);
    }
  };

  const abrirModalAplicarSaldoAFavor = (cliente) => {
    if (!cliente) return;

    const saldoAFavor = Number(cliente.saldo_a_favor || 0);
    const saldoPendiente = Number(cliente.saldo_pendiente || 0);

    if (saldoAFavor <= 0) {
      setErrorAplicarSaldo("El cliente no tiene saldo a favor disponible.");
      return;
    }

    if (saldoPendiente <= 0) {
      setErrorAplicarSaldo("El cliente no tiene comprobantes pendientes.");
      return;
    }

    setErrorAplicarSaldo(null);
    setClienteAplicarSaldo(cliente);
  };

  const cerrarModalAplicarSaldoAFavor = () => {
    if (aplicandoSaldo) return;

    setClienteAplicarSaldo(null);
    setErrorAplicarSaldo(null);
  };

  const handleConfirmarAplicarSaldoAFavor = async () => {
    if (!clienteAplicarSaldo) return;

    try {
      setAplicandoSaldo(true);
      setErrorAplicarSaldo(null);

      if (!aplicarSaldoAFavor) {
        throw new Error("La función para aplicar saldo a favor no está disponible.");
      }

      await aplicarSaldoAFavor({
        clienteId: clienteAplicarSaldo.cliente_id,
      });

      setClienteAplicarSaldo(null);
    } catch (e) {
      console.error("Error aplicando saldo a favor:", e);
      setErrorAplicarSaldo(e.message || String(e));
    } finally {
      setAplicandoSaldo(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cuenta corriente
        </h1>
        <p className="text-sm text-slate-500">
          Resumen de comprobantes, cobros aplicados y saldos por cliente.
        </p>
      </div>

      {cargando && (
        <Card>
          <CardContent className="py-6 text-sm text-slate-500">
            Cargando cuenta corriente...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            Error cargando cuenta corriente: {error}
          </CardContent>
        </Card>
      )}

      {!cargando && !error && (
        <>
          <div className="grid gap-3 md:grid-cols-6">
            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Total cargos</div>
                <div className="text-xl font-semibold">
                  {formatMoney(totales.totalFacturado)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Total cobrado</div>
                <div className="text-xl font-semibold">
                  {formatMoney(totales.totalCobrado)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Aplicado</div>
                <div className="text-xl font-semibold">
                  {formatMoney(totales.totalAplicado)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Saldo pendiente</div>
                <div className="text-xl font-semibold text-red-700">
                  {formatMoney(totales.saldoPendiente)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Saldo a favor</div>
                <div className="text-xl font-semibold text-emerald-700">
                  {formatMoney(totales.saldoAFavor)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="text-xs text-slate-500">Saldo neto</div>
                <div
                  className={`text-xl font-semibold ${
                    totales.saldoNeto > 0
                      ? "text-red-700"
                      : totales.saldoNeto < 0
                      ? "text-emerald-700"
                      : ""
                  }`}
                >
                  {formatMoney(totales.saldoNeto)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Saldos por cliente</h2>
                  <p className="text-xs text-slate-500">
                    Solo se muestran clientes con movimientos de cuenta corriente.
                  </p>
                </div>

                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente, CUIT, email..."
                  className="sm:max-w-xs"
                />
              </div>

              {clientesFiltrados.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay clientes con movimientos de cuenta corriente para mostrar.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">ID IMPOSITIVO</th>
                        <th className="px-3 py-2 text-right">Cargos</th>
                        <th className="px-3 py-2 text-right">Cobrado</th>
                        <th className="px-3 py-2 text-right">Aplicado</th>
                        <th className="px-3 py-2 text-right">Saldo</th>
                        <th className="px-3 py-2 text-right">A favor</th>
                        <th className="px-3 py-2 text-right">Neto</th>
                        <th className="px-3 py-2 text-right">Pend.</th>
                        <th className="px-3 py-2 text-center"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {clientesFiltrados.map((c) => (
                        <tr
                          key={c.cliente_id}
                          className="border-b last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-left font-medium text-slate-900 hover:underline"
                              onClick={() => {
                                if (!c.clienteRegistro) {
                                  console.warn("El resumen no tiene clienteRegistro:", c);
                                  return;
                                }

                                setClienteDetalleModal(c.clienteRegistro);
                              }}
                            >
                              {c.razon_social || c.nombre_fantasia || `Cliente ${c.cliente_id}`}
                            </button>

                            {c.nombre_fantasia && (
                              <div className="text-xs text-slate-500">
                                {c.nombre_fantasia}
                              </div>
                            )}

                            {c.cliente_tipo && (
                              <div className="text-xs text-slate-400">
                                {c.cliente_tipo}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2 text-slate-600">
                            {c.id_impositiva || "CUIT"}{" "}
                            {c.numero_impositivo || "-"}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatMoney(c.total_facturado)}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatMoney(c.total_cobrado)}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatMoney(c.total_aplicado)}
                          </td>

                          <td className="px-3 py-2 text-right font-semibold">
                            {formatMoney(c.saldo_pendiente)}
                          </td>


                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                            {formatMoney(c.saldo_a_favor)}
                          </td>

                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              Number(c.saldo_neto || 0) > 0
                                ? "text-red-700"
                                : Number(c.saldo_neto || 0) < 0
                                ? "text-emerald-700"
                                : ""
                            }`}
                          >
                            {formatMoney(c.saldo_neto)}
                          </td>

                          <td className="px-3 py-2 text-center">
                            {c.cantidad_facturas_pendientes || 0}
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirDetalleCliente(c.cliente_id)}
                              >
                                Ver detalle
                              </Button>

                              <Button size="sm" onClick={() => abrirModalCobro(c)}>
                                Registrar cobro
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {clienteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="max-h-[90vh] w-full max-w-5xl overflow-hidden">
            <CardContent className="max-h-[90vh] space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    {clienteSeleccionado.razon_social || "Cliente"}
                  </h2>

                  {clienteSeleccionado.nombre_fantasia && (
                    <p className="text-sm text-slate-500">
                      {clienteSeleccionado.nombre_fantasia}
                    </p>
                  )}

                  <p className="text-sm text-slate-500">
                    {clienteSeleccionado.id_impositiva || "CUIT"}{" "}
                    {clienteSeleccionado.numero_impositivo || "-"}
                  </p>

                  {(clienteSeleccionado.email ||
                    clienteSeleccionado.telefono) && (
                    <p className="text-xs text-slate-400">
                      {clienteSeleccionado.email || ""}
                      {clienteSeleccionado.email &&
                      clienteSeleccionado.telefono
                        ? " · "
                        : ""}
                      {clienteSeleccionado.telefono || ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={imprimirEstadoCuentaCliente}
                  >
                    Imprimir estado de cuenta
                  </Button>

                  {Number(clienteSeleccionado.saldo_a_favor || 0) > 0 &&
                    Number(clienteSeleccionado.saldo_pendiente || 0) > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => abrirModalAplicarSaldoAFavor(clienteSeleccionado)}
                        disabled={aplicandoSaldo}
                      >
                        {aplicandoSaldo ? "Aplicando..." : "Aplicar saldo a favor"}
                      </Button>
                    )}

                  <Button onClick={() => abrirModalCobro(clienteSeleccionado)}>
                    Registrar cobro
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setClienteSeleccionadoId(null);
                      setErrorAplicarSaldo(null);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-slate-500">Cargo</div>
                  <div className="text-lg font-semibold">
                    {formatMoney(clienteSeleccionado.total_facturado)}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-slate-500">Cobrado</div>
                  <div className="text-lg font-semibold">
                    {formatMoney(clienteSeleccionado.total_cobrado)}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-slate-500">Aplicado</div>
                  <div className="text-lg font-semibold">
                    {formatMoney(clienteSeleccionado.total_aplicado)}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-slate-500">Saldo pendiente</div>
                  <div className="text-lg font-semibold text-red-700">
                    {formatMoney(clienteSeleccionado.saldo_pendiente)}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-slate-500">Saldo a favor</div>
                  <div className="text-lg font-semibold text-emerald-700">
                    {formatMoney(clienteSeleccionado.saldo_a_favor)}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-slate-500">Saldo neto</div>
                  <div
                    className={`text-lg font-semibold ${
                      Number(clienteSeleccionado.saldo_neto || 0) > 0
                        ? "text-red-700"
                        : Number(clienteSeleccionado.saldo_neto || 0) < 0
                        ? "text-emerald-700"
                        : ""
                    }`}
                  >
                    {formatMoney(clienteSeleccionado.saldo_neto)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={detalleTab === "movimientos" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDetalleTab("movimientos")}
                  >
                    Movimientos
                  </Button>

                  <Button
                    variant={detalleTab === "cargos" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDetalleTab("cargos")}
                  >
                    Comprobantes
                  </Button>

                  <Button
                    variant={detalleTab === "cobros" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDetalleTab("cobros")}
                  >
                    Cobros
                  </Button>
                </div>

                {detalleTab === "movimientos" && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">
                      Movimientos de cuenta corriente
                    </h3>

                    {movimientosCliente.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Este cliente no tiene movimientos.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Tipo</th>
                              <th className="px-3 py-2">Comprobante</th>
                              <th className="px-3 py-2">Estado</th>
                              <th className="px-3 py-2 text-right">Debe</th>
                              <th className="px-3 py-2 text-right">Haber</th>
                              <th className="px-3 py-2 text-right">Saldo</th>
                            </tr>
                          </thead>

                          <tbody>
                            {movimientosCliente.map((m) => (
                              <tr
                                key={`${m.tipo_movimiento}-${m.movimiento_id}`}
                                className="border-b last:border-0"
                              >
                                <td className="px-3 py-2">{formatFecha(m.fecha)}</td>

                                <td className="px-3 py-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                                    {m.tipo_movimiento}
                                  </span>
                                </td>

                                <td className="px-3 py-2 font-medium">
                                  {m.comprobante || "-"}
                                  {m.observacion && (
                                    <div className="mt-1 max-w-xs truncate text-xs font-normal text-slate-500">
                                      {m.observacion}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-slate-600">
                                  {m.estado || "-"}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {Number(m.debe || 0) > 0 ? formatMoney(m.debe) : "-"}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {Number(m.haber || 0) > 0 ? formatMoney(m.haber) : "-"}
                                </td>

                                <td
                                  className={`px-3 py-2 text-right font-semibold ${saldoClass(
                                    m.saldo_acumulado
                                  )}`}
                                >
                                  {formatMoney(m.saldo_acumulado)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      En esta vista, los comprobantes suman en debe y los cobros restan en haber.
                      Si el saldo queda negativo, el cliente tiene saldo a favor.
                    </p>
                  </div>
                )}

                {detalleTab === "cargos" && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Comprobantes del cliente</h3>

                    {cargosCliente.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Este cliente no tiene comprobantes en cuenta corriente.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Comprobante</th>
                              <th className="px-3 py-2">Estado fiscal</th>
                              <th className="px-3 py-2 text-right">Total</th>
                              <th className="px-3 py-2 text-right">Cobrado</th>
                              <th className="px-3 py-2 text-right">Saldo</th>
                              <th className="px-3 py-2">Estado cobro</th>
                            </tr>
                          </thead>

                          <tbody>
                            {cargosCliente.map((cargo) => (
                              <tr
                                key={cargo.cargo_id}
                                className="border-b last:border-0"
                              >
                                <td className="px-3 py-2">
                                  {formatFecha(cargo.fecha_emision)}
                                </td>

                                <td className="px-3 py-2 font-medium">
                                  {comprobanteLabel(cargo)}
                                  {cargo.tipo_cargo === "pedido_sin_factura" && (
                                    <div className="text-xs font-normal text-slate-500">
                                      Pedido sin factura
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2">
                                  {cargo.estado_fiscal || "-"}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {formatMoney(cargo.total)}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {formatMoney(cargo.importe_cobrado)}
                                </td>

                                <td className="px-3 py-2 text-right font-semibold">
                                  {formatMoney(cargo.saldo_pendiente)}
                                </td>

                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-1 text-xs ${estadoCobroClass(
                                      cargo.estado_cobro
                                    )}`}
                                  >
                                    {cargo.estado_cobro}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {detalleTab === "cobros" && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Cobros del cliente</h3>

                    {cobrosCliente.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Este cliente no tiene cobros registrados.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Medio</th>
                              <th className="px-3 py-2">Estado</th>
                              <th className="px-3 py-2 text-right">Importe</th>
                              <th className="px-3 py-2 text-right">Aplicado</th>
                              <th className="px-3 py-2 text-right">Sin aplicar</th>
                              <th className="px-3 py-2">Observación</th>
                              <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                          </thead>

                          <tbody>
                            {cobrosCliente.map((cobro) => (
                              <tr
                                key={cobro.cobro_id}
                                className="border-b last:border-0"
                              >
                                <td className="px-3 py-2">
                                  {formatFecha(cobro.fecha_cobro)}
                                </td>

                                <td className="px-3 py-2 font-medium">
                                  {cobro.medio_pago || "-"}
                                </td>

                                <td className="px-3 py-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                                    {cobro.estado || "-"}
                                  </span>
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {formatMoney(cobro.importe_total)}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {formatMoney(cobro.importe_aplicado)}
                                </td>

                                <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                  {formatMoney(cobro.saldo_sin_aplicar)}
                                </td>

                                <td className="px-3 py-2 text-slate-600">
                                  {cobro.observacion || "-"}

                                  {cobro.estado === "Anulado" && cobro.motivo_anulacion && (
                                    <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                                      Motivo anulación: {cobro.motivo_anulacion}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2 text-right">
                                  {cobro.estado === "Registrado" ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => abrirModalAnularCobro(cobro)}
                                    >
                                      Anular
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      Anulado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {clienteCobro && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden">
            <CardContent className="max-h-[90vh] space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Registrar cobro</h2>
                  <p className="text-sm text-slate-500">
                    {clienteCobro.razon_social}
                    {clienteCobro.nombre_fantasia
                      ? ` · ${clienteCobro.nombre_fantasia}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    Saldo pendiente actual:{" "}
                    {formatMoney(clienteCobro.saldo_pendiente)}
                  </p>
                </div>

                <Button variant="outline" onClick={cerrarModalCobro}>
                  Cerrar
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Fecha de cobro
                  </label>
                  <Input
                    type="date"
                    value={formCobro.fechaCobro}
                    max={hoyISO()}
                    onChange={(e) =>
                      setFormCobro((prev) => ({
                        ...prev,
                        fechaCobro: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Medio de pago
                  </label>
                  <select
                    value={formCobro.medioPago}
                    onChange={(e) =>
                      setFormCobro((prev) => ({
                        ...prev,
                        medioPago: e.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Importe
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCobro.importeTotal}
                    onChange={(e) =>
                      setFormCobro((prev) => ({
                        ...prev,
                        importeTotal: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Observación
                </label>
                <textarea
                  value={formCobro.observacion}
                  onChange={(e) =>
                    setFormCobro((prev) => ({
                      ...prev,
                      observacion: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej: transferencia recibida, comprobante enviado por WhatsApp..."
                />
              </div>

              <div className="rounded-xl border bg-slate-50 p-3">
                <h3 className="mb-2 text-sm font-semibold">
                  Aplicación automática
                </h3>

                {cargosPendientesCobro.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Este cliente no tiene comprobantes pendientes. El cobro quedará
                    registrado como saldo sin aplicar.
                  </p>
                ) : aplicacionesPreview.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Ingresá un importe para ver a qué comprobantes se aplicará.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-white text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2">Comprobante</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2 text-right">Saldo comprobante</th>
                          <th className="px-3 py-2 text-right">Se aplica</th>
                        </tr>
                      </thead>

                      <tbody>
                        {aplicacionesPreview.map((a) => (
                          <tr key={a.cargo_id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium">
                              {comprobanteLabel(a.cargo)}
                            </td>

                            <td className="px-3 py-2">
                              {formatFecha(a.cargo.fecha_emision)}
                            </td>

                            <td className="px-3 py-2 text-right">
                              {formatMoney(a.cargo.saldo_pendiente)}
                            </td>

                            <td className="px-3 py-2 text-right font-semibold">
                              {formatMoney(a.importe_aplicado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                  <div>
                    <span className="text-slate-500">Importe cobro: </span>
                    <strong>{formatMoney(importeCobro)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500">Aplicado: </span>
                    <strong>{formatMoney(totalAplicadoPreview)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500">Sin aplicar: </span>
                    <strong>{formatMoney(saldoSinAplicarPreview)}</strong>
                  </div>
                </div>
              </div>

              {errorCobro && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorCobro}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={cerrarModalCobro}
                  disabled={guardandoCobro}
                >
                  Cancelar
                </Button>

                <Button
                  onClick={handleGuardarCobro}
                  disabled={guardandoCobro || importeCobro <= 0}
                >
                  {guardandoCobro ? "Guardando..." : "Guardar cobro"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {cobroAAnular && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-lg">
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Anular cobro</h2>
                <p className="text-sm text-slate-500">
                  Esta acción no borra el cobro, pero deja de impactar en la cuenta
                  corriente.
                </p>
              </div>

              <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                <div>
                  <span className="text-slate-500">Fecha: </span>
                  <strong>{formatFecha(cobroAAnular.fecha_cobro)}</strong>
                </div>

                <div>
                  <span className="text-slate-500">Medio: </span>
                  <strong>{cobroAAnular.medio_pago}</strong>
                </div>

                <div>
                  <span className="text-slate-500">Importe: </span>
                  <strong>{formatMoney(cobroAAnular.importe_total)}</strong>
                </div>

                <div>
                  <span className="text-slate-500">Aplicado: </span>
                  <strong>{formatMoney(cobroAAnular.importe_aplicado)}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Motivo de anulación
                </label>

                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej: se cargó el importe incorrecto, transferencia duplicada, cobro asignado al cliente equivocado..."
                />
              </div>

              {errorAnulacion && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorAnulacion}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={cerrarModalAnularCobro}
                  disabled={anulandoCobro}
                >
                  Cancelar
                </Button>

                <Button
                  onClick={handleAnularCobro}
                  disabled={anulandoCobro || !motivoAnulacion.trim()}
                >
                  {anulandoCobro ? "Anulando..." : "Confirmar anulación"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {clienteAplicarSaldo && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-lg">
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Aplicar saldo a favor</h2>
                <p className="text-sm text-slate-500">
                  Confirmá la aplicación automática del saldo a favor contra los comprobantes pendientes.
                </p>
              </div>

              <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                <div>
                  <span className="text-slate-500">Cliente: </span>
                  <strong>{clienteAplicarSaldo.razon_social}</strong>
                </div>

                {clienteAplicarSaldo.nombre_fantasia && (
                  <div>
                    <span className="text-slate-500">Nombre fantasía: </span>
                    <strong>{clienteAplicarSaldo.nombre_fantasia}</strong>
                  </div>
                )}

                <div>
                  <span className="text-slate-500">Saldo a favor disponible: </span>
                  <strong className="text-emerald-700">
                    {formatMoney(clienteAplicarSaldo.saldo_a_favor)}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500">Saldo pendiente: </span>
                  <strong className="text-red-700">
                    {formatMoney(clienteAplicarSaldo.saldo_pendiente)}
                  </strong>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Sara aplicará el saldo a favor empezando por los comprobantes pendientes más antiguos.
                Si el saldo a favor no alcanza, quedará una parte pendiente. Si sobra, seguirá como saldo a favor.
              </p>

              {errorAplicarSaldo && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorAplicarSaldo}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={cerrarModalAplicarSaldoAFavor}
                  disabled={aplicandoSaldo}
                >
                  Cancelar
                </Button>

                <Button
                  onClick={handleConfirmarAplicarSaldoAFavor}
                  disabled={aplicandoSaldo}
                >
                  {aplicandoSaldo ? "Aplicando..." : "Confirmar aplicación"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {errorAplicarSaldo && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorAplicarSaldo}
        </p>
      )}

      <DetalleClienteModal
        cliente={clienteDetalleModal}
        onClose={() => setClienteDetalleModal(null)}
      />
    </div>
  );
}