import React, { useRef, useState } from "react";
import { Card } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";

const normalizarNumero = (valor) => {
  if (valor === "" || valor == null) return null;

  const numero = Number(String(valor));
  if (!Number.isFinite(numero)) return null;

  return numero;
};

const esDecimalEnEdicionValido = (valor) => {
  return /^\d*(\.\d{0,2})?$/.test(String(valor ?? ""));
};

const esEnteroEnEdicionValido = (valor) => {
  return /^\d*$/.test(String(valor ?? ""));
};

const redondear2 = (valor) => Math.round(valor * 100) / 100;

const calcularPesoPromedio = (pesoKg, cantidad) => {
  const peso = Number(pesoKg);
  const cant = Number(cantidad);

  if (!Number.isFinite(peso) || !Number.isFinite(cant)) return null;
  if (!(peso > 0) || !(cant > 0)) return null;

  return peso / cant;
};

const formatearKgPromedio = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "-";

  return `${numero.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg/pieza`;
};

const formatearKg = (valor) => {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return "-";

  return `${numero.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
};

const crearPesadaParcial = (peso = "") => ({
  cantidad: "",
  peso: peso == null ? "" : String(peso),
});

const sumarCampoParcial = (lineas, campo) => {
  const total = lineas.reduce((acc, linea) => {
    const numero = normalizarNumero(linea?.[campo]);
    return acc + (numero ?? 0);
  }, 0);

  return redondear2(total);
};

const lineaParcialTieneDatos = (linea) => {
  const cantidad = normalizarNumero(linea?.cantidad);
  const peso = normalizarNumero(linea?.peso);

  return cantidad != null || peso != null;
};

const lineaParcialIncompleta = (linea) => {
  const cantidad = normalizarNumero(linea?.cantidad);
  const peso = normalizarNumero(linea?.peso);

  const tieneCantidad = cantidad != null;
  const tienePeso = peso != null;

  return tieneCantidad !== tienePeso;
};

const validarPesajesParcialesProducto = (prod, parciales) => {
  if (!Array.isArray(parciales) || parciales.length === 0) {
    return {
      totalParcialCantidad: 0,
      cantidadProducto: normalizarNumero(prod?.cantidad),
      cantidadExcedida: false,
      cantidadMenor: false,
      piezasFaltantes: 0,
      tieneLineaIncompleta: false,
      tieneError: false,
    };
  }

  const cantidadProducto = normalizarNumero(prod?.cantidad);
  const totalParcialCantidad = sumarCampoParcial(parciales, "cantidad");

  const tieneAlgunDato = parciales.some(lineaParcialTieneDatos);
  const tieneLineaIncompleta = parciales.some(lineaParcialIncompleta);

  const cantidadExcedida =
    cantidadProducto != null && totalParcialCantidad > cantidadProducto;

  const cantidadMenor =
    tieneAlgunDato &&
    cantidadProducto != null &&
    totalParcialCantidad < cantidadProducto;

  const piezasFaltantes =
    cantidadMenor && cantidadProducto != null
      ? redondear2(cantidadProducto - totalParcialCantidad)
      : 0;

  return {
    totalParcialCantidad,
    cantidadProducto,
    cantidadExcedida,
    cantidadMenor,
    piezasFaltantes,
    tieneLineaIncompleta,
    tieneError: tieneLineaIncompleta || cantidadExcedida,
  };
};

const propsSinAutofill = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-lpignore": "true",
  "data-form-type": "other",
};

export default function PesajePedidoModal({
  pedido,
  pesosTemp,
  setPesosTemp,
  cantidadesPesadasTemp,
  setCantidadesPesadasTemp,
  guardando,
  onClose,
  onGuardar,
}) {
  const [pesajesParciales, setPesajesParciales] = useState({});

  const autocompleteSaltRef = useRef(
    `pesaje-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

const autocompleteSalt = autocompleteSaltRef.current;

  if (!pedido) return null;

  const productos = pedido.productos || [];
  const clienteRegistro = pedido?.clienteRegistro;

  const idImpositiva =
    clienteRegistro?.id_impositiva ||
    pedido?.id_impositiva ||
    "ID impositivo";

  const numeroImpositivo =
    clienteRegistro?.numero_impositivo ||
    pedido?.numero_impositivo ||
    pedido?.cuit ||
    "-";

  const hayErrorPesajesParciales = productos.some((prod, index) => {
    const parciales = pesajesParciales[index] ?? [];

    if (parciales.length === 0) return false;

    return validarPesajesParcialesProducto(prod, parciales).tieneError;
  });

  const actualizarPeso = (index, value) => {
    if (value === "") {
      setPesosTemp((prev) => {
        const nuevo = [...prev];
        nuevo[index] = "";
        return nuevo;
      });

      setCantidadesPesadasTemp((prev) => {
        const nuevo = [...prev];
        nuevo[index] = 0;
        return nuevo;
      });

      return;
    }

    if (!esDecimalEnEdicionValido(value)) return;

    const numero = normalizarNumero(value);

    if (numero != null && numero > 10000) {
      value = "10000";
    }

    setPesosTemp((prev) => {
      const nuevo = [...prev];
      nuevo[index] = value;
      return nuevo;
    });

    setCantidadesPesadasTemp((prev) => {
      const nuevo = [...prev];
      const cantidadProducto = normalizarNumero(productos[index]?.cantidad);

      nuevo[index] =
        numero != null && numero > 0 && cantidadProducto != null
          ? cantidadProducto
          : 0;

      return nuevo;
    });
  };

  const guardarPesajesParciales = (index, lineas) => {
    setPesajesParciales((prev) => ({
      ...prev,
      [index]: lineas,
    }));

    const tieneAlgunPeso = lineas.some(
      (linea) => normalizarNumero(linea.peso) != null
    );

    const tieneAlgunaCantidad = lineas.some(
      (linea) => normalizarNumero(linea.cantidad) != null
    );

    const totalPeso = sumarCampoParcial(lineas, "peso");
    const totalCantidad = sumarCampoParcial(lineas, "cantidad");

    setPesosTemp((prev) => {
      const nuevo = [...prev];
      nuevo[index] = tieneAlgunPeso ? totalPeso : "";
      return nuevo;
    });

    setCantidadesPesadasTemp((prev) => {
      const nuevo = [...prev];
      nuevo[index] = tieneAlgunaCantidad ? totalCantidad : 0;
      return nuevo;
    });
  };

  const activarPesajesParciales = (index) => {
    const producto = productos[index];

    const pesoAcumulado = normalizarNumero(pesosTemp[index] ?? producto?.peso);
    const cantidadAcumulada = normalizarNumero(
      cantidadesPesadasTemp?.[index] ?? producto?.cantidadPesada
    );

    const tieneAcumulado =
      (pesoAcumulado != null && pesoAcumulado > 0) ||
      (cantidadAcumulada != null && cantidadAcumulada > 0);

    const lineasIniciales = tieneAcumulado
      ? [
          {
            cantidad:
              cantidadAcumulada != null && cantidadAcumulada > 0
                ? String(cantidadAcumulada)
                : "",
            peso:
              pesoAcumulado != null && pesoAcumulado > 0
                ? String(pesoAcumulado)
                : "",
          },
          crearPesadaParcial(),
        ]
      : [crearPesadaParcial(), crearPesadaParcial()];

    guardarPesajesParciales(index, lineasIniciales);
  };

  const desactivarPesajesParciales = (index) => {
    setPesajesParciales((prev) => {
      const nuevo = { ...prev };
      delete nuevo[index];
      return nuevo;
    });

    const pesoActual = normalizarNumero(pesosTemp[index]);
    const cantidadProducto = normalizarNumero(productos[index]?.cantidad);

    setCantidadesPesadasTemp((prev) => {
      const nuevo = [...prev];
      nuevo[index] =
        pesoActual != null && pesoActual > 0 && cantidadProducto != null
          ? cantidadProducto
          : 0;
      return nuevo;
    });
  };

  const agregarCarro = (index) => {
    const actuales = pesajesParciales[index] ?? [crearPesadaParcial()];
    guardarPesajesParciales(index, [...actuales, crearPesadaParcial()]);
  };

  const quitarCarro = (index, parcialIndex) => {
    const actuales = pesajesParciales[index] ?? [];

    if (actuales.length <= 1) return;

    const nuevas = actuales.filter((_, idx) => idx !== parcialIndex);
    guardarPesajesParciales(index, nuevas);
  };

  const actualizarParcial = (index, parcialIndex, campo, value) => {
    if (campo === "cantidad") {
      if (!esEnteroEnEdicionValido(value)) return;

      const numero = normalizarNumero(value);

      if (numero != null && numero > 10000) {
        value = "10000";
      }
    }

    if (campo === "peso") {
      if (!esDecimalEnEdicionValido(value)) return;

      const numero = normalizarNumero(value);

      if (numero != null && numero > 10000) {
        value = "10000";
      }
    }

    const actuales = pesajesParciales[index] ?? [];
    const nuevas = actuales.map((linea, idx) =>
      idx === parcialIndex ? { ...linea, [campo]: value } : linea
    );

    guardarPesajesParciales(index, nuevas);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="border-b border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Asignar pesajes</h2>

          <p className="mt-1 text-sm text-slate-600">
            Cliente: <span className="font-medium">{pedido.cliente}</span>{" "}
            ({idImpositiva}: {numeroImpositivo})
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-white p-5">
          {productos.map((prod, i) => {
            const parciales = pesajesParciales[i] ?? [];
            const usaPesajesParciales = parciales.length > 0;

            const pesoActual = normalizarNumero(pesosTemp[i]);

            const cantidadPesadaActual = normalizarNumero(
              cantidadesPesadasTemp?.[i] ?? prod.cantidadPesada
            );

            const basePromedio =
              cantidadPesadaActual != null && cantidadPesadaActual > 0
                ? cantidadPesadaActual
                : prod.cantidad;

            const promedio = calcularPesoPromedio(pesoActual, basePromedio);

            const totalParcialPeso = sumarCampoParcial(parciales, "peso");

            const {
              totalParcialCantidad,
              cantidadProducto,
              cantidadExcedida,
              cantidadMenor,
              piezasFaltantes,
              tieneLineaIncompleta,
            } = validarPesajesParcialesProducto(prod, parciales);

            const piezasMostradas =
              cantidadPesadaActual != null
                ? cantidadPesadaActual
                : totalParcialCantidad;

            const puedeDividirPorCarros =
              cantidadProducto != null && cantidadProducto > 40;

            return (
              <div
                key={prod.itemId ?? i}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold leading-snug text-slate-900 break-words">
                      {prod.productoNombre}
                    </div>

                    {prod.presentacion && (
                      <div className="mt-0.5 text-xs text-slate-500 leading-snug break-words">
                        {prod.presentacion}
                      </div>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>
                        Cantidad:{" "}
                        <span className="font-medium text-slate-800">
                          {prod.cantidad}
                        </span>
                      </span>

                      <span>
                        Promedio:{" "}
                        <span className="font-medium text-slate-800">
                          {promedio != null
                            ? formatearKgPromedio(promedio)
                            : "-"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex min-w-[150px] flex-col items-end gap-2">
                    {(puedeDividirPorCarros || usaPesajesParciales) && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full rounded-full px-3 text-xs"
                        disabled={guardando}
                        onClick={() =>
                          usaPesajesParciales
                            ? desactivarPesajesParciales(i)
                            : activarPesajesParciales(i)
                        }
                      >
                        {usaPesajesParciales ? "Peso único" : "Dividir"}
                      </Button>
                    )}

                    {!usaPesajesParciales ? (
                      <div className="flex w-full items-center gap-1">
                        <Input
                          {...propsSinAutofill}
                          name={`sara-peso-total-${autocompleteSalt}-${i}`}
                          id={`sara-peso-total-${autocompleteSalt}-${i}`}
                          type="text"
                          inputMode="decimal"
                          className="h-8 flex-1 text-center text-sm"
                          value={pesosTemp[i] ?? ""}
                          disabled={guardando}
                          onChange={(e) => actualizarPeso(i, e.target.value)}
                          placeholder="kg"
                        />

                        <span className="w-4 text-xs text-slate-500">kg</span>
                      </div>
                    ) : (
                      <div className="flex h-8 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900">
                        {formatearKg(pesoActual)}
                      </div>
                    )}
                  </div>
                </div>

                {usaPesajesParciales && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-800">
                        Pesaje por carros
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3 text-xs"
                        disabled={guardando}
                        onClick={() => agregarCarro(i)}
                      >
                        + Carro
                      </Button>
                    </div>

                    <div className="grid grid-cols-[64px_1fr_1fr_32px] items-center gap-2 px-1 text-[11px] font-medium text-slate-500">
                      <span></span>
                      <span className="text-center">Piezas</span>
                      <span className="text-center">Kg</span>
                      <span></span>
                    </div>

                    <div className="space-y-1.5">
                      {parciales.map((linea, parcialIndex) => (
                        <div
                          key={parcialIndex}
                          className="grid grid-cols-[64px_1fr_1fr_32px] items-center gap-2"
                        >
                          <div className="text-xs text-slate-600">
                            Carro {parcialIndex + 1}
                          </div>

                          <Input
                            {...propsSinAutofill}
                            name={`sara-carro-piezas-${autocompleteSalt}-${i}-${parcialIndex}`}
                            id={`sara-carro-piezas-${autocompleteSalt}-${i}-${parcialIndex}`}
                            type="text"
                            inputMode="numeric"
                            className="h-8 text-center text-sm"
                            value={linea.cantidad}
                            disabled={guardando}
                            onChange={(e) =>
                              actualizarParcial(
                                i,
                                parcialIndex,
                                "cantidad",
                                e.target.value
                              )
                            }
                            placeholder="piezas"
                          />

                          <Input
                            {...propsSinAutofill}
                            name={`sara-carro-peso-${autocompleteSalt}-${i}-${parcialIndex}`}
                            id={`sara-carro-peso-${autocompleteSalt}-${i}-${parcialIndex}`}
                            type="text"
                            inputMode="decimal"
                            className="h-8 text-center text-sm"
                            value={linea.peso}
                            disabled={guardando}
                            onChange={(e) =>
                              actualizarParcial(
                                i,
                                parcialIndex,
                                "peso",
                                e.target.value
                              )
                            }
                            placeholder="kg"
                          />

                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-slate-400 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30"
                            disabled={guardando || parciales.length <= 1}
                            onClick={() => quitarCarro(i, parcialIndex)}
                            title="Quitar carro"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2 text-xs text-slate-700">
                      <span>
                        Piezas:{" "}
                        <span
                          className={
                            cantidadExcedida
                              ? "font-semibold text-red-600"
                              : "font-semibold text-slate-900"
                          }
                        >
                          {piezasMostradas || 0}
                        </span>
                        {cantidadProducto != null && (
                          <span className="text-slate-500"> / {prod.cantidad}</span>
                        )}
                      </span>

                      {tieneLineaIncompleta && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                          Completá piezas y kg en cada carro
                        </span>
                      )}

                      {!tieneLineaIncompleta && cantidadExcedida && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                          Supera la cantidad del pedido
                        </span>
                      )}

                      {!tieneLineaIncompleta && !cantidadExcedida && cantidadMenor && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                          Pesaje parcial: faltan {piezasFaltantes} pieza(s)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              {hayErrorPesajesParciales && (
                <p className="text-xs font-medium text-red-600">
                  Revisá el pesaje por carros: cada carro debe tener piezas y kg, y no puede superar la cantidad pedida.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={guardando}>
                Cancelar
              </Button>

              <Button
                onClick={onGuardar}
                disabled={guardando || hayErrorPesajesParciales}
              >
                {guardando ? "Guardando..." : "Guardar pesajes"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
