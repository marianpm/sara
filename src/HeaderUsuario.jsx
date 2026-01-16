// HeaderUsuario.jsx
import React, { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { supabase } from "./supabaseClient";
import { registrarLog } from "./logsEventos";

export default function HeaderUsuario({ usuarioActual, setUsuarioActual }) {
  const [open, setOpen] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const [estacion, setEstacion] = useState(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("sara_estacion") || null;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && estacion) {
      localStorage.setItem("sara_estacion", estacion);
    }
  }, [estacion]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const passwordValue = password;

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, usuario, rol, clave")
      .eq("usuario", usuario)
      .eq("clave", passwordValue)
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      setErrorMsg("Usuario o contraseña incorrectos");
      return;
    }

    if (usuarioActual) {
      registrarLog(
        usuarioActual,
        `${usuarioActual.usuario} cerró sesión`
      );
    }

    const usuarioObj = {
      id: data.id,
      usuario: data.usuario,
      rol: data.rol,
    };

    setUsuarioActual(usuarioObj);

    if (usuarioActual) {
      registrarLog(
        usuarioObj,
        `${usuarioObj.usuario} inició sesión`
      );
    }

    setOpen(false);
    setPassword("");
    setUsuario("");
  };

  return (
    <div className="w-full flex justify-end items-center gap-2 px-4 py-2 border-b relative">
      {/* Estación por PC */}
      <div className="flex flex-col items-end text-xs text-gray-600">
        <span className="text-[11px] text-gray-500">Estación</span>
        {estacion ? (
          // cuando ya está elegida, solo la muestro
          <span className="font-medium">{estacion}</span>
        ) : (
          // primera vez en esta PC: elegir
          <select
            value={estacion || ""}
            onChange={(e) => setEstacion(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
          >
            <option value="" disabled>
              Seleccionar...
            </option>
            <option value="Balanza">Oficina</option>
            <option value="Pasillo">Pesajes</option>
            <option value="Externo">Entrega</option>
          </select>
        )}
      </div>

      {usuarioActual && (
        <span className="text-sm text-gray-600">
          Usuario: <strong>{usuarioActual.usuario}</strong>
          {usuarioActual.rol === "Admin" && " (admin)"}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        {usuarioActual ? "Cambiar de usuario" : "Iniciar sesión"}
      </Button>

      {open && (
        <div className="absolute top-full right-4 mt-2 w-72 rounded-md border bg-white shadow-lg p-3 z-50">
          <h2 className="text-sm font-semibold mb-2">
            {usuarioActual ? "Cambiar de usuario" : "Iniciar sesión"}
          </h2>

          <form className="space-y-3" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-xs">Usuario</label>
              <Input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600">{errorMsg}</p>
            )}

            <div className="flex justify-between items-center pt-1">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="text-xs">
                  {loading ? "Verificando..." : "Aceptar"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
