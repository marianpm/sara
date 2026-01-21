// src/NuevoClienteForm.jsx
import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { supabase } from "./supabaseClient";
import { registrarLog } from "./logsEventos";

const initialState = {
  nombre: "",
  id_impositiva: "CUIT",
  numero: "",
  domicilio: "",
  telefono: "",
  tipo: "Otro",
  observaciones: "",
};

export default function NuevoClienteForm({ usuarioActual, onClienteCreado }) {
  const [form, setForm] = useState(initialState);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);

  // cliente recién creado para mostrar en modal
  const [clienteCreado, setClienteCreado] = useState(null);

  const puedeCrear =
    form.nombre.trim().length > 0 && form.numero.trim().length > 0;

  const handleCrear = async () => {
    if (!puedeCrear || creando) return;

    try {
      setCreando(true);
      setError(null);

      const nombre = form.nombre.trim();
      const numero = form.numero.trim();
      const domicilio =
        form.domicilio.trim().length > 0 ? form.domicilio.trim() : null;
      const estado_aprobacion_cliente =
        usuarioActual?.rol === "Admin" ? "Aprobado" : "Pendiente";
      const telefono = form.telefono.trim().length > 0 ? form.telefono.trim() : null;
      const tipo = form.tipo || "Otro";
      const observaciones = form.observaciones.trim().length > 0 ? form.observaciones.trim() : null;

      const { data, error: dbError } = await supabase
        .from("clientes")
        .insert({
          nombre,
          id_impositiva: form.id_impositiva, // "CUIT" o "CUIL"
          numero,
          domicilio,
          activo: true,
          estado_aprobacion: estado_aprobacion_cliente,
          creado_por_usuario_nombre: usuarioActual?.nombre ?? usuarioActual?.usuario ?? null,
          telefono,
          tipo,
          observaciones,
        })
        .select("*")
        .single();

      if (dbError) {
        if (dbError.code === "23505") {
          setError("Ya existe un cliente con ese nombre. Elegí otro.");
        } else {
          setError(
            "Error guardando el cliente: " +
              (dbError.message || String(dbError))
          );
        }
        return;
      }

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} ha creado el cliente "${data.nombre}" (ID ${data.id})`
      );

      // guardamos el cliente y mostramos el modal
      setClienteCreado(data);
    } catch (e) {
      console.error("Error creando cliente:", e);
      setError(
        "Error inesperado guardando el cliente: " +
          (e.message || String(e))
      );
    } finally {
      setCreando(false);
    }
  };

  // cerrar modal, limpiar y avisar al padre
  const handleCerrarModal = async () => {
    const cliente = clienteCreado;
    setClienteCreado(null);
    setForm(initialState);

    if (onClienteCreado && cliente) {
      await onClienteCreado(cliente);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-2xl font-semibold">Nuevo cliente</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Nombre del cliente
              </label>
              <Input
                placeholder="Nombre del cliente"
                maxLength={60}
                value={form.nombre}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Tipo y número
              </label>
              <div className="flex gap-2">
                <select
                  className="w-28 h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={form.id_impositiva}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      id_impositiva: e.target.value,
                    }))
                  }
                >
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                </select>
                <Input
                  className="flex-1"
                  placeholder="Número (sin guiones)"
                  maxLength={11}
                  value={form.numero}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      numero: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Teléfono (opcional)
              </label>
              <Input
                placeholder="Ej: 11 2345 6789"
                maxLength={30}
                value={form.telefono}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    telefono: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Tipo de cliente
              </label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                value={form.tipo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tipo: e.target.value,
                  }))
                }
              >
                <option value="Fiambreria">Fiambrería</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Distribuidora">Distribuidora</option>
                <option value="Frigorifico">Frigorifico</option>
                <option value="Particular">Particular</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Domicilio (opcional)
            </label>
            <Input
              placeholder="Domicilio del cliente"
              maxLength={120}
              value={form.domicilio}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  domicilio: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Observaciones (opcional)
            </label>
            <Input
              placeholder="Notas"
              maxLength={200}
              value={form.observaciones}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  observaciones: e.target.value,
                }))
              }
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button
            type="button"
            className="w-full mt-2"
            disabled={!puedeCrear || creando}
            onClick={handleCrear}
          >
            {creando ? "Guardando..." : "Guardar cliente"}
          </Button>
        </CardContent>
      </Card>

      {/* MODAL de confirmación de cliente creado */}
      {clienteCreado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Cliente creado</h2>
              <p className="text-sm text-slate-700">
                El cliente se creó correctamente. Estos son sus datos:
              </p>

              <div className="space-y-1 text-sm text-slate-800">
                <p>
                  <strong>N° cliente:</strong> {clienteCreado.id}
                </p>
                <p>
                  <strong>Nombre:</strong> {clienteCreado.nombre}
                </p>
                <p>
                  <strong>{clienteCreado.id_impositiva}:</strong>{" "}
                  {clienteCreado.numero}
                </p>
                {clienteCreado.tipo && (
                  <p>
                    <strong>Tipo:</strong> {clienteCreado.tipo}
                  </p>
                )}
                {clienteCreado.telefono && (
                  <p>
                    <strong>Teléfono:</strong> {clienteCreado.telefono}
                  </p>
                )}
                {clienteCreado.domicilio && (
                  <p>
                    <strong>Domicilio:</strong> {clienteCreado.domicilio}
                  </p>
                )}
                {clienteCreado.observaciones && (
                  <p>
                    <strong>Observaciones:</strong> {clienteCreado.observaciones}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={handleCerrarModal}>Aceptar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
