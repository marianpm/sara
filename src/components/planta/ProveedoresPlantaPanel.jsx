import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useIngresosMercaderiaSupabase } from "../../hooks/useIngresosMercaderiaSupabase";
import { useProveedoresPlantaSupabase } from "../../hooks/useProveedoresPlantaSupabase";

const PROVEEDOR_OTRO = "__otro__";

const hoyISO = () => new Intl.DateTimeFormat("en-CA").format(new Date());

const crearModeloVacio = () => ({
  fechaIngreso: hoyISO(),
  proveedorId: "",
  proveedorOtro: "",
  patasCantidad: "",
  patasPesadasCarros: [
  { cantidad: "", pesoKg: "" },
  { cantidad: "", pesoKg: "" },
],
  untoPesoKg: "",
  carnePesoKg: "",
  observaciones: "",
});

function normalizarNumero(valor) {
  if (valor === "" || valor == null) return null;

  const numero = Number(String(valor).replace(",", "."));
  if (Number.isNaN(numero)) return null;

  return numero;
}

function normalizarEntero(valor) {
  if (valor === "" || valor == null) return null;

  const numero = Number(valor);
  if (Number.isNaN(numero)) return null;

  return Math.trunc(numero);
}

function formatFecha(fechaISO) {
  if (!fechaISO) return "-";

  const [year, month, day] = fechaISO.split("-");
  return `${day}/${month}/${year}`;
}

