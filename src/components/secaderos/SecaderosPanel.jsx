import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { useSecaderos } from "../../hooks/useSecaderos";
import SecaderoMapa from "./SecaderoMapa";
import SecaderoLineaModal from "./SecaderoLineaModal";

function diasEntre(fechaInicio, fechaFin) {
  if (!fechaInicio) return 0;

  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = fechaFin ? new Date(`${fechaFin}T00:00:00`) : new Date();

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return 0;

  return Math.max(
    0,
    Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function formatFecha(value) {
  if (!value) return "-";

  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;

  return `${d}/${m}/${y}`;
}

export default function SecaderosPanel({ usuarioActual }) {
  const [lineaSeleccionada, setLineaSeleccionada] = useState(null);
  const [vista, setVista] = useState("mapa");

  const {
    secaderos,
    historial,
    cargando,
    guardando,
    error,
    recargar,
    cargarLinea,
    liberarLinea,
  } = useSecaderos(usuarioActual);

  const resumen = useMemo(() => {
    const lineas = secaderos.flatMap((s) => s.lineas || []);
    const ocupadas = lineas.filter((l) => l.ocupacionActiva).length;
    const libres = lineas.length - ocupadas;

    const ocupaciones = lineas
      .map((l) => ({
        linea: l,
        ocupacion: l.ocupacionActiva,
      }))
      .filter((x) => x.ocupacion);

    const masAntigua = ocupaciones
      .slice()
      .sort((a, b) =>
        String(a.ocupacion.fecha_ingreso).localeCompare(
          String(b.ocupacion.fecha_ingreso)
        )
      )[0];

    return {
      total: lineas.length,
      ocupadas,
      libres,
      masAntigua,
    };
  }, [secaderos]);

  if (usuarioActual?.rol !== "Admin") {
    return (
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold">Secaderos</h2>
          <p className="mt-2 text-sm text-slate-600">
            No tenés permisos para acceder a esta sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Secaderos</h2>
              <p className="text-sm text-slate-500">
                Mapa operativo de bodegas, líneas, lotes y fechas de ingreso.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={recargar}>
              Actualizar
            </Button>
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total líneas</p>
              <p className="text-2xl font-semibold">{resumen.total}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Ocupadas</p>
              <p className="text-2xl font-semibold">{resumen.ocupadas}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Libres</p>
              <p className="text-2xl font-semibold">{resumen.libres}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Línea más antigua</p>
              {resumen.masAntigua ? (
                <p className="text-sm font-semibold">
                  {resumen.masAntigua.linea.secadero?.nombre} ·{" "}
                  {resumen.masAntigua.linea.codigo} · Lote{" "}
                  {resumen.masAntigua.ocupacion.lote}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Sin ocupaciones</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={vista === "mapa" ? "default" : "outline"}
              onClick={() => setVista("mapa")}
            >
              Mapa
            </Button>

            <Button
              type="button"
              variant={vista === "historial" ? "default" : "outline"}
              onClick={() => setVista("historial")}
            >
              Historial
            </Button>
          </div>
        </CardContent>
      </Card>

      {cargando ? (
        <Card>
          <CardContent>
            <p className="text-sm text-slate-500">Cargando secaderos...</p>
          </CardContent>
        </Card>
      ) : vista === "mapa" ? (
        <SecaderoMapa
          secaderos={secaderos}
          onSelectLinea={setLineaSeleccionada}
        />
      ) : (
        <Card>
          <CardContent className="space-y-3">
            <h3 className="text-lg font-semibold">Historial reciente</h3>

            {historial.length === 0 ? (
              <p className="text-sm text-slate-500">
                Todavía no hay líneas liberadas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="py-2 pr-3">Bodega</th>
                      <th className="py-2 pr-3">Línea</th>
                      <th className="py-2 pr-3">Lote</th>
                      <th className="py-2 pr-3">Ingreso</th>
                      <th className="py-2 pr-3">Salida</th>
                      <th className="py-2 pr-3">Días</th>
                      <th className="py-2 pr-3">Podridos</th>
                      <th className="py-2 pr-3">Obs. salida</th>
                    </tr>
                  </thead>

                  <tbody>
                    {historial.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">
                          {row.linea?.secadero?.nombre || "-"}
                        </td>
                        <td className="py-2 pr-3">
                          {row.linea?.codigo || "-"}
                        </td>
                        <td className="py-2 pr-3">{row.lote}</td>
                        <td className="py-2 pr-3">
                          {formatFecha(row.fecha_ingreso)}
                        </td>
                        <td className="py-2 pr-3">
                          {formatFecha(row.fecha_salida)}
                        </td>
                        <td className="py-2 pr-3">
                          {diasEntre(row.fecha_ingreso, row.fecha_salida)}
                        </td>
                        <td className="py-2 pr-3">
                          {row.cantidad_podridos ?? "-"}
                        </td>
                        <td className="py-2 pr-3">
                          {row.observaciones_salida || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {lineaSeleccionada && (
        <SecaderoLineaModal
          linea={lineaSeleccionada}
          guardando={guardando}
          onClose={() => setLineaSeleccionada(null)}
          onCargar={cargarLinea}
          onLiberar={liberarLinea}
        />
      )}
    </div>
  );
}