import React, { useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(fechaInicio, fechaFin = todayKey()) {
  if (!fechaInicio) return 0;

  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);

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

export default function SecaderoLineaModal({
  linea,
  guardando,
  onClose,
  onCargar,
  onLiberar,
}) {
  const ocupacion = linea?.ocupacionActiva || null;
  const estaOcupada = !!ocupacion;

  const [modoLiberar, setModoLiberar] = useState(false);
  const [error, setError] = useState(null);

  const [lote, setLote] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(todayKey());
  const [observacionesIngreso, setObservacionesIngreso] = useState("");

  const [fechaSalida, setFechaSalida] = useState(todayKey());
  const [cantidadPodridos, setCantidadPodridos] = useState("");
  const [observacionesSalida, setObservacionesSalida] = useState("");

  const titulo = useMemo(() => {
    const bodega = linea?.secadero?.nombre || "Bodega";
    const codigo = linea?.codigo || "Línea";

    return `${bodega} - ${codigo}`;
  }, [linea]);

  if (!linea) return null;

  const handleCargar = async () => {
    try {
      setError(null);

      await onCargar({
        linea,
        lote,
        fechaIngreso,
        observacionesIngreso,
      });

      onClose();
    } catch (e) {
      setError(e.message || "No se pudo cargar la línea.");
    }
  };

  const handleLiberar = async () => {
    try {
      setError(null);

      await onLiberar({
        linea,
        ocupacion,
        fechaSalida,
        cantidadPodridos,
        observacionesSalida,
      });

      onClose();
    } catch (e) {
      setError(e.message || "No se pudo liberar la línea.");
    }
  };

  const puedeCargar = lote.trim().length > 0 && !!fechaIngreso;
  const puedeLiberar = !!fechaSalida;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{titulo}</h2>
              <p className="text-sm text-slate-500">
                {estaOcupada ? "Línea ocupada" : "Línea libre"}
              </p>
            </div>

            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>

          {!estaOcupada && (
            <div className="space-y-4">
              <h3 className="font-semibold">Cargar línea</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  Lote
                </label>
                <Input
                  value={lote}
                  placeholder="Ej: 2505"
                  maxLength={40}
                  onChange={(e) => setLote(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  Fecha de ingreso
                </label>
                <Input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  Observaciones de ingreso
                </label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={observacionesIngreso}
                  maxLength={300}
                  placeholder="Opcional"
                  onChange={(e) => setObservacionesIngreso(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="button"
                className="w-full"
                disabled={!puedeCargar || guardando}
                onClick={handleCargar}
              >
                {guardando ? "Guardando..." : "Cargar línea"}
              </Button>
            </div>
          )}

          {estaOcupada && !modoLiberar && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p>
                  <strong>Lote:</strong> {ocupacion.lote}
                </p>
                <p>
                  <strong>Fecha ingreso:</strong>{" "}
                  {formatFecha(ocupacion.fecha_ingreso)}
                </p>
                <p>
                  <strong>Días en secadero:</strong>{" "}
                  {diasEntre(ocupacion.fecha_ingreso)}
                </p>

                {ocupacion.observaciones_ingreso && (
                  <p className="mt-2">
                    <strong>Observaciones ingreso:</strong>{" "}
                    {ocupacion.observaciones_ingreso}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setModoLiberar(true)}
              >
                Liberar línea
              </Button>
            </div>
          )}

          {estaOcupada && modoLiberar && (
            <div className="space-y-4">
              <h3 className="font-semibold">Liberar línea</h3>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Vas a marcar como liberada la línea {titulo}, lote{" "}
                <strong>{ocupacion.lote}</strong>.
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  Fecha de salida
                </label>
                <Input
                  type="date"
                  min={ocupacion.fecha_ingreso}
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  Cantidad de podridos
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={cantidadPodridos}
                  placeholder="Opcional"
                  onChange={(e) => setCantidadPodridos(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  Observaciones de salida
                </label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={observacionesSalida}
                  maxLength={300}
                  placeholder="Opcional"
                  onChange={(e) => setObservacionesSalida(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={guardando}
                  onClick={() => setModoLiberar(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={!puedeLiberar || guardando}
                  onClick={handleLiberar}
                >
                  {guardando ? "Liberando..." : "Confirmar salida"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}