function formatKg(valor) {
  if (valor == null) return "-";

  return `${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

function formatKgPorPata(valor) {
  if (valor == null || Number.isNaN(Number(valor))) return "-";

  return `${Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg/pata`;
}

function calcularPesoPromedio(pesoKg, cantidad) {
  const peso = Number(pesoKg || 0);
  const cant = Number(cantidad || 0);

  if (!(peso > 0) || !(cant > 0)) return null;

  return peso / cant;
}

const crearCarroVacio = () => ({
  cantidad: "",
  pesoKg: "",
});

function sumarCantidadCarros(carros = []) {
  return carros.reduce((acc, carro) => {
    const cantidad = normalizarEntero(carro?.cantidad);
    return acc + (cantidad != null ? cantidad : 0);
  }, 0);
}

function sumarPesadasCarros(carros = []) {
  return carros.reduce((acc, carro) => {
    const peso = normalizarNumero(carro?.pesoKg);
    return acc + (peso != null ? peso : 0);
  }, 0);
}

function carroTieneDatos(carro) {
  return (
    String(carro?.cantidad ?? "").trim() !== "" ||
    String(carro?.pesoKg ?? "").trim() !== ""
  );
}

export default function ProveedoresPlantaPanel({ usuarioActual }) {
  const [vista, setVista] = useState("ingreso");
  const [form, setForm] = useState(crearModeloVacio);
  const [guardando, setGuardando] = useState(false);
  const [mensajeOk, setMensajeOk] = useState(null);
  const [errorForm, setErrorForm] = useState(null);

  const patasCantidadNumero = normalizarEntero(form.patasCantidad);
  const patasCantidadCarros = sumarCantidadCarros(form.patasPesadasCarros);
  const patasPesoTotalKg = sumarPesadasCarros(form.patasPesadasCarros);

  const [carroAEliminar, setCarroAEliminar] = useState(null);

  const patasPesoPromedioKg = calcularPesoPromedio(
    patasPesoTotalKg,
    patasCantidadNumero
  );

  const diferenciaCantidadCarros =
    patasCantidadNumero != null ? patasCantidadNumero - patasCantidadCarros : 0;

  const cantidadesCarrosCoinciden =
    patasCantidadNumero != null &&
    patasCantidadNumero > 0 &&
    patasCantidadCarros === patasCantidadNumero;

  const {
    proveedores,
    cargandoProveedores,
    errorProveedores,
    crearProveedor,
  } = useProveedoresPlantaSupabase();

  const {
    ingresos,
    cargandoIngresos,
    errorIngresos,
    agregarIngresoMercaderia,
  } = useIngresosMercaderiaSupabase({
    usuarioActual,
  });

  const totales = useMemo(() => {
    return (ingresos || []).reduce(
      (acc, ingreso) => {
        acc.patasCantidad += Number(ingreso.patas_cantidad || 0);
        acc.patasPesoKg += Number(ingreso.patas_peso_kg || 0);
        acc.untoPesoKg += Number(ingreso.unto_peso_kg || 0);
        acc.carnePesoKg += Number(ingreso.carne_peso_kg || 0);
        return acc;
      },
      {
        patasCantidad: 0,
        patasPesoKg: 0,
        untoPesoKg: 0,
        carnePesoKg: 0,
      }
    );
  }, [ingresos]);

  const promedioGeneralPatas = calcularPesoPromedio(
    totales.patasPesoKg,
    totales.patasCantidad
  );

  const setCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const setCampoCarro = (index, campo, valor) => {
    setForm((prev) => ({
      ...prev,
      patasPesadasCarros: prev.patasPesadasCarros.map((carro, i) =>
        i === index ? { ...carro, [campo]: valor } : carro
      ),
    }));
  };

  const agregarCarro = () => {
    setForm((prev) => ({
      ...prev,
      patasPesadasCarros: [...prev.patasPesadasCarros, crearCarroVacio()],
    }));
  };

  const eliminarCarro = (index) => {
    setForm((prev) => {
      const nuevaLista = prev.patasPesadasCarros.filter((_, i) => i !== index);

      return {
        ...prev,
        patasPesadasCarros:
          nuevaLista.length > 0 ? nuevaLista : [crearCarroVacio()],
      };
    });
  };

  const pedirEliminarCarro = (index) => {
    setCarroAEliminar(index);
  };

  const cancelarEliminarCarro = () => {
    setCarroAEliminar(null);
  };

  const confirmarEliminarCarro = () => {
    if (carroAEliminar == null) return;

    eliminarCarro(carroAEliminar);
    setCarroAEliminar(null);
  };

  const limpiarFormulario = () => {
    setForm(crearModeloVacio());
    setMensajeOk(null);
    setErrorForm(null);
  };

  const validar = () => {
    if (!form.fechaIngreso) {
      return "Ingresá la fecha de ingreso.";
    }

    if (!form.proveedorId) {
      return "Seleccioná un proveedor.";
    }

    if (form.proveedorId === PROVEEDOR_OTRO && !form.proveedorOtro.trim()) {
      return "Ingresá el nombre del nuevo proveedor.";
    }

    const patasCantidad = normalizarEntero(form.patasCantidad);
    const patasPesoKg = sumarPesadasCarros(form.patasPesadasCarros);
    const patasCantidadCarrosValidacion = sumarCantidadCarros(
      form.patasPesadasCarros
    );
    const untoPesoKg = normalizarNumero(form.untoPesoKg);
    const carnePesoKg = normalizarNumero(form.carnePesoKg);

    const carrosConDatos = form.patasPesadasCarros.filter(carroTieneDatos);

    const cargoPatas = form.patasCantidad !== "" || carrosConDatos.length > 0;

    if (cargoPatas) {
      if (!patasCantidad || patasCantidad <= 0) {
        return "Si ingresás patas, la cantidad total debe ser mayor a 0.";
      }

      if (carrosConDatos.length === 0) {
        return "Si ingresás patas, cargá al menos un carro.";
      }

      for (let i = 0; i < carrosConDatos.length; i += 1) {
        const cantidadCarro = normalizarEntero(carrosConDatos[i].cantidad);
        const pesoCarro = normalizarNumero(carrosConDatos[i].pesoKg);

        if (!cantidadCarro || cantidadCarro <= 0) {
          return `La cantidad del carro ${i + 1} debe ser mayor a 0.`;
        }

        if (!pesoCarro || pesoCarro <= 0) {
          return `El peso del carro ${i + 1} debe ser mayor a 0.`;
        }
      }

      if (patasCantidadCarrosValidacion !== patasCantidad) {
        return `La suma de piezas por carro (${patasCantidadCarrosValidacion}) debe coincidir con la cantidad total (${patasCantidad}).`;
      }

      if (!patasPesoKg || patasPesoKg <= 0) {
        return "Si ingresás patas, el peso total debe ser mayor a 0.";
      }
    }

    if (untoPesoKg != null && untoPesoKg <= 0) {
      return "El peso de unto debe ser mayor a 0.";
    }

    if (carnePesoKg != null && carnePesoKg <= 0) {
      return "El peso de carne debe ser mayor a 0.";
    }

    if (!(patasPesoKg > 0) && !(untoPesoKg > 0) && !(carnePesoKg > 0)) {
      return "Ingresá al menos una mercadería: patas, unto o carne.";
    }

    return null;
  };

  const obtenerProveedorParaGuardar = async () => {
    if (form.proveedorId === PROVEEDOR_OTRO) {
      return await crearProveedor(form.proveedorOtro);
    }

    return proveedores.find((p) => String(p.id) === String(form.proveedorId));
  };

  const guardarIngreso = async (e) => {
    e.preventDefault();

    setMensajeOk(null);
    setErrorForm(null);

    const errorValidacion = validar();
    if (errorValidacion) {
      setErrorForm(errorValidacion);
      return;
    }

    setGuardando(true);

    try {
      const proveedor = await obtenerProveedorParaGuardar();

      if (!proveedor?.id) {
        setErrorForm("No se pudo identificar el proveedor.");
        return;
      }

      const payload = {
        fecha_ingreso: form.fechaIngreso,

        proveedor_id: proveedor.id,
        proveedor_nombre_snapshot: proveedor.nombre,

        patas_cantidad: normalizarEntero(form.patasCantidad),
        patas_peso_kg: patasPesoTotalKg > 0 ? patasPesoTotalKg : null,

        unto_peso_kg: normalizarNumero(form.untoPesoKg),
        carne_peso_kg: normalizarNumero(form.carnePesoKg),

        observaciones: form.observaciones.trim() || null,

        usuario: usuarioActual?.usuario || null,
      };

      await agregarIngresoMercaderia(payload);

      setMensajeOk("Ingreso de mercadería registrado correctamente.");
      setForm(crearModeloVacio());
      setVista("historial");
    } catch (err) {
      console.error(err);
      setErrorForm("No se pudo registrar el ingreso de mercadería.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Proveedores</h2>
            </div>

            <div className="flex gap-2 rounded-full bg-slate-100 p-1">
              <Button
                type="button"
                variant={vista === "ingreso" ? "default" : "ghost"}
                className="rounded-full text-xs sm:text-sm"
                onClick={() => setVista("ingreso")}
              >
                Ingreso mercadería
              </Button>

              <Button
                type="button"
                variant={vista === "historial" ? "default" : "ghost"}
                className="rounded-full text-xs sm:text-sm"
                onClick={() => setVista("historial")}
              >
                Historial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {vista === "ingreso" && (
        <Card>
          <CardContent>
            <form className="space-y-5" onSubmit={guardarIngreso}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha de ingreso</label>
                  <Input
                    type="date"
                    max={hoyISO()}
                    value={form.fechaIngreso}
                    onChange={(e) => setCampo("fechaIngreso", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Proveedor</label>
                  <select
                    value={form.proveedorId}
                    disabled={cargandoProveedores}
                    onChange={(e) => {
                      setCampo("proveedorId", e.target.value);

                      if (e.target.value !== PROVEEDOR_OTRO) {
                        setCampo("proveedorOtro", "");
                      }
                    }}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">
                      {cargandoProveedores
                        ? "Cargando proveedores..."
                        : "Seleccionar..."}
                    </option>

                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}

                    <option value={PROVEEDOR_OTRO}>Otro</option>
                  </select>
                </div>

                {form.proveedorId === PROVEEDOR_OTRO && (
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">
                      Nombre del nuevo proveedor
                    </label>
                    <Input
                      value={form.proveedorOtro}
                      onChange={(e) => setCampo("proveedorOtro", e.target.value)}
                      placeholder="Ej: Proveedor nuevo"
                    />
                    <p className="text-xs text-slate-500">
                      Al guardar el ingreso, este proveedor queda creado para futuras cargas.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
                <div className="rounded-2xl border bg-white p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold">Patas</h3>
                  </div>

                  <div className="w-40 space-y-1">
                    <label className="text-sm font-medium">Cantidad total</label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.patasCantidad}
                      onChange={(e) => setCampo("patasCantidad", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium">Carros</label>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={agregarCarro}
                      >
                        Agregar carro
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {form.patasPesadasCarros.map((carro, index) => {
                        const cantidadCarro = normalizarEntero(carro.cantidad);
                        const pesoCarro = normalizarNumero(carro.pesoKg);
                        const promedioCarro = calcularPesoPromedio(pesoCarro, cantidadCarro);

                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold">Carro {index + 1}</div>

                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 px-3 text-xs"
                                disabled={form.patasPesadasCarros.length === 1}
                                onClick={() => pedirEliminarCarro(index)}
                              >
                                Quitar
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs text-slate-500">Cantidad</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={carro.cantidad}
                                  onChange={(e) =>
                                    setCampoCarro(index, "cantidad", e.target.value)
                                  }
                                  placeholder="Piezas"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs text-slate-500">Peso kg</label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={carro.pesoKg}
                                  onChange={(e) =>
                                    setCampoCarro(index, "pesoKg", e.target.value)
                                  }
                                  placeholder="kg"
                                />
                              </div>
                            </div>

                            <div className="mt-2 text-xs text-slate-600">
                              Promedio carro:{" "}
                              <span className="font-semibold text-slate-800">
                                {formatKgPorPata(promedioCarro)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Piezas en carros</span>
                        <span
                          className={`font-semibold ${
                            patasCantidadNumero && !cantidadesCarrosCoinciden
                              ? "text-amber-700"
                              : "text-slate-900"
                          }`}
                        >
                          {patasCantidadCarros}
                          {patasCantidadNumero ? ` / ${patasCantidadNumero}` : ""}
                        </span>
                      </div>

                      {patasCantidadNumero > 0 && !cantidadesCarrosCoinciden && (
                        <div className="mt-1 text-xs text-amber-700">
                          {diferenciaCantidadCarros > 0
                            ? `Faltan cargar ${diferenciaCantidadCarros} pieza(s) en carros.`
                            : `Sobran ${Math.abs(diferenciaCantidadCarros)} pieza(s) en carros.`}
                        </div>
                      )}

                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-slate-500">Peso total patas</span>
                        <span className="font-semibold">{formatKg(patasPesoTotalKg)}</span>
                      </div>

                      <div className="mt-1 flex justify-between gap-3">
                        <span className="text-slate-500">Promedio total</span>
                        <span className="font-semibold">
                          {formatKgPorPata(patasPesoPromedioKg)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">Unto</h3>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Peso kg</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.untoPesoKg}
                        onChange={(e) => setCampo("untoPesoKg", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">Carne</h3>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Peso kg</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.carnePesoKg}
                        onChange={(e) => setCampo("carnePesoKg", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setCampo("observaciones", e.target.value)}
                  className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Opcional"
                />
              </div>

              {errorForm && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorForm}
                </p>
              )}

              {errorProveedores && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Error cargando proveedores: {errorProveedores}
                </p>
              )}

              {errorIngresos && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Error cargando ingresos: {errorIngresos}
                </p>
              )}

              {mensajeOk && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {mensajeOk}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={limpiarFormulario}
                  disabled={guardando}
                >
                  Limpiar
                </Button>

                <Button type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar ingreso"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {vista === "historial" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="space-y-1">
                <p className="text-xs text-slate-500">Patas</p>
                <p className="text-lg font-semibold">
                  {totales.patasCantidad.toLocaleString("es-AR")} un. -{" "}
                  {formatKg(totales.patasPesoKg)}
                </p>
                <p className="text-xs text-slate-500">
                  Promedio: {formatKgPorPata(promedioGeneralPatas)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1">
                <p className="text-xs text-slate-500">Unto</p>
                <p className="text-lg font-semibold">
                  {formatKg(totales.untoPesoKg)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1">
                <p className="text-xs text-slate-500">Carne</p>
                <p className="text-lg font-semibold">
                  {formatKg(totales.carnePesoKg)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1">
                <p className="text-xs text-slate-500">Ingresos</p>
                <p className="text-lg font-semibold">
                  {(ingresos || []).length.toLocaleString("es-AR")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Historial de mercadería</h3>
                <p className="text-sm text-slate-500">
                  Ingresos ordenados por fecha descendente.
                </p>
              </div>

              {cargandoIngresos && (
                <p className="text-sm text-slate-500">Cargando ingresos...</p>
              )}

              {!cargandoIngresos && (ingresos || []).length === 0 && (
                <p className="text-sm text-slate-500">
                  Todavía no hay ingresos registrados.
                </p>
              )}

              {(ingresos || []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Proveedor</th>
                        <th className="px-3 py-2 text-right">Patas cant.</th>
                        <th className="px-3 py-2 text-right">Patas kg</th>
                        <th className="px-3 py-2 text-right">Prom. pata</th>
                        <th className="px-3 py-2 text-right">Unto kg</th>
                        <th className="px-3 py-2 text-right">Carne kg</th>
                        <th className="px-3 py-2">Usuario</th>
                        <th className="px-3 py-2">Observaciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {ingresos.map((ingreso) => (
                        <tr key={ingreso.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            {formatFecha(ingreso.fecha_ingreso)}
                          </td>

                          <td className="px-3 py-2">
                            <div className="font-medium">
                              {ingreso.proveedor_nombre_snapshot ||
                                ingreso.proveedor?.nombre ||
                                "-"}
                            </div>
                          </td>

                          <td className="px-3 py-2 text-right">
                            {ingreso.patas_cantidad ?? "-"}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatKg(ingreso.patas_peso_kg)}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatKgPorPata(
                              calcularPesoPromedio(
                                ingreso.patas_peso_kg,
                                ingreso.patas_cantidad
                              )
                            )}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatKg(ingreso.unto_peso_kg)}
                          </td>

                          <td className="px-3 py-2 text-right">
                            {formatKg(ingreso.carne_peso_kg)}
                          </td>

                          <td className="px-3 py-2">
                            {ingreso.usuario || "-"}
                          </td>

                          <td className="px-3 py-2">
                            {ingreso.observaciones || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {carroAEliminar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Quitar carro</h2>

              <p className="text-sm text-slate-700">
                ¿Seguro que querés quitar el Carro {carroAEliminar + 1}? Se van a
                borrar la cantidad y el peso cargados para ese carro.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelarEliminarCarro}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmarEliminarCarro}
                >
                  Quitar carro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}