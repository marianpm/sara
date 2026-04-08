import { useCallback, useEffect, useState } from "react";
import { fetchDashboardBaseData } from "./dashboardService";
import { buildDashboardData } from "./dashboardUtils";

const REFRESH_MS = 10 * 60 * 1000;

const EMPTY_DASHBOARD = {
  kpis: {
    pedidosCreados: 0,
    pedidosEntregados: 0,
    facturacion: 0,
    kilosVendidos: 0,
  },
  pedidosPorSemana: [],
  kilosPorSemana: [],
  entregasPorSemana: [],
  facturacionPorSemana: [],
  kgPorMarca: [],
  facturaVsSinFactura: [],
  envioVsRetiro: [],
  kilosPorTipoCliente: [],
  topProductos: [],
  topClientes: [],
};

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [periodoDias, setPeriodoDias] = useState(30);

  const [rawData, setRawData] = useState({
    pedidos: [],
    items: [],
    productos: [],
    clientes: [],
  });

  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD);

  const cargar = useCallback(async () => {
    try {
      setError(null);

      const data = await fetchDashboardBaseData();
      setRawData(data);
      setUltimaActualizacion(new Date());
    } catch (e) {
      console.error("Error cargando tablero:", e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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
        productos: rawData.productos,
        clientes: rawData.clientes,
        periodoDias,
      })
    );
  }, [rawData, periodoDias]);

  return {
    loading,
    error,
    ultimaActualizacion,
    periodoDias,
    setPeriodoDias,
    ...dashboardData,
  };
}