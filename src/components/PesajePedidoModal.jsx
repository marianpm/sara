import React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const normalizarNumero = (valor) => {
  if (valor === "" || valor == null) return null;

  const numero = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(numero)) return null;

  return numero;
};

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

export default function PesajePedidoModal({
  pedido,
  pesosTemp,
  setPesosTemp,
  guardando,
  onClose,
  onGuardar,
}) {
  if (!pedido) return null;

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

  const actualizarPeso = (index, value) => {
    if (value === "") {
      setPesosTemp((prev) => {
        const nuevo = [...prev];
        nuevo[index] = "";
        return nuevo;
      });
      return;
    }

    let numero = normalizarNumero(value);
    if (numero == null) return;

    if (numero < 0) numero = 0;
    if (numero > 10000) numero = 10000;
    numero = Math.round(numero * 100) / 100;

    setPesosTemp((prev) => {
      const nuevo = [...prev];
      nuevo[index] = numero;
      return nuevo;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="mx-4 w-full max-w-lg">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">Asignar pesajes</h2>

          <p className="text-sm text-slate-600">
            Cliente: <span className="font-medium">{pedido.cliente}</span>{" "}
            ({idImpositiva}: {numeroImpositivo})
          </p>

          <div className="space-y-3">
            {(pedido.productos || []).map((prod, i) => {
              const pesoActual = normalizarNumero(pesosTemp[i]);
              const promedio = calcularPesoPromedio(
                pesoActual,
                prod.cantidad
              );

              return (
                <div
                  key={prod.itemId ?? i}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                >
                  <div className="text-sm">
                    <div
                      className="truncate font-medium"
                      title={prod.productoNombre}
                    >
                      {prod.productoNombre} ({prod.presentacion})
                    </div>

                    <div className="text-xs text-slate-500">
                      Cantidad: {prod.cantidad}
                    </div>

                    <div className="text-xs font-medium text-slate-700">
                      Promedio:{" "}
                      {promedio != null ? formatearKgPromedio(promedio) : "-"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-8 w-24 text-center text-sm"
                      value={pesosTemp[i] ?? ""}
                      disabled={guardando}
                      onChange={(e) => actualizarPeso(i, e.target.value)}
                      placeholder="kg"
                    />

                    <span className="text-xs text-slate-500">kg</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>

            <Button onClick={onGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar pesajes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}