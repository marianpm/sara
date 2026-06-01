// src/components/PlantaPanel.jsx
import React from "react";
import "./PlantaPanel.css";

import TableroPlantaPanel from "./planta/TableroPlantaPanel";
import ProveedoresPlantaPanel from "./planta/ProveedoresPlantaPanel";
import TachosSalPanel from "./planta/TachosSalPanel";
import SecaderosPanel from "./secaderos/SecaderosPanel";

const DESCRIPCIONES = {
  proveedores: "Ingreso e historial de mercadería recibida.",
  tachosSal: "Control operativo de tachos de sal.",
  secaderos: "Seguimiento operativo de secaderos.",
  tableros: "Monitoreo tableros de fábrica.",
};

export default function PlantaPanel({ usuarioActual, seccion = "proveedores" }) {
  return (
    <div className="planta-page">
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

      {seccion === "tableros" && <TableroPlantaPanel />}
    </div>
  );
}