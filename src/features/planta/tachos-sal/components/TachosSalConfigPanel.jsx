import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../shared/lib/supabaseClient";
import { registrarLog } from "../../../../shared/services/logsEventos";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";

const getUsuarioLog = (usuarioActual) =>
  usuarioActual?.usuario ||
  usuarioActual?.nombre ||
  usuarioActual?.email ||
  usuarioActual?.id ||
  null;

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? "bg-slate-900" : "bg-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function TachosSalConfigPanel({ usuarioActual }) {
  const [config, setConfig] = useState(null);

  const [tachos, setTachos] = useState([]);
  const [movimientosActivos, setMovimientosActivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [guardandoTacho, setGuardandoTacho] = useState({});
  const [mensaje, setMensaje] = useState(null);

  const usuarioParaLog = useMemo(
    () => ({
      ...usuarioActual,
      usuario: getUsuarioLog(usuarioActual),
    }),
    [usuarioActual]
  );

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setMensaje(null);

    try {
      const [configRes, tachosRes, movRes] = await Promise.all([
        supabase
          .from("tachos_sal_config")
          .select("*")
          .eq("id", 1)
          .single(),

        supabase
          .from("tachos_sal_tachos")
          .select("*")
          .order("numero", { ascending: true }),

        supabase
          .from("v_tachos_sal_estado")
          .select("id,tacho_numero,estado")
          .eq("estado", "en_sal"),
      ]);

      if (configRes.error) throw configRes.error;
      if (tachosRes.error) throw tachosRes.error;
      if (movRes.error) throw movRes.error;

      setConfig({
        cantidad_tachos: configRes.data?.cantidad_tachos ?? "",
        patas_por_tacho: configRes.data?.patas_por_tacho ?? "",
        dias_en_sal: configRes.data?.dias_en_sal ?? "",
      });

      setTachos(tachosRes.data || []);
      setMovimientosActivos(movRes.data || []);
    } catch (error) {
      console.error("Error cargando configuración de tachos sal:", error);
      mostrarMensaje(
        "error",
        error?.message || "No se pudo cargar la configuración."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const tachosOcupados = useMemo(() => {
    return new Set(movimientosActivos.map((mov) => Number(mov.tacho_numero)));
  }, [movimientosActivos]);

  const actualizarConfig = (campo, valor) => {
    setConfig((prev) => ({
      ...(prev || {}),
      [campo]: valor,
    }));
  };

  const sincronizarCantidadTachos = async (cantidadNueva) => {
    const cantidadActual = tachos.length;

    if (cantidadNueva <= cantidadActual) return;

    const existentes = new Set(tachos.map((t) => Number(t.numero)));
    const nuevos = [];

    for (let numero = 1; numero <= cantidadNueva; numero += 1) {
      if (!existentes.has(numero)) {
        nuevos.push({
          numero,
          activo: true,
        });
      }
    }

    if (nuevos.length === 0) return;

    const { error } = await supabase.from("tachos_sal_tachos").insert(nuevos);

    if (error) throw error;
  };

  const guardarConfig = async () => {
    const cantidadTachos = Number(config.cantidad_tachos);
    const patasPorTacho = Number(config.patas_por_tacho);
    const diasEnSal = Number(config.dias_en_sal);

    if (!Number.isInteger(cantidadTachos) || cantidadTachos <= 0) {
      mostrarMensaje("error", "La cantidad de tachos no es válida.");
      return;
    }

    if (!Number.isInteger(patasPorTacho) || patasPorTacho <= 0) {
      mostrarMensaje("error", "La cantidad de patas por tacho no es válida.");
      return;
    }

    if (!Number.isInteger(diasEnSal) || diasEnSal <= 0) {
      mostrarMensaje("error", "La cantidad de días en sal no es válida.");
      return;
    }

    setGuardandoConfig(true);
    setMensaje(null);

    try {
      await sincronizarCantidadTachos(cantidadTachos);

      const { error } = await supabase
        .from("tachos_sal_config")
        .update({
          cantidad_tachos: cantidadTachos,
          patas_por_tacho: patasPorTacho,
          dias_en_sal: diasEnSal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;

      registrarLog(
        usuarioParaLog,
        `Se actualizó configuración de tachos sal. Cantidad de tachos: ${cantidadTachos}. Patas por tacho: ${patasPorTacho}. Días en sal: ${diasEnSal}.`
      );

      mostrarMensaje("success", "Configuración guardada correctamente.");
      await cargarDatos();
    } catch (error) {
      console.error("Error guardando configuración de tachos sal:", error);
      mostrarMensaje(
        "error",
        error?.message || "No se pudo guardar la configuración."
      );
    } finally {
      setGuardandoConfig(false);
    }
  };

  const toggleTachoActivo = async (tacho) => {
    const numero = Number(tacho.numero);
    const estaOcupado = tachosOcupados.has(numero);

    if (estaOcupado) {
      mostrarMensaje(
        "error",
        `No se puede inactivar el tacho ${numero} porque está ocupado.`
      );
      return;
    }

    const nuevoActivo = tacho.activo === false;

    setGuardandoTacho((prev) => ({
      ...prev,
      [numero]: true,
    }));

    setMensaje(null);

    try {
      const { error } = await supabase
        .from("tachos_sal_tachos")
        .update({
          activo: nuevoActivo,
          updated_at: new Date().toISOString(),
        })
        .eq("numero", numero);

      if (error) throw error;

      registrarLog(
        usuarioParaLog,
        nuevoActivo
          ? `Se activó el tacho de sal ${numero}.`
          : `Se inactivó el tacho de sal ${numero}.`
      );

      mostrarMensaje(
        "success",
        nuevoActivo
          ? `Tacho ${numero} activado correctamente.`
          : `Tacho ${numero} inactivado correctamente.`
      );

      await cargarDatos();
    } catch (error) {
      console.error("Error cambiando estado de tacho:", error);
      mostrarMensaje(
        "error",
        error?.message || "No se pudo cambiar el estado del tacho."
      );
    } finally {
      setGuardandoTacho((prev) => ({
        ...prev,
        [numero]: false,
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Configuración de tachos sal</h2>
            <p className="text-sm text-slate-500">
              Definí capacidad, días de proceso y tachos activos.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={cargarDatos}
            disabled={cargando}
          >
            {cargando ? "Cargando..." : "Actualizar"}
          </Button>
        </div>

        {mensaje && (
          <div
            className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
              mensaje.tipo === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Cantidad de tachos
            </label>
            <Input
              type="number"
              min="1"
              value={config?.cantidad_tachos ?? ""}
              onChange={(e) =>
                actualizarConfig("cantidad_tachos", e.target.value)
              }
            />
            <p className="text-xs text-slate-500">
              Si aumentás la cantidad, se crean los nuevos tachos.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Patas por tacho
            </label>
            <Input
              type="number"
              min="1"
              value={config?.patas_por_tacho ?? ""}
              onChange={(e) =>
                actualizarConfig("patas_por_tacho", e.target.value)
              }
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Días en sal
            </label>
            <Input
              type="number"
              min="1"
              value={config?.dias_en_sal ?? ""}
              onChange={(e) => actualizarConfig("dias_en_sal", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={guardarConfig}
            disabled={guardandoConfig || cargando}
          >
            {guardandoConfig ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h3 className="font-semibold">Tachos</h3>
          <p className="text-sm text-slate-500">
            Los tachos inactivos no aparecen disponibles para nuevos ingresos.
          </p>
        </div>

        {cargando ? (
          <p className="text-sm text-slate-500">Cargando tachos...</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8">
            {tachos.map((tacho) => {
              const numero = Number(tacho.numero);
              const ocupado = tachosOcupados.has(numero);
              const activo = tacho.activo !== false;

              return (
                <div
                  key={numero}
                  className={`rounded-xl border p-3 ${
                    activo
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                  } ${ocupado ? "bg-slate-100" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-semibold">#{numero}</div>
                      <div className="text-xs text-slate-500">
                        {ocupado
                          ? "Ocupado"
                          : activo
                          ? "Activo"
                          : "Inactivo"}
                      </div>
                    </div>

                    <ToggleSwitch
                      checked={activo}
                      disabled={ocupado || !!guardandoTacho[numero]}
                      onChange={() => toggleTachoActivo(tacho)}
                    />
                  </div>

                  {ocupado && (
                    <p className="mt-2 text-xs text-amber-700">
                      No se puede inactivar mientras está ocupado.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}