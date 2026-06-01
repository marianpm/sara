import React from "react";

function diasDesde(fechaIngreso) {
  if (!fechaIngreso) return 0;

  const inicio = new Date(`${fechaIngreso}T00:00:00`);
  const hoy = new Date();

  if (Number.isNaN(inicio.getTime())) return 0;

  return Math.max(
    0,
    Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function clasesEstado(linea) {
  const ocupacion = linea?.ocupacionActiva;

  if (!ocupacion) {
    return "border-slate-300 bg-white hover:bg-slate-50 text-slate-700";
  }

  const dias = diasDesde(ocupacion.fecha_ingreso);

  if (dias < 90) {
    return "border-emerald-300 bg-emerald-100 hover:bg-emerald-200 text-emerald-900";
  }

  if (dias < 120) {
    return "border-yellow-300 bg-yellow-100 hover:bg-yellow-200 text-yellow-900";
  }

  if (dias < 150) {
    return "border-orange-300 bg-orange-100 hover:bg-orange-200 text-orange-900";
  }

  return "border-red-300 bg-red-100 hover:bg-red-200 text-red-900";
}

function codigo(prefix, numero) {
  return `${prefix}${String(numero).padStart(2, "0")}`;
}

function construirLayoutSecaderoA() {
  const lineas = [];

  // 1) Izquierda superior: A01 a A16
  // Arranca por abajo, así que A01 queda abajo y A16 arriba.
  for (let n = 1; n <= 16; n += 1) {
    const indexDesdeAbajo = n - 1;

    lineas.push({
      numero: n,
      codigo: codigo("A", n),
      x: 80,
      y: 20 + (15 - indexDesdeAbajo) * 38,
      width: 220,
      height: 28,
      orientacion: "horizontal",
    });
  }

  // 2) Derecha: A17 a A45
  // De arriba hacia abajo.
  for (let n = 17; n <= 45; n += 1) {
    const index = n - 17;

    lineas.push({
      numero: n,
      codigo: codigo("A", n),
      x: 460,
      y: 20 + index * 38,
      width: 220,
      height: 28,
      orientacion: "horizontal",
    });
  }

  // 3) Izquierda isla / intermedia: A49 a A50
  lineas.push({
    numero: 50,
    codigo: codigo("A", 50),
    x: 80,
    y: 20 + 20 * 38,
    width: 220,
    height: 28,
    orientacion: "horizontal",
  });

  lineas.push({
    numero: 49,
    codigo: codigo("A", 49),
    x: 80,
    y: 20 + 21 * 38,
    width: 220,
    height: 28,
    orientacion: "horizontal",
  });

  // 4) Hueco en la izquierda a la altura de A41 y A42
  // 5) Izquierda inferior: A48, A47, A46
  // A46 queda alineada con A45.
  lineas.push({
    numero: 48,
    codigo: codigo("A", 48),
    x: 80,
    y: 20 + 26 * 38,
    width: 220,
    height: 28,
    orientacion: "horizontal",
  });

  lineas.push({
    numero: 47,
    codigo: codigo("A", 47),
    x: 80,
    y: 20 + 27 * 38,
    width: 220,
    height: 28,
    orientacion: "horizontal",
  });

  lineas.push({
    numero: 46,
    codigo: codigo("A", 46),
    x: 80,
    y: 20 + 28 * 38,
    width: 220,
    height: 28,
    orientacion: "horizontal",
  });

  return {
    width: 760,
    height: 1140,
    lineas,
    pasillos: [
      {
        x: 340,
        y: 20,
        width: 80,
        height: 1100,
        label: "Pasillo",
      },
    ],
  };
}

function construirLayoutSecaderoB() {
  const lineas = [];

  // Secadero B:
  // Pasillo central.
  // Lado izquierdo: B25 arriba hasta B01 abajo.
  // Como arranca por el lado izquierdo inferior, B01 queda abajo.
  for (let n = 25; n >= 1; n -= 1) {
    const index = 25 - n;

    lineas.push({
      numero: n,
      codigo: codigo("B", n),
      x: 80,
      y: 20 + index * 38,
      width: 180,
      height: 28,
      orientacion: "horizontal",
    });
  }

  // Lado derecho: B26 arriba hasta B50 abajo.
  for (let n = 26; n <= 50; n += 1) {
    const index = n - 26;

    lineas.push({
      numero: n,
      codigo: codigo("B", n),
      x: 420,
      y: 20 + index * 38,
      width: 180,
      height: 28,
      orientacion: "horizontal",
    });
  }

  return {
    width: 680,
    height: 1010,
    lineas,
    pasillos: [
      {
        x: 300,
        y: 20,
        width: 80,
        height: 940,
        label: "Pasillo",
      },
    ],
  };
}

function construirLayoutSecaderoC() {
  const lineas = [];

  // Parte superior izquierda: C20, C19, ..., C01.
  // Rectángulos verticales.
  for (let n = 20; n >= 1; n -= 1) {
    const index = 20 - n;

    lineas.push({
      numero: n,
      codigo: codigo("C", n),
      x: 16 + index * 36,
      y: 18,
      width: 26,
      height: 150,
      orientacion: "vertical",
    });
  }

  // Parte superior derecha: C21 a C25.
  for (let n = 21; n <= 25; n += 1) {
    const index = n - 21;

    lineas.push({
      numero: n,
      codigo: codigo("C", n),
      x: 880,
      y: 18 + index * 36,
      width: 150,
      height: 26,
      orientacion: "horizontal",
    });
  }

  // Bajada derecha: C26 a C50.
  for (let n = 26; n <= 50; n += 1) {
    const index = n - 26;

    lineas.push({
      numero: n,
      codigo: codigo("C", n),
      x: 815,
      y: 190 + index * 36,
      width: 215,
      height: 26,
      orientacion: "horizontal",
    });
  }

  return {
    width: 1060,
    height: 1120,
    lineas,
    pasillos: [],
  };
}

function getLetraSecadero(secadero) {
  const nombre = String(secadero?.nombre || "").toLowerCase();

  if (nombre.includes("bodega a") || nombre.includes("secadero a")) return "A";
  if (nombre.includes("bodega b") || nombre.includes("secadero b")) return "B";
  if (nombre.includes("bodega c") || nombre.includes("secadero c")) return "C";

  const primerCodigo = secadero?.lineas?.[0]?.codigo || "";
  const match = String(primerCodigo).match(/^[A-Z]+/i);

  return match?.[0]?.toUpperCase() || "";
}

const LAYOUTS = {
  A: construirLayoutSecaderoA,
  B: construirLayoutSecaderoB,
  C: construirLayoutSecaderoC,
};

function PlanoLineaButton({ linea, config, onClick }) {
  const ocupacion = linea?.ocupacionActiva;
  const dias = ocupacion ? diasDesde(ocupacion.fecha_ingreso) : null;

  return (
    <button
      type="button"
      title={
        ocupacion
          ? `${config.codigo} · Lote ${ocupacion.lote} · ${dias} días`
          : `${config.codigo} · Libre`
      }
      onClick={() => linea && onClick(linea)}
      className={`absolute flex items-center justify-center rounded border text-[10px] font-semibold shadow-sm transition ${clasesEstado(
        linea
      )}`}
      style={{
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
      }}
    >
      <span
        className={
          config.orientacion === "vertical"
            ? "-rotate-90 whitespace-nowrap"
            : "whitespace-nowrap"
        }
      >
        {config.numero}
      </span>
    </button>
  );
}

export default function SecaderoPlanoCroquis({ secadero, onSelectLinea }) {
  const letra = getLetraSecadero(secadero);
  const construirLayout = LAYOUTS[letra];

  if (!construirLayout) {
    return null;
  }

  const layout = construirLayout();

  const lineasPorCodigo = new Map(
    (secadero.lineas || []).map((linea) => [linea.codigo, linea])
  );

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white p-4">
        <div
          className="relative rounded-xl bg-slate-50"
          style={{
            width: layout.width,
            height: layout.height,
            minWidth: layout.width,
          }}
        >

          {layout.pasillos.map((pasillo, index) => (
            <div
              key={`pasillo-${index}`}
              className="absolute flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-xs font-medium text-slate-400"
              style={{
                left: pasillo.x,
                top: pasillo.y,
                width: pasillo.width,
                height: pasillo.height,
              }}
            >
              <span className="-rotate-90">{pasillo.label}</span>
            </div>
          ))}

          {layout.lineas.map((config) => {
            const linea = lineasPorCodigo.get(config.codigo);

            return (
              <PlanoLineaButton
                key={config.codigo}
                linea={linea}
                config={config}
                onClick={onSelectLinea}
              />
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
          Blanco: libre
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1">
          Verde: menor antigüedad
        </span>
        <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2 py-1">
          Amarillo/Naranja: intermedio
        </span>
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1">
          Rojo: más antiguo
        </span>
      </div>
    </div>
  );
}