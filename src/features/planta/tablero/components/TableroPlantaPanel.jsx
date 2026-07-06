import React, { useState } from "react";
import "../../PlantaPanel.css";
import CamarasFrigorificasPanel from "../../camaras/components/CamarasFrigorificasPanel";

const TABLERO_SECADEROS_URL =
  import.meta.env.VITE_TABLERO_SECADEROS_URL ||
  "http://localhost:3000/tablero.html";

export default function PlantaPanel({ usuarioActual }) {
  const [seccion, setSeccion] = useState("tablero");
  const [iframeKey, setIframeKey] = useState(0);

  const refrescarIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="planta-page">
      <div className="planta-tabs">
        <button
          className={seccion === "tablero" ? "active" : ""}
          onClick={() => setSeccion("tablero")}
        >
          Tablero
        </button>

        <button
          className={seccion === "camaras" ? "active" : ""}
          onClick={() => setSeccion("camaras")}
        >
          Cámaras frigoríficas
        </button>
      </div>

      {seccion === "tablero" && (
        <section className="planta-card">
          <div className="planta-card-header">
            <div>
              <h2>Tablero de secaderos</h2>
              <p>
                Vista en vivo del panel local de fábrica. Requiere que el
                servicio del tablero esté corriendo.
              </p>
            </div>

            <div className="planta-actions">
              <button onClick={refrescarIframe}>Refrescar</button>

              <a
                href={TABLERO_SECADEROS_URL}
                target="_blank"
                rel="noreferrer"
              >
                Abrir aparte
              </a>
            </div>
          </div>

          <div className="planta-iframe-wrapper">
            <iframe
              key={iframeKey}
              src={TABLERO_SECADEROS_URL}
              title="Tablero de secaderos"
              className="planta-iframe"
            />
          </div>
        </section>
      )}

      {seccion === "camaras" && (
        <CamarasFrigorificasPanel usuarioActual={usuarioActual}/>
      )}
    </div>
  );
}