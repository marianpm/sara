// src/components/AppSidebar.jsx
import React from "react";
import { Button } from "./ui/button";

const MENU_ADMIN = [
  { id: "pedidos", label: "Pedidos" },
  { id: "facturacion", label: "Facturación" },
  { id: "cuentaCorriente", label: "Cuenta corriente" },
  { id: "planta", label: "Planta" },
  { id: "configuracion", label: "Configuración" },
];

const MENU_OPERARIO = [{ id: "pedidos", label: "Pedidos" }];

const MENU_CORREDOR = [{ id: "pedidos", label: "Pedidos" }];

const PLANTA_SUBMENU = [
  { id: "proveedores", label: "Proveedores" },
  { id: "tachosSal", label: "Tachos Sal" },
  { id: "secaderos", label: "Secaderos" },
  { id: "tableros", label: "Tableros" },
];

export default function AppSidebar({
  usuarioActual,
  seccionActual,
  setSeccionActual,
  plantaSubseccion,
  setPlantaSubseccion,
}) {
  const rol = usuarioActual?.rol;

  const menu =
    rol === "Admin"
      ? MENU_ADMIN
      : rol === "Operario"
      ? MENU_OPERARIO
      : MENU_CORREDOR;

  const irASeccion = (seccionId) => {
    setSeccionActual(seccionId);

    if (seccionId === "planta" && !plantaSubseccion) {
      setPlantaSubseccion?.("proveedores");
    }
  };

  const irAPlantaSubseccion = (subseccionId) => {
    setSeccionActual("planta");
    setPlantaSubseccion?.(subseccionId);
  };

  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 border-r bg-white px-3 py-4 md:block">
        <div className="mb-6 px-2">
          <div className="text-lg font-bold tracking-tight">Sara</div>
          <div className="text-xs text-slate-500">
            {rol === "Admin" ? "ERP interno" : "Operación planta"}
          </div>
        </div>

        <nav className="space-y-1">
          {menu.map((item) => {
            const active = seccionActual === item.id;

            return (
              <div key={item.id}>
                <Button
                  variant={active ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => irASeccion(item.id)}
                >
                  {item.label}
                </Button>

                {item.id === "planta" && seccionActual === "planta" && (
                  <div className="ml-5 mt-2 mb-2 border-l border-slate-200 pl-3 space-y-1">
                    {PLANTA_SUBMENU.map((subitem) => {
                      const subActive = plantaSubseccion === subitem.id;

                      return (
                        <button
                          key={subitem.id}
                          type="button"
                          onClick={() => irAPlantaSubseccion(subitem.id)}
                          className={[
                            "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                            subActive
                              ? "bg-slate-100 font-semibold text-slate-950"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                          ].join(" ")}
                        >
                          {subitem.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="border-b bg-white px-3 py-2 md:hidden">
        <div className="mb-2">
          <div className="text-base font-bold tracking-tight">Sara</div>
          <div className="text-xs text-slate-500">
            {rol === "Admin" ? "ERP interno" : "Operación planta"}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {menu.map((item) => {
            const active = seccionActual === item.id;

            return (
              <Button
                key={item.id}
                variant={active ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => irASeccion(item.id)}
              >
                {item.label}
              </Button>
            );
          })}
        </div>

        {seccionActual === "planta" && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {PLANTA_SUBMENU.map((subitem) => {
              const subActive = plantaSubseccion === subitem.id;

              return (
                <Button
                  key={subitem.id}
                  variant={subActive ? "secondary" : "outline"}
                  size="sm"
                  className="shrink-0 rounded-full text-xs"
                  onClick={() => irAPlantaSubseccion(subitem.id)}
                >
                  {subitem.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}