// HeaderUsuario.jsx
import { useState } from "react";
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const passwordValue = password;

    const { data, error } = await supabase
      .from("usuarios")
      .select("id, usuario, es_admin, clave")
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
      es_admin: data.es_admin,
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
      {usuarioActual && (
        <span className="text-sm text-gray-600">
          Usuario: <strong>{usuarioActual.usuario}</strong>
          {usuarioActual.es_admin && " (admin)"}
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
