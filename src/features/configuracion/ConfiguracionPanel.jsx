import React, { useState } from "react";
import { Button } from "../../shared/ui/button";
import ProductosConfig from "./ProductosConfig";
import TachosSalConfigPanel from "../planta/tachos-sal/components/TachosSalConfigPanel";

export default function ConfiguracionPanel({
  productos,
  cargandoProductos,
  errorProductos,
  recargarProductos,
  usuarioActual,
}) {
  const [seccion, setSeccion] = useState("productos");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={seccion === "productos" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSeccion("productos")}
        >
          Productos
        </Button>
      </div>

      {seccion === "productos" && (
        <ProductosConfig
          productos={productos}
          cargando={cargandoProductos}
          error={errorProductos}
          recargarProductos={recargarProductos}
          usuarioActual={usuarioActual}
        />
      )}
    </div>
  );
}