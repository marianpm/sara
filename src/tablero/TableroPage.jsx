import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent } from "../components/ui/card";
import { useDashboardData } from "./useDashboardData";
import {
  formatCurrency,
  formatInteger,
  formatKg,
  formatCompactCurrency,
} from "./dashboardUtils";

const COLOR_COCIDAS = "#D98C99";
const COLOR_CRUDAS = "#8B1E2D";

const PIE_DEFAULT_COLORS = [
  "#A61E2D",
  "#C9A227",
  "#2563EB",
  "#16A34A",
  "#F59E0B",
  "#06B6D4",
  "#94A3B8",
];

const TV_ROTATION_MS = 60 * 1000;

function KpiCard({ title, value, subtitle }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-4xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function StackedChartCard({ title, data, valueFormatter, yAxisFormatter }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

        <div className="mt-4 h-72">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Sin datos.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={yAxisFormatter} width={80} />
                <Tooltip
                  formatter={(value) =>
                    valueFormatter ? valueFormatter(value) : value
                  }
                />
                <Legend />
                <Bar
                  dataKey="cocidas"
                  stackId="a"
                  name="Salazones cocidas"
                  fill={COLOR_COCIDAS}
                />
                <Bar
                  dataKey="crudas"
                  stackId="a"
                  name="Salazones crudas"
                  fill={COLOR_CRUDAS}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PieChartCard({ title, data, valueFormatter, colorsByName = {} }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

        <div className="mt-4 h-72">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Sin datos.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={
                        colorsByName[entry.name] ||
                        PIE_DEFAULT_COLORS[index % PIE_DEFAULT_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    valueFormatter ? valueFormatter(value) : value
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, rows, valueFormatter, valueKey = "valor" }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4 space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-slate-500">Sin datos.</p>
          )}

          {rows.map((row, idx) => (
            <div key={`${row.nombre}-${idx}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-slate-800">
                  {row.nombre}
                </span>
                <span className="text-sm text-slate-600">
                  {valueFormatter(row[valueKey])}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-slate-900"
                  style={{
                    width: `${
                      rows[0]?.[valueKey]
                        ? (row[valueKey] / rows[0][valueKey]) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TipoClienteChartCard({ title, data }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

        <div className="mt-4 h-80">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Sin datos.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip formatter={(value) => formatKg(value)} />
                <Bar dataKey="kilos" fill="#A61E2D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TableroPage() {
  const {
    loading,
    error,
    ultimaActualizacion,
    periodoDias,
    setPeriodoDias,
    kpis,
    pedidosPorSemana,
    kilosPorSemana,
    entregasPorSemana,
    facturacionPorSemana,
    kgPorMarca,
    facturaVsSinFactura,
    envioVsRetiro,
    kilosPorTipoCliente,
    topProductos,
    topClientes,
  } = useDashboardData();

  const [modoTv, setModoTv] = useState(true);
  const [vistaTv, setVistaTv] = useState(0);

  useEffect(() => {
    if (!modoTv) return;

    const interval = setInterval(() => {
      setVistaTv((prev) => (prev === 0 ? 1 : 0));
    }, TV_ROTATION_MS);

    return () => clearInterval(interval);
  }, [modoTv]);

  const topClientesRows = topClientes.map((c) => ({
    nombre: c.nombre,
    facturacion: c.facturacion,
  }));

  const renderVista1 = () => (
    <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={`Pedidos creados · ${periodoDias} días`}
          value={loading ? "..." : formatInteger(kpis.pedidosCreados)}
        />
        <KpiCard
          title={`Pedidos entregados · ${periodoDias} días`}
          value={loading ? "..." : formatInteger(kpis.pedidosEntregados)}
        />
        <KpiCard
          title={`Facturación · ${periodoDias} días`}
          value={loading ? "..." : formatCurrency(kpis.facturacion)}
        />
        <KpiCard
          title={`Kilos vendidos · ${periodoDias} días`}
          value={loading ? "..." : formatKg(kpis.kilosVendidos)}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <StackedChartCard
          title="Pedidos por semana"
          data={pedidosPorSemana}
          valueFormatter={formatInteger}
        />
        <StackedChartCard
          title="Kilos por semana"
          data={kilosPorSemana}
          valueFormatter={formatKg}
        />
        <StackedChartCard
          title="Entregas por semana"
          data={entregasPorSemana}
          valueFormatter={formatInteger}
        />
        <StackedChartCard
          title="Facturación por semana"
          data={facturacionPorSemana}
          valueFormatter={formatCurrency}
          yAxisFormatter={formatCompactCurrency}
        />
      </section>
    </>
  );

  const renderVista2 = () => (
    <>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <PieChartCard
          title={`Kg por marca · ${periodoDias} días`}
          data={kgPorMarca}
          valueFormatter={formatKg}
          colorsByName={{
            Sarria: "#A61E2D",
            "1319": "#C9A227",
            "Sin marca": "#94A3B8",
          }}
        />

        <PieChartCard
          title={`Factura vs sin factura · ${periodoDias} días`}
          data={facturaVsSinFactura}
          valueFormatter={formatInteger}
          colorsByName={{
            "Con factura": "#16A34A",
            "Sin factura": "#94A3B8",
          }}
        />

        <PieChartCard
          title={`Envío vs retiro · ${periodoDias} días`}
          data={envioVsRetiro}
          valueFormatter={formatInteger}
          colorsByName={{
            "Envío": "#2563EB",
            Retiro: "#F59E0B",
            Otro: "#94A3B8",
          }}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TipoClienteChartCard
            title={`Kg por tipo de cliente · ${periodoDias} días`}
            data={kilosPorTipoCliente}
          />
        </div>

        <RankingCard
          title={`Top productos · ${periodoDias} días`}
          rows={topProductos}
          valueKey="kilos"
          valueFormatter={formatKg}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2" />
        <RankingCard
          title={`Top clientes · ${periodoDias} días`}
          rows={topClientesRows}
          valueKey="facturacion"
          valueFormatter={formatCurrency}
        />
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tablero</h1>
          <p className="text-sm text-slate-500">
            {ultimaActualizacion
              ? `Última actualización: ${ultimaActualizacion.toLocaleString("es-AR")}`
              : "Cargando datos..."}
          </p>
          {modoTv && (
            <p className="mt-1 text-xs text-slate-500">
              Modo TV activo · vista {vistaTv + 1} de 2 · rota cada 60 segundos
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90, 365].map((dias) => (
            <button
              key={dias}
              type="button"
              onClick={() => setPeriodoDias(dias)}
              className={`rounded-lg px-3 py-2 text-sm ${
                periodoDias === dias
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {dias} días
            </button>
          ))}

          <button
            type="button"
            onClick={() => setModoTv((prev) => !prev)}
            className={`rounded-lg px-3 py-2 text-sm ${
              modoTv
                ? "bg-emerald-600 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {modoTv ? "Modo TV: ON" : "Modo TV: OFF"}
          </button>

          {modoTv && (
            <button
              type="button"
              onClick={() => setVistaTv((prev) => (prev === 0 ? 1 : 0))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              Cambiar vista
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error al actualizar el tablero: {error}
        </div>
      )}

      {modoTv ? (
        vistaTv === 0 ? renderVista1() : renderVista2()
      ) : (
        <>
          {renderVista1()}
          <div className="mt-4">{renderVista2()}</div>
        </>
      )}
    </div>
  );
}