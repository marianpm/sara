import React from "react";
import SecaderoLineaCard from "./SecaderoLineaCard";
import SecaderoPlanoCroquis from "./SecaderoPlanoCroquis";

function getLetraSecadero(secadero) {
  const nombre = String(secadero?.nombre || "").toLowerCase();

  if (nombre.includes("bodega a") || nombre.includes("secadero a")) return "A";
  if (nombre.includes("bodega b") || nombre.includes("secadero b")) return "B";
  if (nombre.includes("bodega c") || nombre.includes("secadero c")) return "C";

  const primerCodigo = secadero?.lineas?.[0]?.codigo || "";
  const match = String(primerCodigo).match(/^[A-Z]+/i);

  return match?.[0]?.toUpperCase() || "";
}

function SecaderoGrillaSimple({ secadero, onSelectLinea }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {secadero.lineas.map((linea) => (
        <SecaderoLineaCard
          key={linea.id}
          linea={linea}
          onClick={onSelectLinea}
        />
      ))}
    </div>
  );
}

export default function SecaderoMapa({ secaderos, onSelectLinea }) {
  if (!secaderos.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No hay secaderos cargados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {secaderos.map((secadero) => {
        const ocupadas = secadero.lineas.filter((l) => l.ocupacionActiva).length;
        const libres = secadero.lineas.length - ocupadas;
        const letra = getLetraSecadero(secadero);
        const usaCroquis = letra === "A" || letra === "B" || letra === "C";

        return (
          <section
            key={secadero.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {secadero.nombre}
                </h3>
                <p className="text-xs text-slate-500">
                  {ocupadas} ocupadas · {libres} libres ·{" "}
                  {secadero.lineas.length} líneas
                </p>
              </div>

              {usaCroquis && (
                <p className="text-xs text-slate-500">
                  Vista croquis aproximada
                </p>
              )}
            </div>

            {usaCroquis ? (
              <SecaderoPlanoCroquis
                secadero={secadero}
                onSelectLinea={onSelectLinea}
              />
            ) : (
              <SecaderoGrillaSimple
                secadero={secadero}
                onSelectLinea={onSelectLinea}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}