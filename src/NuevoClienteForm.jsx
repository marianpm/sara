// src/NuevoClienteForm.jsx
import React, { useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { supabase } from "./supabaseClient";
import { registrarLog } from "./logsEventos";

const initialState = {
  razon_social: "",
  id_impositiva: "CUIT",
  numero_impositivo: "",
  domicilio_fiscal: "",
  domicilio_entrega: "",
  domicilioEntregaIgualFiscal: true, 
  telefono: "",
  tipo: "Otro",
  observaciones: "",
};

export default function NuevoClienteForm({ usuarioActual, onClienteCreado }) {
  const [form, setForm] = useState(initialState);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);

  const [clienteCreado, setClienteCreado] = useState(null);

  const puedeCrear =
    form.razon_social.trim().length > 0 &&
    form.numero_impositivo.trim().length > 0;

  const handleCrear = async () => {
    if (!puedeCrear || creando) return;

    try {
      setCreando(true);
      setError(null);

      const razon_social = form.razon_social.trim();
      const numero_impositivo = form.numero_impositivo.trim();

      const domicilio_fiscal =
        form.domicilio_fiscal.trim().length > 0 ? form.domicilio_fiscal.trim() : null;

      const domicilio_entrega = form.domicilioEntregaIgualFiscal
        ? domicilio_fiscal //  si es igual, copia fiscal (o null)
        : (form.domicilio_entrega.trim().length > 0 ? form.domicilio_entrega.trim() : null);

      const estado_aprobacion_cliente =
        usuarioActual?.rol === "Admin" ? "Aprobado" : "Pendiente";

      const PHONE_PREFIX = "+549";
      const telefono =
        form.telefono.trim().length > 0
          ? `${PHONE_PREFIX}${form.telefono.trim()}`
          : null;

      const tipo = form.tipo || "Otro";
      const observaciones =
        form.observaciones.trim().length > 0 ? form.observaciones.trim() : null;

      const { data, error: dbError } = await supabase
        .from("clientes")
        .insert({
          razon_social,
          id_impositiva: form.id_impositiva,
          numero_impositivo,
          domicilio_fiscal,
          domicilio_entrega,
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
          setError("Ya existe un cliente con esa razon social. Elegí otro.");
        } else {
          setError("Error guardando el cliente: " + (dbError.message || String(dbError)));
        }
        return;
      }

      registrarLog(
        usuarioActual,
        `${usuarioActual?.usuario ?? "Usuario"} ha creado el cliente "${data.razon_social}" (ID ${data.id})`
      );

      setClienteCreado(data);
    } catch (e) {
      console.error("Error creando cliente:", e);
      setError("Error inesperado guardando el cliente: " + (e.message || String(e)));
    } finally {
      setCreando(false);
    }
  };

  const handleCerrarModal = async () => {
    const cliente = clienteCreado;
    setClienteCreado(null);
    setForm(initialState);

    if (onClienteCreado && cliente) {
      await onClienteCreado(cliente);
    }
  };

  const toggleEntregaIgual = (checked) => {
    setForm((prev) => {
      if (checked) {
        // si vuelve a "igual", espejo entrega = fiscal
        return {
          ...prev,
          domicilioEntregaIgualFiscal: true,
          domicilio_entrega: prev.domicilio_fiscal,
        };
      }

      // si se des-selecciona, dejar entrega vacío para escribir uno nuevo
      return {
        ...prev,
        domicilioEntregaIgualFiscal: false,
        domicilio_entrega: "",
      };
    });
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-2xl font-semibold">Nuevo cliente</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Razon social/Nombre
              </label>
              <Input
                placeholder="Razon social/Nombre"
                maxLength={60}
                value={form.razon_social}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, razon_social: e.target.value }))
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
                  value={form.numero_impositivo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      numero_impositivo: e.target.value.replace(/\D/g, ""),
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
              <div className="flex w-full items-stretch">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-700 h-10">
                  +549
                </span>
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
                <option value="Focacceria">Focacceria</option>
                <option value="Fiambreria">Fiambrería</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Distribuidora">Distribuidora</option>
                <option value="Frigorifico">Frigorifico</option>
                <option value="Particular">Particular</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          {/* Domicilio fiscal */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Domicilio fiscal (opcional)
            </label>
            <Input
              placeholder="Domicilio fiscal"
              maxLength={120}
              value={form.domicilio_fiscal}
              onChange={(e) =>
                setForm((prev) => {
                  const domicilio_fiscal = e.target.value;
                  // si entrega igual fiscal, espejo automáticamente
                  return prev.domicilioEntregaIgualFiscal
                    ? { ...prev, domicilio_fiscal, domicilio_entrega: domicilio_fiscal }
                    : { ...prev, domicilio_fiscal };
                })
              }
            />
          </div>

          {/* Selector */}
          <div className="flex items-center gap-2">
            <input
              id="entregaIgualFiscal"
              type="checkbox"
              className="h-4 w-4"
              checked={form.domicilioEntregaIgualFiscal}
              onChange={(e) => toggleEntregaIgual(e.target.checked)}
            />
            <label htmlFor="entregaIgualFiscal" className="text-sm text-slate-800">
              Domicilio de entrega igual a domicilio fiscal
            </label>
          </div>

          {/* Domicilio entrega condicional */}
          {!form.domicilioEntregaIgualFiscal && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Domicilio de entrega (opcional)
              </label>
              <Input
                placeholder="Domicilio de entrega"
                maxLength={120}
                value={form.domicilio_entrega}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    domicilio_entrega: e.target.value,
                  }))
                }
              />
            </div>
          )}

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

      {/* MODAL */}
      {clienteCreado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Cliente creado</h2>

              <div className="space-y-1 text-sm text-slate-800">
                <p><strong>N° cliente:</strong> {clienteCreado.id}</p>
                <p><strong>Razon social/Nombre:</strong> {clienteCreado.razon_social}</p>
                <p>
                  <strong>{clienteCreado.id_impositiva}:</strong>{" "}
                  {clienteCreado.numero_impositivo}
                </p>

                {clienteCreado.telefono && (
                  <p><strong>Teléfono:</strong> {clienteCreado.telefono}</p>
                )}

                {clienteCreado.domicilio_fiscal && (
                  <p><strong>Domicilio fiscal:</strong> {clienteCreado.domicilio_fiscal}</p>
                )}

                {clienteCreado.domicilio_entrega && (
                  <p><strong>Domicilio entrega:</strong> {clienteCreado.domicilio_entrega}</p>
                )}

                {clienteCreado.observaciones && (
                  <p><strong>Observaciones:</strong> {clienteCreado.observaciones}</p>
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