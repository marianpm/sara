// src/components/planta/TableroPlantaPanel.jsx
import React, { useState } from "react";
import "../PlantaPanel.css";

const TABLERO_SECADEROS_URL =
  import.meta.env.VITE_TABLERO_SECADEROS_URL ||
  "http://localhost:3000/tablero.html";

export default function PlantaPanel() {
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
        <section className="planta-card">
          <div className="planta-card-header">
            <div>
              <h2>Cámaras frigoríficas</h2>
              <p>
                Próximamente: estado ON/OFF, temperatura actual y alertas por
                cámara.
              </p>
            </div>
          </div>

          <div className="camaras-placeholder">
            <div className="camara-placeholder-card">
              <span className="estado-dot pendiente" />
              <div>
                <strong>Cámara 1</strong>
                <p>Sin módulo WiFi instalado</p>
              </div>
            </div>

            <div className="camara-placeholder-card">
              <span className="estado-dot pendiente" />
              <div>
                <strong>Cámara 2</strong>
                <p>Sin módulo WiFi instalado</p>
              </div>
            </div>

            <div className="camara-placeholder-card">
              <span className="estado-dot pendiente" />
              <div>
                <strong>Cámara 3</strong>
                <p>Sin módulo WiFi instalado</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}