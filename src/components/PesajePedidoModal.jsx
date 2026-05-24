import React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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

    let numero = Number(value);
    if (Number.isNaN(numero)) return;

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
            {(pedido.productos || []).map((prod, i) => (
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

                  <div className="text-slate-500 text-xs">
                    Cantidad: {prod.cantidad}
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
            ))}
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