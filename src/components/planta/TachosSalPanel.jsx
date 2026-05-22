import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { registrarLog } from "../../logsEventos";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const getHoyISO = () => {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
};

const parseISODateLocal = (iso) => {
  if (!iso) return null;
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toISODateLocal = (fecha) => {
  const copia = new Date(fecha);
  copia.setMinutes(copia.getMinutes() - copia.getTimezoneOffset());
  return copia.toISOString().slice(0, 10);
};

const sumarDiasISO = (iso, dias) => {
  const fecha = parseISODateLocal(iso);
  if (!fecha) return "";
  fecha.setDate(fecha.getDate() + Number(dias || 0));
  return toISODateLocal(fecha);
};

const diferenciaDias = (fechaObjetivoISO, fechaBaseISO) => {
  const objetivo = parseISODateLocal(fechaObjetivoISO);
  const base = parseISODateLocal(fechaBaseISO);
  if (!objetivo || !base) return 0;

  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.round((objetivo - base) / msPorDia);
};

const formatearFecha = (iso) => {
  const fecha = parseISODateLocal(iso);
  if (!fecha) return "-";
  return fecha.toLocaleDateString("es-AR");
};

const formatearListaNumeros = (numeros) => {
  const lista = [...numeros].sort((a, b) => Number(a) - Number(b));

  if (lista.length === 0) return "";
  if (lista.length === 1) return String(lista[0]);
  if (lista.length === 2) return `${lista[0]} y ${lista[1]}`;

  return `${lista.slice(0, -1).join(", ")} y ${lista[lista.length - 1]}`;
};

const getMovimientoDeTacho = (movimientosPorTacho, numero) =>
  movimientosPorTacho.get(Number(numero)) || null;

const getEstadoTacho = ({ tacho, movimiento, hoy }) => {
  if (tacho.activo === false) return "inactivo";
  if (!movimiento) return "libre";

  const diasRestantes = diferenciaDias(movimiento.fecha_egreso_estimada, hoy);

  if (diasRestantes < 0) return "vencido";
  if (diasRestantes === 0) return "a_retirar";

  return "ocupado";
};

const getEstadoLabel = (estado) => {
  switch (estado) {
    case "libre":
      return "Libre";
    case "ocupado":
      return "Ocupado";
    case "a_retirar":
      return "A retirar";
    case "vencido":
      return "Vencido";
    case "inactivo":
      return "Inactivo";
    default:
      return estado;
  }
};

const getTachoClassName = ({ estado, seleccionado, clickeable }) => {
  const base =
    "relative min-h-[86px] rounded-xl border px-3 py-2 text-left text-sm transition";

  const cursor = clickeable ? "cursor-pointer" : "cursor-default";

  const selected = seleccionado
    ? " ring-2 ring-slate-900 ring-offset-2"
    : "";

  switch (estado) {
    case "libre":
      return `${base} ${cursor} border-slate-200 bg-white text-slate-900 hover:border-slate-400${selected}`;
    case "ocupado":
      return `${base} ${cursor} border-slate-300 bg-slate-200 text-slate-700${selected}`;
    case "a_retirar":
      return `${base} ${cursor} border-amber-300 bg-amber-100 text-amber-900${selected}`;
    case "vencido":
      return `${base} ${cursor} border-red-300 bg-red-100 text-red-800${selected}`;
    case "inactivo":
      return `${base} border-slate-200 bg-white text-slate-400 opacity-60 line-through`;
    default:
      return `${base} border-slate-200 bg-white text-slate-900${selected}`;
  }
};

export default function TachosSalPanel({ usuarioActual }) {
  const hoy = useMemo(() => getHoyISO(), []);

  const [seccion, setSeccion] = useState("ingreso");
  const [config, setConfig] = useState(null);
  const [tachos, setTachos] = useState([]);
  const [movimientosActivos, setMovimientosActivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [cantidadPatas, setCantidadPatas] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(hoy);
  const [observaciones, setObservaciones] = useState("");
  const [tachosSeleccionados, setTachosSeleccionados] = useState([]);
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);

  const [mostrarConfirmEgreso, setMostrarConfirmEgreso] = useState(false);

  const [movimientosEgresoSeleccionados, setMovimientosEgresoSeleccionados] =
    useState([]);
  const [guardandoEgreso, setGuardandoEgreso] = useState(false);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setMensaje(null);

    try {
      const [configRes, tachosRes, movimientosRes] = await Promise.all([
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
          .select("*")
          .eq("estado", "en_sal")
          .order("fecha_egreso_estimada", { ascending: true })
          .order("tacho_numero", { ascending: true }),
      ]);

      if (configRes.error) throw configRes.error;
      if (tachosRes.error) throw tachosRes.error;
      if (movimientosRes.error) throw movimientosRes.error;

      setConfig(configRes.data);
      setTachos(tachosRes.data || []);
      setMovimientosActivos(movimientosRes.data || []);
    } catch (error) {
      console.error("Error cargando tachos de sal:", error);
      mostrarMensaje(
        "error",
        error?.message || "No se pudieron cargar los tachos de sal."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const movimientosPorTacho = useMemo(() => {
    const map = new Map();

    movimientosActivos.forEach((mov) => {
      map.set(Number(mov.tacho_numero), mov);
    });

    return map;
  }, [movimientosActivos]);

  const cantidadPatasNumero = Number(cantidadPatas || 0);
  const patasPorTacho = Number(config?.patas_por_tacho || 56);
  const diasEnSal = Number(config?.dias_en_sal || 15);

  const tachosNecesarios =
    cantidadPatasNumero > 0
      ? Math.ceil(cantidadPatasNumero / patasPorTacho)
      : 0;

  const fechaEgresoEstimada = fechaIngreso
    ? sumarDiasISO(fechaIngreso, diasEnSal)
    : "";

  const tachosDisponibles = useMemo(
    () =>
      tachos.filter(
        (tacho) =>
          tacho.activo !== false &&
          !getMovimientoDeTacho(movimientosPorTacho, tacho.numero)
      ),
    [tachos, movimientosPorTacho]
  );

  const estadisticas = useMemo(() => {
    const resumen = {
      libres: 0,
      ocupados: 0,
      aRetirar: 0,
      vencidos: 0,
      inactivos: 0,
    };

    tachos.forEach((tacho) => {
      const movimiento = getMovimientoDeTacho(movimientosPorTacho, tacho.numero);
      const estado = getEstadoTacho({ tacho, movimiento, hoy });

      if (estado === "libre") resumen.libres += 1;
      if (estado === "ocupado") resumen.ocupados += 1;
      if (estado === "a_retirar") resumen.aRetirar += 1;
      if (estado === "vencido") resumen.vencidos += 1;
      if (estado === "inactivo") resumen.inactivos += 1;
    });

    return resumen;
  }, [tachos, movimientosPorTacho, hoy]);

  useEffect(() => {
    setTachosSeleccionados((prev) => prev.slice(0, tachosNecesarios));
  }, [tachosNecesarios]);

  const toggleTachoIngreso = (tacho) => {
    if (seccion !== "ingreso") return;

    if (!cantidadPatasNumero || cantidadPatasNumero <= 0) {
      mostrarMensaje("error", "Primero ingresá la cantidad de patas.");
      return;
    }

    const movimiento = getMovimientoDeTacho(movimientosPorTacho, tacho.numero);

    if (tacho.activo === false || movimiento) return;

    setTachosSeleccionados((prev) => {
      if (prev.includes(tacho.numero)) {
        return prev.filter((numero) => numero !== tacho.numero);
      }

      if (prev.length >= tachosNecesarios) {
        return prev;
      }

      return [...prev, tacho.numero];
    });
  };

  const toggleMovimientoEgreso = (movimientoId) => {
    setMovimientosEgresoSeleccionados((prev) =>
      prev.includes(movimientoId)
        ? prev.filter((id) => id !== movimientoId)
        : [...prev, movimientoId]
    );
  };

  const handleClickTacho = (tacho) => {
    const movimiento = getMovimientoDeTacho(movimientosPorTacho, tacho.numero);

    if (seccion === "ingreso") {
      toggleTachoIngreso(tacho);
      return;
    }

    if (seccion === "egreso" && movimiento) {
      toggleMovimientoEgreso(movimiento.id);
    }
  };

  const sugerirTachos = () => {
    if (!tachosNecesarios) {
      mostrarMensaje("error", "Ingresá la cantidad de patas para calcular tachos.");
      return;
    }

    const sugeridos = tachosDisponibles
      .slice(0, tachosNecesarios)
      .map((tacho) => tacho.numero);

    if (sugeridos.length < tachosNecesarios) {
      mostrarMensaje(
        "error",
        `No hay suficientes tachos libres. Necesitás ${tachosNecesarios} y hay ${sugeridos.length}.`
      );
    }

    setTachosSeleccionados(sugeridos);
  };

  const distribucionIngreso = useMemo(() => {
    let restante = cantidadPatasNumero;

    return [...tachosSeleccionados]
      .sort((a, b) => Number(a) - Number(b))
      .map((numero) => {
        const cantidad = Math.min(restante, patasPorTacho);
        restante -= cantidad;

        return {
          tacho_numero: numero,
          cantidad_patas: cantidad,
        };
      });
  }, [tachosSeleccionados, cantidadPatasNumero, patasPorTacho]);

  const puedeConfirmarIngreso =
    !guardandoIngreso &&
    cantidadPatasNumero > 0 &&
    fechaIngreso &&
    tachosNecesarios > 0 &&
    tachosSeleccionados.length === tachosNecesarios;

  const confirmarIngreso = async () => {
    if (!puedeConfirmarIngreso) return;

    setGuardandoIngreso(true);
    setMensaje(null);

    try {
      const grupoId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const filas = distribucionIngreso.map((item) => ({
        grupo_id: grupoId,
        tacho_numero: item.tacho_numero,
        cantidad_patas: item.cantidad_patas,
        fecha_ingreso: fechaIngreso,
        fecha_egreso_estimada: fechaEgresoEstimada,
        estado: "en_sal",
        observaciones: observaciones.trim() || null,
        dias_en_sal_snapshot: diasEnSal,
        patas_por_tacho_snapshot: patasPorTacho,
        creado_por_usuario: usuarioActual?.usuario ?? null,
      }));

      const { error } = await supabase
        .from("tachos_sal_movimientos")
        .insert(filas);

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Alguno de los tachos seleccionados ya está ocupado. Recargá y volvé a intentar."
          );
        }

        throw error;
      }

      const detalle = distribucionIngreso
        .map((item) => `Tacho ${item.tacho_numero}: ${item.cantidad_patas} patas`)
        .join(", ");

      registrarLog(
        usuarioActual,
        `Se ingresaron ${cantidadPatasNumero} patas en sal. ${detalle}. Egreso estimado: ${formatearFecha(
          fechaEgresoEstimada
        )}.`
      );

      mostrarMensaje("success", "Ingreso registrado correctamente.");

      setCantidadPatas("");
      setObservaciones("");
      setTachosSeleccionados([]);

      await cargarDatos();
    } catch (error) {
      console.error("Error registrando ingreso de sal:", error);
      mostrarMensaje(
        "error",
        error?.message || "No se pudo registrar el ingreso."
      );
    } finally {
      setGuardandoIngreso(false);
    }
  };

  const movimientosOrdenados = useMemo(
    () =>
      [...movimientosActivos].sort((a, b) => {
        const diffFecha = String(a.fecha_egreso_estimada).localeCompare(
          String(b.fecha_egreso_estimada)
        );

        if (diffFecha !== 0) return diffFecha;

        return Number(a.tacho_numero) - Number(b.tacho_numero);
      }),
    [movimientosActivos]
  );

  const gruposEgreso = useMemo(() => {
    const grupos = new Map();

    movimientosOrdenados.forEach((mov) => {
      const dias = diferenciaDias(mov.fecha_egreso_estimada, hoy);

      const key =
        dias < 0
          ? "vencidos"
          : dias === 0
          ? "hoy"
          : dias === 1
          ? "manana"
          : `en_${dias}`;

      const titulo =
        dias < 0
          ? "Vencidos"
          : dias === 0
          ? "Hoy"
          : dias === 1
          ? "Mañana"
          : `En ${dias} días`;

      const orden = dias < 0 ? -999 : dias;

      if (!grupos.has(key)) {
        grupos.set(key, {
          key,
          titulo,
          orden,
          items: [],
        });
      }

      grupos.get(key).items.push({
        ...mov,
        dias_restantes_calculados: dias,
      });
    });

    return [...grupos.values()].sort((a, b) => a.orden - b.orden);
  }, [movimientosOrdenados, hoy]);

  const seleccionarVencidosYHoy = () => {
    const ids = movimientosActivos
      .filter((mov) => diferenciaDias(mov.fecha_egreso_estimada, hoy) <= 0)
      .map((mov) => mov.id);

    setMovimientosEgresoSeleccionados(ids);
  };

  const movimientosAEgresar = useMemo(
    () =>
      movimientosActivos.filter((mov) =>
        movimientosEgresoSeleccionados.includes(mov.id)
      ),
    [movimientosActivos, movimientosEgresoSeleccionados]
  );

  const marcarEgreso = async () => {
    if (movimientosAEgresar.length === 0) {
      mostrarMensaje("error", "Seleccioná al menos un tacho para egresar.");
      return;
    }

    if (!ok) return;

    setGuardandoEgreso(true);
    setMensaje(null);

    setMostrarConfirmEgreso(false);

    try {
      const ids = movimientosAEgresar.map((mov) => mov.id);
      const tachosEgresados = movimientosAEgresar.map((mov) =>
        Number(mov.tacho_numero)
      );
      const totalPatas = movimientosAEgresar.reduce(
        (acc, mov) => acc + Number(mov.cantidad_patas || 0),
        0
      );

      const { error } = await supabase
        .from("tachos_sal_movimientos")
        .update({
          estado: "egresado",
          fecha_egreso_real: hoy,
          egresado_por_usuario: usuarioActual?.usuario ?? null,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;

      registrarLog(
        usuarioActual,
        `Se egresaron de sal los tachos ${formatearListaNumeros(
          tachosEgresados
        )}. Total: ${totalPatas} patas.`
      );

      mostrarMensaje("success", "Egreso registrado correctamente.");

      setMovimientosEgresoSeleccionados([]);
      await cargarDatos();
    } catch (error) {
      console.error("Error registrando egreso de sal:", error);
      mostrarMensaje(
        "error",
        error?.message || "No se pudo registrar el egreso."
      );
    } finally {
      setGuardandoEgreso(false);
    }
  };

  return (
    <section className="planta-card">
      <div className="planta-card-header">
        <div>
          <h2>Tachos Sal</h2>
          <p>
            Capacidad:{" "}
            {patasPorTacho} patas por tacho · {diasEnSal} días en sal.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={cargarDatos}
          disabled={cargando}
        >
          {cargando ? "Cargando..." : "Actualizar"}
        </Button>
      </div>

      {mensaje && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            mensaje.tipo === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {mostrarConfirmEgreso && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !guardandoEgreso) {
              setMostrarConfirmEgreso(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold">Confirmar egreso</h3>

            <p className="mt-2 text-sm text-slate-600">
              Vas a marcar como egresados {movimientosAEgresar.length} tacho(s).
            </p>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              {movimientosAEgresar
                .map(
                  (mov) =>
                    `Tacho ${mov.tacho_numero}: ${mov.cantidad_patas} patas`
                )
                .join(" · ")}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={guardandoEgreso}
                onClick={() => setMostrarConfirmEgreso(false)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={guardandoEgreso}
                onClick={marcarEgreso}
              >
                {guardandoEgreso ? "Guardando..." : "Confirmar egreso"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-500">Libres</div>
          <div className="text-2xl font-semibold">{estadisticas.libres}</div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-100 p-3">
          <div className="text-xs text-slate-500">Ocupados</div>
          <div className="text-2xl font-semibold">{estadisticas.ocupados}</div>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <div className="text-xs text-amber-700">A retirar</div>
          <div className="text-2xl font-semibold text-amber-900">
            {estadisticas.aRetirar}
          </div>
        </div>

        <div className="rounded-xl border border-red-300 bg-red-50 p-3">
          <div className="text-xs text-red-700">Vencidos</div>
          <div className="text-2xl font-semibold text-red-800">
            {estadisticas.vencidos}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-400">
          <div className="text-xs">Inactivos</div>
          <div className="text-2xl font-semibold">{estadisticas.inactivos}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={seccion === "ingreso" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSeccion("ingreso")}
        >
          Ingreso
        </Button>

        <Button
          type="button"
          variant={seccion === "egreso" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSeccion("egreso")}
        >
          Egreso
        </Button>
      </div>

      {cargando ? (
        <p className="mt-4 text-sm text-slate-500">Cargando tachos...</p>
      ) : (
        <>
          {seccion === "ingreso" && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">
                    Cantidad de patas
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={cantidadPatas}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^0+/, "");
                      setCantidadPatas(value);
                    }}
                    placeholder="Ej: 120"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">
                    Fecha de ingreso
                  </label>
                  <Input
                    type="date"
                    max={hoy}
                    value={fechaIngreso}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value && value > hoy) {
                        setFechaIngreso(hoy);
                        mostrarMensaje(
                          "error",
                          "La fecha de ingreso no puede ser posterior a hoy."
                        );
                        return;
                      }

                      setFechaIngreso(value);
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">
                    Tachos necesarios
                  </label>
                  <div className="flex h-9 items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-sm">
                    {tachosNecesarios || "-"}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">
                    Egreso estimado
                  </label>
                  <div className="flex h-9 items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-sm">
                    {fechaEgresoEstimada
                      ? formatearFecha(fechaEgresoEstimada)
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  Observaciones
                </label>
                <textarea
                  className="min-h-[60px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={observaciones}
                  maxLength={200}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={sugerirTachos}
                  disabled={!tachosNecesarios}
                >
                  Sugerir tachos libres
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTachosSeleccionados([])}
                  disabled={tachosSeleccionados.length === 0}
                >
                  Limpiar selección
                </Button>

                <span className="text-sm text-slate-500">
                  Seleccionados: {tachosSeleccionados.length} /{" "}
                  {tachosNecesarios || 0}
                </span>
              </div>

              {distribucionIngreso.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <div className="font-medium">Distribución estimada</div>
                  <div className="mt-1 text-slate-700">
                    {distribucionIngreso
                      .map(
                        (item) =>
                          `Tacho ${item.tacho_numero}: ${item.cantidad_patas} patas`
                      )
                      .join(" · ")}
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  disabled={!puedeConfirmarIngreso}
                  onClick={confirmarIngreso}
                >
                  {guardandoIngreso ? "Guardando..." : "Confirmar ingreso"}
                </Button>
              </div>
            </div>
          )}

          {seccion === "egreso" && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Egresos pendientes</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={seleccionarVencidosYHoy}
                    disabled={movimientosActivos.length === 0}
                  >
                    Seleccionar vencidos/hoy
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMovimientosEgresoSeleccionados([])}
                    disabled={movimientosEgresoSeleccionados.length === 0}
                  >
                    Limpiar
                  </Button>

                  <Button
                    type="button"
                    disabled={
                      guardandoEgreso ||
                      movimientosEgresoSeleccionados.length === 0
                    }
                    onClick={() => {
                      if (movimientosEgresoSeleccionados.length === 0) {
                        mostrarMensaje("error", "Seleccioná al menos un tacho para egresar.");
                        return;
                      }

                      setMostrarConfirmEgreso(true);
                    }}
                  >
                    {guardandoEgreso
                      ? "Guardando..."
                      : `Marcar egreso (${movimientosEgresoSeleccionados.length})`}
                  </Button>
                </div>
              </div>

              {gruposEgreso.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay tachos pendientes de egreso.
                </p>
              ) : (
                <div className="space-y-4">
                  {gruposEgreso.map((grupo) => (
                    <div key={grupo.key} className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {grupo.titulo}
                      </h4>

                      <div className="space-y-2">
                        {grupo.items.map((mov) => {
                          const seleccionado =
                            movimientosEgresoSeleccionados.includes(mov.id);

                          const dias = mov.dias_restantes_calculados;

                          return (
                            <label
                              key={mov.id}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                                dias < 0
                                  ? "border-red-200 bg-red-50 text-red-800"
                                  : dias === 0
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={seleccionado}
                                  onChange={() => toggleMovimientoEgreso(mov.id)}
                                />

                                <div>
                                  <div className="font-medium">
                                    Tacho {mov.tacho_numero} ·{" "}
                                    {mov.cantidad_patas} patas
                                  </div>
                                  <div className="text-xs opacity-80">
                                    Ingreso: {formatearFecha(mov.fecha_ingreso)} ·
                                    Salida estimada:{" "}
                                    {formatearFecha(mov.fecha_egreso_estimada)}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right text-xs font-medium">
                                {dias < 0
                                  ? `Vencido hace ${Math.abs(dias)} día(s)`
                                  : dias === 0
                                  ? "Sale hoy"
                                  : `Faltan ${dias} día(s)`}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Mapa de tachos</h3>

              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                  Libre
                </span>
                <span className="rounded-full border border-slate-300 bg-slate-200 px-2 py-1">
                  Ocupado
                </span>
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1">
                  A retirar
                </span>
                <span className="rounded-full border border-red-300 bg-red-100 px-2 py-1">
                  Vencido
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-400 line-through">
                  Inactivo
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8">
              {tachos.map((tacho) => {
                const movimiento = getMovimientoDeTacho(
                  movimientosPorTacho,
                  tacho.numero
                );

                const estado = getEstadoTacho({
                  tacho,
                  movimiento,
                  hoy,
                });

                const seleccionadoIngreso = tachosSeleccionados.includes(
                  tacho.numero
                );

                const seleccionadoEgreso =
                  movimiento &&
                  movimientosEgresoSeleccionados.includes(movimiento.id);

                const seleccionado =
                  seccion === "ingreso"
                    ? seleccionadoIngreso
                    : seleccionadoEgreso;

                const clickeable =
                  seccion === "ingreso"
                    ? estado === "libre"
                    : !!movimiento && tacho.activo !== false;

                const diasRestantes = movimiento
                  ? diferenciaDias(movimiento.fecha_egreso_estimada, hoy)
                  : null;

                return (
                  <button
                    key={tacho.numero}
                    type="button"
                    className={getTachoClassName({
                      estado,
                      seleccionado,
                      clickeable,
                    })}
                    onClick={() => handleClickTacho(tacho)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-lg font-semibold">
                        #{tacho.numero}
                      </div>

                      {seleccionado && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">
                          Sel.
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs font-medium">
                      {getEstadoLabel(estado)}
                    </div>

                    {movimiento && (
                      <div className="mt-1 text-xs opacity-80">
                        {movimiento.cantidad_patas} patas
                        <br />
                        Sale: {formatearFecha(movimiento.fecha_egreso_estimada)}
                        <br />
                        {diasRestantes < 0
                          ? `${Math.abs(diasRestantes)} día(s) vencido`
                          : diasRestantes === 0
                          ? "Sale hoy"
                          : `Faltan ${diasRestantes} día(s)`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}