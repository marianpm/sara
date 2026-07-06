// src/features/clientes/components/DetalleClienteModal.jsx
import React from "react";
import { Card, CardContent } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";

const formatFecha = (value) => {
  if (!value) return "-";
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-AR");
};

export default function DetalleClienteModal({ cliente, onClose }) {
  if (!cliente) return null;

  const nombreVisibleCliente =
    cliente.razon_social ||
    cliente.nombre_fantasia ||
    `${cliente.id_impositiva ?? ""} ${cliente.numero_impositivo ?? ""}`.trim() ||
    `Cliente ${cliente.id ?? ""}`;

  const direccionEntrega = cliente.domicilio_entrega || "";
  const tieneCoordenadas =
    cliente.domicilio_entrega_lat != null &&
    cliente.domicilio_entrega_lng != null;

  const copiarDireccion = async () => {
    if (!direccionEntrega) return;

    try {
      await navigator.clipboard.writeText(direccionEntrega);
    } catch (error) {
      console.error("No se pudo copiar la dirección", error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Detalle del cliente</h2>
            </div>

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
              <strong>ID cliente:</strong> {cliente.id ?? "-"}
            </p>

            <p>
              <strong>Cliente:</strong> {nombreVisibleCliente}
            </p>

            <p>
              <strong>Razón social:</strong> {cliente.razon_social || "-"}
            </p>

            <p>
              <strong>Nombre de fantasía:</strong>{" "}
              {cliente.nombre_fantasia || "-"}
            </p>

            <p>
              <strong>ID impositivo:</strong>{" "}
              {cliente.id_impositiva || "-"} {cliente.numero_impositivo || "-"}
            </p>

            <p>
              <strong>Condición IVA:</strong> {cliente.condicion_iva || "-"}
            </p>

            <p>
              <strong>Tipo:</strong> {cliente.tipo || "-"}
            </p>

            <p>
              <strong>Email:</strong> {cliente.email || "-"}
            </p>

            <p>
              <strong>Teléfono:</strong> {cliente.telefono || "-"}
            </p>

            <p>
              <strong>Domicilio fiscal:</strong>{" "}
              {cliente.domicilio_fiscal || "-"}
            </p>

            <p>
              <strong>Domicilio de entrega:</strong>{" "}
              {cliente.domicilio_entrega || "-"}
            </p>

            <p>
              <strong>Fecha de alta:</strong> {formatFecha(cliente.created_at)}
            </p>

            <p>
              <strong>Observaciones:</strong> {cliente.observaciones || "-"}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={copiarDireccion}
              disabled={!direccionEntrega}
            >
              Copiar dirección
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={abrirUbicacion}
              disabled={!direccionEntrega && !tieneCoordenadas}
            >
              Abrir ubicación
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}