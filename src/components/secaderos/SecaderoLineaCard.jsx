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
  const ocupacion = linea.ocupacionActiva;

  if (!ocupacion) {
    return "border-slate-200 bg-white hover:bg-slate-50 text-slate-700";
  }

  const dias = diasDesde(ocupacion.fecha_ingreso);

  if (dias < 90) {
    return "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900";
  }

  if (dias < 120) {
    return "border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-900";
  }

  if (dias < 150) {
    return "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900";
  }

  return "border-red-200 bg-red-50 hover:bg-red-100 text-red-900";
}

export default function SecaderoLineaCard({ linea, onClick }) {
  const ocupacion = linea.ocupacionActiva;
  const dias = ocupacion ? diasDesde(ocupacion.fecha_ingreso) : null;

  return (
    <button
      type="button"
      onClick={() => onClick(linea)}
      className={`min-h-[86px] rounded-xl border p-2 text-left shadow-sm transition ${clasesEstado(
        linea
      )}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{linea.codigo}</span>

        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium">
          {ocupacion ? "Ocupada" : "Libre"}
        </span>
      </div>

      {ocupacion ? (
        <div className="mt-2 space-y-1">
          <p className="truncate text-xs font-semibold">Lote {ocupacion.lote}</p>
          <p className="text-xs">{dias} días</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Sin lote activo</p>
      )}
    </button>
  );
}