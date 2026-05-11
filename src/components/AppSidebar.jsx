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

export default function AppSidebar({
  usuarioActual,
  seccionActual,
  setSeccionActual,
}) {
  const rol = usuarioActual?.rol;

  const menu =
    rol === "Admin"
      ? MENU_ADMIN
      : rol === "Operario"
      ? MENU_OPERARIO
      : MENU_CORREDOR;

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
              <Button
                key={item.id}
                variant={active ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSeccionActual(item.id)}
              >
                {item.label}
              </Button>
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
                onClick={() => setSeccionActual(item.id)}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
}