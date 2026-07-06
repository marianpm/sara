// src/features/planta/PlantaPanel.jsx
import React from "react";
import "./PlantaPanel.css";

import TableroPlantaPanel from "./tablero/components/TableroPlantaPanel";
import ProveedoresPlantaPanel from "./proveedores/components/ProveedoresPlantaPanel";
import TachosSalPanel from "./tachos-sal/components/TachosSalPanel";
import SecaderosPanel from "./secaderos/components/SecaderosPanel";

const DESCRIPCIONES = {
  proveedores: "Ingreso e historial de mercadería recibida.",
  tachosSal: "Control operativo de tachos de sal.",
  secaderos: "Seguimiento operativo de secaderos.",
  tableros: "Monitoreo tableros de fábrica.",
};

export default function PlantaPanel({ usuarioActual, seccion = "proveedores" }) {
  const esSeccionTableros = seccion === "tableros";

  return (
    <div
      className={`planta-page ${
        esSeccionTableros ? "planta-page-tableros-wide" : ""
      }`}
    >
      <div className="planta-header">
        <div>
          <h1>Planta</h1>
          <p>{DESCRIPCIONES[seccion] || DESCRIPCIONES.tableros}</p>
        </div>
      </div>

      {seccion === "proveedores" && (
        <ProveedoresPlantaPanel usuarioActual={usuarioActual} />
      )}

      {seccion === "tachosSal" && (
        <TachosSalPanel usuarioActual={usuarioActual} />
      )}

      {seccion === "secaderos" && (
        <SecaderosPanel usuarioActual={usuarioActual} />
      )}

      {seccion === "tableros" && (
        <TableroPlantaPanel usuarioActual={usuarioActual} />
      )}
    </div>
  );
}