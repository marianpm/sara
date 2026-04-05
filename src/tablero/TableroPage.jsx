import React from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "../components/ui/card";
import { useDashboardData } from "./useDashboardData";
import {
  formatCurrency,
  formatInteger,
  formatKg,
} from "./dashboardUtils";

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

function ChartCard({ title, data, valueFormatter }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  valueFormatter ? valueFormatter(value) : value
                }
              />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
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

export default function TableroPage() {
  const {
    loading,
    error,
    ultimaActualizacion,
    periodoTopDias,
    setPeriodoTopDias,
    kpis,
    pedidosPorSemana,
    kilosPorSemana,
    entregasPorSemana,
    facturacionPorSemana,
    topProductos,
    topClientes,
  } = useDashboardData();

  const topClientesRows = topClientes.map((c) => ({
    nombre: c.nombre,
    facturacion: c.facturacion,
  }));

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
        </div>

        <div className="flex items-center gap-2">
          {[7, 30, 90, 365].map((dias) => (
            <button
              key={dias}
              type="button"
              onClick={() => setPeriodoTopDias(dias)}
              className={`rounded-lg px-3 py-2 text-sm ${
                periodoTopDias === dias
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border border-slate-300"
              }`}
            >
              {dias} días
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error al actualizar el tablero: {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Pedidos creados · 7 días"
          value={loading ? "..." : formatInteger(kpis.pedidosCreados7)}
        />
        <KpiCard
          title="Pedidos entregados · 7 días"
          value={loading ? "..." : formatInteger(kpis.pedidosEntregados7)}
        />
        <KpiCard
          title="Facturación · 7 días"
          value={loading ? "..." : formatCurrency(kpis.facturacion7)}
        />
        <KpiCard
          title="Kilos vendidos · 7 días"
          value={loading ? "..." : formatKg(kpis.kilosVendidos7)}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Pedidos por semana"
          data={pedidosPorSemana}
          valueFormatter={formatInteger}
        />
        <ChartCard
          title="Kilos por semana"
          data={kilosPorSemana}
          valueFormatter={formatKg}
        />
        <ChartCard
          title="Entregas por semana"
          data={entregasPorSemana}
          valueFormatter={formatInteger}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Facturación por semana"
          data={facturacionPorSemana}
          valueFormatter={formatCurrency}
        />
        <RankingCard
          title={`Top productos · ${periodoTopDias} días`}
          rows={topProductos}
          valueKey="kilos"
          valueFormatter={formatKg}
        />
        <RankingCard
          title={`Top clientes · ${periodoTopDias} días`}
          rows={topClientesRows}
          valueKey="facturacion"
          valueFormatter={formatCurrency}
        />
      </section>
    </div>
  );
}