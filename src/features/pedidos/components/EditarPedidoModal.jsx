import React, { useEffect, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";

export default function EditarPedidoModal({
  pedido,
  onClose,
  onGuardar,
  onEliminar,
  guardando = false,
  bloqueadoPorFactura = false,
}) {
  const [form, setForm] = useState({
    tipoEntrega: "Retiro",
    marca: "Sarria",
    tipo_factura: "Sin_Factura",
    fecha: "",
    notas: "",
  });

  useEffect(() => {
    if (!pedido) return;

    setForm({
      tipoEntrega: pedido.tipoEntrega || pedido.tipo_entrega || "Retiro",
      marca: pedido.marca || "Sarria",
      tipo_factura: pedido.tipo_factura || "Sin_Factura",
      fecha: pedido.fecha || pedido.fecha_solicitada || "",
      notas: pedido.notas || pedido.observaciones || "",
    });
  }, [pedido]);

  if (!pedido) return null;

  const puedeGuardar =
    form.tipoEntrega &&
    form.marca &&
    form.tipo_factura &&
    !guardando &&
    !bloqueadoPorFactura;

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const guardar = () => {
    if (!puedeGuardar) return;
    onGuardar(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !guardando) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Editar pedido</h2>
            <p className="text-sm text-slate-500">
              {pedido.cliente} · Pedido #{pedido.id}
            </p>
          </div>
        </div>

        {bloqueadoPorFactura && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este pedido tiene facturación iniciada o emitida. No conviene editar
            sus datos administrativos desde acá.
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-800">
                Tipo de entrega
              </span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.tipoEntrega === "Envio" ? "default" : "outline"}
                  className="rounded-full"
                  disabled={guardando || bloqueadoPorFactura}
                  onClick={() => actualizarCampo("tipoEntrega", "Envio")}
                >
                  Envío
                </Button>

                <Button
                  type="button"
                  variant={form.tipoEntrega === "Retiro" ? "default" : "outline"}
                  className="rounded-full"
                  disabled={guardando || bloqueadoPorFactura}
                  onClick={() => actualizarCampo("tipoEntrega", "Retiro")}
                >
                  Retiro
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-800">Marca</span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.marca === "Sarria" ? "default" : "outline"}
                  className="rounded-full px-4"
                  disabled={guardando || bloqueadoPorFactura}
                  onClick={() => actualizarCampo("marca", "Sarria")}
                >
                  Sarria
                </Button>

                <Button
                  type="button"
                  variant={form.marca === "1319" ? "default" : "outline"}
                  className="rounded-full px-4"
                  disabled={guardando || bloqueadoPorFactura}
                  onClick={() => actualizarCampo("marca", "1319")}
                >
                  1319
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-800">
              Tipo de factura
            </span>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={
                  form.tipo_factura === "Factura_A" ? "default" : "outline"
                }
                className="rounded-full px-4"
                disabled={guardando || bloqueadoPorFactura}
                onClick={() => actualizarCampo("tipo_factura", "Factura_A")}
              >
                Factura A
              </Button>

              <Button
                type="button"
                variant={
                  form.tipo_factura === "Factura_B" ? "default" : "outline"
                }
                className="rounded-full px-4"
                disabled={guardando || bloqueadoPorFactura}
                onClick={() => actualizarCampo("tipo_factura", "Factura_B")}
              >
                Factura B
              </Button>

              <Button
                type="button"
                variant={
                  form.tipo_factura === "Sin_Factura" ? "default" : "outline"
                }
                className="rounded-full px-4"
                disabled={guardando || bloqueadoPorFactura}
                onClick={() => actualizarCampo("tipo_factura", "Sin_Factura")}
              >
                Sin factura
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="editar-pedido-fecha"
                className="text-sm font-medium text-slate-800"
              >
                Fecha de envío/retiro
              </label>

              <Input
                id="editar-pedido-fecha"
                type="date"
                value={form.fecha || ""}
                disabled={guardando || bloqueadoPorFactura}
                onChange={(e) => actualizarCampo("fecha", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="editar-pedido-notas"
                className="text-sm font-medium text-slate-800"
              >
                Notas
              </label>

              <textarea
                id="editar-pedido-notas"
                className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                maxLength={200}
                value={form.notas || ""}
                disabled={guardando || bloqueadoPorFactura}
                onChange={(e) => actualizarCampo("notas", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            disabled={guardando || bloqueadoPorFactura}
            onClick={onEliminar}
          >
            Eliminar pedido
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={guardando}
              onClick={onClose}
            >
              Cancelar
            </Button>

            <Button type="button" disabled={!puedeGuardar} onClick={guardar}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}