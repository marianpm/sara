import React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function DetallePedidoModal({ pedido, onClose }) {
  if (!pedido) return null;

  const copiarDireccion = async () => {
    if (!pedido?.direccion_entrega) return;
    try {
      await navigator.clipboard.writeText(pedido.direccion_entrega);
    } catch (error) {
      console.error("No se pudo copiar la dirección", error);
    }
  };

  const abrirUbicacion = () => {
    if (!pedido?.direccion_entrega) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      pedido.direccion_entrega
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">Detalle del pedido</h2>
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>Cliente:</strong> {pedido.cliente || "-"}
            </p>
            {pedido.nombre_fantasia && (
                  <p><strong>Nombre de fantasía:</strong> {pedido.nombre_fantasia}</p>
            )}
            <p>
              <strong>CUIT/CUIL:</strong> {pedido.numero_impositivo || "-"}
            </p>
            <p>
              <strong>Tipo de entrega:</strong> {pedido.tipoEntrega || "-"}
            </p>
            <p>
              <strong>Dirección de entrega:</strong> {pedido.direccion_entrega || "-"}
            </p>
            <p>
              <strong>Fecha:</strong> {pedido.fecha || "-"}
            </p>
            <p>
              <strong>Factura:</strong> {pedido.tipo_factura || "-"}
            </p>
            <p>
              <strong>Marca:</strong> {pedido.marca || "-"}
            </p>
            <p>
              <strong>Notas:</strong> {pedido.notas || "-"}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={copiarDireccion}
              disabled={!pedido?.direccion_entrega}
            >
              Copiar dirección
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={abrirUbicacion}
              disabled={!pedido?.direccion_entrega}
            >
              Abrir ubicación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}