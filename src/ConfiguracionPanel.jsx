import React, { useState } from "react";
import { Button } from "./components/ui/button";
import ProductosConfig from "./ProductosConfig";
import TachosSalConfigPanel from "./components/config/TachosSalConfigPanel";

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

        <Button
          type="button"
          variant={seccion === "tachos_sal" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSeccion("tachos_sal")}
        >
          Tachos sal
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

      {seccion === "tachos_sal" && (
        <TachosSalConfigPanel usuarioActual={usuarioActual} />
      )}
    </div>
  );
}