import { useCallback, useEffect, useState } from "react";
import { fetchDashboardBaseData } from "./dashboardService";
import { buildDashboardData } from "./dashboardUtils";

const REFRESH_MS = 10 * 60 * 1000;

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [periodoTopDias, setPeriodoTopDias] = useState(30);
  const [rawData, setRawData] = useState({ pedidos: [], items: [] });
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      pedidosCreados7: 0,
      pedidosEntregados7: 0,
      facturacion7: 0,
      kilosVendidos7: 0,
    },
    pedidosPorSemana: [],
    kilosPorSemana: [],
    entregasPorSemana: [],
    facturacionPorSemana: [],
    topProductos: [],
    topClientes: [],
  });

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchDashboardBaseData();
      setRawData(data);

      setDashboardData(
        buildDashboardData({
          pedidos: data.pedidos,
          items: data.items,
          periodoTopDias,
        })
      );

      setUltimaActualizacion(new Date());
    } catch (e) {
      console.error("Error cargando tablero:", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [periodoTopDias]);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, REFRESH_MS);
    return () => clearInterval(interval);
  }, [cargar]);

  useEffect(() => {
    setDashboardData(
      buildDashboardData({
        pedidos: rawData.pedidos,
        items: rawData.items,
        periodoTopDias,
      })
    );
  }, [rawData, periodoTopDias]);

  return {
    loading,
    error,
    ultimaActualizacion,
    periodoTopDias,
    setPeriodoTopDias,
    ...dashboardData,
  };
}