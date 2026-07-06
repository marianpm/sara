import React, { forwardRef, useMemo } from "react";
import {
  armarFilasListaPrecios,
  formatearMesAnio,
} from "../utils/listaPreciosUtils";

import sarriaLogoSrc from "../../../assets/logos/sarria-logo.webp";
import logo1319Src from "../../../assets/logos/logo-1319.webp";

const TH_BASE =
  "px-3 py-1 text-left font-normal border-b border-t border-black";
const TD_BASE = "px-3 py-1";
const ROW_ALT = "bg-[#efefef]";

function TablaCategoria({ titulo, filas }) {
  return (
    <div className="space-y-2">
      <div className="text-[22px] leading-none uppercase">
        CATEGORIA: {titulo}
      </div>

      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr>
            <th className={`${TH_BASE} w-[38%]`}>PRODUCTO</th>
            <th className={`${TH_BASE} w-[24%]`}>PRESENTACIÓN</th>
            <th className={`${TH_BASE} w-[18%] text-center`}>
              <div className="leading-tight">
                <div>PESO APROX</div>
                <div>(kg)</div>
              </div>
            </th>
            <th className={`${TH_BASE} w-[20%] text-center`}>
              <div className="leading-tight">
                <div>PRECIO s/IVA</div>
                <div>(AR$/kg)</div>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {filas.map((fila, index) => (
            <tr
              key={`${fila.producto}-${fila.presentacion}-${index}`}
              className={index % 2 === 1 ? ROW_ALT : ""}
            >
              <td className={TD_BASE}>{fila.producto}</td>
              <td className={TD_BASE}>{fila.presentacion}</td>
              <td className={`${TD_BASE} text-center`}>{fila.pesoAprox}</td>
              <td className={`${TD_BASE} text-center`}>{fila.precio}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-b-2 border-black" />
    </div>
  );
}

const ListaPreciosImagen = forwardRef(function ListaPreciosImagen(
  { productos, tipo = "mayorista" },
  ref
) {
  const { filasCrudas, filasCocidas } = useMemo(
    () =>
      armarFilasListaPrecios(
        productos,
        tipo === "mayorista" ? "mayorista" : "minorista"
      ),
    [productos, tipo]
  );

  const esMayorista = tipo === "mayorista";

  const theme = esMayorista
    ? {
        headerBg: "#98170d",
        headerText: "#fef2ca",
        sectionBg: "#98170d",
        sectionText: "#fef2ca",
        fecha: formatearMesAnio(),
        logoSrc: sarriaLogoSrc,
        logoAlt: "Sarria",
        logoClassName: "h-[162px] w-auto object-contain",
      }
    : {
        headerBg: "#000000",
        headerText: "#ffffff",
        sectionBg: "#000000",
        sectionText: "#ffffff",
        fecha: formatearMesAnio(),
        logoSrc: logo1319Src,
        logoAlt: "1319",
        logoClassName: "h-[162px] w-auto object-contain",
      };

  return (
    <div
      ref={ref}
      className="w-[1120px] bg-[#e5e5e5] p-10 text-black"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <div
        className="flex items-center justify-between px-8 py-5"
        style={{ backgroundColor: theme.headerBg, color: theme.headerText }}
      >
        <div className="flex h-[96px] items-center">
          <img
            src={theme.logoSrc}
            alt={theme.logoAlt}
            className={theme.logoClassName}
            draggable={false}
          />
        </div>

        <div className="text-[22px]">{theme.fecha}</div>
      </div>

      <div className="mt-8 space-y-8">
        {esMayorista ? (
          <>
            <div>
              <div
                className="px-3 py-1 text-[16px] font-medium uppercase"
                style={{
                  backgroundColor: theme.sectionBg,
                  color: theme.sectionText,
                }}
              >
                SALAZONES CRUDAS
              </div>

              <div className="mt-4">
                <TablaCategoria titulo="JAMÓN CRUDO" filas={filasCrudas} />
              </div>
            </div>

            <div>
              <div
                className="px-3 py-1 text-[16px] font-medium uppercase"
                style={{
                  backgroundColor: theme.sectionBg,
                  color: theme.sectionText,
                }}
              >
                SALAZONES COCIDAS
              </div>

              <div className="mt-4">
                <TablaCategoria titulo="JAMÓN COCIDO" filas={filasCocidas} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div
                className="px-3 py-2 text-[18px] font-medium uppercase"
                style={{
                  backgroundColor: theme.sectionBg,
                  color: theme.sectionText,
                }}
              >
                SALAZONES CRUDAS
              </div>

              <div className="mt-4">
                <TablaCategoria titulo="JAMÓN CRUDO" filas={filasCrudas} />
              </div>
            </div>

            <div>
              <div
                className="px-3 py-1 text-[16px] font-medium uppercase"
                style={{
                  backgroundColor: theme.sectionBg,
                  color: theme.sectionText,
                }}
              >
                SALAZONES COCIDAS
              </div>

              <div className="mt-4">
                <TablaCategoria titulo="JAMÓN COCIDO" filas={filasCocidas} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default ListaPreciosImagen;