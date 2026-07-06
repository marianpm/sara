import React, { useCallback, useEffect, useState } from "react";
import {
  fetchCamarasFrigorificas,
  fetchHistorialCamara,
  actualizarParametroCamara,
  fetchLogsCamarasFrio,
  exportarAuditoriaCamarasFrio,
  imprimirAuditoriaCamarasFrio,
} from "../services/camarasFrigorificasService";
import "../../PlantaPanel.css";
import { Card, CardContent } from "../../../../shared/ui/card";
import { Button } from "../../../../shared/ui/button";

const HISTORIAL_PERIODOS = [
  { label: "3 h", hours: 3 },
  { label: "12 h", hours: 12 },
  { label: "24 h", hours: 24 },
  { label: "7 días", hours: 168 },
];

function getParametroValue(camara, code) {
  const parametro = camara?.parametros?.find((p) => p.code === code);

  if (!parametro) return null;

  const value = Number(parametro.value);

  return Number.isFinite(value) ? value : null;
}

function formatHoraGrafico(date) {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFechaGrafico(date) {
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TemperatureChart({
  data = [],
  referenciaArranque = null,
  referenciaCorte = null,
}) {
  const [tooltip, setTooltip] = useState(null);

  const puntos = data
    .filter((item) => item.temperatura_camara !== null)
    .map((item) => ({
      fecha: new Date(item.registrado_en),
      camara: Number(item.temperatura_camara),
      evaporador:
        item.temperatura_evaporador === null
          ? null
          : Number(item.temperatura_evaporador),
    }));

  if (puntos.length < 2) {
    return (
      <div className="camara-chart-empty">
        Todavía no hay suficientes lecturas para graficar.
      </div>
    );
  }

  const width = 1230;
  const height = 427.5;
  const paddingLeft = 54;
  const paddingRight = 150;
  const paddingTop = 22;
  const paddingBottom = 48;

  const chartRight = width - paddingRight;
  const referenceLabelX = chartRight + 12;

  const temps = puntos.flatMap((p) =>
    p.evaporador === null ? [p.camara] : [p.camara, p.evaporador]
  );

  const referencias = [
    {
      key: "corte",
      label: "Corte",
      value: referenciaCorte,
      className: "corte",
    },
    {
      key: "arranque",
      label: "Arranque",
      value: referenciaArranque,
      className: "arranque",
    },
  ].filter((ref) => ref.value !== null && ref.value !== undefined);

  const rawMin = Math.min(...temps);
  const rawMax = Math.max(...temps);

  let minTemp = Math.floor(rawMin - 1);
  let maxTemp = Math.ceil(rawMax + 1);

  const referenciasVisibles = referencias.filter(
    (ref) => ref.value >= minTemp && ref.value <= maxTemp
  );

  const referenciasFueraEscala = referencias.filter(
    (ref) => ref.value < minTemp || ref.value > maxTemp
  );

  // Sólo incorporo referencias cercanas. Si el arranque está muy lejos, por ejemplo 64 °C,
  // no lo meto en la escala porque aplasta el gráfico de la cámara.
  referenciasVisibles.forEach((ref) => {
    minTemp = Math.min(minTemp, Math.floor(ref.value - 1));
    maxTemp = Math.max(maxTemp, Math.ceil(ref.value + 1));
  });

  const minTime = puntos[0].fecha.getTime();
  const maxTime = puntos[puntos.length - 1].fecha.getTime();

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const x = (date) => {
    if (maxTime === minTime) return paddingLeft;
    return (
      paddingLeft +
      ((date.getTime() - minTime) / (maxTime - minTime)) * chartWidth
    );
  };

  const y = (temp) => {
    if (maxTemp === minTemp) return paddingTop + chartHeight / 2;
    return (
      paddingTop +
      (1 - (temp - minTemp) / (maxTemp - minTemp)) * chartHeight
    );
  };

  const pathCamara = puntos
    .map(
      (p, index) =>
        `${index === 0 ? "M" : "L"} ${x(p.fecha)} ${y(p.camara)}`
    )
    .join(" ");

  const evaporadorPoints = puntos.filter((p) => p.evaporador !== null);

  const pathEvaporador = evaporadorPoints
    .map(
      (p, index) =>
        `${index === 0 ? "M" : "L"} ${x(p.fecha)} ${y(p.evaporador)}`
    )
    .join(" ");

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const ratio = i / (yTicks - 1);
    const value = maxTemp - (maxTemp - minTemp) * ratio;

    return {
      value,
      y: paddingTop + chartHeight * ratio,
    };
  });

  const xTicks = 5;
  const xLabels = Array.from({ length: xTicks }, (_, i) => {
    const ratio = i / (xTicks - 1);
    const time = new Date(minTime + (maxTime - minTime) * ratio);

    return {
      x: paddingLeft + chartWidth * ratio,
      label: formatHoraGrafico(time),
    };
  });

  const primeraHora = formatFechaGrafico(puntos[0].fecha);
  const ultimaHora = formatFechaGrafico(puntos[puntos.length - 1].fecha);

  const handleTooltip = ({ point, tipo, value }) => {
    const cx = x(point.fecha);
    const cy = y(value);

    const tooltipWidth = 192;
    const tooltipHeight = 46;
    const tooltipGap = 12;

    const tooltipX = Math.min(
      Math.max(cx, tooltipWidth / 2 + 8),
      width - tooltipWidth / 2 - 8
    );

    let tooltipY = cy - tooltipHeight - tooltipGap;

    // Si el punto está muy arriba, muestro el tooltip debajo del punto
    // para que no lo tape ni quede fuera del área visible.
    if (tooltipY < paddingTop + 4) {
      tooltipY = cy + tooltipGap;
    }

    // Seguridad para que tampoco se escape por abajo.
    tooltipY = Math.min(tooltipY, height - paddingBottom - tooltipHeight - 6);
    tooltipY = Math.max(tooltipY, 6);

    setTooltip({
      x: tooltipX,
      y: tooltipY,
      tipo,
      value,
      fecha: point.fecha,
    });
  };

  return (
    <div className="camara-chart-box">
      <div className="camara-chart-header">
        <strong>Temperatura vs tiempo</strong>
        <span>
          {puntos.length} lecturas · {primeraHora} a {ultimaHora}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="camara-chart-svg">
        {yLabels.map((tick, index) => (
          <g key={`y-${index}`}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={width - paddingRight}
              y2={tick.y}
              className="camara-chart-grid"
            />

            <text
              x={paddingLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="camara-chart-label"
            >
              {tick.value.toFixed(1)} °C
            </text>
          </g>
        ))}

        {xLabels.map((tick, index) => (
          <g key={`x-${index}`}>
            <line
              x1={tick.x}
              y1={paddingTop}
              x2={tick.x}
              y2={height - paddingBottom}
              className="camara-chart-grid vertical"
            />

            <text
              x={tick.x}
              y={height - 16}
              textAnchor="middle"
              className="camara-chart-label"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {referenciasVisibles.map((ref) => {
          const refY = y(ref.value);

          return (
            <g key={ref.key}>
              <line
                x1={paddingLeft}
                y1={refY}
                x2={chartRight}
                y2={refY}
                className={`camara-chart-reference ${ref.className}`}
              />

              <text
                x={referenceLabelX}
                y={refY + 4}
                textAnchor="start"
                className={`camara-chart-reference-label ${ref.className}`}
              >
                {ref.label}: {ref.value.toFixed(1)} °C
              </text>
            </g>
          );
        })}

        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
          className="camara-chart-axis"
        />

        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          className="camara-chart-axis"
        />

        <path d={pathCamara} className="camara-chart-line camara" />

        {pathEvaporador && (
          <path d={pathEvaporador} className="camara-chart-line evaporador" />
        )}

        {puntos.map((p, index) => (
          <circle
            key={`cam-${index}`}
            cx={x(p.fecha)}
            cy={y(p.camara)}
            r="4"
            className="camara-chart-point camara"
            onMouseEnter={() =>
              handleTooltip({
                point: p,
                tipo: "Cámara",
                value: p.camara,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {evaporadorPoints.map((p, index) => (
          <circle
            key={`eva-${index}`}
            cx={x(p.fecha)}
            cy={y(p.evaporador)}
            r="4"
            className="camara-chart-point evaporador"
            onMouseEnter={() =>
              handleTooltip({
                point: p,
                tipo: "Evaporador",
                value: p.evaporador,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {tooltip && (
          <g className="camara-chart-tooltip">
            <rect
              x={tooltip.x - 96}
              y={tooltip.y}
              width="192"
              height="46"
              rx="10"
            />

            <text x={tooltip.x} y={tooltip.y + 18} textAnchor="middle">
              {tooltip.tipo}: {tooltip.value.toFixed(1)} °C
            </text>

            <text x={tooltip.x} y={tooltip.y + 35} textAnchor="middle">
              {formatFechaGrafico(tooltip.fecha)}
            </text>
          </g>
        )}
      </svg>

      <div className="camara-chart-legend">

        <span title="Temperatura del ambiente de la cámara">
          <i className="legend-line camara" /> Cámara
        </span>

        <span title="Temperatura del sensor del evaporador">
          <i className="legend-line evaporador" /> Evaporador
        </span>

        {referencias.map((ref) => (
          <span
            key={ref.key}
            title={
              ref.key === "corte"
                ? "Temperatura en la que el equipo corta"
                : "Temperatura en la que el equipo vuelve a arrancar"
            }
          >
            <i className={`legend-line referencia ${ref.className}`} />{" "}
            {ref.label}
          </span>
        ))}
      </div>

      {referenciasFueraEscala.length > 0 && (
        <div className="camara-chart-note">
          Referencias fuera de escala:{" "}
          {referenciasFueraEscala
            .map((ref) => `${ref.label} ${ref.value.toFixed(1)} °C`)
            .join(" · ")}
        </div>
      )}
    </div>
  );
}

function ParametrosCamara({ parametros = [], onEditParametro }) {
  const grupos = [
    {
      key: "lectura",
      label: "Lecturas",
      description: "Valores actuales informados por el controlador.",
    },
    {
      key: "estado",
      label: "Estados",
      description: "Estado operativo de salidas y funciones del equipo.",
    },
    {
      key: "alarma",
      label: "Alarmas",
      description: "Señales de falla o advertencia del controlador.",
    },
    {
      key: "configuracion",
      label: "Parámetros configurables",
      description: "Valores que pueden modificarse desde SARA.",
    },
    {
      key: "accion",
      label: "Acciones",
      description: "Comandos disponibles para el controlador.",
    },
  ];

  const styles = {
    wrapper: {
      display: "grid",
      gap: "14px",
      marginTop: "18px",
    },
    group: {
      border: "1px solid #e5e7eb",
      borderRadius: "16px",
      background: "#ffffff",
      overflow: "hidden",
    },
    groupHeader: {
      padding: "12px 14px",
      borderBottom: "1px solid #e5e7eb",
      background: "#f9fafb",
    },
    groupTitle: {
      margin: 0,
      color: "#111827",
      fontSize: "15px",
      fontWeight: 700,
    },
    groupDescription: {
      margin: "3px 0 0",
      color: "#6b7280",
      fontSize: "12px",
      fontWeight: 400,
    },
    list: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
      gap: "10px",
      padding: "12px",
    },
    item: {
      border: "1px solid #e5e7eb",
      borderRadius: "14px",
      padding: "12px",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: "116px",
      gap: "10px",
    },
    topRow: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto",
      gap: "12px",
      alignItems: "start",
    },
    label: {
      display: "block",
      color: "#111827",
      fontSize: "14px",
      fontWeight: 650,
      lineHeight: 1.25,
    },
    code: {
      display: "block",
      marginTop: "4px",
      color: "#6b7280",
      fontSize: "11px",
      fontWeight: 400,
      letterSpacing: "0.01em",
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    value: {
      display: "block",
      color: "#0f172a",
      fontSize: "14px",
      fontWeight: 800,
      lineHeight: 1.2,
      textAlign: "right",
      maxWidth: "150px",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
    },
    description: {
      margin: 0,
      color: "#64748b",
      fontSize: "12px",
      fontWeight: 400,
      lineHeight: 1.45,
    },
    bottomRow: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      minHeight: "32px",
    },
    editButton: {
      border: "1px solid #d1d5db",
      background: "#ffffff",
      color: "#111827",
      borderRadius: "10px",
      padding: "6px 10px",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
  };

  return (
    <div style={styles.wrapper}>
      {grupos.map((grupo) => {
        const items = parametros.filter((p) => p.group === grupo.key);

        if (!items.length) return null;

        return (
          <section key={grupo.key} style={styles.group}>
            <div style={styles.groupHeader}>
              <h4 style={styles.groupTitle}>{grupo.label}</h4>
              <p style={styles.groupDescription}>{grupo.description}</p>
            </div>

            <div style={styles.list}>
              {items.map((parametro) => (
                <div key={parametro.code} style={styles.item}>
                  <div style={styles.topRow}>
                    <div>
                      <strong style={styles.label}>{parametro.label}</strong>
                      <span style={styles.code}>{parametro.code}</span>
                    </div>

                    <strong style={styles.value}>
                      {parametro.displayValue}
                    </strong>
                  </div>

                  {parametro.description && (
                    <p style={styles.description}>
                      {parametro.description}
                    </p>
                  )}

                  <div style={styles.bottomRow}>
                    {parametro.editable && (
                      <button
                        type="button"
                        style={styles.editButton}
                        onClick={() => onEditParametro?.(parametro)}
                      >
                        Modificar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function formatTemp(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${Number(value).toFixed(1)} °C`;
}

function formatFechaHora(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLogFecha(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatLogHora(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    timeStyle: "medium",
  }).format(new Date(value));
}

function getLogBadgeClass(value) {
  if (value === "critica" || value === "activa") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (value === "advertencia") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (value === "resuelta") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function LogBadge({ children, value }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getLogBadgeClass(
        value || children
      )}`}
    >
      {children || "-"}
    </span>
  );
}

function getCamaraEstado(camara) {
  if (!camara.instalada) {
    return {
      dotClass: "pendiente",
      label: "Sin instalar",
    };
  }

  if (camara.alarmas?.length > 0) {
    return {
      dotClass: "alerta",
      label: "Con alarma",
    };
  }

  return {
    dotClass: "ok",
    label: "Normal",
  };
}

function EstadoPill({ active, label }) {
  return (
    <span className={`camara-pill ${active ? "active" : ""}`}>
      {label}: {active ? "Sí" : "No"}
    </span>
  );
}

function CamaraCard({ camara }) {
  const estado = getCamaraEstado(camara);

  if (!camara.instalada) {
    return (
      <div className="camara-card camara-card-pendiente">
        <div className="camara-card-top">
          <span className={`estado-dot ${estado.dotClass}`} />

          <div>
            <strong>{camara.nombre}</strong>
            <p>{camara.message || "Sin módulo WiFi instalado"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`camara-card ${
        camara.alarmas?.length ? "camara-card-alerta" : ""
      }`}
    >
      <div className="camara-card-top">
        <span className={`estado-dot ${estado.dotClass}`} />

        <div>
          <strong>{camara.nombre}</strong>
          <p>{estado.label}</p>
        </div>
      </div>

      <div className="camara-temperatura-principal">
        {formatTemp(camara.temperaturaCamara)}
      </div>

      <div className="camara-detalle-grid">
        <div>
          <span>Evaporador</span>
          <strong>{formatTemp(camara.temperaturaEvaporador)}</strong>
        </div>

        <div>
          <span>Actualizado</span>
          <strong>{formatFechaHora(camara.actualizadoEn)}</strong>
        </div>
      </div>

      <div className="camara-pills">
        <EstadoPill active={camara.encendido} label="Equipo" />
        <EstadoPill active={camara.compresorActivo} label="Pedido frío (Solenoide)" />
        <EstadoPill active={camara.deshieloActivo} label="Deshielo" />
        <EstadoPill active={camara.ventiladorActivo} label="Ventilador" />
      </div>

      {camara.alarmas?.length > 0 && (
        <div className="camara-alertas">
          {camara.alarmas.map((alarma) => (
            <div key={alarma.code} className="camara-alerta-item">
              <strong>
                {alarma.code} - {alarma.title}
              </strong>
              <p>{alarma.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogsCamarasPanel({
  logs = [],
  loading,
  error,
  camaras = [],
  filtroCamara,
  filtroEstado,
  onChangeFiltroCamara,
  onChangeFiltroEstado,
  onRefresh,
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold">Historial de logs</h3>
            <p className="text-sm text-slate-500">
              Cambios de parámetros, alarmas activas, alarmas resueltas y eventos de cámaras frigoríficas.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_auto] lg:items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Cámara
                </label>

                <select
                  value={filtroCamara}
                  onChange={(e) => onChangeFiltroCamara(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Todas las cámaras</option>

                  {camaras
                    .filter((camara) => camara.instalada)
                    .map((camara) => (
                      <option key={camara.id} value={camara.id}>
                        {camara.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Estado
                </label>

                <select
                  value={filtroEstado}
                  onChange={(e) => onChangeFiltroEstado(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="activa">Activas</option>
                  <option value="resuelta">Resueltas</option>
                  <option value="evento">Eventos</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  onClick={onRefresh}
                >
                  {loading ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Mostrando los últimos {logs.length.toLocaleString("es-AR")} log(s).
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-sm text-slate-500">Cargando logs...</p>
        )}

        {!loading && logs.length === 0 && (
          <p className="text-sm text-slate-500">
            Todavía no hay logs para mostrar con estos filtros.
          </p>
        )}

        {!loading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-2 py-2">Fecha</th>
                  <th className="px-3 py-2">Cámara</th>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Severidad</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Descripción</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 align-top">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="font-medium">
                        {formatLogFecha(log.created_at)}
                      </div>

                      <div className="text-xs text-slate-500">
                        {formatLogHora(log.created_at)}
                      </div>

                      {log.resuelto_at && (
                        <div className="mt-1 text-xs text-slate-500">
                          Resuelto:
                          <br />
                          {formatLogFecha(log.resuelto_at)}
                          <br />
                          {formatLogHora(log.resuelto_at)}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-medium">
                        {log.camara_nombre || "-"}
                      </div>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <LogBadge>{log.codigo || "-"}</LogBadge>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {log.tipo || "-"}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <LogBadge value={log.estado}>{log.estado || "-"}</LogBadge>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <LogBadge value={log.severidad}>
                        {log.severidad || "-"}
                      </LogBadge>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {log.origen || "-"}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {log.usuario || "-"}
                    </td>

                    <td className="px-3 py-2 min-w-[520px]">
                      <div className="whitespace-normal break-words text-slate-700">
                        {log.descripcion || "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExportarAuditoriaCamarasPanel() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [camaraNumero, setCamaraNumero] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const generarExcel = async () => {
    try {
      setGenerando(true);
      setError("");

      await exportarAuditoriaCamarasFrio({
        mes: Number(mes),
        camaraNumero: camaraNumero ? Number(camaraNumero) : null,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo generar la planilla");
    } finally {
      setGenerando(false);
    }
  };

  const imprimirPlanilla = async () => {
    try {
      setGenerando(true);
      setError("");

      await imprimirAuditoriaCamarasFrio({
        mes: Number(mes),
        camaraNumero: camaraNumero ? Number(camaraNumero) : null,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo imprimir la planilla");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Exportar auditoría</h3>

          <p className="text-sm text-slate-500">
            Genera una planilla Excel mensual con las temperaturas de inicio y final de cada día laboral.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(220px,1fr)_auto] lg:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Mes
              </label>

              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Cámara
              </label>

              <select
                value={camaraNumero}
                onChange={(e) => setCamaraNumero(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Todas las cámaras</option>
                <option value={1}>Cámara 1</option>
                <option value={2}>Cámara 2</option>
                <option value={3}>Cámara 3</option>
                <option value={4}>Cámara 4</option>
                <option value={5}>Cámara 5</option>
                <option value={6}>Cámara 6</option>
                <option value={7}>Cámara 7</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="h-9 px-4 text-xs"
                onClick={generarExcel}
                disabled={generando}
              >
                {generando ? "Generando..." : "Generar Excel"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 text-xs"
                onClick={imprimirPlanilla}
                disabled={generando}
              >
                Imprimir
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Se toma la lectura más cercana a las 7:00 y a las 12:30, con una tolerancia de 15 minutos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CamarasFrigorificasPanel({ usuarioActual }) {
  const [camaras, setCamaras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [camaraSeleccionadaId, setCamaraSeleccionadaId] = useState(null);
  const [historialPorCamara, setHistorialPorCamara] = useState({});
  const [historyHours, setHistoryHours] = useState(24);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [parametroEditando, setParametroEditando] = useState(null);
  const [valorEditando, setValorEditando] = useState("");
  const [guardandoParametro, setGuardandoParametro] = useState(false);
  const [vista, setVista] = useState("panel");

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [filtroCamaraLogs, setFiltroCamaraLogs] = useState("");
  const [filtroEstadoLogs, setFiltroEstadoLogs] = useState("");


    const cargarCamaras = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await fetchCamarasFrigorificas();

      setCamaras(data.camaras || []);
      setUpdatedAt(data.updatedAt || new Date().toISOString());

      // Importante:
      // No actualizamos historial acá, porque eso pertenece al gráfico.
      // setHistorialPorCamara(data.historialPorCamara || {});
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudieron cargar las cámaras frigoríficas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const cargarHistorialSeleccionado = useCallback(
    async ({ silent = false } = {}) => {
      if (!camaraSeleccionadaId) return;

      try {
        if (!silent) {
          setHistorialLoading(true);
        }

        const historial = await fetchHistorialCamara({
          camaraId: camaraSeleccionadaId,
          historyHours,
        });

        setHistorialPorCamara((prev) => ({
          ...prev,
          [camaraSeleccionadaId]: historial,
        }));
      } catch (err) {
        console.error(err);
        setError(err.message || "No se pudo cargar el historial de la cámara");
      } finally {
        if (!silent) {
          setHistorialLoading(false);
        }
      }
    },
    [camaraSeleccionadaId, historyHours]
  );

  const cargarLogs = useCallback(
    async ({
      camaraId = filtroCamaraLogs,
      estado = filtroEstadoLogs,
    } = {}) => {
      try {
        setLogsLoading(true);
        setLogsError("");

        const data = await fetchLogsCamarasFrio({
          camaraId,
          estado,
          limit: 150,
        });

        setLogs(data);
      } catch (err) {
        console.error(err);
        setLogsError(err.message || "No se pudieron cargar los logs");
      } finally {
        setLogsLoading(false);
      }
    },
    [filtroCamaraLogs, filtroEstadoLogs]
  );

  useEffect(() => {
    cargarCamaras();

    const intervalId = setInterval(() => {
      cargarCamaras({ silent: true });
    }, 300 * 1000);

    return () => clearInterval(intervalId);
  }, [cargarCamaras]);

  useEffect(() => {
    cargarHistorialSeleccionado();
  }, [cargarHistorialSeleccionado]);

  useEffect(() => {
    if (!camaraSeleccionadaId) return;

    const intervalId = setInterval(() => {
      cargarHistorialSeleccionado({ silent: true });
    }, 300 * 1000);

    return () => clearInterval(intervalId);
  }, [camaraSeleccionadaId, cargarHistorialSeleccionado]);

  useEffect(() => {
    if (vista !== "logs") return;

    cargarLogs();
  }, [vista, cargarLogs]);

  const cambiarFiltroCamaraLogs = async (camaraId) => {
    setFiltroCamaraLogs(camaraId);

    if (vista === "logs") {
      await cargarLogs({
        camaraId,
        estado: filtroEstadoLogs,
      });
    }
  };

  const cambiarFiltroEstadoLogs = async (estado) => {
    setFiltroEstadoLogs(estado);

    if (vista === "logs") {
      await cargarLogs({
        camaraId: filtroCamaraLogs,
        estado,
      });
    }
  };

  const camaraSeleccionada =
    camaras.find((camara) => camara.id === camaraSeleccionadaId) || null;

  const referenciaArranque = getParametroValue(camaraSeleccionada, "opentmp");
  const referenciaCorte = getParametroValue(camaraSeleccionada, "stoptmp");

  const abrirEditorParametro = (parametro) => {
    if (!parametro.editable) return;

    setParametroEditando(parametro);

    if (parametro.type === "bool") {
      setValorEditando(Boolean(parametro.value));
    } else {
      setValorEditando(parametro.value ?? "");
    }
  };

  const guardarParametro = async () => {
    if (!camaraSeleccionada || !parametroEditando) return;

    try {
      setGuardandoParametro(true);

      const usuarioSara = usuarioActual.usuario;

      await actualizarParametroCamara({
        usuario: usuarioSara,
        camaraId: camaraSeleccionada.id,
        code: parametroEditando.code,
        value: valorEditando,
      });

      setParametroEditando(null);
      setValorEditando("");

      await cargarCamaras({ silent: true });
    } catch (err) {
      console.error(err);
      alert(err.message || "No se pudo actualizar el parámetro");
    } finally {
      setGuardandoParametro(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Cámaras frigoríficas</h2>
              <p className="text-sm text-slate-500">
                Temperatura actual, estado de trabajo, alarmas y logs de los controladores WiFi.
              </p>
            </div>

            <div className="flex gap-2 rounded-full bg-slate-100 p-1">
              <Button
                type="button"
                variant={vista === "panel" ? "default" : "ghost"}
                className="rounded-full text-xs sm:text-sm"
                onClick={() => setVista("panel")}
              >
                Panel
              </Button>

              <Button
                type="button"
                variant={vista === "logs" ? "default" : "ghost"}
                className="rounded-full text-xs sm:text-sm"
                onClick={() => setVista("logs")}
              >
                Logs
              </Button>

              <Button
                type="button"
                variant={vista === "auditoria" ? "default" : "ghost"}
                className="rounded-full text-xs sm:text-sm"
                onClick={() => setVista("auditoria")}
              >
                Exportar auditoría
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {vista === "panel" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {updatedAt ? (
              <p className="camara-last-update m-0">
                Última consulta: {formatFechaHora(updatedAt)}
              </p>
            ) : (
              <span />
            )}

            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={() => cargarCamaras({ silent: true })}
            >
              {refreshing ? "Actualizando..." : "Refrescar"}
            </Button>
          </div>

          {loading && <p className="camaras-info">Cargando cámaras...</p>}

          {error && <div className="camaras-error">{error}</div>}

          {!loading && !error && (
            <div className="camaras-grid">
              {camaras.map((camara) => (
                <button
                  key={camara.id}
                  type="button"
                  className="camara-card-button"
                  onClick={() => setCamaraSeleccionadaId(camara.id)}
                >
                  <CamaraCard camara={camara} />
                </button>
              ))}
            </div>
          )}

          {camaraSeleccionada && (
            <div className="camara-detail-panel">
              <div className="camara-detail-header">
                <div>
                  <h3>{camaraSeleccionada.nombre}</h3>
                </div>

                <button onClick={() => setCamaraSeleccionadaId(null)}>Cerrar</button>
              </div>

              <div className="camara-chart-toolbar">
                <div>
                  <strong>Historial</strong>
                </div>

                <div className="camara-period-buttons">
                  {HISTORIAL_PERIODOS.map((periodo) => (
                    <button
                      key={periodo.hours}
                      type="button"
                      className={historyHours === periodo.hours ? "active" : ""}
                      onClick={() => setHistoryHours(periodo.hours)}
                    >
                      {periodo.label}
                    </button>
                  ))}
                </div>
              </div>

              <TemperatureChart
                data={historialPorCamara[camaraSeleccionada.id] || []}
                referenciaArranque={referenciaArranque}
                referenciaCorte={referenciaCorte}
              />

              <ParametrosCamara
                parametros={camaraSeleccionada.parametros || []}
                onEditParametro={abrirEditorParametro}
              />
            </div>
          )}
        </>
      )}

      {vista === "logs" && (
        <LogsCamarasPanel
          logs={logs}
          loading={logsLoading}
          error={logsError}
          camaras={camaras}
          filtroCamara={filtroCamaraLogs}
          filtroEstado={filtroEstadoLogs}
          onChangeFiltroCamara={cambiarFiltroCamaraLogs}
          onChangeFiltroEstado={cambiarFiltroEstadoLogs}
          onRefresh={() => cargarLogs()}
        />
      )}

      {vista === "auditoria" && <ExportarAuditoriaCamarasPanel />}

      {parametroEditando && (
        <div className="camara-modal-backdrop">
          <div className="camara-modal">
            <h3>Modificar parámetro</h3>

            <p>
              <strong>{camaraSeleccionada?.nombre}</strong>
            </p>

            <div className="camara-modal-param">
              <span>Parámetro</span>
              <strong>{parametroEditando.label}</strong>
              <small>{parametroEditando.code}</small>
            </div>

            <div className="camara-modal-param">
              <span>Valor actual</span>
              <strong>{parametroEditando.displayValue}</strong>
            </div>

            {parametroEditando.type === "bool" ? (
              <label className="camara-modal-check">
                <input
                  type="checkbox"
                  checked={Boolean(valorEditando)}
                  onChange={(e) => setValorEditando(e.target.checked)}
                />
                Activado
              </label>
            ) : parametroEditando.type === "enum" && parametroEditando.options ? (
              <select
                className="camara-modal-input"
                value={String(valorEditando)}
                onChange={(e) => setValorEditando(e.target.value)}
              >
                {Object.entries(parametroEditando.options).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="camara-modal-input"
                type="number"
                step="0.1"
                value={valorEditando}
                onChange={(e) => setValorEditando(e.target.value)}
              />
            )}

            <div className="camara-modal-warning">
              Vas a modificar un parámetro real del controlador de la cámara.
              <br />
              Revisá bien el valor antes de confirmar.
            </div>

            <div className="camara-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setParametroEditando(null);
                  setValorEditando("");
                }}
                disabled={guardandoParametro}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="danger"
                onClick={guardarParametro}
                disabled={guardandoParametro}
              >
                {guardandoParametro ? "Guardando..." : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}