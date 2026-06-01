import { useCallback, useEffect, useState } from "react";
import {
  cargarLineaSecadero,
  liberarLineaSecadero,
  listarHistorialSecaderos,
  listarSecaderos,
} from "../services/secaderosService";

export function useSecaderos(usuarioActual) {
  const [secaderos, setSecaderos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const [secaderosData, historialData] = await Promise.all([
        listarSecaderos(),
        listarHistorialSecaderos(),
      ]);

      setSecaderos(secaderosData);
      setHistorial(historialData);
    } catch (e) {
      console.error("Error cargando secaderos:", e);
      setError(e.message || "No se pudieron cargar los secaderos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cargarLinea = async ({ linea, lote, fechaIngreso, observacionesIngreso }) => {
    try {
      setGuardando(true);
      setError(null);

      await cargarLineaSecadero({
        linea,
        lote,
        fechaIngreso,
        observacionesIngreso,
        usuarioActual,
      });

      await cargarDatos();
    } catch (e) {
      console.error("Error cargando línea:", e);
      throw e;
    } finally {
      setGuardando(false);
    }
  };

  const liberarLinea = async ({
    linea,
    ocupacion,
    fechaSalida,
    cantidadPodridos,
    observacionesSalida,
  }) => {
    try {
      setGuardando(true);
      setError(null);

      await liberarLineaSecadero({
        linea,
        ocupacion,
        fechaSalida,
        cantidadPodridos,
        observacionesSalida,
        usuarioActual,
      });

      await cargarDatos();
    } catch (e) {
      console.error("Error liberando línea:", e);
      throw e;
    } finally {
      setGuardando(false);
    }
  };

  return {
    secaderos,
    historial,
    cargando,
    guardando,
    error,
    recargar: cargarDatos,
    cargarLinea,
    liberarLinea,
  };
}